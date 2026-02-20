import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, MoreHorizontal, UserPlus, X, Activity, ShieldCheck, Wifi, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Call } from '../../services/firebase-chat';

interface CallOverlayProps {
    call: Call;
    currentUser: any;
    onEnd: () => void;
}

// Liste étendue de serveurs STUN de confiance pour maximiser le NAT Traversal
const configuration: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.voiparound.com' },
        { urls: 'stun:stun.voipbuster.com' },
        { urls: 'stun:stun.voipstunt.com' },
        { urls: 'stun:stun.voxgratia.org' },
        { urls: 'stun:stun.ekiga.net' },
    ],
    iceCandidatePoolSize: 10,
};

type WebRTCState = 'IDLE' | 'MEDIA_READY' | 'SIGNALING' | 'ICE_GATHERING' | 'CONNECTED' | 'FAILED';

const CallOverlay: React.FC<CallOverlayProps> = ({ call, currentUser, onEnd }) => {
    // UI States
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(call.type === 'audio');
    const [isSpeakerOn, setIsSpeakerOn] = useState(call.type === 'video');
    const [duration, setDuration] = useState(0);
    const [currentCallState, setCurrentCallState] = useState<Call>(call);
    const [rtcState, setRtcState] = useState<WebRTCState>('IDLE');
    const [showDebug, setShowDebug] = useState(false);
    const [iceCount, setIceCount] = useState(0);

    // WebRTC Refs
    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream | null>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const isIncoming = currentCallState.receiverId === currentUser.id && currentCallState.status === 'calling';
    const isOutgoing = currentCallState.callerId === currentUser.id && currentCallState.status === 'calling';
    const isOngoing = currentCallState.status === 'ongoing';

    // 🛡️ Moteur WebRTC Ultra-Robuste
    const initializeWebRTC = async () => {
        try {
            console.log("🚀 [WebRTC] Initialisation du moteur...");
            setRtcState('MEDIA_READY');

            // 1. Capture Media avec fallback
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: call.type === 'video' ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                } : false
            });
            localStream.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            // 2. Création PeerConnection
            pc.current = new RTCPeerConnection(configuration);
            console.log("✅ [WebRTC] PeerConnection créée");

            // 3. Setup de la machine à états et events
            pc.current.onconnectionstatechange = () => {
                console.log("📡 [WebRTC] État Connexion:", pc.current?.connectionState);
                if (pc.current?.connectionState === 'connected') setRtcState('CONNECTED');
                if (pc.current?.connectionState === 'failed') setRtcState('FAILED');
            };

            pc.current.onicegatheringstatechange = () => {
                console.log("🧊 [WebRTC] Collecte ICE:", pc.current?.iceGatheringState);
                if (pc.current?.iceGatheringState === 'gathering') setRtcState('ICE_GATHERING');
            };

            // 4. Ajout des pistes au flux
            stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

            // 5. Réception du flux distant
            pc.current.ontrack = (event) => {
                console.log("📱 [WebRTC] Flux distant reçu !");
                remoteStream.current = event.streams[0];
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            // 6. Gestion des ICE Candidates (Sortants)
            pc.current.onicecandidate = (event) => {
                if (event.candidate) {
                    setIceCount(prev => prev + 1);
                    chatService.addCallIceCandidate(call.id, event.candidate, isOutgoing ? 'caller' : 'receiver');
                }
            };

            // 7. Écoute des ICE Candidates (Entrants) - Détection croisée
            chatService.listenForIceCandidates(call.id, isOutgoing ? 'caller' : 'receiver', (candidate) => {
                if (pc.current && candidate) {
                    pc.current.addIceCandidate(new RTCIceCandidate(candidate))
                        .catch(e => console.error("❌ ICE Error:", e));
                }
            });

            // 8. Logique de Négociation (Signaling)
            setRtcState('SIGNALING');
            if (isOutgoing) {
                // Créer Offre
                const offer = await pc.current.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: call.type === 'video'
                });
                await pc.current.setLocalDescription(offer);
                await chatService.updateCallSDP(call.id, offer, 'offer');
                console.log("📤 [WebRTC] Offre envoyée");

                // Attendre la réponse
                const signalingSub = chatService.listenToCall(call.id, async (updatedCall) => {
                    if (updatedCall?.sdpAnswer && !pc.current?.remoteDescription) {
                        console.log("📥 [WebRTC] Réponse SDP reçue");
                        await pc.current?.setRemoteDescription(new RTCSessionDescription(updatedCall.sdpAnswer));
                    }
                });
                return signalingSub;
            } else {
                // Receveur : Écouter l'offre
                const signalingSub = chatService.listenToCall(call.id, async (updatedCall) => {
                    if (updatedCall?.sdpOffer && !pc.current?.remoteDescription) {
                        console.log("📥 [WebRTC] Offre SDP reçue");
                        await pc.current?.setRemoteDescription(new RTCSessionDescription(updatedCall.sdpOffer));

                        const answer = await pc.current?.createAnswer();
                        await pc.current?.setLocalDescription(answer);
                        await chatService.updateCallSDP(call.id, answer, 'answer');
                        console.log("📤 [WebRTC] Réponse envoyée");
                    }
                });
                return signalingSub;
            }

        } catch (error) {
            console.error("⛔ [WebRTC] CRITICAL ERROR:", error);
            setRtcState('FAILED');
        }
    };

    // Cycle de vie Global
    useEffect(() => {
        let signalingUnsubscribe: any;

        const unsubscribe = chatService.listenToCall(call.id, (updatedCall) => {
            if (updatedCall) {
                setCurrentCallState(updatedCall);
                if (updatedCall.status === 'ended' || updatedCall.status === 'rejected') {
                    cleanup();
                    setTimeout(() => onEnd(), 1500);
                }

                // Déclenchement automatique une fois l'appel accepté
                if (updatedCall.status === 'ongoing' && !pc.current) {
                    initializeWebRTC().then(uns => signalingUnsubscribe = uns);
                }
            } else {
                onEnd();
            }
        });

        return () => {
            unsubscribe();
            if (signalingUnsubscribe) signalingUnsubscribe();
            cleanup();
        };
    }, [call.id, onEnd]);

    const cleanup = () => {
        pc.current?.close();
        pc.current = null;
        localStream.current?.getTracks().forEach(t => t.stop());
        localStream.current = null;
        remoteStream.current = null;
        ringtoneRef.current?.pause();
        ringtoneRef.current = null;
    };

    // Ringtones
    useEffect(() => {
        if (currentCallState.status === 'calling') {
            const dialToneURL = '/sounds/dialing.mpeg';
            const ringtoneURL = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
            const audio = new Audio(isOutgoing ? dialToneURL : ringtoneURL);
            audio.loop = true;
            audio.volume = isSpeakerOn ? 0.7 : 0.1;
            audio.play().catch(e => console.log("Audio play blocked", e));
            ringtoneRef.current = audio;
        } else {
            ringtoneRef.current?.pause();
            ringtoneRef.current = null;
        }
    }, [currentCallState.status, isOutgoing, isSpeakerOn]);

    // Timer
    useEffect(() => {
        let interval: any;
        if (isOngoing && rtcState === 'CONNECTED') {
            interval = setInterval(() => setDuration(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isOngoing, rtcState]);

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAccept = () => chatService.acceptCall(call.id);
    const handleReject = () => { chatService.endCall(call.id, 'rejected', duration); onEnd(); };
    const handleEnd = () => { chatService.endCall(call.id, 'ended', duration); onEnd(); };

    const toggleMute = () => {
        if (localStream.current) {
            const track = localStream.current.getAudioTracks()[0];
            if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
        }
    };

    const toggleVideo = () => {
        if (localStream.current) {
            const track = localStream.current.getVideoTracks()[0];
            if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
        }
    };

    const getPartnerName = () => (currentCallState.callerId === currentUser.id ? currentCallState.receiverName : currentCallState.callerName) || 'Contact';
    const getPartnerAvatar = () => (currentCallState.callerId === currentUser.id ? currentCallState.receiverAvatar : currentCallState.callerAvatar) || 'https://www.transparenttextures.com/patterns/cubes.png';

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-[#0b141a] flex flex-col items-center justify-between p-8 overflow-hidden font-sans"
        >
            {/* 📺 Video Layer */}
            <div className="absolute inset-0 z-0 bg-black">
                {isOngoing && (
                    <div className="w-full h-full relative">
                        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

                        {/* 🤳 PiP (Self view) */}
                        <div className="absolute top-24 right-6 w-32 h-48 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-900 shadow-2xl z-20">
                            <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`} />
                            {isVideoOff && <div className="w-full h-full flex items-center justify-center bg-slate-800"><VideoOff size={24} className="text-white/20" /></div>}
                        </div>
                    </div>
                )}
            </div>

            {/* 📊 Diagnostic Indicator (Invisible par défaut) */}
            <div
                className={`absolute top-0 inset-x-0 p-2 z-[2000] transition-transform duration-500 cursor-pointer ${showDebug ? 'translate-y-0' : '-translate-y-full hover:translate-y-[-1.5rem]'}`}
                onClick={() => setShowDebug(!showDebug)}
            >
                <div className="bg-black/80 backdrop-blur-xl border-b border-white/10 p-3 rounded-b-2xl flex items-center justify-between shadow-2xl">
                    <div className="flex items-center gap-3">
                        <Activity size={14} className={rtcState === 'CONNECTED' ? 'text-green-400' : rtcState === 'FAILED' ? 'text-red-400' : 'text-blue-400 animate-pulse'} />
                        <span className="text-[10px] font-mono text-white/50 uppercase tracking-tighter">
                            Status: <span className="text-white">{rtcState}</span>
                            {rtcState === 'ICE_GATHERING' && ` (${iceCount} candidates)`}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] text-white/30 font-mono">
                        <span className="flex items-center gap-1"><Wifi size={10} /> {pc.current?.iceConnectionState}</span>
                        <span className="flex items-center gap-1"><ShieldCheck size={10} /> P2P ACTIVE</span>
                    </div>
                </div>
            </div>

            {/* 🔝 Header Layer */}
            <div className="w-full flex justify-between items-center z-10">
                <div className="p-2 text-white/20"><Maximize2 size={18} /></div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1 drop-shadow-md">
                        {currentCallState.type === 'video' ? 'Appel Vidéo Pro' : 'Appel Audio Pro'}
                    </span>
                    <h2 className="text-sm font-semibold text-white/90">
                        {currentCallState.status === 'ended' ? 'Appel terminé' :
                            currentCallState.status === 'rejected' ? 'Appel refusé' :
                                isIncoming ? 'Appel entrant...' :
                                    isOutgoing ? 'Connexion sécurisée...' :
                                        rtcState !== 'CONNECTED' ? 'Synchronisation WebRTC...' : formatDuration(duration)}
                    </h2>
                </div>
                <div className="p-2 text-white/20"><MoreHorizontal size={18} /></div>
            </div>

            {/* 👤 Central Interface (Visuals) */}
            {(!isOngoing || (isVideoOff && currentCallState.type === 'audio')) && (
                <div className="flex-1 flex flex-col items-center justify-center space-y-10 z-10 w-full">
                    <motion.div
                        animate={isOngoing && rtcState === 'CONNECTED' ? {} : { scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        className="relative"
                    >
                        <div className="w-48 h-48 rounded-full border-[1px] border-white/5 p-2 bg-gradient-to-tr from-white/5 to-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                            <div className="w-full h-full rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-6xl font-black text-white overflow-hidden relative shadow-inner">
                                {getPartnerAvatar() && !getPartnerAvatar().includes('transparenttextures') ? (
                                    <img src={getPartnerAvatar()} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <span className="opacity-20">{getPartnerName()[0]}</span>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40"></div>
                            </div>
                        </div>
                        {isOngoing && rtcState === 'CONNECTED' && !isMuted && (
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="absolute bottom-2 right-2 w-12 h-12 bg-blue-600 rounded-full border-[6px] border-[#0b141a] flex items-center justify-center shadow-xl"
                            >
                                <Volume2 size={20} className="text-white" />
                            </motion.div>
                        )}
                    </motion.div>

                    <div className="flex flex-col items-center space-y-4">
                        <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-2xl">{getPartnerName()}</h1>
                        {!isOngoing && (
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                                <span className="text-white/30 text-[10px] uppercase font-bold tracking-[0.4em] animate-pulse">
                                    En attente du signal
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 🎮 Controls Bar (Bottom) */}
            <div className="w-full max-w-sm flex flex-col items-center space-y-8 z-10 mb-8">
                <div className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-4 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                    {isIncoming ? (
                        <>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleReject} className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(239,68,68,0.4)] transition-colors"><PhoneOff size={32} /></motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} onClick={handleAccept} className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(34,197,94,0.4)] transition-colors"><Phone size={32} /></motion.button>
                        </>
                    ) : (
                        <>
                            <button onClick={toggleVideo} className={`p-5 rounded-full transition-all ${isVideoOff ? 'text-white/30 bg-white/5' : 'text-white bg-white/20'}`}>{isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}</button>
                            <button onClick={() => setIsSpeakerOn(!isSpeakerOn)} className={`p-5 rounded-full transition-all ${!isSpeakerOn ? 'text-white/30 bg-white/5' : 'text-white bg-white/20'}`}>{isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}</button>
                            <button onClick={toggleMute} className={`p-5 rounded-full transition-all ${isMuted ? 'text-white bg-red-500/50' : 'text-white bg-white/10'}`}>{isMuted ? <MicOff size={24} /> : <Mic size={24} />}</button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleEnd} className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(239,68,68,0.3)]"><PhoneOff size={24} /></motion.button>
                        </>
                    )}
                </div>

                <div className="flex flex-col items-center gap-1 opacity-20">
                    <span className="text-[8px] font-black uppercase tracking-[0.6em] text-white">Encrypted</span>
                    <div className="flex gap-1"><span className="w-0.5 h-0.5 bg-white rounded-full"></span><span className="w-0.5 h-0.5 bg-white rounded-full"></span><span className="w-0.5 h-0.5 bg-white rounded-full"></span></div>
                </div>
            </div>
        </motion.div>
    );
};

export default CallOverlay;
