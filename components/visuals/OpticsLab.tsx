import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, RotateCcw, Info, Sparkles, AlertTriangle } from 'lucide-react';
import { HapticFeedback } from '../../services/nativeAdapters';

export const OpticsLab: React.FC = () => {
  const [angle1, setAngle1] = useState(45); // Angle of incidence
  const [medium2, setMedium2] = useState<'water' | 'glass'>('water');
  
  // Refractive indices
  const n1 = 1.0; // Air
  const n2 = medium2 === 'water' ? 1.33 : 1.5; // Water or Glass
  
  // Calculate refraction (Snell-Descartes: n1*sin(a1) = n2*sin(a2))
  const rad1 = (angle1 * Math.PI) / 180;
  let rad2 = Math.asin((n1 * Math.sin(rad1)) / n2);
  const angle2 = (rad2 * 180) / Math.PI;

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl">
      {/* 3D Lab Environment Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111827] to-[#0a0f1d] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 p-6 glass border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Layers className="text-fuchsia-400" />
            Optique & Réfraction
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-1">Niveau: 11ème / Lycée</p>
        </div>
        
        <div className="flex bg-black/20 p-1 rounded-xl glass border border-white/5">
          <button
            onClick={() => {
              HapticFeedback.selection();
              setMedium2('water');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${medium2 === 'water' ? 'bg-fuchsia-500 text-white shadow-glow-fuchsia' : 'text-slate-400 hover:text-white'}`}
          >
            Eau (n=1.33)
          </button>
          <button
            onClick={() => {
              HapticFeedback.selection();
              setMedium2('glass');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${medium2 === 'glass' ? 'bg-fuchsia-500 text-white shadow-glow-fuchsia' : 'text-slate-400 hover:text-white'}`}
          >
            Verre (n=1.5)
          </button>
        </div>
      </div>

      {/* Interactive Physics Canvas */}
      <div className="relative flex-1 flex flex-col items-center p-8 overflow-hidden">
        
        <div className="relative w-full max-w-xl h-[400px] mt-10 rounded-2xl border border-white/10 flex flex-col shadow-inner overflow-hidden">
          {/* Top Medium (Air) */}
          <div className="flex-1 bg-slate-900/50 relative flex items-center justify-center">
            <p className="absolute top-4 left-4 font-black tracking-widest text-slate-500 uppercase text-sm">Milieu 1 : Air (n=1.0)</p>
          </div>
          
          {/* Bottom Medium (Water/Glass) */}
          <div className={`flex-1 relative flex items-center justify-center transition-colors duration-500 ${medium2 === 'water' ? 'bg-blue-500/20' : 'bg-white/10 backdrop-blur-md'}`}>
            <p className="absolute bottom-4 left-4 font-black tracking-widest text-white/50 uppercase text-sm">
              Milieu 2 : {medium2 === 'water' ? 'Eau (n=1.33)' : 'Verre (n=1.5)'}
            </p>
          </div>
          
          {/* Normal Line (Perpendicular) */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/20 border-l border-dashed border-white/40"></div>
          
          {/* The Interface Line */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-blue-400/50 shadow-[0_0_10px_#60a5fa]"></div>

          {/* Laser Source (Draggable Angle) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg width="100%" height="100%" className="overflow-visible">
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Angle Arcs */}
              <path d={`M 260 200 A 40 40 0 0 1 ${300 - 40 * Math.sin(rad1)} ${200 - 40 * Math.cos(rad1)}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="4"/>
              
              <text x="240" y="160" fill="white" fontSize="12" fontWeight="bold">i = {angle1.toFixed(1)}°</text>
              <text x="320" y="250" fill="white" fontSize="12" fontWeight="bold">r = {angle2.toFixed(1)}°</text>

              <g transform={`translate(300, 200)`}>
                {/* Incident Ray */}
                <line 
                  x1="0" y1="0" 
                  x2={-200 * Math.sin(rad1)} 
                  y2={-200 * Math.cos(rad1)} 
                  stroke="#ef4444" strokeWidth="4" filter="url(#glow)"
                  className="transition-all duration-100"
                />
                
                {/* Refracted Ray */}
                <line 
                  x1="0" y1="0" 
                  x2={200 * Math.sin(rad2)} 
                  y2={200 * Math.cos(rad2)} 
                  stroke="#ef4444" strokeWidth="4" filter="url(#glow)" strokeOpacity="0.8"
                  className="transition-all duration-100"
                />
              </g>
            </svg>

            {/* Draggable Laser Gun */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-40 h-8 -ml-20 -mt-4 origin-right pointer-events-auto cursor-ns-resize"
              style={{ rotate: -90 - angle1 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              onDrag={(e, info) => {
                // Adjust angle based on drag
                let newAngle = angle1 + info.delta.y * -0.5;
                if (newAngle < 5) newAngle = 5;
                if (newAngle > 85) newAngle = 85;
                setAngle1(newAngle);
              }}
            >
               <div className="absolute left-0 w-16 h-8 bg-slate-800 rounded-l-xl border-y border-l border-slate-600 flex items-center justify-center">
                 <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]"></div>
               </div>
            </motion.div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 text-center px-4 max-w-sm">
          <p className="text-white/40 text-xs font-bold uppercase mb-2">Instructions</p>
          <p className="text-white/80 font-medium">Faites glisser la jauge ou le laser (de haut en bas) pour modifier l'angle d'incidence et observer la déviation du rayon lumineux.</p>
        </div>

      </div>

      {/* Scientific Explanation Panel */}
      <div className="relative z-20 m-6 p-6 rounded-3xl bg-slate-900/80 border border-fuchsia-500/30 backdrop-blur-xl shadow-glow-fuchsia max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3 text-fuchsia-400">
            <div className="p-2 bg-fuchsia-500/20 rounded-xl">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider">Loi de Descartes</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-center text-lg md:text-xl font-bold text-white tracking-widest shadow-inner">
            n₁ · sin(i) = n₂ · sin(r)
          </div>
          
          <div className="flex items-start gap-4 bg-fuchsia-500/10 p-5 rounded-2xl border border-fuchsia-500/20">
            <Info className="text-fuchsia-400 shrink-0 mt-0.5" />
            <p className="text-slate-300 font-medium leading-relaxed">
              Lorsque le rayon laser passe de l'air (milieu moins dense) à l'eau ou au verre (milieu plus dense), sa vitesse diminue. 
              Cela provoque une <strong>cassure (réfraction)</strong> de la lumière. Elle se rapproche de la normale (l'axe vertical pointillé).
              Testez avec le verre pour voir que la cassure est encore plus forte (puisque n=1.5 {'>'} n=1.33).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
