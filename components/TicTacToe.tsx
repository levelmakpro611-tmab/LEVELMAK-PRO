import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Circle, Trophy, RefreshCw, LogOut, Coins, Swords } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';
import { useStore } from '../hooks/useStore';
import { supabase } from '../services/supabase';
import { audioService } from '../services/audio';

const getTicTacToeBotMove = (currentBoard: (string | null)[], botSymbol: string, userSymbol: string, difficulty: 'easy' | 'hard' | 'expert'): number => {
    const emptyIndices = currentBoard.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
    if (emptyIndices.length === 0) return -1;
    
    if (difficulty === 'easy') {
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    // 1. Can bot win?
    for (const [a, b, c] of lines) {
        const vals = [currentBoard[a], currentBoard[b], currentBoard[c]];
        const botCount = vals.filter(v => v === botSymbol).length;
        const nullCount = vals.filter(v => v === null).length;
        if (botCount === 2 && nullCount === 1) {
            if (currentBoard[a] === null) return a;
            if (currentBoard[b] === null) return b;
            if (currentBoard[c] === null) return c;
        }
    }

    // 2. Block user?
    for (const [a, b, c] of lines) {
        const vals = [currentBoard[a], currentBoard[b], currentBoard[c]];
        const userCount = vals.filter(v => v === userSymbol).length;
        const nullCount = vals.filter(v => v === null).length;
        if (userCount === 2 && nullCount === 1) {
            if (currentBoard[a] === null) return a;
            if (currentBoard[b] === null) return b;
            if (currentBoard[c] === null) return c;
        }
    }

    if (difficulty === 'hard' && Math.random() < 0.3) {
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    // 3. Center
    if (currentBoard[4] === null) return 4;

    // 4. Corners
    const corners = [0, 2, 6, 8].filter(i => currentBoard[i] === null);
    if (corners.length > 0) {
        return corners[Math.floor(Math.random() * corners.length)];
    }

    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
};

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
    const { addLevelCoins, addXp, addNotification, resolveBattle } = useStore();
    const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
    const [isMyTurn, setIsMyTurn] = useState(isHost);
    const [winner, setWinner] = useState<string | 'draw' | null>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);
    const [gameChannel, setGameChannel] = useState<any>(null);

    // Abandonment states
    const [abandonedByOpponent, setAbandonedByOpponent] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [abandonRewardsClaimed, setAbandonRewardsClaimed] = useState(false);

    // Rematch states
    const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);
    const [rematchRequestedByOpponent, setRematchRequestedByOpponent] = useState(false);
    const [opponentLeft, setOpponentLeft] = useState(false);

    // Refs to avoid tearing down WebSocket channels upon match conclusion
    const winnerRef = useRef(winner);
    winnerRef.current = winner;
    const abandonedByOpponentRef = useRef(abandonedByOpponent);
    abandonedByOpponentRef.current = abandonedByOpponent;
    const rematchRequestedByMeRef = useRef(rematchRequestedByMe);
    rematchRequestedByMeRef.current = rematchRequestedByMe;

    const getAvatarSrc = (avatar: any) => {
        if (!avatar) return '';
        if (typeof avatar === 'string') return avatar;
        if (typeof avatar === 'object' && avatar.image) return avatar.image;
        return '';
    };

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
        if (opponent.id === 'levelbot') return;

        // Dedicated match channel - stays connected across rematches
        const activeChannel = supabase.channel(`ttt_battle_${battleId}`, {
            config: { broadcast: { self: false } }
        });

        // Dedicated duel fallback room
        const duelChan = supabase.channel(`duel-${battleId}`, {
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

        const handleExitBroadcast = ({ payload }: any) => {
            if (payload.senderId !== currentUser.id) {
                setOpponentLeft(true);
                setRematchRequestedByOpponent(false);
            }
        };

        const handlePresenceSync = () => {
            if (winnerRef.current || abandonedByOpponentRef.current) return;
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
                    if (stillGone && !winnerRef.current && !abandonedByOpponentRef.current) {
                        setAbandonedByOpponent(true);
                        HapticFeedback.levelUp();
                    }
                }, 15000); // 15 seconds grace period
            }
        };

        const handleRematchRequestBroadcast = ({ payload }: any) => {
            if (payload.senderId !== currentUser.id) {
                if (rematchRequestedByMeRef.current) {
                    // Les deux joueurs ont cliqué sur Revanche -> Démarrage direct synchronisé !
                    executeAcceptRematch();
                } else {
                    setRematchRequestedByOpponent(true);
                    HapticFeedback.levelUp();
                    audioService.playSuccess('quiz');
                    addNotification('info', 'Demande de Revanche ⚔️', `${opponent.name} souhaite prendre sa revanche !`);
                }
            }
        };

        const handleRematchAcceptBroadcast = () => {
            onRematch?.(currentBet);
            setBoard(Array(9).fill(null));
            setWinner(null);
            setWinningLine(null);
            setRematchRequestedByMe(false);
            setRematchRequestedByOpponent(false);
            setOpponentLeft(false);
            setIsMyTurn(isHost ? false : true);
            HapticFeedback.success();
            audioService.playClick();
        };

        activeChannel.on('broadcast', { event: 'ttt_move' }, handleMoveBroadcast);
        activeChannel.on('broadcast', { event: 'battle_abandoned' }, handleAbandonBroadcast);
        activeChannel.on('broadcast', { event: 'battle_exit' }, handleExitBroadcast);
        activeChannel.on('broadcast', { event: 'ttt_rematch_request' }, handleRematchRequestBroadcast);
        activeChannel.on('broadcast', { event: 'ttt_rematch_accept' }, handleRematchAcceptBroadcast);
        activeChannel.on('presence', { event: 'sync' }, handlePresenceSync);

        duelChan.on('broadcast', { event: 'ttt_rematch_request' }, handleRematchRequestBroadcast);
        duelChan.on('broadcast', { event: 'ttt_rematch_accept' }, handleRematchAcceptBroadcast);
        duelChan.on('broadcast', { event: 'battle_exit' }, handleExitBroadcast);

        activeChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && currentUser) {
                await activeChannel.track({ userId: currentUser.id, onlineAt: new Date().toISOString() });
            }
        });

        duelChan.subscribe();

        setGameChannel(activeChannel);

        return () => {
            supabase.removeChannel(activeChannel);
            supabase.removeChannel(duelChan);
        };
    }, [battleId, opponent.id, currentUser.id]);

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
                    HapticFeedback.levelUp();
                    import('canvas-confetti').then(({ default: confetti }) => {
                        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                    }).catch(() => {});
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

    // LevelBot AI opponent move simulator
    useEffect(() => {
        if (opponent.id !== 'levelbot' || isMyTurn || winner || abandonedByOpponent) return;

        const botSymbol = opponentSymbol;
        const userSymbol = mySymbol;
        const botDifficulty = opponent.difficulty || 'easy';

        const timer = setTimeout(() => {
            const moveIdx = getTicTacToeBotMove(board, botSymbol, userSymbol, botDifficulty);
            if (moveIdx !== -1 && !board[moveIdx] && !winner) {
                setBoard(prevBoard => {
                    const newBoard = [...prevBoard];
                    newBoard[moveIdx] = botSymbol;
                    return newBoard;
                });
                setIsMyTurn(true);
                HapticFeedback.selection();
                audioService.playClick();
            }
        }, 1200 + Math.random() * 800);

        return () => clearTimeout(timer);
    }, [isMyTurn, board, winner, abandonedByOpponent]);

    // Handle Forfeit Reward Claiming
    useEffect(() => {
        if (abandonedByOpponent && !abandonRewardsClaimed) {
            setAbandonRewardsClaimed(true);
            const winCoins = currentBet > 0 ? currentBet * 2 : 20;
            addLevelCoins(winCoins);
            addXp(50);
            resolveBattle(currentUser.id, false);
            addNotification('success', '🏆 Victoire par Forfait !', `L'adversaire a abandonné. Vous remportez ${winCoins} LevelCoins et +50 XP !`);
        }
    }, [abandonedByOpponent, abandonRewardsClaimed, currentBet, currentUser.id, resolveBattle, addLevelCoins, addXp, addNotification]);

    const handleMove = (index: number) => {
        if (!isMyTurn || board[index] || winner || abandonedByOpponent) return;

        const newBoard = [...board];
        newBoard[index] = mySymbol;
        setBoard(newBoard);
        setIsMyTurn(false);
        HapticFeedback.selection();
        audioService.playClick();

        if (opponent.id !== 'levelbot') {
            gameChannel?.send({
                type: 'broadcast',
                event: 'ttt_move',
                payload: { index, symbol: mySymbol }
            });
        }
    };

    const confirmQuit = () => {
        if (opponent.id !== 'levelbot') {
            gameChannel?.send({
                type: 'broadcast',
                event: 'battle_abandoned',
                payload: { senderId: currentUser.id, betAmount: currentBet }
            });
        }
        if (currentBet > 0) {
            // Mise déjà débitée au début du duel (startBattle)
            addNotification('info', 'Défi abandonné 🏳️', `Tu as abandonné le duel. La mise de ${currentBet} LevelCoins est perdue.`);
        }
        setTimeout(() => {
            onExit();
        }, 300);
    };

    const executeAcceptRematch = () => {
        if ((currentUser.levelCoins || 0) < currentBet) {
            addNotification('error', 'Solde insuffisant ❌', `Tu as besoin de ${currentBet} LC pour relancer un duel.`);
            return;
        }

        const payload = { senderId: currentUser.id, battleId };

        if (opponent.id !== 'levelbot') {
            gameChannel?.send({
                type: 'broadcast',
                event: 'ttt_rematch_accept',
                payload
            });
            const duelChan = supabase.channel(`duel-${battleId}`);
            if (duelChan.state === 'joined') {
                duelChan.send({ type: 'broadcast', event: 'ttt_rematch_accept', payload });
            } else {
                duelChan.subscribe((s) => {
                    if (s === 'SUBSCRIBED') {
                        duelChan.send({ type: 'broadcast', event: 'ttt_rematch_accept', payload });
                        setTimeout(() => supabase.removeChannel(duelChan), 3000);
                    }
                });
            }
        }

        onRematch?.(currentBet);
        setBoard(Array(9).fill(null));
        setWinner(null);
        setWinningLine(null);
        setRematchRequestedByMe(false);
        setRematchRequestedByOpponent(false);
        setOpponentLeft(false);
        setIsMyTurn(isHost ? false : true);
        HapticFeedback.success();
    };

    const handleRequestRematch = () => {
        if ((currentUser.levelCoins || 0) < currentBet) {
            addNotification('error', 'Solde insuffisant ❌', `Tu as besoin de ${currentBet} LC pour demander une revanche.`);
            return;
        }

        setRematchRequestedByMe(true);
        HapticFeedback.selection();

        if (opponent.id === 'levelbot') {
            setTimeout(() => {
                executeAcceptRematch();
            }, 800);
            return;
        }

        const payload = {
            senderId: currentUser.id,
            senderName: currentUser.name || 'Adversaire',
            battleId,
            betAmount: currentBet
        };

        // 1. Send on gameChannel
        gameChannel?.send({
            type: 'broadcast',
            event: 'ttt_rematch_request',
            payload
        });

        // 2. Send on duelChan
        const duelChan = supabase.channel(`duel-${battleId}`);
        if (duelChan.state === 'joined') {
            duelChan.send({ type: 'broadcast', event: 'ttt_rematch_request', payload });
        } else {
            duelChan.subscribe((s) => {
                if (s === 'SUBSCRIBED') {
                    duelChan.send({ type: 'broadcast', event: 'ttt_rematch_request', payload });
                    setTimeout(() => supabase.removeChannel(duelChan), 3000);
                }
            });
        }

        // 3. Send on direct user channel
        if (opponent.id) {
            const oppChan = supabase.channel(`user-battles-${opponent.id}`);
            if (oppChan.state === 'joined') {
                oppChan.send({ type: 'broadcast', event: 'ttt_rematch_request', payload });
            } else {
                oppChan.subscribe((s) => {
                    if (s === 'SUBSCRIBED') {
                        oppChan.send({ type: 'broadcast', event: 'ttt_rematch_request', payload });
                        setTimeout(() => supabase.removeChannel(oppChan), 3000);
                    }
                });
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-between h-full max-h-[100dvh] w-full max-w-sm sm:max-w-md mx-auto p-2 sm:p-3 font-sans relative overflow-hidden select-none">
            
            {/* Top Navigation Bar with Title & Close button */}
            <div className="w-full flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs sm:text-sm shadow-md">
                        ⚔️
                    </span>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider leading-none">Morpion Stratégique</h3>
                        <p className="text-[9px] sm:text-[10px] text-blue-400 font-bold mt-0.5">Partie en Direct</p>
                    </div>
                </div>

                {!winner && !abandonedByOpponent && (
                    <button 
                        onClick={() => setShowQuitConfirm(true)} 
                        className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl transition-all text-slate-300 hover:text-white border border-white/10 shadow-lg cursor-pointer"
                        title="Quitter la partie"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Scoreboard */}
            {(() => {
                const hostAvatar = getAvatarSrc(isHost ? currentUser.avatar : opponent.avatar);
                const hostName = isHost ? 'Toi' : opponent.name;
                const guestAvatar = getAvatarSrc(!isHost ? currentUser.avatar : opponent.avatar);
                const guestName = !isHost ? 'Toi' : opponent.name;

                return (
                    <div className="w-full bg-[#0d1425]/90 backdrop-blur-xl py-2 px-3 sm:px-4 rounded-2xl mb-2 flex items-center justify-between shadow-2xl border border-blue-500/20 shrink-0">
                        <div className="flex flex-col items-center min-w-[65px]">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 mb-0.5 shadow-md shadow-blue-500/30 overflow-hidden flex items-center justify-center text-white">
                                {hostAvatar ? (
                                    <img src={hostAvatar} className="w-full h-full object-cover rounded-[10px]" alt="Host" />
                                ) : (
                                    <span className="text-sm font-black uppercase">{(hostName || 'U').charAt(0)}</span>
                                )}
                            </div>
                            <span className="text-[9px] font-black text-white uppercase tracking-wider max-w-[75px] truncate text-center">{hostName}</span>
                            <span className="text-base sm:text-lg font-black text-blue-400 leading-none mt-0.5">{currentScore.host}</span>
                        </div>
                        
                        <div className="flex flex-col items-center px-2">
                            <div className="px-2.5 py-0.5 bg-amber-500/20 rounded-full border border-amber-500/30 mb-0.5">
                                <span className="text-amber-400 font-black text-[10px] flex items-center gap-1">
                                    <Coins size={11} /> {currentBet > 0 ? `POT : ${currentBet * 2} LC` : '+20 LC'}
                                </span>
                            </div>
                            <div className="text-slate-400 text-[8px] font-bold">
                                {currentBet > 0 ? `Mise : ${currentBet} LC` : 'Amical'}
                            </div>
                        </div>

                        <div className="flex flex-col items-center min-w-[65px]">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 p-0.5 mb-0.5 shadow-md shadow-rose-500/30 overflow-hidden flex items-center justify-center text-white">
                                {guestAvatar ? (
                                    <img src={guestAvatar} className="w-full h-full object-cover rounded-[10px]" alt="Guest" />
                                ) : (
                                    <span className="text-sm font-black uppercase">{(guestName || 'U').charAt(0)}</span>
                                )}
                            </div>
                            <span className="text-[9px] font-black text-white uppercase tracking-wider max-w-[75px] truncate text-center">{guestName}</span>
                            <span className="text-base sm:text-lg font-black text-rose-400 leading-none mt-0.5">{currentScore.guest}</span>
                        </div>
                    </div>
                );
            })()}

            {/* Turn Indicator */}
            {!winner && !abandonedByOpponent && (
                <div className={`mb-2 px-3 py-1 rounded-full border transition-all shrink-0 ${isMyTurn ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)] animate-pulse' : 'bg-slate-900/80 border-white/10 text-slate-400'}`}>
                    <span className="font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                        {isMyTurn ? '⚡ C\'est ton tour ! Joue ton coup' : `⏳ Au tour de ${opponent.name}...`}
                    </span>
                </div>
            )}

            {/* Game Board - clamped to maximum viewport percentage so it fits on screen without overflowing */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-[min(320px,46vh)] aspect-square p-2.5 sm:p-3 glass-card rounded-2xl sm:rounded-3xl border border-white/5 shadow-2xl relative shrink-0">
                {board.map((cell, i) => {
                    const isWinningCell = winningLine?.includes(i);
                    return (
                        <motion.button
                            key={`cell-${i}`}
                            whileHover={{ scale: cell ? 1 : 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleMove(i)}
                            className={`relative flex items-center justify-center aspect-square rounded-xl sm:rounded-2xl transition-colors ${!cell ? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700' : cell === 'X' ? 'bg-blue-500/20' : 'bg-rose-500/20'} ${isWinningCell ? (cell === 'X' ? 'ring-2 sm:ring-4 ring-blue-500' : 'ring-2 sm:ring-4 ring-rose-500') : ''}`}
                        >
                            <AnimatePresence>
                                {cell === 'X' && (
                                    <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} className="text-blue-500">
                                        <X size={38} strokeWidth={3} className="drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                                    </motion.div>
                                )}
                                {cell === 'O' && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-rose-500">
                                        <Circle size={32} strokeWidth={3} className="drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    );
                })}
            </div>

            {/* Full-Screen End Match Modal Overlay */}
            <AnimatePresence>
                {winner && !abandonedByOpponent && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center"
                    >
                        <motion.div 
                            initial={{ scale: 0.85, y: 20 }} 
                            animate={{ scale: 1, y: 0 }} 
                            className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center"
                        >
                            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${winner === currentUser.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/20' : winner === 'draw' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-rose-500/20'}`}>
                                {winner === currentUser.id ? <Trophy size={40} className="animate-bounce" /> : winner === 'draw' ? <RefreshCw size={36} /> : <X size={40} />}
                            </div>
                            
                            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-1">
                                {winner === currentUser.id ? 'VICTOIRE ! 🏆' : winner === 'draw' ? 'MATCH NUL 🤝' : 'DÉFAITE... 💀'}
                            </h2>

                            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full my-3 bg-white/5 border border-white/10">
                                <Coins size={15} className="text-amber-400" />
                                <span className={`text-xs font-black uppercase tracking-wider ${winner === currentUser.id ? 'text-emerald-400' : winner === 'draw' ? 'text-slate-300' : 'text-rose-400'}`}>
                                    {winner === currentUser.id 
                                        ? `+${currentBet > 0 ? currentBet * 2 : 20} LevelCoins remportés !` 
                                        : winner === 'draw' 
                                            ? (currentBet > 0 ? `Mise de ${currentBet} LC remboursée` : 'Égalité parfaite') 
                                            : (currentBet > 0 ? `Mise de ${currentBet} LC perdue` : 'Partie perdue')}
                                </span>
                            </div>

                            <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-xs leading-relaxed">
                                {winner === currentUser.id 
                                    ? `Bravo ! Tu as vaincu ${opponent.name} dans l'arène.` 
                                    : winner === 'draw' 
                                        ? `Duel très serré face à ${opponent.name} !` 
                                        : `${opponent.name} a remporté la partie.`}
                            </p>

                            <div className="flex flex-col gap-3 w-full">
                                {opponentLeft && (
                                    <div className="w-full p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                                        <span>🚪</span> {opponent.name} a quitté le duel.
                                    </div>
                                )}

                                {rematchRequestedByOpponent && !opponentLeft && (
                                    <div className="w-full p-2.5 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-300 text-xs font-black text-center animate-pulse flex items-center justify-center gap-2">
                                        <span>⚔️</span> {opponent.name} demande une revanche immédiate !
                                    </div>
                                )}

                                {!opponentLeft && (
                                    rematchRequestedByMe ? (
                                        <button 
                                            onClick={handleRequestRematch}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600/30 hover:bg-blue-600/50 active:scale-98 text-blue-200 rounded-2xl font-black uppercase tracking-wider text-xs border border-blue-500/40 transition-all shadow-lg"
                                            title="Cliquer pour renvoyer le signal"
                                        >
                                            <RefreshCw size={15} className="animate-spin text-blue-400" /> En attente de {opponent.name}... (Renvoyer 🔔)
                                        </button>
                                    ) : rematchRequestedByOpponent ? (
                                        <button 
                                            onClick={executeAcceptRematch}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-emerald-500/30 active:scale-98 transition-all animate-pulse"
                                        >
                                            <Swords size={16} /> Accepter la revanche ⚔️
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleRequestRematch}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-blue-500/25 active:scale-98 transition-all"
                                        >
                                            <Swords size={16} /> Revanche immédiate ⚔️
                                        </button>
                                    )
                                )}

                                <button 
                                    onClick={onExit}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 hover:text-white rounded-2xl font-black uppercase tracking-wider text-xs border border-white/10 transition-all shadow-md"
                                >
                                    🗺️ Défier un autre élève / Retour Arène
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quit Confirmation Dialog */}
            <AnimatePresence>
                {showQuitConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1001] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 text-center"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 15 }}
                            className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-black text-white uppercase mb-3 tracking-tight">Abandonner le duel ?</h3>
                            <p className="text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
                                {currentBet > 0 
                                    ? `Attention ! Si vous quittez maintenant, l'adversaire remportera la mise de ${currentBet * 2} LevelCoins par forfait.`
                                    : "Attention ! Si vous quittez maintenant, vous perdrez la partie et l'adversaire remportera la victoire par forfait."
                                }
                            </p>
                            
                            <div className="flex flex-col gap-2.5">
                                <button 
                                    onClick={confirmQuit} 
                                    className="w-full py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Oui, abandonner 🏳️
                                </button>
                                <button 
                                    onClick={() => setShowQuitConfirm(false)} 
                                    className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-700 transition-colors border border-white/5"
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
                        className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 text-center"
                    >
                        <motion.div 
                            initial={{ scale: 0, rotate: -10 }} 
                            animate={{ scale: 1, rotate: 0 }} 
                            transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                        >
                            <Trophy size={80} className="mb-4 text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.5)] animate-bounce" />
                        </motion.div>
                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest italic">
                            🏆 Victoire par Forfait !
                        </h2>
                        <p className="text-slate-400 max-w-xs mb-4 text-xs">
                            L'adversaire a abandonné ou s'est déconnecté. Tu remportes automatiquement ce duel !
                        </p>

                        <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-5 py-2.5 rounded-full font-black text-base mb-6 shadow-premium">
                            <Coins size={18} className="animate-spin-slow" />
                            {currentBet > 0 ? `+${currentBet * 2} LevelCoins` : `+20 LevelCoins • +50 XP`}
                        </div>

                        <button 
                            onClick={onExit} 
                            className="bg-white text-slate-900 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-2xl flex items-center gap-2"
                        >
                            🗺️ Défier un autre élève / Retour Arène
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer decoration */}
            <div className="mt-1 flex items-center gap-1.5 text-slate-500/70 shrink-0">
                <Swords size={12} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Arène Morpion Elite</span>
            </div>
        </div>
    );
};
