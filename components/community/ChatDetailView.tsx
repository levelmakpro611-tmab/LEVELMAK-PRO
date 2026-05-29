import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Phone, Video, MoreVertical, Smile, Paperclip, Check, Camera, Mic, Swords, Trophy, Zap, Shield, User2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Conversation, UserPresence } from '../../services/communityService';

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
            const url = await chatService.uploadMedia(file, currentUser.id, 'chats');
            await handleSend(url);
        } catch (error) { console.error("Upload failed", error); }
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleMicPress = () => {
        setIsRecording(true);
        setTimeout(() => setIsRecording(false), 2000);
    };

    const getOtherParticipantName = () => conversation.groupName || Object.values(conversation.participantNames || {}).find(name => name !== currentUser.name) || 'Contact';
    const getOtherParticipantAvatar = () => Object.values(conversation.participantAvatars || {}).find(avatar => avatar !== currentUser.avatar?.image) as string;

    const isBattleMessage = (text: string) => text?.includes('DÉFI QUIZ BATTLE');

    // Premium status logic matching DiscussionsView
    const getStudyStatus = (convId: string) => {
        const statuses = [
            { ring: 'ring-blue-500/40', glow: 'shadow-[0_0_20px_rgba(37,99,235,0.3)]', label: '📖 Focus', textColor: 'text-blue-400', bg: 'bg-blue-500/10' },
            { ring: 'ring-orange-500/40', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]', label: '⚔️ Battle', textColor: 'text-orange-400', bg: 'bg-orange-500/10' },
            { ring: 'ring-emerald-500/40', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]', label: '🟢 Actif', textColor: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { ring: 'ring-purple-500/40', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]', label: '✨ Créatif', textColor: 'text-purple-400', bg: 'bg-purple-500/10' },
        ];
        const hash = Math.abs((convId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0));
        return statuses[hash % statuses.length];
    };

    const status = getStudyStatus(conversation.id);

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#020617]">
            {/* ═══════════ PREMIUM HEADER ═══════════ */}
            <header className="relative z-50">
                <div className="absolute inset-0 bg-white/[0.01] backdrop-blur-2xl border-b border-white/[0.08]"></div>
                <div className="relative px-3 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                        >
                            <ArrowLeft size={22} strokeWidth={2.5} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-[18px] overflow-hidden ring-2 transition-all duration-500 ${status.ring} ${status.glow}`}>
                                    {(partnerPresence?.avatar && (partnerPresence.avatar.startsWith('http') || partnerPresence.avatar.startsWith('data:'))) || getOtherParticipantAvatar() ? (
                                        <img src={partnerPresence?.avatar || getOtherParticipantAvatar()} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-black text-white bg-gradient-to-br from-blue-600 to-indigo-600 text-lg">
                                            {getOtherParticipantName()[0]}
                                        </div>
                                    )}
                                </div>
                                {partnerPresence?.status === 'online' && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }} 
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-[#020617] shadow-xl"
                                    />
                                )}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base font-black text-white truncate tracking-tight">{partnerPresence?.name || getOtherParticipantName()}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${status.textColor} ${status.bg} border border-white/5`}>
                                        {status.label.split(' ')[1]}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${partnerPresence?.status === 'online' ? 'text-emerald-500/60' : 'text-slate-600'}`}>
                                        {partnerPresence?.status === 'online' ? 'Connecté' : 'Hors ligne'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => partnerPresence && onCall?.('video', partnerPresence)}
                            className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600/10 rounded-2xl transition-all"
                        >
                            <Video size={20} />
                        </button>
                        <button
                            onClick={() => partnerPresence && onCall?.('audio', partnerPresence)}
                            className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-600/10 rounded-2xl transition-all"
                        >
                            <Phone size={20} />
                        </button>
                        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                        <button className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ═══════════ MESSAGES ═══════════ */}
            <div className="flex-1 overflow-y-auto px-4 py-8 space-y-4 custom-scrollbar relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed opacity-[0.98]">
                
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
                                <div className="flex justify-center my-10">
                                    <div className="bg-white/[0.04] backdrop-blur-3xl px-6 py-2 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] border border-white/[0.08] shadow-sm">
                                        {new Date(msg.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            )}

                            {isBattle ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="flex justify-center my-6"
                                >
                                    <div className="relative max-w-[90%] w-full overflow-hidden rounded-[40px] border border-orange-500/20 bg-gradient-to-br from-orange-600/15 via-black/40 to-transparent shadow-[0_32px_64px_-12px_rgba(249,115,22,0.2)] backdrop-blur-xl">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                            <Swords size={120} />
                                        </div>
                                        <div className="relative p-8 text-center space-y-6">
                                            <div className="flex justify-center">
                                                <motion.div
                                                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                                                    transition={{ repeat: Infinity, duration: 3 }}
                                                    className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-[28px] flex items-center justify-center shadow-[0_12px_44px_rgba(249,115,22,0.4)]"
                                                >
                                                    <Swords size={36} className="text-white" />
                                                </motion.div>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-xl font-black text-white uppercase tracking-[0.2em]">Quiz Battle</h4>
                                                <p className="text-sm text-orange-200/60 font-black uppercase tracking-widest leading-relaxed px-4">
                                                    {isMe ? 'DÉFI ENVOYÉ' : `${msg.senderName.split(' ')[0]} souhaite t'affronter !`}
                                                </p>
                                            </div>
                                            {!isMe && (
                                                <button 
                                                    onClick={() => partnerPresence && onBattle?.(partnerPresence)}
                                                    className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Accepter le Défi
                                                </button>
                                            )}
                                        </div>
                                        <div className="px-8 pb-4 flex justify-end">
                                            <span className="text-[10px] text-white/20 font-black tracking-widest">
                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}
                                >
                                    <div className={`relative max-w-[85%] group
                                        ${isMe ? 'items-end' : 'items-start'}`
                                    }>
                                        <div className={`p-4 rounded-[28px] shadow-sm backdrop-blur-md border transition-all duration-300
                                            ${isMe 
                                                ? 'bg-blue-600/10 border-blue-500/20 rounded-tr-sm group-hover:bg-blue-600/20' 
                                                : 'bg-white/[0.04] border-white/[0.08] rounded-tl-sm group-hover:bg-white/[0.06]'}`
                                        }>
                                            {msg.attachments?.[0] && (
                                                <div className="rounded-[20px] overflow-hidden mb-3 shadow-inner bg-black/40">
                                                    <img src={msg.attachments[0]} alt="" className="max-w-full h-auto object-cover max-h-[400px]" />
                                                </div>
                                            )}
                                            {msg.text && (
                                                <p className="text-[15px] leading-relaxed text-slate-200 font-medium whitespace-pre-wrap">
                                                    {msg.text}
                                                </p>
                                            )}
                                            <div className="mt-2 flex items-center justify-end gap-1.5 opacity-40">
                                                <span className="text-[9px] font-black uppercase tracking-tighter">
                                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                                {isMe && <Check size={12} strokeWidth={3} className="text-blue-500" />}
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
            <div className="p-6 relative z-50">
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none"></div>
                
                <div className="relative flex items-end gap-4 max-w-5xl mx-auto">
                    <div className="flex-1 bg-white/[0.04] rounded-[32px] flex items-end border border-white/[0.08] backdrop-blur-3xl shadow-2xl overflow-hidden focus-within:border-blue-500/30 transition-all">
                        <button className="p-4 text-slate-500 hover:text-white transition-all group">
                            <Smile size={24} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Écris ton message..."
                            rows={1}
                            className="flex-1 bg-transparent border-none py-4 px-1 text-sm text-white placeholder:text-slate-600 outline-none resize-none font-bold leading-tight max-h-40 custom-scrollbar"
                            style={{ height: 'auto', minHeight: '56px' }}
                        />
                        <div className="flex items-center gap-1 p-2 shrink-0">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-full"
                            >
                                <Paperclip size={20} className="-rotate-45" />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                            <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-full">
                                <Camera size={20} />
                            </button>
                        </div>
                    </div>
                    
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => inputText.trim() ? handleSend() : handleMicPress()}
                        className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-[0_12px_24px_-8px_rgba(37,99,235,0.6)] transition-all bg-blue-600 text-white ${isRecording ? 'animate-pulse bg-red-500 shadow-red-500/50' : ''}`}
                    >
                        {inputText.trim() ? <Send size={22} className="ml-0.5" /> : (isRecording ? <div className="w-4 h-4 bg-white rounded-full animate-ping" /> : <Mic size={22} />)}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};


export default ChatDetailView;
