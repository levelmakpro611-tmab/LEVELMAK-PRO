import React from 'react';
import { motion } from 'framer-motion';

/**
 * Composant de chargement "Skeleton" (Squelette)
 * Fournit un effet de scintillement (shimmer) pour une perception de vitesse accrue.
 */
interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const getShapeClass = () => {
    switch (variant) {
      case 'circle': return 'rounded-full';
      case 'text': return 'rounded h-3 w-3/4';
      default: return 'rounded-xl';
    }
  };

  return (
    <div className={`relative overflow-hidden bg-slate-200 dark:bg-slate-800/50 ${getShapeClass()} ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent shadow-xl"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};

export default Skeleton;
