import React, { useState, useEffect } from 'react';
import { MessageSquare, Camera, Newspaper, Phone, Users, Plus, Star, Trophy, Search, ArrowLeft, X, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { chatService, Conversation, UserPresence, Call } from '../services/firebase-chat';
import DiscussionsView from '../components/community/DiscussionsView';
import StoriesView from '../components/community/StoriesView';
import FeedView from '../components/community/FeedView';
import CallsView from '../components/community/CallsView';
import ChatDetailView from '../components/community/ChatDetailView';
import CallOverlay from '../components/community/CallOverlay';

interface CommunityProps {
    onNavigate?: (tab: string) => void;
}

const Community: React.FC<CommunityProps> = ({ onNavigate }) => {
    const { user } = useStore();
    const [activeTab, setActiveTab] = useState<'discussions' | 'stories' | 'feed' | 'calls'>('discussions');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [calls, setCalls] = useState<Call[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [showDiscovery, setShowDiscovery] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<UserPresence[]>([]);
    const [activeCall, setActiveCall] = useState<Call | null>(null);

    useEffect(() => {
        if (!user?.id) return;

        const unsubscribeConvs = chatService.listenToConversations(user.id, (convs) => {
            setConversations(convs);
        });

        const unsubscribeCalls = chatService.listenToCallsHistory(user.id, (history) => {
            setCalls(history);
        });

        const unsubscribeIncoming = chatService.listenForIncomingCalls(user.id, (incomingCall) => {
            if (incomingCall && !activeCall) {
                // Fetch partner info for the overlay (simplified: find in users or conversations)
                setActiveCall(incomingCall);
            }
        });

        // Load users for discovery
        chatService.getAllUsers(user.id).then(setAvailableUsers);

        return () => {
            unsubscribeConvs();
            unsubscribeCalls();
            unsubscribeIncoming();
        };
    }, [user?.id, activeCall]);

    const handleCreateChat = async (otherUser: UserPresence) => {
        if (!user) return;
        try {
            const convId = await chatService.getOrCreateConversation(
                user.id,
                otherUser.userId,
                user.name,
                otherUser.name,
                user.avatar?.image || '',
                otherUser.avatar
            );
            setShowDiscovery(false);
            // The conversation listener will pick it up or we can find it in the current list
            const existing = conversations.find(c => c.id === convId);
            if (existing) setSelectedConversation(existing);
        } catch (error) {
            console.error("Failed to create chat", error);
        }
    };

    const renderHeader = () => {
        if (selectedConversation && activeTab === 'discussions') return null;

        return (
            <div className="p-4 bg-[hsl(var(--sidebar))] border-b border-white/5 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-0.5 shadow-glow-sm">
                            <div className="w-full h-full rounded-[10px] bg-slate-900 border border-white/10 overflow-hidden">
                                {user?.avatar?.image ? (
                                    <img src={user.avatar.image} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: user?.avatar?.baseColor || '#3B82F6' }}>
                                        {user?.name?.[0] || 'U'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm font-black text-white truncate uppercase tracking-widest">
                            {activeTab === 'discussions' ? 'Discussions' :
                                activeTab === 'stories' ? 'Stories' :
                                    activeTab === 'feed' ? 'Contenu' : 'Appels'}
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-primary font-black flex items-center gap-1">
                                <Trophy size={10} /> NIV. {user?.stats?.level || 1}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 text-slate-400 hover:text-white transition-all">
                        <Search size={20} />
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                        <Star size={16} />
                    </div>
                </div>
            </div>
        );
    };

    const renderActiveView = () => {
        switch (activeTab) {
            case 'discussions':
                return (
                    <div className="h-full relative overflow-hidden">
                        <DiscussionsView
                            conversations={conversations}
                            onSelectConversation={setSelectedConversation}
                            onStartNewChat={() => setShowDiscovery(true)}
                            currentUser={user}
                        />
                        <AnimatePresence>
                            {selectedConversation && (
                                <motion.div
                                    initial={{ x: '100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    className="absolute inset-0 z-50 overflow-hidden"
                                >
                                    <ChatDetailView
                                        conversation={selectedConversation}
                                        currentUser={user}
                                        onBack={() => setSelectedConversation(null)}
                                        onCall={async (type, partner) => {
                                            if (!user) return;
                                            const { id: callId, roomName } = await chatService.startCall(
                                                user.id,
                                                user.name,
                                                user.avatar?.image || '',
                                                partner.userId,
                                                partner.name,
                                                partner.avatar || '',
                                                type
                                            );
                                            // Optimistic update for the UI overlay
                                            setActiveCall({
                                                id: callId,
                                                callerId: user.id,
                                                callerName: user.name,
                                                callerAvatar: user.avatar?.image,
                                                receiverId: partner.userId,
                                                receiverName: partner.name,
                                                receiverAvatar: partner.avatar,
                                                status: 'calling',
                                                type,
                                                roomName,
                                                timestamp: new Date()
                                            } as any);
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {activeCall && (
                                <CallOverlay
                                    call={activeCall}
                                    currentUser={user}
                                    onEnd={() => setActiveCall(null)}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                );
            case 'stories': return <StoriesView />;
            case 'feed': return <FeedView />;
            case 'calls': return <CallsView onStartNewCall={() => setShowDiscovery(true)} />;
            default: return <DiscussionsView conversations={[]} onSelectConversation={() => { }} onStartNewChat={() => { }} />;
        }
    };

    // Calculate badges
    const totalUnreadMessages = conversations.reduce((acc, conv) => {
        return acc + (conv.unreadCount?.[user?.id || ''] || 0);
    }, 0);

    const missedCallsCount = calls.filter(c => c.receiverId === user?.id && c.status === 'rejected').length;

    const navTabs = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Quitter', badge: 0 },
        { id: 'discussions', icon: MessageSquare, label: 'Chat', badge: totalUnreadMessages },
        { id: 'stories', icon: Camera, label: 'Stories', badge: 0 },
        { id: 'feed', icon: Newspaper, label: 'Contenu', badge: 0 },
        { id: 'calls', icon: Phone, label: 'Appels', badge: missedCallsCount },
    ];

    return (
        <div className="w-full h-screen flex flex-col bg-[hsl(var(--background))] text-slate-200 overflow-hidden">
            {renderHeader()}

            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {renderActiveView()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Navigation */}
            <div className={`bg-[hsl(var(--sidebar))] border-t border-white/5 px-4 py-2 pb-6 md:pb-4 flex items-center justify-around sticky bottom-0 z-40 transition-transform duration-300 ${selectedConversation ? 'translate-y-full' : 'translate-y-0'}`}>
                {navTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (tab.id === 'dashboard') {
                                onNavigate?.('dashboard');
                            } else {
                                setActiveTab(tab.id as any);
                            }
                        }}
                        className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <div className={`p-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-primary/10' : ''}`}>
                            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                        </div>

                        {tab.badge > 0 && (
                            <div className="absolute top-1 right-2 min-w-[16px] h-4 bg-primary rounded-full text-white text-[9px] font-black flex items-center justify-center border-2 border-[#111b21] px-0.5 shadow-glow-sm">
                                {tab.badge > 9 ? '9+' : tab.badge}
                            </div>
                        )}

                        <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="bottom-nav-indicator"
                                className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full shadow-glow-sm"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Discovery Modal */}
            <AnimatePresence>
                {showDiscovery && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDiscovery(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-[hsl(var(--sidebar))] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[70vh]"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">Nouveau message</h3>
                                <button onClick={() => setShowDiscovery(false)} className="text-slate-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {availableUsers.map(u => (
                                    <button
                                        key={u.userId}
                                        onClick={() => handleCreateChat(u)}
                                        className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-white/5"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
                                            {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-bold">{u.name[0]}</div>}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <h4 className="font-bold text-white">{u.name}</h4>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Membre Elite</p>
                                        </div>
                                        <Plus size={20} className="text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Community;
