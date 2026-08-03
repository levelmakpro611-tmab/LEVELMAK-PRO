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
    if (!text) return 'text-2xl md:text-4xl';
    if (text.length > 200) return 'text-base md:text-xl';
    if (text.length > 100) return 'text-lg md:text-2xl';
    if (text.length > 50) return 'text-xl md:text-3xl';
    return 'text-2xl md:text-4xl';
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
    const [masteredCardIds, setMasteredCardIds] = useState<Set<string>>(new Set());
    const [isFlipped, setIsFlipped] = useState(false);

    const dragX = useMotionValue(0);
    const dragRotate = useTransform(dragX, [-200, 200], [-15, 15]);

    const currentCard = activeCards[currentIndex];
    const currentCardIsNew = currentCard && !masteredCardIds.has(currentCard.id);
    const displayedCount = Math.min(masteredCardIds.size + (currentCardIsNew ? 1 : 0), cards.length);
    const progress = cards.length > 0 ? (masteredCardIds.size / cards.length) * 100 : 0;

    const handleRate = (mastered: boolean) => {
        if (!currentCard) return;

        HapticFeedback.selection();
        updateSRSMetadata(currentCard.id, 'flashcard', mastered ? 5 : 2);

        if (mastered) {
            incrementFlashcardsStudied(1);
            setMasteredCardIds(prev => new Set(prev).add(currentCard.id));
            addXp(10);
            addLevelCoins(2);
            trackTime(1, deck.subject);
        } else {
            // Re-queue the unmastered card to the end of the stack for review!
            // Does NOT count as learned/mastered!
            setActiveCards(prev => [...prev, currentCard]);
        }

        if (currentIndex < activeCards.length - 1 || !mastered) {
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
                className="max-w-2xl mx-auto py-8 md:py-16 px-4 text-center space-y-8 custom-scrollbar"
            >
                <div className="relative">
                    <div className="absolute -inset-8 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="relative w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto flex items-center justify-center shadow-glow">
                        <Trophy size={56} className="text-white" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-display font-black text-white">Deck Maîtrisé ! 🏆</h2>
                    <p className="text-slate-400 text-base md:text-lg">Deck: <span className="text-white font-bold">{deck.title}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-5 rounded-2xl border border-success/20 bg-success/5">
                        <div className="text-2xl md:text-3xl font-black text-success mb-1">{cards.length}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-success/70">Cartes Apprises</div>
                    </div>
                    <div className="glass p-5 rounded-2xl border border-primary/20 bg-primary/5">
                        <div className="text-2xl md:text-3xl font-black text-primary-light mb-1">+ {cards.length * 10} XP</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary-light/70">Points d'Expérience</div>
                    </div>
                </div>

                {/* Comprehension Quiz & Key Review Sheet */}
                <div className="glass p-6 md:p-8 rounded-[2rem] border border-white/10 text-left space-y-6 bg-slate-900/80">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                        <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Test de Mémorisation & Bilan</h3>
                            <p className="text-xs text-slate-400 font-medium">Revois les notions clés tirées de tes cartes</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                        {cards.slice(0, 5).map((c, idx) => (
                            <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                                <div className="text-xs font-black text-primary-light uppercase tracking-widest flex items-center gap-2">
                                    <span>Question {idx + 1} :</span>
                                </div>
                                <p className="text-sm font-bold text-white">{c.front}</p>
                                <div className="mt-2 pt-2 border-t border-white/5 text-xs text-emerald-400 font-semibold flex items-start gap-2">
                                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                                    <span>Réponse : {c.back}</span>
                                </div>
                            </div>
                        ))}
                    </div>
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
                    {displayedCount}/{cards.length}
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

            {/* Card Area with Floating Navigation Arrows */}
            <div className="relative flex-1 w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto my-auto flex items-center justify-center min-w-0 px-2 sm:px-4">
                {/* Floating Left Arrow Button */}
                <button
                    onClick={() => {
                        if (currentIndex > 0) {
                            setIsFlipped(false);
                            setCurrentIndex(prev => prev - 1);
                            HapticFeedback.selection();
                        }
                    }}
                    disabled={currentIndex === 0}
                    className="absolute -left-2 sm:-left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-4 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-20 text-white rounded-2xl transition-all border border-white/20 shadow-2xl backdrop-blur-xl shrink-0"
                    title="Carte précédente"
                >
                    <ArrowLeft size={22} className="sm:w-6 sm:h-6" />
                </button>

                {/* Floating Right Arrow Button */}
                <button
                    onClick={() => {
                        if (currentIndex < activeCards.length - 1) {
                            setIsFlipped(false);
                            setCurrentIndex(prev => prev + 1);
                            HapticFeedback.selection();
                        }
                    }}
                    disabled={currentIndex === activeCards.length - 1}
                    className="absolute -right-2 sm:-right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-4 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-20 text-white rounded-2xl transition-all border border-white/20 shadow-2xl backdrop-blur-xl shrink-0"
                    title="Carte suivante"
                >
                    <ChevronRight size={22} className="sm:w-6 sm:h-6" />
                </button>

                <div className="w-full min-w-0">
                    <motion.div
                        className="relative w-full h-[440px] sm:h-[500px] md:h-[540px] cursor-pointer mx-auto"
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
                            className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center justify-between p-6 sm:p-10 text-center overflow-y-auto custom-scrollbar group bg-[#0d1527] w-full h-full"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                zIndex: isFlipped ? 0 : 1,
                                opacity: isFlipped ? 0 : 1,
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
                            className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] border border-primary/40 shadow-2xl flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-[#0d1527] w-full h-full"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                                zIndex: isFlipped ? 1 : 0,
                                opacity: isFlipped ? 1 : 0,
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
