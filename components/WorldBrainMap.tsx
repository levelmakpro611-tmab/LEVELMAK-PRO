import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandMetal, Globe, EyeOff, Eye, Send, Heart, Flame, Sparkles, Swords, X, Palette, Target } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { HapticFeedback } from '../services/nativeAdapters';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../services/supabase';
import { BattleRequest, BattleState, BattlePlayer, QuizQuestion, BattleType, ActiveUser } from '../types';
import { QuizBattle } from './QuizBattle';
import { CollaborativeDoodle } from './CollaborativeDoodle';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for other students
const StudentIcon = new L.DivIcon({
  className: 'custom-student-marker',
  html: `<div style="background-color: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.8); animation: pulse 2s infinite;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const SAMPLE_QUESTIONS: QuizQuestion[] = [
    { id: 'q1', text: 'Combien font 7 x 8 ?', options: ['54', '56', '64', '58'], correctAnswer: 1, explanation: '7 x 8 = 56.' },
    { id: 'q2', text: 'Quelle est la capitale de l\'Australie ?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], correctAnswer: 2, explanation: 'Contrairement aux idées reçues, Canberra est la capitale.' },
    { id: 'q3', text: 'Qui a écrit Les Misérables ?', options: ['Baudelaire', 'Molière', 'Victor Hugo', 'Zola'], correctAnswer: 2, explanation: 'Victor Hugo a publié Les Misérables en 1862.' },
    { id: 'q4', text: 'Quelle est la formule chimique de l\'eau ?', options: ['CO2', 'NaCl', 'H2O', 'O2'], correctAnswer: 2, explanation: 'H2O = 2 atomes d\'Hydrogène, 1 d\'Oxygène.' },
    { id: 'q5', text: 'Dans quel organe trouve-t-on le myocarde ?', options: ['Le foie', 'Le coeur', 'Les poumons', 'Le cerveau'], correctAnswer: 1, explanation: 'Le myocarde est le muscle du coeur.' }
];

interface WorldBrainMapProps {
    customBattleMode?: 'custom_quiz';
    customBattleData?: any;
    customBetAmount?: number;
    onCloseMap?: () => void;
}

export const WorldBrainMap: React.FC<WorldBrainMapProps> = ({ customBattleMode, customBattleData, customBetAmount, onCloseMap }) => {
  const { user, addNotification, updateLocation } = useStore();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [allProfiles, setAllProfiles] = useState<ActiveUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiBurst, setShowEmojiBurst] = useState<{ lat: number, lng: number, name: string, emoji: string } | null>(null);
  const [isLocationShared, setIsLocationShared] = useState(user?.location?.isPublic ?? true);
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(() => {
      // Check multiple paths for compatibility
      const loc = user?.location || (user?.avatar as any)?.location;
      return loc ? {lat: loc.latitude, lng: loc.longitude} : null;
  });

  // Battle states
  const [incomingInvite, setIncomingInvite] = useState<BattleRequest | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [activeBattle, setActiveBattle] = useState<{ state: BattleState, questions: QuizQuestion[], isHost: boolean } | null>(null);
  const [channelRef, setChannelRef] = useState<any>(null);
  const sessionKey = useMemo(() => `${user?.id || 'anon'}_${Math.random().toString(36).substring(2, 9)}`, [user?.id]);

  const defaultCenter: [number, number] = myLocation ? [myLocation.lat, myLocation.lng] : [48.8566, 2.3522];

  useEffect(() => {
    if (navigator.geolocation && isLocationShared) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMyLocation({ lat: latitude, lng: longitude });
          updateLocation(latitude, longitude, isLocationShared); // Internal update handles presence & DB
        },
        (error) => console.warn("Geolocation denied or error:", error)
      );
    }

    const channel = supabase.channel('global-presence', {
        config: { presence: { key: sessionKey } }
    });
    setChannelRef(channel);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: ActiveUser[] = [];
        const sessionIds = new Set<string>();
        
        for (const key in state) {
            const presences = state[key] as unknown as ActiveUser[];
            if (presences && presences.length > 0) {
                presences.forEach(p => {
                    // Filter out THIS specific session, but keep other devices even if same user_id
                    if (key !== sessionKey && p.user_id) {
                        users.push(p);
                    }
                });
            }
        }
        setActiveUsers(users);
      })
      .on('broadcast', { event: 'reaction' }, (payload) => {
          if (payload.payload.to === user?.id) {
              HapticFeedback.success();
              addNotification('info', 'Encouragement !', `${payload.payload.from} t'a envoyé un ${payload.payload.emoji} !`);
          }
      })
      .on('broadcast', { event: 'battle_invite' }, (payload) => {
          if (payload.payload.request.guest.id === user?.id) {
              HapticFeedback.success();
              setIncomingInvite(payload.payload.request);
          }
      })
      .on('broadcast', { event: 'battle_accept' }, (payload) => {
          // If I was the host, and the guest accepted
          if (payload.payload.request.host.id === user?.id) {
              HapticFeedback.success();
              startBattle(payload.payload.request, true);
          }
      })
      .on('broadcast', { event: 'battle_decline' }, (payload) => {
          if (payload.payload.request.host.id === user?.id) {
              addNotification('info', 'Défi décliné', `${payload.payload.request.guest.name} n'est pas disponible pour le duel.`);
          }
      })
      .subscribe(async (status) => {
    // WorldBrainMap now handles presence sync listener,
    // but the track is now handled in updateLocation (store) 
    // to ensure it happens when position changes even if map is not open (if needed).
    // However, for consistency, we let WorldBrainMap track its own presence when open.
    const trackPresence = async () => {
        if (myLocation && isLocationShared && user) {
            await channel.track({
                user_id: user.id,
                name: user.name,
                lat: myLocation.lat,
                lng: myLocation.lng,
                avatar: user.avatar?.image || user.avatar?.baseColor,
                timestamp: Date.now()
            });
        }
    };

    if (status === 'SUBSCRIBED') {
        trackPresence();
    }
      });

    // Fetch all public profiles
    const fetchProfiles = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, avatar_config');
        
        if (!error && data) {
            const profiles: ActiveUser[] = data
                .filter(p => p.id !== user?.id && p.avatar_config?.location?.isPublic)
                .map(p => ({
                    user_id: p.id,
                    name: p.name,
                    lat: p.avatar_config.location.latitude,
                    lng: p.avatar_config.location.longitude,
                    avatar: p.avatar_config?.image || p.avatar_config?.baseColor,
                    timestamp: 0
                }));
            setAllProfiles(profiles);
        }
    };

    fetchProfiles();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myLocation?.lat, myLocation?.lng, isLocationShared, user?.id]);

  const toggleLocationShare = () => {
    const newState = !isLocationShared;
    setIsLocationShared(newState);
    if (myLocation) {
        updateLocation(myLocation.lat, myLocation.lng, newState);
        if (!newState) channelRef?.untrack();
        else if (user) {
            channelRef?.track({
                user_id: user.id,
                name: user.name,
                lat: myLocation.lat,
                lng: myLocation.lng,
                timestamp: Date.now()
            });
        }
    }
  };

  const sendReaction = (otherUser: ActiveUser, emoji: string) => {
    HapticFeedback.selection();
    setShowEmojiBurst({ lat: otherUser.lat, lng: otherUser.lng, name: otherUser.name, emoji });
    if (user) {
        channelRef?.send({
            type: 'broadcast',
            event: 'reaction',
            payload: { from: user.name, to: otherUser.user_id, emoji }
        });
    }
    setTimeout(() => setShowEmojiBurst(null), 2000);
  };

  const sendDuelInvite = (otherUser: ActiveUser, type: BattleType = 'quiz') => {
      if (!user) return;
      HapticFeedback.success();
      
      const battleType = customBattleMode || type;
      const questions = customBattleMode === 'custom_quiz' ? customBattleData.questions : (type === 'quiz' ? SAMPLE_QUESTIONS : []);
      
      const newRequest: BattleRequest = {
          id: `${battleType}_${Date.now()}`,
          type: battleType,
          host: { id: user.id, name: user.name, avatar: user.avatar?.image || '', score: 0 },
          guest: { id: otherUser.user_id, name: otherUser.name, avatar: otherUser.avatar || '', score: 0 },
          status: 'pending',
          questions: questions,
          customQuiz: customBattleMode === 'custom_quiz' ? customBattleData : undefined,
          betAmount: customBetAmount,
          timestamp: Date.now()
      };
      
      channelRef?.send({
          type: 'broadcast',
          event: 'battle_invite',
          payload: { request: newRequest }
      });
      addNotification('success', 'Défi lancé !', `En attente de la réponse de ${otherUser.name}...`);
  };

  const respondToInvite = (accept: boolean) => {
      if (!incomingInvite) return;
      HapticFeedback.selection();
      
      channelRef?.send({
          type: 'broadcast',
          event: accept ? 'battle_accept' : 'battle_decline',
          payload: { request: incomingInvite }
      });
      
      if (accept) {
          startBattle(incomingInvite, false);
      }
      setIncomingInvite(null);
  };

  const startBattle = (request: BattleRequest, isHost: boolean) => {
      const initialState: BattleState = {
          id: request.id,
          type: request.type,
          host: request.host,
          guest: request.guest,
          status: 'active',
          winnerId: null,
          customQuiz: request.customQuiz,
          betAmount: request.betAmount,
          ...(request.type === 'quiz' || request.type === 'custom_quiz' ? {
              currentQuestionIndex: 0,
              hostAnswers: [],
              guestAnswers: [],
          } : {
              grid: Array(256).fill('#ffffff'), // 16x16
              hostScore: 0,
              guestScore: 0,
              timeLeft: 180 // 3 minutes
          })
      };
      setActiveBattle({ state: initialState, questions: request.questions, isHost });
  };

  // Merge active users and all profiles
  const displayedUsers = useMemo(() => {
    // Start with all offline profiles
    const usersMap = new Map<string, ActiveUser>();
    allProfiles.forEach(u => usersMap.set(u.user_id, u));
    
    // Override with active users (they have precise real-time lat/lng)
    activeUsers.forEach(u => usersMap.set(u.user_id, u));
    
    const combined = Array.from(usersMap.values());
    
    if (!searchQuery.trim()) return combined;
    
    const query = searchQuery.toLowerCase();
    return combined.filter(u => u.name.toLowerCase().includes(query));
  }, [activeUsers, allProfiles, searchQuery]);

  // Unique active students (by user_id)
  const uniqueActiveCount = useMemo(() => {
    const ids = new Set(activeUsers.map(u => u.user_id));
    if (isLocationShared) ids.add(user?.id || 'anon');
    return ids.size;
  }, [activeUsers, isLocationShared, user?.id]);

  const totalConnected = uniqueActiveCount;
  const totalOnMap = displayedUsers.length + (isLocationShared ? 1 : 0);

  if (activeBattle) {
      if (activeBattle.state.type === 'doodle') {
          return (
              <CollaborativeDoodle 
                  battleState={activeBattle.state}
                  isHost={activeBattle.isHost}
                  onClose={() => setActiveBattle(null)}
              />
          );
      }
      return (
          <QuizBattle 
              initialState={activeBattle.state} 
              isHost={activeBattle.isHost} 
              onClose={() => setActiveBattle(null)} 
          />
      );
  }

  return (
    <div id="world-map" className={`bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-premium overflow-hidden relative min-h-[500px] ${onCloseMap ? 'fixed inset-4 z-[9999]' : ''}`}>
      {onCloseMap && (
        <button 
          onClick={onCloseMap} 
          className="absolute top-6 right-6 z-[100] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors mix-blend-difference"
        >
          <X size={24} />
        </button>
      )}
      
      {incomingInvite && (
          <div className="absolute inset-0 z-[500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-slate-900 p-8 rounded-3xl border border-blue-500/30 text-center max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                      {incomingInvite.type === 'quiz' ? '⚔️' : '🎨'}
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2 uppercase">Défi Reçu !</h3>
                  <p className="text-slate-400 mb-8">
                    <strong className="text-white">{incomingInvite.host.name}</strong> te provoque en duel {incomingInvite.type === 'quiz' ? '(Quiz rapides)' : '(Guerre de Territoire🎨)'}.
                  </p>
                  
                  <div className="flex gap-4">
                      <button onClick={() => respondToInvite(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 transition">
                          Refuser
                      </button>
                      <button onClick={() => respondToInvite(true)} className="flex-1 py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-400 transition shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                          Accepter
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <Globe className="text-blue-400" size={28} />
            Cerveaux en Action
          </h2>
          <p className="text-slate-400 font-medium mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
            {totalConnected} {totalConnected > 1 ? 'élèves connectés' : 'élève connecté'}.
          </p>
        </div>
        
        <button 
            onClick={toggleLocationShare}
            className={`px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-2 transition-colors ${
                isLocationShared 
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30' 
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
            }`}
        >
            {isLocationShared ? <Eye size={16} /> : <EyeOff size={16} />}
            {isLocationShared ? 'Position Publique' : 'Mode Fantôme'}
        </button>
      </div>

      {/* Global Search Bar */}
      <div className="relative mb-6 z-10">
          <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none group-focus-within:text-blue-400 transition-colors">
                  <Globe size={18} className="animate-pulse" />
              </div>
              <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un camarade sur la carte..."
                  className="w-full bg-slate-950/50 backdrop-blur-xl border border-white/10 rounded-[2rem] py-4 pl-14 pr-6 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
              />
              {searchQuery && (
                  <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-5 flex items-center text-slate-500 hover:text-white transition-colors"
                  >
                      <X size={18} />
                  </button>
              )}
          </div>
          {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300 z-[50]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Résultats sur la carte</p>
                  {displayedUsers.length > 0 ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                          {displayedUsers.map(u => (
                              <button 
                                  key={u.user_id}
                                  onClick={() => {
                                      if (map) {
                                          map.flyTo([u.lat, u.lng], 16, { duration: 1.5 });
                                          setSearchQuery('');
                                      }
                                  }}
                                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-blue-500/20 border border-transparent hover:border-blue-500/30 transition-all group"
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${activeUsers.some(au => au.user_id === u.user_id) ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                                      <span className="text-sm font-bold text-white group-hover:text-blue-400">{u.name}</span>
                                  </div>
                                  <Send size={14} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                              </button>
                          ))}
                      </div>
                  ) : (
                      <div className="py-10 text-center flex flex-col items-center justify-center bg-slate-800/50 rounded-xl border border-dashed border-slate-700 mt-2">
                          <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-inner border border-white/5"
                          >
                              <EyeOff size={28} className="text-slate-500" />
                          </motion.div>
                          <p className="text-white font-bold mb-1">Aucun élève trouvé</p>
                          <p className="text-slate-500 text-xs font-medium max-w-[200px] mx-auto text-balance">
                              Personne ne correspond à "{searchQuery}". Essaie un autre nom ou vérifie l'orthographe.
                          </p>
                      </div>
                  )}
              </div>
          )}
      </div>

      <div className="relative w-full h-[350px] md:h-[450px] bg-slate-950 rounded-[2rem] border border-white/10 overflow-hidden shadow-inner">
        <MapContainer center={defaultCenter} zoom={4} style={{ height: '100%', width: '100%', borderRadius: '2rem' }} zoomControl={false} ref={setMap}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {/* Active Users Markers */}
          {displayedUsers.map(u => {
            const isOnline = activeUsers.some(au => au.user_id === u.user_id);
            return (
              <Marker key={u.user_id} position={[u.lat, u.lng]} icon={isOnline ? StudentIcon : new L.DivIcon({
                className: 'custom-student-marker-offline',
                html: `<div style="background-color: #64748b; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9]
              })}>
                <Popup className="bg-slate-900 border border-slate-800 rounded-xl text-white font-sans min-w-[160px]">
                  <div className="text-center p-2">
                      <p className="font-black text-lg mb-1">{u.name}</p>
                      <p className="text-xs text-slate-400 mb-3">{isOnline ? 'En ligne !' : 'Dernièrement vu ici'}</p>
                      
                      <div className="space-y-2 mb-3">
                          <button 
                              onClick={() => sendDuelInvite(u, 'quiz')}
                              className={`w-full font-black text-[10px] py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 ${isOnline ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                              disabled={!isOnline}
                          >
                              <Swords size={12} /> {isOnline ? (customBattleMode ? 'INVITER AU DUEL ⚔️' : 'DUEL QUIZ ⚔️') : 'HORS-LIGNE'}
                          </button>
                          {!customBattleMode && isOnline && (
                              <button 
                                  onClick={() => sendDuelInvite(u, 'doodle')}
                                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[10px] py-2 rounded-lg flex items-center justify-center gap-2 hover:from-pink-500 hover:to-rose-500 shadow-lg transition-transform hover:scale-105"
                              >
                                  <Palette size={12} /> BATAILLE PIXEL 🎨
                              </button>
                          )}
                      </div>
                      
                      {isOnline && (
                        <div className="flex justify-center gap-2 border-t border-white/10 pt-3">
                            <button onClick={() => sendReaction(u, '🙌')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition tooltip tooltip-top" data-tip="High-Five">
                                <HandMetal size={14} className="text-blue-400" />
                            </button>
                            <button onClick={() => sendReaction(u, '❤️')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition tooltip tooltip-top" data-tip="Soutien">
                                <Heart size={14} className="text-red-400" />
                            </button>
                            <button onClick={() => sendReaction(u, '🔥')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition tooltip tooltip-top" data-tip="Force">
                                <Flame size={14} className="text-orange-400" />
                            </button>
                        </div>
                      )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* User's own Location Marker */}
          {myLocation && isLocationShared && (
              <Marker position={[myLocation.lat, myLocation.lng]} icon={new L.DivIcon({
                className: 'custom-student-marker',
                html: `<div style="background-color: #10B981; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(16,185,129,0.8); animation: pulse 2s infinite;"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}>
                  <Popup>C'est toi !</Popup>
              </Marker>
          )}
        </MapContainer>

        {/* Recenter Button */}
        {myLocation && isLocationShared && (
            <button 
               onClick={() => {
                 map?.setView([myLocation.lat, myLocation.lng], 13);
                 HapticFeedback.selection();
               }}
               className="absolute bottom-10 right-4 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] border-2 border-white/20 transition-all hover:scale-110 active:scale-95 z-[500] group"
               title="Recentrer sur moi"
            >
                <Target size={24} className="group-hover:rotate-12 transition-transform" />
            </button>
        )}

        <AnimatePresence>
          {showEmojiBurst && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{ scale: [1, 1.5, 1], opacity: 1, y: -40 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 bottom-10 z-[400] flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-full shadow-2xl mb-2 flex items-center justify-center text-4xl">
                {showEmojiBurst.emoji}
              </div>
              <p className="text-white text-xs font-black bg-black/60 px-4 py-2 rounded-full backdrop-blur-md uppercase tracking-wider">
                Envoyé à {showEmojiBurst.name} !
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

