import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
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

const getFontSize = (text?: string) => {
    if (!text) return 'text-lg md:text-2xl';
    if (text.length > 200) return 'text-xs md:text-sm';
    if (text.length > 100) return 'text-sm md:text-base';
    if (text.length > 50) return 'text-base md:text-xl';
    return 'text-lg md:text-2xl';
};

const FormattedMarkdownText: React.FC<{ content?: string; className?: string }> = ({ content, className = '' }) => {
    if (!content) return null;
    const lines = content.split('\n');
    return (
        <div className={`space-y-2 ${className}`}>
            {lines.map((line, idx) => {
                const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                return (
                    <p key={idx} className="leading-relaxed">
                        {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={pIdx} className="font-black text-purple-300">{part.slice(2, -2)}</strong>;
                            } else if (part.startsWith('*') && part.endsWith('*')) {
                                return <em key={pIdx} className="italic text-slate-300">{part.slice(1, -1)}</em>;
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </div>
    );
};

const FlashcardPlayer: React.FC<FlashcardPlayerProps> = ({ deck, cards: rawCards, onClose }) => {
    // Deduplicate cards array
    const cards = useMemo(() => {
        return Array.from(new Map(rawCards.map(c => [c.id || c.front, c])).values());
    }, [rawCards]);

    const { user, addXp, addLevelCoins, addActivity, incrementFlashcardsStudied, updateSRSMetadata, trackTime } = useStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeCards, setActiveCards] = useState<Flashcard[]>([...cards]);
    const [isFlipped, setIsFlipped] = useState(false);

    const dragX = useMotionValue(0);
    const dragRotate = useTransform(dragX, [-200, 200], [-15, 15]);

    const currentCard = activeCards[currentIndex];
    const progress = activeCards.length > 0 ? ((currentIndex + 1) / activeCards.length) * 100 : 0;

    const handleRate = (mastered: boolean) => {
        if (!currentCard) return;

        HapticFeedback.selection();
        incrementFlashcardsStudied(1);
        updateSRSMetadata(currentCard.id, 'flashcard', mastered ? 5 : 2);

        if (mastered) {
            addXp(10);
            addLevelCoins(2);
            trackTime(1, deck.subject);
        }

        if (currentIndex < activeCards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 150);
        } else {
            addActivity('study', 'Cartes terminées 🧠', `Deck : ${deck.title}`);
            if (user) {
                logUserActivity(user.id, user.name, 'study', `Studied Deck: ${deck.title}`);
            }
            setIsFlipped(false);
            setCurrentIndex(activeCards.length); // Trigger end screen
        }
    };

    if (currentIndex >= activeCards.length) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto py-12 md:py-20 px-4 text-center space-y-8 md:space-y-12"
            >
                <div className="relative">
                    <div className="absolute -inset-8 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="relative w-32 h-32 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto flex items-center justify-center shadow-glow">
                        <Trophy size={60} className="text-white" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl md:text-4xl font-display font-black text-white">Deck Maîtrisé !</h2>
                    <p className="text-slate-400 text-lg">Deck: <span className="text-white font-bold">{deck.title}</span></p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="glass p-6 rounded-3xl border border-success/20 bg-success/5">
                        <div className="text-3xl font-black text-success mb-1">{cards.length}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-success/60">Cartes Apprises</div>
                    </div>
                </div>

                <div className="glass p-8 rounded-[2rem] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <Zap size={24} />
                        </div>
                        <div className="text-left">
                            <div className="text-white font-bold">Points d'Expérience</div>
                            <div className="text-primary-light font-black">+ {cards.length * 10} XP</div>
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
        <div className="min-h-[80vh] flex flex-col max-w-4xl mx-auto py-8 px-6 space-y-8 animate-fade-in">
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
                    style={{ originX: 0 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: progress / 100 }}
                    className="h-full bg-gradient-to-r from-primary to-secondary shadow-glow w-full"
                />
            </div>

            {/* Card Area with Navigation Arrows */}
            <div className="flex-1 flex items-center justify-center perspective-1000 py-4 sm:py-8 gap-2 sm:gap-6 w-full max-w-2xl mx-auto">
                <button
                    onClick={() => {
                        if (currentIndex > 0) {
                            setIsFlipped(false);
                            setCurrentIndex(prev => prev - 1);
                            HapticFeedback.selection();
                        }
                    }}
                    disabled={currentIndex === 0}
                    className="p-3 sm:p-4 bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white rounded-2xl transition-all border border-white/10 shrink-0 z-20"
                    title="Carte précédente"
                >
                    <ArrowLeft size={24} />
                </button>

                <div className="flex-1 w-full max-w-md sm:max-w-lg mx-auto min-w-[280px]">
                    <motion.div
                        className="relative w-full h-[360px] sm:h-[420px] cursor-pointer mx-auto"
                        drag={isFlipped ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.8}
                        onDragEnd={(event, info) => {
                            if (!isFlipped) return;
                            const swipeThreshold = 100;
                            if (info.offset.x > swipeThreshold) {
                                handleRate(true); // Swiped Right -> Mastered
                            } else if (info.offset.x < -swipeThreshold) {
                                handleRate(false); // Swiped Left -> Repeat
                            }
                        }}
                        style={{ x: dragX, rotate: dragRotate, transformStyle: 'preserve-3d' }}
                        onClick={() => {
                            if (Math.abs(dragX.get()) < 10) {
                                setIsFlipped(!isFlipped);
                            }
                        }}
                        initial={false}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    >
                        {/* Front */}
                        <div
                            className="absolute inset-0 glass rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center justify-between p-6 sm:p-10 text-center overflow-y-auto custom-scrollbar group bg-slate-900/90 w-full h-full"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                zIndex: isFlipped ? 0 : 1,
                                opacity: isFlipped ? 0 : 1,
                                transition: 'opacity 0.3s'
                            }}
                        >
                            <div className="w-full flex-1 flex flex-col items-center justify-center my-auto py-2">
                                <FormattedMarkdownText 
                                    content={currentCard?.front} 
                                    className={`font-display font-black text-white leading-relaxed select-none ${getFontSize(currentCard?.front)}`}
                                />
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/10 shrink-0">
                                Cliquer pour retourner <RotateCcw size={14} />
                            </div>
                        </div>

                        {/* Back */}
                        <div
                            className="absolute inset-0 glass rounded-[2.5rem] border border-primary/30 shadow-2xl flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-slate-900/95 w-full h-full"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                                zIndex: isFlipped ? 1 : 0,
                                opacity: isFlipped ? 1 : 0,
                                transition: 'opacity 0.3s'
                            }}
                        >
                            <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col items-center justify-center py-2 my-auto">
                                <FormattedMarkdownText 
                                    content={currentCard?.back} 
                                    className={`font-bold text-white leading-relaxed select-none ${getFontSize(currentCard?.back)}`}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>

                <button
                    onClick={() => {
                        if (currentIndex < activeCards.length - 1) {
                            setIsFlipped(false);
                            setCurrentIndex(prev => prev + 1);
                            HapticFeedback.selection();
                        }
                    }}
                    disabled={currentIndex === activeCards.length - 1}
                    className="p-3 sm:p-4 bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white rounded-2xl transition-all border border-white/10 shrink-0 z-20"
                    title="Carte suivante"
                >
                    <ChevronRight size={24} />
                </button>
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
                                onClick={(e) => { e.stopPropagation(); handleRate(false); }}
                                className="flex-1 py-4 md:py-6 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all flex items-center justify-center gap-3"
                            >
                                <RotateCcw size={20} /> À REPRENDRE
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRate(true); }}
                                className="flex-1 py-4 md:py-6 bg-success text-white rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all flex items-center justify-center gap-3 shadow-glow"
                            >
                                <ChevronRight size={20} /> AVANCER
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
