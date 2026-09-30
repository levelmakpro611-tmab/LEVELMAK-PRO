import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';

export type CoachDockSlot = 
  | 'top-left' 
  | 'top-right' 
  | 'mid-left' 
  | 'mid-right' 
  | 'bottom-left' 
  | 'bottom-right';

interface DraggableCoachBubbleProps {
  onClick: () => void;
  isOpen: boolean;
  isModalOpen?: boolean;
}

const STORAGE_KEY = 'levelmak_coach_bubble_slot';

export const DraggableCoachBubble: React.FC<DraggableCoachBubbleProps> = ({
  onClick,
  isOpen,
  isModalOpen = false,
}) => {
  const [slot, setSlot] = useState<CoachDockSlot>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as CoachDockSlot | null;
      if (saved && ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right'].includes(saved)) {
        return saved;
      }
    } catch (_) {}
    return 'bottom-right';
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const handleDragStart = (_: any, info: PanInfo) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartPosRef.current = { x: info.point.x, y: info.point.y };
  };

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    setIsDragging(false);

    const dist = Math.hypot(
      info.point.x - dragStartPosRef.current.x,
      info.point.y - dragStartPosRef.current.y
    );

    // Si le déplacement est minime (simple tap), ne pas recalculer le slot
    if (dist < 10) {
      hasMovedRef.current = false;
      return;
    }

    hasMovedRef.current = true;
    setTimeout(() => { hasMovedRef.current = false; }, 200);

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // 1. Détermination stricte du côté horizontal : GAUCHE ou DROITE (jamais au centre)
    const newSide = info.point.x < screenW / 2 ? 'left' : 'right';

    // 2. Détermination stricte du niveau vertical : HAUT, MILIEU ou BAS (bornes sécurisées)
    let newLevel: 'top' | 'mid' | 'bottom';
    if (info.point.y < screenH * 0.35) {
      newLevel = 'top';
    } else if (info.point.y > screenH * 0.65) {
      newLevel = 'bottom';
    } else {
      newLevel = 'mid';
    }

    const newSlot: CoachDockSlot = `${newLevel}-${newSide}` as CoachDockSlot;
    setSlot(newSlot);
    try {
      localStorage.setItem(STORAGE_KEY, newSlot);
    } catch (_) {}

    HapticFeedback.selection();
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging || hasMovedRef.current) return;
    HapticFeedback.selection();
    onClick();
  };

  if (isOpen || isModalOpen) {
    return null;
  }

  // Positionnement fixe strict sur les 6 bordures avec respect des safe-areas :
  // - HAUT : sous le header (78px mobile / 96px desktop), impossible de dépasser vers le haut
  // - MILIEU : exactement centré verticalement sur les côtés gauche/droit
  // - BAS : 96px au-dessus du bord écran (au-dessus de la barre de navigation), impossible d'être coupé en bas
  const slotClasses = {
    'top-left': 'top-[calc(78px+env(safe-area-inset-top,0px))] md:top-24 left-4 md:left-6',
    'top-right': 'top-[calc(78px+env(safe-area-inset-top,0px))] md:top-24 right-4 md:right-6',
    'mid-left': 'top-1/2 -translate-y-1/2 left-4 md:left-6',
    'mid-right': 'top-1/2 -translate-y-1/2 right-4 md:right-6',
    'bottom-left': 'bottom-[calc(96px+env(safe-area-inset-bottom,0px))] md:bottom-8 left-4 md:left-6',
    'bottom-right': 'bottom-[calc(96px+env(safe-area-inset-bottom,0px))] md:bottom-8 right-4 md:right-6',
  }[slot];

  return (
    <AnimatePresence>
      <motion.div
        layout
        drag
        dragSnapToOrigin
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: isDragging ? 1.15 : 1,
          opacity: 1,
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{
          layout: { type: 'spring', stiffness: 350, damping: 28 },
          scale: { type: 'spring', stiffness: 400, damping: 25 },
        }}
        className={`fixed z-[120] touch-none select-none cursor-grab active:cursor-grabbing w-14 h-14 md:w-16 md:h-16 ${slotClasses}`}
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label="Ouvrir le Coach IA d'Élite"
          className="relative w-full h-full rounded-2xl md:rounded-[1.35rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-[0_8px_30px_rgba(79,70,229,0.45)] dark:shadow-[0_8px_35px_rgba(99,102,241,0.55)] border-2 border-white/25 flex items-center justify-center transition-transform active:scale-95 group overflow-hidden"
        >
          {/* Fond subtil animé */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />

          {/* Badge brillant */}
          <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-amber-400 rounded-full border-2 border-slate-900 flex items-center justify-center animate-pulse shadow-sm">
            <Sparkles className="text-slate-950 w-2.5 h-2.5 md:w-3 md:h-3" />
          </div>

          {/* Icône Message */}
          <MessageCircle
            size={28}
            className="md:w-8 md:h-8 group-hover:rotate-12 transition-transform duration-300 drop-shadow-sm"
          />

          {/* Indicateur de dock magnétique discret */}
          <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white/40" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
