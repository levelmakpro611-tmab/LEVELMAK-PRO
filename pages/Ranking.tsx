
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, Star, ArrowUp, Search, User as UserIcon, Zap, Target, Loader2, RefreshCw } from 'lucide-react';
import { getLeaderboard } from '../services/adminService';
import { User } from '../types';
import { useStore } from '../hooks/useStore';
import { LEAGUES, getLeagueFromXp } from '../constants';

const Ranking: React.FC = () => {
    const { user: currentUser, t } = useStore();
    const [leaderboard, setLeaderboard] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedLeague, setSelectedLeague] = useState<string | 'all'>('all');

    const fetchRankings = async () => {
        try {
            setRefreshing(true);
            const data = await getLeaderboard(50);
            setLeaderboard(data);
        } catch (error) {
            console.error('Error fetching rankings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRankings();
    }, []);

    const top3 = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="font-black uppercase tracking-widest text-slate-500 animate-pulse">{t('ranking.calculating')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-glow">
                            <Trophy size={24} />
                        </div>
                        <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight">{t('ranking.title')}</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] ml-15">{t('ranking.subtitle')}</p>
                </div>

                <button
                    onClick={fetchRankings}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all group"
                >
                    <RefreshCw size={14} className={`${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    {refreshing ? t('ranking.refreshing') : t('ranking.refresh')}
                </button>
            </div>

            {/* Podium Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end relative px-4">
                {/* Second Place */}
                {top3[1] && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="order-2 md:order-1 flex flex-col items-center group"
                    >
                        <div className="relative mb-4">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center font-black border-2 border-slate-900 z-10 text-xs translate-x-2 -translate-y-2">2</div>
                            <div className="w-24 h-24 rounded-[2rem] bg-slate-200 border-4 border-slate-300/50 shadow-2xl overflow-hidden relative ring-4 ring-slate-400/10 group-hover:scale-105 transition-transform">
                                {top3[1].avatar?.image ? (
                                    <img src={top3[1].avatar.image} alt={top3[1].name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-400 bg-slate-100">
                                        {top3[1].name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="font-display font-black text-slate-900 dark:text-white line-clamp-1">{top3[1].name}</h3>
                            <div className="flex items-center justify-center gap-2 bg-slate-500/10 px-3 py-1 rounded-full border border-slate-500/20">
                                <Star size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-500 uppercase">{top3[1].totalXp.toLocaleString()} XP</span>
                            </div>
                        </div>
                        <div className="mt-4 w-full h-24 bg-gradient-to-t from-slate-500/20 to-transparent rounded-t-[2.5rem] border-x border-t border-slate-500/10"></div>
                    </motion.div>
                )}

                {/* First Place */}
                {top3[0] && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="order-1 md:order-2 flex flex-col items-center group z-10"
                    >
                        <div className="relative mb-6">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2 text-amber-500 drop-shadow-glow"
                            >
                                <Crown size={48} className="fill-amber-500/20" />
                            </motion.div>
                            <div className="absolute top-0 right-0 w-10 h-10 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-black border-4 border-slate-950 z-10 text-sm translate-x-3 -translate-y-3 shadow-glow">1</div>
                            <div className="w-40 h-40 rounded-[3rem] bg-gradient-to-br from-amber-400 to-orange-600 p-1.5 shadow-[0_0_50px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform duration-500">
                                <div className="w-full h-full rounded-[2.6rem] overflow-hidden bg-slate-900">
                                    {top3[0].avatar?.image ? (
                                        <img src={top3[0].avatar.image} alt={top3[0].name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-6xl font-black text-amber-500">
                                            {top3[0].name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-center space-y-2 mb-4">
                            <h3 className="text-xl font-display font-black text-slate-900 dark:text-white drop-shadow-sm">{top3[0].name}</h3>
                            <div className="flex items-center justify-center gap-2 bg-amber-500/20 px-4 py-1.5 rounded-full border border-amber-500/30">
                                <Zap size={14} className="text-amber-500 fill-amber-500 animate-pulse" />
                                <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{top3[0].totalXp.toLocaleString()} XP</span>
                            </div>
                        </div>
                        <div className="w-full h-40 bg-gradient-to-t from-amber-500/20 to-transparent rounded-t-[3rem] border-x border-t border-amber-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                        </div>
                    </motion.div>
                )}

                {/* Third Place */}
                {top3[2] && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="order-3 flex flex-col items-center group"
                    >
                        <div className="relative mb-4">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-orange-700 text-orange-100 rounded-full flex items-center justify-center font-black border-2 border-slate-900 z-10 text-xs translate-x-2 -translate-y-2">3</div>
                            <div className="w-24 h-24 rounded-[2rem] bg-orange-950 border-4 border-orange-900/50 shadow-2xl overflow-hidden relative ring-4 ring-orange-900/10 group-hover:scale-105 transition-transform">
                                {top3[2].avatar?.image ? (
                                    <img src={top3[2].avatar.image} alt={top3[2].name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-orange-500">
                                        {top3[2].name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="font-display font-black text-slate-900 dark:text-white line-clamp-1">{top3[2].name}</h3>
                            <div className="flex items-center justify-center gap-2 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                                <Star size={12} className="text-orange-600" />
                                <span className="text-[10px] font-black text-orange-600 uppercase">{top3[2].totalXp.toLocaleString()} XP</span>
                            </div>
                        </div>
                        <div className="mt-4 w-full h-16 bg-gradient-to-t from-orange-900/20 to-transparent rounded-t-[2.5rem] border-x border-t border-orange-900/10"></div>
                    </motion.div>
                )}
            </div>

            {/* League Selection Tabs */}
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                <button
                    onClick={() => setSelectedLeague('all')}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                        selectedLeague === 'all' 
                        ? 'bg-primary text-white border-primary shadow-glow' 
                        : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                    }`}
                >
                    Toutes les Ligues
                </button>
                {LEAGUES.map(league => (
                    <button
                        key={league.id}
                        onClick={() => setSelectedLeague(league.id)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 ${
                            selectedLeague === league.id 
                            ? 'bg-slate-900 text-white border-white/20 shadow-xl' 
                            : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                        }`}
                        style={selectedLeague === league.id ? { color: league.color, borderColor: league.color + '44' } : {}}
                    >
                        <span>{league.icon}</span>
                        {league.name}
                    </button>
                ))}
            </div>

            {/* Leaderboard List */}
            <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 md:p-8 bg-white/5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Target size={18} className="text-primary" />
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">
                            {selectedLeague === 'all' ? t('ranking.allChallengers') : LEAGUES.find(l => l.id === selectedLeague)?.name}
                        </h2>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full">{t('ranking.top50')}</span>
                </div>

                <div className="divide-y divide-white/5">
                    {leaderboard
                        .filter(p => selectedLeague === 'all' || getLeagueFromXp(p.totalXp) === selectedLeague)
                        .map((player, index) => {
                            const rank = leaderboard.findIndex(lp => lp.id === player.id) + 1;
                            const isMe = player.id === currentUser?.id;
                            const pLeague = LEAGUES.find(l => l.id === getLeagueFromXp(player.totalXp)); 
                            return (
                            <motion.div
                                key={player.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex items-center justify-between p-4 md:p-6 transition-all hover:bg-white/5 group ${isMe ? 'bg-primary/10' : ''}`}
                            >
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className="w-10 text-center flex flex-col items-center gap-1">
                                        <span className={`text-sm font-black ${rank <= 3 ? 'text-amber-500' : rank <= 10 ? 'text-white' : 'text-slate-500'}`}>
                                            #{rank}
                                        </span>
                                        {pLeague && (
                                            <span className="text-xs" title={pLeague.name}>{pLeague.icon}</span>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-800 border-2 overflow-hidden relative group-hover:scale-105 transition-transform`}
                                             style={{ borderColor: pLeague?.color || 'transparent' }}>
                                            {player.avatar?.image ? (
                                                <img src={player.avatar.image} alt={player.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl font-black text-white" style={{ backgroundColor: player.avatar?.baseColor || '#3B82F6' }}>
                                                    {player.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        {rank <= 10 && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[8px] flex items-center justify-center rounded-full border border-slate-900 font-bold">
                                                <Zap size={8} fill="currentColor" />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className={`font-display font-bold text-sm md:text-base flex items-center gap-2 ${isMe ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                            {player.name} 
                                            {isMe && <span className="text-[8px] bg-primary text-white px-1.5 py-0.5 rounded-md uppercase font-black">{t('ranking.me')}</span>}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('ranking.level')} {player.avatar?.currentLevel || 1}</p>
                                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                            <p className="text-[10px] font-black uppercase tracking-tighter" style={{ color: pLeague?.color }}>{pLeague?.name}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="font-display font-black text-slate-900 dark:text-white text-sm md:text-lg tracking-tight">
                                        {player.totalXp.toLocaleString()}
                                    </p>
                                    <p className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-tighter">{t('ranking.totalXp')}</p>
                                </div>
                            </motion.div>
                        );
                    })}

                    {leaderboard.filter(p => selectedLeague === 'all' || getLeagueFromXp(p.totalXp) === selectedLeague).length === 0 && !loading && (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
                                <Search size={32} />
                            </div>
                            <p className="text-slate-500 font-bold">{t('ranking.noPlayers')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Disclaimer */}
            <div className="text-center p-8 bg-primary/5 rounded-[2rem] border border-primary/10">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic whitespace-pre-line">
                    {t('ranking.disclaimer')}
                </p>
            </div>
        </div>
    );
};

export default Ranking;
