import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, FlaskRound, Layers, Activity, Lock, ArrowLeft } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { HapticFeedback } from '../services/nativeAdapters';
import { ChemistryTitration } from '../components/visuals/ChemistryTitration';
import { ElectricityLab } from '../components/visuals/ElectricityLab';
import { OpticsLab } from '../components/visuals/OpticsLab';
import { MechanicsLab } from '../components/visuals/MechanicsLab';

export const ActiveVisual: React.FC = () => {
  const { t } = useStore();
  const [activeExperiment, setActiveExperiment] = useState<string | null>(null);

  const EXPERIMENTS = [
    {
      id: 'chemistry',
      title: t('activeVisual.experiments.chemistry.title'),
      category: t('activeVisual.experiments.chemistry.category'),
      icon: FlaskRound,
      color: 'bg-emerald-500',
      shadow: 'shadow-glow-emerald',
      description: t('activeVisual.experiments.chemistry.description'),
      locked: false,
    },
    {
      id: 'electricity',
      title: t('activeVisual.experiments.electricity.title'),
      category: t('activeVisual.experiments.electricity.category'),
      icon: Zap,
      color: 'bg-amber-500',
      shadow: 'shadow-glow-amber',
      description: t('activeVisual.experiments.electricity.description'),
      locked: false,
    },
    {
      id: 'optics',
      title: t('activeVisual.experiments.optics.title'),
      category: t('activeVisual.experiments.optics.category'),
      icon: Layers,
      color: 'bg-fuchsia-500',
      shadow: 'shadow-glow-fuchsia',
      description: t('activeVisual.experiments.optics.description'),
      locked: false,
    },
    {
      id: 'mechanics',
      title: t('activeVisual.experiments.mechanics.title'),
      category: t('activeVisual.experiments.mechanics.category'),
      icon: Activity,
      color: 'bg-blue-500',
      shadow: 'shadow-glow-blue',
      description: t('activeVisual.experiments.mechanics.description'),
      locked: false,
    }
  ];

  if (activeExperiment === 'chemistry') {
    return (
      <div className="h-full flex flex-col p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <button
          onClick={() => {
            HapticFeedback.selection();
            setActiveExperiment(null);
          }}
          className="flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-colors group w-fit"
        >
          <div className="p-2 bg-white/5 rounded-lg group-hover:bg-emerald-500/20">
            <ArrowLeft size={20} />
          </div>
          {t('activeVisual.backBtn')}
        </button>
        
        <div className="flex-1 min-h-[600px]">
          <ChemistryTitration />
        </div>
      </div>
    );
  }

  if (activeExperiment === 'electricity') {
    return (
      <div className="h-full flex flex-col p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <button
          onClick={() => {
            HapticFeedback.selection();
            setActiveExperiment(null);
          }}
          className="flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-colors group w-fit"
        >
          <div className="p-2 bg-white/5 rounded-lg group-hover:bg-amber-500/20">
            <ArrowLeft size={20} />
          </div>
          {t('activeVisual.backBtn')}
        </button>
        
        <div className="flex-1 min-h-[600px]">
          <ElectricityLab />
        </div>
      </div>
    );
  }

  if (activeExperiment === 'optics') {
    return (
      <div className="h-full flex flex-col p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <button
          onClick={() => {
            HapticFeedback.action();
            setActiveExperiment(null);
          }}
          className="flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-colors group w-fit"
        >
          <div className="p-2 bg-white/5 rounded-lg group-hover:bg-fuchsia-500/20">
            <ArrowLeft size={20} />
          </div>
          {t('activeVisual.backBtn')}
        </button>
        
        <div className="flex-1 min-h-[600px]">
          <OpticsLab />
        </div>
      </div>
    );
  }

  if (activeExperiment === 'mechanics') {
    return (
      <div className="h-full flex flex-col p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <button
          onClick={() => {
            HapticFeedback.action();
            setActiveExperiment(null);
          }}
          className="flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-colors group w-fit"
        >
          <div className="p-2 bg-white/5 rounded-lg group-hover:bg-blue-500/20">
            <ArrowLeft size={20} />
          </div>
          {t('activeVisual.backBtn')}
        </button>
        
        <div className="flex-1 min-h-[600px]">
          <MechanicsLab />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 font-bold text-sm tracking-widest mt-4">
          <Zap size={16} />
          {t('activeVisual.badge')}
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-center gap-4">
          {t('activeVisual.title')}
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl font-medium leading-relaxed">
          {t('activeVisual.desc')}
        </p>
      </div>

      {/* Hero Showcase (First Experiment) */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          HapticFeedback.action();
          setActiveExperiment('chemistry');
        }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0a0f1d] to-[#111827] border border-emerald-500/30 p-8 md:p-12 cursor-pointer group shadow-2xl"
      >
        <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-emerald-500/20 blur-[100px] rounded-full group-hover:bg-emerald-500/30 transition-colors"></div>
        
        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="p-4 bg-emerald-500/20 text-emerald-400 w-fit rounded-2xl">
              <FlaskRound size={40} />
            </div>
            <div>
              <p className="text-emerald-400 font-bold tracking-widest uppercase text-sm mb-2">{t('activeVisual.recommended')}</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">{t('activeVisual.experiments.chemistry.title')}</h2>
              <p className="text-slate-300 font-medium leading-relaxed text-lg">
                {t('activeVisual.experiments.chemistry.description')}
              </p>
            </div>
            <button className="bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl shadow-glow-emerald group-hover:scale-105 transition-transform">
              {t('activeVisual.launchExp')}
            </button>
          </div>
          
          <div className="hidden md:flex justify-center items-center relative h-64 pointer-events-none">
             {/* Mock visual of a beaker */}
             <div className="w-40 h-48 bg-white/5 border-2 border-emerald-500/30 rounded-b-3xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute bottom-0 w-full h-1/2 bg-emerald-500/30 blur-sm"></div>
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-emerald-400/40 rounded-full blur-xl"></div>
             </div>
             <motion.div 
               animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
               transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
               className="absolute top-0 right-10 w-20 h-24 bg-white/10 border border-white/20 rounded-b-2xl backdrop-blur-md shadow-xl"
             >
                <div className="absolute bottom-0 w-full h-1/3 bg-blue-500/40"></div>
             </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Grid of Other Experiments */}
      <div>
        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-6">{t('activeVisual.expList')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EXPERIMENTS.filter(e => e.id !== 'chemistry').map(exp => {
            const Icon = exp.icon;
            return (
              <div 
                key={exp.id} 
                className={`relative glass p-6 rounded-3xl border border-white/5 overflow-hidden group ${exp.locked ? 'opacity-80' : 'cursor-pointer hover:border-white/20 transition-all'}`}
                onClick={() => {
                  if (!exp.locked) {
                    HapticFeedback.action();
                    setActiveExperiment(exp.id);
                  }
                }}
              >
                {exp.locked && (
                  <div className="absolute top-4 right-4 p-2 bg-black/40 rounded-lg text-slate-500">
                    <Lock size={16} />
                  </div>
                )}
                <div className={`p-3 rounded-2xl ${exp.color} bg-opacity-20 text-${exp.color.split('-')[1]}-400 w-fit mb-4`}>
                  <Icon size={24} />
                </div>
                <p className="text-xs font-black uppercase text-slate-500 mb-1">{exp.category}</p>
                <h4 className="text-xl font-bold text-white mb-2">{exp.title}</h4>
                <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
                  {exp.description}
                </p>
                
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
