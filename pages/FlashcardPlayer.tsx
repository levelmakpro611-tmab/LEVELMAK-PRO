
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    RotateCcw,
    Trophy,
    Zap,
    ChevronRight,
    MessageSquare,
    Star,
    ArrowLeft,
    CheckCircle2
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { FlashcardDeck, Flashcard } from '../types';
import { logUserActivity } from '../services/activityService';
import { HapticFeedback } from '../services/nativeAdapters';

interface FlashcardPlayerProps {
    deck: FlashcardDeck;
    cards: Flashcard[];
    onClose: () => void;
}

const FlashcardPlayer: React.FC<FlashcardPlayerProps> = ({ deck, cards, onClose }) => {
    const { user, addXp, addActivity, incrementFlashcardsStudied, updateSRSMetadata } = useStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [stats, setStats] = useState({ known: 0, struggling: 0 });
    const [isFinished, setIsFinished] = useState(false);

    const currentCard = cards[currentIndex];
    const progress = ((currentIndex) / cards.length) * 100;

    const handleRate = (rating: 1 | 3 | 4 | 5) => {
        if (rating >= 4) {
            setStats(prev => ({ ...prev, known: prev.known + 1 }));
        } else {
            setStats(prev => ({ ...prev, struggling: prev.struggling + 1 }));
        }
        HapticFeedback.selection();

        updateSRSMetadata(currentCard.id, 'flashcard', rating);

        if (currentIndex < cards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 300);
        } else {
            finishSession();
        }
    };

    const finishSession = () => {
        const xpGained = cards.length * 5;
        addXp(xpGained);
        HapticFeedback.success();
        incrementFlashcardsStudied(cards.length);
        addActivity('study', 'Session Flashcards terminée', `Tu as révisé ${cards.length} cartes sur "${deck.title}".`);
        if (user) {
            logUserActivity(
                user.id,
                user.name,
                'creative',
                `Session Flashcards terminée: ${deck.title}`,
                { cards: cards.length, xp: xpGained }
            );
        }
        setIsFinished(true);
    };

    if (isFinished) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto py-12 md:py-20 px-4 text-center space-y-8 md:space-y-12"
            >
                <div className="relative">
                    <div className="absolute -inset-8 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="relative w-32 h-32 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto flex items-center justify-center shadow-glow">
                        <Trophy size={60} className="text-white" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl md:text-4xl font-display font-black text-white">Session Terminée !</h2>
                    <p className="text-slate-400 text-lg">Deck: <span className="text-white font-bold">{deck.title}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="glass p-6 rounded-3xl border border-success/20 bg-success/5">
                        <div className="text-3xl font-black text-success mb-1">{stats.known}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-success/60">Maîtrisées</div>
                    </div>
                    <div className="glass p-6 rounded-3xl border border-warning/20 bg-warning/5">
                        <div className="text-3xl font-black text-warning mb-1">{stats.struggling}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-warning/60">À revoir</div>
                    </div>
                </div>

                <div className="glass p-8 rounded-[2rem] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <Zap size={24} />
                        </div>
                        <div className="text-left">
                            <div className="text-white font-bold">Points d'Expérience</div>
                            <div className="text-primary-light font-black">+ {cards.length * 5} XP</div>
                        </div>
                    </div>
                    <CheckCircle2 className="text-success" size={32} />
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 md:py-5 bg-white text-slate-900 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-xs md:text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                >
                    Retour au tableau de bord
                </button>
            </motion.div>
        );
    }

    return (
        <div className="min-h-[80vh] flex flex-col max-w-4xl mx-auto py-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all">
                    <X size={24} />
                </button>
                <div className="text-center">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-1">En cours d'étude</div>
                    <div className="text-white font-bold">{deck.title}</div>
                </div>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
                    {currentIndex + 1}/{cards.length}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-primary to-secondary shadow-glow"
                />
            </div>

            {/* Card Area */}
            <div className="flex-1 flex items-center justify-center perspective-1000 py-12">
                <motion.div
                    className="relative w-full max-w-lg aspect-[4/3] cursor-pointer"
                    style={{ transformStyle: 'preserve-3d' }}
                    onClick={() => setIsFlipped(!isFlipped)}
                    initial={false}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                    {/* Front */}
                    <div
                        className="absolute inset-0 glass rounded-[3rem] border border-white/10 shadow-2xl flex flex-col items-center justify-center p-12 text-center group"
                        style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            zIndex: isFlipped ? 0 : 1,
                            opacity: isFlipped ? 0 : 1,
                            transition: 'opacity 0.3s'
                        }}
                    >
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                            RECTO (Question)
                        </div>
                        <h3 className="text-xl md:text-3xl font-display font-black text-white leading-tight select-none">
                            {currentCard?.front}
                        </h3>
                        <div className="absolute bottom-12 flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Cliquer pour retourner <RotateCcw size={14} />
                        </div>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 glass rounded-[3rem] border border-primary/20 shadow-2xl flex flex-col items-center justify-center p-12 text-center bg-primary/5"
                        style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            zIndex: isFlipped ? 1 : 0,
                            opacity: isFlipped ? 1 : 0,
                            transition: 'opacity 0.3s'
                        }}
                    >
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-success/10 text-success rounded-full text-[10px] font-black uppercase tracking-widest border border-success/20">
                            VERSO (Réponse)
                        </div>
                        <p className="text-lg md:text-2xl font-bold text-white leading-relaxed select-none">
                            {currentCard?.back}
                        </p>
                        <div className="absolute bottom-12 flex items-center gap-2 text-primary-light font-black text-[10px] uppercase tracking-widest">
                            Maîtrisé ? Choisis ci-dessous
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Controls */}
            <div className="h-24">
                <AnimatePresence mode="wait">
                    {isFlipped ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex gap-4"
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRate(1); }}
                                className="flex-1 py-4 md:py-5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <RotateCcw size={16} /> Encore
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRate(3); }}
                                className="flex-1 py-4 md:py-5 bg-warning/10 border border-warning/20 hover:bg-warning/20 text-warning rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <Zap size={16} /> Difficile
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRate(4); }}
                                className="flex-1 py-4 md:py-5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-500 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <CheckCircle2 size={16} /> Bien
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRate(5); }}
                                className="flex-1 py-4 md:py-5 bg-success text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all flex flex-col items-center justify-center gap-1 shadow-glow"
                            >
                                <Star size={16} /> Facile
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center text-slate-500 font-bold"
                        >
                            Tape sur la carte pour voir la réponse
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FlashcardPlayer;
