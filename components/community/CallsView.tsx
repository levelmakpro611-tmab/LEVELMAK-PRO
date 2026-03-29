import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Clock, ArrowUpRight, ArrowDownLeft, Sparkles, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Call } from '../../services/firebase-chat';
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
        <div className="flex-1 flex flex-col h-full bg-[#030712] overflow-hidden relative">
            {/* Filter Pills */}
            <div className="px-4 pt-4 pb-2 flex gap-2">
                {[
                    { id: 'all' as const, label: 'Tous' },
                    { id: 'missed' as const, label: 'Manqués' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all border ${
                            filter === f.id
                                ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border-blue-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                                : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:bg-white/[0.05]'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Calls List */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-2">
                {Object.entries(groupedCalls).map(([dateLabel, dateCalls]) => (
                    <div key={dateLabel}>
                        <div className="px-4 py-3">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{dateLabel}</span>
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
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.03] rounded-2xl transition-all cursor-pointer group mb-0.5"
                                >
                                    <div className={`w-12 h-12 rounded-2xl overflow-hidden ring-2 ${info.isMissed ? 'ring-red-500/30' : 'ring-white/10'} flex-shrink-0`}>
                                        {info.avatar && (info.avatar.startsWith('http') || info.avatar.startsWith('data:')) ? (
                                            <img src={info.avatar} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-black text-white bg-gradient-to-br from-blue-600 to-purple-600 text-lg">
                                                {info.name?.[0] || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-[14px] font-bold truncate ${info.isMissed ? 'text-red-400' : 'text-white'}`}>
                                            {info.name || 'Contact'}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {info.isMissed ? (
                                                <ArrowDownLeft size={12} className="text-red-400" />
                                            ) : info.isOutgoing ? (
                                                <ArrowUpRight size={12} className="text-emerald-400" />
                                            ) : (
                                                <ArrowDownLeft size={12} className="text-emerald-400" />
                                            )}
                                            <span className="text-[11px] text-slate-500 font-medium">
                                                {formatTime(call.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                    <button className={`p-2.5 rounded-xl transition-all ${call.type === 'video' ? 'text-blue-400 hover:bg-blue-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}>
                                        {call.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                ))}

                {/* Empty State */}
                {filteredCalls.length === 0 && !loading && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 space-y-5 text-center px-8"
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-600/10 to-blue-600/10 rounded-[2rem] flex items-center justify-center border border-white/[0.06] shadow-[0_0_30px_rgba(52,211,153,0.08)]">
                            <Phone size={36} className="text-emerald-500/30" />
                        </div>
                        <div className="space-y-1.5 max-w-xs">
                            <p className="font-black text-white text-lg">
                                {filter === 'missed' ? 'Aucun appel manqué' : "Pas encore d'appels"}
                            </p>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {filter === 'missed'
                                    ? "Tu n'as manqué aucun appel récemment"
                                    : "Appelle tes amis pour réviser ensemble ou lancer un défi !"
                                }
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* FAB */}
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onStartNewCall}
                className="absolute bottom-8 right-5 w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl shadow-[0_4px_25px_rgba(16,185,129,0.35)] flex items-center justify-center hover:scale-110 transition-transform z-10"
            >
                <Phone size={22} />
            </motion.button>
        </div>
    );
};

export default CallsView;
