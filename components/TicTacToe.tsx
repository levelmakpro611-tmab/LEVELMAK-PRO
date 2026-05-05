import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Circle, Trophy, RefreshCw, LogOut, Coins, Swords } from 'lucide-react';
import { HapticFeedback } from '../services/nativeAdapters';
import { useStore } from '../hooks/useStore';

interface TicTacToeProps {
    battleId: string;
    currentUser: any;
    opponent: any;
    isHost: boolean;
    onEnd: (winnerId: string | 'draw') => void;
    onRematch: (newBet?: number) => void;
    onExit: () => void;
    currentScore: { host: number; guest: number };
    currentBet: number;
    channel: any;
}

export const TicTacToe: React.FC<TicTacToeProps> = ({ 
    battleId, currentUser, opponent, isHost, onEnd, onRematch, onExit, currentScore, currentBet, channel 
}) => {
    const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
    const [isMyTurn, setIsMyTurn] = useState(isHost);
    const [winner, setWinner] = useState<string | 'draw' | null>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);

    const mySymbol = isHost ? 'X' : 'O';
    const opponentSymbol = isHost ? 'O' : 'X';

    useEffect(() => {
        if (!channel) return;

        const unsubscribe = channel.on('broadcast', { event: 'ttt_move' }, ({ payload }: any) => {
            if (payload.battleId !== battleId) return;
            
            const newBoard = [...board];
            newBoard[payload.index] = payload.symbol;
            setBoard(newBoard);
            setIsMyTurn(true);
            checkWinner(newBoard);
            HapticFeedback.selection();
        });

        return () => {
            unsubscribe.unsubscribe();
        };
    }, [channel, board, battleId]);

    const checkWinner = (currentBoard: (string | null)[]) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];

        for (const [a, b, c] of lines) {
            if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
                setWinner(currentBoard[a] === mySymbol ? currentUser.id : opponent.id);
                setWinningLine([a, b, c]);
                onEnd(currentBoard[a] === mySymbol ? currentUser.id : opponent.id);
                return;
            }
        }

        if (!currentBoard.includes(null)) {
            setWinner('draw');
            onEnd('draw');
        }
    };

    const handleMove = (index: number) => {
        if (!isMyTurn || board[index] || winner) return;

        const newBoard = [...board];
        newBoard[index] = mySymbol;
        setBoard(newBoard);
        setIsMyTurn(false);
        checkWinner(newBoard);
        HapticFeedback.impact();

        channel.send({
            type: 'broadcast',
            event: 'ttt_move',
            payload: { battleId, index, symbol: mySymbol }
        });
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto p-4 font-sans">
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
            {!winner && (
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
                    {winner && (
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
                                <button 
                                    onClick={() => onRematch()}
                                    className="flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                                >
                                    <RefreshCw size={14} /> Revanche
                                </button>
                                <button 
                                    onClick={() => onExit()}
                                    className="flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                                >
                                    <LogOut size={14} /> Quitter
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer decoration */}
            <div className="mt-8 flex items-center gap-2 text-slate-600">
                <Swords size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Arène Tic-Tac-Toe Elite</span>
            </div>
        </div>
    );
};
