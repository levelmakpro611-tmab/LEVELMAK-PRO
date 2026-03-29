import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Phone, Video, MoreVertical, Smile, Paperclip, Check, Camera, Mic, Swords, Trophy, Zap, Shield, User2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Conversation, UserPresence } from '../../services/firebase-chat';

interface ChatDetailViewProps {
    conversation: Conversation;
    currentUser: any;
    onBack: () => void;
    onCall?: (type: 'audio' | 'video', partner: UserPresence) => void;
    onBattle?: (partner: UserPresence) => void;
}

const ChatDetailView: React.FC<ChatDetailViewProps> = ({ conversation, currentUser, onBack, onCall, onBattle }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [partnerPresence, setPartnerPresence] = useState<UserPresence | null>(null);
    const [showActions, setShowActions] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const otherParticipantId = conversation.participants.find(p => p !== currentUser.id);

    useEffect(() => {
        if (!conversation.id) return;
        const unsubscribe = chatService.listenToMessages(conversation.id, setMessages);
        chatService.markAsRead(conversation.id, currentUser.id);
        let unsubPresence: any;
        if (otherParticipantId) {
            unsubPresence = chatService.listenToUserPresence(otherParticipantId, setPartnerPresence);
        }
        return () => { unsubscribe(); if (unsubPresence) unsubPresence(); };
    }, [conversation.id, currentUser.id, otherParticipantId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (imageUrl?: string) => {
        if (!inputText.trim() && !imageUrl) return;
        try {
            await chatService.sendMessage(conversation.id, currentUser.id, currentUser.name, inputText.trim(), imageUrl);
            setInputText('');
        } catch (error) { console.error("Failed to send message", error); }
    };

    const handleBattleInvite = async () => {
        if (!partnerPresence) return;
        try {
            await chatService.sendMessage(
                conversation.id, currentUser.id, currentUser.name,
                `⚔️ DÉFI QUIZ BATTLE ⚔️\n${currentUser.name} te lance un défi ! Clique pour accepter et prouver ta valeur.`
            );
            onBattle?.(partnerPresence);
        } catch (error) { console.error('Failed to send battle invite', error); }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const url = await chatService.uploadChatMessageImage(file, currentUser.id);
            await handleSend(url);
        } catch (error) { console.error("Upload failed", error); }
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleMicPress = () => {
        setIsRecording(true);
        // Simulation of voice recording
        setTimeout(() => {
            setIsRecording(false);
            alert("Enregistrement vocal : Cette fonctionnalité sera bientôt disponible avec stockage cloud !");
        }, 2000);
    };

    const getOtherParticipantName = () => conversation.groupName || Object.values(conversation.participantNames || {}).find(name => name !== currentUser.name) || 'Contact';
    const getOtherParticipantAvatar = () => Object.values(conversation.participantAvatars || {}).find(avatar => avatar !== currentUser.avatar?.image) as string;

    const isBattleMessage = (text: string) => text?.includes('DÉFI QUIZ BATTLE');

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#030712]">
            {/* ═══════════ PREMIUM HEADER ═══════════ */}
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent"></div>
                <div className="relative z-10 px-2 py-3 flex items-center justify-between border-b border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={onBack}
                            className="p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90"
                        >
                            <ArrowLeft size={22} />
                        </button>
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowActions(!showActions)}>
                            <div className="relative">
                                <div className="w-10 h-10 rounded-2xl overflow-hidden ring-2 ring-white/10">
                                    {(partnerPresence?.avatar && (partnerPresence.avatar.startsWith('http') || partnerPresence.avatar.startsWith('data:'))) || getOtherParticipantAvatar() ? (
                                        <img src={partnerPresence?.avatar || getOtherParticipantAvatar()} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-black text-white bg-gradient-to-br from-blue-600 to-purple-600">
                                            {getOtherParticipantName()[0]}
                                        </div>
                                    )}
                                </div>
                                {partnerPresence?.status === 'online' && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#030712] shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                                    />
                                )}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-[15px] font-bold text-white truncate leading-tight">
                                    {partnerPresence?.name || getOtherParticipantName()}
                                </h3>
                                <p className={`text-[10px] font-bold leading-tight ${partnerPresence?.status === 'online' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {partnerPresence?.status === 'online' ? '● En ligne' : '○ Hors ligne'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => partnerPresence && onCall?.('video', partnerPresence)}
                            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90"
                        >
                            <Video size={19} />
                        </button>
                        <button
                            onClick={() => partnerPresence && onCall?.('audio', partnerPresence)}
                            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90"
                        >
                            <Phone size={19} />
                        </button>
                        <button
                            onClick={handleBattleInvite}
                            className="p-2.5 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-xl transition-all active:scale-90 relative"
                            title="Lancer un Défi"
                        >
                            <Swords size={19} />
                        </button>
                        <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90">
                            <MoreVertical size={19} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ═══════════ MESSAGES ═══════════ */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar relative">
                {/* Subtle pattern */}
                <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '32px 32px'
                }}></div>

                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    const showDate = idx === 0 || (
                        msg.timestamp && messages[idx - 1].timestamp &&
                        new Date(msg.timestamp).toDateString() !== new Date(messages[idx - 1].timestamp).toDateString()
                    );
                    const isBattle = isBattleMessage(msg.text);

                    return (
                        <React.Fragment key={msg.id || idx}>
                            {showDate && (
                                <div className="flex justify-center my-5">
                                    <div className="bg-white/[0.04] backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border border-white/[0.06]">
                                        {new Date(msg.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            )}

                            {/* Call message */}
                            {msg.type === 'call' ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[75%] p-3 rounded-2xl border ${isMe ? 'bg-blue-500/5 border-blue-500/10 rounded-tr-sm' : 'bg-white/[0.03] border-white/[0.06] rounded-tl-sm'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl ${isMe ? 'bg-blue-500/10' : 'bg-white/5'} flex items-center justify-center`}>
                                                {msg.callType === 'video' ? <Video size={18} className="text-blue-400" /> : <Phone size={18} className="text-emerald-400" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[13px] font-semibold text-white">{msg.callType === 'video' ? 'Appel vidéo' : 'Appel vocal'}</p>
                                                <p className="text-[11px] text-slate-500">{msg.callStatus === 'rejected' ? (isMe ? 'Sans réponse' : 'Appel manqué') : 'Terminé'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : isBattle ? (
                                /* ═══ BATTLE INVITE MESSAGE ═══ */
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex justify-center my-3"
                                >
                                    <div className="relative max-w-[85%] overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-600/10 via-amber-500/5 to-transparent shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                                        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'rgba(255,255,255,0.03)\'/%3E%3C/svg%3E')]"></div>
                                        <div className="relative p-5 text-center space-y-3">
                                            <div className="flex justify-center">
                                                <motion.div
                                                    animate={{ rotate: [0, 5, -5, 0] }}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                    className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.3)]"
                                                >
                                                    <Swords size={28} className="text-white" />
                                                </motion.div>
                                            </div>
                                            <div>
                                                <h4 className="text-[15px] font-black text-white uppercase tracking-wider">Quiz Battle</h4>
                                                <p className="text-[12px] text-orange-300/60 font-medium mt-1">
                                                    {isMe ? 'Tu as lancé un défi !' : `${msg.senderName} te défie !`}
                                                </p>
                                            </div>
                                            {!isMe && (
                                                <button 
                                                    onClick={() => partnerPresence && onBattle?.(partnerPresence)}
                                                    className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    ⚔️ Accepter le Défi
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex justify-end px-4 pb-2">
                                            <span className="text-[8px] text-orange-300/30 font-bold">
                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                /* ═══ NORMAL MESSAGE ═══ */
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.97, y: 4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative group mb-0.5`}
                                >
                                    <div className={`max-w-[82%] min-w-[80px] relative overflow-hidden
                                        ${isMe 
                                            ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/15 rounded-2xl rounded-tr-sm' 
                                            : 'bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm'}`
                                    }>
                                        {msg.attachments?.[0] && (
                                            <div className="rounded-t-xl overflow-hidden bg-black/30">
                                                <img src={msg.attachments[0]} alt="" className="max-w-full h-auto object-cover max-h-[400px]" />
                                            </div>
                                        )}
                                        <div className="px-3 py-2">
                                            {msg.text && (
                                                <p className="text-[14px] leading-relaxed text-white/90 whitespace-pre-wrap pb-3.5">
                                                    {msg.text}
                                                </p>
                                            )}
                                            <div className="absolute bottom-1.5 right-2.5 flex items-center gap-1">
                                                <span className="text-[8px] text-white/25 font-bold tracking-tight">
                                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                                {isMe && <Check size={11} className="text-blue-400/60" />}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* ═══════════ INPUT BAR ═══════════ */}
            <div className="p-3 pb-6 relative z-10">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                    <div className="flex-1 bg-white/[0.04] rounded-[1.5rem] flex items-end border border-white/[0.08] backdrop-blur-sm overflow-hidden">
                        <button className="p-3 text-slate-500 hover:text-white transition-all shrink-0">
                            <Smile size={22} />
                        </button>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Message"
                            rows={Math.min(5, inputText.split('\n').length)}
                            className="flex-1 bg-transparent border-none py-3 px-1 text-[14px] text-white placeholder:text-slate-600 outline-none resize-none font-medium leading-tight max-h-32"
                        />
                        <div className="flex items-center gap-0.5 p-1 pr-2 shrink-0">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-slate-500 hover:text-white transition-all active:scale-90"
                            >
                                <Paperclip size={20} className="-rotate-45" />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                            {!inputText.trim() && (
                                <button className="p-2 text-slate-500 hover:text-white transition-all active:scale-90">
                                    <Camera size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => inputText.trim() ? handleSend() : handleMicPress()}
                        className={`w-[48px] h-[48px] rounded-2xl flex items-center justify-center shadow-lg transition-all flex-shrink-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-[0_4px_15px_rgba(99,102,241,0.3)] ${isRecording ? 'animate-pulse ring-4 ring-red-500/50' : ''}`}
                    >
                        {inputText.trim() ? <Send size={20} className="ml-0.5" /> : (isRecording ? <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" /> : <Mic size={20} />)}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default ChatDetailView;
