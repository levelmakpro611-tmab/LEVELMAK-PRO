import { safeLocalStorageSet } from '../../services/storage';
import React, { useState, useCallback } from 'react';
import { User, Mission, GardenPlant } from '../../types';
import { XP_PER_LEVEL, POTIONS, getXpForNextLevel } from '../../constants';
import { supabase } from '../../services/supabase';

export const useGamificationStore = (
    user: User | null, 
    setUser: React.Dispatch<React.SetStateAction<User | null>>,
    addActivity: (type: any, title: string, desc: string) => void
) => {
    const [missions, setMissions] = useState<Mission[]>([]);

    const addXp = useCallback((amount: number) => {
        setUser(prev => {
            if (!prev) return null;
            const newTotalXp = (prev.totalXp || 0) + amount;
            let remainingXp = (prev.xp || 0) + amount;
            let updatedLevel = prev.avatar?.currentLevel || 1;
            
            let needed = getXpForNextLevel(updatedLevel);
            while (remainingXp >= needed) {
                remainingXp -= needed;
                updatedLevel++;
                needed = getXpForNextLevel(updatedLevel);
            }

            const updatedUser = {
                ...prev,
                totalXp: newTotalXp,
                xp: remainingXp,
                avatar: {
                    ...prev.avatar,
                    currentLevel: updatedLevel
                }
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));

            // Sync immediately with Supabase profiles table
            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({
                    total_xp: newTotalXp,
                    xp: remainingXp,
                    level: updatedLevel,
                    stats: {
                        ...(prev.stats || {}),
                        level: updatedLevel,
                        totalXp: newTotalXp,
                        xp: remainingXp
                    }
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[addXp Supabase Sync Error]:', error);
                });
            }

            return updatedUser;
        });
    }, [setUser]);

    const addLevelCoins = useCallback((amount: number) => {
        setUser(prev => {
            if (!prev) return null;
            const newCoins = (prev.levelCoins || 0) + amount;
            const updated = { ...prev, levelCoins: newCoins };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({
                    coins: newCoins,
                    stats: {
                        ...(prev.stats || {}),
                        levelCoins: newCoins
                    }
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[addLevelCoins Supabase Sync Error]:', error);
                });
            }

            return updated;
        });
    }, [setUser]);

    const betLevelCoins = useCallback((amount: number) => {
        let success = false;
        setUser(prev => {
            if (!prev || (prev.levelCoins || 0) < amount) return prev;
            success = true;
            const updated = { ...prev, levelCoins: prev.levelCoins - amount };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
            return updated;
        });
        return success;
    }, [setUser]);

    const grantBadge = useCallback((badgeId: string, title: string, description: string) => {
        setUser(prev => {
            if (!prev || (prev.badges && prev.badges.includes(badgeId))) return prev;
            
            setTimeout(() => {
                addActivity('badge', title, description);
            }, 0);

            const updated = {
                ...prev,
                badges: [...(prev.badges || []), badgeId]
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
            return updated;
        });
    }, [setUser, addActivity]);

    const plantInGarden = useCallback((type: GardenPlant['type']) => {
        setUser(prev => {
            if (!prev) return null;

            const existingPlants = prev.garden?.plants || [];
            // Find if there is an active growing plant (not yet mature at stage 4)
            const activePlantIndex = existingPlants.findIndex(p => (p.growthStage ?? 0) < 4);

            let updatedPlants: GardenPlant[];
            let isNewPlant = false;

            if (activePlantIndex !== -1) {
                // Grow the existing active plant with +1 quiz contributed
                updatedPlants = existingPlants.map((plant, idx) => {
                    if (idx !== activePlantIndex) return plant;
                    const quizzes = Math.min(5, (plant.quizzesContributed || plant.growthStage || 1) + 1);
                    // 5 quizzes progression:
                    // 1 quiz = Stage 1 (Sprout 🌱 - 20%)
                    // 2 quizzes = Stage 2 (Growing Stem 🌿 - 40%)
                    // 3 quizzes = Stage 2 (Stronger Stem 🌿 - 60%)
                    // 4 quizzes = Stage 3 (Bud / Pre-bloom 🌺/🌲 - 80%)
                    // 5 quizzes = Stage 4 (Full Mature Bloom 🌸/🌹/🌳/🪷 - 100%)
                    let nextStage = 1;
                    if (quizzes >= 5) nextStage = 4;
                    else if (quizzes >= 4) nextStage = 3;
                    else if (quizzes >= 2) nextStage = 2;
                    else nextStage = 1;

                    return {
                        ...plant,
                        growthStage: nextStage,
                        quizzesContributed: quizzes,
                        state: 'healthy' as const,
                        lastWateredAt: new Date().toISOString()
                    };
                });
            } else {
                // All plants are mature or garden is empty -> Plant a new seed/sprout (Quiz 1/5)
                isNewPlant = true;
                const newPlant: GardenPlant = {
                    id: `plant_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                    type,
                    growthStage: 1, // Stage 1 (Sprout 🌱)
                    quizzesContributed: 1, // 1 quiz completed out of 5
                    state: 'healthy',
                    lastWateredAt: new Date().toISOString(),
                    plantedAt: new Date().toISOString()
                };
                updatedPlants = [...existingPlants, newPlant];
            }

            const newGarden = {
                ...prev.garden,
                plants: updatedPlants
            };

            // Award +1 water can when starting a new plant or continuing care
            const currentWater = prev.consumables?.['water_can'] || 0;
            const newConsumables = {
                ...prev.consumables,
                water_can: isNewPlant ? currentWater + 1 : currentWater
            };
            const newStats = {
                ...prev.stats,
                garden: newGarden,
                consumables: newConsumables
            };
            const updated = {
                ...prev,
                garden: newGarden,
                consumables: newConsumables,
                stats: newStats
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            // Sync immediately to Supabase
            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({ stats: newStats }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[plantInGarden Sync Error]:', error);
                });
            }

            return updated;
        });
    }, [setUser]);

    const waterGarden = useCallback((plantId: string, itemType: 'water_can' | 'fertilizer') => {
        setUser(prev => {
            if (!prev) return null;
            
            const currentItemCount = prev.consumables?.[itemType] || 0;
            if (currentItemCount <= 0) return prev;

            const updatedPlants = (prev.garden?.plants || []).map(plant => {
                if (plant.id !== plantId) return plant;
                
                // Water gives hydration and +0.5 quiz progress; Fertilizer gives a full +1.5 quiz progress boost
                const boost = itemType === 'water_can' ? 0.5 : 1.5;
                const currentQuizzes = plant.quizzesContributed || plant.growthStage || 1;
                const newQuizzes = Math.min(5, currentQuizzes + boost);

                let nextStage = plant.growthStage;
                if (newQuizzes >= 5) nextStage = 4;
                else if (newQuizzes >= 4) nextStage = 3;
                else if (newQuizzes >= 2) nextStage = 2;
                else nextStage = 1;
                
                return { 
                    ...plant, 
                    growthStage: nextStage,
                    quizzesContributed: newQuizzes,
                    state: 'healthy' as const, 
                    lastWateredAt: new Date().toISOString() 
                };
            });

            const newGarden = {
                ...prev.garden,
                plants: updatedPlants
            };

            const newConsumables = {
                ...prev.consumables,
                [itemType]: currentItemCount - 1
            };

            const newStats = {
                ...prev.stats,
                garden: newGarden,
                consumables: newConsumables
            };

            const updated = {
                ...prev,
                consumables: newConsumables,
                garden: newGarden,
                stats: newStats
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            // Sync immediately to Supabase
            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({ stats: newStats }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[waterGarden Sync Error]:', error);
                });
            }

            return updated;
        });
    }, [setUser]);

    const purchaseItem = useCallback((itemId: string, price: number, originalId?: string) => {
        // ✅ FIX 2: Guard against race condition — check balance inside setUser on 'prev'
        // to use the most up-to-date state, not a stale closure capture of 'user'.
        let success = false;
        setUser(prev => {
            if (!prev) return null;
            // Check balance and inventory on 'prev' (the guaranteed latest state)
            if ((prev.levelCoins || 0) < price) return prev;
            if (prev.inventory?.includes(itemId) || (originalId && prev.inventory?.includes(originalId))) return prev;
            success = true;
            const updated = {
                ...prev,
                levelCoins: prev.levelCoins - price,
                inventory: [...(prev.inventory || []), itemId]
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
            return updated;
        });
        return success;
    }, [setUser]);

    const equipItem = useCallback((itemId: string, category: string, image?: string, originalId?: string) => {
        setUser(prev => {
            if (!prev) return prev;
            
            const hasItem = prev.inventory?.includes(itemId) || 
                            (originalId && prev.inventory?.includes(originalId));
            if (!hasItem) return prev;
            
            let updated = { ...prev };
            if (category === 'avatar' && image) {
                updated = {
                    ...prev,
                    avatar: {
                        ...prev.avatar,
                        image: image
                    }
                };
                // ✅ FIX Bug 1: Persist avatar to Supabase immediately so the Realtime
                // listener doesn't overwrite it with the stale DB value.
                if (prev.id && !prev.id.includes('anon')) {
                    supabase.from('profiles')
                        .update({ avatar_config: updated.avatar })
                        .eq('id', prev.id)
                        .then(({ error }) => {
                            if (error) console.error('[equipItem] avatar sync error:', error);
                            else console.log('[equipItem] avatar persisted to Supabase');
                        });
                }
            } else if (category === 'wallpaper' && image) {
                updated = {
                    ...prev,
                    wallpaper: image
                };
                // ✅ FIX Bug 1: Persist wallpaper to Supabase immediately
                if (prev.id && !prev.id.includes('anon')) {
                    supabase.from('profiles')
                        .update({ wallpaper: image })
                        .eq('id', prev.id)
                        .then(({ error }) => {
                            if (error) console.error('[equipItem] wallpaper sync error:', error);
                            else console.log('[equipItem] wallpaper persisted to Supabase');
                        });
                }
            }
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
            return updated;
        });
    }, [setUser]);

    const purchasePotion = useCallback((potionId: string, originalId?: string) => {
        const potion = POTIONS.find(p => p.id === (originalId || potionId));
        if (!user || !potion || (user.levelCoins || 0) < potion.price) return false;

        setUser(prev => {
            if (!prev) return null;
            const key = originalId || potionId;
            const newConsumables = {
                ...prev.consumables,
                [key]: (prev.consumables?.[key] || 0) + 1
            };
            const newStats = {
                ...prev.stats,
                consumables: newConsumables
            };
            const updated = {
                ...prev,
                levelCoins: prev.levelCoins - potion.price,
                consumables: newConsumables,
                stats: newStats
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({ 
                    level_coins: updated.levelCoins,
                    stats: newStats
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[purchasePotion Sync Error]:', error);
                });
            }

            return updated;
        });
        return true;
    }, [user, setUser]);

    // ✅ Renamed from usePotion to consumePotion — functions starting with 'use' are
    // treated as hooks by React's static analysis, causing false 'conditional hook' errors.
    const consumePotion = useCallback((potionId: string, originalId?: string) => {
        setUser(prev => {
            const key = (prev?.consumables?.[potionId] && prev.consumables[potionId] > 0)
                ? potionId
                : originalId;

            if (!prev || !key || !prev.consumables?.[key] || prev.consumables[key] <= 0) return prev;
            
            const updated = {
                ...prev,
                consumables: {
                    ...prev.consumables,
                    [key]: prev.consumables[key] - 1
                }
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
            return updated;
        });
    }, [setUser]);

    return {
        missions,
        setMissions,
        addXp,
        addLevelCoins,
        betLevelCoins,
        grantBadge,
        plantInGarden,
        waterGarden,
        purchaseItem,
        equipItem,
        purchasePotion,
        consumePotion
    };
};
