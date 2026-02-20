import React, { useState, useEffect } from 'react';
import {
    Activity, Shield, User, BookOpen, BrainCircuit, Heart,
    Zap, LogIn, Monitor, Clock, Filter, Search
} from 'lucide-react';
import { UserActivity, subscribeToActivities, ActivityType } from '../../services/activityService';

const ActivityMonitor: React.FC = () => {
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [filter, setFilter] = useState<ActivityType | 'all'>('all');
    const [search, setSearch] = useState('');
    const [isLive, setIsLive] = useState(true);

    useEffect(() => {
        // Subscribe to real-time updates
        const unsubscribe = subscribeToActivities((newActivities) => {
            if (isLive) {
                setActivities(newActivities);
            }
        }, 100); // Get last 100 events

        return () => unsubscribe();
    }, [isLive]);

    const getIcon = (type: ActivityType) => {
        switch (type) {
            case 'auth': return <LogIn className="text-blue-400" size={18} />;
            case 'quiz': return <BrainCircuit className="text-purple-400" size={18} />;
            case 'library': return <BookOpen className="text-green-400" size={18} />;
            case 'social': return <Heart className="text-pink-400" size={18} />;
            case 'system': return <Shield className="text-slate-400" size={18} />;
            case 'creative': return <Zap className="text-yellow-400" size={18} />;
            default: return <Activity className="text-slate-400" size={18} />;
        }
    };

    const getBadgeColor = (type: ActivityType) => {
        switch (type) {
            case 'auth': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'quiz': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'library': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'social': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
            case 'system': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
            case 'creative': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const filteredActivities = activities.filter(act => {
        const matchesType = filter === 'all' || act.type === filter;
        const matchesSearch = act.userName.toLowerCase().includes(search.toLowerCase()) ||
            act.action.toLowerCase().includes(search.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="space-y-4 flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {/* Header / Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un utilisateur ou une action..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {(['all', 'auth', 'quiz', 'library', 'social'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${filter === type
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                                }`}
                        >
                            {type === 'all' ? 'Tout' : type}
                        </button>
                    ))}
                </div>

                {/* Live Status */}
                <div className="flex justify-end items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isLive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
                        <span className="text-xs font-bold">{isLive ? 'EN DIRECT' : 'PAUSE'}</span>
                    </div>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-400"
                    >
                        {isLive ? <Zap size={18} /> : <Activity size={18} />}
                    </button>
                </div>
            </div>

            {/* Monitor Stream */}
            <div className="flex-1 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden flex flex-col shadow-inner shadow-black/50">
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Monitor size={18} className="text-blue-400" />
                        Flux d'Activités
                    </h3>
                    <span className="text-xs text-slate-500">{activities.length} événements capturés</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {filteredActivities.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                            <Activity size={48} className="mb-4" />
                            <p>Aucune activité détectée pour le moment</p>
                        </div>
                    ) : (
                        filteredActivities.map((act) => (
                            <div key={act.id} className="group flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all animate-in slide-in-from-left duration-300">
                                {/* Time Column */}
                                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                                    <span className="text-xs font-mono text-slate-400">
                                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[10px] text-slate-600">
                                        {new Date(act.timestamp).toLocaleTimeString([], { second: '2-digit' })}s
                                    </span>
                                </div>

                                {/* Icon Column */}
                                <div className={`p-2 rounded-lg ${getBadgeColor(act.type)} border`}>
                                    {getIcon(act.type)}
                                </div>

                                {/* Content Column */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                            {act.userName}
                                        </h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${getBadgeColor(act.type)}`}>
                                            {act.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 mt-0.5">{act.action}</p>

                                    {/* Detailed Metadata (Visible on Hover/Expand) */}
                                    {act.details && Object.keys(act.details).length > 0 && (
                                        <div className="mt-2 text-xs text-slate-500 font-mono bg-black/30 p-2 rounded-lg hidden group-hover:block transition-all">
                                            {JSON.stringify(act.details, null, 2).replace(/{|}|"/g, '')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityMonitor;
