import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Search, Plus, X, Camera, MoreVertical, Swords, Zap, Users, Sparkles, TrendingUp, Crown, Shield, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { chatService, Conversation, UserPresence, Call } from '../services/communityService';
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
        <div className="w-full h-screen flex flex-col bg-[#020617] text-slate-200 overflow-hidden font-sans">
            {/* ═══════════ PREMIUM IMMERSIVE HEADER ═══════════ */}
            <div className="relative pt-8 pb-4 px-6 overflow-hidden">
                {/* Background effects */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col gap-6">
                    {/* Top Row: User & Title */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <motion.div 
                                whileHover={{ scale: 1.05 }}
                                className="relative group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-[2px] shadow-[0_8px_20px_rgba(37,99,235,0.2)]">
                                    <div className="w-full h-full rounded-[14px] bg-[#020617] flex items-center justify-center overflow-hidden">
                                        {user?.avatar?.image ? (
                                            <img src={user.avatar.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white font-black text-base">{user?.name?.[0] || 'U'}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-[3px] border-[#020617] shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                            </motion.div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-black text-white tracking-tight uppercase">Levelmak</h1>
                                    <div className="px-1.5 py-0.5 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center gap-1">
                                        <Shield size={10} className="text-blue-400" />
                                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Social</span>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-0.5">Community Hub</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setShowDiscovery(true)}
                                className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/30 transition-all shadow-lg"
                            >
                                <Plus size={20} />
                            </motion.button>
                            <motion.button 
                                whileTap={{ scale: 0.9 }}
                                className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg"
                            >
                                <Search size={20} />
                            </motion.button>
                        </div>
                    </div>

                    {/* ═══════════ NAVIGATION PILLS ═══════════ */}
                    <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] rounded-[22px] p-1.5 backdrop-blur-3xl shadow-inner-white">
                        {tabs.map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 relative py-3 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2 overflow-hidden
                                        ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-400'}`}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="tab-bg"
                                            className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_4px_15px_rgba(37,99,235,0.4)]"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <tab.icon size={14} className="relative z-10" strokeWidth={isActive ? 3 : 2} />
                                    <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                                    
                                    {tab.badge > 0 && (
                                        <span className={`relative z-10 min-w-[18px] h-[18px] rounded-full text-[9px] font-black flex items-center justify-center px-1 shadow-lg
                                            ${isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white animate-pulse'}`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ═══════════ CONTENT AREA ═══════════ */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full"
                    >
                        {renderActiveView()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ═══════════ DISCOVERY MODAL (Nouveau Contact) ═══════════ */}
            <AnimatePresence>
                {showDiscovery && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDiscovery(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh]"
                        >
                            {/* Decorative line */}
                            <div className="flex justify-center pt-4 pb-2">
                                <div className="w-12 h-1.5 bg-white/10 rounded-full"></div>
                            </div>

                            <div className="px-8 pt-4 pb-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black text-white tracking-tight">Nouveau contact</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Recherche par pseudo ou numéro</p>
                                        </div>
                                    </div>
                                    <motion.button 
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setShowDiscovery(false)} 
                                        className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                                    >
                                        <X size={22} />
                                    </motion.button>
                                </div>
                                
                                <div className="relative group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Pseudo ou 07 45 ..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-[22px] py-4 pl-14 pr-6 text-base text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.05] transition-all font-bold shadow-inner"
                                        autoFocus
                                    />
                                    {isSearching && (
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-2 custom-scrollbar">
                                {isSearching ? (
                                    /* Premium Loading Skeleton */
                                    <div className="space-y-4 px-2">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                                                <div className="w-14 h-14 rounded-2xl bg-white/[0.05]" />
                                                <div className="flex-1 space-y-3">
                                                    <div className="h-4 bg-white/[0.05] rounded-full w-40" />
                                                    <div className="h-2.5 bg-white/[0.03] rounded-full w-24" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredUsers.length > 0 ? (
                                    <div className="space-y-1">
                                        {filteredUsers.map(u => (
                                            <motion.button
                                                key={u.userId}
                                                whileHover={{ x: 4 }}
                                                onClick={() => handleCreateChat(u)}
                                                className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] rounded-[24px] transition-all group border border-transparent hover:border-white/5 active:scale-[0.98]"
                                            >
                                                <div className="relative shrink-0">
                                                    <div className={`w-14 h-14 rounded-2xl overflow-hidden ring-2 transition-all duration-500 ${u.status === 'online' ? 'ring-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'ring-white/5'}`}>
                                                        {u.avatar && (u.avatar.startsWith('http') || u.avatar.startsWith('data:')) ? (
                                                            <img src={u.avatar} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center font-black text-white bg-gradient-to-br from-blue-600 to-indigo-600 text-xl">
                                                                {u.name[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {u.status === 'online' && (
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#0f172a] bg-emerald-500"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-black text-white text-[15px] truncate">{u.name}</h4>
                                                        {u.status === 'online' && <Sparkles size={12} className="text-blue-400" />}
                                                    </div>
                                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${u.status === 'online' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                        {u.status === 'online' ? 'Disponible' : 'Hors ligne'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleCreateChat(u); }}
                                                        className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white active:scale-90 transition-all flex items-center justify-center"
                                                    >
                                                        <MessageSquare size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleStartBattle(u); }}
                                                        className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white active:scale-90 transition-all flex items-center justify-center"
                                                    >
                                                        <Swords size={18} />
                                                    </button>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center space-y-6">
                                        <div className="relative mx-auto w-24 h-24">
                                            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
                                            <div className="relative w-full h-full bg-white/[0.02] rounded-[32px] flex items-center justify-center border border-white/10 shadow-2xl">
                                                <Users size={36} className="text-slate-700" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-lg font-black text-white">Aucun résultat</p>
                                            <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed font-bold uppercase tracking-[0.1em]">
                                                {searchQuery.trim() ? "Nous n'avons trouvé personne avec ces critères" : "Invite tes amis à rejoindre Levelmak !"}
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
