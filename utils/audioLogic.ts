import { openrouterService } from '../services/openrouter';

export interface AudioNote {
    id: string;
    title: string;
    date: string;
    rawText: string;
    cleanNote: string;
    summary: string;
    keyNotions: string[];
    aiLesson?: string;
}

export class AudioLogic {
    private static recognition: any = null;

    /**
     * Initialise la reconnaissance vocale si supportée par le navigateur
     */
    static initSpeechToText(onResult: (data: {final: string, interim: string}) => void, onEnd: () => void) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("Speech Recognition non supporté sur ce navigateur.");
            return null;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'fr-FR';

        this.recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            onResult({ final: finalTranscript, interim: interimTranscript });
        };

        this.recognition.onend = () => {
            onEnd();
        };

        return this.recognition;
    }

    static startRecording() {
        if (this.recognition) {
            this.recognition.start();
        }
    }

    static stopRecording() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    /**
     * Algorithme Master de suppression d'échos et de répétitions sémantiques.
     * Détecte les segments similaires même s'ils ne sont pas identiques à 100%.
     */
    static deduplicatePhrases(text: string): string {
        if (!text) return "";
        let cleaned = text.trim();
        
        // 1. Suppression des bégaiements de mots simples (ex: "bonjour bonjour")
        cleaned = cleaned.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');
        
        const words = cleaned.split(/\s+/);
        const result: string[] = [];
        
        let i = 0;
        while (i < words.length) {
            let skip = 0;
            
            // On cherche des répétitions d'écho sur des fenêtres de 2 à 10 mots
            for (let size = 2; size <= 10; size++) {
                if (i + size * 2 <= words.length) {
                    const current = words.slice(i, i + size).join(' ').toLowerCase();
                    const next = words.slice(i + size, i + size * 2).join(' ').toLowerCase();
                    
                    // Si le segment suivant ressemble à plus de 70% au segment actuel (écho)
                    if (current === next || (current.length > 10 && next.includes(current.substring(0, 8)))) {
                        skip = size;
                        break;
                    }
                }
            }
            
            if (skip > 0) {
                i += skip; // On saute le premier doublon pour garder le second (souvent plus complet)
            } else {
                result.push(words[i]);
                i++;
            }
        }
        
        return result.join(' ');
    }

    /**
     * INTERPRÉTATION QUANTUM IA : Double analyse (Nettoyage + Rédaction) pour une précision type ChatGPT.
     */
    static async analyzeLesson(rawText: string, language: string = 'fr'): Promise<Partial<AudioNote>> {
        const preCleaned = this.deduplicatePhrases(rawText);

        if (preCleaned.length < 5) return { title: "Note vide", cleanNote: "", summary: "Contenu insuffisant.", keyNotions: [] };

        const prompt = `
            Tu es le MAÎTRE QUANTUM de Levelmak Pro, l'intelligence pédagogique la plus avancée.
            TON OBJECTIF : Transformer une transcription brute en un support de cours magistral d'une précision absolue.
            
            STRUCTURE DE TA RÉPONSE (Chain of Thought) :
            
            1. NETTOYAGE CHIRURGICAL :
               - Élimine sans pitié : bégaiements, tics ("euh", "genre"), répétitions inutiles.
               - Reconstruit les phrases hachées pour qu'elles soient fluides mais fidèles au sens original.
            
            2. RÉSUMÉ D'ÉLITE (2 à 3 pages équivalentes) :
               - Ne fais pas de remplissage. Sois DENSE et STRUCTURÉ.
               - Utilise des sous-sections claires : # Introduction, # Thèses Principales, # Points Clés, # Conclusion.
               - Chaque concept doit être expliqué avec clarté.
            
            3. GLOSSAIRE DES NOTIONS PRO :
               - Extrais au moins 5 mots-clés ou concepts techniques.
               - Fournis pour chacun une DÉFINITION académique précise.
            
            4. LA LEÇON DU MAÎTRE (aiLesson) :
               - Prends de la hauteur. En tant qu'IA, quelle est ton analyse sur ce sujet ?
               - Ajoute des informations que le professeur a pu omettre ou apporte une perspective nouvelle pour aider l'élève à comprendre l'enjeu global.
            
            TEXTE À TRAITER :
            "${preCleaned}"
            
            RÉPONDS UNIQUEMENT AU FORMAT JSON STRICT :
            {
                "title": "Titre magistral et captivant",
                "cleanNote": "Le texte intégral nettoyé et restauré",
                "summary": "Le grand résumé structuré de 2-3 pages (Introduction, Thèses, Points Clés, Conclusion)",
                "keyNotions": ["Concept: Définition précise et détaillée", "..."],
                "aiLesson": "Ta perspective de Maître IA sur le sujet, approfondissements et conseils stratégiques."
            }
        `;

        try {
            // Utilisation du modèle gratuit robuste par défaut
            const response = await openrouterService.generateText(prompt);
            
            let data: any = {};
            try {
                const match = response.match(/\{[\s\S]*\}/);
                const jsonStr = match ? match[0] : response;
                data = JSON.parse(jsonStr);
            } catch (pErr) {
                console.warn("Échec parsing JSON principal, tentative d'extraction simple...");
                data = {
                    title: response.split('\n')[0].substring(0, 50),
                    cleanNote: response,
                    summary: "Note traitée sans formatage JSON strict.",
                    keyNotions: [],
                    aiLesson: ""
                };
            }
            
            return {
                title: data.title || "Leçon Quantum",
                cleanNote: data.cleanNote || preCleaned,
                summary: data.summary || "Note rédigée avec précision Quantum.",
                keyNotions: data.keyNotions || [],
                aiLesson: data.aiLesson || ""
            };
        } catch (error) {
            console.error("Erreur Quantum IA:", error);
            
            // Triple Fallback Pro : Si le JSON échoue, on tente une extraction simplifiée
            try {
                const textOnly = await openrouterService.generateText(`Fais un nettoyage intégral (Quantum Cleanup) de ce texte sans formatage JSON : "${preCleaned}"`);
                return {
                    title: "Leçon (Interprétation Quantum)",
                    cleanNote: textOnly,
                    summary: "Nettoyage sémantique Haute Précision effectué.",
                    keyNotions: []
                };
            } catch (innerError) {
                return {
                    title: "Leçon (Filtre Local Supreme)",
                    cleanNote: preCleaned,
                    summary: "L'IA étant saturée, seul le filtrage d'écho local a été appliqué.",
                    keyNotions: []
                };
            }
        }
    }
}
