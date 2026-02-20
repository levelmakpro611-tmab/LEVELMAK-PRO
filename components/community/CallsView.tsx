import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Calendar, Plus, MessageSquare } from 'lucide-react';
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
        const isMissed = call.status === 'rejected' || (call.status === 'ended' && !isCaller); // Simplified logic

        return {
            isCaller,
            isMissed,
            icon: isCaller ? PhoneOutgoing : (isMissed ? PhoneMissed : PhoneIncoming),
            color: isMissed ? 'text-red-500' : 'text-primary'
        };
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[hsl(var(--background))] overflow-hidden p-4 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Appels</h2>
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button className="px-4 py-1.5 bg-primary/20 text-primary text-[10px] font-black uppercase rounded-lg">Tous</button>
                    <button className="px-4 py-1.5 text-slate-500 text-[10px] font-black uppercase rounded-lg hover:text-white transition-all">Manqués</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-24 space-y-1">
                <AnimatePresence mode="popLayout">
                    {calls.length > 0 ? (
                        calls.map((call) => {
                            const info = getCallInfo(call);
                            return (
                                <motion.div
                                    key={call.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-white/5 flex items-center justify-center text-slate-400">
                                        {call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <h4 className="font-bold text-white truncate text-[16px]">
                                            {info.isCaller ? (call.receiverId === user?.id ? 'Moi' : 'Contact') : (call.callerName || 'Inconnu')}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <info.icon size={12} className={info.color} />
                                            <span className="text-[11px] text-slate-500 font-medium italic">
                                                {call.timestamp?.toDate?.().toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) || 'Récent'}
                                            </span>
                                        </div>
                                    </div>
                                    <button className="p-3 text-primary hover:bg-primary/10 rounded-xl transition-all">
                                        {call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                                    </button>
                                </motion.div>
                            )
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 py-20">
                            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10">
                                <Phone size={32} className="opacity-20" />
                            </div>
                            <div className="space-y-1 text-center">
                                <p className="font-bold text-white">Pas encore d'appels</p>
                                <p className="text-sm">Tes appels récents s'afficheront ici</p>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* FAB */}
            <button
                onClick={onStartNewCall}
                className="absolute bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl shadow-glow flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10"
            >
                <Plus size={28} />
            </button>
        </div>
    );
};

export default CallsView;
