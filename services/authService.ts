import { supabase } from './supabase';
import { User, SchoolLevel } from '../types';

// Convert Supabase User to App User
export const convertSupabaseUser = async (supabaseUser: any): Promise<User | null> => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
            throw new Error(`Erreur Base de Données (Profil) : ${error.message}. Vérifiez que la table 'profiles' existe.`);
        }

        if (profile) {
            return {
                ...profile,
                // Map database fields to User type if names differ
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
                }
            } as User;
        }

        // Create new user profile if it doesn't exist
        const newUser: User = {
            id: supabaseUser.id,
            name: supabaseUser.user_metadata?.name || 'Nouvel Apprenant',
            username: supabaseUser.email?.split('@')[0] || 'user',
            email: supabaseUser.email || '',
            phoneNumber: supabaseUser.user_metadata?.phone || supabaseUser.phone || undefined,
            gender: supabaseUser.user_metadata?.gender || undefined,
            ageRange: supabaseUser.user_metadata?.age_range || undefined,
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
            onboardingCompleted: false
        };

        console.log('Inserting new profile for ID:', newUser.id);
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
                onboarding_completed: newUser.onboardingCompleted
            });

        if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
        }

        console.log('Profile created successfully for:', newUser.id);
        return newUser;
    } catch (error: any) {
        console.error('CRITICAL: convertSupabaseUser failed:', error);
        throw error;
    }
};

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string, name: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) throw error;
        if (!data.user) return null;

        return await convertSupabaseUser(data.user);
    } catch (error: any) {
        console.error('Sign up error:', error);
        throw new Error(error.message);
    }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        if (!data.user) return null;

        return await convertSupabaseUser(data.user);
    } catch (error: any) {
        console.error('Sign in error:', error);
        throw new Error(error.message);
    }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User | null> => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google'
        });

        if (error) throw error;
        // In Supabase OAuth redirects to a new page, so we don't get the user immediately here
        // The App.tsx/useStore will need to handle the session change later
        return null;
    } catch (error: any) {
        console.error('Google sign in error:', error);
        throw new Error(error.message);
    }
};

// Sign up with Phone (Note: Supabase handles phone auth differently, but for Levelmak pro we use derived emails as before for simplicity OR real phone auth)
export const signUpWithPhone = async (
    name: string,
    phone: string,
    password: string,
    gender: 'HOMME' | 'FEMME',
    ageRange: '15-18' | '19-23' | '24+',
    realEmail?: string
): Promise<User | null> => {
    try {
        console.log('--- DEBUG signUpWithPhone ---');
        console.log('Name received:', name ? 'YES' : 'NO');
        console.log('Phone received:', phone ? 'YES' : 'NO');
        console.log('Password length:', password?.length);
        console.log('Gender received:', gender);
        console.log('AgeRange received:', ageRange);
        console.log('RealEmail received:', realEmail);

        const email = realEmail || `${phone.replace(/\D/g, '')}@levelmak.local`;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    phone,
                    gender,
                    age_range: ageRange
                }
            }
        });

        if (error) throw error;
        if (!data.user) return null;

        return await convertSupabaseUser(data.user);
    } catch (error: any) {
        console.error('Phone sign up error:', error);
        throw new Error(error.message);
    }
};

// Sign in with Phone
export const signInWithPhone = async (phone: string, password: string): Promise<User | null> => {
    try {
        const email = `${phone.replace(/\D/g, '')}@levelmak.local`;
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        if (!data.user) return null;

        return await convertSupabaseUser(data.user);
    } catch (error: any) {
        console.error('Phone sign in error:', error);
        throw new Error(error.message);
    }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
};

// Update user profile in Supabase
export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
        // Map User fields to DB fields if necessary
        const dbUpdates: any = { ...updates };
        if (updates.totalXp !== undefined) dbUpdates.total_xp = updates.totalXp;
        if (updates.levelCoins !== undefined) dbUpdates.level_coins = updates.levelCoins;
        if (updates.avatar !== undefined) dbUpdates.avatar_config = updates.avatar;
        if (updates.onboardingCompleted !== undefined) dbUpdates.onboarding_completed = updates.onboardingCompleted;

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

// Get current session
export const getCurrentSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
};

// Change Password
export const changeUserPassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    try {
        // Supabase doesn't require old password for updatePassword if logged in usually, 
        // but for high security it's better. Here we just use the simple update.
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
    } catch (error: any) {
        console.error('Change password error:', error);
        throw new Error(error.message);
    }
};
