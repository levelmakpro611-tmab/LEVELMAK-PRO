import { supabase } from './supabase';

/**
 * Service de cache intelligent pour optimiser les requêtes Gemini
 * Économise ~90% des requêtes quotidiennes en synchronisant le contenu via Supabase
 */

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

interface CachedContent {
    data: any;
    timestamp: number;
    dateString: string;
}

class CacheService {
    private storage = {
        dailyVocab: null as CachedContent | null,
        dailyMotivation: null as CachedContent | null,
    };

    /**
     * Vérifie si un cache est expiré par rapport à la date du jour
     */
    private isExpiredByDate(dateString: string | undefined): boolean {
        if (!dateString) return true;
        const today = new Date().toISOString().split('T')[0];
        return dateString !== today;
    }

    /**
     * Récupère le vocabulaire quotidien (Global Sync via Supabase)
     */
    async getDailyVocab(generator: () => Promise<any>, lang: string = 'fr'): Promise<any> {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `vocabulary_${lang}`;

        // 1. Vérifier le cache local d'abord
        if (this.storage.dailyVocab && this.storage.dailyVocab.dateString === today) {
            // Note: Simple local storage doesn't handle multiple languages easily here, 
            // but we'll check the fetched data's language potential later if needed.
            return this.storage.dailyVocab.data;
        }

        try {
            // 2. Vérifier Supabase pour une version globale
            const { data: cloudData, error } = await supabase
                .from('daily_content')
                .select('*')
                .eq('id', cacheKey)
                .single();

            if (cloudData && cloudData.date_string === today) {
                console.log(`☁️ Vocabulaire (${lang}) récupéré de Supabase`);
                const result = { data: cloudData.data, timestamp: Date.now(), dateString: today };
                this.storage.dailyVocab = result;
                localStorage.setItem(`levelmak_vocab_cache_${lang}`, JSON.stringify(result));
                return cloudData.data;
            }

            // 3. Si rien ne correspond, générer
            console.log(`🔄 Génération nouveau vocabulaire (${lang})...`);
            const data = await generator();
            const result = { data, timestamp: Date.now(), dateString: today };

            // Sauvegarder
            this.storage.dailyVocab = result;
            localStorage.setItem(`levelmak_vocab_cache_${lang}`, JSON.stringify(result));

            await supabase
                .from('daily_content')
                .upsert({
                    id: cacheKey,
                    data,
                    date_string: today,
                    updated_at: new Date().toISOString()
                });

            return data;
        } catch (error) {
            console.error('❌ Erreur sync vocabulaire:', error);
            return generator();
        }
    }

    /**
     * Récupère la motivation quotidienne (Global Sync via Supabase)
     */
    async getDailyMotivation(generator: () => Promise<any>, lang: string = 'fr'): Promise<any> {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `motivation_${lang}`;

        if (this.storage.dailyMotivation && this.storage.dailyMotivation.dateString === today) {
            return this.storage.dailyMotivation.data;
        }

        try {
            const { data: cloudData, error } = await supabase
                .from('daily_content')
                .select('*')
                .eq('id', cacheKey)
                .single();

            if (cloudData && cloudData.date_string === today) {
                console.log(`☁️ Motivation (${lang}) récupérée de Supabase`);
                const result = { data: cloudData.data, timestamp: Date.now(), dateString: today };
                this.storage.dailyMotivation = result;
                localStorage.setItem(`levelmak_motivation_cache_${lang}`, JSON.stringify(result));
                return cloudData.data;
            }

            console.log(`🔄 Génération nouvelle motivation (${lang})...`);
            const data = await generator();
            const result = { data, timestamp: Date.now(), dateString: today };

            this.storage.dailyMotivation = result;
            localStorage.setItem(`levelmak_motivation_cache_${lang}`, JSON.stringify(result));

            await supabase
                .from('daily_content')
                .upsert({
                    id: cacheKey,
                    data,
                    date_string: today,
                    updated_at: new Date().toISOString()
                });

            return data;
        } catch (error) {
            console.error('❌ Erreur sync motivation:', error);
            return generator();
        }
    }

    loadFromStorage() {
        try {
            // Default to 'fr' for initial load, will be corrected on first service call
            const vocabCache = localStorage.getItem('levelmak_vocab_cache_fr');
            const motivationCache = localStorage.getItem('levelmak_motivation_cache_fr');

            if (vocabCache) this.storage.dailyVocab = JSON.parse(vocabCache);
            if (motivationCache) this.storage.dailyMotivation = JSON.parse(motivationCache);
        } catch (error) {
            console.error('⚠️ Erreur chargement cache:', error);
        }
    }

    cleanup() {
        if (this.isExpiredByDate(this.storage.dailyVocab?.dateString)) {
            this.storage.dailyVocab = null;
        }
        if (this.isExpiredByDate(this.storage.dailyMotivation?.dateString)) {
            this.storage.dailyMotivation = null;
        }
    }

    clearAll() {
        this.storage.dailyVocab = null;
        this.storage.dailyMotivation = null;
        console.log('🗑️ Caches nettoyés');
    }
}

export const cacheService = new CacheService();
cacheService.loadFromStorage();
