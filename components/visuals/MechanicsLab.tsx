import React, { useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Activity, RotateCcw, Info, Sparkles, Wind } from 'lucide-react';
import { HapticFeedback } from '../../services/nativeAdapters';

export const MechanicsLab: React.FC = () => {
  const [isVacuum, setIsVacuum] = useState(false);
  const [hasDropped, setHasDropped] = useState(false);
  
  const featherControls = useAnimation();
  const ballControls = useAnimation();

  const handleDrop = async () => {
    HapticFeedback.action();
    setHasDropped(true);
    
    // In vacuum: Fall in 1s for both
    // In air: Ball falls in 1s, Feather takes 4s and oscillates horizontally
    
    const durationVacuum = 1;
    const durationBallAir = 1.1;
    const durationFeatherAir = 4;

    const fallDistance = 350; // pixels

    // Drop Ball
    ballControls.start({
      y: fallDistance,
      transition: { duration: isVacuum ? durationVacuum : durationBallAir, ease: 'easeIn' }
    });

    // Drop Feather
    if (isVacuum) {
      featherControls.start({
        y: fallDistance,
        x: 0,
        rotate: 0,
        transition: { duration: durationVacuum, ease: 'easeIn' }
      });
    } else {
      featherControls.start({
        y: fallDistance,
        x: [0, -20, 20, -15, 15, -10, 10, 0], // swaying back and forth
        rotate: [0, -15, 15, -10, 10, -5, 5, 0],
        transition: { duration: durationFeatherAir, ease: 'linear' }
      });
    }
  };

  const handleReset = () => {
    HapticFeedback.selection();
    setHasDropped(false);
    ballControls.set({ y: 0, x: 0, rotate: 0 });
    featherControls.set({ y: 0, x: 0, rotate: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl">
      {/* 3D Lab Environment Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black pointer-events-none"></div>

      {/* Vacuum Particle Effects */}
      <AnimatePresence>
        {!isVacuum && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none overflow-hidden"
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: '-10%', y: Math.random() * 500 }}
                animate={{ x: '110%' }}
                transition={{ duration: Math.random() * 5 + 5, repeat: Infinity, ease: 'linear', delay: Math.random() * 5 }}
                className="absolute w-12 h-[1px] bg-white/10"
              ></motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-10 p-6 glass border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Activity className="text-blue-400" />
            Mécanique & Chute Libre
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-1">Niveau: 10ème / Lycée</p>
        </div>
        
        <div className="flex bg-black/20 p-1 rounded-xl glass border border-white/5 items-center">
          <Wind className={`mx-2 ${isVacuum ? 'text-slate-600' : 'text-blue-400 animate-pulse'}`} size={16} />
          <button
            onClick={() => {
              if (hasDropped) handleReset();
              HapticFeedback.selection();
              setIsVacuum(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isVacuum ? 'bg-blue-500 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'}`}
          >
            Air Ambiant 🌬️
          </button>
          <button
            onClick={() => {
              if (hasDropped) handleReset();
              HapticFeedback.selection();
              setIsVacuum(true);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isVacuum ? 'bg-blue-500 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'}`}
          >
            Le Vide Absolu 🌌
          </button>
        </div>
      </div>

      {/* Interactive Physics Canvas */}
      <div className="relative flex-1 flex flex-col items-center p-8 overflow-hidden">
        
        <div className="relative w-full max-w-sm h-full mt-4 flex justify-around">
          
          {/* Iron Ball Track */}
          <div className="w-24 h-full border-x border-white/5 border-dashed flex justify-center relative">
            <motion.div 
              animate={ballControls}
              className="absolute top-10 w-16 h-16 rounded-full bg-gradient-to-br from-slate-400 to-slate-800 shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.5),_0_10px_20px_rgba(0,0,0,0.5)] z-20"
            ></motion.div>
            <p className="absolute -bottom-8 font-black text-slate-500 tracking-widest text-xs uppercase">Boule de Fer</p>
          </div>

          {/* Feather Track */}
          <div className="w-24 h-full border-x border-white/5 border-dashed flex justify-center relative">
            <motion.div 
              animate={featherControls}
              className="absolute top-10 w-12 h-16 z-20 flex justify-center"
            >
              {/* Simple SVg Feather */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-white drop-shadow-lg">
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                <line x1="16" y1="8" x2="2" y2="22"></line>
                <line x1="17.5" y1="15" x2="9" y2="15"></line>
              </svg>
            </motion.div>
            <p className="absolute -bottom-8 font-black text-slate-500 tracking-widest text-xs uppercase">Plume</p>
          </div>

          {/* Ground */}
          <div className="absolute bottom-[20%] left-0 right-0 h-4 bg-slate-800 rounded-t border-t-2 border-white/20 z-10"></div>
        </div>

        {/* Drop Button */}
        <div className="absolute top-1/2 -right-4 md:right-10 -translate-y-1/2">
           {!hasDropped ? (
             <button
                onClick={handleDrop}
                className="bg-red-500 text-white font-black px-6 py-6 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-110 active:scale-95 transition-all text-xl"
             >
               LÂCHER !
             </button>
           ) : (
             <button
                onClick={handleReset}
                className="bg-slate-700 text-white font-black p-4 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
             >
               <RotateCcw size={32} />
             </button>
           )}
        </div>

      </div>

      {/* Scientific Explanation Panel */}
      <AnimatePresence>
        {hasDropped && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-30 m-6 p-6 rounded-3xl bg-slate-900/80 border border-blue-500/30 backdrop-blur-xl shadow-glow-blue max-w-4xl mx-auto"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-blue-400">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-wider">La Gravité Universelle</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-center text-lg md:text-xl font-bold text-white tracking-widest shadow-inner">
                g = 9.81 m/s²
              </div>
              
              <div className="flex items-start gap-4 bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20">
                <Info className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 font-medium leading-relaxed">
                  {isVacuum ? (
                    <>Dans <strong>le vide</strong>, il n'y a pas d'air pour freiner les objets. La Force de Gravité s'applique de manière égale sur toutes les masses. La Plume et le Boulet de fer tombent exactement à la même vitesse ! Galilée avait raison.</>
                  ) : (
                    <>Dans <strong>l'air</strong>, la plume subit une forte résistance de l'air de par sa grande surface comparée à son faible poids, ce qui ralentit sa chute. La boule de fer, très dense, traverse l'air beaucoup plus facilement.</>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
