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

export const useAuthStore = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const locationUpdateTimer = useRef<NodeJS.Timeout | null>(null);

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
                loadingTimer = setTimeout(() => {
                    setLoading(false);
                }, 1500);
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
        try {
            setLoading(true);
            const loggedUser = await signInWithPhone(phone, password);
            if (loggedUser) {
                if (loggedUser.status === 'blocked' || loggedUser.status === 'suspended') {
                    await signOutUser();
                    throw new Error(loggedUser.status === 'blocked'
                        ? 'Ton compte a été bloqué définitivement.'
                        : 'Ton compte est suspendu.');
                }
                setUser(loggedUser);
                safeLocalStorageSet('levelmak_user', JSON.stringify(loggedUser));
                triggerSync(loggedUser.id);
            }
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
    }, [triggerSync]);

    const registerWithPhone = useCallback(async (params: any) => {
        try {
            setLoading(true);
            const newUser = await signUpWithPhone(params);
            if (newUser) {
                setUser(newUser);
                safeLocalStorageSet('levelmak_user', JSON.stringify(newUser));
                triggerSync(newUser.id);
            }
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
    }, [triggerSync]);

    const registerWithEmail = useCallback(async (name: string, email: string, password: string, gender: any, ageRange: any, extra?: any) => {
        try {
            setLoading(true);
            const newUser = await signUpWithEmail(email, password, name, gender, ageRange, extra?.phoneNumber, extra?.gradeClass);
            if (newUser) {
                setUser(newUser);
                safeLocalStorageSet('levelmak_user', JSON.stringify(newUser));
                triggerSync(newUser.id);
            }
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
    }, [triggerSync]);

    const loginWithEmail = useCallback(async (email: string, password: string) => {
        try {
            setLoading(true);
            const loggedUser = await signInWithEmail(email, password);
            if (loggedUser) {
                if (loggedUser.status === 'blocked' || loggedUser.status === 'suspended') {
                    await signOutUser();
                    throw new Error(loggedUser.status === 'blocked'
                        ? 'Ton compte a été bloqué définitivement.'
                        : 'Ton compte est suspendu.');
                }
                setUser(loggedUser);
                safeLocalStorageSet('levelmak_user', JSON.stringify(loggedUser));
                triggerSync(loggedUser.id);
            }
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
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
        await signOutUser();
        setUser(null);
        localStorage.removeItem('levelmak_user');
        localStorage.removeItem('levelmak_last_sync');
    }, []);

    const updateProfile = useCallback(async (name: string, phoneNumber?: string, updates?: Partial<User>) => {
        setUser(prev => {
            if (!prev) return null;
            
            // Replicate custom fields into user.stats so they sync to Supabase JSONB
            let updatedStats = { ...prev.stats };
            if (updates?.customSubjects !== undefined) updatedStats.customSubjects = updates.customSubjects;
            if ((updates as any)?.activeSubjects !== undefined) updatedStats.activeSubjects = (updates as any).activeSubjects;
            if ((updates as any)?.subjectTargets !== undefined) updatedStats.subjectTargets = (updates as any).subjectTargets;
            if (updates?.analytics !== undefined) updatedStats.analytics = updates.analytics;
            if (updates?.stats !== undefined) updatedStats = { ...updatedStats, ...updates.stats };

            const updated = { 
                ...prev, 
                name, 
                phoneNumber: phoneNumber || prev.phoneNumber, 
                ...updates,
                stats: updatedStats
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            // Immediately sync to Supabase DB
            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({
                    name: updated.name,
                    phone_number: updated.phoneNumber,
                    xp: updated.xp,
                    total_xp: updated.totalXp,
                    level_coins: updated.levelCoins,
                    stats: updated.stats,
                    badges: updated.badges,
                    streak: updated.streak,
                    inventory: updated.inventory,
                    wallpaper: updated.wallpaper,
                    avatar_config: updated.avatar,
                    coach_sessions: updated.coachSessions
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[Supabase updateProfile Sync Error]:', error);
                });
            }

            return updated;
        });
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
    useEffect(() => {
        if (!user || !user.id || user.id.includes('anon')) return;

        const timer = setTimeout(async () => {
            try {
                await supabase.from('profiles').update({
                    name: user.name,
                    phone_number: user.phoneNumber,
                    xp: user.xp,
                    total_xp: user.totalXp,
                    level_coins: user.levelCoins,
                    stats: {
                        ...user.stats,
                        education: user.education
                    },
                    badges: user.badges,
                    streak: user.streak,
                    inventory: user.inventory,
                    wallpaper: user.wallpaper,
                    avatar_config: user.avatar,
                    coach_sessions: user.coachSessions
                }).eq('id', user.id);
                
                safeLocalStorageSet('levelmak_last_sync', Date.now().toString());
            } catch (e) {
                console.error("Sync error", e);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [user]);

    // Periodic active session security check & status enforcement (every 8s)
    useEffect(() => {
        if (!user || !user.id || user.id.includes('anon')) return;

        const checkSecurityStatus = async () => {
            try {
                const { data: profile } = await supabase.from('profiles').select('status, is_premium, premium_until, stats').eq('id', user.id).maybeSingle();
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

        const interval = setInterval(checkSecurityStatus, 8000);
        return () => clearInterval(interval);
    }, [user?.id]);

    // Real-time listener for profile updates (admin notifications, block/suspend, or resource adjustments)
    useEffect(() => {
        if (!user || !user.id || user.id.includes('anon')) return;

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
                        if (user?.role === 'teacher' || localStorage.getItem('levelmak_signing_up_teacher') === 'true') {
                            mappedUser.role = 'teacher';
                        }

                        // Compare key values to prevent infinite update loop
                        const keysToCompare = ['xp', 'totalXp', 'levelCoins', 'status', 'stats', 'badges', 'is_premium', 'premium_until'];
                        const hasChanges = keysToCompare.some(key => {
                            const val1 = JSON.stringify((user as any)[key]);
                            const val2 = JSON.stringify((mappedUser as any)[key]);
                            return val1 !== val2;
                        });

                        if (hasChanges) {
                            console.log('Applying remote database updates to local state');

                            // Detect if there are new notifications to trigger local Capacitor notifications
                            const currentNotifs = user.stats?.notifications || [];
                            const newNotifs = mappedUser.stats?.notifications || [];

                            if (newNotifs.length > currentNotifs.length) {
                                const currentIds = new Set(currentNotifs.map((n: any) => n.id));
                                const newlyAdded = newNotifs.filter((n: any) => !currentIds.has(n.id));

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
                                
                                // Play notification sound
                                audioService.playNotification();
                            }

                            setUser(mappedUser);
                            safeLocalStorageSet('levelmak_user', JSON.stringify(mappedUser));
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
            triggerSync(user.id);
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
