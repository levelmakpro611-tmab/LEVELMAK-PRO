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
// ======================================================
export const convertSupabaseUser = async (supabaseUser: any): Promise<User | null> => {
    try {
        // Try to fetch existing profile
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
            // Don't throw - try to build user from auth data instead
        }

        if (profile) {
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

        // Profile doesn't exist yet - create it from auth metadata
        const metadata = supabaseUser.user_metadata || {};
        const newUser: User = {
            id: supabaseUser.id,
            name: metadata.name || 'Nouvel Apprenant',
            username: (supabaseUser.email?.split('@')[0] || 'user').replace(/[^a-zA-Z0-9]/g, '').substring(0, 15),
            email: metadata.real_email || supabaseUser.email || '',
            phoneNumber: metadata.phone || undefined,
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
        const { error: insertError } = await supabase
            .from('profiles')
            .upsert({
                id: newUser.id,
                name: newUser.name,
                username: newUser.username,
                email: newUser.email,
                phone_number: newUser.phoneNumber,
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
            // Return user anyway - profile creation failure shouldn't block access
        } else {
            console.log('Profile created for:', newUser.id);
        }

        return newUser;
    } catch (error: any) {
        console.error('convertSupabaseUser error:', error);
        throw error;
    }
};

// ======================================================
// Sign up with Email and Password
// ======================================================
export const signUpWithEmail = async (email: string, password: string, name: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, real_email: email }
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
            provider: 'google'
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
    try {
        console.log('--- signInWithPhone ---');

        const normalizedPhone = phone.replace(/\D/g, '');
        const emailFormats = [
            phoneToEmail(phone),                          // normalizedDigits@levelmak.app
            `${normalizedPhone}@levelmak.local`,          // legacy format
        ];

        let lastError: any = null;

        for (const email of emailFormats) {
            console.log('Trying email format:', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (!error && data.user) {
                console.log('Login successful with:', email);
                return await convertSupabaseUser(data.user);
            }
            lastError = error;
        }

        // All formats failed
        if (lastError?.message.includes('Invalid login credentials')) {
            throw new Error('Numéro ou mot de passe incorrect. Si tu viens de t\'inscrire, utilise l\'email à la place.');
        }
        if (lastError?.message.includes('Email not confirmed')) {
            throw new Error('Confirme ton email avant de te connecter, ou connecte-toi avec ton email directement.');
        }
        throw new Error(lastError?.message || 'La connexion a échoué. Réessaie.');
    } catch (error: any) {
        console.error('Phone sign in error:', error);
        throw new Error(error.message);
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
