import { safeLocalStorageSet } from '../../services/storage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Activity } from '../../types';
import { supabase } from '../../services/supabase';
import { LocalNotifications } from '@capacitor/local-notifications';
import { audioService } from '../../services/audio';
import { 
    signUpWithPhone, 
    signInWithPhone,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    convertSupabaseUser, 
    signOutUser,
    mapProfileToUser
} from '../../services/authService';
import { 
    resolveGarden, 
    resolveConsumables, 
    saveLocalGarden, 
    saveLocalConsumables, 
    syncGardenToSupabase 
} from '../../services/gardenSyncService';

export const normalizeNotification = (notif: any): any => {
    if (!notif) return notif;
    const title = String(notif.title || '');
    const message = String(notif.message || '');

    // 1. Victoire de Défi / Pari remporté contre l'IA ou un joueur
    const isBattleWin =
        title.includes('Victoire') ||
        title.includes('Duel') ||
        title.includes('Pari') ||
        title.includes('Défi') ||
        message.includes('remporté le pot') ||
        message.includes('duel') ||
        message.includes('pari') ||
        message.includes('Forfait');

    if (isBattleWin) {
        return {
            ...notif,
            type: 'battle_win',
            title: '⚔️ Victoire de Défi IA !',
            message: message.replace(/^Modération\s*:\s*/i, '').replace(/^Attribution de\s*/i, '')
        };
    }

    // 2. Bonus ou attribution de l'administration
    const isBonusOrAdminCredit =
        title.includes('AVERTISSEMENT / SANCTION ADMIN') ||
        title.includes('SANCTION') ||
        title.includes('MODÉRATION') ||
        message.includes('Attribution de') ||
        message.includes('accordé un bonus') ||
        (message.includes('bonus de') && !isBattleWin);

    if (isBonusOrAdminCredit && (message.includes('Level Coins') || message.includes('LevelCoins') || message.includes('Coins') || message.includes('XP') || message.includes('Attribution de'))) {
        const isXp = message.includes('XP') && !message.includes('Coins');
        return {
            ...notif,
            type: 'admin',
            title: isXp ? '⚡ Bonus XP Reçu !' : '🎁 Bonus LevelCoins Reçu !',
            message: message.replace(/^Modération\s*:\s*/i, '').replace(/^Attribution de\s*/i, "L'administration principale vous a accordé un bonus de ")
        };
    }
    return notif;
};

