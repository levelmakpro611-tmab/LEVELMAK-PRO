import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlashcardStore, LocalFlashcard } from '../services/flashcardStore';
import { Brain, ArrowLeft, CheckCircle, XCircle, RotateCcw, ShieldCheck, Flame, BookOpen, ChevronRight } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';
import { audioService } from '../services/audio';

export const FlashcardMode: React.FC<{ onClose: () => void, filterTopic?: string }> = ({ onClose, filterTopic }) => {
  const { cards, getCardsToReview, reviewCard, markAsMastered } = useFlashcardStore();
  
  // Filter cards to review based on topic if provided
  const [cardsToReview] = useState<LocalFlashcard[]>(() => {
    const allToReview = getCardsToReview();
    if (filterTopic) {
      const topicToReview = allToReview.filter(c => c.sourceQuizTitle === filterTopic);
      if (topicToReview.length > 0) {
        return topicToReview;
      }
      // Fallback: if no cards are strictly due, load all cards from this topic for viewing/studying
      return cards.filter(c => c.sourceQuizTitle === filterTopic);
    }
    return allToReview;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(cardsToReview.length === 0);

  useEffect(() => {
    audioService.startBackgroundPiano();
    return () => {
      audioService.stopBackgroundPiano();
    };
  }, []);

  if (sessionCompleted) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0f1d] flex flex-col items-center justify-center p-6 animate-fade-in">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-success to-emerald-400" />
          
          <div className="w-20 h-20 bg-success/20 rounded-2xl flex items-center justify-center mx-auto border border-success/30 shadow-glow-emerald">
            <CheckCircle size={40} className="text-success" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Révision Terminée</h2>
            <p className="text-slate-400 font-medium">Vous avez révisé toutes les flashcards en attente pour le moment. Votre cerveau se renforce !</p>
          </div>
          
          <div className="pt-4 border-t border-white/10 flex justify-between px-4">
            <div className="text-center">
              <p className="text-xs font-black text-slate-500 uppercase">En Attente</p>
              <p className="text-xl font-bold text-white">{cards.length - getCardsToReview().length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-slate-500 uppercase">Totales</p>
              <p className="text-xl font-bold text-white">{cards.length}</p>
            </div>
          </div>

          <button 
            onClick={() => { HapticFeedback.selection(); onClose(); }}
            className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Retour au Tableau de Bord
          </button>
        </motion.div>
      </div>
    );
  }

  const currentCard = cardsToReview[currentIndex];

  const handleFlip = () => {
    HapticFeedback.selection();
    audioService.playClick();
    setIsFlipped(!isFlipped);
  };

  const handleScore = (score: 0 | 1 | 2 | 3 | 4 | 5) => {
    HapticFeedback.action();
    if (score >= 3) {
        audioService.playSuccess('quiz');
    } else {
        audioService.playError('quiz');
    }
    reviewCard(currentCard.id, score);
    
    // Move to next card
    if (currentIndex < cardsToReview.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleMastery = () => {
    HapticFeedback.success();
    audioService.playSuccess('quiz');
    markAsMastered(currentCard.id);
    
    if (currentIndex < cardsToReview.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
    } else {
      setSessionCompleted(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0f1d] flex flex-col pt-10 px-4 md:px-8 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 max-w-2xl mx-auto w-full">
        <button 
          onClick={() => { HapticFeedback.selection(); onClose(); }}
          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="text-center">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Répétition Espacée</p>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 justify-center">
            <Brain className="text-purple-400" /> Mode Flashcards
          </h2>
        </div>
        
        <div className="p-3 bg-white/5 rounded-xl text-slate-300 font-bold font-mono">
          {currentIndex + 1} / {cardsToReview.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-2xl mx-auto h-1 bg-white/10 rounded-full mb-10 overflow-hidden">
        <motion.div 
          className="h-full bg-purple-500 w-full"
          style={{ originX: 0 }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: cardsToReview.length > 0 ? currentIndex / cardsToReview.length : 0 }}
        />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full relative perspective-[2000px]">
        <motion.div
            className="relative w-full max-w-md aspect-[3/4] cursor-pointer"
            style={{ transformStyle: 'preserve-3d' }}
            onClick={handleFlip}
            initial={false}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
            {/* Front Side */}
            <div
                className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center shadow-2xl transition-all"
                style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    zIndex: isFlipped ? 0 : 1,
                    opacity: isFlipped ? 0 : 1,
                    transition: 'opacity 0.3s'
                }}
            >
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-500">
                    <span className="text-[10px] font-black uppercase tracking-widest">{currentCard.subject}</span>
                    <BookOpen size={16} />
                </div>
                <div className="space-y-6 flex flex-col items-center">
                    <h3 className="text-3xl font-black text-white leading-tight select-none">
                        {currentCard.front}
                    </h3>
                    <p className="text-sm font-bold text-slate-500 mt-8 animate-pulse text-center">
                        👆 Tap pour retourner la carte
                    </p>
                </div>
            </div>

            {/* Back Side */}
            <div
                className="absolute inset-0 bg-slate-800 border border-purple-500/30 rounded-[2.5rem] p-8 flex flex-col text-left shadow-2xl transition-all"
                style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    zIndex: isFlipped ? 1 : 0,
                    opacity: isFlipped ? 1 : 0,
                    transition: 'opacity 0.3s'
                }}
            >
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-purple-400">
                    <span className="text-[10px] font-black uppercase tracking-widest">Réponse</span>
                    <Flame size={16} className="text-orange-500" />
                </div>
                <div className="w-full h-full pt-8 overflow-y-auto custom-scrollbar flex items-center">
                    <div className="text-lg text-white font-medium whitespace-pre-wrap leading-relaxed select-none">
                        {currentCard.back}
                    </div>
                </div>
                <div className="absolute bottom-6 left-0 right-0 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-50">
                    Cliquer pour revoir la question
                </div>
            </div>
        </motion.div>
      </div>

      {/* Actions / Evaluation */}
      <div className="max-w-2xl mx-auto w-full mt-8 h-32 flex justify-center items-center">
        {!isFlipped ? (
          <button 
             onClick={handleFlip}
             className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl font-bold text-white transition-all w-full max-w-xs uppercase tracking-widest"
          >
             Révéler
          </button>
        ) : (
          <div className="flex gap-4 w-full px-2">
            <button
                onClick={(e) => { e.stopPropagation(); handleScore(1); }}
                className="flex-1 py-4 md:py-6 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all flex items-center justify-center gap-3"
            >
                <RotateCcw size={20} /> À REPRENDRE
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); handleScore(4); }}
                className="flex-1 py-4 md:py-6 bg-success text-white rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all flex items-center justify-center gap-3 shadow-glow"
            >
                <ChevronRight size={20} /> AVANCER
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
