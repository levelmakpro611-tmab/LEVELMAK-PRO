import { supabase } from './supabase';
import { User, SchoolLevel, GradeClass } from '../types';

// ======================================================
// Helper: Normalize phone to a consistent email format
// ======================================================
const phoneToEmail = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    return `${cleaned}@levelmak.app`;
};

// ======================================================
// Convert Supabase User to App User (with profile creation)
// Optimized with a short-lived deduplication cache to prevent redundant DB calls
// ======================================================
/**
 * Maps a raw Supabase profile row object into a structured client-side User object.
 * Applies default fallback configurations for stats, avatar config, level, inventory, etc.
 * 
 * @param {any} profile - The database profile row object.
 * @returns {User} A standardized User object.
 */
export const mapProfileToUser = (profile: any): User => {
    const stats = profile.stats || {
        quizzesCompleted: 0,
        hoursLearned: 0,
        booksRead: 0,
        storiesWritten: 0,
        flashcardsStudied: 0
    };
    
    // Check for demo premium overrides stored locally
    const userId = profile.id;
    const localDemoPremium = localStorage.getItem(`levelmak_demo_premium_${userId}`) === 'true';
    const localDemoPremiumUntil = localStorage.getItem(`levelmak_demo_premium_until_${userId}`);
    
    let isPremium = Boolean(profile.is_premium);
    let premiumUntil = profile.premium_until || null;
    
    // Database profile is the primary source of truth for premium status & expiry
    if (profile.premium_until) {
        const expiryTime = new Date(profile.premium_until).getTime();
        if (!isNaN(expiryTime) && expiryTime > Date.now()) {
            isPremium = true;
            premiumUntil = profile.premium_until;
            try {
                localStorage.setItem(`levelmak_demo_premium_${userId}`, 'true');
                localStorage.setItem(`levelmak_demo_premium_until_${userId}`, profile.premium_until);
            } catch (_) {}
        } else {
            isPremium = false;
            try {
                localStorage.removeItem(`levelmak_demo_premium_${userId}`);
                localStorage.removeItem(`levelmak_demo_premium_until_${userId}`);
            } catch (_) {}
        }
    } else if (localDemoPremium && localDemoPremiumUntil) {
        const expiryTime = new Date(localDemoPremiumUntil).getTime();
        if (Date.now() < expiryTime) {
            isPremium = true;
            premiumUntil = localDemoPremiumUntil;
        }
    }

    // Expiration check: If premium_until is passed, subscription is expired
    if (premiumUntil && new Date(premiumUntil).getTime() <= Date.now()) {
        isPremium = false;
    }

    const calculatedTier = isPremium ? (profile.subscription_tier || stats.subscriptionTier || 'mensuel') : 'free';

    // Real Daily Streak (Série) Calculation:
    const rawStreak = profile.streak || { current: 1, lastLogin: new Date().toISOString() };
    let currentStreak = Number(rawStreak.current) || 1;
    let lastLoginIso = rawStreak.lastLogin || new Date().toISOString();

    if (rawStreak.lastLogin) {
        const lastDate = new Date(rawStreak.lastLogin);
        const nowDate = new Date();
        const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
        const nowDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
        const diffMs = nowDay.getTime() - lastDay.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak += 1;
            lastLoginIso = nowDate.toISOString();
            supabase.from('profiles').update({
                streak: { current: currentStreak, lastLogin: lastLoginIso }
            }).eq('id', profile.id).then(() => {});
        } else if (diffDays > 1) {
            currentStreak = 1;
            lastLoginIso = nowDate.toISOString();
            supabase.from('profiles').update({
                streak: { current: currentStreak, lastLogin: lastLoginIso }
            }).eq('id', profile.id).then(() => {});
        }
    }

    return {
        ...profile,
        streak: { current: currentStreak, lastLogin: lastLoginIso },
        is_premium: isPremium,
        premium_until: premiumUntil,
        education: stats.education || profile.education || '',
        phoneNumber: profile.phone_number,
        totalXp: profile.total_xp || 0,
        levelCoins: profile.level_coins || 50,
        onboardingCompleted: profile.onboarding_completed || false,
        level: profile.level as SchoolLevel,
        gradeClass: (profile.grade_class || stats.gradeClass || 'Terminale') as GradeClass,
        subscriptionTier: calculatedTier as any,
        avatar: profile.avatar_config || {
            baseColor: '#3B82F6',
            accessory: 'none',
            aura: 'none',
            currentLevel: 1
        },
        stats: stats,
        garden: stats.garden || profile.garden || profile.avatar_config?.garden || { plants: [] },
        customSubjects: stats.customSubjects || profile.customSubjects || [],
        activeSubjects: stats.activeSubjects || profile.activeSubjects || undefined,
        subjectTargets: stats.subjectTargets || profile.subjectTargets || {},
        analytics: stats.analytics || profile.analytics || undefined,
        coachSessions: profile.coach_sessions || [],
        status: profile.status || 'active',
        badges: profile.badges || [],
        favorites: profile.favorites || [],
        friends: profile.friends || [],
        inventory: profile.inventory || [],
        activities: profile.activities || [],
        progression: profile.progression || [],
    } as User;
};

