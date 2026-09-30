import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
const BUBBLE_SIZE_MOBILE = 54;
const BUBBLE_SIZE_DESKTOP = 62;

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

  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isDesktop = windowDimensions.width >= 768;
  const bubbleSize = isDesktop ? BUBBLE_SIZE_DESKTOP : BUBBLE_SIZE_MOBILE;

  // Calculate coordinates for the 6 docking slots
  const slotsCoordinates = useMemo(() => {
    const { width, height } = windowDimensions;
    const marginX = isDesktop ? 24 : 16;
    
    // Top offset safely below header
    const topY = isDesktop ? 96 : 84;
    // Mid offset at vertical center
    const midY = Math.max(topY + bubbleSize, Math.round((height / 2) - (bubbleSize / 2)));
    // Bottom offset safely above the mobile navbar (navbar is ~80px + safe area)
    const bottomY = Math.max(midY + bubbleSize, height - (isDesktop ? 90 : 150) - bubbleSize);

    const leftX = marginX;
    const rightX = Math.max(leftX, width - marginX - bubbleSize);

    return {
      'top-left': { x: leftX, y: topY },
      'top-right': { x: rightX, y: topY },
      'mid-left': { x: leftX, y: midY },
      'mid-right': { x: rightX, y: midY },
      'bottom-left': { x: leftX, y: bottomY },
      'bottom-right': { x: rightX, y: bottomY },
    };
  }, [windowDimensions, isDesktop, bubbleSize]);

  // Current target position based on active slot
  const currentPos = slotsCoordinates[slot] || slotsCoordinates['bottom-right'];

  // Calculate closest slot on drag release
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    setIsDragging(false);

    // If practically no movement, treat as simple click/tap
    const movedDistance = Math.hypot(info.offset.x, info.offset.y);
    if (movedDistance < 6) {
      setHasMovedDuringDrag(false);
      return;
    }

    setHasMovedDuringDrag(true);
    setTimeout(() => setHasMovedDuringDrag(false), 200);

    // Find closest slot by Euclidean distance from drop point (centered on bubble)
    const dropCenterX = info.point.x;
    const dropCenterY = info.point.y;

    let closestSlot: CoachDockSlot = slot;
    let minDistance = Infinity;

    (Object.entries(slotsCoordinates) as [CoachDockSlot, { x: number; y: number }][]).forEach(([slotId, coords]) => {
      const slotCenterX = coords.x + bubbleSize / 2;
      const slotCenterY = coords.y + bubbleSize / 2;
      const dist = Math.hypot(slotCenterX - dropCenterX, slotCenterY - dropCenterY);
      if (dist < minDistance) {
        minDistance = dist;
        closestSlot = slotId;
      }
    });

    setSlot(closestSlot);
    try {
      localStorage.setItem(STORAGE_KEY, closestSlot);
    } catch (_) {}

    HapticFeedback.selection();
  }, [slot, slotsCoordinates, bubbleSize]);

  const handlePointerDown = () => {
    setHasMovedDuringDrag(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging || hasMovedDuringDrag) return;
    HapticFeedback.selection();
    onClick();
  };

  // Hidden when chat modal or full-screen modals are open
  if (isOpen || isModalOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.12}
        onPointerDown={handlePointerDown}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0, opacity: 0, x: currentPos.x, y: currentPos.y }}
        animate={{
          scale: isDragging ? 1.12 : 1,
          opacity: 1,
          x: currentPos.x,
          y: currentPos.y,
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: isDragging ? 600 : 380,
          damping: isDragging ? 40 : 26,
          mass: 0.8,
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: bubbleSize,
          height: bubbleSize,
          zIndex: 120,
        }}
        className="touch-none select-none cursor-grab active:cursor-grabbing"
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label="Ouvrir le Coach IA d'Élite"
          className="relative w-full h-full rounded-2xl md:rounded-[1.35rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-[0_8px_30px_rgba(79,70,229,0.45)] dark:shadow-[0_8px_35px_rgba(99,102,241,0.55)] border-2 border-white/25 flex items-center justify-center transition-transform active:scale-95 group overflow-hidden"
        >
          {/* Subtle pulse background animation */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />

          {/* Sparkle badge */}
          <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-amber-400 rounded-full border-2 border-slate-900 flex items-center justify-center animate-pulse shadow-sm">
            <Sparkles className="text-slate-950 w-2.5 h-2.5 md:w-3 md:h-3" />
          </div>

          {/* Center Coach Icon */}
          <MessageCircle
            size={isDesktop ? 30 : 26}
            className="group-hover:rotate-12 transition-transform duration-300 drop-shadow-sm"
          />

          {/* Magnetic Dock Slot Hint Indicator (Subtle micro dot) */}
          <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white/40" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
