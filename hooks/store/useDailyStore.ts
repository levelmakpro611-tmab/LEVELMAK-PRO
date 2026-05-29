import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../../services/cache';
import { aiService } from '../../services/aiService';

export const useDailyStore = (lang: string = 'fr') => {
    // Initialize from cache if possible to avoid flicker
    const cachedVocab = cacheService.getSyncDailyVocab(lang);
    const cachedMotivation = cacheService.getSyncDailyMotivation(lang);

    const [dailyVocab, setDailyVocab] = useState<{ words: any[]; loading: boolean }>({ 
        words: cachedVocab || [], 
        loading: !cachedVocab 
    });
    const [dailyMotivation, setDailyMotivation] = useState<{ quote: string; author: string; loading: boolean }>({
        quote: cachedMotivation?.quote || '',
        author: cachedMotivation?.author || '',
        loading: !cachedMotivation
    });

    const refreshDailyContent = useCallback(async (force: boolean = false) => {
        if (force) {
            setDailyVocab(prev => ({ ...prev, loading: true }));
            setDailyMotivation(prev => ({ ...prev, loading: true }));
        }

        try {
            // Vocab
            const words = await cacheService.getDailyVocab(
                () => aiService.getDailyVocabulary([], lang),
                lang
            );
            setDailyVocab({ words: words || [], loading: false });

            // Motivation
            const motivation = await cacheService.getDailyMotivation(
                () => aiService.getDailyMotivation([], lang),
                lang
            );
            setDailyMotivation({ 
                quote: motivation?.quote || "Le succès est un voyage.", 
                author: motivation?.author || "Anonyme", 
                loading: false 
            });
        } catch (error) {
            console.error('Error refreshing daily content:', error);
            setDailyVocab(prev => ({ ...prev, loading: false }));
            setDailyMotivation(prev => ({ ...prev, loading: false }));
        }
    }, [lang]);

    useEffect(() => {
        refreshDailyContent();
    }, [refreshDailyContent]);

    return {
        dailyVocab,
        dailyMotivation,
        refreshDailyContent
    };
};