const convertCache = new Map<string, Promise<User | null>>();

/**
 * Normalizes and converts a standard Supabase User (auth) to the client App User model.
 * If the database profile does not exist yet, it automatically creates it from the auth metadata.
 * Employs a short-lived deduplication cache to prevent redundant concurrent queries.
 * 
 * @param {any} supabaseUser - The Supabase auth user object.
 * @returns {Promise<User | null>} The mapped App User, or null if initialization fails.
 */
export const convertSupabaseUser = async (supabaseUser: any): Promise<User | null> => {
    const userId = supabaseUser.id;
    
    // If a conversion is already in progress for this user, reuse the promise
    if (convertCache.has(userId)) {
        return convertCache.get(userId)!;
    }

    const conversionPromise = (async () => {
        try {
        // 1. Check for existing profile FIRST alongside admin logs for real-time status/bonus sync
        const [ { data: profile, error }, { data: teacher }, { data: adminLogs } ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', supabaseUser.id).single(),
            supabase.from('teachers').select('id, status').eq('user_id', supabaseUser.id).maybeSingle(),
            Promise.resolve(supabase.from('admin_logs').select('*').eq('target_user_id', supabaseUser.id).order('timestamp', { ascending: false }).limit(10)).catch(() => ({ data: null }))
        ]);

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
        }
        if (profile) {
            // === AUTHORITATIVE BLOCK CHECK ===
            // Use profile.status ONLY as the single source of truth.
            // admin_logs are NOT used here because they can be inconsistent:
            // a block_user log can still exist after an unblock_user operation.
            // The Edge Function always updates profile.status atomically → reliable.
            const finalStatus = profile.status || 'active';

            if (finalStatus === 'blocked' || finalStatus === 'suspended') {
                await supabase.auth.signOut();
                localStorage.removeItem('levelmak_user');
                const msg = finalStatus === 'blocked'
                    ? "Votre compte a été bloqué par l'administration. Contactez-nous pour plus d'informations."
                    : "Votre compte est suspendu temporairement. Contactez l'administration.";
                throw new Error(msg);
            }  

            // Sync any bonus notifications from admin_logs if missing in profile.stats
            const bonusLogs = (adminLogs as any)?.filter?.((l: any) => l.details?.notification);
            if (bonusLogs && bonusLogs.length > 0) {
                const currentStats = profile.stats || {};
                const currentNotifs = currentStats.notifications || [];
                const existingNotifIds = new Set(currentNotifs.map((n: any) => n.id));
                let statsUpdated = false;

                bonusLogs.forEach((bLog: any) => {
                    const notif = bLog.details.notification;
                    if (notif && !existingNotifIds.has(notif.id)) {
                        currentNotifs.unshift(notif);
                        existingNotifIds.add(notif.id);
                        statsUpdated = true;
                    }
                    if (bLog.details.type === 'bonus_granted') {
                        if (bLog.details.premium_until) profile.premium_until = bLog.details.premium_until;
                        profile.is_premium = true;
                    }
                });

                if (statsUpdated) {
                    currentStats.notifications = currentNotifs;
                    profile.stats = currentStats;
                }
            }

            // Check if profile is already up to date with auth email if it's missing
            if (!profile.email && supabaseUser.email) {
                await supabase.from('profiles').update({ 
                    email: supabaseUser.email,
                    last_active: new Date().toISOString()
                }).eq('id', supabaseUser.id);
            } else {
                await supabase.from('profiles').update({ 
                    last_active: new Date().toISOString()
                }).eq('id', supabaseUser.id);
            }

            const appUser = mapProfileToUser(profile);
            if (teacher && teacher.status === 'pending') {
                appUser.role = 'teacher';
            }
            return appUser;
        }

        // 2. Profile doesn't exist yet - create it from auth metadata
        const metadata = supabaseUser.user_metadata || {};
        const newUser: User = {
            id: supabaseUser.id,
            name: metadata.name || 'Nouvel Apprenant',
            username: (supabaseUser.email?.split('@')[0] || 'user').replace(/[^a-zA-Z0-9]/g, '').substring(0, 15),
            email: metadata.real_email || supabaseUser.email || '',
            phoneNumber: metadata.phone ? metadata.phone.replace(/\D/g, '') : undefined,
            gender: metadata.gender || undefined,
            ageRange: metadata.age_range || undefined,
            level: SchoolLevel.MIDDLE,
            gradeClass: (metadata.grade_class || 'Terminale') as GradeClass,
            subscriptionTier: 'free',
            avatar: {
                baseColor: '#3B82F6',
                accessory: 'none',
                aura: 'none',
                currentLevel: 1
            },
            xp: 0,
            totalXp: 0,
            rank: 999,
            stats: {
                quizzesCompleted: 0,
                hoursLearned: 0,
                booksRead: 0,
                storiesWritten: 0,
                flashcardsStudied: 0
            },
            badges: [],
            favorites: [],
            friends: [],
            levelCoins: 50,
            inventory: [],
            streak: { current: 1, lastLogin: new Date().toISOString() },
            activities: [],
            progression: [{ date: new Date().toISOString().split('T')[0], xp: 0 }],
            onboardingCompleted: false,
            status: 'active'
        };

        console.log('Creating new profile for:', newUser.id, newUser.name);
        // Using upsert with ON CONFLICT if necessary, but here we already checked selectivity
        const { error: insertError } = await supabase
            .from('profiles')
            .upsert({
                id: newUser.id,
                name: newUser.name,
                username: newUser.username,
                email: newUser.email,
                phone_number: newUser.phoneNumber,
                auth_email: metadata.auth_email || supabaseUser.email || '',
                gender: newUser.gender,
                age_range: newUser.ageRange,
                level: newUser.level,
                grade_class: metadata.grade_class || 'Terminale',
                subscription_tier: 'free',
                xp: newUser.xp,
                total_xp: newUser.totalXp,
                level_coins: newUser.levelCoins,
                avatar_config: newUser.avatar,
                stats: newUser.stats,
                streak: newUser.streak,
                onboarding_completed: newUser.onboardingCompleted,
                status: 'active',
                is_premium: false,
                premium_until: null,
                last_active: new Date().toISOString()
            });

        if (insertError) {
            console.error('Error creating profile (non-fatal):', insertError);
        }

        return newUser;
        } catch (error: any) {
            console.error('convertSupabaseUser error:', error);
            throw error;
        }
    })();

    convertCache.set(userId, conversionPromise);
    
    // Auto-cleanup cache after 5 seconds to prevent stale data while handling the login burst
    setTimeout(() => convertCache.delete(userId), 5000);

    return conversionPromise;
};

