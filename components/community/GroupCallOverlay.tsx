import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Users, X, Activity, ShieldCheck, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Call, UserPresence } from '../../services/communityService';

interface GroupCallOverlayProps {
    call: Call;
    currentUser: any;
    onEnd: () => void;
}

const GroupCallOverlay: React.FC<GroupCallOverlayProps> = ({ call, currentUser, onEnd }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [duration, setDuration] = useState(0);
    const [participants, setParticipants] = useState<UserPresence[]>([]);
    const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]); // User IDs currently speaking
    
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const isCaller = call.callerId === currentUser.id;

    useEffect(() => {
        // Fetch participants data
        const fetchParticipants = async () => {
            if (call.participants) {
                const pData = await Promise.all(
                    call.participants.map(id => 
                        new Promise<UserPresence | null>(resolve => {
                            chatService.listenToUserPresence(id, resolve);
                        })
                    )
                );
                setParticipants(pData.filter(p => p !== null) as UserPresence[]);
            }
        };
        fetchParticipants();
    }, [call.participants]);

    useEffect(() => {
        let interval: any;
        if (call.status === 'ongoing') {
            interval = setInterval(() => setDuration(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [call.status]);

    useEffect(() => {
        // Play dial or ring tone
        if (call.status === 'calling') {
            const audio = new Audio(isCaller ? '/sounds/dialing.mpeg' : 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
            audio.loop = true;
            audio.play().catch(e => console.log("Audio blocked", e));
            ringtoneRef.current = audio;
        } else {
            ringtoneRef.current?.pause();
        }
        return () => ringtoneRef.current?.pause();
    }, [call.status, isCaller]);

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAccept = () => chatService.acceptCall(call.id);
    const handleEnd = () => { 
        chatService.endCall(call.id, 'ended', duration); 
        onEnd(); 
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex flex-col bg-[#020617] overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#020617] to-[#020617]"></div>
            
            {/* Animated Background Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-600/20  rounded-full"
                />
                <motion.div 
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        rotate: [0, -90, 0],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 20, repeat: Infinity }}
                    className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-indigo-600/20  rounded-full"
                />
            </div>

            {/* Header */}
            <div className="relative z-10 pt-14 pb-4 px-8 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Appel de Groupe</span>
                    <h2 className="text-xl font-black text-white truncate max-w-[200px]">{call.receiverName || 'Groupe'}</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-white">{formatDuration(duration)}</span>
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <ShieldCheck size={10} /> Sécurisé
                        </span>
                    </div>
                </div>
            </div>

            {/* Participants Grid */}
            <div className="relative z-10 flex-1 flex items-center justify-center p-8">
                <div className={`grid gap-6 w-full max-w-4xl ${participants.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : participants.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {participants.map((p, idx) => {
                        const isSpeaking = activeSpeakers.includes(p.userId);
                        return (
                            <motion.div
                                key={p.userId}
                                layout
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative flex flex-col items-center gap-4"
                            >
                                <div className="relative">
                                    <motion.div
                                        animate={isSpeaking ? { scale: [1, 1.1, 1], opacity: [1, 0.6, 1] } : {}}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className={`w-28 h-28 md:w-36 md:h-36 rounded-[40px] overflow-hidden border-4 transition-all duration-500 ${isSpeaking ? 'border-blue-500 shadow-[0_0_40px_rgba(37,99,235,0.4)]' : 'border-white/10 group-hover:border-white/20'}`}
                                    >
                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl font-black text-white/20">
                                            {p.avatar ? (
                                                <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : p.name[0]}
                                        </div>
                                    </motion.div>
                                    
                                    {/* Voice Activity Indicator */}
                                    {isSpeaking && (
                                        <div className="absolute -bottom-2 right-1/2 translate-x-1/2 px-3 py-1 bg-blue-600 rounded-full text-[8px] font-black text-white uppercase tracking-widest shadow-lg">
                                            En parole
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-white truncate max-w-[120px]">{p.name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Élève</p>
                                </div>
                            </motion.div>
                        );
                    })}
                    
                    {/* Add Member Slot */}
                    {participants.length < 8 && (
                        <div className="flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-all cursor-pointer">
                            <div className="w-28 h-28 md:w-36 md:h-36 rounded-[40px] border-2 border-dashed border-white/20 flex items-center justify-center bg-white/[0.02]">
                                <UserPlus size={32} className="text-slate-400" />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ajouter</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="relative z-10 pb-16 px-8 flex flex-col items-center gap-12">
                {call.status === 'calling' && !isCaller ? (
                    <div className="flex items-center gap-20">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleEnd}
                            className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_4px_30px_rgba(239,68,68,0.4)]"
                        >
                            <PhoneOff size={32} />
                        </motion.button>
                        <motion.button
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                            onClick={handleAccept}
                            className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_4px_30px_rgba(52,211,153,0.4)]"
                        >
                            <Phone size={32} />
                        </motion.button>
                    </div>
                ) : (
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${isMuted ? 'bg-white text-slate-900 shadow-xl' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        <button 
                            onClick={handleEnd}
                            className="w-20 h-20 rounded-[32px] bg-red-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(239,68,68,0.3)] hover:bg-red-400 transition-all"
                        >
                            <PhoneOff size={28} />
                        </button>
                        <button 
                            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                            className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${isSpeakerOn ? 'bg-white text-slate-900 shadow-xl' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
                        </button>
                    </div>
                )}
                
                <div className="flex items-center gap-2 opacity-30">
                    <Activity size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {call.status === 'calling' ? 'Appel en cours...' : 'Appel en direct'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

export default GroupCallOverlay;
