import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Search, Plus, X, Camera, MoreVertical, Swords, Zap, Users, Sparkles, TrendingUp, Crown, Shield, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { chatService, Conversation, UserPresence, Call } from '../services/firebase-chat';
import DiscussionsView from '../components/community/DiscussionsView';
import StoriesView from '../components/community/StoriesView';
import FeedView from '../components/community/FeedView';
import CallsView from '../components/community/CallsView';
import ChatDetailView from '../components/community/ChatDetailView';
import CallOverlay from '../components/community/CallOverlay';
import { QuizBattle } from '../components/QuizBattle';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [availableUsers, setAvailableUsers] = useState<UserPresence[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserPresence[]>([]);
    const [currentCall, setCurrentCall] = useState<Call | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [activeBattle, setActiveBattle] = useState<any | null>(null);

    // Listen to conversations and calls
    useEffect(() => {
        if (!user?.id) return;
        console.log('[Community] Initializing listeners for user:', user.id);
        const unsubscribeConvs = chatService.listenToConversations(user.id, (convs) => {
            console.log('[Community] Conversations updated:', convs.length);
            setConversations(convs);
        });
        const unsubscribeCalls = chatService.listenToCallsHistory(user.id, (callHistory) => {
            setCalls(callHistory);
        });
        return () => { unsubscribeConvs(); unsubscribeCalls(); };
    }, [user?.id]);

    // Handle Incoming Calls
    useEffect(() => {
        if (!user?.id) return;
        const unsubscribeIncoming = chatService.listenForIncomingCalls(user.id, (incomingCall) => {
            if (incomingCall && !currentCall) {
                console.log('[Community] Incoming call detected:', incomingCall.id);
                setCurrentCall(incomingCall);
            }
        });
        return () => unsubscribeIncoming();
    }, [user?.id, currentCall]);

    // Discovery Fetch
    useEffect(() => {
        if (!showDiscovery || !user?.id) return;
        
        let isMounted = true;
        console.log('[Community] Fetching discovery users...');
        setIsSearching(true);
        
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                console.warn('[Community] Discovery fetch timed out');
                setIsSearching(false);
            }
        }, 10000);

        chatService.getAllUsers(user.id)
            .then(users => {
                if (isMounted) {
                    console.log('[Community] Users loaded:', users.length);
                    setAvailableUsers(users);
                    setFilteredUsers(users);
                }
            })
            .catch(err => {
                console.error('[Community] Discovery fetch error:', err);
                if (isMounted) {
                    setAvailableUsers([]);
                    setFilteredUsers([]);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsSearching(false);
                    clearTimeout(safetyTimeout);
                }
            });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
        };
    }, [showDiscovery, user?.id]);

    useEffect(() => {
        if (!searchQuery.trim()) { setFilteredUsers(availableUsers); return; }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await chatService.searchUsers(searchQuery, user?.id || '');
                setFilteredUsers(results);
            } catch { } finally { setIsSearching(false); }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, availableUsers, user?.id]);

    const handleCreateChat = async (otherUser: UserPresence) => {
        if (!user) return;
        console.log('[Community] Creating chat with:', otherUser.name);
        try {
            const convId = await chatService.getOrCreateConversation(
                user.id, otherUser.userId, user.name, otherUser.name,
                user.avatar?.image || '', otherUser.avatar
            );
            
            setShowDiscovery(false);
            
            // Try to find in existing list
            const existing = conversations.find(c => c.id === convId);
            if (existing) {
                setSelectedConversation(existing);
            } else {
                const tempConv: Conversation = {
                    id: convId,
                    participants: [user.id, otherUser.userId],
                    participantNames: { [user.id]: user.name, [otherUser.userId]: otherUser.name },
                    participantAvatars: { [user.id]: user.avatar?.image || '', [otherUser.userId]: otherUser.avatar },
                    lastUpdated: new Date().toISOString(),
                    unreadCount: { [user.id]: 0, [otherUser.userId]: 0 }
                };
                setSelectedConversation(tempConv);
            }
        } catch (error: any) { 
            console.error("[Community] Failed to create chat:", error); 
            alert(`Erreur lors de la création du chat: ${error.message || 'Problème de connexion'}`);
        }
    };

    const handleStartBattle = (otherUser: UserPresence) => {
        if (!user) return;
        console.log('[Community] Starting battle with:', otherUser.name);
        const battleId = `battle_${Math.random().toString(36).substring(7)}`;
        const initialState = {
            id: battleId,
            type: 'quiz' as const,
            host: { id: user.id, name: user.name, avatar: user.avatar?.image || '', score: 0 },
            guest: { id: otherUser.userId, name: otherUser.name, avatar: otherUser.avatar, score: 0 },
            status: 'active' as const,
            winnerId: null,
            currentQuestionIndex: 0,
            hostAnswers: [],
            guestAnswers: []
        };
        setActiveBattle(initialState);
        setShowDiscovery(false);
    };

    const totalUnreadMessages = conversations.reduce((acc, conv) => acc + (conv.unreadCount?.[user?.id || ''] || 0), 0);
    const missedCallsCount = calls.filter(c => c.receiverId === user?.id && c.status === 'rejected').length;

    const tabs = [
        { id: 'discussions' as const, label: 'Chat', badge: totalUnreadMessages, icon: MessageSquare },
        { id: 'stories' as const, label: 'Statut', badge: 0, icon: Eye },
        { id: 'feed' as const, label: 'Flux', badge: 0, icon: TrendingUp },
        { id: 'calls' as const, label: 'Appels', badge: missedCallsCount, icon: Phone },
    ];

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
                                        onBattle={(partner) => {
                                            handleStartBattle(partner);
                                        }}
                                        onCall={async (type, partner) => {
                                            if (!user) return;
                                            const { id: callId, roomName } = await chatService.startCall(
                                                user.id, user.name, user.avatar?.image || '',
                                                partner.userId, partner.name, partner.avatar || '', type
                                            );
                                            setCurrentCall({
                                                id: callId, callerId: user.id, callerName: user.name, callerAvatar: user.avatar?.image,
                                                receiverId: partner.userId, receiverName: partner.name, receiverAvatar: partner.avatar,
                                                status: 'calling', type, roomName, timestamp: new Date()
                                            } as any);
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence>
                            {currentCall && <CallOverlay call={currentCall} currentUser={user} onEnd={() => setCurrentCall(null)} />}
                        </AnimatePresence>
                        <AnimatePresence>
                            {activeBattle && (
                                <div className="fixed inset-0 z-[1000]">
                                    <QuizBattle 
                                        initialState={activeBattle} 
                                        isHost={true} 
                                        onClose={() => setActiveBattle(null)} 
                                    />
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            case 'stories': return <StoriesView />;
            case 'feed': return <FeedView />;
            case 'calls': return <CallsView onStartNewCall={() => setShowDiscovery(true)} />;
            default: return <DiscussionsView conversations={[]} onSelectConversation={() => {}} onStartNewChat={() => {}} />;
        }
    };

    return (
        <div className="w-full h-screen flex flex-col bg-[#030712] text-slate-200 overflow-hidden">
            {/* ═══════════ IMMERSIVE HEADER ═══════════ */}
            <div className="relative overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-cyan-500/20 animate-pulse" style={{ animationDuration: '4s' }}></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030712]"></div>

                <div className="relative z-10 pt-6 pb-0 px-5">
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-400 p-[2px] shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                    <div className="w-full h-full rounded-[14px] bg-[#030712] flex items-center justify-center overflow-hidden">
                                        {user?.avatar?.image ? (
                                            <img src={user.avatar.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white font-black text-sm">{user?.name?.[0] || 'U'}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#030712] shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-white tracking-tight leading-none">LEVELMAK</h1>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Crown size={10} className="text-amber-400" />
                                    <span className="text-[9px] font-black text-amber-400/70 uppercase tracking-[0.2em]">Social Hub</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowDiscovery(true)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                                <Plus size={18} />
                            </button>
                            <button className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                                <Search size={18} />
                            </button>
                            <button className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                    </div>

                    {/* ═══════════ GLASSMORPHIC TABS ═══════════ */}
                    <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 backdrop-blur-xl">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 relative py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-1.5
                                    ${activeTab === tab.id
                                        ? 'text-white bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-white/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <tab.icon size={13} />
                                {tab.label}
                                {tab.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full text-white text-[8px] font-black flex items-center justify-center px-1 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════ CONTENT AREA ═══════════ */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {renderActiveView()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ═══════════ DISCOVERY MODAL ═══════════ */}
            <AnimatePresence>
                {showDiscovery && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDiscovery(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-md bg-[#0a0f1a] border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                        >
                            {/* Handle bar */}
                            <div className="flex justify-center py-3">
                                <div className="w-10 h-1 bg-white/20 rounded-full"></div>
                            </div>

                            <div className="px-6 pb-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-black text-white">Nouveau contact</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Trouvez des cerveaux à défier</p>
                                    </div>
                                    <button onClick={() => setShowDiscovery(false)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un pseudo..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.07] transition-all font-bold"
                                        autoFocus
                                    />
                                    {isSearching && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-1 custom-scrollbar">
                                {isSearching ? (
                                    /* Loading skeleton */
                                    <div className="space-y-3 py-4">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                                                <div className="w-12 h-12 rounded-2xl bg-white/[0.06]" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-white/[0.06] rounded-full w-32" />
                                                    <div className="h-2 bg-white/[0.04] rounded-full w-20" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map(u => (
                                        <button
                                            key={u.userId}
                                            onClick={() => handleCreateChat(u)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-white/5 active:scale-[0.98]"
                                        >
                                            <div className="relative shrink-0">
                                                <div className={`w-12 h-12 rounded-2xl overflow-hidden ring-2 transition-all ${u.status === 'online' ? 'ring-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]' : 'ring-white/5'}`}>
                                                    {u.avatar && (u.avatar.startsWith('http') || u.avatar.startsWith('data:')) ? (
                                                        <img src={u.avatar} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-black text-white bg-gradient-to-br from-blue-600 to-purple-600 text-lg">
                                                            {u.name[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0f1a] ${u.status === 'online' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`}></div>
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <h4 className="font-bold text-white text-sm truncate">{u.name}</h4>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest ${u.status === 'online' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                    {u.status === 'online' ? '● En ligne' : '○ Hors ligne'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleCreateChat(u); }}
                                                    className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 active:scale-90 transition-all"
                                                >
                                                    <MessageSquare size={14} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleStartBattle(u); }}
                                                    className="p-2 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 active:scale-90 transition-all"
                                                >
                                                    <Swords size={14} />
                                                </button>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-16 text-center space-y-4">
                                        <div className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center mx-auto border border-white/5">
                                            <Users size={32} className="text-slate-700" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-400">Aucun utilisateur trouvé</p>
                                            <p className="text-xs text-slate-600 mt-1">
                                                {searchQuery.trim() ? 'Essayez un autre pseudo' : 'Aucun profil inscrit pour le moment'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Community;
