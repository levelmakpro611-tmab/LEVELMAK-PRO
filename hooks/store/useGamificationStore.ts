import { safeLocalStorageSet } from '../../services/storage';
import React, { useState, useCallback } from 'react';
import { User, Mission, GardenPlant } from '../../types';
import { XP_PER_LEVEL, POTIONS, getXpForNextLevel, calculateLevelAndXp } from '../../constants';
import { supabase } from '../../services/supabase';
import { 
    resolveGarden, 
    resolveConsumables, 
    saveLocalGarden, 
    saveLocalConsumables, 
    syncGardenToSupabase 
} from '../../services/gardenSyncService';

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
            const calc = calculateLevelAndXp(newTotalXp);
            const updatedLevel = calc.level;
            const remainingXp = calc.currentLevelXp;

            const updatedUser = {
                ...prev,
                totalXp: newTotalXp,
                xp: remainingXp,
                level: updatedLevel,
                avatar: {
                    ...prev.avatar,
                    currentLevel: updatedLevel
                },
                stats: {
                    ...(prev.stats || {}),
                    level: updatedLevel,
                    currentLevel: updatedLevel,
                    totalXp: newTotalXp,
                    xp: remainingXp
                }
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));

            // Sync immediately with Supabase profiles table
            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({
                    total_xp: newTotalXp,
                    xp: remainingXp,
                    level: updatedLevel,
                    avatar_config: updatedUser.avatar,
                    stats: updatedUser.stats
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
            const currentCoins = Number(prev.levelCoins ?? (prev as any).level_coins ?? 0);
            const newCoins = Math.max(0, currentCoins + amount);
            const updated = { 
                ...prev, 
                levelCoins: newCoins,
                level_coins: newCoins,
                stats: {
                    ...(prev.stats || {}),
                    levelCoins: newCoins
                }
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({
                    level_coins: newCoins,
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

    const getEffectiveCoins = useCallback((): number => {
        let coins = Number(user?.levelCoins ?? (user as any)?.level_coins ?? 0);
        try {
            const raw = localStorage.getItem('levelmak_user');
            if (raw) {
                const parsed = JSON.parse(raw);
                const localCoins = Number(parsed.levelCoins ?? parsed.level_coins ?? 0);
                if (!isNaN(localCoins)) {
                    coins = Math.max(coins, localCoins);
                }
            }
        } catch (_) {}
        return coins;
    }, [user]);

    const betLevelCoins = useCallback((amount: number): boolean => {
        const effectiveCoins = getEffectiveCoins();
        if (effectiveCoins < amount) {
            return false;
        }

        const newCoins = Math.max(0, effectiveCoins - amount);

        setUser(prev => {
            if (!prev) return prev;
            const coins = Number(prev.levelCoins ?? (prev as any).level_coins ?? 0);
            const actualNewCoins = Math.max(0, coins - amount);
            const updated = { 
                ...prev, 
                levelCoins: actualNewCoins,
                level_coins: actualNewCoins,
                stats: {
                    ...(prev.stats || {}),
                    levelCoins: actualNewCoins
                }
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({
                    level_coins: actualNewCoins,
                    stats: {
                        ...(prev.stats || {}),
                        levelCoins: actualNewCoins
                    }
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[betLevelCoins Supabase Sync Error]:', error);
                });
            }

            return updated;
        });

        try {
            const raw = localStorage.getItem('levelmak_user');
            if (raw) {
                const parsed = JSON.parse(raw);
                parsed.levelCoins = newCoins;
                parsed.level_coins = newCoins;
                if (parsed.stats) parsed.stats.levelCoins = newCoins;
                safeLocalStorageSet('levelmak_user', JSON.stringify(parsed));
            }
        } catch (_) {}

        return true;
    }, [user, setUser, getEffectiveCoins]);

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

            const localGardenStr = prev.id ? localStorage.getItem(`levelmak_garden_${prev.id}`) : null;
            const baseGarden = resolveGarden(prev.garden, prev.stats?.garden, localGardenStr);
            const existingPlants = baseGarden.plants || [];

            // Find if there is an active growing plant (not yet mature at stage 4)
            const activePlantIndex = existingPlants.findIndex(p => (p.growthStage ?? 0) < 4);

            let updatedPlants: GardenPlant[];
            let isNewPlant = false;

            if (activePlantIndex !== -1) {
                // Grow the existing active plant with +1 quiz contributed (target: 10 quizzes)
                updatedPlants = existingPlants.map((plant, idx) => {
                    if (idx !== activePlantIndex) return plant;

                    // If roots are infested by pests, growth is paused until cured
                    if (plant.hasPests) {
                        return plant;
                    }

                    const currentQuizzes = Number(plant.quizzesContributed || plant.growthStage || 1);
                    const quizzes = Math.min(10, currentQuizzes + 1);

                    const plantedTime = new Date(plant.plantedAt || Date.now()).getTime();
                    const ageDays = (Date.now() - plantedTime) / (1000 * 60 * 60 * 24);
                    const todayStr = new Date().toISOString().split('T')[0];
                    const daysMaintained = (plant.lastCaredDay && plant.lastCaredDay !== todayStr)
                        ? (plant.daysMaintained || 1) + 1
                        : (plant.daysMaintained || 1);

                    // Progression sur 10 quiz et exigence d'entretien sur 2 jours :
                    // 1-2 = Stage 1 (Sprout 🌱)
                    // 3-5 = Stage 2 (Growing Stem 🌿)
                    // 6-7 = Stage 2 (Strong Bush 🪴)
                    // 8-9 = Stage 3 (Pre-bloom Bud 🌺)
                    // 10 = Stage 4 (Full Mature Bloom 🌸/🌳) -> requires at least 2 days of real maintenance
                    let nextStage = 1;
                    if (quizzes >= 10 && (ageDays >= 1.8 || daysMaintained >= 2)) {
                        nextStage = 4;
                    } else if (quizzes >= 7) {
                        nextStage = 3;
                    } else if (quizzes >= 3) {
                        nextStage = 2;
                    } else {
                        nextStage = 1;
                    }

                    // Risque d'attaque de parasites sur les racines (12% à partir du 3e quiz)
                    const pestAttack = (!plant.hasPests && quizzes >= 3 && Math.random() < 0.12);

                    return {
                        ...plant,
                        growthStage: nextStage,
                        quizzesContributed: quizzes,
                        state: pestAttack ? ('pests' as const) : ('healthy' as const),
                        hasPests: pestAttack || plant.hasPests,
                        pestsSince: pestAttack ? new Date().toISOString() : plant.pestsSince,
                        daysMaintained,
                        lastCaredDay: todayStr,
                        lastWateredAt: new Date().toISOString()
                    };
                });
            } else {
                // All plants are mature or garden is empty -> Plant a new seed/sprout (Quiz 1/10)
                isNewPlant = true;
                const newPlant: GardenPlant = {
                    id: `plant_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                    type,
                    growthStage: 1, // Stage 1 (Sprout 🌱)
                    quizzesContributed: 1, // 1 quiz completed out of 10
                    state: 'healthy',
                    lastWateredAt: new Date().toISOString(),
                    plantedAt: new Date().toISOString(),
                    daysMaintained: 1,
                    lastCaredDay: new Date().toISOString().split('T')[0]
                };
                updatedPlants = [...existingPlants, newPlant];
            }

            const newGarden = {
                ...baseGarden,
                plants: updatedPlants
            };

            // Award +1 water can when starting a new plant or continuing care
            const localConsumablesStr = prev.id ? localStorage.getItem(`levelmak_consumables_${prev.id}`) : null;
            const currentConsumables = resolveConsumables(prev.consumables, prev.stats?.consumables, localConsumablesStr);
            const currentWater = currentConsumables.water_can || 0;
            const newConsumables = {
                ...currentConsumables,
                water_can: isNewPlant ? currentWater + 1 : currentWater
            };
            const newStats = {
                ...prev.stats,
                quizzesCompleted: (prev.stats?.quizzesCompleted || 0) + 1,
                garden: newGarden,
                consumables: newConsumables
            };
            const updated = {
                ...prev,
                garden: newGarden,
                consumables: newConsumables,
                stats: newStats
            };

            if (prev.id) {
                saveLocalGarden(prev.id, newGarden);
                saveLocalConsumables(prev.id, newConsumables);
            }
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            // Sync immediately to Supabase
            if (prev.id && !prev.id.includes('anon')) {
                syncGardenToSupabase(prev.id, newGarden, newConsumables, prev.avatar);
            }

            return updated;
        });
    }, [setUser]);

    const waterGarden = useCallback((plantId: string, itemType: 'water_can' | 'fertilizer' | 'weed_cure') => {
        setUser(prev => {
            if (!prev) return null;
            
            const localConsumablesStr = prev.id ? localStorage.getItem(`levelmak_consumables_${prev.id}`) : null;
            const currentConsumables = resolveConsumables(prev.consumables, prev.stats?.consumables, localConsumablesStr);
            const currentItemCount = currentConsumables[itemType] || 0;
            if (currentItemCount <= 0) return prev;

            const localGardenStr = prev.id ? localStorage.getItem(`levelmak_garden_${prev.id}`) : null;
            const baseGarden = resolveGarden(prev.garden, prev.stats?.garden, localGardenStr);

            const updatedPlants = (baseGarden.plants || []).map(plant => {
                if (plant.id !== plantId) return plant;
                
                if (itemType === 'weed_cure') {
                    // Élimination des vers/parasites des racines & régénération
                    return {
                        ...plant,
                        hasPests: false,
                        pestsSince: undefined,
                        state: 'healthy' as const,
                        lastWateredAt: new Date().toISOString()
                    };
                }

                // Water gives hydration and +0.5 quiz progress; Fertilizer gives a full +1.5 quiz progress boost
                const boost = itemType === 'water_can' ? 0.5 : 1.5;
                const currentQuizzes = Number(plant.quizzesContributed || plant.growthStage || 1);
                const newQuizzes = Math.min(10, currentQuizzes + boost);

                const plantedTime = new Date(plant.plantedAt || Date.now()).getTime();
                const ageDays = (Date.now() - plantedTime) / (1000 * 60 * 60 * 24);
                const todayStr = new Date().toISOString().split('T')[0];
                const daysMaintained = (plant.lastCaredDay && plant.lastCaredDay !== todayStr)
                    ? (plant.daysMaintained || 1) + 1
                    : (plant.daysMaintained || 1);

                let nextStage = plant.growthStage;
                if (newQuizzes >= 10 && (ageDays >= 1.8 || daysMaintained >= 2)) {
                    nextStage = 4;
                } else if (newQuizzes >= 7) {
                    nextStage = 3;
                } else if (newQuizzes >= 3) {
                    nextStage = 2;
                } else {
                    nextStage = 1;
                }
                
                return { 
                    ...plant, 
                    growthStage: nextStage,
                    quizzesContributed: newQuizzes,
                    daysMaintained,
                    lastCaredDay: todayStr,
                    state: plant.hasPests ? ('pests' as const) : ('healthy' as const), 
                    lastWateredAt: new Date().toISOString() 
                };
            });

            const newGarden = {
                ...baseGarden,
                plants: updatedPlants
            };

            const newConsumables = {
                ...currentConsumables,
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

            if (prev.id) {
                saveLocalGarden(prev.id, newGarden);
                saveLocalConsumables(prev.id, newConsumables);
            }
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            // Sync immediately to Supabase
            if (prev.id && !prev.id.includes('anon')) {
                syncGardenToSupabase(prev.id, newGarden, newConsumables, prev.avatar);
            }

            return updated;
        });
    }, [setUser]);

    const harvestPlant = useCallback((plantId?: string) => {
        const rewardCoins = 200;
        const rewardXp = 100;

        setUser(prev => {
            if (!prev) return null;

            const localGardenStr = prev.id ? localStorage.getItem(`levelmak_garden_${prev.id}`) : null;
            const baseGarden = resolveGarden(prev.garden, prev.stats?.garden, localGardenStr);
            const plants = baseGarden.plants || [];

            // Identify plant to harvest: matching plantId or the mature plant (10 quiz / stage 4)
            let targetPlant = plantId ? plants.find(p => p.id === plantId) : null;
            if (!targetPlant) {
                targetPlant = plants.find(p => (p.quizzesContributed || 0) >= 10 || (p.growthStage ?? 0) >= 4) || plants[0];
            }
            if (!targetPlant) return prev;

            const targetId = targetPlant.id;
            // Remove the harvested plant so the slot is cleared completely
            const updatedPlants = plants.filter(p => p.id !== targetId && p.id !== plantId);
            const newGarden = {
                ...baseGarden,
                plants: updatedPlants
            };

            const curCoins = Number(prev.levelCoins ?? (prev as any).level_coins ?? 0);
            const newCoins = curCoins + rewardCoins;
            const totalXp = (prev.totalXp || 0) + rewardXp;
            const xpLevelInfo = calculateLevelAndXp(totalXp, (prev.xp || 0) + rewardXp);

            const newStats = {
                ...(prev.stats || {}),
                garden: newGarden,
                levelCoins: newCoins
            };

            const updatedAvatar = {
                ...(prev.avatar || {}),
                garden: newGarden
            };

            const updated = {
                ...prev,
                levelCoins: newCoins,
                level_coins: newCoins,
                totalXp,
                xp: xpLevelInfo.currentLevelXp,
                level: String(xpLevelInfo.level),
                garden: newGarden,
                avatar: updatedAvatar,
                stats: newStats
            };

            if (prev.id) {
                saveLocalGarden(prev.id, newGarden);
            }
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            // Sync to Supabase
            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({
                    level_coins: newCoins,
                    total_xp: totalXp,
                    xp: xpLevelInfo.currentLevelXp,
                    level: String(xpLevelInfo.level),
                    stats: newStats,
                    avatar_config: updatedAvatar
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[harvestPlant sync error]:', error);
                });
            }

            return updated;
        });

        return { coins: rewardCoins, xp: rewardXp };
    }, [setUser]);

    const purchaseItem = useCallback((itemId: string, price: number, originalId?: string): boolean => {
        const effectiveCoins = getEffectiveCoins();
        const currentInventory = user?.inventory || (() => {
            try {
                const raw = localStorage.getItem('levelmak_user');
                return raw ? (JSON.parse(raw).inventory || []) : [];
            } catch (_) { return []; }
        })();

        if (currentInventory.includes(itemId) || (originalId && currentInventory.includes(originalId))) {
            return false;
        }

        if (effectiveCoins < price) {
            return false;
        }

        const newCoins = Math.max(0, effectiveCoins - price);
        const newInventory = [...currentInventory, itemId];

        setUser(prev => {
            if (!prev) return null;
            const coins = Number(prev.levelCoins ?? (prev as any).level_coins ?? 0);
            const actualNewCoins = Math.max(0, coins - price);
            const actualInventory = prev.inventory?.includes(itemId) ? prev.inventory : [...(prev.inventory || []), itemId];
            const newStats = {
                ...(prev.stats || {}),
                levelCoins: actualNewCoins
            };
            const updated = {
                ...prev,
                levelCoins: actualNewCoins,
                level_coins: actualNewCoins,
                inventory: actualInventory,
                stats: newStats
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            // Sync immediately and authoritatively to Supabase
            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({
                    level_coins: actualNewCoins,
                    inventory: actualInventory,
                    stats: newStats
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[purchaseItem Supabase Sync Error]:', error);
                    else console.log('[purchaseItem] Deducted coins & synced to Supabase:', actualNewCoins);
                });
            }

            return updated;
        });

        try {
            const raw = localStorage.getItem('levelmak_user');
            if (raw) {
                const parsed = JSON.parse(raw);
                parsed.levelCoins = newCoins;
                parsed.level_coins = newCoins;
                parsed.inventory = newInventory;
                if (parsed.stats) parsed.stats.levelCoins = newCoins;
                safeLocalStorageSet('levelmak_user', JSON.stringify(parsed));
            }
        } catch (_) {}

        return true;
    }, [user, setUser, getEffectiveCoins]);

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

    const purchasePotion = useCallback((potionId: string, originalId?: string, priceOverride?: number): boolean => {
        const targetId = originalId || potionId;
        const potion = POTIONS.find(p => p.id === targetId || p.id === potionId || (p as any).originalId === targetId);
        const itemPrice = priceOverride !== undefined ? priceOverride : (potion ? potion.price : 0);

        const effectiveCoins = getEffectiveCoins();
        if (effectiveCoins < itemPrice) {
            return false;
        }

        const remainingCoins = Math.max(0, effectiveCoins - itemPrice);
        const key = potion ? potion.id : targetId;

        setUser(prev => {
            if (!prev) return null;
            const curCoins = Number(prev.levelCoins ?? (prev as any).level_coins ?? 0);
            const actualRemaining = Math.max(0, curCoins - itemPrice);
            const newConsumables = {
                ...prev.consumables,
                [key]: (prev.consumables?.[key] || 0) + 1
            };
            const newStats = {
                ...prev.stats,
                consumables: newConsumables,
                levelCoins: actualRemaining
            };
            const updated = {
                ...prev,
                levelCoins: actualRemaining,
                level_coins: actualRemaining,
                consumables: newConsumables,
                stats: newStats
            };

            if (prev.id) {
                saveLocalConsumables(prev.id, newConsumables);
            }
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            // Sync immediately and authoritatively to Supabase
            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({ 
                    level_coins: actualRemaining,
                    stats: newStats
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[purchasePotion Sync Error]:', error);
                    else console.log('[purchasePotion] Successfully synced remaining coins:', actualRemaining);
                });
            }

            return updated;
        });

        try {
            const raw = localStorage.getItem('levelmak_user');
            if (raw) {
                const parsed = JSON.parse(raw);
                parsed.levelCoins = remainingCoins;
                parsed.level_coins = remainingCoins;
                if (parsed.stats) parsed.stats.levelCoins = remainingCoins;
                safeLocalStorageSet('levelmak_user', JSON.stringify(parsed));
            }
        } catch (_) {}

        return true;
    }, [user, setUser, getEffectiveCoins]);

    // ✅ Renamed from usePotion to consumePotion — functions starting with 'use' are
    // treated as hooks by React's static analysis, causing false 'conditional hook' errors.
    const consumePotion = useCallback((potionId: string, originalId?: string) => {
        setUser(prev => {
            const key = (prev?.consumables?.[potionId] && prev.consumables[potionId] > 0)
                ? potionId
                : originalId;

            if (!prev || !key || !prev.consumables?.[key] || prev.consumables[key] <= 0) return prev;
            
            const newConsumables = {
                ...prev.consumables,
                [key]: prev.consumables[key] - 1
            };
            const newStats = {
                ...prev.stats,
                consumables: newConsumables
            };
            const updated = {
                ...prev,
                consumables: newConsumables,
                stats: newStats
            };
            if (prev.id) {
                saveLocalConsumables(prev.id, newConsumables);
            }
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));

            if (prev.id && !prev.id.includes('anon')) {
                supabase.from('profiles').update({
                    stats: newStats
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error('[consumePotion Sync Error]:', error);
                });
            }

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
        harvestPlant,
        purchaseItem,
        equipItem,
        purchasePotion,
        consumePotion
    };
};
