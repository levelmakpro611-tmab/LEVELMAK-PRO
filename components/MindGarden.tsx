import React, { useEffect, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { Sprout, Droplets, Leaf, Sparkles } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';
import { POTIONS } from '../constants';
import { GardenPlant } from '../types';

export const MindGarden: React.FC = () => {
  const { user, waterGarden, addNotification } = useStore();
  const garden = user?.garden;
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);

  const waterCans = user?.consumables?.['water_can'] || 0;
  const fertilizers = user?.consumables?.['fertilizer'] || 0;

  // Render different system emojis for plants based on growth stage to prevent broken network URLs
  const renderPlant = (plant: GardenPlant) => {
    const { type, state, growthStage } = plant;
    const isSad = state !== 'healthy';
    const filter = isSad ? 'grayscale(50%) sepia(50%) hue-rotate(-30deg) brightness(0.8)' : 'none';
    const opacity = state === 'dead' ? 0.3 : 1;

    let emoji = '🌱';
    let emojiClass = 'text-5xl';
    
    if (growthStage === 0) {
      // Graine
      emoji = '🌰';
      emojiClass = 'text-3xl mb-2';
    } else if (growthStage === 1) {
      // Petite pousse
      emoji = '🌱';
      emojiClass = 'text-4xl mb-1';
    } else if (growthStage >= 2) {
      const isAdult = growthStage >= 4;
      emojiClass = isAdult ? 'text-7xl mb-[-4px]' : 'text-5xl';
      
      if (type === 'flower') emoji = isAdult ? '🌸' : '🌹';
      else if (type === 'tree') emoji = isAdult ? '🌳' : '🌲';
      else if (type === 'cactus') emoji = '🌵';
      else if (type === 'bonsai') emoji = '🪴';
      else if (type === 'lotus') emoji = '🪷';
    }

    const isSelected = selectedPlant === plant.id;

    return (
      <div 
        className={`flex flex-col items-center justify-end h-32 w-24 transition-all duration-500 hover:scale-110 cursor-pointer relative ${isSad ? 'animate-pulse' : ''} ${isSelected ? 'scale-125 z-20' : ''}`}
        style={{ filter, opacity }}
        onClick={() => setSelectedPlant(isSelected ? null : plant.id)}
      >
        <span 
          className={`${emojiClass} select-none transition-all duration-500`}
          style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' }}
        >
          {emoji}
        </span>
        
        {/* Growth Progress Bar */}
        <div className="w-12 h-1 bg-black/20 rounded-full mt-2 overflow-hidden">
            <div 
                className="h-full bg-emerald-500 transition-all duration-1000" 
                style={{ width: `${(growthStage / 4) * 100}%` }}
            />
        </div>

        {isSad && (
          <div className="absolute -top-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
            <Droplets size={10} />
            Soif
          </div>
        )}

        {isSelected && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 bg-slate-800/90 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (waterCans > 0) {
                            HapticFeedback.success();
                            waterGarden(plant.id, 'water_can');
                        } else {
                            addNotification('info', 'Pas d\'eau !', 'Achète des bidons d\'eau dans la boutique.');
                        }
                    }}
                    className={`p-2 rounded-xl flex items-center gap-1 text-[10px] font-bold transition-all active:scale-90 ${waterCans > 0 ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                >
                    <Droplets size={12} /> {waterCans}
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (fertilizers > 0) {
                            HapticFeedback.success();
                            waterGarden(plant.id, 'fertilizer');
                        } else {
                            addNotification('info', 'Pas d\'engrais !', 'L\'engrais magique est dispo en boutique.');
                        }
                    }}
                    className={`p-2 rounded-xl flex items-center gap-1 text-[10px] font-bold transition-all active:scale-90 ${fertilizers > 0 ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                >
                    <Sparkles size={12} /> {fertilizers}
                </button>
            </div>
        )}
      </div>
    );
  };

  const getGardenStatus = () => {
    if (!garden || garden.plants.length === 0) return { title: "Ton jardin est vide", text: "Plante tes premières graines après un quiz.", color: "text-slate-700 dark:text-slate-400" };
    
    const needsWater = garden.plants.some(p => p.state !== 'healthy');
    if (needsWater) return { title: "Alerte sécheresse", text: "Utilise tes bidons d'eau pour sauver tes plantes !", color: "text-amber-600 dark:text-amber-500" };
    
    return { title: "Jardin luxuriant", text: "Tes plantes grandissent bien, continue de les chouchouter.", color: "text-emerald-700 dark:text-emerald-500" };
  };

  const status = getGardenStatus();

  return (
    <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 dark:from-green-900/20 dark:to-emerald-900/10 p-6 md:p-8 rounded-[2.5rem] border border-green-500/20 shadow-xl overflow-hidden relative group">
      {/* Decors */}
      <div className="absolute -bottom-10 -right-10 opacity-10">
        <Leaf size={150} className="text-emerald-500 rotate-45" />
      </div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Sprout className="text-emerald-500 dark:text-emerald-400" size={28} />
            Jardin de l'Esprit
          </h2>
          <p className={`text-sm font-bold mt-1 ${status.color}`}>{status.title} : <span className="text-slate-700 dark:text-slate-400 font-semibold">{status.text}</span></p>
        </div>
        
        <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-black flex items-center gap-2">
                <Droplets size={14} /> {waterCans}
            </div>
            <div className="px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-black flex items-center gap-2">
                <Sparkles size={14} /> {fertilizers}
            </div>
        </div>
      </div>

      <div className="mt-8 relative z-10">
        {!garden || garden.plants.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center border-2 border-dashed border-emerald-500/30 rounded-3xl bg-emerald-500/5">
            <Sprout size={48} className="text-emerald-600 dark:text-emerald-700 mb-2" />
            <p className="text-emerald-800 dark:text-emerald-200/60 font-black uppercase tracking-widest text-sm">Terre fertile</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-end min-h-[160px] bg-gradient-to-t from-emerald-950/40 to-transparent p-6 rounded-3xl border-b-[8px] border-emerald-900/40">
            {garden.plants.map(plant => (
              <div key={plant.id} className="relative">
                {renderPlant(plant)}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <p className="mt-4 text-[10px] text-slate-600 dark:text-slate-500 italic text-center font-medium">
          Clique sur une plante pour l'arroser ou utiliser de l'engrais.
      </p>
    </div>
  );
};