// ======================================================
// Sign up with Email and Password
// ======================================================
export const signUpWithEmail = async (
    email: string, 
    password: string, 
    name: string, 
    gender?: string, 
    ageRange?: string, 
    phone?: string,
    gradeClass?: GradeClass
): Promise<User | null> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { 
                    name, 
                    real_email: email, 
                    gender, 
                    age_range: ageRange,
                    phone: phone || '',
                    grade_class: gradeClass || 'Terminale'
                }
            }
        });

        if (error) throw error;
        if (!data.user) {
            throw new Error('Compte créé ! Vérifie tes emails pour confirmer ton compte.');
        }

        return await convertSupabaseUser(data.user);
    } catch (error: any) {
        console.error('Sign up error:', error);
        throw new Error(error.message);
    }
};

// ======================================================
// Super Admin Auth Handler (Indestructible Admin Fallback)
// ======================================================
export const handleSuperAdminAuth = async (identifier: string, password: string): Promise<User | null> => {
    const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'levelmak611';
    const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'TMAB611';

    const clean = identifier.trim().toLowerCase();
    const isSuperAdminId = clean === ADMIN_USERNAME.toLowerCase() || 
                           clean === 'levelmak611@gmail.com' || 
                           clean === '611@levelmak.app';

    if (!isSuperAdminId) return null;

    if (password !== ADMIN_PASSWORD && password !== 'TMAB611') {
        throw new Error('Mot de passe administrateur incorrect.');
    }

    // 1. Try standard Supabase auth login first
    const emailsToTry = ['611@levelmak.app', 'levelmak611@gmail.com'];
    for (const email of emailsToTry) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (!error && data.user) {
                const user = await convertSupabaseUser(data.user);
                if (user) {
                    user.role = 'admin';
                    (user as any).isAdmin = true;
                    return user;
                }
            }
        } catch (_) {}
    }

    // 2. Fallback: Re-create / Restore super admin profile in Supabase DB & return super admin User
    const restoredAdmin: User = {
        id: '61100000-0000-4000-a000-000000000611',
        name: 'Administrateur Principal',
        username: 'levelmak611',
        email: 'levelmak611@gmail.com',
        phoneNumber: '611',
        role: 'admin',
        level: SchoolLevel.HIGH,
        gradeClass: 'Terminale',
        subscriptionTier: 'annuel',
        is_premium: true,
        premium_until: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        xp: 99999,
        totalXp: 99999,
        rank: 1,
        levelCoins: 9999,
        avatar: { baseColor: '#8B5CF6', accessory: 'crown', aura: 'gold', currentLevel: 99 },
        stats: {
            quizzesCompleted: 999,
            hoursLearned: 999,
            booksRead: 999,
            storiesWritten: 999,
            flashcardsStudied: 999
        },
        badges: [],
        favorites: [],
        friends: [],
        inventory: [],
        streak: { current: 100, lastLogin: new Date().toISOString() },
        activities: [],
        progression: [],
        onboardingCompleted: true
    };

    try {
        await supabase.from('profiles').upsert({
            id: restoredAdmin.id,
            name: restoredAdmin.name,
            username: restoredAdmin.username,
            email: restoredAdmin.email,
            phone_number: restoredAdmin.phoneNumber,
            is_premium: true,
            premium_until: restoredAdmin.premium_until,
            status: 'active',
            stats: restoredAdmin.stats,
            last_active: new Date().toISOString()
        }, { onConflict: 'id' });
        console.log('✅ Super admin profile restored in Supabase profiles table!');
    } catch (dbErr) {
        console.warn('Super admin DB restore warning:', dbErr);
    }

    return restoredAdmin;
};

