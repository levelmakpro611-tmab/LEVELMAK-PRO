import { supabase } from './supabase';
import { User, SchoolLevel } from '../types';

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
const convertCache = new Map<string, Promise<User | null>>();

export const convertSupabaseUser = async (supabaseUser: any): Promise<User | null> => {
    const userId = supabaseUser.id;
    
    // If a conversion is already in progress for this user, reuse the promise
    if (convertCache.has(userId)) {
        return convertCache.get(userId)!;
    }

    const conversionPromise = (async () => {
        try {
        // 1. Check for existing profile FIRST
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
        }

        if (profile) {
            // Check if profile is already up to date with auth email if it's missing
            if (!profile.email && supabaseUser.email) {
                await supabase.from('profiles').update({ email: supabaseUser.email }).eq('id', supabaseUser.id);
            }

            const appUser: User = {
                ...profile,
                phoneNumber: profile.phone_number,
                totalXp: profile.total_xp || 0,
                levelCoins: profile.level_coins || 50,
                onboardingCompleted: profile.onboarding_completed || false,
                level: profile.level as SchoolLevel,
                avatar: profile.avatar_config || {
                    baseColor: '#3B82F6',
                    accessory: 'none',
                    aura: 'none',
                    currentLevel: 1
                },
                stats: profile.stats || {
                    quizzesCompleted: 0,
                    hoursLearned: 0,
                    booksRead: 0,
                    storiesWritten: 0,
                    flashcardsStudied: 0
                },
                status: profile.status || 'active',
                badges: profile.badges || [],
                favorites: profile.favorites || [],
                friends: profile.friends || [],
                inventory: profile.inventory || [],
                activities: profile.activities || [],
                progression: profile.progression || [],
            } as User;
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
                xp: newUser.xp,
                total_xp: newUser.totalXp,
                level_coins: newUser.levelCoins,
                avatar_config: newUser.avatar,
                stats: newUser.stats,
                streak: newUser.streak,
                onboarding_completed: newUser.onboardingCompleted,
                status: 'active'
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
export const signUpWithEmail = async (email: string, password: string, name: string, gender?: string, ageRange?: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, real_email: email, gender, age_range: ageRange }
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
// Sign in with Email and Password
// ======================================================
export const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    try {
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
        throw new Error(error.message);
    }
};

// ======================================================
// Sign in with Google (OAuth)
// ======================================================
export const signInWithGoogle = async (): Promise<User | null> => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
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
    realEmail?: string
}): Promise<User | null> => {
    const { name, phone, password, gender, ageRange, realEmail } = params;
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
                    auth_email: authEmail
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
                phone_number: normalizedPhone
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

        // 1. Handle Admin Case (Direct Username) - High priority
        const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'levelmak611';
        if (identifier.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: '611@levelmak.app',
                password
            });
            if (error) throw error;
            if (!data.user) return null;
            return await convertSupabaseUser(data.user);
        }

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
            } catch (fastErr) {
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
                        phone_number: normalizedDigits 
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
        if (error.errors) {
            const invalidCreds = error.errors.some((e: any) => e.message?.includes('Invalid login credentials'));
            if (invalidCreds) message = 'Numéro ou mot de passe incorrect.';
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
// Change Password
// ======================================================
export const changeUserPassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
    } catch (error: any) {
        console.error('Change password error:', error);
        throw new Error(error.message);
    }
};
