import React, { useState, useCallback } from 'react';
import { User, Mission, GardenPlant } from '../../types';
import { XP_PER_LEVEL, POTIONS } from '../../constants';

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
            const newXp = (prev.xp || 0) + amount;
            
            // Level up logic
            const currentLevel = prev.avatar?.currentLevel || 1;
            const xpNeeded = 100 * currentLevel; // Simple formula for now
            
            let updatedLevel = currentLevel;
            let remainingXp = newXp;
            
            if (remainingXp >= xpNeeded) {
                updatedLevel++;
                remainingXp -= xpNeeded;
            }

            return {
                ...prev,
                totalXp: newTotalXp,
                xp: remainingXp,
                avatar: {
                    ...prev.avatar,
                    currentLevel: updatedLevel
                }
            };
        });
    }, [setUser]);

    const addLevelCoins = useCallback((amount: number) => {
        setUser(prev => {
            if (!prev) return null;
            return { ...prev, levelCoins: (prev.levelCoins || 0) + amount };
        });
    }, [setUser]);

    const betLevelCoins = useCallback((amount: number) => {
        let success = false;
        setUser(prev => {
            if (!prev || (prev.levelCoins || 0) < amount) return prev;
            success = true;
            return { ...prev, levelCoins: prev.levelCoins - amount };
        });
        return success;
    }, [setUser]);

    const grantBadge = useCallback((badgeId: string, title: string, description: string) => {
        setUser(prev => {
            if (!prev || (prev.badges && prev.badges.includes(badgeId))) return prev;
            
            setTimeout(() => {
                addActivity('badge', title, description);
            }, 0);

            return {
                ...prev,
                badges: [...(prev.badges || []), badgeId]
            };
        });
    }, [setUser, addActivity]);

    const plantInGarden = useCallback((type: GardenPlant['type']) => {
        setUser(prev => {
            if (!prev) return null;
            const newPlant: GardenPlant = {
                id: `plant_${Date.now()}`,
                type,
                growthStage: 0,
                state: 'healthy',
                lastWateredAt: new Date().toISOString(),
                plantedAt: new Date().toISOString()
            };
            return {
                ...prev,
                garden: {
                    ...prev.garden,
                    plants: [...(prev.garden?.plants || []), newPlant]
                }
            };
        });
    }, [setUser]);

    const waterGarden = useCallback((plantId: string, itemType: 'water_can' | 'fertilizer') => {
        setUser(prev => {
            if (!prev) return null;
            
            const currentItemCount = prev.consumables?.[itemType] || 0;
            if (currentItemCount <= 0) return prev;

            const updatedPlants = (prev.garden?.plants || []).map(plant => {
                if (plant.id !== plantId) return plant;
                
                // Both water and fertilizer now help the plant grow!
                // Water gives +1 growth, Fertilizer gives +2 growth
                const growthBoost = itemType === 'water_can' ? 1 : 2;
                const nextStage = Math.min(4, (plant.growthStage || 0) + growthBoost);
                
                return { 
                    ...plant, 
                    growthStage: nextStage, 
                    state: 'healthy' as const, 
                    lastWateredAt: new Date().toISOString() 
                };
            });

            return {
                ...prev,
                consumables: {
                    ...prev.consumables,
                    [itemType]: currentItemCount - 1
                },
                garden: {
                    ...prev.garden,
                    plants: updatedPlants
                }
            };
        });
    }, [setUser]);

    const purchaseItem = useCallback((itemId: string, price: number, originalId?: string) => {
        if (!user || (user.levelCoins || 0) < price) return false;
        if (user.inventory?.includes(itemId) || (originalId && user.inventory?.includes(originalId))) return false;

        setUser(prev => {
            if (!prev) return null;
            const updated = {
                ...prev,
                levelCoins: prev.levelCoins - price,
                inventory: [...(prev.inventory || []), itemId]
            };
            localStorage.setItem('levelmak_user', JSON.stringify(updated));
            return updated;
        });
        return true;
    }, [user, setUser]);

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
            } else if (category === 'wallpaper' && image) {
                updated = {
                    ...prev,
                    wallpaper: image
                };
            }
            localStorage.setItem('levelmak_user', JSON.stringify(updated));
            return updated;
        });
    }, [setUser]);

    const purchasePotion = useCallback((potionId: string, originalId?: string) => {
        const potion = POTIONS.find(p => p.id === (originalId || potionId));
        if (!user || !potion || (user.levelCoins || 0) < potion.price) return false;

        setUser(prev => {
            if (!prev) return null;
            const key = originalId || potionId;
            const updated = {
                ...prev,
                levelCoins: prev.levelCoins - potion.price,
                consumables: {
                    ...prev.consumables,
                    [key]: (prev.consumables?.[key] || 0) + 1
                }
            };
            localStorage.setItem('levelmak_user', JSON.stringify(updated));
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
            localStorage.setItem('levelmak_user', JSON.stringify(updated));
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
