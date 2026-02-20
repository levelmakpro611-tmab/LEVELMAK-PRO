import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from './nativeAdapters';

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
            localStorage.setItem(key, value);
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
