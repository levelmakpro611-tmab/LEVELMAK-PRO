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
     * Vérifie si le texte est valide (pas juste des guillemets vides, points ou espaces)
     */
    private isValidText(text: string | null | undefined): boolean {
        if (!text) return false;
        const cleaned = text.trim().replace(/^["'.…]+|["'.…]+$/g, '');
        return cleaned.length > 2;
    }

    /**
     * Récupère le vocabulaire quotidien (Global Sync via Supabase)
     */
    async getDailyVocab(generator: () => Promise<any>, lang: string = 'fr'): Promise<any> {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `vocabulary_${lang}`;

        // 1. Vérifier le cache local d'abord
        if (this.storage.dailyVocab && this.storage.dailyVocab.dateString === today) {
            const cachedData = this.storage.dailyVocab.data;
            if (cachedData && Array.isArray(cachedData) && cachedData.length > 0 && this.isValidText(cachedData[0]?.word) && this.isValidText(cachedData[0]?.explanation)) {
                return cachedData;
            } else {
                this.storage.dailyVocab = null;
                localStorage.removeItem(`levelmak_vocab_cache_${lang}`);
            }
        }

        try {
            // 2. Vérifier Supabase pour une version globale
            const { data: cloudData, error } = await supabase
                .from('daily_content')
                .select('*')
                .eq('id', cacheKey)
                .single();

            if (cloudData && cloudData.date_string === today) {
                const cloudDataContent = cloudData.data;
                if (cloudDataContent && Array.isArray(cloudDataContent) && cloudDataContent.length > 0 && this.isValidText(cloudDataContent[0]?.word) && this.isValidText(cloudDataContent[0]?.explanation)) {
                    console.log(`☁️ Vocabulaire (${lang}) récupéré de Supabase`);
                    const result = { data: cloudDataContent, timestamp: Date.now(), dateString: today };
                    this.storage.dailyVocab = result;
                    localStorage.setItem(`levelmak_vocab_cache_${lang}`, JSON.stringify(result));
                    return cloudDataContent;
                }
            }

            // 3. Si rien ne correspond, générer
            console.log(`🔄 Génération nouveau vocabulaire (${lang})...`);
            const data = await generator();
            
            // Validation stricte du contenu
            if (!data || !Array.isArray(data) || data.length === 0 || !this.isValidText(data[0]?.word) || !this.isValidText(data[0]?.explanation)) {
                throw new Error("L'IA a généré un vocabulaire vide ou invalide.");
            }

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
            throw error;
        }
    }

    /**
     * Récupère la motivation quotidienne (Global Sync via Supabase)
     */
    async getDailyMotivation(generator: () => Promise<any>, lang: string = 'fr'): Promise<any> {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `motivation_${lang}`;

        if (this.storage.dailyMotivation && this.storage.dailyMotivation.dateString === today) {
            const cachedData = this.storage.dailyMotivation.data;
            if (cachedData && typeof cachedData === 'object' && this.isValidText(cachedData.quote)) {
                return cachedData;
            } else {
                this.storage.dailyMotivation = null;
                localStorage.removeItem(`levelmak_motivation_cache_${lang}`);
            }
        }

        try {
            const { data: cloudData, error } = await supabase
                .from('daily_content')
                .select('*')
                .eq('id', cacheKey)
                .single();

            if (cloudData && cloudData.date_string === today) {
                const cloudDataContent = cloudData.data;
                if (cloudDataContent && typeof cloudDataContent === 'object' && this.isValidText(cloudDataContent.quote)) {
                    console.log(`☁️ Motivation (${lang}) récupérée de Supabase`);
                    const result = { data: cloudDataContent, timestamp: Date.now(), dateString: today };
                    this.storage.dailyMotivation = result;
                    localStorage.setItem(`levelmak_motivation_cache_${lang}`, JSON.stringify(result));
                    return cloudDataContent;
                }
            }

            console.log(`🔄 Génération nouvelle motivation (${lang})...`);
            const data = await generator();

            // Validation stricte du contenu
            if (!data || typeof data !== 'object' || !this.isValidText(data.quote)) {
                throw new Error("L'IA a généré une motivation vide ou invalide.");
            }

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
            throw error;
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
