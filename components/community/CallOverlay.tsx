import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, MoreVertical, Activity, ShieldCheck, Wifi, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Call } from '../../services/firebase-chat';

interface CallOverlayProps {
    call: Call;
    currentUser: any;
    onEnd: () => void;
}

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
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(call.type === 'audio');
    const [isSpeakerOn, setIsSpeakerOn] = useState(call.type === 'video');
    const [duration, setDuration] = useState(0);
    const [currentCallState, setCurrentCallState] = useState<Call>(call);
    const [rtcState, setRtcState] = useState<WebRTCState>('IDLE');
    const [iceCount, setIceCount] = useState(0);

    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream | null>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const isIncoming = currentCallState.receiverId === currentUser.id && currentCallState.status === 'calling';
    const isOutgoing = currentCallState.callerId === currentUser.id && currentCallState.status === 'calling';
    const isOngoing = currentCallState.status === 'ongoing';

    const initializeWebRTC = async () => {
        try {
            setRtcState('MEDIA_READY');

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

            pc.current = new RTCPeerConnection(configuration);

            pc.current.onconnectionstatechange = () => {
                if (pc.current?.connectionState === 'connected') setRtcState('CONNECTED');
                if (pc.current?.connectionState === 'failed') setRtcState('FAILED');
            };

            pc.current.onicegatheringstatechange = () => {
                if (pc.current?.iceGatheringState === 'gathering') setRtcState('ICE_GATHERING');
            };

            stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

            pc.current.ontrack = (event) => {
                remoteStream.current = event.streams[0];
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            pc.current.onicecandidate = (event) => {
                if (event.candidate) {
                    setIceCount(prev => prev + 1);
                    chatService.sendIceCandidate(call.id, event.candidate, isOutgoing ? 'caller' : 'receiver');
                }
            };

            chatService.listenForIceCandidates(call.id, isOutgoing ? 'caller' : 'receiver', (candidate) => {
                if (pc.current && candidate) {
                    pc.current.addIceCandidate(new RTCIceCandidate(candidate))
                        .catch(e => console.error("ICE Error:", e));
                }
            });

            setRtcState('SIGNALING');
            if (isOutgoing) {
                const offer = await pc.current.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: call.type === 'video'
                });
                await pc.current.setLocalDescription(offer);
                await chatService.updateCallSDP(call.id, offer, 'offer');

                const signalingSub = chatService.listenToCall(call.id, async (updatedCall) => {
                    if (updatedCall?.sdpAnswer && !pc.current?.remoteDescription) {
                        await pc.current?.setRemoteDescription(new RTCSessionDescription(updatedCall.sdpAnswer));
                    }
                });
                return signalingSub;
            } else {
                const signalingSub = chatService.listenToCall(call.id, async (updatedCall) => {
                    if (updatedCall?.sdpOffer && !pc.current?.remoteDescription) {
                        await pc.current?.setRemoteDescription(new RTCSessionDescription(updatedCall.sdpOffer));

                        const answer = await pc.current?.createAnswer();
                        await pc.current?.setLocalDescription(answer);
                        await chatService.updateCallSDP(call.id, answer, 'answer');
                    }
                });
                return signalingSub;
            }
        } catch (error) {
            console.error("[WebRTC] CRITICAL ERROR:", error);
            setRtcState('FAILED');
        }
    };

    useEffect(() => {
        let signalingUnsubscribe: any;

        const unsubscribe = chatService.listenToCall(call.id, (updatedCall) => {
            if (updatedCall) {
                setCurrentCallState(updatedCall);
                if (updatedCall.status === 'ended' || updatedCall.status === 'rejected') {
                    cleanup();
                    setTimeout(() => onEnd(), 1500);
                }

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
    const getPartnerAvatar = () => (currentCallState.callerId === currentUser.id ? currentCallState.receiverAvatar : currentCallState.callerAvatar);

    const getStatusText = () => {
        if (currentCallState.status === 'ended') return 'Appel terminé';
        if (currentCallState.status === 'rejected') return 'Appel refusé';
        if (isIncoming) return 'Appel entrant...';
        if (isOutgoing) return 'Appel en cours...';
        if (rtcState !== 'CONNECTED') return 'Connexion...';
        return formatDuration(duration);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex flex-col overflow-hidden"
        >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0a1628] to-[#050d1a]"></div>

            {/* Video Layer */}
            {isOngoing && call.type === 'video' && (
                <div className="absolute inset-0 z-[1]">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

                    {/* PiP Self View */}
                    <motion.div
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        className="absolute top-20 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-900 shadow-2xl z-20"
                    >
                        <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`} />
                        {isVideoOff && (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                <VideoOff size={20} className="text-white/30" />
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Top Bar */}
            <div className="relative z-10 pt-12 pb-4 px-6 flex items-center justify-between">
                <div className="flex-1"></div>
                <div className="flex flex-col items-center">
                    <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                        {call.type === 'video' ? 'Appel vidéo' : 'Appel audio'}
                    </span>
                    <span className="text-[11px] text-white/30 mt-0.5 flex items-center gap-1">
                        <ShieldCheck size={10} /> Chiffré de bout en bout
                    </span>
                </div>
                <div className="flex-1 flex justify-end">
                    <button className="p-2 text-white/30 hover:text-white/60 transition-all">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Center: Avatar + Name + Status */}
            {(!isOngoing || call.type === 'audio') && (
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
                    {/* Avatar with pulsating ring */}
                    <motion.div
                        animate={isOngoing && rtcState === 'CONNECTED' ? {} : { scale: [1, 1.03, 1] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                        className="relative mb-8"
                    >
                        {/* Outer pulsing ring */}
                        {!isOngoing && (
                            <motion.div
                                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-[-12px] rounded-full border-2 border-primary/30"
                            />
                        )}

                        <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-800 border-4 border-white/10 shadow-2xl">
                            {getPartnerAvatar() ? (
                                <img src={getPartnerAvatar()} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-white/30 bg-slate-700">
                                    {getPartnerName()[0]}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Name */}
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{getPartnerName()}</h1>

                    {/* Status */}
                    <p className="text-[14px] text-white/50 font-medium">{getStatusText()}</p>

                    {/* Connection quality indicator */}
                    {isOngoing && rtcState === 'CONNECTED' && (
                        <div className="flex items-center gap-1.5 mt-3 opacity-50">
                            <Wifi size={12} className="text-green-400" />
                            <span className="text-[10px] text-green-400 font-medium">Connexion stable</span>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Controls */}
            <div className="relative z-10 pb-12 px-8">
                {isIncoming ? (
                    /* Incoming Call Controls */
                    <div className="flex items-center justify-center gap-16">
                        <div className="flex flex-col items-center gap-2">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleReject}
                                className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.4)]"
                            >
                                <PhoneOff size={28} />
                            </motion.button>
                            <span className="text-[11px] text-white/40 font-medium">Refuser</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                animate={{ scale: [1, 1.08, 1] }}
                                transition={{ repeat: Infinity, duration: 1.2 }}
                                onClick={handleAccept}
                                className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(34,197,94,0.4)]"
                            >
                                <Phone size={28} />
                            </motion.button>
                            <span className="text-[11px] text-white/40 font-medium">Accepter</span>
                        </div>
                    </div>
                ) : (
                    /* Ongoing / Outgoing Controls */
                    <div className="space-y-8">
                        {/* Main control row */}
                        <div className="flex items-center justify-center gap-6">
                            {/* Video toggle */}
                            {call.type === 'video' && (
                                <div className="flex flex-col items-center gap-1.5">
                                    <button
                                        onClick={toggleVideo}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-white/10 text-white' : 'bg-white/20 text-white'}`}
                                    >
                                        {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                                    </button>
                                    <span className="text-[10px] text-white/40">Caméra</span>
                                </div>
                            )}

                            {/* Mute */}
                            <div className="flex flex-col items-center gap-1.5">
                                <button
                                    onClick={toggleMute}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white text-slate-900' : 'bg-white/10 text-white'}`}
                                >
                                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                                </button>
                                <span className="text-[10px] text-white/40">Micro</span>
                            </div>

                            {/* Speaker */}
                            <div className="flex flex-col items-center gap-1.5">
                                <button
                                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeakerOn ? 'bg-white text-slate-900' : 'bg-white/10 text-white'}`}
                                >
                                    {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
                                </button>
                                <span className="text-[10px] text-white/40">HP</span>
                            </div>

                            {/* End Call */}
                            <div className="flex flex-col items-center gap-1.5">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleEnd}
                                    className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.3)]"
                                >
                                    <PhoneOff size={22} />
                                </motion.button>
                                <span className="text-[10px] text-white/40">Fin</span>
                            </div>
                        </div>

                        {/* Swipe hint for incoming */}
                        {isOutgoing && (
                            <div className="flex justify-center">
                                <motion.div
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="flex items-center gap-2"
                                >
                                    <Activity size={12} className="text-primary" />
                                    <span className="text-[10px] text-white/30 font-medium">En attente de réponse...</span>
                                </motion.div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default CallOverlay;
