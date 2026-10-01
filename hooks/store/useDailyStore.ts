import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../../services/cache';
import { aiService } from '../../services/aiService';

export const useDailyStore = (lang: string = 'fr', gradeLevel?: string) => {
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

            // Motivation tailored to gradeLevel
            const motivation = await cacheService.getDailyMotivation(
                () => aiService.getDailyMotivation([], lang, gradeLevel),
                lang
            );
            
            let safeAuthor = (motivation?.author || '').trim();
            if (!safeAuthor || safeAuthor.toLowerCase().includes('levelmak') || safeAuthor.toLowerCase().includes('coach') || safeAuthor.toLowerCase().includes('anonyme')) {
                safeAuthor = "Victor Hugo";
            }

            setDailyMotivation({ 
                quote: motivation?.quote || "L'éducation est l'arme la plus puissante pour changer le monde.", 
                author: safeAuthor, 
                loading: false 
            });
        } catch (error) {
            console.error('Error refreshing daily content:', error);
            setDailyVocab(prev => ({ ...prev, loading: false }));
            setDailyMotivation(prev => ({ ...prev, loading: false }));
        }
    }, [lang, gradeLevel]);

    useEffect(() => {
        refreshDailyContent();
    }, [refreshDailyContent]);

    return {
        dailyVocab,
        dailyMotivation,
        refreshDailyContent
    };
};
