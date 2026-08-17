import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from './nativeAdapters';

/**
 * Safely sets an item in localStorage without throwing QuotaExceededError.
 * If quota is exceeded, it prunes old cached items and heavy fields from levelmak_user
 * and retries, ensuring the call NEVER crashes the app.
 */
export const safeLocalStorageSet = (key: string, value: string): void => {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        console.warn(`[safeLocalStorageSet] Quota exceeded or error setting key "${key}":`, e);
        
        // 1. Clear non-essential cached keys
        const keysToRemove = [
            'levelmak_telemetry_queue',
            'levelmak_logs',
            'levelmak_admin_deleted_users',
            'levelmak_admin_status_overrides',
            'levelmak_admin_premium_overrides',
            'levelmak_quizzes',
            'levelmak_stories',
            'levelmak_flashcards'
        ];
        keysToRemove.forEach(k => {
            try { localStorage.removeItem(k); } catch (_) {}
        });

        // 2. Retry setItem
        try {
            localStorage.setItem(key, value);
            return;
        } catch (_) {}

        // 3. If it's levelmak_user, prune heavy properties
        if (key === 'levelmak_user') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed.activities)) {
                    parsed.activities = parsed.activities.slice(0, 10);
                }
                if (parsed.stats && Array.isArray(parsed.stats.notifications)) {
                    parsed.stats.notifications = parsed.stats.notifications.slice(0, 15);
                }
                if (parsed.analytics) {
                    if (Array.isArray(parsed.analytics.studyTimeByDay)) {
                        parsed.analytics.studyTimeByDay = parsed.analytics.studyTimeByDay.slice(-30);
                    }
                    if (Array.isArray(parsed.analytics.quizPerformance)) {
                        parsed.analytics.quizPerformance = parsed.analytics.quizPerformance.slice(-20);
                    }
                }
                if (typeof parsed.wallpaper === 'string' && parsed.wallpaper.length > 50000) {
                    delete parsed.wallpaper;
                }
                if (parsed.avatar && typeof parsed.avatar.image === 'string' && parsed.avatar.image.length > 50000) {
                    delete parsed.avatar.image;
                }

                const prunedValue = JSON.stringify(parsed);
                localStorage.setItem(key, prunedValue);
            } catch (err) {
                console.error('[safeLocalStorageSet] Failed to save even after pruning:', err);
            }
        }
    }
};

/**
 * Unified Storage API
 * Uses Capacitor Preferences on native platforms, falls back to localStorage on web
 */
class StorageService {
    private useNative: boolean;

    constructor() {
        this.useNative = isNativePlatform();
    }

    /**
     * Set a value in storage
     */
    async set(key: string, value: string): Promise<void> {
        if (this.useNative) {
            await Preferences.set({ key, value });
        } else {
            safeLocalStorageSet(key, value);
        }
    }

    /**
     * Get a value from storage
     */
    async get(key: string): Promise<string | null> {
        if (this.useNative) {
            const { value } = await Preferences.get({ key });
            return value;
        } else {
            return localStorage.getItem(key);
        }
    }

    /**
     * Remove a value from storage
     */
    async remove(key: string): Promise<void> {
        if (this.useNative) {
            await Preferences.remove({ key });
        } else {
            localStorage.removeItem(key);
        }
    }

    /**
     * Clear all storage
     */
    async clear(): Promise<void> {
        if (this.useNative) {
            await Preferences.clear();
        } else {
            localStorage.clear();
        }
    }

    /**
     * Get all keys
     */
    async keys(): Promise<string[]> {
        if (this.useNative) {
            const { keys } = await Preferences.keys();
            return keys;
        } else {
            return Object.keys(localStorage);
        }
    }

    /**
     * Store JSON object
     */
    async setJSON<T>(key: string, value: T): Promise<void> {
        const jsonString = JSON.stringify(value);
        await this.set(key, jsonString);
    }

    /**
     * Retrieve JSON object
     */
    async getJSON<T>(key: string): Promise<T | null> {
        const jsonString = await this.get(key);
        if (!jsonString) return null;

        try {
            return JSON.parse(jsonString) as T;
        } catch (e) {
            console.error(`Failed to parse JSON for key "${key}"`, e);
            return null;
        }
    }
}

// Export singleton instance
export const storage = new StorageService();

/**
 * Migration Helper
 * Migrates data from localStorage to Capacitor Preferences
 */
export const migrateLocalStorageToPreferences = async (): Promise<void> => {
    if (!isNativePlatform()) {
        console.log('Running on web, no migration needed');
        return;
    }

    const keysToMigrate = [
        'levelmak_user',
        'levelmak_quizzes',
        'levelmak_stories',
        'levelmak_books',
        'levelmak_flashcards',
        'levelmak_decks',
        'levelmak_settings',
        'levelmak_daily_vocab'
    ];

    let migratedCount = 0;

    for (const key of keysToMigrate) {
        const value = localStorage.getItem(key);
        if (value) {
            await storage.set(key, value);
            migratedCount++;
        }
    }

    console.log(`✅ Migrated ${migratedCount} items from localStorage to Capacitor Preferences`);
};
