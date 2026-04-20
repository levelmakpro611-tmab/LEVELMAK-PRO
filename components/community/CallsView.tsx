import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Clock, ArrowUpRight, ArrowDownLeft, Sparkles, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Call } from '../../services/communityService';
import { useStore } from '../../hooks/useStore';

interface CallsViewProps {
    onStartNewCall?: () => void;
}

const CallsView: React.FC<CallsViewProps> = ({ onStartNewCall }) => {
    const { user } = useStore();
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'missed'>('all');

    useEffect(() => {
        if (!user?.id) return;
        const unsubscribe = chatService.listenToCallsHistory(user.id, (history) => {
            setCalls(history);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user?.id]);

    const getCallInfo = (call: Call) => {
        const isCaller = call.callerId === user?.id;
        const isMissed = call.status === 'rejected' && !isCaller;
        return {
            isCaller, isMissed, isOutgoing: isCaller,
            avatar: isCaller ? call.receiverAvatar : call.callerAvatar,
            name: isCaller ? call.receiverName : call.callerName
        };
    };

    const filteredCalls = filter === 'missed'
        ? calls.filter(c => c.status === 'rejected' && c.receiverId === user?.id)
        : calls;

    const groupByDate = (callsList: Call[]) => {
        const groups: { [key: string]: Call[] } = {};
        callsList.forEach(call => {
            const date = call.timestamp?.toDate?.() || (call.timestamp ? new Date(call.timestamp) : null);
            if (!date) return;
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            let key = date.toDateString() === today.toDateString() ? "Aujourd'hui"
                : date.toDateString() === yesterday.toDateString() ? 'Hier'
                : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(call);
        });
        return groups;
    };

    const groupedCalls = groupByDate(filteredCalls);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020617] overflow-hidden relative">
            
            {/* ═══════════ FILTERS ═══════════ */}
            <div className="p-6 pb-4">
                <div className="flex gap-3 bg-white/[0.03] p-1.5 rounded-[20px] border border-white/[0.08] w-fit shadow-inner">
                    {[
                        { id: 'all' as const, label: 'Tous' },
                        { id: 'missed' as const, label: 'Manqués' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-8 py-3 rounded-[14px] text-[10px] font-black uppercase tracking-[0.2em] transition-all
                                ${filter === f.id
                                    ? 'bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══════════ CALLS LIST ═══════════ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-32">
                <AnimatePresence mode="popLayout">
                    {Object.entries(groupedCalls).length > 0 ? (
                        Object.entries(groupedCalls).map(([dateLabel, dateCalls]) => (
                            <div key={dateLabel} className="mb-8">
                                <div className="px-2 py-4">
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{dateLabel}</span>
                                </div>
                                
                                {dateCalls.map((call, idx) => {
                                    const info = getCallInfo(call);
                                    const formatTime = (d: any) => {
                                        const date = d?.toDate?.() || (d ? new Date(d) : null);
                                        return date ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
                                    };

                                    return (
                                        <motion.div
                                            key={call.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                            className="flex items-center gap-4 p-4 hover:bg-white/[0.03] rounded-[28px] transition-all cursor-pointer group mb-2 border border-transparent hover:border-white/5 shadow-sm"
                                        >
                                            <div className="relative shrink-0">
                                                <div className={`w-14 h-14 rounded-[20px] overflow-hidden transition-all duration-500 ring-2 ${info.isMissed ? 'ring-red-500/40' : 'ring-white/10'}`}>
                                                    {info.avatar && (info.avatar.startsWith('http') || info.avatar.startsWith('data:')) ? (
                                                        <img src={info.avatar} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center font-black text-white bg-gradient-to-br ${info.isMissed ? 'from-red-600 to-red-800' : 'from-slate-700 to-slate-800'} text-lg`}>
                                                            {info.name?.[0] || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#020617] flex items-center justify-center ${info.isMissed ? 'bg-red-500' : 'bg-emerald-500'} shadow-lg`}>
                                                    {info.isOutgoing 
                                                        ? <ArrowUpRight size={12} className="text-white" /> 
                                                        : <ArrowDownLeft size={12} className="text-white" />
                                                    }
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className={`text-[15px] font-black truncate tracking-tight ${info.isMissed ? 'text-red-400' : 'text-slate-200 group-hover:text-white'}`}>
                                                        {info.name || 'Contact Inconnu'}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest ml-2">
                                                        {formatTime(call.timestamp)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${info.isMissed ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-slate-500'}`}>
                                                        {call.type === 'video' ? 'Appel Vidéo' : 'Audio Only'}
                                                    </div>
                                                    {call.duration && (
                                                        <span className="text-[10px] text-slate-600 font-medium italic">
                                                            {Math.floor(call.duration / 60)}m {call.duration % 60}s
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border border-transparent shadow-md
                                                    ${call.type === 'video' 
                                                        ? 'bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white hover:shadow-blue-500/20' 
                                                        : 'bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white hover:shadow-emerald-500/20'}`}>
                                                    {call.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ))
                    ) : !loading && (
                        /* ═══════════ EMPTY STATE ═══════════ */
                        <div className="py-24 text-center space-y-8">
                            <div className="relative mx-auto w-32 h-32">
                                <div className="absolute inset-0 bg-emerald-600/10 blur-[40px] rounded-full animate-pulse"></div>
                                <div className="relative w-full h-full bg-white/[0.03] border border-white/[0.08] rounded-[40px] flex items-center justify-center shadow-2xl">
                                    <Users size={48} className="text-slate-800" />
                                </div>
                            </div>
                            <div className="space-y-3 px-12">
                                <h3 className="text-xl font-black text-white tracking-tight">Historique vide</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                    Tes appels audio et vidéo apparaîtront ici. Lance un appel pour commencer une session de travail immersive !
                                </p>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* ═══════════ PREMIUM FAB ═══════════ */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStartNewCall}
                className="absolute bottom-10 right-6 w-16 h-16 rounded-3xl bg-emerald-600 text-white shadow-[0_12px_32px_-8px_rgba(16,185,129,0.6)] flex items-center justify-center hover:bg-emerald-500 transition-all z-20 group"
            >
                <Phone size={24} className="group-hover:rotate-12 transition-transform duration-500" />
            </motion.button>
        </div>
    );
};

export default CallsView;