export const useAuthStore = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    // locationUpdateTimer removed — was dead code (declared but never used)

    const triggerSync = useCallback((userId: string) => {
        if (!userId || userId.includes('anon')) return;
        import('../../services/syncService').then(({ syncService }) => {
            syncService.syncUserContent(userId).catch(e => console.error('[AuthStore Sync Error]:', e));
        });
    }, []);

    // Load user from LocalStorage and verify with Supabase on mount
    useEffect(() => {
        // ✅ Keep ref to timers so we can clear them on cleanup (prevents memory leaks)
        let safetyTimer: ReturnType<typeof setTimeout> | null = null;
        let loadingTimer: ReturnType<typeof setTimeout> | null = null;

        const initAuth = async () => {
            safetyTimer = setTimeout(() => {
                setLoading(false);
                console.warn("Auth initialization timed out");
            }, 5000);

            try {
                // 1. Get current session from Supabase
                const { data: { session } } = await supabase.auth.getSession();
                const storedUser = localStorage.getItem('levelmak_user');

                if (session && storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    
                    // Background fetch and verify latest profile status & details
                    Promise.all([
                        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
                        supabase.from('teachers').select('id, status').eq('user_id', session.user.id).maybeSingle()
                    ]).then(([{ data, error }, { data: teacher }]) => {
                        if (error && (error.status === 401 || error.code === 'PGRST301')) {
                            console.warn("Session is unauthorized (401), signing out...");
                            signOutUser().then(() => {
                                setUser(null);
                                localStorage.removeItem('levelmak_user');
                                window.location.reload();
                            });
                            return;
                        }
                        if (data) {
                            if (data.status === 'blocked' || data.status === 'suspended') {
                                signOutUser().then(() => {
                                    setUser(null);
                                    localStorage.removeItem('levelmak_user');
                                    alert("ALERTE SÉCURITÉ: Ton compte a été bloqué.");
                                    window.location.reload();
                                });
                            } else {
                                const appUser = mapProfileToUser(data);
                                if (teacher && teacher.status === 'pending') {
                                    appUser.role = 'teacher';
                                }
                                // Universal Auto-healing: activate subscription for paid accounts or any valid local premium
                                const localPrem = localStorage.getItem(`levelmak_demo_premium_${appUser.id}`) === 'true';
                                const localPremUntil = localStorage.getItem(`levelmak_demo_premium_until_${appUser.id}`);
                                const hasValidLocalPrem = !!(localPrem && localPremUntil && new Date(localPremUntil).getTime() > Date.now());
                                const isSpecialAccount = appUser.id === '5bded745-9a14-407d-b522-9a5cd14a9a3d' ||
                                                         appUser.id === '81ac026c-95cf-4b38-ab47-f00a7a2cb59c' ||
                                                         appUser.email === 'rera6544@gmail.com' ||
                                                         appUser.email === 'better16544@gmail.com';

                                if ((hasValidLocalPrem || isSpecialAccount) && (!appUser.is_premium || !appUser.premium_until || new Date(appUser.premium_until).getTime() < Date.now())) {
                                    const targetExp = (hasValidLocalPrem && localPremUntil) ? localPremUntil : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                                    appUser.is_premium = true;
                                    appUser.premium_until = targetExp;
                                    localStorage.setItem(`levelmak_demo_premium_${appUser.id}`, 'true');
                                    localStorage.setItem(`levelmak_demo_premium_until_${appUser.id}`, targetExp);
                                }
                                // Preserve local analytics and customGoals so background check never reverts toggled goals
                                const savedGoalsStr = appUser.id ? localStorage.getItem(`levelmak_custom_goals_${appUser.id}`) : null;
                                let cachedGoals = null;
                                if (savedGoalsStr) {
                                    try { cachedGoals = JSON.parse(savedGoalsStr); } catch (_) {}
                                }
                                if (cachedGoals || parsedUser?.analytics?.customGoals) {
                                    appUser.analytics = {
                                        ...(appUser.analytics || {}),
                                        ...(parsedUser?.analytics || {}),
                                        customGoals: cachedGoals || parsedUser?.analytics?.customGoals
                                    };
                                }
                                // Préserver la classe/éducation depuis stats Supabase, cache local ou user parsé
                                const savedGradeClass = data.stats?.gradeClass || (data.stats as any)?.grade_class || (data as any).grade_class || localStorage.getItem(`levelmak_grade_class_${appUser.id}`) || parsedUser?.gradeClass;
                                if (savedGradeClass) {
                                    appUser.gradeClass = savedGradeClass;
                                }
                                const savedEducation = data.stats?.education || (data as any).education || localStorage.getItem(`levelmak_education_${appUser.id}`) || parsedUser?.education;
                                if (savedEducation) {
                                    appUser.education = savedEducation;
                                }

                                // Persistance des notifications au rechargement
                                const localNotifsStr = appUser.id ? localStorage.getItem(`levelmak_notifications_${appUser.id}`) : null;
                                let localNotifs = [];
                                if (localNotifsStr) {
                                    try { localNotifs = JSON.parse(localNotifsStr); } catch (_) {}
                                }
                                const rawNotifs = (data.stats?.notifications && Array.isArray(data.stats.notifications) && data.stats.notifications.length > 0)
                                    ? data.stats.notifications
                                    : (parsedUser?.stats?.notifications && parsedUser.stats.notifications.length > 0)
                                        ? parsedUser.stats.notifications
                                        : localNotifs;

                                let finalNotifs = rawNotifs.map(normalizeNotification);

                                // Filter out any stale artificial bonus notifications
                                finalNotifs = finalNotifs.filter((n: any) => n?.id !== `bonus_admin_${appUser.id}`);


                                // Synchronisation et persistance infaillible du Jardin de l'Esprit & Consommables
                                const localGardenStr = appUser.id ? localStorage.getItem(`levelmak_garden_${appUser.id}`) : null;
                                const localConsumablesStr = appUser.id ? localStorage.getItem(`levelmak_consumables_${appUser.id}`) : null;
                                const finalGarden = resolveGarden(
                                    data.stats?.garden,
                                    data.avatar_config?.garden,
                                    data.garden,
                                    parsedUser?.garden,
                                    parsedUser?.stats?.garden,
                                    localGardenStr
                                );
                                const finalConsumables = resolveConsumables(
                                    data.stats?.consumables,
                                    data.consumables,
                                    parsedUser?.consumables,
                                    parsedUser?.stats?.consumables,
                                    localConsumablesStr
                                );

                                appUser.garden = finalGarden;
                                appUser.consumables = finalConsumables;
                                appUser.stats = {
                                    ...(appUser.stats || {}),
                                    notifications: finalNotifs,
                                    garden: finalGarden,
                                    consumables: finalConsumables
                                };

                                if (appUser.id) {
                                    localStorage.setItem(`levelmak_notifications_${appUser.id}`, JSON.stringify(finalNotifs));
                                    saveLocalGarden(appUser.id, finalGarden);
                                    saveLocalConsumables(appUser.id, finalConsumables);
                                    // Si des plantes existent localement mais pas encore enregistrées en base, synchroniser immédiatement
                                    if (finalGarden.plants.length > 0 && (!data.stats?.garden || (data.stats.garden.plants?.length || 0) === 0)) {
                                        syncGardenToSupabase(appUser.id, finalGarden, finalConsumables, appUser.avatar);
                                    }
                                }

                                setUser(appUser);
                                safeLocalStorageSet('levelmak_user', JSON.stringify(appUser));
                                triggerSync(appUser.id);
                            }
                        }
                    }).catch(e => console.warn("Background check skipped", e));

                } else if (session && !storedUser) {
                    // Session exists but local cache is gone (re-install or clear cache)
                    const [ { data: profile, error }, { data: teacher } ] = await Promise.all([
                        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
                        supabase.from('teachers').select('id, status').eq('user_id', session.user.id).maybeSingle()
                    ]);
                    if (error && (error.status === 401 || error.code === 'PGRST301')) {
                        console.warn("Session is unauthorized (401) on empty cache, signing out...");
                        await signOutUser();
                        setUser(null);
                        localStorage.removeItem('levelmak_user');
                        window.location.reload();
                        return;
                    }
                    if (profile) {
                        const user = mapProfileToUser(profile);
                        if (teacher && teacher.status === 'pending') {
                            user.role = 'teacher';
                        }
                        // Universal Auto-healing: activate subscription for paid accounts or any valid local premium
                        const localPrem = localStorage.getItem(`levelmak_demo_premium_${user.id}`) === 'true';
                        const localPremUntil = localStorage.getItem(`levelmak_demo_premium_until_${user.id}`);
                        const hasValidLocalPrem = !!(localPrem && localPremUntil && new Date(localPremUntil).getTime() > Date.now());
                        const isSpecialAccount = user.id === '5bded745-9a14-407d-b522-9a5cd14a9a3d' ||
                                                 user.id === '81ac026c-95cf-4b38-ab47-f00a7a2cb59c' ||
                                                 user.email === 'rera6544@gmail.com' ||
                                                 user.email === 'better16544@gmail.com';

                        if ((hasValidLocalPrem || isSpecialAccount) && (!user.is_premium || !user.premium_until || new Date(user.premium_until).getTime() < Date.now())) {
                            const targetExp = (hasValidLocalPrem && localPremUntil) ? localPremUntil : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                            user.is_premium = true;
                            user.premium_until = targetExp;
                            localStorage.setItem(`levelmak_demo_premium_${user.id}`, 'true');
                            localStorage.setItem(`levelmak_demo_premium_until_${user.id}`, targetExp);
                        }
                        const savedGoalsStr = user.id ? localStorage.getItem(`levelmak_custom_goals_${user.id}`) : null;
                        if (savedGoalsStr) {
                            try {
                                const cachedGoals = JSON.parse(savedGoalsStr);
                                if (cachedGoals) {
                                    user.analytics = {
                                        ...(user.analytics || {}),
                                        customGoals: cachedGoals
                                    };
                                }
                            } catch (_) {}
                        }
                        if (profile.grade_class) user.gradeClass = profile.grade_class;
                        if (profile.education) user.education = profile.education;
                        const localNotifsStr = user.id ? localStorage.getItem(`levelmak_notifications_${user.id}`) : null;
                        let localNotifs = [];
                        if (localNotifsStr) {
                            try { localNotifs = JSON.parse(localNotifsStr); } catch (_) {}
                        }
                        const rawNotifs = (profile.stats?.notifications && Array.isArray(profile.stats.notifications) && profile.stats.notifications.length > 0)
                            ? profile.stats.notifications
                            : localNotifs;

                        let finalNotifs = rawNotifs.map(normalizeNotification);

                        // Filter out any stale artificial bonus notifications
                        finalNotifs = finalNotifs.filter((n: any) => n?.id !== `bonus_admin_${user.id}`);


                        // Synchronisation et persistance infaillible du Jardin de l'Esprit & Consommables
                        const localGardenStr = user.id ? localStorage.getItem(`levelmak_garden_${user.id}`) : null;
                        const localConsumablesStr = user.id ? localStorage.getItem(`levelmak_consumables_${user.id}`) : null;
                        const finalGarden = resolveGarden(
                            profile.stats?.garden,
                            profile.avatar_config?.garden,
                            profile.garden,
                            localGardenStr
                        );
                        const finalConsumables = resolveConsumables(
                            profile.stats?.consumables,
                            profile.consumables,
                            localConsumablesStr
                        );

                        user.garden = finalGarden;
                        user.consumables = finalConsumables;
                        user.stats = {
                            ...(user.stats || {}),
                            notifications: finalNotifs,
                            garden: finalGarden,
                            consumables: finalConsumables
                        };
                        if (user.id) {
                            localStorage.setItem(`levelmak_notifications_${user.id}`, JSON.stringify(finalNotifs));
                            saveLocalGarden(user.id, finalGarden);
                            saveLocalConsumables(user.id, finalConsumables);
                        }
                        setUser(user);
                        safeLocalStorageSet('levelmak_user', JSON.stringify(user));
                        triggerSync(user.id);
                    }
                } else {
                    // No session or it's expired
                    setUser(null);
                    localStorage.removeItem('levelmak_user');
                }
            } catch (e) {
                console.error("Auth init error:", e);
                setUser(null);
            } finally {
                if (safetyTimer) clearTimeout(safetyTimer);
                // Minimum delay to present the logo beautifully
                // ✅ FIX 16: Minimal delay for logo animation (300ms instead of 1500ms)
                loadingTimer = setTimeout(() => {
                    setLoading(false);
                }, 300);
            }
        };

        initAuth();

        // ✅ Cleanup: cancel pending timers if the effect re-runs or component unmounts
        return () => {
            if (safetyTimer) clearTimeout(safetyTimer);
            if (loadingTimer) clearTimeout(loadingTimer);
        };
    }, [triggerSync]);


    const addActivity = useCallback((type: Activity['type'], title: string, description: string) => {
        setUser(prev => {
            if (!prev) return null;
            const newActivity: Activity = {
                id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type,
                title,
                description,
                timestamp: new Date().toISOString()
            };

            const updated: User = {
                ...prev,
                activities: [newActivity, ...(prev.activities || [])].slice(0, 20)
            };

            // Real-time sync for critical activities
            const criticalTypes: Array<Activity['type'] | 'payment'> = ['quiz', 'badge', 'payment', 'profile'];
            if (criticalTypes.includes(type) && prev.id && !prev.id.includes('anon')) {
                import('../../services/adminService').then(({ syncUserEvent }) => {
                    syncUserEvent(prev.id, prev.name, title, { description, type });
                });
            }

            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const loginWithPhone = useCallback(async (phone: string, password: string) => {
        const loggedUser = await signInWithPhone(phone, password);
        if (!loggedUser) {
            throw new Error('Cette adresse email ou ce mot de passe est incorrect.');
        }
        if (loggedUser.status === 'blocked' || loggedUser.status === 'suspended') {
            await signOutUser();
            throw new Error(loggedUser.status === 'blocked'
                ? 'Ton compte a été bloqué définitivement.'
                : 'Ton compte est suspendu.');
        }
        setUser(loggedUser);
        safeLocalStorageSet('levelmak_user', JSON.stringify(loggedUser));
        triggerSync(loggedUser.id);
    }, [triggerSync]);

    const registerWithPhone = useCallback(async (params: any) => {
        const newUser = await signUpWithPhone(params);
        if (newUser) {
            setUser(newUser);
            safeLocalStorageSet('levelmak_user', JSON.stringify(newUser));
            triggerSync(newUser.id);
        }
    }, [triggerSync]);

    const registerWithEmail = useCallback(async (name: string, email: string, password: string, gender: any, ageRange: any, extra?: any) => {
        const newUser = await signUpWithEmail(email, password, name, gender, ageRange, extra?.phoneNumber, extra?.gradeClass);
        if (newUser) {
            setUser(newUser);
            safeLocalStorageSet('levelmak_user', JSON.stringify(newUser));
            triggerSync(newUser.id);
        }
    }, [triggerSync]);

    const loginWithEmail = useCallback(async (email: string, password: string) => {
        const loggedUser = await signInWithEmail(email, password);
        if (!loggedUser) {
            throw new Error('Cette adresse email ou ce mot de passe est incorrect.');
        }
        if (loggedUser.status === 'blocked' || loggedUser.status === 'suspended') {
            await signOutUser();
            throw new Error(loggedUser.status === 'blocked'
                ? 'Ton compte a été bloqué définitivement.'
                : 'Ton compte est suspendu.');
        }
        setUser(loggedUser);
        safeLocalStorageSet('levelmak_user', JSON.stringify(loggedUser));
        triggerSync(loggedUser.id);
    }, [triggerSync]);

    const loginWithGoogle = useCallback(async () => {
        try {
            setLoading(true);
            const loggedUser = await signInWithGoogle();
            if (loggedUser) {
                setUser(loggedUser);
                safeLocalStorageSet('levelmak_user', JSON.stringify(loggedUser));
                triggerSync(loggedUser.id);
            }
        } finally {
            setLoading(false);
        }
    }, [triggerSync]);

    const logout = useCallback(async () => {
        const userId = user?.id;
        try {
            await signOutUser();
        } catch (e) {
            console.warn('[useAuthStore] Sign out exception (continuing local cleanup):', e);
        } finally {
            setUser(null);
            // ✅ Clean ALL user-specific localStorage keys on logout
            const keysToRemove = [
                'levelmak_user',
                'levelmak_last_sync',
                'levelmak-auth-token',
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));
            if (userId) {
                [
                    `levelmak_${userId}_quizzes`,
                    `levelmak_${userId}_stories`,
                    `levelmak_${userId}_decks`,
                    `levelmak_${userId}_flashcards`,
                    `levelmak_daily_usage_${userId}`,
                    `levelmak_fav_users_${userId}`,
                    `levelmak_demo_premium_${userId}`,
                    `levelmak_demo_premium_until_${userId}`,
                    `levelmak_demo_premium_plan_id_${userId}`,
                    `levelmak_pending_tx_id_${userId}`,
                    `levelmak_pending_plan_${userId}`,
                ].forEach(k => localStorage.removeItem(k));
            }
        }
    }, [user?.id]);

    const updateProfile = useCallback(async (name: string, phoneNumber?: string, updates?: Partial<User>) => {
        let updatedUser: User | null = null;

        setUser(prev => {
            if (!prev) return null;
            
            // Replicate custom fields into user.stats so they sync to Supabase JSONB
            let updatedStats = { ...prev.stats };
            if (updates?.stats !== undefined) updatedStats = { ...updatedStats, ...updates.stats };
            if (updates?.customSubjects !== undefined) updatedStats.customSubjects = updates.customSubjects;
            if ((updates as any)?.activeSubjects !== undefined) updatedStats.activeSubjects = (updates as any).activeSubjects;
            if ((updates as any)?.subjectTargets !== undefined) updatedStats.subjectTargets = (updates as any).subjectTargets;
            if ((updates as any)?.education !== undefined) (updatedStats as any).education = (updates as any).education;
            if (updates?.education !== undefined) (updatedStats as any).education = updates.education;
            if (updates?.gradeClass !== undefined) (updatedStats as any).gradeClass = updates.gradeClass;
            if (updates?.level !== undefined) (updatedStats as any).level = updates.level;
            if (updates?.analytics !== undefined) updatedStats.analytics = updates.analytics;

            // Strictly preserve garden and consumables so they are never lost across profile syncs
            const currentGarden = resolveGarden(
                updates?.garden,
                prev.garden,
                prev.stats?.garden,
                prev.id ? localStorage.getItem(`levelmak_garden_${prev.id}`) : null
            );
            const currentConsumables = resolveConsumables(
                updates?.consumables,
                prev.consumables,
                prev.stats?.consumables,
                prev.id ? localStorage.getItem(`levelmak_consumables_${prev.id}`) : null
            );
            updatedStats.garden = currentGarden;
            updatedStats.consumables = currentConsumables;
            if (prev.id) {
                saveLocalGarden(prev.id, currentGarden);
                saveLocalConsumables(prev.id, currentConsumables);
            }

            const updated = { 
                ...prev, 
                garden: currentGarden,
                consumables: currentConsumables,
                name: name !== undefined ? name : prev.name, 
                phoneNumber: phoneNumber !== undefined ? phoneNumber : prev.phoneNumber, 
                ...updates,
                stats: updatedStats
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
            updatedUser = updated;
            return updated;
        });

        // ✅ Asynchronous Supabase write executed cleanly outside setUser callback
        if (updatedUser && (updatedUser as User).id && !(updatedUser as User).id.includes('anon')) {
            try {
                const u = updatedUser as User;
                const gradeClassVal = u.gradeClass || (u.stats as any)?.gradeClass || u.education;
                const educationVal = u.education || (u.stats as any)?.education || u.gradeClass;

                // Cache localement pour persistance immédiate
                if (u.id) {
                    if (gradeClassVal) localStorage.setItem(`levelmak_grade_class_${u.id}`, gradeClassVal);
                    if (educationVal) localStorage.setItem(`levelmak_education_${u.id}`, educationVal);
                }

                const currentGarden = resolveGarden(
                    u.garden,
                    u.stats?.garden,
                    u.id ? localStorage.getItem(`levelmak_garden_${u.id}`) : null
                );
                const currentConsumables = resolveConsumables(
                    u.consumables,
                    u.stats?.consumables,
                    u.id ? localStorage.getItem(`levelmak_consumables_${u.id}`) : null
                );

                const finalCoins = Number(u.levelCoins ?? (u as any).level_coins ?? 0);
                const updatePayload: any = {
                    name: u.name,
                    phone_number: u.phoneNumber,
                    xp: u.xp,
                    total_xp: u.totalXp,
                    level_coins: finalCoins,
                    grade_class: gradeClassVal,
                    education: educationVal,
                    stats: {
                        ...u.stats,
                        levelCoins: finalCoins,
                        analytics: u.analytics || u.stats?.analytics,
                        gradeClass: gradeClassVal,
                        education: educationVal,
                        level: u.level,
                        garden: currentGarden,
                        consumables: currentConsumables,
                        notifications: u.stats?.notifications || []
                    },
                    badges: u.badges,
                    streak: u.streak,
                    inventory: u.inventory,
                    wallpaper: u.wallpaper,
                    avatar_config: {
                        ...(u.avatar || {}),
                        garden: currentGarden
                    },
                    coach_sessions: u.coachSessions
                };
                if (u.is_premium !== undefined) updatePayload.is_premium = u.is_premium;
                if (u.premium_until !== undefined) updatePayload.premium_until = u.premium_until;

                const { error } = await supabase.from('profiles').update(updatePayload).eq('id', u.id);
                if (error) {
                    console.error('[Supabase updateProfile Sync Error]:', error);
                    throw error;
                }
            } catch (err) {
                console.error('[Supabase updateProfile Exception]:', err);
                throw err;
            }
        }
    }, []);

    // Sync with LocalStorage on state changes
    useEffect(() => {
        if (!loading) {
            if (user) {
                safeLocalStorageSet('levelmak_user', JSON.stringify(user));
            } else {
                localStorage.removeItem('levelmak_user');
            }
        }
    }, [user, loading]);

    // Sync with Supabase on changes
    // ✅ FIX 6: Added isFromRemote guard — this sync only fires for LOCAL changes.
    // The Realtime listener (below) already handles REMOTE updates, so we use a ref
    // to skip re-syncing state that was set by the Realtime listener itself.
    const isFromRemoteRef = useRef(false);
    useEffect(() => {
        if (!user || !user.id || user.id.includes('anon')) return;
        // Skip the sync if this update came from the Realtime listener
        if (isFromRemoteRef.current) {
            isFromRemoteRef.current = false;
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const gradeClassVal = user.gradeClass || (user.stats as any)?.gradeClass || user.education;
                const educationVal = user.education || (user.stats as any)?.education || user.gradeClass;
                const safeGarden = resolveGarden(
                    user.garden,
                    user.stats?.garden,
                    user.id ? localStorage.getItem(`levelmak_garden_${user.id}`) : null
                );
                const safeConsumables = resolveConsumables(
                    user.consumables,
                    user.stats?.consumables,
                    user.id ? localStorage.getItem(`levelmak_consumables_${user.id}`) : null
                );
                const finalCoins = Number(user.levelCoins ?? (user as any).level_coins ?? 0);

                await supabase.from('profiles').update({
                    name: user.name,
                    phone_number: user.phoneNumber,
                    xp: user.xp,
                    total_xp: user.totalXp,
                    level_coins: finalCoins,
                    stats: {
                        ...user.stats,
                        levelCoins: finalCoins,
                        analytics: user.analytics || user.stats?.analytics,
                        garden: safeGarden,
                        consumables: safeConsumables,
                        education: educationVal,
                        gradeClass: gradeClassVal,
                        level: user.level || user.stats?.level,
                        notifications: user.stats?.notifications || []
                    },
                    badges: user.badges,
                    streak: user.streak,
                    inventory: user.inventory,
                    wallpaper: user.wallpaper,
                    avatar_config: {
                        ...(user.avatar || {}),
                        garden: safeGarden
                    },
                    coach_sessions: user.coachSessions
                }).eq('id', user.id);
                
                safeLocalStorageSet('levelmak_last_sync', Date.now().toString());
            } catch (e) {
                console.error("Sync error", e);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [user]);

    // Periodic active session security check (fallback for Realtime)
    // ✅ FIX 7: Interval raised from 8s to 90s.
    // The Realtime channel (below) already handles block/suspend events in real time.
    // This poll is kept ONLY as a safety net for cases where the Realtime connection drops.
    useEffect(() => {
        if (!user || !user.id || user.id.includes('anon')) return;

        const checkSecurityStatus = async () => {
            try {
                const { data: profile } = await supabase.from('profiles').select('status').eq('id', user.id).maybeSingle();
                if (profile) {
                    if (profile.status === 'blocked' || profile.status === 'suspended') {
                        console.warn("Security Check: Account status is blocked/suspended. Evicting active session...");
                        await signOutUser();
                        setUser(null);
                        localStorage.removeItem('levelmak_user');
                        const blockMsg = profile.status === 'blocked'
                            ? "⛔ Votre compte a été bloqué par l'administration Levelmak. Contactez-nous pour plus d'informations."
                            : "⚠️ Votre compte est suspendu temporairement. Contactez l'administration Levelmak.";
                        alert(blockMsg);
                        window.location.reload();
                        return;
                    }
                }
            } catch (e) {
                console.warn("Security check failed silently:", e);
            }
        };

        const interval = setInterval(checkSecurityStatus, 90000); // Every 90s (Realtime handles real-time)
        return () => clearInterval(interval);
    }, [user?.id]);

    // Debounce ref for notification sound — prevents playing multiple times in rapid succession
    const lastNotifSoundRef = useRef<number>(0);
    // Persistent Set of known notification IDs so existing notifications never trigger sounds
    const knownNotifIdsRef = useRef<Set<string>>(new Set());
    // Persistent ref to latest user state to prevent stale closures in event listeners
    const userRef = useRef(user);
    userRef.current = user;

    // Real-time listener for profile updates (admin notifications, block/suspend, or resource adjustments)
    useEffect(() => {
        if (!user || !user.id || user.id.includes('anon')) return;

        // Initialize known notification IDs from current user state
        if (user.stats?.notifications && Array.isArray(user.stats.notifications)) {
            user.stats.notifications.forEach((n: any) => {
                if (n?.id) knownNotifIdsRef.current.add(String(n.id));
            });
        }

        const channel = supabase
            .channel(`profile-realtime-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Realtime profile updated in DB:', payload.new);
                    const dbProfile = payload.new;
                    if (dbProfile) {
                        const currentUser = userRef.current || user;

                        // Check if block/suspend happened
                        if (dbProfile.status === 'blocked' || dbProfile.status === 'suspended') {
                            signOutUser().then(() => {
                                setUser(null);
                                localStorage.removeItem('levelmak_user');
                                alert("ALERTE SÉCURITÉ: Ton compte a été bloqué par l'administration Levelmak.");
                                window.location.reload();
                            });
                            return;
                        }

                        // Map database row to App User
                        const mappedUser = mapProfileToUser(dbProfile);
                        if (currentUser?.role === 'teacher' || localStorage.getItem('levelmak_signing_up_teacher') === 'true') {
                            mappedUser.role = 'teacher';
                        }

                        // Compare against fresh currentUser state
                        const keysToCompare = ['xp', 'totalXp', 'levelCoins', 'level_coins', 'status', 'stats', 'analytics', 'badges', 'is_premium', 'premium_until', 'inventory', 'consumables', 'garden'];
                        const hasChanges = keysToCompare.some(key => {
                            const val1 = JSON.stringify((currentUser as any)[key]);
                            const val2 = JSON.stringify((mappedUser as any)[key]);
                            return val1 !== val2;
                        });

                        if (hasChanges) {
                            console.log('Applying remote database updates to local state');

                            // Preserve locally-equipped avatar & wallpaper
                            const preservedAvatar = (currentUser?.avatar?.image && !dbProfile.avatar_config?.image)
                                ? currentUser.avatar
                                : mappedUser.avatar;
                            const preservedWallpaper = (currentUser?.wallpaper && !dbProfile.wallpaper)
                                ? currentUser.wallpaper
                                : mappedUser.wallpaper;
                            // Preserve garden and consumables across remote updates
                            const preservedGarden = resolveGarden(
                                mappedUser.garden,
                                dbProfile.stats?.garden,
                                dbProfile.avatar_config?.garden,
                                currentUser?.garden,
                                currentUser?.stats?.garden,
                                currentUser?.id ? localStorage.getItem(`levelmak_garden_${currentUser.id}`) : null
                            );
                            const preservedConsumables = resolveConsumables(
                                mappedUser.consumables,
                                dbProfile.stats?.consumables,
                                currentUser?.consumables,
                                currentUser?.stats?.consumables,
                                currentUser?.id ? localStorage.getItem(`levelmak_consumables_${currentUser.id}`) : null
                            );

                            // Preserve customGoals and analytics so local goal toggles are never wiped by remote updates
                            const localGoals = currentUser?.analytics?.customGoals;
                            const remoteGoals = mappedUser.analytics?.customGoals;
                            let preservedCustomGoals = remoteGoals || localGoals;
                            if (localGoals && localGoals.length > 0 && (!remoteGoals || remoteGoals.length === 0)) {
                                preservedCustomGoals = localGoals;
                            } else if (localGoals && localGoals.length > 0 && remoteGoals && remoteGoals.length > 0) {
                                preservedCustomGoals = remoteGoals.map(rg => {
                                    const lm = localGoals.find(l => l.id === rg.id || l.text === rg.text);
                                    return lm ? { ...rg, completed: lm.completed } : rg;
                                });
                            }

                            const preservedAnalytics = (currentUser?.analytics || mappedUser.analytics) ? {
                                ...(mappedUser.analytics || {}),
                                ...(currentUser?.analytics || {}),
                                customGoals: preservedCustomGoals || currentUser?.analytics?.customGoals
                            } : undefined;

                            const finalUser = {
                                ...mappedUser,
                                avatar: preservedAvatar,
                                wallpaper: preservedWallpaper,
                                garden: preservedGarden,
                                consumables: preservedConsumables,
                                stats: {
                                    ...(mappedUser.stats || {}),
                                    garden: preservedGarden,
                                    consumables: preservedConsumables
                                },
                                analytics: preservedAnalytics,
                                customSubjects: currentUser?.customSubjects || mappedUser.customSubjects,
                                activeSubjects: currentUser?.activeSubjects || mappedUser.activeSubjects,
                                subjectTargets: currentUser?.subjectTargets || mappedUser.subjectTargets
                            };

                            if (finalUser.id) {
                                saveLocalGarden(finalUser.id, preservedGarden);
                                saveLocalConsumables(finalUser.id, preservedConsumables);
                            }

                            // Detect if there are genuinely NEW notifications (strictly once per ID)
                            // Also detect if admin gave bonus coins via Realtime
                            const oldCoins = Number(currentUser?.levelCoins ?? (currentUser as any)?.level_coins ?? 0);
                            const newCoins = Number(mappedUser.levelCoins ?? (mappedUser as any)?.level_coins ?? 0);
                            const coinDiff = newCoins - oldCoins;

                            let newNotifs = (finalUser.stats?.notifications || []).map(normalizeNotification);



                            const newlyAdded = newNotifs.filter((n: any) => n?.id && !knownNotifIdsRef.current.has(String(n.id)));

                            if (newlyAdded.length > 0) {
                                // Mark all newly added as known immediately so they can NEVER trigger sounds again
                                newlyAdded.forEach((n: any) => knownNotifIdsRef.current.add(String(n.id)));

                                // Schedule one local notification per genuinely new notif
                                newlyAdded.forEach((notif: any) => {
                                    LocalNotifications.schedule({
                                        notifications: [{
                                            title: notif.title || 'Nouvelle notification',
                                            body: notif.message || '',
                                            id: Math.floor(Math.random() * 100000),
                                            schedule: { at: new Date(Date.now() + 100) }
                                        }]
                                    }).catch(e => console.warn('Local notification failed:', e));
                                });

                                // Play sound ONCE with debounce protection
                                const now = Date.now();
                                if (now - lastNotifSoundRef.current > 3000) {
                                    lastNotifSoundRef.current = now;
                                    audioService.playNotification();
                                }
                            }

                            // Mark this update as coming from Realtime
                            // so the sync useEffect skips it and doesn't send
                            // an unnecessary write back to Supabase.
                            isFromRemoteRef.current = true;
                            setUser(finalUser);
                            safeLocalStorageSet('levelmak_user', JSON.stringify(finalUser));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    // Periodically sync user content (quizzes, stories, flashcards) every 5 minutes
    useEffect(() => {
        if (!user || !user.id || user.id.includes('anon')) return;

        const interval = setInterval(() => {
            // ✅ FIX 17: Check last_sync timestamp before triggering to avoid duplicate syncs.
            const lastSync = localStorage.getItem('levelmak_last_sync');
            const timeSinceLastSync = lastSync ? Date.now() - parseInt(lastSync) : Infinity;
            if (timeSinceLastSync > 4 * 60 * 1000) { // Only sync if last sync was >4 min ago
                triggerSync(user.id);
            }
        }, 5 * 60 * 1000); // 5 minutes

        // Trigger an initial sync shortly after mounting/login to stabilize state
        const initialTimer = setTimeout(() => {
            triggerSync(user.id);
        }, 3000);

        return () => {
            clearInterval(interval);
            clearTimeout(initialTimer);
        };
    }, [user?.id, triggerSync]);

    return {
        user,
        setUser,
        loading,
        setLoading,
        isOnline,
        setIsOnline,
        loginWithPhone,
        registerWithPhone,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        updateProfile,
        addActivity
    };
};
