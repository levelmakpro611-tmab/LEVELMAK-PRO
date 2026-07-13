import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { RotateCcw, Info, Sparkles, ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react';
import { HapticFeedback } from '../../services/nativeAdapters';
import { useStore } from '../../hooks/useStore';
import {
  REAGENTS, PRESET_REACTIONS, FLASK_OPTIONS, VALID_BEAKERS_FOR, SUGGESTED_PAIRS,
  lookupCustomReaction, type Reagent, type ReactionResult,
} from '../../utils/chemistryData';

// ── SVG Flask (Erlenmeyer) ───────────────────────────────────
const FlaskSVG: React.FC<{ color: string; opacity: number; level: number; isPouring: boolean }> = ({ color, opacity, level, isPouring }) => {
  const liq = Math.max(0, Math.min(1, level));
  const top = 115 - liq * 90;
  return (
    <svg width="90" height="130" viewBox="0 0 90 130" overflow="visible">
      <defs>
        <clipPath id="fc"><path d="M32 3 L32 42 L6 102 Q4 118 45 120 Q86 118 84 102 L58 42 L58 3Z"/></clipPath>
        <linearGradient id="fgl" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35"/>
          <stop offset="40%" stopColor="white" stopOpacity="0.03"/>
          <stop offset="100%" stopColor="white" stopOpacity="0.12"/>
        </linearGradient>
      </defs>
      <rect x="-5" y={top} width="100" height="130" fill={`rgba(${color},${opacity})`} clipPath="url(#fc)"/>
      {liq > 0 && !isPouring && <ellipse cx="45" cy={top} rx="16" ry="3" fill="white" opacity="0.3" clipPath="url(#fc)"/>}
      <path d="M32 3 L32 42 L6 102 Q4 118 45 120 Q86 118 84 102 L58 42 L58 3Z" fill="rgba(200,222,255,0.07)" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5"/>
      <path d="M32 3 L32 42 L6 102 Q4 118 45 120 Q86 118 84 102 L58 42 L58 3Z" fill="url(#fgl)"/>
      <path d="M36 8 L36 44 L14 94" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" strokeLinecap="round"/>
      {[30,55,75].map((pct,i)=>{const y=115-pct/100*90;return(<g key={i}><line x1="60" y1={y} x2="68" y2={y} stroke="rgba(255,255,255,0.28)" strokeWidth="0.8"/><text x="70" y={y+3.5} fill="rgba(255,255,255,0.22)" fontSize="6" fontFamily="monospace">{pct}</text></g>);})}
      <rect x="31" y="1" width="28" height="5" fill="rgba(255,255,255,0.18)" rx="2"/>
      <ellipse cx="45" cy="3" rx="14" ry="2.5" fill="rgba(255,255,255,0.38)"/>
    </svg>
  );
};

// ── SVG Beaker ───────────────────────────────────────────────
const BeakerSVG: React.FC<{
  color:string; opacity:number; level:number;
  hasPrecipitate:boolean; precipColor:string;
  isReceiving:boolean; hasBubbles:boolean;
}>=({color,opacity,level,hasPrecipitate,precipColor,isReceiving,hasBubbles})=>{
  const liq=Math.max(0,Math.min(1,level));
  const top=135-liq*115;
  return(
    <svg width="120" height="155" viewBox="0 0 120 155" overflow="visible">
      <defs>
        <clipPath id="bc"><path d="M12 15 L12 135 Q12 148 24 148 L96 148 Q108 148 108 135 L108 15Z"/></clipPath>
        <linearGradient id="bgl" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0.28"/><stop offset="30%" stopColor="white" stopOpacity="0.02"/><stop offset="100%" stopColor="white" stopOpacity="0.09"/>
        </linearGradient>
      </defs>
      {liq>0&&<rect x="0" y={top} width="120" height="155" fill={`rgba(${color},${opacity})`} clipPath="url(#bc)"/>}
      {hasPrecipitate&&liq>0&&(
        <motion.rect initial={{height:0,opacity:0}} animate={{height:18,opacity:0.85}} transition={{delay:0.8,duration:0.5}}
          x="13" y="130" width="94" height="18" fill={precipColor} rx="2" clipPath="url(#bc)"/>
      )}
      {hasBubbles&&isReceiving&&[18,36,58,80].map((_,i)=>(
        <motion.circle key={`bubble-${i}`} cx={22+i*20} cy={140} r="3" fill="rgba(255,255,255,0.55)"
          animate={{cy:[140,top+15,top-5],opacity:[0,0.8,0]}}
          transition={{duration:1.1,repeat:Infinity,delay:i*0.22,ease:'easeOut'}} clipPath="url(#bc)"/>
      ))}
      {liq>0&&<motion.ellipse cx="60" cy={top} rx="44" ry="5" fill="white" opacity={0.16} clipPath="url(#bc)"
        animate={isReceiving?{rx:[44,50,44]}:{}} transition={{duration:0.4,repeat:Infinity}}/>}
      <path d="M12 15 L12 135 Q12 148 24 148 L96 148 Q108 148 108 135 L108 15Z" fill="rgba(200,222,255,0.05)" stroke="rgba(255,255,255,0.38)" strokeWidth="1.5"/>
      <path d="M12 15 L12 135 Q12 148 24 148 L96 148 Q108 148 108 135 L108 15Z" fill="url(#bgl)"/>
      <line x1="16" y1="20" x2="16" y2="140" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round"/>
      {[25,50,75].map((pct,i)=>{const y=135-pct/100*115;return(<g key={i}><line x1="14" y1={y} x2="28" y2={y} stroke="rgba(255,255,255,0.38)" strokeWidth="0.8"/><text x="30" y={y+3.5} fill="rgba(255,255,255,0.28)" fontSize="8" fontFamily="monospace">{pct*2.5|0}</text><text x="56" y={y+3.5} fill="rgba(255,255,255,0.12)" fontSize="6" fontFamily="monospace">mL</text></g>);})}
      <path d="M105 15 Q114 12 117 9" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="10" y="12" width="100" height="6" fill="rgba(255,255,255,0.13)" rx="2"/>
    </svg>
  );
};

// ── Reagent Chip (for custom picker) ────────────────────────
const ReagentChip: React.FC<{
  reagent: Reagent; selected: boolean; onClick: ()=>void;
}> = ({reagent,selected,onClick})=>(
  <motion.button
    onClick={onClick} whileTap={{scale:0.93}} whileHover={{scale:1.04}}
    className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border transition-all text-left ${
      selected
        ? 'border-blue-500 bg-blue-500/20 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:`rgba(${reagent.color},0.9)`}}/>
      <span className="text-[11px] font-black">{reagent.shortName ?? reagent.formula}</span>
    </div>
    {/* Reagent name is translated */}
    <span className="text-[9px] text-slate-500 leading-tight">
      {reagent.id ? (reagent.id === 'NaHCO3' ? 'Bicarbonate NaHCO₃' : reagent.name) : reagent.name}
    </span>
  </motion.button>
);

// ── MAIN COMPONENT ───────────────────────────────────────────
const TYPE_STYLES: Record<string,string> = {
  'acid-base':   'text-blue-400 bg-blue-500/10 border-blue-500/25',
  precipitation: 'text-gray-300 bg-white/5 border-white/15',
  redox:         'text-purple-400 bg-purple-500/10 border-purple-500/25',
  'metal-acid':  'text-orange-400 bg-orange-500/10 border-orange-500/25',
  'metal-base':  'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  decomposition: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
};

export const ChemistryTitration: React.FC = () => {
  const { t } = useStore();
  
  const TYPE_LABELS: Record<string,string> = {
    'acid-base': t('chemistry.types.acidBase'),
    'precipitation': t('chemistry.types.precipitation'),
    'redox': t('chemistry.types.redox'),
    'metal-acid': t('chemistry.types.metalAcid'),
    'metal-base': t('chemistry.types.metalBase'),
    'decomposition': t('chemistry.types.decomposition'),
  };

  const [mode, setMode] = useState<'preset'|'custom'>('preset');
  const [presetIdx, setPresetIdx] = useState(0);
  const [customFlaskId, setCustomFlaskId] = useState(FLASK_OPTIONS[0]);
  const [customBeakerId, setCustomBeakerId] = useState(VALID_BEAKERS_FOR[FLASK_OPTIONS[0]][0]);
  const [customTab, setCustomTab] = useState<'suggest'|'build'>('suggest');

  const [pourProgress, setPourProgress] = useState(0);
  const [isPouring, setIsPouring] = useState(false);
  const [showStream, setShowStream] = useState(false);
  const [hasReacted, setHasReacted] = useState(false);
  const controls = useAnimation();
  const animRef = useRef<number|null>(null);

  // Derive active flask/beaker/result depending on mode
  const preset = PRESET_REACTIONS[presetIdx];
  const activeFlask: Reagent = mode==='preset' ? preset.flask : REAGENTS[customFlaskId];
  const activeBeaker: Reagent = mode==='preset' ? preset.beaker : REAGENTS[customBeakerId];
  const activeResult: ReactionResult = mode==='preset'
    ? preset.result
    : lookupCustomReaction(customFlaskId, customBeakerId);
  
  const activeName = mode==='preset' 
    ? t(`chemistry.reactions.${preset.id}.name`)
    : `${t(`chemistry.reagents.${activeFlask.id}`)} + ${t(`chemistry.reagents.${activeBeaker.id}`)}`;
    
  const activeLevel = mode==='preset' ? preset.level : '';
  const activeType = mode==='preset' ? preset.type : 'acid-base';

  const flaskLevel = Math.max(0, 0.65 - pourProgress*0.65);
  const beakerLevel = pourProgress>0 ? Math.max(0.18, pourProgress*0.55) : 0.2;

  const reset = () => {
    if(animRef.current) cancelAnimationFrame(animRef.current);
    setHasReacted(false); setIsPouring(false); setShowStream(false); setPourProgress(0);
    controls.start({x:0,y:0,rotate:0});
  };
  useEffect(()=>{ reset(); },[presetIdx,customFlaskId,customBeakerId,mode]);

  const pour = async () => {
    if(hasReacted||isPouring) return;
    HapticFeedback.action();
    setIsPouring(true); setShowStream(true);
    await controls.start({rotate:-115,x:95,y:-55,transition:{type:'spring',stiffness:180,damping:22}});
    const start=Date.now(), dur=2200;
    const tick=()=>{
      const p=Math.min(1,(Date.now()-start)/dur);
      setPourProgress(p);
      if(p<1){ animRef.current=requestAnimationFrame(tick); }
      else {
        setShowStream(false); setHasReacted(true); setIsPouring(false);
        HapticFeedback.success();
        controls.start({rotate:0,x:0,y:0,transition:{type:'spring',stiffness:100,damping:18,delay:0.3}});
      }
    };
    animRef.current=requestAnimationFrame(tick);
  };

  const beakerColor = hasReacted ? activeResult.resultColor : activeBeaker.color;
  const beakerOpacity = hasReacted ? activeResult.resultOpacity : activeBeaker.opacity;

  return (
    <div className="flex flex-col h-full bg-[#080c18] rounded-3xl overflow-hidden relative border border-white/8 shadow-2xl select-none">

      {/* ── HEADER ── */}
      <div className="relative z-10 px-4 py-3 border-b border-white/8 bg-black/30 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          {/* Mode toggle */}
          <div className="flex bg-black/30 p-1 rounded-xl border border-white/8 gap-1">
            {(['preset','custom'] as const).map(m=>(
              <button key={m} onClick={()=>{HapticFeedback.selection();setMode(m);}}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${mode===m?'bg-blue-600 text-white':'text-slate-400 hover:text-white'}`}>
                {m==='preset' ? t('chemistry.modes.preset') : t('chemistry.modes.custom')}
              </button>
            ))}
          </div>

          {/* Preset navigation */}
          {mode==='preset'&&(
            <div className="flex items-center gap-2">
              <button onClick={()=>{HapticFeedback.selection();setPresetIdx(i=>(i-1+PRESET_REACTIONS.length)%PRESET_REACTIONS.length);}} className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg border border-white/8 transition-all"><ChevronLeft size={14}/></button>
              <span className="text-slate-500 text-[11px] font-mono font-bold">{presetIdx+1}/{PRESET_REACTIONS.length}</span>
              <button onClick={()=>{HapticFeedback.selection();setPresetIdx(i=>(i+1)%PRESET_REACTIONS.length);}} className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg border border-white/8 transition-all"><ChevronRight size={14}/></button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          {mode==='preset'&&<span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${TYPE_STYLES[activeType]}`}>{TYPE_LABELS[activeType]}</span>}
          {activeLevel&&<span className="text-[10px] text-slate-500 font-bold">{activeLevel}</span>}
        </div>
        <p className="text-sm font-black text-white mt-0.5 truncate">{activeName}</p>
      </div>

      {/* CUSTOM PICKER */}
      <AnimatePresence>
        {mode==='custom'&&!hasReacted&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            className="overflow-hidden border-b border-white/8 bg-slate-950/70 backdrop-blur-md z-20">
            <div className="p-3 space-y-2">
              {/* Sub-tabs */}
              <div className="flex gap-1 bg-black/30 p-0.5 rounded-xl border border-white/8">
                {(['suggest','build'] as const).map(tab=>(
                  <button key={tab} onClick={()=>{HapticFeedback.selection();setCustomTab(tab);}}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                      customTab===tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}>
                    {tab==='suggest' ? '✨ ' + t('chemistry.suggested') : '🔧 ' + t('chemistry.build')}
                  </button>
                ))}
              </div>
              {/* Suggestions */}
              {customTab==='suggest' && (
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
                  {SUGGESTED_PAIRS.map(pair=>{
                    const isActive = customFlaskId===pair.flaskId && customBeakerId===pair.beakerId;
                    return (
                      <motion.button key={pair.id} whileTap={{scale:0.95}}
                        onClick={()=>{HapticFeedback.selection();setCustomFlaskId(pair.flaskId);setCustomBeakerId(pair.beakerId);}}
                        className={`flex flex-col items-start gap-0.5 p-2 rounded-xl border text-left transition-all ${
                          isActive ? 'border-blue-500 bg-blue-500/15' : 'border-white/8 bg-white/4 hover:border-white/20'
                        }`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{pair.emoji}</span>
                          <span className="text-[10px] font-black text-white leading-tight">{t(`chemistry.reactions.${pair.id}.name`)}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 leading-tight">{t(`chemistry.reactions.${pair.id}.observable`)}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
              {/* Build your own */}
              {customTab==='build' && (
                <div className="space-y-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1.5">
                      {t('chemistry.labels.flask')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {FLASK_OPTIONS.map(id=>(
                        <ReagentChip key={id} reagent={REAGENTS[id]} selected={customFlaskId===id}
                          onClick={()=>{
                            HapticFeedback.selection();
                            setCustomFlaskId(id);
                            const valid = VALID_BEAKERS_FOR[id] ?? [];
                            if (!valid.includes(customBeakerId)) setCustomBeakerId(valid[0] ?? customBeakerId);
                          }}/>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1.5">
                      {t('chemistry.labels.beaker')} — {t('chemistry.compatibleWith', { formula: REAGENTS[customFlaskId]?.formula })}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(VALID_BEAKERS_FOR[customFlaskId] ?? []).map(id=>(
                        <ReagentChip key={id} reagent={REAGENTS[id]} selected={customBeakerId===id}
                          onClick={()=>{HapticFeedback.selection();setCustomBeakerId(id);}}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LAB SCENE ── */}
      <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1322] via-[#08091a] to-[#060810] pointer-events-none"/>

        {/* Instruction */}
        <AnimatePresence>
          {!hasReacted&&!isPouring&&(
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
              <div className="bg-amber-500/15 border border-amber-500/35 text-amber-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"/>
                {t('chemistry.instruction')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glassware */}
        <div className="relative flex-1 flex items-end justify-center z-10 pb-0">
          {/* Table surface */}
          <div className="absolute bottom-0 left-0 right-0 h-24 z-0">
            <div className="absolute bottom-20 left-0 right-0 h-10"
              style={{background:'linear-gradient(180deg,#2a2115 0%,#1e1a0f 50%,#191609 100%)',boxShadow:'0 -1px 20px rgba(0,0,0,0.9)'}}>
              {[12,28,48,68,88].map(p=><div key={p} className="absolute top-1 bottom-1 w-px opacity-15" style={{left:`${p}%`,background:'rgba(220,170,80,0.4)'}}/>)}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent"/>
            </div>
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-72 h-9 rounded-sm" style={{background:'linear-gradient(180deg,#0f0f0f 0%,#080808 100%)',boxShadow:'0 2px 8px rgba(0,0,0,0.7)'}}>
              <div className="absolute inset-1 opacity-15 grid grid-cols-12">
                {Array.from({length:12}).map((_,i)=><div key={i} className="border-r border-white/20 h-full"/>)}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-20" style={{background:'linear-gradient(180deg,#130f06 0%,#0a0a05 100%)'}}/>
          </div>

          {/* Flask */}
          <div className="relative z-20 mb-20 mr-20">
            <motion.div animate={controls} style={{transformOrigin:'45px 3px'}} whileHover={!isPouring&&!hasReacted?{scale:1.03}:{}}>
              <FlaskSVG color={activeFlask.color} opacity={activeFlask.opacity} level={flaskLevel} isPouring={isPouring}/>
            </motion.div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="bg-slate-900/90 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-mono font-bold text-slate-300">{activeFlask.formula}</div>
            </div>

            {/* Pour stream */}
            <AnimatePresence>
              {showStream&&(
                <motion.svg initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  className="absolute pointer-events-none z-50" style={{top:'-10px',left:'30px',overflow:'visible'}} width="200" height="160" viewBox="0 0 200 160">
                  <motion.path d="M 12 5 Q 75 55 128 88 Q 155 103 150 128"
                    fill="none" stroke={`rgba(${activeFlask.color},0.85)`} strokeWidth="5" strokeLinecap="round"
                    initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:0.35,ease:'easeIn'}}/>
                  {[0,1,2].map(i=>(
                    <motion.circle key={i} r="3.5" fill={`rgba(${activeFlask.color},0.8)`}
                      animate={{cx:[12,75,128,150],cy:[5,55,88,128],opacity:[0,1,1,0]}}
                      transition={{duration:0.48,repeat:Infinity,delay:i*0.15,ease:'easeIn'}}/>
                  ))}
                </motion.svg>
              )}
            </AnimatePresence>
          </div>

          {/* Beaker */}
          <div className="relative z-10 mb-20 ml-10">
            <BeakerSVG
              color={beakerColor} opacity={beakerOpacity} level={beakerLevel}
              hasPrecipitate={hasReacted&&!!activeResult.hasPrecipitate}
              precipColor={activeResult.precipitateColor??'#fff'}
              isReceiving={isPouring} hasBubbles={isPouring&&activeResult.hasBubbles}
            />
            {activeResult.hasBubbles&&isPouring&&activeResult.bubbleLabel&&(
              <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800/90 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-blue-300">
                ↑ {activeResult.bubbleLabel}
              </motion.div>
            )}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="bg-slate-900/90 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-mono font-bold text-slate-300">{activeBeaker.formula}</div>
            </div>
          </div>
        </div>

        {/* Pour button */}
        {!hasReacted&&(
          <div className="relative z-20 flex justify-center pb-4">
            <motion.button onClick={pour} disabled={isPouring}
              whileHover={!isPouring?{scale:1.05}:{}} whileTap={!isPouring?{scale:0.95}:{}}
              className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-all ${
                isPouring?'bg-slate-700 text-slate-400 cursor-not-allowed'
                :'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]'
              }`}>
              {isPouring 
                ? <span className="flex items-center gap-2"><motion.span animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}}>💧</motion.span>{t('chemistry.pouring')}</span> 
                : '⚗️ ' + t('chemistry.pour')}
            </motion.button>
          </div>
        )}
      </div>

      {/* ── RESULT PANEL ── */}
      <AnimatePresence>
        {hasReacted&&(
          <motion.div initial={{opacity:0,y:35}} animate={{opacity:1,y:0}} transition={{type:'spring',stiffness:220,damping:24}}
            className="relative z-20 border-t border-white/8 bg-slate-950/90 backdrop-blur-xl max-h-[55%] overflow-y-auto">
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/25">
                  <Sparkles size={16} className="text-emerald-400"/>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-emerald-500">{t('chemistry.complete')} ✓</p>
                  <p className="text-white font-bold text-xs mt-0.5">
                    {mode==='preset' ? t(`chemistry.reactions.${preset.id}.observable`) : activeResult.observable}
                  </p>
                </div>
              </div>
              <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-white/5">
                <RotateCcw size={13}/>{t('chemistry.restart')}
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              <div className="bg-black/60 border border-white/8 rounded-2xl p-3 font-mono text-center text-white tracking-wide text-xs md:text-sm">
                {activeResult.fullEquation}
              </div>
              {activeResult.hasPrecipitate&&activeResult.precipitateLabel&&(
                <p className="text-center text-xs text-gray-300 font-bold">↓ {activeResult.precipitateLabel}</p>
              )}
              <div className="flex items-start gap-3 bg-blue-500/8 p-3 rounded-2xl border border-blue-500/15">
                <Info size={14} className="text-blue-400 shrink-0 mt-0.5"/>
                <p className="text-slate-300 text-xs font-medium leading-relaxed">
                  {mode==='preset' ? t(`chemistry.reactions.${preset.id}.explanation`) : activeResult.explanation}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(mode==='preset' ? (t(`chemistry.reactions.${preset.id}.keyFacts`, { returnObjects: true }) as string[]) : activeResult.keyFacts).map((fact,i)=>(
                  <div key={`fact-${i}`} className="flex items-start gap-1.5 bg-slate-900/60 border border-white/5 rounded-xl p-2.5">
                    <span className="text-emerald-500 font-black text-xs shrink-0">✓</span>
                    <span className="text-slate-400 text-[10px] font-medium leading-relaxed">{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
