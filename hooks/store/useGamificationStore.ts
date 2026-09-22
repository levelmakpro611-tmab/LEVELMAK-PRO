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
            return updatedUser;
        });
    }, [setUser]);

    const addLevelCoins = useCallback((amount: number) => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, levelCoins: (prev.levelCoins || 0) + amount };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
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
            const newPlant: GardenPlant = {
                id: `plant_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                type,
                growthStage: 1, // Start as sprout
                state: 'healthy',
                lastWateredAt: new Date().toISOString(),
                plantedAt: new Date().toISOString()
            };
            const newGarden = {
                ...prev.garden,
                plants: [...(prev.garden?.plants || []), newPlant]
            };
            // Award +1 water can upon planting so the student can water their new sprout!
            const currentWater = prev.consumables?.['water_can'] || 0;
            const newConsumables = {
                ...prev.consumables,
                water_can: currentWater + 1
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
                
                const growthBoost = itemType === 'water_can' ? 1 : 2;
                const nextStage = Math.min(4, (plant.growthStage || 0) + growthBoost);
                
                return { 
                    ...plant, 
                    growthStage: nextStage, 
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
