import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Sparkles, Lock, ArrowRight, X, Copy, Check } from 'lucide-react';
import { isNativePlatform } from '../services/nativeAdapters';

interface PremiumAlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  onClose: () => void;
}

export const PremiumAlertModal: React.FC<PremiumAlertModalProps> = ({
  isOpen,
  title,
  message,
  actionText = "Découvrir nos offres",
  onAction,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const isMobile = isNativePlatform();

  const displayTitle = isMobile ? "Espace Premium 🌟" : title;
  const displayMessage = isMobile 
    ? "Cette partie n'est pas accessible depuis l'application mobile. Il vous suffira d'aller sur notre page web pour plus d'explications."
    : message;
  const displayActionText = isMobile 
    ? (copied ? "Adresse copiée !" : "Copier l'adresse de notre site") 
    : actionText;

  const handleActionClick = () => {
    if (isMobile) {
      navigator.clipboard.writeText('https://levelmak.app');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      onClose();
      if (onAction) onAction();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop with elegant blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xl"
          />

          {/* Luxury Alert Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="relative w-full max-w-md bg-white dark:bg-gradient-to-b dark:from-[#0e1626] dark:to-[#080d18] border-2 border-amber-500/40 rounded-[2.5rem] p-8 shadow-2xl shadow-amber-500/10 text-center overflow-hidden"
          >
            {/* Top decorative lights */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent blur-[1px]" />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Glowing Icon Container */}
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-lg animate-pulse" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-amber-400/20 to-yellow-600/20 rounded-2xl border border-amber-500/40 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.2)]">
                <Lock size={24} className="animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-3 uppercase">
              {displayTitle}
            </h3>

            {/* Message - Fix text contrast in light and dark mode */}
            <div className="text-slate-700 dark:text-amber-100 text-sm leading-relaxed font-bold mb-8 whitespace-pre-line px-2">
              {displayMessage}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleActionClick}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {isMobile ? (
                  copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />
                ) : (
                  <ArrowRight size={14} strokeWidth={3} />
                )}
                <span>{displayActionText}</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl font-bold text-xs transition-colors"
              >
                {isMobile ? "Fermer" : "Continuer avec la version gratuite"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
