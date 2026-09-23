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

  // Calculate dynamic health based on lastWateredAt (24h thirst, 72h withered)
  const getPlantHealth = (plant: GardenPlant): 'healthy' | 'thirsty' | 'withered' | 'dead' => {
    if (plant.state === 'dead') return 'dead';
    if (!plant.lastWateredAt) return plant.state || 'healthy';
    const hoursSinceWater = (Date.now() - new Date(plant.lastWateredAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceWater > 72) return 'withered';
    if (hoursSinceWater > 24) return 'thirsty';
    return 'healthy';
  };

  // Render different system emojis for plants based on the 5-quiz growth progression
  const renderPlant = (plant: GardenPlant) => {
    const { type } = plant;
    const health = getPlantHealth(plant);
    const isSad = health === 'thirsty' || health === 'withered' || health === 'dead';
    
    let filter = 'none';
    if (health === 'thirsty') filter = 'sepia(30%) brightness(0.9)';
    else if (health === 'withered') filter = 'grayscale(60%) sepia(60%) hue-rotate(-30deg) brightness(0.75)';
    else if (health === 'dead') filter = 'grayscale(100%) opacity(0.4)';

    const quizzes = Math.min(5, Math.max(1, Math.round(plant.quizzesContributed || plant.growthStage || 1)));
    const isAdult = quizzes >= 5 || (plant.growthStage ?? 0) >= 4;

    let emoji = '🌱';
    let emojiClass = 'text-5xl';
    
    if (quizzes === 1) {
      emoji = '🌱';
      emojiClass = 'text-3xl mb-1';
    } else if (quizzes === 2) {
      if (type === 'flower') emoji = '🌿';
      else if (type === 'tree') emoji = '🌿';
      else if (type === 'cactus') emoji = '🌵';
      else if (type === 'bonsai') emoji = '🌿';
      else if (type === 'lotus') emoji = '🍃';
      emojiClass = 'text-4xl mb-1';
    } else if (quizzes === 3) {
      if (type === 'flower') emoji = '🌷';
      else if (type === 'tree') emoji = '🌲';
      else if (type === 'cactus') emoji = '🌵';
      else if (type === 'bonsai') emoji = '🪴';
      else if (type === 'lotus') emoji = '🪷';
      emojiClass = 'text-5xl mb-0';
    } else if (quizzes === 4) {
      if (type === 'flower') emoji = '🌺';
      else if (type === 'tree') emoji = '🌲';
      else if (type === 'cactus') emoji = '🌵';
      else if (type === 'bonsai') emoji = '🪴';
      else if (type === 'lotus') emoji = '🪷';
      emojiClass = 'text-6xl mb-[-2px]';
    } else {
      // 5 quizzes: Full mature bloom
      if (type === 'flower') emoji = '🌸';
      else if (type === 'tree') emoji = '🌳';
      else if (type === 'cactus') emoji = '🏜️';
      else if (type === 'bonsai') emoji = '🪴';
      else if (type === 'lotus') emoji = '🪷';
      emojiClass = 'text-7xl mb-[-4px]';
    }

    const isSelected = selectedPlant === plant.id;

    return (
      <div 
        className={`flex flex-col items-center justify-end h-36 w-24 transition-all duration-500 hover:scale-110 cursor-pointer relative ${health === 'thirsty' || health === 'withered' ? 'animate-pulse' : ''} ${isSelected ? 'scale-125 z-20' : ''}`}
        style={{ filter }}
        onClick={() => setSelectedPlant(isSelected ? null : plant.id)}
      >
        <span 
          className={`${emojiClass} select-none transition-all duration-500`}
          style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' }}
        >
          {emoji}
        </span>
        
        {/* Growth Progress Bar & Counter (5 Quizzes target) */}
        <div className="w-14 h-1.5 bg-black/30 dark:bg-white/10 rounded-full mt-2 overflow-hidden border border-white/5">
            <div 
                className={`h-full transition-all duration-1000 ${isAdult ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-emerald-500'}`} 
                style={{ width: `${(quizzes / 5) * 100}%` }}
            />
        </div>
        <span className="text-[9px] font-black tracking-tight text-slate-600 dark:text-slate-400 mt-1">
          {isAdult ? '🌸 5/5 Adulte' : `🌱 ${quizzes}/5 quiz`}
        </span>

        {health === 'thirsty' && (
          <div className="absolute -top-4 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
            <Droplets size={10} />
            Soif
          </div>
        )}

        {health === 'withered' && (
          <div className="absolute -top-4 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
            <Droplets size={10} />
            Flétrie !
          </div>
        )}

        {health === 'dead' && (
          <div className="absolute -top-4 bg-slate-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
            Morte 💀
          </div>
        )}

        {isSelected && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 bg-slate-800/95 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
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
                    className={`p-2 rounded-xl flex items-center gap-1 text-[10px] font-bold transition-all active:scale-90 ${waterCans > 0 ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-md' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                    title="Arroser (+0.5 progression & réhydrate)"
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
                    className={`p-2 rounded-xl flex items-center gap-1 text-[10px] font-bold transition-all active:scale-90 ${fertilizers > 0 ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-md' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                    title="Engrais magique (+1.5 progression)"
                >
                    <Sparkles size={12} /> {fertilizers}
                </button>
            </div>
        )}
      </div>
    );
  };

  const getGardenStatus = () => {
    if (!garden || garden.plants.length === 0) return { title: "Ton jardin est vide", text: "Plante tes premières graines après un quiz (5 quiz par plante fleurie).", color: "text-slate-700 dark:text-slate-400" };
    
    const needsWater = garden.plants.some(p => getPlantHealth(p) === 'thirsty' || getPlantHealth(p) === 'withered');
    if (needsWater) return { title: "Alerte hydratation", text: "Utilise tes bidons d'eau pour sauver tes plantes !", color: "text-amber-600 dark:text-amber-500" };
    
    const growingCount = garden.plants.filter(p => (p.quizzesContributed || p.growthStage || 1) < 5).length;
    if (growingCount > 0) return { title: "Culture en cours", text: "Chaque quiz nourrit ta plante (5 quiz nécessaires pour la faire fleurir) !", color: "text-emerald-700 dark:text-emerald-400" };

    return { title: "Jardin luxuriant", text: "Toutes tes plantes sont splendides ! Lance un quiz pour en semer une nouvelle.", color: "text-emerald-700 dark:text-emerald-500" };
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
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'shop' } }))}
              className="px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/20 hover:bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-black flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              title="Acheter des bidons d'eau dans la Boutique"
            >
                <Droplets size={14} /> {waterCans}
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'shop' } }))}
              className="px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-black flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              title="Acheter de l'engrais magique dans la Boutique"
            >
                <Sparkles size={14} /> {fertilizers}
            </button>
        </div>
      </div>

      <div className="mt-8 relative z-10">
        {!garden || garden.plants.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center border-2 border-dashed border-emerald-500/30 rounded-3xl bg-emerald-500/5 p-4 space-y-2.5">
            <Sprout size={36} className="text-emerald-500 animate-bounce" />
            <div>
              <p className="text-emerald-700 dark:text-emerald-300 font-black uppercase tracking-wider text-xs">Terre fertile prête à semer</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Complète un quiz pour faire pousser ta première plante !</p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'quiz' } }))}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Sprout size={14} />
              <span>🌱 Lancer un Quiz pour planter</span>
            </button>
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
