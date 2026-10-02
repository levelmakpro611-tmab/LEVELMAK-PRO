import { supabase } from './supabase';
import { GardenPlant, UserGarden } from '../types';

export interface ConsumablesState {
  water_can: number;
  fertilizer: number;
  weed_cure: number;
  [key: string]: any;
}

/**
 * Robustly merges multiple garden sources (remote Supabase, local cache, localStorage)
 * ensuring that planted flowers/plants are NEVER lost across restarts, reloads, or cross-device switches.
 */
export const resolveGarden = (...candidates: any[]): UserGarden => {
  const plantsMap = new Map<string, GardenPlant>();
  let latestLastWatered = new Date().toISOString();

  for (const cand of candidates) {
    if (!cand) continue;
    let obj = cand;
    if (typeof obj === 'string') {
      try {
        obj = JSON.parse(obj);
      } catch (_) {
        continue;
      }
    }
    if (!obj) continue;

    if (obj.lastWatered && typeof obj.lastWatered === 'string') {
      if (new Date(obj.lastWatered).getTime() > new Date(latestLastWatered).getTime()) {
        latestLastWatered = obj.lastWatered;
      }
    }

    const plants: GardenPlant[] = Array.isArray(obj.plants)
      ? obj.plants
      : Array.isArray(obj)
      ? obj
      : [];

    for (const p of plants) {
      if (!p || typeof p !== 'object' || !p.id) continue;
      const existing = plantsMap.get(p.id);
      if (!existing) {
        plantsMap.set(p.id, {
          ...p,
          growthStage: Number(p.growthStage) || 1,
          quizzesContributed: Number(p.quizzesContributed || p.growthStage) || 1,
          state: p.state || 'healthy',
          plantedAt: p.plantedAt || new Date().toISOString(),
          lastWateredAt: p.lastWateredAt || new Date().toISOString()
        });
      } else {
        // Merge plant: preserve the highest quiz/stage progression and the most recent watering/status
        const curScore = Number(p.quizzesContributed || p.growthStage) || 0;
        const exScore = Number(existing.quizzesContributed || existing.growthStage) || 0;
        const pWaterDate = p.lastWateredAt ? new Date(p.lastWateredAt).getTime() : 0;
        const exWaterDate = existing.lastWateredAt ? new Date(existing.lastWateredAt).getTime() : 0;

        plantsMap.set(p.id, {
          ...existing,
          ...p,
          growthStage: Math.max(Number(existing.growthStage) || 1, Number(p.growthStage) || 1),
          quizzesContributed: Math.max(exScore, curScore),
          lastWateredAt: pWaterDate >= exWaterDate ? (p.lastWateredAt || existing.lastWateredAt) : existing.lastWateredAt,
          plantedAt: existing.plantedAt || p.plantedAt || new Date().toISOString(),
          state: (existing.state === 'healthy' || p.state === 'healthy') ? 'healthy' : (p.state || existing.state || 'healthy')
        });
      }
    }
  }

  return {
    lastWatered: latestLastWatered,
    plants: Array.from(plantsMap.values())
  };
};

/**
 * Merges consumable items (water cans, fertilizer) ensuring items aren't zeroed out unexpectedly.
 */
export const resolveConsumables = (...candidates: any[]): ConsumablesState => {
  let maxWater = 1; // Always at least 1 free water can for onboarding
  let maxFertilizer = 0;
  let maxWeedCure = 0;
  let mergedExtra: Record<string, any> = {};

  for (const cand of candidates) {
    if (!cand) continue;
    let obj = cand;
    if (typeof obj === 'string') {
      try {
        obj = JSON.parse(obj);
      } catch (_) {
        continue;
      }
    }
    if (!obj || typeof obj !== 'object') continue;

    if (obj.water_can !== undefined && !isNaN(Number(obj.water_can))) {
      maxWater = Math.max(maxWater, Number(obj.water_can));
    }
    if (obj.fertilizer !== undefined && !isNaN(Number(obj.fertilizer))) {
      maxFertilizer = Math.max(maxFertilizer, Number(obj.fertilizer));
    }
    if (obj.weed_cure !== undefined && !isNaN(Number(obj.weed_cure))) {
      maxWeedCure = Math.max(maxWeedCure, Number(obj.weed_cure));
    }

    mergedExtra = { ...mergedExtra, ...obj };
  }

  return {
    ...mergedExtra,
    water_can: maxWater,
    fertilizer: maxFertilizer,
    weed_cure: maxWeedCure
  };
};

export const getLocalGarden = (userId: string): UserGarden | null => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`levelmak_garden_${userId}`);
    if (raw) return resolveGarden(raw);
  } catch (_) {}
  return null;
};

export const saveLocalGarden = (userId: string, garden: UserGarden): void => {
  if (!userId) return;
  try {
    localStorage.setItem(`levelmak_garden_${userId}`, JSON.stringify(garden));
  } catch (_) {}
};

export const getLocalConsumables = (userId: string): ConsumablesState | null => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`levelmak_consumables_${userId}`);
    if (raw) return resolveConsumables(raw);
  } catch (_) {}
  return null;
};

export const saveLocalConsumables = (userId: string, consumables: ConsumablesState): void => {
  if (!userId) return;
  try {
    localStorage.setItem(`levelmak_consumables_${userId}`, JSON.stringify(consumables));
  } catch (_) {}
};

/**
 * Persists garden and consumables immediately to Supabase profiles (both stats and avatar_config for redundancy).
 */
export const syncGardenToSupabase = async (
  userId: string,
  garden: UserGarden,
  consumables: ConsumablesState,
  avatarConfig?: any
): Promise<boolean> => {
  if (!userId || userId.includes('anon')) return false;

  try {
    // 1. Fetch current stats from Supabase to merge cleanly without erasing other stats
    const { data: profile } = await supabase
      .from('profiles')
      .select('stats, avatar_config')
      .eq('id', userId)
      .maybeSingle();

    const currentStats = (profile?.stats && typeof profile.stats === 'object') ? profile.stats : {};
    const updatedStats = {
      ...currentStats,
      garden,
      consumables
    };

    const updatePayload: Record<string, any> = {
      stats: updatedStats
    };

    // Redundant mirror inside avatar_config so garden is permanently preserved even if stats was reset
    const baseAvatar = (profile?.avatar_config && typeof profile.avatar_config === 'object')
      ? profile.avatar_config
      : (avatarConfig || {});
    updatePayload.avatar_config = {
      ...baseAvatar,
      garden
    };

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) {
      console.error('[gardenSyncService] Supabase update failed:', error);
      return false;
    }

    try {
      localStorage.setItem('levelmak_last_sync', Date.now().toString());
    } catch (_) {}

    return true;
  } catch (err) {
    console.error('[gardenSyncService] Exception in syncGardenToSupabase:', err);
    return false;
  }
};
