import React, { useState, useEffect } from 'react';
import { Phone, Video, X, Check, PhoneOff, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Call } from '../services/firebase-chat';

interface CallHandlerProps {
    currentUserId: string;
    activeCall: Call | null;
    onClose: () => void;
}

const CallHandler: React.FC<CallHandlerProps> = ({ currentUserId, activeCall, onClose }) => {
    const [jitsiApi, setJitsiApi] = useState<any>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        // Inject Jitsi script if not present
        if (!document.getElementById('jitsi-script')) {
            const script = document.createElement('script');
            script.id = 'jitsi-script';
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            document.body.appendChild(script);
        }

        if (activeCall?.status === 'ongoing' && !jitsiApi) {
            const loadJitsi = () => {
                // @ts-ignore
                if (window.JitsiMeetExternalAPI) {
                    const domain = 'meet.jit.si';
                    const options = {
                        roomName: activeCall.roomName,
                        width: '100%',
                        height: '100%',
                        parentNode: document.querySelector('#jitsi-container'),
                        configOverwrite: {
                            startWithAudioMuted: false,
                            startWithVideoMuted: activeCall.type === 'audio',
                            prejoinPageEnabled: false
                        },
                        interfaceConfigOverwrite: {
                            TOOLBAR_BUTTONS: [
                                'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                                'fadedbackground', 'hangup', 'profile', 'chat', 'recording',
                                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                                'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                                'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                                'security'
                            ],
                        }
                    };
                    // @ts-ignore
                    const api = new window.JitsiMeetExternalAPI(domain, options);

                    api.addEventListener('videoConferenceLeft', () => {
                        chatService.endCall(activeCall.id);
                        onClose();
                    });

                    setJitsiApi(api);
                } else {
                    setTimeout(loadJitsi, 500);
                }
            };
            loadJitsi();
        }

        return () => {
            if (jitsiApi) {
                jitsiApi.dispose();
            }
        };
    }, [activeCall, jitsiApi, onClose]);

    const handleAccept = () => {
        if (activeCall) {
            chatService.acceptCall(activeCall.id);
        }
    };

    const handleReject = () => {
        if (activeCall) {
            chatService.endCall(activeCall.id, 'rejected');
            onClose();
        }
    };

    const handleHangup = () => {
        if (activeCall) {
            chatService.endCall(activeCall.id);
            onClose();
        }
    };

    if (!activeCall) return null;

    return (
        <AnimatePresence>
            {/* Modification for Incoming Call */}
            {activeCall.status === 'calling' && activeCall.receiverId === currentUserId && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
                    className="fixed bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-96 glass rounded-[2.5rem] border border-white/20 shadow-premium p-8 z-[100] flex flex-col items-center gap-6"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-[1.5rem] flex items-center justify-center text-white text-3xl font-bold animate-float ring-4 ring-primary/20">
                        {activeCall.callerName.charAt(0)}
                    </div>

                    <div className="text-center">
                        <h3 className="text-xl font-display font-black text-white">Appel {activeCall.type === 'video' ? 'Vidéo' : 'Audio'}...</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">{activeCall.callerName} t'appelle</p>
                    </div>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={handleReject}
                            className="flex-1 py-4 bg-danger/20 hover:bg-danger text-danger hover:text-white rounded-2xl transition-all flex items-center justify-center gap-2 group"
                        >
                            <PhoneOff size={20} className="group-hover:rotate-12 transition-transform" />
                            <span className="font-black uppercase tracking-widest text-[10px]">Refuser</span>
                        </button>
                        <button
                            onClick={handleAccept}
                            className="flex-1 py-4 bg-success/20 hover:bg-success text-success hover:text-white rounded-2xl transition-all flex items-center justify-center gap-2 group animate-pulse-glow shadow-glow"
                        >
                            {activeCall.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                            <span className="font-black uppercase tracking-widest text-[10px]">Répondre</span>
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Ongoing Call UI */}
            {activeCall.status === 'ongoing' && (
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        width: isMinimized ? '300px' : '100%',
                        height: isMinimized ? '200px' : '100%',
                        top: isMinimized ? 'auto' : 0,
                        bottom: isMinimized ? '2rem' : 0,
                        right: isMinimized ? '2rem' : 0,
                        left: isMinimized ? 'auto' : 0,
                        borderRadius: isMinimized ? '2rem' : 0
                    }}
                    className={`fixed z-[100] bg-slate-900 overflow-hidden shadow-2xl border ${isMinimized ? 'border-white/10' : 'border-none'}`}
                >
                    <div className="absolute top-6 right-6 z-[110] flex gap-2">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all shadow-lg"
                        >
                            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                        </button>
                        <button
                            onClick={handleHangup}
                            className="p-3 bg-danger/80 hover:bg-danger text-white rounded-xl backdrop-blur-md transition-all shadow-lg"
                        >
                            <PhoneOff size={18} />
                        </button>
                    </div>

                    {!isMinimized && (
                        <div className="absolute top-6 left-6 z-[110] p-4 glass rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold">
                                {activeCall.callerId === currentUserId ? activeCall.receiverId.charAt(0) : activeCall.callerName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Conversation en cours</p>
                                <p className="text-primary-light text-[10px] font-black uppercase tracking-widest">Sécurisé & Chiffré</p>
                            </div>
                        </div>
                    )}

                    <div id="jitsi-container" className="w-full h-full" />
                </motion.div>
            )}

            {/* Outgoing Call UI (Caller sees this while waiting) */}
            {activeCall.status === 'calling' && activeCall.callerId === currentUserId && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
                >
                    <div className="glass md:w-96 rounded-[3rem] border border-white/10 p-10 flex flex-col items-center gap-8 shadow-premium relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 -z-10"></div>

                        <div className="relative">
                            <div className="w-32 h-32 bg-gradient-to-br from-primary to-secondary rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black shadow-glow animate-float">
                                ?
                            </div>
                            <div className="absolute -inset-4 border-2 border-primary/20 rounded-[3rem] animate-ping-slow"></div>
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-display font-black text-white">Appel en cours...</h3>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">En attente de réponse</p>
                        </div>

                        <button
                            onClick={handleHangup}
                            className="w-full py-5 bg-danger/20 hover:bg-danger text-danger hover:text-white rounded-[1.5rem] transition-all flex items-center justify-center gap-3 group"
                        >
                            <PhoneOff size={24} className="group-hover:rotate-12 transition-transform" />
                            <span className="font-black uppercase tracking-widest text-xs">Annuler l'appel</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CallHandler;
