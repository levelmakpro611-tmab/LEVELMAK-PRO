import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Circle, Trophy, RefreshCw, LogOut, Coins, Swords } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';
import { useStore } from '../hooks/useStore';
import { supabase } from '../services/supabase';
import { audioService } from '../services/audio';

interface TicTacToeProps {
    battleId: string;
    currentUser: any;
    opponent: any;
    isHost: boolean;
    onEnd: (winnerId: string | 'draw') => void;
    onRematch?: (newBet?: number) => void;
    onExit: () => void;
    currentScore: { host: number; guest: number };
    currentBet?: number;
    channel?: any; // kept for prop backward compatibility but ignored
}

export const TicTacToe: React.FC<TicTacToeProps> = ({ 
    battleId, currentUser, opponent, isHost, onEnd, onRematch, onExit, currentScore, currentBet = 0 
}) => {
    const { addLevelCoins, addNotification, resolveBattle } = useStore();
    const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
    const [isMyTurn, setIsMyTurn] = useState(isHost);
    const [winner, setWinner] = useState<string | 'draw' | null>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);
    const [gameChannel, setGameChannel] = useState<any>(null);

    // Abandonment states
    const [abandonedByOpponent, setAbandonedByOpponent] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [abandonRewardsClaimed, setAbandonRewardsClaimed] = useState(false);

    const opponentJoinedRef = useRef(false);

    const mySymbol = isHost ? 'X' : 'O';
    const opponentSymbol = isHost ? 'O' : 'X';

    // Ref to prevent stale closures
    const isMyTurnRef = useRef(isMyTurn);
    // Start background music when game is active, stop on unmount/finished
    useEffect(() => {
        if (!winner && !abandonedByOpponent) {
            audioService.startBackgroundPiano();
        } else {
            audioService.stopBackgroundPiano();
        }
        return () => {
            audioService.stopBackgroundPiano();
        };
    }, [winner, abandonedByOpponent]);

    isMyTurnRef.current = isMyTurn;

    useEffect(() => {
        const activeChannel = supabase.channel(`ttt_battle_${battleId}`, {
            config: { broadcast: { self: false } }
        });

        const handleMoveBroadcast = ({ payload }: any) => {
            setBoard(prevBoard => {
                const newBoard = [...prevBoard];
                newBoard[payload.index] = payload.symbol;
                return newBoard;
            });
            setIsMyTurn(true);
            HapticFeedback.selection();
            audioService.playClick();
        };

        const handleAbandonBroadcast = ({ payload }: any) => {
            if (payload.senderId !== currentUser.id) {
                setAbandonedByOpponent(true);
                HapticFeedback.levelUp();
            }
        };

        const handlePresenceSync = () => {
            if (winner || abandonedByOpponent) return;
            const presenceState = activeChannel.presenceState();
            const pList = Object.values(presenceState).flat() as any[];
            const opponentId = opponent.id;
            const isOpponentPresent = pList.some((p: any) => p.userId === opponentId);
            
            if (isOpponentPresent) {
                opponentJoinedRef.current = true;
            }
            
            // If opponent disconnected and was present before
            if (opponentJoinedRef.current && !isOpponentPresent) {
                setTimeout(() => {
                    const currentPresence = activeChannel.presenceState();
                    const currentList = Object.values(currentPresence).flat() as any[];
                    const stillGone = !currentList.some((p: any) => p.userId === opponentId);
                    if (stillGone && !winner && !abandonedByOpponent) {
                        setAbandonedByOpponent(true);
                        HapticFeedback.levelUp();
                    }
                }, 15000); // 15 seconds grace period
            }
        };

        activeChannel.on('broadcast', { event: 'ttt_move' }, handleMoveBroadcast);
        activeChannel.on('broadcast', { event: 'battle_abandoned' }, handleAbandonBroadcast);
        activeChannel.on('presence', { event: 'sync' }, handlePresenceSync);

        activeChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && currentUser) {
                await activeChannel.track({ userId: currentUser.id, onlineAt: new Date().toISOString() });
            }
        });

        setGameChannel(activeChannel);

        return () => {
            supabase.removeChannel(activeChannel);
        };
    }, [battleId, winner, abandonedByOpponent, opponent.id, currentUser.id]);

    const checkWinner = (currentBoard: (string | null)[]) => {
        if (winner) return;
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];

        for (const [a, b, c] of lines) {
            if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
                const targetWinner = currentBoard[a] === mySymbol ? currentUser.id : opponent.id;
                setWinner(targetWinner);
                setWinningLine([a, b, c]);
                onEnd(targetWinner);

                if (targetWinner === currentUser.id) {
                    audioService.playSuccess('quiz');
                } else {
                    audioService.playError('quiz');
                }
                return;
            }
        }

        if (!currentBoard.includes(null) && currentBoard.some(c => c !== null)) {
            setWinner('draw');
            onEnd('draw');
        }
    };

    useEffect(() => {
        checkWinner(board);
    }, [board]);

    // Handle Forfeit Reward Claiming
    useEffect(() => {
        if (abandonedByOpponent && !abandonRewardsClaimed) {
            setAbandonRewardsClaimed(true);
            const isCustom = currentBet > 0;
            if (isCustom) {
                addLevelCoins(currentBet);
                addNotification('success', '🏆 Victoire par Forfait !', `L'adversaire a quitté. Vous remportez ${currentBet} LevelCoins !`);
            } else {
                resolveBattle(currentUser.id, false);
                addNotification('success', '🏆 Victoire par Forfait !', "L'adversaire a abandonné. Victoire enregistrée !");
            }
        }
    }, [abandonedByOpponent, abandonRewardsClaimed, currentBet, currentUser.id, resolveBattle, addLevelCoins, addNotification]);

    const handleMove = (index: number) => {
        if (!isMyTurn || board[index] || winner || abandonedByOpponent) return;

        const newBoard = [...board];
        newBoard[index] = mySymbol;
        setBoard(newBoard);
        setIsMyTurn(false);
        HapticFeedback.selection();
        audioService.playClick();

        gameChannel?.send({
            type: 'broadcast',
            event: 'ttt_move',
            payload: { index, symbol: mySymbol }
        });
    };

    const confirmQuit = () => {
        gameChannel?.send({
            type: 'broadcast',
            event: 'battle_abandoned',
            payload: { senderId: currentUser.id }
        });
        if (currentBet > 0) {
            addLevelCoins(-currentBet);
        }
        setTimeout(() => {
            onExit();
        }, 500);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto p-4 font-sans relative">
            
            {/* Close/Quit button in active gameplay */}
            {!winner && !abandonedByOpponent && (
                <div className="absolute top-4 right-4 z-20">
                    <button 
                        onClick={() => setShowQuitConfirm(true)} 
                        className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white border border-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Scoreboard */}
            <div className="w-full glass-card p-4 rounded-3xl mb-6 flex items-center justify-between shadow-xl border border-white/10">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-1">
                        <img src={isHost ? currentUser.avatar?.image : opponent.avatar?.image} className="w-full h-full object-cover rounded-2xl" alt="Host" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{isHost ? 'Toi' : opponent.name}</span>
                    <span className="text-2xl font-black text-blue-500">{currentScore.host}</span>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="px-4 py-1.5 bg-yellow-500/20 rounded-full border border-yellow-500/30 mb-2">
                        <span className="text-yellow-500 font-black text-xs flex items-center gap-1">
                            <Coins size={14} /> {currentBet} LC
                        </span>
                    </div>
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">VS</div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 mb-1">
                        <img src={!isHost ? currentUser.avatar?.image : opponent.avatar?.image} className="w-full h-full object-cover rounded-2xl" alt="Guest" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{!isHost ? 'Toi' : opponent.name}</span>
                    <span className="text-2xl font-black text-rose-500">{currentScore.guest}</span>
                </div>
            </div>

            {/* Turn Indicator */}
            {!winner && !abandonedByOpponent && (
                <div className={`mb-6 px-6 py-2 rounded-full border transition-all ${isMyTurn ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                    <span className="font-black text-xs uppercase tracking-widest">
                        {isMyTurn ? 'C\'est ton tour ! ⚡' : `En attente de ${opponent.name}...`}
                    </span>
                </div>
            )}

            {/* Game Board */}
            <div className="grid grid-cols-3 gap-3 w-full aspect-square p-3 glass-card rounded-[2.5rem] border border-white/5 shadow-2xl relative">
                {board.map((cell, i) => {
                    const isWinningCell = winningLine?.includes(i);
                    return (
                        <motion.button
                            key={i}
                            whileHover={{ scale: cell ? 1 : 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleMove(i)}
                            className={`relative flex items-center justify-center aspect-square rounded-2xl transition-colors ${!cell ? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700' : cell === 'X' ? 'bg-blue-500/20' : 'bg-rose-500/20'} ${isWinningCell ? (cell === 'X' ? 'ring-4 ring-blue-500' : 'ring-4 ring-rose-500') : ''}`}
                        >
                            <AnimatePresence>
                                {cell === 'X' && (
                                    <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} className="text-blue-500">
                                        <X size={48} strokeWidth={3} className="drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                                    </motion.div>
                                )}
                                {cell === 'O' && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-rose-500">
                                        <Circle size={40} strokeWidth={3} className="drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    );
                })}
                
                {/* Result Overlay */}
                <AnimatePresence>
                    {winner && !abandonedByOpponent && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-[2.5rem] backdrop-blur-md border border-white/10">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${winner === currentUser.id ? 'bg-emerald-500/20 text-emerald-400' : winner === 'draw' ? 'bg-slate-500/20 text-slate-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {winner === currentUser.id ? <Trophy size={40} /> : winner === 'draw' ? <RefreshCw size={40} /> : <X size={40} />}
                            </div>
                            
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 italic">
                                {winner === currentUser.id ? 'GAGNÉ ! 🏆' : winner === 'draw' ? 'ÉGALITÉ 🤝' : 'PERDU... 💀'}
                            </h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">
                                {winner === currentUser.id ? `Tu remportes ${currentBet} LevelCoins !` : winner === 'draw' ? 'Mises récupérées.' : `${opponent.name} remporte la mise.`}
                            </p>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                {onRematch && (
                                    <button 
                                        onClick={() => onRematch()}
                                        className="flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                                    >
                                        <RefreshCw size={14} /> Revanche
                                    </button>
                                )}
                                <button 
                                    onClick={() => onExit()}
                                    className={`flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${!onRematch ? 'col-span-2' : ''}`}
                                >
                                    <LogOut size={14} /> Quitter
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Quit Confirmation Dialog */}
            <AnimatePresence>
                {showQuitConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1001] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl"
                        >
                            <h3 className="text-2xl font-black text-white uppercase mb-4 tracking-tight">Abandonner le duel ?</h3>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                Attention ! Si vous quittez maintenant, l'adversaire remportera la mise de {currentBet} LevelCoins par forfait.
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={confirmQuit} 
                                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Oui, abandonner 🏳️
                                </button>
                                <button 
                                    onClick={() => setShowQuitConfirm(false)} 
                                    className="w-full py-4 bg-slate-850 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors border border-white/5"
                                >
                                    Non, continuer ⚔️
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Forfeit Victory Overlay */}
            <AnimatePresence>
                {abandonedByOpponent && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
                    >
                        <motion.div 
                            initial={{ scale: 0, rotate: -10 }} 
                            animate={{ scale: 1, rotate: 0 }} 
                            transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                        >
                            <Trophy size={100} className="mb-6 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] animate-bounce" />
                        </motion.div>
                        <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-widest italic">
                            🏆 Victoire par Forfait !
                        </h2>
                        <p className="text-slate-400 max-w-sm mb-6 text-sm">
                            L'adversaire a abandonné ou s'est déconnecté. Tu remportes automatiquement ce duel !
                        </p>

                        <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-6 py-3 rounded-full font-black text-lg mb-10 shadow-premium">
                            <Coins size={22} className="animate-spin-slow" />
                            {currentBet > 0 ? `+${currentBet * 2} LevelCoins` : `+10 LevelCoins • +50 XP`}
                        </div>

                        <button 
                            onClick={onExit} 
                            className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl"
                        >
                            Retourner à la carte
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer decoration */}
            <div className="mt-8 flex items-center gap-2 text-slate-600">
                <Swords size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Arène Tic-Tac-Toe Elite</span>
            </div>
        </div>
    );
};