// ======================================================
// Sign in with Email and Password
// ======================================================
export const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    try {
        const adminUser = await handleSuperAdminAuth(email, password);
        if (adminUser) return adminUser;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            // User-friendly error message
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Email ou mot de passe incorrect. Vérifie tes informations et réessaie.');
            }
            if (error.message.includes('Email not confirmed')) {
                throw new Error('Ton email n\'est pas encore confirmé. Consulte ta boîte mail.');
            }
            throw error;
        }
        if (!data.user) return null;

        return await convertSupabaseUser(data.user);
    } catch (error: any) {
        console.error('Sign in error:', error);
        if (error.message?.includes('bloqué')) {
            throw new Error(error.message);
        }
        throw new Error(error.message);
    }
};

// ======================================================
// Sign in with Google (OAuth)
// ======================================================
export const signInWithGoogle = async (): Promise<User | null> => {
    try {
        const origin = window.location.origin;
        const validOrigin = (origin && origin !== 'null' && !origin.startsWith('capacitor://'))
            ? origin
            : 'https://levelmak-pro.vercel.app';

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: validOrigin
            }
        });

        if (error) throw error;
        return null; // Redirect handled by OAuth flow
    } catch (error: any) {
        console.error('Google sign in error:', error);
        throw new Error(error.message);
    }
};

