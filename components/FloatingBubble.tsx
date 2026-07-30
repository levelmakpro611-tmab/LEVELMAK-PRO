import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';

interface FloatingBubbleProps {
  progress: number; // 0 to 30
  onClick: () => void;
  isVisible: boolean;
}

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({ progress, onClick, isVisible }) => {
  const isUnlocked = progress >= 30;
  const displayProgress = Math.min(100, (progress / 30) * 100);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.1}
          whileDrag={{ scale: 1.15, cursor: 'grabbing' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-24 right-6 z-[130] md:bottom-8 md:right-8 touch-none cursor-grab"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              onClick={() => {
                HapticFeedback.selection();
                onClick();
              }}
              className={`
                relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center
                shadow-[0_0_30px_rgba(147,51,234,0.5)] backdrop-blur-md border-2 border-white/30
                transition-transform active:scale-95 overflow-hidden select-none cursor-pointer
                ${isUnlocked 
                  ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 animate-pulse' 
                  : 'bg-gradient-to-br from-purple-600/90 via-indigo-600/90 to-blue-600/90'
                }
              `}
            >
              {/* Liquid Progress Background */}
              {!isUnlocked && (
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 bg-purple-400/40"
                  initial={{ height: 0 }}
                  animate={{ height: `${displayProgress}%` }}
                  transition={{ duration: 1 }}
                />
              )}

              {/* Shine effect */}
              <div className="absolute top-2 left-3 w-4 h-2 bg-white/40 rounded-full blur-[1px] rotate-[-20deg]" />
              
              <div className="relative z-10 flex flex-col items-center pointer-events-none">
                <Sparkles size={24} className="text-white drop-shadow-md animate-bounce" />
                <span className="text-[8px] font-black uppercase tracking-tighter text-white mt-0.5">
                  {isUnlocked ? 'Détente' : 'IA Coach'}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
