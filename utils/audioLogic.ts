import { jsPDF } from 'jspdf';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface AudioNote {
    id: string;
    title: string;
    date: string;
    rawText: string;
    cleanNote: string;
    summary: string;
    keyNotions: string[];
    aiLesson?: string;
    flashcards?: { front: string, back: string }[];
    quiz?: { question: string, options: string[], answer: string }[];
}

export class AudioLogic {
    private static recognition: any = null;
    private static lastFinalTranscript: string = '';
    private static audioContext: AudioContext | null = null;
    private static analyser: AnalyserNode | null = null;
    private static volumeCallback: ((volume: number) => void) | null = null;

    /**
     * Demande explicitement la permission d'utiliser le microphone
     */
    static async requestMicrophonePermission(): Promise<boolean> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err) {
            console.error("Permission micro refusée:", err);
            return false;
        }
    }

    /**
     * Initialise la reconnaissance vocale (Version Elite Stable)
     */
    static initSpeechToText(
        onResult: (data: {final: string, interim: string}) => void, 
        onEnd: () => void,
        onError?: (error: string) => void
    ) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) {
            if (onError) onError("Votre navigateur ne supporte pas la reconnaissance vocale.");
            return null;
        }

        if (this.recognition) {
            try { 
                this.recognition.onend = null;
                this.recognition.onerror = null;
                this.recognition.onresult = null;
                this.recognition.stop(); 
            } catch(e) {}
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'fr-FR';

        this.recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript + ' ';
                } else {
                    interim += transcript;
                }
            }
            onResult({ final, interim });
        };

        this.recognition.onend = () => {
            onEnd();
        };

        this.recognition.onerror = (err: any) => {
            console.error("Speech Error:", err.error);
            let message = "Erreur micro.";
            if (err.error === 'network') message = "Erreur réseau (Internet requis pour la voix).";
            if (err.error === 'not-allowed') message = "Permission micro refusée.";
            if (err.error === 'no-speech') message = "Aucune voix détectée.";
            
            if (onError) onError(message);
            onEnd();
        };

        return this.recognition;
    }

    static startRecording() {
        if (this.recognition) {
            try { this.recognition.start(); } catch(e) {}
        }
    }

    static stopRecording() {
        if (this.recognition) {
            try { this.recognition.stop(); } catch(e) {}
        }
    }

    /**
     * Analyse la leçon via l'IA
     */
    static async analyzeLesson(text: string, lang: string = 'fr') {
        const prompt = `
            Transforme ce cours brut en prise de notes claire, structurée et hautement utile pour réviser :
            "${text}"
            
            Génère une réponse JSON stricte avec la structure suivante :
            - "title": Un titre pertinent pour ce chapitre ou cette section.
            - "summary": Un résumé simple et clair.
            - "keyNotions": Un tableau de mots-clés ou points importants (ex: "Photosynthèse: Processus utilisé par les plantes...").
            - "cleanNote": La prise de notes complète, structurée avec des titres (Chapitre 1, Partie A, etc.), des tirets pour les points importants. C'est le contenu principal à lire.
            - "flashcards": Un tableau d'objets pour des cartes de révision. Chaque objet doit avoir "front" (la question/le concept) et "back" (la réponse/la définition). Fais-en environ 3 à 5.
            - "quiz": Un tableau d'objets de QCM pour tester les connaissances. Chaque objet a "question", "options" (tableau de 3 à 4 choix), et "answer" (la bonne réponse parmi les options). Fais-en environ 3.
            
            Ne renvoie QUE du JSON valide, sans texte autour. Langue: ${lang}.
        `;

        try {
            const { openRouterRequest } = await import('../services/openrouter');
            const res = await openRouterRequest([{ role: 'user', content: prompt }]);
            let cleanedRes = res.replace(/```json/g, '').replace(/```/g, '').trim();
            // Handle edge case where AI might include a markdown prefix
            if (cleanedRes.startsWith('{') === false && cleanedRes.indexOf('{') !== -1) {
                cleanedRes = cleanedRes.substring(cleanedRes.indexOf('{'));
            }
            if (cleanedRes.endsWith('}') === false && cleanedRes.lastIndexOf('}') !== -1) {
                cleanedRes = cleanedRes.substring(0, cleanedRes.lastIndexOf('}') + 1);
            }
            
            const parsed = JSON.parse(cleanedRes);
            
            return {
                title: parsed.title || "Cours",
                summary: parsed.summary || "",
                keyNotions: Array.isArray(parsed.keyNotions) ? parsed.keyNotions : [],
                cleanNote: parsed.cleanNote || "",
                aiLesson: parsed.aiLesson || "",
                flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
                quiz: Array.isArray(parsed.quiz) ? parsed.quiz : []
            };
        } catch (e) {
            console.error("Analyse IA échouée:", e);
            return { title: "Leçon sans titre", summary: "Erreur d'analyse ou texte incompréhensible.", keyNotions: [], cleanNote: text, flashcards: [], quiz: [] };
        }
    }

    /**
     * Helper pour le téléchargement mobile natif
     */
    private static async downloadBlob(blob: Blob, filename: string): Promise<void> {
        const { isNativePlatform } = await import('../services/nativeAdapters');
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        if (isNativePlatform()) {
            try {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64Data = (reader.result as string).split(',')[1];
                    const path = filename;
                    const result = await Filesystem.writeFile({
                        path,
                        data: base64Data,
                        directory: Directory.Cache
                    });

                    await Share.share({
                        title: 'Exporter la leçon',
                        text: 'Voici ma leçon exportée depuis LEVELMAK PRO',
                        url: result.uri,
                        dialogTitle: 'Enregistrer ou Partager'
                    });
                };
            } catch (error) {
                console.error('Erreur export natif:', error);
            }
        } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Export PDF Haute Qualité
     */
    static async exportToPDF(note: AudioNote) {
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("LEVELMAK PRO - AUDIO LAB", 20, 25);
        
        // Title
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(note.title.toUpperCase(), 20, 55);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Généré le: ${note.date}`, 20, 62);
        
        // Summary
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("RÉSUMÉ MAGISTRAL", 20, 75);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const splitSummary = doc.splitTextToSize(note.summary, 170);
        doc.text(splitSummary, 20, 85);
        
        // Notions
        let y = 85 + (splitSummary.length * 5) + 15;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("GLOSSAIRE DES NOTIONS", 20, y);
        y += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        note.keyNotions.forEach(notion => {
            const splitNotion = doc.splitTextToSize(`• ${notion}`, 170);
            doc.text(splitNotion, 20, y);
            y += (splitNotion.length * 5) + 2;
        });

        const blob = doc.output('blob');
        await this.downloadBlob(blob, `Lecon_${note.title.replace(/\s+/g, '_')}.pdf`);
    }

    /**
     * Export Word Document (DOCX)
     */
    static async exportToWord(note: AudioNote) {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
        
        const children = [
            new Paragraph({
                text: 'LEVELMAK PRO - AUDIO LAB',
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: note.title.toUpperCase(), bold: true, size: 32 }),
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                text: `Généré le: ${note.date}`,
                spacing: { after: 400 }
            }),
            new Paragraph({
                text: 'RÉSUMÉ MAGISTRAL',
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200 }
            }),
            new Paragraph({
                text: note.summary,
                spacing: { after: 400 }
            }),
            new Paragraph({
                text: 'GLOSSAIRE DES NOTIONS',
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200 }
            })
        ];

        note.keyNotions.forEach(notion => {
            children.push(new Paragraph({
                text: `• ${notion}`,
                spacing: { after: 100 }
            }));
        });

        children.push(new Paragraph({
            text: 'NOTES DÉTAILLÉES',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
        }));
        
        note.cleanNote.split('\n').forEach(line => {
            if (line.trim()) {
                children.push(new Paragraph({
                    text: line,
                    spacing: { after: 100 }
                }));
            }
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children
            }]
        });

        const blob = await Packer.toBlob(doc);
        await this.downloadBlob(blob, `Lecon_${note.title.replace(/\s+/g, '_')}.docx`);
    }

    /**
     * Partage Natif (WhatsApp, etc.)
     */
    static async nativeShare(note: AudioNote) {
        try {
            await Share.share({
                title: note.title,
                text: `*${note.title}*\n\n_Résumé:_\n${note.summary.substring(0, 500)}...\n\n_Notions Clés:_\n${note.keyNotions.join('\n')}\n\nVia Levelmak Pro`,
                dialogTitle: 'Partager ma leçon',
            });
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) {
            console.error("Partage échoué:", e);
        }
    }

    /**
     * Visualisation Audio (Volume)
     */
    static startVolumeMonitoring(callback: (volume: number) => void) {
        this.volumeCallback = callback;
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            this.audioContext = new AudioContext();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            
            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const update = () => {
                if (!this.analyser) return;
                this.analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const average = sum / bufferLength;
                if (this.volumeCallback) this.volumeCallback(Math.min(average * 2, 100));
                requestAnimationFrame(update);
            };
            update();
        }).catch(e => console.error("Volume monitoring failed", e));
    }

    static stopVolumeMonitoring() {
        this.volumeCallback = null;
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.analyser = null;
        }
    }
}