// ======================================================
// Sign up with Phone (uses real email as auth identifier)
// ======================================================
export const signUpWithPhone = async (params: {
    name: string,
    phone: string,
    password: string,
    gender: 'HOMME' | 'FEMME',
    ageRange: '15-18' | '19-23' | '24+',
    realEmail?: string,
    gradeClass?: GradeClass
}): Promise<User | null> => {
    const { name, phone, password, gender, ageRange, realEmail, gradeClass } = params;
    try {
        console.log('--- signUpWithPhone ---');

        // Use real email if provided, otherwise generate one from phone
        const authEmail = realEmail && realEmail.includes('@') && !realEmail.includes('@levelmak')
            ? realEmail
            : phoneToEmail(phone);

        console.log('Auth email:', authEmail);

        const { data, error } = await supabase.auth.signUp({
            email: authEmail,
            password,
            options: {
                data: {
                    name,
                    phone,
                    gender,
                    age_range: ageRange,
                    real_email: realEmail || '',
                    auth_email: authEmail,
                    grade_class: gradeClass || 'Terminale'
                }
            }
        });

        if (error) {
            if (error.message.includes('User already registered')) {
                throw new Error('Ce numéro ou cet email est déjà utilisé. Essaie de te connecter à la place.');
            }
            if (error.message.includes('Password should be')) {
                throw new Error('Ton mot de passe doit contenir au moins 6 caractères.');
            }
            throw error;
        }

        if (!data.user) {
            throw new Error('Erreur lors de la création du compte. Réessaie.');
        }

        // Save auth_email and normalized phone to the profile so we can find it during login
        try {
            const normalizedPhone = phone.replace(/\D/g, '');
            await supabase.from('profiles').update({
                auth_email: authEmail,
                phone_number: normalizedPhone,
                last_active: new Date().toISOString()
            }).eq('id', data.user.id);
            console.log('Saved auth_email and phone to profile:', authEmail, normalizedPhone);
        } catch (updateErr) {
            console.warn('Could not save auth_email to profile (non-fatal):', updateErr);
        }

        // data.user is always present even if email confirmation is required
        return await convertSupabaseUser(data.user);
    } catch (error: any) {
        console.error('Phone sign up error:', error);
        throw new Error(error.message);
    }
};

// ======================================================
// Sign in with Phone
// Tries multiple email formats to find the account
// ======================================================
export const signInWithPhone = async (phone: string, password: string): Promise<User | null> => {
    const startTime = Date.now();
    try {
        console.log('🚀 --- signInWithPhone (OPTIMIZED) ---');
        const identifier = phone.trim();
        const normalizedDigits = identifier.replace(/\D/g, '');

        // 1. Handle Admin Case (Direct Username or Email) - Indestructible Admin Auth
        const adminUser = await handleSuperAdminAuth(identifier, password);
        if (adminUser) return adminUser;

        // 2. FAST-PATH: Try cached auth_email from LocalStorage (Instant reconnection)
        const cacheKey = `levelmak_auth_email_${normalizedDigits}`;
        const cachedEmail = localStorage.getItem(cacheKey);
        
        if (cachedEmail) {
            console.log('⚡ Fast-Path: Trying cached email:', cachedEmail);
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: cachedEmail,
                    password
                });
                if (!error && data.user) {
                    console.log(`✅ Login successful via Fast-Path in ${Date.now() - startTime}ms`);
                    return await convertSupabaseUser(data.user);
                }
            } catch (fastErr: any) {
                if (fastErr.message?.includes('bloqué')) {
                    throw fastErr;
                }
                console.warn('Fast-Path failed, falling back to full discovery');
            }
        }

        // 3. FULL DISCOVERY: Parallelize Profile Lookup + Fallback attempts
        console.log('🔍 Starting parallel discovery...');
        
        // Preparation: Generate formats and lookup promise
        const fallbackApp = `${normalizedDigits}@levelmak.app`;
        const fallbackLocal = `${normalizedDigits}@levelmak.local`;
        
        // Discovery worker: Profile Lookup + trials
        const discoveryAttempt = async (): Promise<any> => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email, auth_email')
                .or(`phone_number.eq."${identifier}",phone_number.eq."${normalizedDigits}"`)
                .maybeSingle();
            
            const discoveryEmails = [];
            if (profile?.auth_email) discoveryEmails.push(profile.auth_email);
            if (profile?.email && profile.email !== profile?.auth_email) discoveryEmails.push(profile.email);
            
            // Try all discovered emails from profile in parallel
            if (discoveryEmails.length > 0) {
                return Promise.any(discoveryEmails.map(email => 
                    supabase.auth.signInWithPassword({ email, password })
                        .then(res => { if (res.error) throw res.error; return { ...res, usedEmail: email }; })
                ));
            }
            throw new Error('No profile emails found');
        };

        // Fallback worker: Direct trial of generated emails
        const fallbackAttempt = async (): Promise<any> => {
            const fallbacks = [fallbackApp, fallbackLocal];
            return Promise.any(fallbacks.map(email => 
                supabase.auth.signInWithPassword({ email, password })
                    .then(res => { if (res.error) throw res.error; return { ...res, usedEmail: email }; })
            ));
        };

        // Run both workers in parallel
        const finalResult = await Promise.any([discoveryAttempt(), fallbackAttempt()]);
        
        if (finalResult.data.user) {
            const usedEmail = finalResult.usedEmail;
            console.log(`✅ Login successful via Discovery in ${Date.now() - startTime}ms with:`, usedEmail);
            
            // Update Cache for next time
            localStorage.setItem(cacheKey, usedEmail);
            
            // Save to profile in background if it was missing (missing auth_email)
            (async () => {
                try {
                    await supabase.from('profiles').update({ 
                        auth_email: usedEmail,
                        phone_number: normalizedDigits,
                        last_active: new Date().toISOString()
                    }).eq('id', finalResult.data.user.id);
                } catch (_) {}
            })();

            return await convertSupabaseUser(finalResult.data.user);
        }

        return null;
    } catch (error: any) {
        // Promise.any can throw an AggregateError if all fail
        console.error('Phone sign in error:', error);
        
        // Flatten error for UI
        let message = 'La connexion a échoué. Vérifie tes identifiants.';
        if (error.message?.includes('bloqu')) {
            message = error.message;
        } else if (error.errors) {
            const invalidCreds = error.errors.some((e: any) => e.message?.includes('Invalid login credentials'));
            if (invalidCreds) message = 'Numéro ou mot de passe incorrect.';
            const blockedErr = error.errors.find((e: any) => e.message?.includes('bloqu'));
            if (blockedErr) message = blockedErr.message;
        } else if (error.message?.includes('Invalid login credentials')) {
            message = 'Numéro ou mot de passe incorrect.';
        }
        
        throw new Error(message);
    }
};

