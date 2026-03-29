import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

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
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            y: [0, -10, 0],
          }}
          exit={{ scale: 0, opacity: 0, y: 20 }}
          transition={{ 
            y: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            },
            scale: { duration: 0.5 },
            opacity: { duration: 0.5 }
          }}
          className="fixed bottom-24 right-6 z-[130] md:bottom-8 md:right-8"
        >
          <button
            onClick={onClick}
            className={`
              relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center
              shadow-[0_0_30px_rgba(59,130,246,0.3)] backdrop-blur-md border border-white/20
              transition-transform active:scale-90 overflow-hidden
              ${isUnlocked 
                ? 'bg-gradient-to-br from-blue-400/80 to-purple-500/80 animate-pulse' 
                : 'bg-white/10'
              }
            `}
          >
            {/* Liquid Progress Background */}
            {!isUnlocked && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-blue-500/30"
                initial={{ height: 0 }}
                animate={{ height: `${displayProgress}%` }}
                transition={{ duration: 1 }}
              />
            )}

            {/* Shine effect */}
            <div className="absolute top-2 left-3 w-4 h-2 bg-white/30 rounded-full blur-[1px] rotate-[-20deg]" />
            
            <div className="relative z-10 flex flex-col items-center">
              <Sparkles size={isUnlocked ? 28 : 20} className={isUnlocked ? 'text-white' : 'text-blue-400/50'} />
              {isUnlocked && (
                <span className="text-[8px] font-black uppercase tracking-tighter text-white mt-1">Détente</span>
              )}
            </div>

            {/* Percentage for debug or user info */}
            {!isUnlocked && progress > 0 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/40 pt-6">
                {Math.floor(displayProgress)}%
              </span>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
