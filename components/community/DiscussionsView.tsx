import React from 'react';
import { Search, MessageSquare, Plus, Check, Swords, BookOpen, Gamepad2, Sparkles } from 'lucide-react';
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

    // Premium status categories
    const getStudyStatus = (convId: string) => {
        const statuses = [
            { ring: 'ring-blue-500/40', glow: 'shadow-[0_0_15px_rgba(37,99,235,0.2)]', label: '📖 Focus', textColor: 'text-blue-400', bg: 'bg-blue-500/10' },
            { ring: 'ring-orange-500/40', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]', label: '⚔️ Battle', textColor: 'text-orange-400', bg: 'bg-orange-500/10' },
            { ring: 'ring-emerald-500/40', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]', label: '🟢 Actif', textColor: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { ring: 'ring-purple-500/40', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]', label: '✨ Créatif', textColor: 'text-purple-400', bg: 'bg-purple-500/10' },
        ];
        const hash = Math.abs((convId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0));
        return statuses[hash % statuses.length];
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020617] relative overflow-hidden">
            {/* ═══════════ SEARCH ═══════════ */}
            <div className="p-6 pb-4">
                <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Rechercher un message..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[22px] py-4 pl-14 pr-6 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.05] transition-all font-bold shadow-inner"
                    />
                </div>
            </div>

            {/* ═══════════ CHATS LIST ═══════════ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-32">
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
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
                                    onClick={() => onSelectConversation(conv)}
                                    className={`w-full flex items-center gap-5 p-4 rounded-[28px] transition-all group mb-2 border
                                        ${unreadCount > 0 
                                            ? 'bg-white/[0.04] border-white/[0.08] shadow-lg shadow-black/20' 
                                            : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/[0.05]'}`}
                                >
                                    {/* Avatar with Ring */}
                                    <div className="relative shrink-0">
                                        <div className={`w-14 h-14 rounded-[20px] overflow-hidden transition-all duration-500 ring-2 ${status.ring} ${status.glow}`}>
                                            {partner.avatar && (partner.avatar.startsWith('http') || partner.avatar.startsWith('data:')) ? (
                                                <img src={partner.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center text-xl font-black text-white bg-gradient-to-br ${unreadCount > 0 ? 'from-blue-600 to-indigo-600' : 'from-slate-700 to-slate-800'}`}>
                                                    {partner.name[0]}
                                                </div>
                                            )}
                                        </div>
                                        {status.label && (
                                            <div className="absolute -bottom-1 -right-1">
                                                 <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${status.textColor} ${status.bg} border border-white/5 backdrop-blur-md shadow-lg`}>
                                                    {status.label.split(' ')[1]}
                                                 </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Message Info */}
                                    <div className="flex-1 text-left min-w-0 pr-1">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <h4 className={`font-black text-[15px] truncate tracking-tight transition-colors ${unreadCount > 0 ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                {conv.groupName || partner.name}
                                            </h4>
                                            <span className={`text-[10px] shrink-0 font-bold uppercase tracking-widest ${unreadCount > 0 ? 'text-blue-500' : 'text-slate-600'}`}>
                                                {conv.lastMessage?.timestamp 
                                                    ? new Date(conv.lastMessage.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
                                                    : ''}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                {conv.lastMessage?.senderId === currentUser?.id && (
                                                    <Check size={14} className="text-blue-500 shrink-0" />
                                                )}
                                                <p className={`text-sm truncate flex-1 ${unreadCount > 0 ? 'text-slate-200 font-bold' : 'text-slate-500 font-medium group-hover:text-slate-400'}`}>
                                                    {conv.lastMessage?.text || 'Démarrer la discussion...'}
                                                </p>
                                            </div>
                                            
                                            {unreadCount > 0 && (
                                                <motion.div 
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                                >
                                                    <span className="text-[10px] font-black text-white">{unreadCount}</span>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })
                    ) : (
                        /* Empty State */
                        <div className="py-24 text-center space-y-8">
                            <div className="relative mx-auto w-32 h-32">
                                <div className="absolute inset-0 bg-blue-600/10 blur-[40px] rounded-full animate-pulse"></div>
                                <div className="relative w-full h-full bg-white/[0.03] border border-white/[0.08] rounded-[40px] flex items-center justify-center shadow-2xl">
                                    <MessageSquare size={48} className="text-slate-800" />
                                </div>
                            </div>
                            <div className="space-y-3 px-12">
                                <h3 className="text-xl font-black text-white tracking-tight">Tes discussions</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                    Trouve des adversaires, propose des Quiz Battles ou discute simplement avec tes amis.
                                </p>
                            </div>
                            <button
                                onClick={onStartNewChat}
                                className="px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                                Commencer
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Premium FAB */}
            <motion.button
                onClick={onStartNewChat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute bottom-10 right-6 w-16 h-16 rounded-3xl bg-blue-600 text-white shadow-[0_12px_32px_-8px_rgba(37,99,235,0.6)] flex items-center justify-center hover:bg-blue-500 transition-all z-20 group"
            >
                <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
            </motion.button>
        </div>
    );
};

export default DiscussionsView;