// ======================================================
// Sign out
// ======================================================
export const signOutUser = async (): Promise<void> => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
};

// ======================================================
// Update user profile in Supabase
// ======================================================
export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.xp !== undefined) dbUpdates.xp = updates.xp;
        if (updates.totalXp !== undefined) dbUpdates.total_xp = updates.totalXp;
        if (updates.levelCoins !== undefined) dbUpdates.level_coins = updates.levelCoins;
        if (updates.avatar !== undefined) dbUpdates.avatar_config = updates.avatar;
        if (updates.onboardingCompleted !== undefined) dbUpdates.onboarding_completed = updates.onboardingCompleted;
        if (updates.stats !== undefined) dbUpdates.stats = updates.stats;
        if (updates.badges !== undefined) dbUpdates.badges = updates.badges;
        if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
        if (updates.inventory !== undefined) dbUpdates.inventory = updates.inventory;

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Update profile error:', error);
        throw error;
    }
};

// ======================================================
// Get current session
// ======================================================
export const getCurrentSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
};

// ======================================================
// Change Password with verification
// ======================================================
export const changeUserPassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    try {
        // 1. Get current user email
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) throw new Error('Utilisateur non connecté.');

        // 2. Re-authenticate to verify old password
        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: oldPassword
        });

        if (reauthError) {
            throw new Error('L\'ancien mot de passe est incorrect.');
        }

        // 3. If successful, update to new password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) throw updateError;
        
        console.log('Password updated successfully');
    } catch (error: any) {
        console.error('Change password error:', error);
        throw new Error(error.message);
    }
};

// ======================================================
// Delete Current User Account with verification
// ======================================================
export const deleteCurrentUserAccount = async (password: string): Promise<void> => {
    try {
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) throw new Error('Utilisateur non connecté.');

        // 2. Re-authenticate to verify password
        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password
        });

        if (reauthError) {
            throw new Error('Le mot de passe actuel est incorrect.');
        }

        const userId = user.id;

        // 3. Get the current session token for authorization
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        // 4. Call Edge Function which uses service_role to delete auth account + all data
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erreur lors de la suppression du compte.');
        }

        // 5. Sign out locally
        await supabase.auth.signOut();
    } catch (error: any) {
        console.error('Delete account error:', error);
        throw new Error(error.message);
    }
};
