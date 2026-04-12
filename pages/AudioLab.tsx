import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Save, Trash2, BrainCircuit, Layers, Sparkles, History, ChevronRight, Loader2, Music } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { openrouterService } from '../services/openrouter';
import { AudioLogic, AudioNote } from '../utils/audioLogic';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { KeepAwake } from '@capacitor-community/keep-awake';

interface AudioLabProps {
    onQuizGenerated?: (quiz: any) => void;
    onFlashcardsGenerated?: (deck: any, cards: any[]) => void;
}

const AudioLab: React.FC<AudioLabProps> = ({ onQuizGenerated, onFlashcardsGenerated }) => {
    const { t, addXp, settings } = useStore();
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [savedNotes, setSavedNotes] = useState<AudioNote[]>([]);
    const [selectedNote, setSelectedNote] = useState<AudioNote | null>(null);

    // ... (useEffect reste inchangé)

    const handleGenerateCards = async () => {
        if (!selectedNote || !onFlashcardsGenerated) return;
        setIsTransforming(true);
        try {
            const cards = await openrouterService.generateFlashcards(selectedNote.cleanNote, selectedNote.title, settings.language);
            const deck = {
                id: `audio_deck_${Date.now()}`,
                title: selectedNote.title,
                description: "Généré depuis l'Audio Lab",
                category: "Audio Lab",
                totalCards: cards.length,
                lastStudied: new Date().toISOString()
            };
            onFlashcardsGenerated(deck, cards);
        } catch (err: any) {
            console.error(err);
            alert("Erreur lors de la génération des Flashcards: " + err.message);
        } finally {
            setIsTransforming(false);
        }
    };

    const handleGenerateQuiz = async () => {
        if (!selectedNote || !onQuizGenerated) return;
        setIsTransforming(true);
        try {
            const quiz = await openrouterService.generateQuiz(selectedNote.cleanNote, selectedNote.title, 'Intermédiaire', settings.language);
            onQuizGenerated(quiz);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la génération du Quiz.");
        } finally {
            setIsTransforming(false);
        }
    };

    useEffect(() => {
        // Charger les notes depuis le stockage local au démarrage
        const local = localStorage.getItem('elite_audio_notes');
        if (local) setSavedNotes(JSON.parse(local));

        // Initialiser la reconnaissance vocale
        AudioLogic.initSpeechToText(
            (data: any) => {
                if (data.final) setTranscript((prev) => prev + (prev.length > 0 && !prev.endsWith(' ') ? " " : "") + data.final);
                setInterimTranscript(data.interim);
            },
            () => setIsRecording(false)
        );
    }, []);

    const saveNotesToLocal = (notes: AudioNote[]) => {
        localStorage.setItem('elite_audio_notes', JSON.stringify(notes));
        setSavedNotes(notes);
    };

    const handleStart = async () => {
        setTranscript('');
        setInterimTranscript('');
        setIsRecording(true);
        AudioLogic.startRecording();
        await KeepAwake.keepAwake().catch(() => {});
        await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    };

    const handleStop = async () => {
        const fullText = (transcript + " " + interimTranscript).trim();
        setIsRecording(false);
        AudioLogic.stopRecording();
        setInterimTranscript('');
        await KeepAwake.allowSleep().catch(() => {});
        
        if (fullText.length < 10) {
            await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
            return;
        }

        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        setIsAnalyzing(true);
        const analysis = await AudioLogic.analyzeLesson(fullText, settings.language);
        
        const newNote: AudioNote = {
            id: `note_${Date.now()}`,
            date: new Date().toLocaleDateString(),
            rawText: fullText,
            title: analysis.title || "Leçon sans titre",
            cleanNote: analysis.cleanNote || transcript,
            summary: analysis.summary || "Résumé non disponible",
            keyNotions: analysis.keyNotions || []
        };

        const updated = [newNote, ...savedNotes];
        saveNotesToLocal(updated);
        setSelectedNote(newNote);
        setIsAnalyzing(false);
        addXp(20); // Bonus XP pour la prise de note intelligente
    };

    const handleAnalyze = async (id: string, text: string) => {
        setIsAnalyzing(true);
        const analysis = await AudioLogic.analyzeLesson(text, settings.language);
        
        const updatedNotes = savedNotes.map(n => 
            n.id === id ? {
                ...n,
                title: analysis.title || n.title,
                cleanNote: analysis.cleanNote || n.cleanNote,
                summary: analysis.summary || n.summary,
                keyNotions: analysis.keyNotions || n.keyNotions
            } : n
        );

        saveNotesToLocal(updatedNotes);
        const updatedNote = updatedNotes.find(n => n.id === id);
        if (updatedNote) setSelectedNote(updatedNote);
        setIsAnalyzing(false);
    };

    const discardRecording = async () => {
        setIsRecording(false);
        AudioLogic.stopRecording();
        setTranscript('');
        setInterimTranscript('');
        await KeepAwake.allowSleep().catch(() => {});
        await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    };

    const handleStartNewCourse = () => {
        setSelectedNote(null);
        setTranscript('');
        setInterimTranscript('');
    };

    const deleteNote = (id: string) => {
        const filtered = savedNotes.filter(n => n.id !== id);
        saveNotesToLocal(filtered);
        if (selectedNote?.id === id) setSelectedNote(null);
    };

    return (
        <div className="max-w-6xl mx-auto py-6 px-4 space-y-8 animate-fade-in pb-24">
            {/* Header Audio Lab */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-display font-black text-white flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center border border-primary/30 shadow-glow">
                            <Mic size={28} />
                        </div>
                        AUDIO LAB <span className="text-gradient-secondary text-sm">PRO</span>
                    </h1>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Le futur de la prise de notes intelligente</p>
                </div>
                
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                    <button className="px-6 py-2 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">En direct</button>
                    <button className="px-6 py-2 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-slate-300">Archives</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Section Enregistrement */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-morphism p-8 rounded-[3rem] border border-white/10 flex flex-col items-center justify-center space-y-8 shadow-premium relative overflow-hidden">
                        {isRecording && (
                            <div className="absolute inset-0 bg-primary/5 animate-pulse-slow"></div>
                        )}
                        
                        <div className="text-center space-y-2">
                            <h3 className="text-white font-black uppercase tracking-widest text-xs">Microphone Elite</h3>
                            <p className="text-slate-500 text-[10px] font-medium italic">Placez-vous près du professeur</p>
                        </div>

                        {/* Waveform Animation Placeholder (using lucide icons for effect) */}
                        <div className="flex items-center gap-1 h-12">
                            {[1, 2, 3, 4, 5, 2, 4, 3, 1].map((h, i) => (
                                <motion.div
                                    key={i}
                                    animate={isRecording ? { height: [h*4, h*10, h*4] } : { height: 4 }}
                                    transition={{ repeat: Infinity, duration: 0.5 + i*0.1 }}
                                    className={`w-1.5 rounded-full ${isRecording ? 'bg-primary shadow-glow' : 'bg-white/10'}`}
                                ></motion.div>
                            ))}
                        </div>

                        {!isRecording ? (
                            <button
                                onClick={handleStart}
                                className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-glow hover:scale-110 transition-all active:scale-95"
                            >
                                <Mic size={32} />
                            </button>
                        ) : (
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={discardRecording}
                                    className="w-14 h-14 bg-white/5 border border-white/10 text-slate-500 rounded-full flex items-center justify-center hover:bg-danger/20 hover:text-danger hover:border-danger/30 transition-all active:scale-95"
                                    title="Annuler l'enregistrement"
                                >
                                    <Trash2 size={24} />
                                </button>
                                <button
                                    onClick={handleStop}
                                    className="w-20 h-20 bg-danger text-white rounded-full flex items-center justify-center shadow-glow-danger hover:scale-110 transition-all animate-pulse"
                                >
                                    <Square size={32} fill="white" />
                                </button>
                            </div>
                        )}
                        
                        <div className="space-y-4 w-full">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Transcription en direct</div>
                            <div className="bg-black/40 rounded-2xl p-4 h-32 overflow-y-auto custom-scrollbar border border-white/5">
                                <p className="text-xs text-slate-400 leading-relaxed font-mono italic">
                                    {transcript} <span className="text-slate-500 opacity-70">{interimTranscript}</span>
                                    {(!transcript && !interimTranscript) && (isRecording ? "En attente de voix..." : "Appuyez sur le micro pour commencer.")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Liste des dernières notes */}
                    <div className="glass-morphism p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <History size={14} /> Leçons récentes
                            </h4>
                            <button 
                                onClick={handleStartNewCourse}
                                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                                + Nouveau
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {savedNotes.length === 0 ? (
                                <div className="text-center py-6 text-slate-600 text-[10px] font-bold uppercase tracking-tighter italic">Aucune note pour le moment</div>
                            ) : (
                                savedNotes.map((note) => (
                                    <div 
                                        key={note.id}
                                        onClick={() => setSelectedNote(note)}
                                        className={`p-3 rounded-2xl border transition-all cursor-pointer group ${selectedNote?.id === note.id ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-xs font-black text-white truncate max-w-[150px]">{note.title}</div>
                                                <div className="text-[9px] text-slate-500 font-bold">{note.date}</div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-danger rounded-lg transition-all"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Section Analyse & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedNote ? (
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-morphism p-8 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden"
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="text-secondary" size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Synthèse IA Elite</span>
                                        </div>
                                        <h2 className="text-2xl font-display font-black text-white">{selectedNote.title}</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-3 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><Save size={20} /></button>
                                        <button className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-glow hover:scale-105 active:scale-95 transition-all">Partager</button>
                                    </div>
                                </div>

                                <div className="space-y-6 overflow-y-auto custom-scrollbar pr-4">
                                    {/* Alerte Mode Secours / Échec IA */}
                                    {(selectedNote.title.includes('Secours') || selectedNote.summary.includes('échoué')) && (
                                        <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center gap-4 animate-pulse">
                                            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                                <Sparkles className="text-amber-500" size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-black text-amber-200 uppercase tracking-widest">Analyse incomplète</h4>
                                                <p className="text-[10px] text-amber-500/80 font-bold mb-2">L'IA n'a pas pu structurer cette note automatiquement.</p>
                                                <button 
                                                    onClick={() => handleAnalyze(selectedNote.id, selectedNote.rawText)}
                                                    className="px-4 py-2 bg-amber-500 text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all active:scale-95"
                                                >
                                                    Relancer l'Analyse Elite
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Résumé */}
                                    <div className="space-y-3">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">L'essentiel du cours</div>
                                        <div className="p-5 bg-white/5 border border-white/5 rounded-3xl text-sm md:text-base text-slate-200 leading-relaxed italic border-l-4 border-l-secondary">
                                            "{selectedNote.summary}"
                                        </div>
                                    </div>

                                    {/* Note Propre */}
                                    <div className="space-y-3">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Note de cours détaillée</div>
                                        <div className="p-6 bg-black/20 rounded-[2rem] text-sm text-slate-300 leading-loose prose prose-invert font-sans">
                                            {selectedNote.cleanNote}
                                        </div>
                                    </div>

                                    {/* Notions Clés */}
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notions Clés Identifiées</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedNote.keyNotions.map((notion, i) => {
                                                const [name, def] = notion.split(':');
                                                return (
                                                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1 border-b-2 border-b-primary">
                                                        <div className="text-xs font-black text-primary uppercase">{name}</div>
                                                        <div className="text-[11px] text-slate-400 leading-relaxed">{def}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Barre d'Actions de Conversion */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-2 gap-4"
                            >
                                <button 
                                    onClick={handleGenerateCards}
                                    disabled={isTransforming}
                                    className="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-3 group hover:border-primary/50 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Layers className="text-primary group-hover:scale-125 transition-all" size={32} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Créer des Flashcards</span>
                                </button>
                                <button 
                                    onClick={handleGenerateQuiz}
                                    disabled={isTransforming}
                                    className="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-3 group hover:border-secondary/50 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <BrainCircuit className="text-secondary group-hover:scale-125 transition-all" size={32} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Générer un Quiz</span>
                                </button>
                            </motion.div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center p-12 text-center">
                            <div className="space-y-6 opacity-40">
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                                    <Music size={40} className="text-slate-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-white font-black uppercase tracking-[0.2em]">Sélectionnez une leçon</h3>
                                    <p className="text-xs text-slate-500 max-w-xs mx-auto italic">Choisissez une leçon dans la liste à gauche ou commencez un nouvel enregistrement pour voir l'analyse IA.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Overlays */}
            {(isAnalyzing || isTransforming) && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-8">
                    <div className="text-center space-y-6">
                        <div className="relative">
                            <div className="w-24 h-24 bg-secondary/20 rounded-full animate-ping absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                            <Loader2 className="w-24 h-24 text-secondary animate-spin relative z-10" />
                        </div>
                        <div className="space-y-4 animate-pulse">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Analyse Quantum en cours</h3>
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] text-secondary font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce"></span>
                                    {isTransforming ? "Génération des supports d'élite..." : "Déchiffrage & Nettoyage Quantum..."}
                                </p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                                    {isTransforming ? "Optimisation pédagogique..." : "Rédaction de votre leçon magistrale..."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioLab;
