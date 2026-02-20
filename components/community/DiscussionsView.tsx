import React from 'react';
import { Search, MessageSquare, PlusCircle, Check, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiscussionsViewProps {
    conversations: any[];
    onSelectConversation: (conv: any) => void;
    onStartNewChat: () => void;
    currentUser: any;
}

const DiscussionsView: React.FC<DiscussionsViewProps> = ({ conversations, onSelectConversation, onStartNewChat, currentUser }) => {
    const getPartnerInfo = (conv: any) => {
        const otherId = conv.participants.find((p: string) => p !== currentUser?.id);
        const name = conv.participantNames?.[otherId] || 'Contact';
        const avatar = conv.participantAvatars?.[otherId];
        return { name, avatar };
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[hsl(var(--background))] relative overflow-hidden">
            {/* Search Header */}
            <div className="p-4 bg-[hsl(var(--sidebar))] border-b border-white/5">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Rechercher une discussion"
                        className="w-full bg-[hsl(var(--card))] border border-transparent rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:bg-white/5 transition-all"
                    />
                </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                <AnimatePresence mode="popLayout">
                    {conversations.length > 0 ? (
                        conversations.map((conv) => (
                            <motion.button
                                key={conv.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => onSelectConversation(conv)}
                                className="w-full flex items-center gap-3 p-4 hover:bg-[hsl(var(--card))] transition-all border-b border-white/5 active:bg-white/5"
                            >
                                <div className="relative shrink-0">
                                    <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden">
                                        {getPartnerInfo(conv).avatar ? (
                                            <img src={getPartnerInfo(conv).avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                                                {getPartnerInfo(conv).name[0]}
                                            </div>
                                        )}
                                    </div>
                                    {conv.unreadCount?.[currentUser?.id] > 0 && (
                                        <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-primary rounded-full text-white text-[10px] font-black flex items-center justify-center border-2 border-[#111b21] px-1 shadow-glow-sm">
                                            {conv.unreadCount[currentUser.id]}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-white text-[16px] truncate">
                                            {conv.groupName || getPartnerInfo(conv).name}
                                        </h4>
                                        <span className="text-[11px] text-slate-500 font-medium">
                                            {conv.lastMessage?.timestamp?.toDate?.().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) || 'Récent'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[13px] text-slate-400 truncate flex-1 font-medium italic">
                                            {conv.lastMessage?.text || 'Commencer une discussion...'}
                                        </p>
                                    </div>
                                </div>
                            </motion.button>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 p-8 text-center"
                        >
                            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10">
                                <MessageSquare size={32} className="opacity-20" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-white">Pas encore de messages</p>
                                <p className="text-sm">Lance une nouvelle discussion avec tes amis !</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* FAB */}
            <button
                onClick={onStartNewChat}
                className="absolute bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl shadow-glow flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10"
            >
                <PlusCircle size={28} />
            </button>
        </div>
    );
};

export default DiscussionsView;
