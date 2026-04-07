import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlashcardStore, LocalFlashcard } from '../services/flashcardStore';
import { Brain, ArrowLeft, CheckCircle, XCircle, RotateCcw, ShieldCheck, Flame, BookOpen } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';

export const FlashcardMode: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { cards, getCardsToReview, reviewCard, markAsMastered } = useFlashcardStore();
  const [cardsToReview] = useState<LocalFlashcard[]>(getCardsToReview());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(cardsToReview.length === 0);

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
    setIsFlipped(!isFlipped);
  };

  const handleScore = (score: 0 | 1 | 2 | 3 | 4 | 5) => {
    HapticFeedback.action();
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
          className="h-full bg-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex) / cardsToReview.length) * 100}%` }}
        />
      </div>

      {/* Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full relative perspective-[2000px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id + (isFlipped ? 'back' : 'front')}
            initial={{ rotateX: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={!isFlipped ? handleFlip : undefined}
            className={`w-full max-w-md aspect-[3/4] rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center cursor-pointer relative shadow-2xl border ${isFlipped ? 'bg-slate-800 border-purple-500/30' : 'bg-gradient-to-br from-slate-800 to-slate-900 border-white/10'}`}
          >
             <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-500">
               <span className="text-[10px] font-black uppercase tracking-widest">{currentCard.subject}</span>
               {isFlipped ? <Flame size={16} className="text-orange-500" /> : <BookOpen size={16} />}
             </div>

             {!isFlipped ? (
               <div className="space-y-6 flex flex-col items-center">
                 <h3 className="text-3xl font-black text-white leading-tight">
                   {currentCard.front}
                 </h3>
                 <p className="text-sm font-bold text-slate-500 mt-8 animate-pulse text-center">
                   👆 Tap pour retourner la carte
                 </p>
               </div>
             ) : (
               <div className="w-full space-y-6 text-left">
                 <h4 className="text-xs font-black uppercase text-purple-400 tracking-widest mb-2 border-b border-white/10 pb-2">Réponse</h4>
                 <div className="text-lg text-white font-medium whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[50vh]">
                   {currentCard.back}
                 </div>
               </div>
             )}
          </motion.div>
        </AnimatePresence>
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
          <div className="w-full flex justify-between flex-wrap gap-2 md:gap-4 px-2">
            <button onClick={() => handleScore(1)} className="flex-1 p-3 bg-danger/20 border border-danger/30 text-danger rounded-xl hover:bg-danger/30 transition-all">
              <span className="block text-xs font-black uppercase whitespace-nowrap">À revoir</span>
              <span className="block text-[10px] opacity-70 mt-1">1 Min</span>
            </button>
            <button onClick={() => handleScore(3)} className="flex-1 p-3 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-xl hover:bg-orange-500/30 transition-all">
              <span className="block text-xs font-black uppercase whitespace-nowrap">Difficile</span>
              <span className="block text-[10px] opacity-70 mt-1">2 Jours</span>
            </button>
            <button onClick={() => handleScore(5)} className="flex-1 p-3 bg-success/20 border border-success/30 text-success rounded-xl hover:bg-success/30 transition-all">
              <span className="block text-xs font-black uppercase whitespace-nowrap">Facile</span>
              <span className="block text-[10px] opacity-70 mt-1">4 Jours</span>
            </button>
            <button onClick={handleMastery} className="flex-1 p-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all shadow-glow-purple flex flex-col items-center justify-center gap-1">
              <ShieldCheck size={16} />
              <span className="block text-[10px] font-black uppercase whitespace-nowrap">Maîtrisé</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
