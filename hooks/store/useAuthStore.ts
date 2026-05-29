import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Activity } from '../../types';
import { supabase } from '../../services/supabase';
import { 
    signUpWithPhone, 
    signInWithPhone,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    convertSupabaseUser, 
    signOutUser 
} from '../../services/authService';

export const useAuthStore = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const locationUpdateTimer = useRef<NodeJS.Timeout | null>(null);

    // Load user from LocalStorage and verify with Supabase on mount
    useEffect(() => {
        const initAuth = async () => {
            const timeoutId = setTimeout(() => {
                setLoading(false);
                console.warn("Auth initialization timed out");
            }, 5000);

            try {
                // 1. Get current session from Supabase
                const { data: { session } } = await supabase.auth.getSession();
                const storedUser = localStorage.getItem('levelmak_user');

                if (session && storedUser) {
                    // ... existing logic ...
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    
                    // Background verify profile status
                    supabase.from('profiles').select('status').eq('id', session.user.id).single()
                        .then(({ data }) => {
                            if (data && (data.status === 'blocked' || data.status === 'suspended')) {
                                signOutUser().then(() => {
                                    setUser(null);
                                    localStorage.removeItem('levelmak_user');
                                    alert("ALERTE SÉCURITÉ: Ton compte a été bloqué.");
                                    window.location.reload();
                                });
                            }
                        }).catch(e => console.warn("Background check skipped", e));

                } else if (session && !storedUser) {
                    // Session exists but local cache is gone (re-install or clear cache)
                    const user = await convertSupabaseUser(session.user);
                    if (user) {
                        setUser(user);
                        localStorage.setItem('levelmak_user', JSON.stringify(user));
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
                clearTimeout(timeoutId);
                // Minimum delay to present the logo beautifully
                setTimeout(() => {
                    setLoading(false);
                }, 1500);
            }
        };

        initAuth();
    }, []);

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

            localStorage.setItem('levelmak_user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const loginWithPhone = useCallback(async (phone: string, password: string) => {
        try {
            setLoading(true);
            const loggedUser = await signInWithPhone(phone, password);
            if (loggedUser) {
                if (loggedUser.status && loggedUser.status !== 'active') {
                    await signOutUser();
                    throw new Error(loggedUser.status === 'blocked'
                        ? 'Ton compte a été bloqué définitivement.'
                        : 'Ton compte est suspendu.');
                }
                setUser(loggedUser);
                localStorage.setItem('levelmak_user', JSON.stringify(loggedUser));
            }
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
    }, []);

    const registerWithPhone = useCallback(async (params: any) => {
        try {
            setLoading(true);
            const newUser = await signUpWithPhone(params);
            if (newUser) {
                setUser(newUser);
                localStorage.setItem('levelmak_user', JSON.stringify(newUser));
            }
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
    }, []);

    const registerWithEmail = useCallback(async (name: string, email: string, password: string, gender: any, ageRange: any, extra?: any) => {
        try {
            setLoading(true);
            const newUser = await signUpWithEmail(email, password, name, gender, ageRange, extra?.phoneNumber);
            if (newUser) {
                setUser(newUser);
                localStorage.setItem('levelmak_user', JSON.stringify(newUser));
            }
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
    }, []);

    const loginWithEmail = useCallback(async (email: string, password: string) => {
        try {
            setLoading(true);
            const loggedUser = await signInWithEmail(email, password);
            if (loggedUser) {
                if (loggedUser.status && loggedUser.status !== 'active') {
                    await signOutUser();
                    throw new Error(loggedUser.status === 'blocked'
                        ? 'Ton compte a été bloqué définitivement.'
                        : 'Ton compte est suspendu.');
                }
                setUser(loggedUser);
                localStorage.setItem('levelmak_user', JSON.stringify(loggedUser));
            }
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
    }, []);

    const loginWithGoogle = useCallback(async () => {
        try {
            setLoading(true);
            const loggedUser = await signInWithGoogle();
            if (loggedUser) {
                setUser(loggedUser);
                localStorage.setItem('levelmak_user', JSON.stringify(loggedUser));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        await signOutUser();
        setUser(null);
        localStorage.removeItem('levelmak_user');
        localStorage.removeItem('levelmak_last_sync');
    }, []);

    const updateProfile = useCallback(async (name: string, phoneNumber?: string, updates?: Partial<User>) => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, name, phoneNumber: phoneNumber || prev.phoneNumber, ...updates };
            localStorage.setItem('levelmak_user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Sync with Supabase on changes
    useEffect(() => {
        if (!user || !user.id || user.id.includes('anon')) return;

        const timer = setTimeout(async () => {
            try {
                await supabase.from('profiles').update({
                    xp: user.xp,
                    total_xp: user.totalXp,
                    level_coins: user.levelCoins,
                    stats: user.stats,
                    badges: user.badges,
                    streak: user.streak,
                    inventory: user.inventory,
                    wallpaper: user.wallpaper,
                    avatar_config: user.avatar
                }).eq('id', user.id);
                
                localStorage.setItem('levelmak_last_sync', Date.now().toString());
            } catch (e) {
                console.error("Sync error", e);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [user]);

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
