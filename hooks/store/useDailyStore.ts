import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../../services/cache';
import { aiService } from '../../services/aiService';

// Affirmations du Coach IA & Esprit LEVELMAK (Développement personnel, persévérance, études, confiance, vie)
export const AI_AFFIRMATIONS = [
    {
        quote: "Chaque heure investie dans tes révisions aujourd'hui est une porte qui s'ouvrira avec force demain. Reste constant, la victoire aime la discipline.",
        author: "Coach IA • LEVELMAK"
    },
    {
        quote: "Ne mesure pas ton intelligence à ce que tu sais déjà, mais à ton audace d'apprendre ce qui te semble difficile. Tu as en toi un potentiel d'élite.",
        author: "Coach IA • LEVELMAK"
    },
    {
        quote: "L'échec n'est pas l'opposé de la réussite, c'est son atelier de fabrication. Analyse chaque erreur avec calme et repars à l'assaut avec assurance.",
        author: "L'Esprit LEVELMAK"
    },
    {
        quote: "Ta seule véritable compétition, c'est la personne que tu étais hier. Sois 1% plus déterminé aujourd'hui et regarde ton avenir s'éclairer.",
        author: "Coach IA • LEVELMAK"
    },
    {
        quote: "Le talent ouvre des opportunités, mais c'est la persévérance quotidienne qui bâtit les carrières d'élite. Crois fermement en tes efforts.",
        author: "L'Esprit LEVELMAK"
    },
    {
        quote: "Dans les moments de fatigue ou de doute, rappelle-toi pourquoi tu as commencé. Respire profondément, relève ce défi et prends les rênes de ton destin.",
        author: "Coach IA • LEVELMAK"
    },
    {
        quote: "Un grand savant a été un jour un élève qui a tout simplement refusé d'abandonner. Entraîne ton esprit avec passion et rigueur.",
        author: "L'Esprit LEVELMAK"
    }
];

// Citations inspirantes de Grands Savants, Penseurs et Philosophes
export const SAVANT_QUOTES = [
    {
        quote: "Il n'y a point de génie sans un grain de folie, mais il n'y a point non plus de véritable grandeur sans le travail opiniâtre qui domestique cette audace pour en faire une œuvre immortelle.",
        author: "Sénèque"
    },
    {
        quote: "Ceux qui vivent, ce sont ceux qui luttent ; ce sont ceux dont un dessein ferme emplit l'âme et le front.",
        author: "Victor Hugo"
    },
    {
        quote: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.",
        author: "Albert Einstein"
    },
    {
        quote: "Dans la vie, rien n'est à craindre, tout est à comprendre. C'est le moment de comprendre davantage pour craindre moins.",
        author: "Marie Curie"
    },
    {
        quote: "Cela semble toujours impossible, jusqu'à ce qu'on le fasse.",
        author: "Nelson Mandela"
    },
    {
        quote: "Celui qui déplace une montagne commence par déplacer de petites pierres.",
        author: "Confucius"
    },
    {
        quote: "Le savoir est la seule matière qui s'accroît quand on la partage.",
        author: "Socrate"
    }
];

export const getDailyRotationContent = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Dimanche, 1 = Lundi, 2 = Mardi, 3 = Mercredi, 4 = Jeudi, 5 = Vendredi, 6 = Samedi
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

    // Ratio équilibré : 3 jours Coach IA (Mardi, Jeudi, Samedi) et 4 jours Savants (Dimanche, Lundi, Mercredi, Vendredi)
    const isAiDay = dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6;

    if (isAiDay) {
        return AI_AFFIRMATIONS[dayOfYear % AI_AFFIRMATIONS.length];
    } else {
        return SAVANT_QUOTES[dayOfYear % SAVANT_QUOTES.length];
    }
};

export const useDailyStore = (lang: string = 'fr', gradeLevel?: string) => {
    // Initialize from cache if possible to avoid flicker
    const cachedVocab = cacheService.getSyncDailyVocab(lang);
    const cachedMotivation = cacheService.getSyncDailyMotivation(lang);
    const fallbackMotivation = getDailyRotationContent();

    const [dailyVocab, setDailyVocab] = useState<{ words: any[]; loading: boolean }>({ 
        words: cachedVocab || [], 
        loading: !cachedVocab 
    });
    const [dailyMotivation, setDailyMotivation] = useState<{ quote: string; author: string; loading: boolean }>({
        quote: cachedMotivation?.quote || fallbackMotivation.quote,
        author: cachedMotivation?.author || fallbackMotivation.author,
        loading: !cachedMotivation && !fallbackMotivation
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

            // Rotation intelligente Savants (4j/7) / Coach IA (3j/7)
            const rotationDefault = getDailyRotationContent();
            const now = new Date();
            const isAiDay = now.getDay() === 2 || now.getDay() === 4 || now.getDay() === 6;

            const motivation = await cacheService.getDailyMotivation(
                () => aiService.getDailyMotivation([], lang, gradeLevel),
                lang
            );
            
            let finalQuote = motivation?.quote || rotationDefault.quote;
            let finalAuthor = (motivation?.author || '').trim();

            if (isAiDay) {
                // Jour Coach IA
                if (!finalAuthor || !finalAuthor.toLowerCase().includes('coach') && !finalAuthor.toLowerCase().includes('levelmak')) {
                    finalAuthor = rotationDefault.author;
                    finalQuote = rotationDefault.quote;
                }
            } else {
                // Jour Savant
                if (!finalAuthor || finalAuthor.toLowerCase().includes('coach') || finalAuthor.toLowerCase().includes('levelmak') || finalAuthor.toLowerCase().includes('anonyme')) {
                    finalAuthor = rotationDefault.author;
                    finalQuote = rotationDefault.quote;
                }
            }

            setDailyMotivation({ 
                quote: finalQuote, 
                author: finalAuthor, 
                loading: false 
            });
        } catch (error) {
            console.error('Error refreshing daily content:', error);
            const fallback = getDailyRotationContent();
            setDailyVocab(prev => ({ ...prev, loading: false }));
            setDailyMotivation({ quote: fallback.quote, author: fallback.author, loading: false });
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
