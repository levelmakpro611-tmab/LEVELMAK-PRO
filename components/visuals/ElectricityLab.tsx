import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Zap, RotateCcw, Info, Sparkles, AlertTriangle, Play, Pause } from 'lucide-react';
import { HapticFeedback } from '../../services/nativeAdapters';

export const ElectricityLab: React.FC = () => {
  const [isPlugged, setIsPlugged] = useState(false);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [voltage, setVoltage] = useState(9); // 9V battery
  
  // Connectors points
  const positiveTerminalRef = useRef<HTMLDivElement>(null);
  const negativeTerminalRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (event: any, info: any, type: 'positive' | 'negative') => {
    // Simplified logic: If the dragged cable falls near the center bulb area, we consider it connected
    // For a real app we'd calculate distance, but here we just check generic Y drop height
    if (info.point.y < 350) {
      HapticFeedback.success();
      setIsPlugged(true);
    } else {
      HapticFeedback.error();
    }
  };

  useEffect(() => {
    if (isPlugged && isPowerOn) {
      // Setup loop for electron animation
      HapticFeedback.action();
    }
  }, [isPlugged, isPowerOn]);

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl">
      {/* 3D Lab Environment Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-[#030712] to-[#010308] pointer-events-none"></div>
      
      {/* Dynamic Glow from Bulb */}
      <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000 ${isPlugged && isPowerOn ? 'bg-amber-400/30' : 'bg-transparent'}`}></div>

      {/* Header */}
      <div className="relative z-10 p-6 glass border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Zap className="text-amber-400" />
            Électricité & Induction
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-1">Niveau: 10ème / Lycée</p>
        </div>
      </div>

      {/* 3D Interactive Canvas */}
      <div className="relative flex-1 flex items-center justify-center p-8 overflow-hidden">
        
        {/* Instruction Popup */}
        <AnimatePresence>
          {!isPlugged && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-10 flex flex-col items-center z-20"
            >
              <div className="bg-amber-500/20 border border-amber-500/50 text-amber-200 px-6 py-3 rounded-2xl backdrop-blur-md flex items-center gap-3 shadow-glow-amber">
                <AlertTriangle size={20} className="animate-pulse" />
                <span className="font-bold">Glissez la pince rouge vers l'ampoule pour fermer le circuit !</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative w-full max-w-2xl h-full flex flex-col items-center justify-center">
          
          {/* Bulb Assembly */}
          <div className="relative z-10 mb-20">
            {/* The Bulb Glass */}
            <motion.div 
              animate={{
                boxShadow: isPlugged && isPowerOn 
                  ? '0 0 50px 20px rgba(251, 191, 36, 0.4), inset 0 0 20px 5px rgba(251, 191, 36, 0.8)' 
                  : 'inset 0 0 10px rgba(255, 255, 255, 0.1)',
                backgroundColor: isPlugged && isPowerOn ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: isPlugged && isPowerOn ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.2)'
              }}
              className="w-24 h-24 rounded-full border-2 backdrop-blur-sm relative flex justify-center z-10"
            >
              {/* Filament inside */}
              <motion.div 
                animate={{
                  backgroundColor: isPlugged && isPowerOn ? '#f59e0b' : '#475569',
                  boxShadow: isPlugged && isPowerOn ? '0 0 15px 5px #f59e0b' : 'none'
                }}
                className="w-8 h-10 border-x-2 border-t-2 rounded-t-xl absolute bottom-2"
              ></motion.div>
            </motion.div>
            {/* Bulb Base */}
            <div className="w-16 h-12 bg-gradient-to-b from-slate-400 to-slate-600 rounded-b-xl mx-auto border-x-4 border-b-4 border-slate-700 flex flex-col justify-evenly">
              <div className="w-full h-1 bg-slate-800/50"></div>
              <div className="w-full h-1 bg-slate-800/50"></div>
              <div className="w-full h-1 bg-slate-800/50"></div>
            </div>
            
            {/* Receiving Node for positive wire */}
            <div className="absolute -right-10 bottom-0 w-8 h-8 rounded-full border-2 border-dashed border-red-500/50 animate-pulse flex items-center justify-center">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          </div>

          {/* Battery 9V */}
          <div className="absolute bottom-10 left-10 w-32 h-44 bg-slate-900 border-2 border-slate-700 shadow-2xl rounded-xl relative flex flex-col items-center">
            {/* Battery Terminals */}
            <div className="absolute -top-4 left-4 w-6 h-4 bg-slate-400 rounded-t-sm" ref={negativeTerminalRef}></div>
            <div className="absolute -top-6 right-4 w-6 h-6 bg-slate-400 border-4 border-slate-600 rounded-full flex items-center justify-center text-[10px] font-black" ref={positiveTerminalRef}>+</div>
            
            {/* Battery Body */}
            <div className="w-full flex-1 flex flex-col justify-center items-center relative overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent"></div>
              <p className="text-4xl text-amber-500 font-black z-10 italic">9V</p>
              <p className="text-slate-400 text-xs font-bold z-10">LEVELMAK ENERGY</p>
            </div>
            
            {/* Black fixed wire (Negative) -> Goes to Bulb */}
            <svg className="absolute top-0 left-6 -z-10 w-96 h-96 overflow-visible pointer-events-none">
              <path 
                d={`M 10 0 C 10 -150, 250 -150, 250 -230`} 
                stroke="#1e293b" strokeWidth="6" fill="none" 
              />
              {/* Animated Electrons for Negative wire */}
              {isPlugged && isPowerOn && (
                <circle r="4" fill="#60a5fa" filter="drop-shadow(0 0 4px #60a5fa)">
                   <animateMotion dur="2s" repeatCount="indefinite" path="M 10 0 C 10 -150, 250 -150, 250 -230" />
                </circle>
              )}
            </svg>

            {/* Red Draggable Wire (Positive) */}
            <div className="absolute -top-6 right-8">
              <motion.div
                drag={!isPlugged}
                dragMomentum={false}
                onDragEnd={(e, info) => handleDragEnd(e, info, 'positive')}
                initial={{ x: 30, y: -20 }}
                animate={isPlugged ? { x: 230, y: -230 } : {}}
                className="relative z-30 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
              >
                {/* Pince Crocodile (Alligator Clip) */}
                <div className="w-6 h-12 bg-red-600 rounded-full flex flex-col justify-between items-center shadow-lg border border-red-400">
                  <div className="w-8 h-2 bg-slate-300 mt-1 rounded-t-sm"></div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Switch (Interrupteur) */}
          <div className="absolute bottom-10 right-10 flex flex-col items-center gap-4">
            <button
              disabled={!isPlugged}
              onClick={() => {
                HapticFeedback.selection();
                setIsPowerOn(!isPowerOn);
              }}
              className={`w-24 h-32 rounded-2xl flex flex-col shadow-[0_10px_0_#94a3b8] active:shadow-[0_2px_0_#94a3b8] active:translate-y-2 transition-all p-2 ${!isPlugged ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-300'}`}
            >
               <div className={`flex-1 w-full rounded-xl transition-all duration-300 flex items-center justify-center ${isPowerOn ? 'bg-red-500 shadow-inner' : 'bg-green-500'}`}>
                  {isPowerOn ? <Pause className="text-white" /> : <Play className="text-white" />}
               </div>
               <div className="h-10 flex items-center justify-center text-slate-800 font-black text-sm">
                 {isPowerOn ? 'ÉTEINDRE' : 'ALLUMER'}
               </div>
            </button>
          </div>

        </div>
      </div>

      {/* Scientific Explanation Panel */}
      <AnimatePresence>
        {isPlugged && isPowerOn && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-20 m-6 p-6 rounded-3xl bg-slate-900/80 border border-amber-500/30 backdrop-blur-xl shadow-glow-amber max-w-4xl mx-auto"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-amber-400">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-wider">Loi d'Ohm & Courant</h3>
              </div>
              <button 
                onClick={() => {
                  HapticFeedback.selection();
                  setIsPlugged(false);
                  setIsPowerOn(false);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold"
              >
                <RotateCcw size={16} />
                Débrancher
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-wrap gap-4 justify-around text-center">
                <div>
                   <p className="text-slate-500 text-xs font-black uppercase">Tension (U)</p>
                   <p className="text-amber-500 text-2xl font-mono font-bold">9 Volts</p>
                </div>
                <div>
                   <p className="text-slate-500 text-xs font-black uppercase">Résistance (R)</p>
                   <p className="text-purple-500 text-2xl font-mono font-bold">15 Ω</p>
                </div>
                <div>
                   <p className="text-slate-500 text-xs font-black uppercase">Intensité (I=U/R)</p>
                   <p className="text-blue-500 text-2xl font-mono font-bold">0.6 A</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20">
                <Info className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 font-medium leading-relaxed">
                  Le courant électrique sort de la borne positive (+) de la pile et traverse le filament métallique de l'ampoule. 
                  En passant, les électrons rencontrent une forte résistance, ce qui fait chauffer le filament jusqu'à ce qu'il devienne incandescent et produise de la lumière. Le circuit est obligatoirement **fermé** pour que l'électricité circule.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
