import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Phone, Video, MoreVertical, Smile, Paperclip, Check, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Conversation, UserPresence } from '../../services/firebase-chat';

interface ChatDetailViewProps {
    conversation: Conversation;
    currentUser: any;
    onBack: () => void;
    onCall?: (type: 'audio' | 'video', partner: UserPresence) => void;
}

const ChatDetailView: React.FC<ChatDetailViewProps> = ({ conversation, currentUser, onBack, onCall }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [partnerPresence, setPartnerPresence] = useState<UserPresence | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const otherParticipantId = conversation.participants.find(p => p !== currentUser.id);

    useEffect(() => {
        if (!conversation.id) return;

        const unsubscribe = chatService.listenToMessages(conversation.id, (newMessages) => {
            setMessages(newMessages);
        });

        // Mark as read
        chatService.markAsRead(conversation.id, currentUser.id);

        // Listen to partner presence
        let unsubPresence: any;
        if (otherParticipantId) {
            unsubPresence = chatService.listenToUserPresence(otherParticipantId, (presence) => {
                setPartnerPresence(presence);
            });
        }

        return () => {
            unsubscribe();
            if (unsubPresence) unsubPresence();
        };
    }, [conversation.id, currentUser.id, otherParticipantId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        chatService.sendMessage(
            conversation.id,
            currentUser.id,
            currentUser.name,
            inputText.trim()
        );
        setInputText('');
    };

    const getOtherParticipantName = () => {
        return conversation.groupName || Object.values(conversation.participantNames || {}).find(name => name !== currentUser.name) || 'Contact';
    };

    const getOtherParticipantAvatar = () => {
        return Object.values(conversation.participantAvatars || {}).find(avatar => avatar !== currentUser.avatar?.image) as string;
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[hsl(var(--background))] animate-in slide-in-from-right duration-300">
            {/* WhatsApp Header */}
            <header className="p-2 py-3 bg-[hsl(var(--sidebar))] border-b border-white/5 flex items-center justify-between sticky top-0 shadow-lg">
                <div className="flex items-center gap-1">
                    <button
                        onClick={onBack}
                        className="p-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"
                    >
                        <ArrowLeft size={24} />
                    </button>

                    <div className="flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-white/5 overflow-hidden">
                                {partnerPresence?.avatar || getOtherParticipantAvatar() ? (
                                    <img
                                        src={partnerPresence?.avatar || getOtherParticipantAvatar()}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-white bg-primary">
                                        {getOtherParticipantName()[0]}
                                    </div>
                                )}
                            </div>
                            {partnerPresence?.online && (
                                <motion.div
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-[hsl(var(--sidebar))] shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                ></motion.div>
                            )}
                        </div>

                        <div className="min-w-0 flex flex-col">
                            <h3 className="text-[15px] font-bold text-white truncate leading-tight">
                                {partnerPresence?.name || getOtherParticipantName()}
                            </h3>
                            <p className={`text-[11px] font-bold leading-tight transition-colors duration-300 ${partnerPresence?.online ? 'text-blue-400' : 'text-slate-500'}`}>
                                {partnerPresence?.online ? 'En ligne' : 'Inactif'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => partnerPresence && onCall?.('video', partnerPresence)}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"
                    >
                        <Video size={20} />
                    </button>
                    <button
                        onClick={() => partnerPresence && onCall?.('audio', partnerPresence)}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"
                    >
                        <Phone size={20} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </header>

            {/* Messages Area with WhatsApp-style Doodle Pattern Background */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative">
                {/* Background Pattern Layer */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] invert"></div>
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;

                    // Call message
                    if (msg.type === 'call') {
                        const isMeCaller = msg.callerId === currentUser.id;
                        const isMissed = msg.callStatus === 'rejected' && !isMeCaller;
                        const isOutgoing = isMeCaller;

                        let durationText = '';
                        if (msg.callStatus === 'ended' && msg.callDuration) {
                            const mins = Math.floor(msg.callDuration / 60);
                            const secs = msg.callDuration % 60;
                            if (mins > 0) {
                                durationText = `${mins} minute${mins > 1 ? 's' : ''}`;
                            } else {
                                durationText = `${secs} seconde${secs > 1 ? 's' : ''}`;
                            }
                        } else if (msg.callStatus === 'rejected') {
                            durationText = isMeCaller ? 'Aucune réponse' : 'Appel manqué';
                        }

                        const CallIcon = msg.callType === 'video' ? Video : Phone;
                        const iconColor = isMissed ? 'text-red-500' : isOutgoing ? 'text-green-500' : 'text-blue-400';

                        return (
                            <motion.div
                                key={msg.id || idx}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm relative ${isMe ? 'bg-primary/10 border border-primary/20 rounded-tr-none' : 'bg-[hsl(var(--card))] border border-white/5 rounded-tl-none'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full ${isMe ? 'bg-primary/20' : 'bg-white/5'} flex items-center justify-center`}>
                                            <CallIcon size={18} className={iconColor} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[14px] font-semibold text-white">
                                                {msg.callType === 'video' ? 'Appel vidéo' : 'Appel vocal'}
                                            </p>
                                            {durationText && (
                                                <p className={`text-[12px] ${isMissed ? 'text-red-400' : 'text-slate-400'}`}>
                                                    {durationText}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        <span className="text-[9px] text-slate-500 font-medium">
                                            {msg.timestamp?.toDate?.().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) || '...'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    }

                    // Regular text message
                    return (
                        <motion.div
                            key={msg.id || idx}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm relative ${isMe ? 'bg-primary/20 text-white rounded-tr-none border border-primary/20' : 'bg-[hsl(var(--card))] text-white rounded-tl-none border border-white/5'}`}>
                                <p className="text-[14px] leading-relaxed">{msg.text}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className="text-[9px] text-slate-500 font-medium">
                                        {msg.timestamp?.toDate?.().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) || '...'}
                                    </span>
                                    {isMe && <Check size={12} className="text-primary" />}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[hsl(var(--sidebar))] border-t border-white/5">
                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <div className="flex-1 bg-[hsl(var(--card))] rounded-2xl flex items-center px-4 py-1 border border-transparent focus-within:border-primary/30 transition-all">
                        <button className="p-2 text-slate-400 hover:text-white"><Smile size={22} /></button>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Écrire un message..."
                            className="flex-1 bg-transparent border-none py-3 px-2 text-sm text-white placeholder:text-slate-500 outline-none"
                        />
                        <button className="p-2 text-slate-400 hover:text-white"><Paperclip size={22} /></button>
                    </div>
                    <button
                        onClick={handleSend}
                        className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-glow active:scale-90 transition-all"
                    >
                        <Send size={22} className="ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatDetailView;
