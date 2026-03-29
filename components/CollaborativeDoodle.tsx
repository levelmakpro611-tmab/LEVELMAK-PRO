import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Swords, Trophy, Timer as TimerIcon, Info, Coins, X, CheckCircle, Skull } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { HapticFeedback } from '../services/nativeAdapters';
import { supabase } from '../services/supabase';
import { BattleState } from '../types';

const GRID_SIZE = 16;

interface CollaborativeDoodleProps {
  battleState?: BattleState;
  isHost?: boolean;
  onClose?: () => void;
}

export const CollaborativeDoodle: React.FC<CollaborativeDoodleProps> = ({ 
  battleState, 
  isHost = false, 
  onClose 
}) => {
  const { user, resolveBattle } = useStore();
  const [battle, setBattle] = useState<BattleState | null>(battleState || null);
  const [grid, setGrid] = useState<string[]>(battleState?.grid || Array(GRID_SIZE * GRID_SIZE).fill('#ffffff'));
  const [timeLeft, setTimeLeft] = useState(battleState?.timeLeft || 180);
  const [scores, setScores] = useState({ host: 0, guest: 0 });
  const [channel, setChannel] = useState<any>(null);
  const [resolved, setResolved] = useState(false);

  // Colors
  const HOST_COLOR = '#FF0000'; // Brut Red (rouge rouge)
  const GUEST_COLOR = '#000000'; // Black/Bleu foncé as requested
  const myColor = isHost ? HOST_COLOR : GUEST_COLOR;

  // Turn logic
  const placedPixelsCount = grid.filter(c => c !== '#ffffff').length;
  const isHostTurn = placedPixelsCount % 2 === 0;
  const isMyTurn = isHost ? isHostTurn : !isHostTurn;

  // Sync with Supabase
  useEffect(() => {
    if (!battle) return;

    const doodleChannel = supabase.channel(`doodle_battle_${battle.id}`, {
      config: { broadcast: { self: false } }
    });

    doodleChannel
      .on('broadcast', { event: 'pixel_claim' }, ({ payload }) => {
        handleRemotePixel(payload);
      })
      .on('broadcast', { event: 'sync_state' }, ({ payload }) => {
        setScores(payload.scores);
        setGrid(payload.grid);
        setTimeLeft(payload.timeLeft);
        if (payload.status === 'finished') {
            setBattle(prev => prev ? { ...prev, status: 'finished', winnerId: payload.winnerId } : null);
        }
      })
      .subscribe();

    setChannel(doodleChannel);
    return () => { supabase.removeChannel(doodleChannel); };
  }, [battle?.id]);

  // Game Loop (Host Only)
  useEffect(() => {
    if (!isHost || !battle || battle.status !== 'active') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        
        // Broadcast sync periodically (every 2 seconds)
        if (prev % 2 === 0) {
            channel?.send({
                type: 'broadcast', event: 'sync_state', payload: { 
                    scores, grid, timeLeft: prev - 1, status: 'active' 
                }
            });
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isHost, battle?.status, scores, grid, channel]);

  const finishGame = () => {
    if (!isHost || !battle) return;
    const winnerId = scores.host > scores.guest ? battle.host.id : 
                     scores.guest > scores.host ? battle.guest.id : null;
    
    const finalState = { ...battle, status: 'finished' as const, winnerId };
    setBattle(finalState);
    channel?.send({
        type: 'broadcast', event: 'sync_state', payload: { 
            scores, grid, timeLeft: 0, status: 'finished', winnerId 
        }
    });
  };

  useEffect(() => {
    if (battle?.status === 'finished' && !resolved && user) {
        setResolved(true);
        const isDraw = !battle.winnerId;
        resolveBattle(battle.winnerId || '', isDraw);
        if (battle.winnerId === user.id) HapticFeedback.levelUp();
    }
  }, [battle?.status, battle?.winnerId, resolved, user, resolveBattle]);

  const handleRemotePixel = (payload: any) => {
      setGrid(prev => {
          const newGrid = [...prev];
          newGrid[payload.index] = payload.color;
          return newGrid;
      });
      setScores(payload.scores);
  };

  const checkAlignments = (currentGrid: string[], index: number, color: string) => {
    let points = 0;
    const x = index % GRID_SIZE;
    const y = Math.floor(index / GRID_SIZE);

    // Horizontal
    for (let i = -2; i <= 0; i++) {
        if (x + i >= 0 && x + i + 2 < GRID_SIZE) {
            if (currentGrid[index + i] === color && 
                currentGrid[index + i + 1] === color && 
                currentGrid[index + i + 2] === color) {
                points++;
            }
        }
    }
    // Vertical
    for (let i = -2; i <= 0; i++) {
        const startY = y + i;
        if (startY >= 0 && startY + 2 < GRID_SIZE) {
            const idx1 = startY * GRID_SIZE + x;
            const idx2 = (startY + 1) * GRID_SIZE + x;
            const idx3 = (startY + 2) * GRID_SIZE + x;
            if (currentGrid[idx1] === color && 
                currentGrid[idx2] === color && 
                currentGrid[idx3] === color) {
                points++;
            }
        }
    }
    return points;
  };

  const handlePixelClick = useCallback((index: number) => {
    if (!battle || battle.status !== 'active' || grid[index] !== '#ffffff') return;
    if (!isMyTurn) {
        // Not your turn
        HapticFeedback.error?.() || HapticFeedback.navigation();
        return;
    }
    
    HapticFeedback.navigation();
    
    // Update local state
    const newGrid = [...grid];
    newGrid[index] = myColor;
    const pointsGained = checkAlignments(newGrid, index, myColor);
    
    const newScores = { ...scores };
    if (isHost) newScores.host += pointsGained;
    else newScores.guest += pointsGained;

    setGrid(newGrid);
    setScores(newScores);

    // Broadcast update
    channel?.send({
      type: 'broadcast',
      event: 'pixel_claim',
      payload: { index, color: myColor, scores: newScores }
    });
  }, [battle, grid, scores, isHost, myColor, channel, isMyTurn]);

  if (!battle) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-premium overflow-hidden relative min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <Palette className="text-pink-500" size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-2">Bataille de Territoire</h2>
        <p className="text-slate-500 max-w-xs mb-8">
          Défie tes amis en temps réel sur cette fresque ! Aligne 3 points pour gagner.
        </p>
        <button 
          onClick={() => {
            const el = document.getElementById('world-map');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            else window.dispatchEvent(new CustomEvent('nav_change', { detail: 'dashboard' }));
          }}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform shadow-xl flex items-center gap-3"
        >
          <Swords size={18} />
          Trouver un adversaire
        </button>
      </div>
    );
  }

  if (battle.status === 'finished') {
    const isWinner = battle.winnerId === user?.id;
    const isDraw = !battle.winnerId;
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <Trophy size={100} className={`mb-6 ${isWinner ? 'text-yellow-400 drop-shadow-glow' : isDraw ? 'text-slate-400' : 'text-slate-600'}`} />
        </motion.div>
        <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-widest text-center">
          {isDraw ? 'Match Nul !' : isWinner ? '🏆 Victoire Totale !' : 'Défaite cuisante'}
        </h2>
        
        <div className="flex items-center gap-2 px-5 py-2 rounded-full border mb-8 font-black ${isWinner ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/10 text-red-400'}">
          <Coins size={18} />
          {isWinner ? '+10 LevelCoins • +50 XP' : isDraw ? '+0 Coins • +20 XP' : '-10 LevelCoins • +20 XP'}
        </div>

        <div className="flex gap-12 text-center w-full max-w-md bg-slate-900/50 p-6 rounded-3xl border border-white/10 relative mb-8">
          <div className="flex-1">
            <p className="font-bold text-slate-400 uppercase text-xs">{battle.host.name}</p>
            <p className="text-3xl font-black text-red-500 mt-2">{scores.host}</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1">
            <p className="font-bold text-slate-400 uppercase text-xs">{battle.guest.name}</p>
            <p className="text-3xl font-black text-blue-500 mt-2">{scores.guest}</p>
          </div>
        </div>

        <button onClick={onClose} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform">
          Quitter la Bataille
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isHost ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
            <Palette size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Bataille de Territoire</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Temps réel synchronisé</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="bg-slate-900 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
              <TimerIcon className="text-primary" size={18} />
              <span className={`text-xl font-black ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
           </div>
           <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors text-white">
              <X size={20} />
           </button>
        </div>
      </div>

      {/* Scoreboard & Turn Indicator */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-3xl border relative transition-all duration-300 ${isHost ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900 border-white/5 opacity-50'} ${isHostTurn ? 'ring-2 ring-red-500 scale-105 shadow-[0_0_15px_rgba(255,0,0,0.2)]' : 'scale-100 opacity-60'}`}>
           {isHostTurn && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest uppercase shadow-lg whitespace-nowrap">Au tour de</span>}
           <p className="text-[10px] font-black text-red-500 uppercase mb-1 text-center">{battle?.host.name}</p>
           <p className="text-2xl font-black text-white text-center">{scores.host} pts</p>
        </div>
        <div className={`p-4 rounded-3xl border relative transition-all duration-300 ${!isHost ? 'bg-slate-800 border-slate-500/50' : 'bg-slate-900 border-white/5 opacity-50'} ${!isHostTurn ? 'ring-2 ring-slate-400 scale-105 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'scale-100 opacity-60'}`}>
           {!isHostTurn && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest uppercase shadow-lg whitespace-nowrap">Au tour de</span>}
           <p className="text-[10px] font-black text-slate-400 uppercase mb-1 text-center">{battle?.guest.name}</p>
           <p className="text-2xl font-black text-white text-center">{scores.guest} pts</p>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div 
          className="grid gap-[1px] bg-slate-800 p-1 rounded-xl shadow-2xl overflow-hidden aspect-square h-full max-h-[70vh]"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
          }}
        >
          {grid.map((color, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.1, zIndex: 10 }}
              onClick={() => handlePixelClick(i)}
              className="w-full h-full cursor-pointer relative"
              style={{ backgroundColor: color === '#ffffff' ? '#1e293b' : color }}
            >
              {color !== '#ffffff' && (
                <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <CheckCircle size={8} className="text-white/30" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Instruction */}
      <div className="mt-8 flex items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-white/5">
        <Info className="text-amber-500" size={20} />
        <p className="text-[11px] text-slate-400 font-medium">
          Aligne <strong className="text-white">3 pixels</strong> de ta couleur horizontalement ou verticalement pour gagner 1 point. Ton adversaire essaie de te bloquer !
        </p>
      </div>
    </div>
  );
};
