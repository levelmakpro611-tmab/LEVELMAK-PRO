/**
 * Smart FAQ Cache - Système de cache intelligent pour LEVEL-BOT
 * Détecte les questions similaires par analyse de mots-clés
 * Économise jusqu'à 70% des requêtes Gemini pour le chat
 */

interface CachedFAQ {
    question: string;
    answer: string;
    keywords: string[];
    timestamp: number;
    hitCount: number; // Nombre de fois que cette réponse a été réutilisée
}

const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 jours
const SIMILARITY_THRESHOLD = 0.6; // 60% de mots-clés en commun minimum

// Mots vides à ignorer (stop words en français)
const STOP_WORDS = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
    'donc', 'or', 'ni', 'car', 'ce', 'cette', 'ces', 'mon', 'ma', 'mes',
    'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'je', 'tu', 'il', 'elle',
    'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se', 'que', 'qui', 'quoi',
    'dont', 'où', 'comment', 'pourquoi', 'quand', 'quel', 'quelle', 'quels',
    'quelles', 'à', 'au', 'aux', 'avec', 'sans', 'pour', 'par', 'dans',
    'sur', 'sous', 'entre', 'vers', 'chez', 'être', 'avoir', 'faire',
    'dire', 'aller', 'voir', 'savoir', 'pouvoir', 'vouloir', 'devoir',
    'est', 'sont', 'a', 'ai', 'as', 'avons', 'avez', 'ont', 'suis',
    'c', 'est-ce', 'qu', 'quelle', 'quel', 'peux', 'peut', 'peux-tu',
    'pouvez', 'explique', 'expliquer', 'dis', 'donne', 'donner'
]);

class SmartFAQCache {
    private cache: Map<string, CachedFAQ> = new Map();
    private cacheKey = 'levelmak_faq_cache';

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Normalise et extrait les mots-clés d'une question
     */
    private extractKeywords(question: string): string[] {
        // Normalisation
        const normalized = question
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
            .replace(/[?!.,;:]/g, '') // Enlève la ponctuation
            .trim();

        // Extraction des mots
        const words = normalized.split(/\s+/);

        // Filtrage des stop words et mots courts
        const keywords = words.filter(word =>
            word.length > 2 && !STOP_WORDS.has(word)
        );

        return keywords;
    }

    /**
     * Calcule la similarité entre deux ensembles de mots-clés
     * Utilise le coefficient de Jaccard
     */
    private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
        if (keywords1.length === 0 || keywords2.length === 0) return 0;

        const set1 = new Set(keywords1);
        const set2 = new Set(keywords2);

        // Intersection
        const intersection = [...set1].filter(k => set2.has(k));

        // Union
        const union = new Set([...set1, ...set2]);

        // Coefficient de Jaccard
        return intersection.length / union.size;
    }

    /**
     * Recherche une réponse similaire dans le cache
     */
    findSimilarAnswer(question: string): { answer: string; similarity: number; cached: CachedFAQ } | null {
        const questionKeywords = this.extractKeywords(question);

        if (questionKeywords.length === 0) {
            return null; // Question trop vague
        }

        let bestMatch: { cached: CachedFAQ; similarity: number } | null = null;

        for (const [key, cached] of this.cache.entries()) {
            // Vérifier si le cache n'est pas expiré
            if (Date.now() - cached.timestamp > CACHE_DURATION) {
                this.cache.delete(key);
                continue;
            }

            const similarity = this.calculateSimilarity(questionKeywords, cached.keywords);

            if (similarity >= SIMILARITY_THRESHOLD) {
                if (!bestMatch || similarity > bestMatch.similarity) {
                    bestMatch = { cached, similarity };
                }
            }
        }

        if (bestMatch) {
            // Incrémenter le compteur de hits
            bestMatch.cached.hitCount++;
            this.saveToStorage();

            console.log(`📦 FAQ Cache HIT ! Similarité: ${(bestMatch.similarity * 100).toFixed(1)}% | Question: "${bestMatch.cached.question}"`);

            return {
                answer: bestMatch.cached.answer,
                similarity: bestMatch.similarity,
                cached: bestMatch.cached
            };
        }

        console.log('❌ FAQ Cache MISS - Appel Gemini nécessaire');
        return null;
    }

    /**
     * Ajoute une nouvelle paire question/réponse au cache
     */
    addToCache(question: string, answer: string) {
        const keywords = this.extractKeywords(question);

        if (keywords.length === 0) {
            return; // Ne pas cacher les questions vides
        }

        // Créer une clé unique basée sur les mots-clés
        const cacheKey = keywords.sort().join('_');

        const cached: CachedFAQ = {
            question,
            answer,
            keywords,
            timestamp: Date.now(),
            hitCount: 0
        };

        this.cache.set(cacheKey, cached);
        this.saveToStorage();

        console.log(`💾 FAQ ajoutée au cache | Mots-clés: [${keywords.join(', ')}]`);
    }

    /**
     * Sauvegarde le cache dans localStorage
     */
    private saveToStorage() {
        try {
            const data = Array.from(this.cache.entries());
            localStorage.setItem(this.cacheKey, JSON.stringify(data));
        } catch (error) {
            console.error('⚠️ Erreur sauvegarde FAQ cache:', error);
        }
    }

    /**
     * Charge le cache depuis localStorage
     */
    private loadFromStorage() {
        try {
            const data = localStorage.getItem(this.cacheKey);
            if (data) {
                const entries: [string, CachedFAQ][] = JSON.parse(data);
                this.cache = new Map(entries);
                console.log(`✅ FAQ Cache chargé: ${this.cache.size} questions en mémoire`);
            }
        } catch (error) {
            console.error('⚠️ Erreur chargement FAQ cache:', error);
        }
    }

    /**
     * Nettoie les entrées expirées
     */
    cleanup() {
        let removed = 0;
        for (const [key, cached] of this.cache.entries()) {
            if (Date.now() - cached.timestamp > CACHE_DURATION) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            this.saveToStorage();
            console.log(`🗑️ ${removed} FAQ expirées supprimées du cache`);
        }
    }

    /**
     * Statistiques du cache
     */
    getStats() {
        const totalQuestions = this.cache.size;
        const totalHits = Array.from(this.cache.values()).reduce((sum, c) => sum + c.hitCount, 0);
        const avgHitsPerQuestion = totalQuestions > 0 ? totalHits / totalQuestions : 0;

        return {
            totalQuestions,
            totalHits,
            avgHitsPerQuestion: avgHitsPerQuestion.toFixed(1),
            economyRate: totalHits > 0 ? `${((totalHits / (totalHits + totalQuestions)) * 100).toFixed(1)}%` : '0%'
        };
    }

    /**
     * Réinitialise tout le cache (debug)
     */
    clearAll() {
        this.cache.clear();
        localStorage.removeItem(this.cacheKey);
        console.log('🗑️ FAQ Cache complètement vidé');
    }
}

// Instance singleton
export const faqCache = new SmartFAQCache();

// Nettoyage automatique toutes les 6 heures
setInterval(() => {
    faqCache.cleanup();
}, 6 * 60 * 60 * 1000);

// Log des stats au démarrage
setTimeout(() => {
    const stats = faqCache.getStats();
    console.log('📊 FAQ Cache Stats:', stats);
}, 2000);
