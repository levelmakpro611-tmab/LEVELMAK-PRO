import React from 'react';
import { Search, MessageSquare, PlusCircle, Check, Swords, BookOpen, Gamepad2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiscussionsViewProps {
    conversations: any[];
    onSelectConversation: (conv: any) => void;
    onStartNewChat: () => void;
    currentUser?: any;
}

const DiscussionsView: React.FC<DiscussionsViewProps> = ({ conversations, onSelectConversation, onStartNewChat, currentUser }) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredConversations = conversations.filter(conv => {
        if (!searchQuery.trim()) return true;
        const otherId = conv.participants.find((p: string) => p !== currentUser?.id);
        const name = (conv.groupName || conv.participantNames?.[otherId] || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    const getPartnerInfo = (conv: any) => {
        const otherId = conv.participants.find((p: string) => p !== currentUser?.id);
        const name = conv.participantNames?.[otherId] || 'Contact';
        const avatar = conv.participantAvatars?.[otherId];
        return { name, avatar, otherId };
    };

    // Generate a study status based on conversation id hash (until real data is available)
    const getStudyStatus = (convId: string) => {
        const statuses = [
            { gradient: 'from-blue-500 to-cyan-400', ring: 'ring-blue-500/60', glow: 'shadow-[0_0_14px_rgba(59,130,246,0.35)]', label: '📖 Focus', textColor: 'text-blue-400', bg: 'bg-blue-500/10' },
            { gradient: 'from-orange-500 to-amber-400', ring: 'ring-orange-500/60', glow: 'shadow-[0_0_14px_rgba(249,115,22,0.35)]', label: '⚔️ Battle', textColor: 'text-orange-400', bg: 'bg-orange-500/10' },
            { gradient: 'from-emerald-500 to-green-400', ring: 'ring-emerald-500/60', glow: 'shadow-[0_0_14px_rgba(16,185,129,0.35)]', label: '🟢 Actif', textColor: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { gradient: 'from-purple-500 to-fuchsia-400', ring: 'ring-purple-500/60', glow: 'shadow-[0_0_14px_rgba(168,85,247,0.35)]', label: '🧘 Zen', textColor: 'text-purple-400', bg: 'bg-purple-500/10' },
            { gradient: '', ring: 'ring-white/10', glow: '', label: '', textColor: 'text-slate-500', bg: '' },
        ];
        const hash = Math.abs((convId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0));
        return statuses[hash % statuses.length];
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#030712] relative overflow-hidden">
            {/* Search */}
            <div className="p-4 pb-2">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Rechercher une discussion"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/20 focus:bg-white/[0.06] transition-all font-bold backdrop-blur-sm"
                    />
                </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                <AnimatePresence mode="popLayout">
                    {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv, idx) => {
                            const partner = getPartnerInfo(conv);
                            const unreadCount = conv.unreadCount?.[currentUser?.id] || 0;
                            const status = getStudyStatus(conv.id);

                            return (
                                <motion.button
                                    key={conv.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => onSelectConversation(conv)}
                                    className={`w-full flex items-center gap-3.5 px-3 py-3.5 rounded-2xl transition-all active:scale-[0.98] group mb-0.5
                                        ${unreadCount > 0 
                                            ? 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07]' 
                                            : 'hover:bg-white/[0.03] border border-transparent'}`}
                                >
                                    {/* Avatar with Status Ring */}
                                    <div className="relative shrink-0">
                                        <div className={`w-[52px] h-[52px] rounded-2xl overflow-hidden ring-2 ${status.ring} ${status.glow} transition-all duration-500`}>
                                            {partner.avatar && (partner.avatar.startsWith('http') || partner.avatar.startsWith('data:')) ? (
                                                <img src={partner.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center text-lg font-black text-white bg-gradient-to-br ${status.gradient || 'from-blue-600 to-purple-600'}`}>
                                                    {partner.name[0]}
                                                </div>
                                            )}
                                        </div>
                                        {status.label && (
                                            <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7px] font-black ${status.textColor} ${status.bg} backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap z-10`}>
                                                {status.label}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 text-left min-w-0 pr-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h4 className={`font-bold text-[15px] truncate leading-tight ${unreadCount > 0 ? 'text-white' : 'text-slate-200'}`}>
                                                {conv.groupName || partner.name}
                                            </h4>
                                            <span className={`text-[10px] shrink-0 ml-2 ${unreadCount > 0 ? 'text-blue-400 font-black' : 'text-slate-600 font-medium'}`}>
                                                {conv.lastMessage?.timestamp?.toDate
                                                    ? new Date(conv.lastMessage.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                                    : conv.lastMessage?.timestamp 
                                                        ? new Date(conv.lastMessage.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
                                                        : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 flex-1 min-w-0">
                                                {conv.lastMessage?.senderId === currentUser?.id && (
                                                    <Check size={13} className="text-blue-400 shrink-0" />
                                                )}
                                                <p className={`text-[13px] truncate flex-1 ${unreadCount > 0 ? 'text-slate-200 font-semibold' : 'text-slate-500 font-medium'}`}>
                                                    {conv.lastMessage?.text || 'Commencer une discussion...'}
                                                </p>
                                            </div>
                                            {unreadCount > 0 && (
                                                <div className="min-w-[20px] h-[20px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white text-[9px] font-black flex items-center justify-center px-1.5 shadow-[0_0_10px_rgba(99,102,241,0.4)] ml-2">
                                                    {unreadCount}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="h-full flex flex-col items-center justify-center space-y-6 p-8 text-center"
                        >
                            <div className="relative">
                                <div className="w-28 h-28 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-[2.5rem] flex items-center justify-center border border-white/[0.06] shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                                    <MessageSquare size={44} className="text-blue-500/30" />
                                </div>
                                <motion.div 
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-400 rounded-xl flex items-center justify-center shadow-lg"
                                >
                                    <Swords size={14} className="text-white" />
                                </motion.div>
                            </div>
                            <div className="space-y-2 max-w-xs">
                                <p className="font-black text-white text-xl">Pas encore de messages</p>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    Lance une discussion, défie un ami en Quiz Battle, ou trouve de nouveaux cerveaux à affronter !
                                </p>
                            </div>
                            <button
                                onClick={onStartNewChat}
                                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(99,102,241,0.3)] flex items-center gap-2.5"
                            >
                                <Sparkles size={14} /> Nouvelle Discussion
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Premium FAB */}
            <motion.button
                onClick={onStartNewChat}
                whileTap={{ scale: 0.9 }}
                className="absolute bottom-8 right-5 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl shadow-[0_4px_25px_rgba(99,102,241,0.4)] flex items-center justify-center hover:scale-110 transition-transform z-10"
            >
                <MessageSquare size={22} fill="white" />
            </motion.button>
        </div>
    );
};

export default DiscussionsView;
