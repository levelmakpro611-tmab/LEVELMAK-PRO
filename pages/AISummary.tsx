
import React, { useState, useRef } from 'react';
import {
    Upload,
    FileText,
    Image as ImageIcon,
    Loader2,
    Sparkles,
    ArrowRight,
    Type,
    Trash2,
    Zap,
    BookOpen,
    Info,
    Plus,
    Clock,
    BarChart3,
    X,
    Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../services/gemini';
import { useStore } from '../hooks/useStore';
import mammoth from 'mammoth';

const AISummary: React.FC<{
    onGenerateQuiz: (content: string, title: string) => void;
    onGenerateFlashcards: (content: string, title: string) => void;
}> = ({ onGenerateQuiz, onGenerateFlashcards }) => {
    const { saveBook, addActivity, settings } = useStore();
    const [files, setFiles] = useState<{ id: string, file: File, preview: string, type: 'image' | 'pdf' | 'word' }[]>([]);
    const [manualText, setManualText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
    const [summary, setSummary] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFileType = (file: File): 'image' | 'pdf' | 'word' => {
        if (file.type.includes('image')) return 'image';
        if (file.type === 'application/pdf') return 'pdf';
        return 'word';
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles: File[] = Array.from(e.target.files || []);
        for (const file of selectedFiles) {
            const id = Math.random().toString(36).substr(2, 9);
            const type = getFileType(file);

            let preview = '';
            if (type === 'image') {
                preview = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string || '');
                    reader.readAsDataURL(file as File);
                });
            }

            setFiles(prev => [...prev, { id, file: file as File, preview, type }]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleSummarize = async () => {
        if (inputMode === 'file' && files.length === 0) {
            setError("Ajoute au moins un document ou une photo !");
            return;
        }
        if (inputMode === 'text' && !manualText.trim()) {
            setError("Saisis du texte pour générer le résumé !");
            return;
        }

        setIsProcessing(true);
        setError('');
        setStatus('Initialisation...');
        setSummary(null);

        try {
            const sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[] = [];

            if (inputMode === 'text') {
                sources.push({ type: 'text', data: manualText });
            } else {
                setStatus('Préparation des documents...');
                for (const f of files) {
                    if (f.type === 'word') {
                        setStatus(`Lecture de ${f.file.name}...`);
                        const arrayBuffer = await (f.file as File).arrayBuffer();
                        const result = await mammoth.extractRawText({ arrayBuffer });
                        sources.push({ type: 'text', data: result.value });
                    } else {
                        setStatus(`Traitement de ${f.file.name}...`);
                        const base64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string || '');
                            reader.readAsDataURL(f.file as File);
                        });
                        sources.push({ type: f.type, data: base64 });
                    }
                }
            }

            setStatus('Analyse & Synthèse par l\'IA...');
            const summaryData = await geminiService.summarizeMultimodal(sources, 'Cours Multimodal', settings.language);
            setSummary(summaryData);
            setStatus('');
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue lors de la synthèse.');
        } finally {
            setIsProcessing(false);
            setStatus('');
        }
    };

    const handleSaveSummary = () => {
        if (!summary) return;

        saveBook({
            id: `summary_${Date.now()}`,
            title: summary.title,
            author: 'IA LEVELMAK',
            category: 'Synthèse',
            cover: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=800&auto=format&fit=crop',
            description: summary.mainSummary,
            content: JSON.stringify(summary), // Store full structured data
            uri: '#',
        });

        addActivity('reading', 'Synthèse Enregistrée', `Le résumé "${summary.title}" a été ajouté à ta bibliothèque.`);
        alert('Résumé sauvegardé dans ta bibliothèque !');
    };

    return (
        <div className="max-w-6xl mx-auto py-4 md:py-8 space-y-8 md:space-y-12 px-4 md:px-0 pt-20 md:pt-8">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-white/5 pb-8 md:pb-12"
            >
                <div className="space-y-2 md:space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-400 font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px]">
                        <Sparkles size={10} className="animate-pulse" /> Synthèse Intelligente
                    </div>
                    <h1 className="text-3xl md:text-6xl font-display font-black text-white tracking-tighter leading-tight md:leading-none">
                        Résumé <span className="text-gradient-primary">IA Élite</span>
                    </h1>
                    <p className="text-slate-400 text-[10px] md:text-xl font-medium max-w-2xl leading-relaxed">
                        Obtiens l'essentiel de tes cours en quelques secondes. <span className="text-white font-bold">Gagne du temps</span> sur tes révisions.
                    </p>
                </div>
            </motion.div>

            {!summary ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    <div className="lg:col-span-8 space-y-8">
                        <div className="glass p-1 md:p-2 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 flex gap-1 md:gap-2 shadow-2xl">
                            <button
                                onClick={() => setInputMode('file')}
                                className={`flex-1 flex items-center justify-center gap-2 md:gap-3 py-3 md:py-5 rounded-[1.2rem] md:rounded-[2rem] font-black uppercase tracking-widest text-[8px] md:text-xs transition-all duration-500 ${inputMode === 'file' ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-glow' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                <Upload size={14} md:size={18} /> Documents
                            </button>
                            <button
                                onClick={() => setInputMode('text')}
                                className={`flex-1 flex items-center justify-center gap-2 md:gap-3 py-3 md:py-5 rounded-[1.2rem] md:rounded-[2rem] font-black uppercase tracking-widest text-[8px] md:text-xs transition-all duration-500 ${inputMode === 'text' ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-glow' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                <Type size={14} md:size={18} /> Saisir Texte
                            </button>
                        </div>

                        <motion.div
                            layout
                            className="bg-slate-900/40 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] border border-white/5 p-4 md:p-10 shadow-premium min-h-[300px] md:min-h-[550px] flex flex-col relative group"
                        >
                            <AnimatePresence mode="wait">
                                {isProcessing ? (
                                    <motion.div
                                        key="processing"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.05 }}
                                        className="flex-1 flex flex-col items-center justify-center text-center space-y-6 md:space-y-8"
                                    >
                                        <div className="relative">
                                            <div className="w-24 h-24 md:w-36 md:h-36 border-4 border-blue-500/20 rounded-[2.5rem] md:rounded-[3rem] animate-spin-slow"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Sparkles size={32} className="md:size-[40px] text-blue-500 animate-pulse" />
                                            </div>
                                        </div>
                                        <h3 className="text-lg md:text-2xl font-black text-white px-4">{status}</h3>
                                    </motion.div>
                                ) : inputMode === 'file' ? (
                                    <motion.div key="file-mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col space-y-6">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                                            <AnimatePresence>
                                                {files.map((f) => (
                                                    <motion.div
                                                        key={f.id}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="relative aspect-square rounded-xl md:rounded-3xl border border-white/10 overflow-hidden group/item bg-white/5"
                                                    >
                                                        {f.type === 'image' ? (
                                                            <img src={f.preview} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center space-y-2 p-4">
                                                                <FileText size={24} className="md:size-[32px] text-blue-500" />
                                                                <span className="text-[7px] md:text-[8px] font-black uppercase text-slate-500 truncate w-full text-center px-1">{f.file.name}</span>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => removeFile(f.id)}
                                                            className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-lg transition-opacity z-20"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>

                                        <div className="flex flex-col gap-4 mt-4">
                                            <button
                                                onClick={() => {
                                                    const input = document.getElementById('cam-input') as HTMLInputElement;
                                                    input?.click();
                                                }}
                                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-glow active:scale-95"
                                            >
                                                <ImageIcon size={20} />
                                                <span className="text-xs md:text-sm">Prendre une Photo</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const input = document.getElementById('doc-input') as HTMLInputElement;
                                                    input?.click();
                                                }}
                                                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 border border-white/5"
                                            >
                                                <Upload size={20} />
                                                <span className="text-xs md:text-sm">Parcourir Documents</span>
                                            </button>
                                        </div>

                                        <div className="text-center">
                                            <span className="text-[8px] md:text-[10px] text-slate-500 font-medium italic">
                                                Combine tes photos de cahiers, PDF ou fichiers Word
                                            </span>
                                        </div>

                                        {/* Hidden inputs */}
                                        <input
                                            id="cam-input"
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={handleFileChange}
                                            capture="environment"
                                            accept="image/*"
                                        />
                                        <input
                                            id="doc-input"
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={handleFileChange}
                                            accept="image/*,.pdf,.docx"
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div key="text-mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                                        <textarea
                                            value={manualText}
                                            onChange={(e) => setManualText(e.target.value)}
                                            placeholder="Colle ici ton document ou ton cours pour le résumer..."
                                            className="flex-1 w-full p-6 md:p-10 bg-white/5 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 text-white font-medium text-sm md:text-lg leading-relaxed outline-none resize-none"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>

                    <div className="lg:col-span-4">
                        <div className="glass rounded-[2rem] md:rounded-[2.5rem] border border-white/5 p-6 md:p-8 space-y-6 sticky top-8">
                            <div className="space-y-3">
                                <h3 className="text-[10px] md:text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Info size={14} className="text-blue-500" /> Conseils
                                </h3>
                                <p className="text-[10px] md:text-xs text-slate-400 leading-relaxed font-medium">
                                    Formats supportés : <span className="text-white">PDF, Word (.docx)</span> et photos de tes cours. Assure-toi que le texte est lisible.
                                </p>
                            </div>

                            <button
                                onClick={handleSummarize}
                                disabled={isProcessing}
                                className="w-full py-4 md:py-6 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-xl md:rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-glow disabled:opacity-50 text-[10px] md:text-xs"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> : <>Générer le Résumé <ArrowRight size={16} /></>}
                            </button>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-500 text-[9px] font-bold">
                                    <Info size={14} /> {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8 animate-fade-in"
                >
                    <div className="glass p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 shadow-premium space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                                    <Sparkles size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-3xl font-display font-black text-white uppercase tracking-tight">{summary.title}</h2>
                                    <p className="text-[10px] md:text-xs text-slate-500 font-black uppercase tracking-[0.2em]">Synthèse Intelligente LEVELMAK</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSummary(null)}
                                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
                                >
                                    Nouveau
                                </button>
                                <button
                                    onClick={handleSaveSummary}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-glow transition-all"
                                >
                                    Sauvegarder
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="p-6 md:p-8 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                                    <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <BookOpen size={16} /> Synthèse Globale
                                    </h3>
                                    <div className="text-slate-200 leading-relaxed text-sm md:text-lg font-medium whitespace-pre-wrap">
                                        {summary.mainSummary}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <BarChart3 size={16} className="text-blue-500" /> Points Clés à Retenir
                                    </h3>
                                    <div className="grid gap-3">
                                        {summary.keyPoints.map((point: string, i: number) => (
                                            <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all group">
                                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-black shrink-0">
                                                    {i + 1}
                                                </div>
                                                <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed">{point}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="glass p-6 md:p-8 rounded-3xl border border-white/5 space-y-6">
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Clock size={16} className="text-blue-500" /> Métriques
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <span className="text-xs text-slate-500 font-bold uppercase">Lecture</span>
                                            <span className="text-sm font-black text-blue-400">{summary.estimatedReadingTime}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <span className="text-xs text-slate-500 font-bold uppercase">Difficulté</span>
                                            <span className={`text-sm font-black ${summary.difficulty === 'Facile' ? 'text-green-500' :
                                                summary.difficulty === 'Intermédiaire' ? 'text-orange-500' : 'text-red-500'
                                                }`}>{summary.difficulty}</span>
                                        </div>
                                    </div>
                                </div>

                                {summary.definitions && summary.definitions.length > 0 && (
                                    <div className="glass p-6 md:p-8 rounded-3xl border border-white/5">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Type size={16} className="text-blue-500" /> Glossaire
                                        </h3>
                                        <div className="space-y-4">
                                            {summary.definitions.map((def: any, i: number) => (
                                                <div key={i} className="space-y-1">
                                                    <p className="text-sm font-black text-white">{def.term}</p>
                                                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic">"{def.definition}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 space-y-4">
                                    <button
                                        onClick={() => onGenerateQuiz(summary.mainSummary, summary.title)}
                                        className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-glow flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        <Zap size={16} /> Créer un Quiz IA
                                    </button>
                                    <button
                                        onClick={() => onGenerateFlashcards(summary.mainSummary, summary.title)}
                                        className="w-full py-4 bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/5 shadow-premium flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        <Layers size={16} /> Flashcards IA
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default AISummary;
