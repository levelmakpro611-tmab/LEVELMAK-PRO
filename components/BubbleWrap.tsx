import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';
import confetti from 'canvas-confetti';

interface BubbleWrapProps {
  onClose: () => void;
}

export const BubbleWrap: React.FC<BubbleWrapProps> = ({ onClose }) => {
  const GRID_SIZE = 36; // 6x6 grid
  const BUBBLE_GRADIENTS = [
    { light: 'from-red-200 to-red-300', dark: 'dark:from-red-500/80 dark:to-rose-600/80' },
    { light: 'from-orange-200 to-orange-300', dark: 'dark:from-orange-400/80 dark:to-amber-500/80' },
    { light: 'from-amber-100 to-amber-200', dark: 'dark:from-amber-400/80 dark:to-yellow-500/80' },
    { light: 'from-emerald-100 to-emerald-200', dark: 'dark:from-emerald-500/80 dark:to-green-600/80' },
    { light: 'from-blue-200 to-blue-300', dark: 'dark:from-blue-500/80 dark:to-cyan-600/80' },
    { light: 'from-indigo-200 to-indigo-300', dark: 'dark:from-indigo-500/80 dark:to-blue-600/80' },
    { light: 'from-purple-200 to-purple-300', dark: 'dark:from-purple-500/80 dark:to-indigo-600/80' },
    { light: 'from-pink-200 to-pink-300', dark: 'dark:from-pink-500/80 dark:to-rose-600/80' },
  ];

  const [bubbles, setBubbles] = useState<boolean[]>(Array(GRID_SIZE).fill(false));
  const [bubbleStyles, setBubbleStyles] = useState<number[]>([]);
  const [poppedCount, setPoppedCount] = useState(0);

  // Initialize bubble colors
  useEffect(() => {
    const styles = Array(GRID_SIZE).fill(0).map(() => Math.floor(Math.random() * BUBBLE_GRADIENTS.length));
    setBubbleStyles(styles);
  }, []);

  const playPopSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800 + Math.random() * 400, audioCtx.currentTime); // Pitch variation
      oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio Pop failed", e);
    }
  };

  const handlePop = (index: number) => {
    if (bubbles[index]) return; // Already popped
    
    HapticFeedback.success();
    playPopSound();
    
    const newBubbles = [...bubbles];
    newBubbles[index] = true;
    setBubbles(newBubbles);
    setPoppedCount(prev => prev + 1);
  };

  const resetWrap = () => {
    setBubbles(Array(GRID_SIZE).fill(false));
    const styles = Array(GRID_SIZE).fill(0).map(() => Math.floor(Math.random() * BUBBLE_GRADIENTS.length));
    setBubbleStyles(styles);
    setPoppedCount(0);
    HapticFeedback.selection();
  };

  useEffect(() => {
    if (poppedCount === GRID_SIZE) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        resetWrap();
      }, 1500);
    }
  }, [poppedCount, GRID_SIZE]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Lâcher-Prise 🌈</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Éclate les bulles pour te détendre quelques instants.</p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-3xl mb-6">
          <div className="grid grid-cols-6 gap-2">
            {bubbles.map((isPopped, idx) => {
              const styleIdx = bubbleStyles[idx] || 0;
              const gradient = BUBBLE_GRADIENTS[styleIdx];
              
              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => handlePop(idx)}
                  className={`aspect-square rounded-full transition-all duration-200 flex items-center justify-center relative overflow-hidden shadow-inner ${
                    isPopped 
                      ? 'bg-slate-200 dark:bg-slate-700/50 shadow-none' 
                      : `bg-gradient-to-br ${gradient.light} ${gradient.dark} hover:brightness-110`
                  }`}
                >
                  {!isPopped && (
                    <div className="absolute inset-0 bg-white/20 rounded-full w-1/2 h-1/2 top-1 left-1 opacity-50 blur-[2px]" />
                  )}
                  {isPopped && (
                    <motion.div
                      initial={{ scale: 1.5, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      className="absolute inset-0 border-2 border-white/20 rounded-full"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-2">
          <p className="text-sm font-bold text-slate-500">
            {poppedCount}/{GRID_SIZE} bulles
          </p>
          <button 
            onClick={resetWrap}
            className="flex items-center gap-2 text-primary hover:text-primary-dark font-bold text-sm px-4 py-2 bg-primary/10 rounded-full transition-colors"
          >
            <RefreshCcw size={16} /> Nouvelle feuille
          </button>
        </div>
      </motion.div>
    </div>
  );
};
