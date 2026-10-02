import React, { useEffect, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { Sprout, Droplets, Leaf, Sparkles, ShieldCheck, Bug } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';
import { POTIONS } from '../constants';
import { GardenPlant } from '../types';
import { resolveGarden, resolveConsumables } from '../services/gardenSyncService';

export const MindGarden: React.FC = () => {
  const { user, waterGarden, harvestPlant, addNotification, plantInGarden } = useStore();
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);

  const localGardenStr = user?.id ? localStorage.getItem(`levelmak_garden_${user.id}`) : null;
  const garden = resolveGarden(user?.garden, user?.stats?.garden, localGardenStr);

  const localConsumablesStr = user?.id ? localStorage.getItem(`levelmak_consumables_${user.id}`) : null;
  const consumables = resolveConsumables(user?.consumables, user?.stats?.consumables, localConsumablesStr);

  const waterCans = consumables.water_can || 0;
  const fertilizers = consumables.fertilizer || 0;
  const weedCures = consumables.weed_cure || 0;

  // Dynamic health based on lastWateredAt and pests:
  // - Pests: Root parasites attacking plant
  // - 0 to 24h: Healthy (Pleine forme)
  // - 24h to 48h: Thirsty (Avertissement soif 💧)
  // - 48h+: Withered (Fanée 🥀)
  const getPlantHealth = (plant: GardenPlant): 'healthy' | 'thirsty' | 'withered' | 'pests' | 'dead' => {
    if (plant.hasPests || plant.state === 'pests') return 'pests';
    const isAdult = (plant.quizzesContributed || 0) >= 10 || (plant.growthStage ?? 0) >= 4;
    if (isAdult) return 'healthy';

    if (plant.state === 'dead') return 'dead';
    if (!plant.lastWateredAt) return plant.state || 'healthy';
    const hoursSinceWater = (Date.now() - new Date(plant.lastWateredAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceWater > 96) return 'dead';
    if (hoursSinceWater > 48) return 'withered'; // Fanaison après 48h (2 jours sans activité)
    if (hoursSinceWater > 24) return 'thirsty';  // Soif après 24h (1 jour sans activité)
    return 'healthy';
  };

  // Render different system emojis for plants based on the 10-quiz growth progression
  const renderPlant = (plant: GardenPlant) => {
    const { type } = plant;
    const health = getPlantHealth(plant);
    
    let filter = 'none';
    if (health === 'pests') filter = 'sepia(60%) hue-rotate(80deg) contrast(1.1)';
    else if (health === 'thirsty') filter = 'sepia(30%) brightness(0.9)';
    else if (health === 'withered') filter = 'grayscale(60%) sepia(60%) hue-rotate(-30deg) brightness(0.75)';
    else if (health === 'dead') filter = 'grayscale(100%) opacity(0.4)';

    const quizzes = Math.min(10, Math.max(1, Math.round(plant.quizzesContributed || plant.growthStage || 1)));
    const isAdult = quizzes >= 10 || (plant.growthStage ?? 0) >= 4;

    let emoji = '🌱';
    let emojiClass = 'text-5xl';
    
    if (health === 'withered') {
      emoji = type === 'tree' ? '🍂' : '🥀';
      emojiClass = 'text-5xl mb-0';
    } else if (quizzes <= 2) {
      emoji = '🌱';
      emojiClass = 'text-3xl mb-1';
    } else if (quizzes <= 4) {
      if (type === 'flower') emoji = '🌿';
      else if (type === 'tree') emoji = '🌿';
      else if (type === 'cactus') emoji = '🌵';
      else if (type === 'bonsai') emoji = '🌿';
      else if (type === 'lotus') emoji = '🍃';
      emojiClass = 'text-4xl mb-1';
    } else if (quizzes <= 6) {
      if (type === 'flower') emoji = '🌷';
      else if (type === 'tree') emoji = '🌲';
      else if (type === 'cactus') emoji = '🌵';
      else if (type === 'bonsai') emoji = '🪴';
      else if (type === 'lotus') emoji = '🪷';
      emojiClass = 'text-5xl mb-0';
    } else if (quizzes <= 9) {
      if (type === 'flower') emoji = '🌺';
      else if (type === 'tree') emoji = '🌲';
      else if (type === 'cactus') emoji = '🌵';
      else if (type === 'bonsai') emoji = '🪴';
      else if (type === 'lotus') emoji = '🪷';
      emojiClass = 'text-6xl mb-[-2px]';
    } else {
      // 10 quizzes: Full mature bloom
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
        className={`flex flex-col items-center justify-end min-h-[160px] w-28 transition-all duration-500 hover:scale-105 cursor-pointer relative ${health === 'pests' || health === 'thirsty' || health === 'withered' ? 'animate-pulse' : ''} ${isSelected ? 'scale-115 z-20' : ''}`}
        style={{ filter }}
        onClick={() => {
          if (isAdult) {
            HapticFeedback.success();
            if (harvestPlant) {
              const res = harvestPlant(plant.id);
              addNotification(
                'success',
                'Récolte réussie ! 🌸',
                `Tu as cueilli ta fleur avec succès (+${res?.coins || 200} LevelCoins et +${res?.xp || 100} XP remportés) !`,
                '/assets/garden/flower_harvest.png'
              );
            }
            return;
          }
          setSelectedPlant(isSelected ? null : plant.id);
        }}
      >
        <span 
          className={`${emojiClass} select-none transition-all duration-500`}
          style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' }}
        >
          {emoji}
        </span>
        
        {/* Growth Progress Bar & Counter (10 Quizzes target) */}
        <div className="w-16 h-1.5 bg-black/30 dark:bg-white/10 rounded-full mt-2 overflow-hidden border border-white/5">
            <div 
                className={`h-full transition-all duration-1000 ${isAdult ? 'bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400' : health === 'pests' ? 'bg-rose-500' : health === 'withered' ? 'bg-amber-600' : 'bg-emerald-500'}`} 
                style={{ width: `${(quizzes / 10) * 100}%` }}
            />
        </div>
        <span className="text-[9px] font-black tracking-tight text-slate-700 dark:text-slate-300 mt-1 text-center">
          {isAdult ? '🌸 Prête à récolter' : health === 'pests' ? '🐛 Parasites aux racines' : health === 'withered' ? '🥀 Fanée' : `🌱 ${quizzes}/10 quiz`}
        </span>

        {/* Bouton de récolte quand la plante est adulte */}
        {isAdult && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              HapticFeedback.success();
              if (harvestPlant) {
                const res = harvestPlant(plant.id);
                addNotification(
                  'success',
                  'Récolte réussie ! 🌸',
                  `Tu as cueilli ta fleur avec succès (+${res?.coins || 200} LevelCoins et +${res?.xp || 100} XP remportés) !`,
                  '/assets/garden/flower_harvest.png'
                );
              }
            }}
            className="mt-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-emerald-400 text-white font-black text-[9px] rounded-full shadow-lg shadow-emerald-500/30 animate-bounce flex items-center gap-1 active:scale-90 transition-transform"
          >
            <span>🌾 Cueillir</span>
            <span className="text-[8px] bg-black/30 px-1 rounded-full">+200🪙</span>
          </button>
        )}

        {health === 'pests' && (
          <div className="absolute -top-4 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
            <Bug size={10} />
            Parasites !
          </div>
        )}

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
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200 z-30">
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
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (weedCures > 0) {
                            HapticFeedback.success();
                            waterGarden(plant.id, 'weed_cure');
                            addNotification(
                              'success',
                              'Parasites éradiqués ! 🐛',
                              'Les parasites ont été éliminés avec succès ! Les racines de ta plante sont désormais saines et protégées.',
                              '/assets/garden/garden_pest.png'
                            );
                        } else {
                            addNotification('info', 'Pas de soin anti-parasites !', 'Achète le Soin Désherbeur & Anti-Parasites dans la boutique.');
                        }
                    }}
                    className={`p-2 rounded-xl flex items-center gap-1 text-[10px] font-bold transition-all active:scale-90 ${weedCures > 0 ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-md' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                    title="Soin Désherbeur & Anti-Parasites (sauve les racines)"
                >
                    <ShieldCheck size={12} /> {weedCures}
                </button>
            </div>
        )}
      </div>
    );
  };

  const getGardenStatus = () => {
    if (!garden || garden.plants.length === 0) return { title: "Ton jardin est prêt", text: "Complète un quiz pour semer ta graine (10 quiz & soins requis).", color: "text-slate-700 dark:text-slate-400" };
    
    const hasPests = garden.plants.some(p => getPlantHealth(p) === 'pests');
    if (hasPests) return { title: "Alerte Ravageurs 🐛", text: "Des parasites attaquent les racines ! Utilise le soin désherbeur.", color: "text-rose-600 dark:text-rose-400" };

    const needsWater = garden.plants.some(p => getPlantHealth(p) === 'thirsty' || getPlantHealth(p) === 'withered');
    if (needsWater) return { title: "Alerte hydratation 💧", text: "Utilise tes bidons d'eau pour hydrater tes plantes !", color: "text-amber-600 dark:text-amber-500" };
    
    const hasAdult = garden.plants.some(p => (p.quizzesContributed || 0) >= 10 || (p.growthStage ?? 0) >= 4);
    if (hasAdult) return { title: "Récolte disponible 🌸", text: "Une plante est arrivée à pleine maturité ! Cueille-la pour tes récompenses.", color: "text-amber-500 dark:text-amber-400" };

    const growingCount = garden.plants.filter(p => (p.quizzesContributed || p.growthStage || 1) < 10).length;
    if (growingCount > 0) return { title: "Culture vivante en cours 🌱", text: "Chaque quiz et arrosage nourrit ta plante (10 quiz et soins sur 2 à 3 jours).", color: "text-emerald-700 dark:text-emerald-400" };

    return { title: "Jardin luxuriant ✨", text: "Toutes tes plantes sont splendides ! Lance un quiz pour en semer une nouvelle.", color: "text-emerald-700 dark:text-emerald-500" };
  };

  const status = getGardenStatus();

  return (
    <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 dark:from-green-900/20 dark:to-emerald-900/10 p-4 sm:p-6 md:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-green-500/20 shadow-xl overflow-hidden relative group">
      {/* Decors */}
      <div className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none">
        <Leaf size={150} className="text-emerald-500 rotate-45" />
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 relative z-10">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sprout className="text-emerald-500 dark:text-emerald-400" size={26} />
            Jardin de l'Esprit
          </h2>
          <p className={`text-xs sm:text-sm font-bold mt-1 ${status.color}`}>{status.title} : <span className="text-slate-700 dark:text-slate-400 font-semibold">{status.text}</span></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'shop' } }))}
              className="px-2.5 sm:px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/20 hover:bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              title="Acheter des bidons d'eau dans la Boutique"
            >
                <Droplets size={14} /> {waterCans}
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'shop' } }))}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              title="Acheter de l'engrais magique dans la Boutique"
            >
                <Sparkles size={14} /> {fertilizers}
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'shop' } }))}
              className="px-2.5 sm:px-3 py-1.5 bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20 rounded-xl border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              title="Acheter Soin Désherbeur & Anti-Parasites dans la Boutique"
            >
                <ShieldCheck size={14} /> {weedCures}
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
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  HapticFeedback.success();
                  plantInGarden('tree');
                  addNotification('success', 'Graine semée !', 'Ta première pousse est apparue ! Fais des quiz pour l\'arroser et la faire fleurir.');
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Sprout size={14} />
                <span>Semer ma graine</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!garden || garden.plants.length === 0) {
                    plantInGarden('tree');
                  }
                  window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'quiz' } }));
                }}
                className="px-3.5 py-2 bg-slate-900/10 dark:bg-white/10 hover:bg-slate-900/20 dark:hover:bg-white/20 text-slate-800 dark:text-white font-black text-xs rounded-xl border border-slate-300/80 dark:border-white/10 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>Lancer un Quiz</span>
              </button>
            </div>
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
