import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Sparkles, History, ChevronRight, FileText, Share2, Download, Clock, BookOpen, MessageSquare, BrainCircuit, Layers, CheckCircle } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { AudioLogic, AudioNote } from '../utils/audioLogic';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { FlashcardDeck, Flashcard, Quiz } from '../types';

const AudioLab: React.FC<any> = () => {
    const { t, addXp, settings, saveFlashcardDeck, saveQuiz } = useStore();
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [savedNotes, setSavedNotes] = useState<AudioNote[]>([]);
    const [selectedNote, setSelectedNote] = useState<AudioNote | null>(null);
    const [currentVolume, setCurrentVolume] = useState(0);
    const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
    const [savedToStore, setSavedToStore] = useState<{flashcards: boolean, quiz: boolean}>({flashcards: false, quiz: false});
    const [audioError, setAudioError] = useState<string | null>(null);
    
    const shouldRecordRef = useRef(false);
    const transcriptRef = useRef('');
    const lastProcessedIndexRef = useRef(0);

    // Sync transcript to ref for auto-chunking
    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        const local = localStorage.getItem('elite_audio_notes_v2');
        if (local) setSavedNotes(JSON.parse(local));

        console.log("🎤 [Audio] Initializing Speech Recognition...");
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) {
            console.error("🎤 [Audio] SpeechRecognition NOT supported");
            setAudioError("La reconnaissance vocale n'est pas supportée sur cet appareil. Assurez-vous que l'application Google est installée et à jour.");
        }

        AudioLogic.initSpeechToText(
            (data: any) => {
                if (data.final) setTranscript(prev => prev + (prev ? ' ' : '') + data.final);
                setInterimTranscript(data.interim);
                setAudioError(null);
            },
            () => {
                if (shouldRecordRef.current) {
                    setTimeout(() => { if (shouldRecordRef.current) AudioLogic.startRecording(); }, 500);
                } else {
                    setIsRecording(false);
                }
            },
            (err: string) => {
                console.error("🎤 [Audio] Error:", err);
                setAudioError(err);
            }
        );

        return () => {
            AudioLogic.stopRecording();
            AudioLogic.stopVolumeMonitoring();
        };
    }, []);

    // Auto-chunking logic (Background Summarization)
    useEffect(() => {
        let interval: any;
        if (isRecording) {
            // Check every 3 minutes (180000 ms)
            interval = setInterval(async () => {
                const currentText = transcriptRef.current;
                const newText = currentText.substring(lastProcessedIndexRef.current).trim();
                
                if (newText.length > 200) { // Enough text to analyze (approx ~30-50 words)
                    lastProcessedIndexRef.current = currentText.length;
                    
                    try {
                        const analysis = await AudioLogic.analyzeLesson(newText, settings.language);
                        const newNote: AudioNote = {
                            id: `note_${Date.now()}`,
                            date: new Date().toLocaleString(),
                            rawText: newText,
                            title: analysis.title ? `${analysis.title} (Auto-généré)` : "Séquence de cours",
                            cleanNote: analysis.cleanNote || newText,
                            summary: analysis.summary || "Résumé auto...",
                            keyNotions: analysis.keyNotions || [],
                            flashcards: analysis.flashcards || [],
                            quiz: analysis.quiz || []
                        };

                        setSavedNotes(prev => {
                            const updated = [newNote, ...prev];
                            localStorage.setItem('elite_audio_notes_v2', JSON.stringify(updated));
                            return updated;
                        });
                        
                        await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                    } catch (e) {
                        console.error("Auto-analyse échouée en arrière-plan", e);
                    }
                }
            }, 3 * 60 * 1000); 
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording, settings.language]);

    const handleStart = async () => {
        const hasPermission = await AudioLogic.requestMicrophonePermission();
        if (!hasPermission) {
            alert("Permission micro requise.");
            return;
        }

        setTranscript('');
        setInterimTranscript('');
        setAudioError(null);
        lastProcessedIndexRef.current = 0;
        setIsRecording(true);
        shouldRecordRef.current = true;
        AudioLogic.startRecording();
        AudioLogic.startVolumeMonitoring(setCurrentVolume);
        await KeepAwake.keepAwake().catch(() => {});
        await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    };

    const handleStop = async () => {
        shouldRecordRef.current = false;
        const currentText = transcript;
        const newText = currentText.substring(lastProcessedIndexRef.current).trim();
        const fullTextToProcess = (newText + " " + interimTranscript).trim();
        
        setIsRecording(false);
        AudioLogic.stopRecording();
        AudioLogic.stopVolumeMonitoring();
        setInterimTranscript('');
        await KeepAwake.allowSleep().catch(() => {});
        
        if (fullTextToProcess.length < 10) {
            if (lastProcessedIndexRef.current > 0) {
                // Notes were already processed in background
                setActiveTab('history');
            } else {
                alert("Enregistrement trop court.");
            }
            return;
        }

        setIsAnalyzing(true);
        try {
            const analysis = await AudioLogic.analyzeLesson(fullTextToProcess, settings.language);
            const newNote: AudioNote = {
                id: `note_${Date.now()}`,
                date: new Date().toLocaleString(),
                rawText: fullTextToProcess,
                title: analysis.title || "Leçon sans titre",
                cleanNote: analysis.cleanNote || fullTextToProcess,
                summary: analysis.summary || "Résumé non disponible",
                keyNotions: analysis.keyNotions || [],
                aiLesson: analysis.aiLesson || "",
                flashcards: analysis.flashcards || [],
                quiz: analysis.quiz || []
            };

            setSavedNotes(prev => {
                const finalNotes = [newNote, ...prev];
                localStorage.setItem('elite_audio_notes_v2', JSON.stringify(finalNotes));
                return finalNotes;
            });
            setSelectedNote(newNote);
            setSavedToStore({flashcards: false, quiz: false});
            setActiveTab('history');
            addXp(50); 
            await Haptics.notification({ type: 'SUCCESS' as any }).catch(() => {});
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'analyse.");
        } finally {
            setIsAnalyzing(false);
            lastProcessedIndexRef.current = 0;
            setTranscript('');
        }
    };

    const handleSaveFlashcards = () => {
        if (!selectedNote || !selectedNote.flashcards || selectedNote.flashcards.length === 0) return;
        
        const deck: FlashcardDeck = {
            id: `deck_${Date.now()}`,
            title: `Deck: ${selectedNote.title}`,
            description: "Généré via Audio Lab",
            cardCount: selectedNote.flashcards.length,
            coverImage: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=400",
            category: "AudioLab",
            createdAt: Date.now()
        };
        
        const cards: Flashcard[] = selectedNote.flashcards.map((fc, i) => ({
            id: `fc_${Date.now()}_${i}`,
            deckId: deck.id,
            front: fc.front,
            back: fc.back,
            level: 1,
            nextReview: Date.now(),
            interval: 0,
            easeFactor: 2.5
        }));
        
        saveFlashcardDeck(deck, cards);
        setSavedToStore(prev => ({ ...prev, flashcards: true }));
        Haptics.notification({ type: 'SUCCESS' as any }).catch(() => {});
    };

    const handleSaveQuiz = () => {
        if (!selectedNote || !selectedNote.quiz || selectedNote.quiz.length === 0) return;
        
        const quizObj: Quiz = {
            id: `quiz_${Date.now()}`,
            title: `Quiz: ${selectedNote.title}`,
            subject: "AudioLab",
            difficulty: "Moyen",
            xpReward: 100,
            questions: selectedNote.quiz.map((q, i) => ({
                id: `q_${Date.now()}_${i}`,
                text: q.question,
                options: q.options,
                correctAnswer: q.options.indexOf(q.answer) >= 0 ? q.options.indexOf(q.answer) : 0,
                explanation: "Généré par l'IA Quantum."
            }))
        };
        
        saveQuiz(quizObj);
        setSavedToStore(prev => ({ ...prev, quiz: true }));
        Haptics.notification({ type: 'SUCCESS' as any }).catch(() => {});
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-6 space-y-10 animate-fade-in pb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-3">
                    <h1 className="text-5xl font-display font-black text-white flex items-center gap-4">
                        AUDIO LAB <Sparkles className="text-secondary" size={32} />
                    </h1>
                    <p className="text-slate-400 text-sm font-medium italic">Assistant intelligent (Background Auto-Chunking Actif).</p>
                </div>
                <div className="flex bg-slate-900/50 p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner">
                    <button onClick={() => setActiveTab('live')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-primary text-white shadow-glow' : 'text-slate-500 hover:text-slate-300'}`}>En direct</button>
                    <button onClick={() => { setActiveTab('history'); setSelectedNote(null); }} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-primary text-white shadow-glow' : 'text-slate-500 hover:text-slate-300'}`}>Archives</button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'live' ? (
                    <motion.div key="live" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-5">
                            <div className="glass-morphism p-10 rounded-[3.5rem] border border-white/10 flex flex-col items-center justify-center space-y-10 shadow-premium relative overflow-hidden min-h-[500px]">
                                <div className="flex items-center justify-center gap-2 mb-2 h-24 w-full">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((h, i) => (
                                        <motion.div
                                            key={i}
                                            animate={isRecording ? { height: [h*4, (currentVolume / 100) * 80 + h, h*4] } : { height: 8 }}
                                            transition={{ duration: 0.15, repeat: Infinity }}
                                            className={`w-2 rounded-full ${isRecording ? 'bg-gradient-to-t from-primary to-secondary shadow-glow' : 'bg-white/10'}`}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-10">
                                    {!isRecording ? (
                                        <button onClick={handleStart} className="w-28 h-28 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] relative">
                                            <Mic size={40} />
                                        </button>
                                    ) : (
                                        <button onClick={handleStop} className="w-28 h-28 bg-danger text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-pulse">
                                            <Square size={36} fill="white" />
                                        </button>
                                    )}
                                </div>
                                <div className="w-full space-y-4 pt-6 border-t border-white/5">
                                    <div className="bg-black/40 rounded-[2rem] p-6 h-48 overflow-y-auto custom-scrollbar border border-white/5">
                                        {audioError ? (
                                            <p className="text-sm text-danger font-bold text-center pt-10">{audioError}</p>
                                        ) : (
                                            <p className="text-sm text-slate-300 leading-relaxed font-mono italic">
                                                {transcript.substring(lastProcessedIndexRef.current)} <span className="text-primary opacity-90">{interimTranscript}</span>
                                                {(!transcript.substring(lastProcessedIndexRef.current) && !interimTranscript) && (isRecording ? "L'IA écoute le professeur..." : "Appuyez sur le micro pour commencer.")}
                                            </p>
                                        )}
                                    </div>
                                    {isRecording && !audioError && <p className="text-xs text-slate-500 text-center animate-pulse">Auto-sauvegarde toutes les 3 minutes</p>}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-7 grid grid-cols-2 gap-6">
                            <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] space-y-4">
                                <FileText className="text-blue-500" size={32} />
                                <h3 className="text-xl font-black text-white">Notes Structurées</h3>
                            </div>
                            <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] space-y-4">
                                <BrainCircuit className="text-purple-500" size={32} />
                                <h3 className="text-xl font-black text-white">Création Flashcards</h3>
                            </div>
                            <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] space-y-4">
                                <BookOpen className="text-amber-500" size={32} />
                                <h3 className="text-xl font-black text-white">Création de Quiz</h3>
                            </div>
                            <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] space-y-4">
                                <Share2 className="text-green-500" size={32} />
                                <h3 className="text-xl font-black text-white">Partage Natif & PDF</h3>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-4 space-y-6">
                            <div className="glass-morphism p-8 rounded-[3rem] border border-white/5 space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Archives de Cours</h4>
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                                    {savedNotes.map((note) => (
                                        <div key={note.id} onClick={() => { setSelectedNote(note); setSavedToStore({flashcards: false, quiz: false}); }} className={`p-5 rounded-[2rem] border transition-all cursor-pointer ${selectedNote?.id === note.id ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                            <div className="text-sm font-black text-white truncate">{note.title}</div>
                                            <div className="text-[10px] text-slate-500 font-bold mt-1">{note.date}</div>
                                        </div>
                                    ))}
                                    {savedNotes.length === 0 && <p className="text-sm text-slate-500 italic text-center py-10">Aucune note sauvegardée</p>}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-8">
                            {selectedNote ? (
                                <div className="glass-morphism p-10 rounded-[3.5rem] border border-white/10 shadow-premium space-y-10">
                                    <div className="flex justify-between items-start">
                                        <h2 className="text-3xl font-display font-black text-white">{selectedNote.title}</h2>
                                        <div className="flex gap-3">
                                            <button onClick={() => AudioLogic.exportToWord(selectedNote)} className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 hover:bg-blue-500/20 transition-colors" title="Export Word"><FileText size={20} /></button>
                                            <button onClick={() => AudioLogic.exportToPDF(selectedNote)} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 hover:bg-red-500/20 transition-colors" title="Export PDF"><Download size={20} /></button>
                                            <button onClick={() => AudioLogic.nativeShare(selectedNote)} className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 hover:bg-green-500/20 transition-colors" title="Partager"><MessageSquare size={20} /></button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-8">
                                        {/* Integration Action Buttons */}
                                        <div className="flex flex-wrap gap-4">
                                            {selectedNote.flashcards && selectedNote.flashcards.length > 0 && (
                                                <button 
                                                    onClick={handleSaveFlashcards}
                                                    disabled={savedToStore.flashcards}
                                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${savedToStore.flashcards ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/20'}`}
                                                >
                                                    {savedToStore.flashcards ? <><CheckCircle size={16}/> Deck Sauvegardé</> : <><Layers size={16}/> Créer Deck Flashcards</>}
                                                </button>
                                            )}
                                            {selectedNote.quiz && selectedNote.quiz.length > 0 && (
                                                <button 
                                                    onClick={handleSaveQuiz}
                                                    disabled={savedToStore.quiz}
                                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${savedToStore.quiz ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/20'}`}
                                                >
                                                    {savedToStore.quiz ? <><CheckCircle size={16}/> Quiz Sauvegardé</> : <><BookOpen size={16}/> Créer Quiz</>}
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><Sparkles size={16} className="text-secondary"/> Résumé Magistral</h3>
                                            <div className="p-8 bg-slate-900/50 rounded-[2.5rem] border border-white/5 text-slate-200 leading-loose prose-invert whitespace-pre-wrap">{selectedNote.summary}</div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Notions Clés</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {selectedNote.keyNotions.map((notion, i) => (
                                                    <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-2">
                                                        <div className="text-xs font-black text-primary uppercase">{notion.split(':')[0]}</div>
                                                        <div className="text-[11px] text-slate-400 italic">{notion.split(':')[1]}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Notes Détaillées</h3>
                                            <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
                                                {selectedNote.cleanNote}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center p-20 text-center glass-morphism rounded-[3.5rem] border border-white/5 border-dashed opacity-30">Sélectionnez une leçon pour voir les détails</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isAnalyzing && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-3xl z-[2000] flex items-center justify-center">
                    <div className="text-center space-y-10 max-w-md w-full">
                        <div className="relative mx-auto w-40 h-40">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} className="absolute inset-0 rounded-full border-t-2 border-primary shadow-glow" />
                            <div className="absolute inset-0 flex items-center justify-center"><BrainCircuit className="text-white animate-pulse" size={56} /></div>
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase italic">Analyse & Création de Contenu...</h3>
                        <p className="text-slate-400 text-sm">Génération du résumé, des flashcards et du quiz...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioLab;
