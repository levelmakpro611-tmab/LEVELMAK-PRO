import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticFeedback } from '../services/nativeAdapters';
import { HandMetal, Globe, EyeOff, Eye, Send, Heart, Flame, Sparkles, Swords, X, Palette, Target, Menu } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../services/supabase';
import { BattleRequest, BattleState, BattlePlayer, QuizQuestion, BattleType, ActiveUser } from '../types';
import { QuizBattle } from './QuizBattle';
import { CollaborativeDoodle } from './CollaborativeDoodle';
import { ATLAS_DATA, GeoFeature } from '../utils/geoAtlasData';
import { Map as MapIcon, Waves, HardHat, Mountain, Thermometer } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';

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

// Atlas Icons
const RiverIcon = new L.DivIcon({
  className: 'atlas-river-marker',
  html: `<div style="background-color: #00B4FF; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 12px rgba(0, 180, 255, 0.8);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const ResourceIcon = new L.DivIcon({
  className: 'atlas-resource-marker',
  html: `<div style="background-color: #EAB308; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(234,179,8,0.6);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const ReliefIcon = new L.DivIcon({
  className: 'atlas-relief-marker',
  html: `<div style="background-color: #F97316; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(249,115,22,0.6);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

interface WorldBrainMapProps {
    customBattleMode?: 'custom_quiz';
    customBattleData?: any;
    customBetAmount?: number;
    onCloseMap?: () => void;
    onNavigate?: (tab: string) => void;
}

export const WorldBrainMap: React.FC<WorldBrainMapProps> = ({ customBattleMode, customBattleData, customBetAmount, onCloseMap, onNavigate }) => {
  const { t, user, addNotification, updateLocation, mapFocusFeatureId, setMapFocusFeatureId, setAtlasFocusFeatureId } = useStore();

  
  // Helper to render professional Atlas Popups
  const renderAtlasPopup = (feature: GeoFeature) => (
    <div className="p-0 min-w-[100px] font-sans">
      <div className="flex items-center gap-1.5 mb-1 border-b border-slate-50 pb-1">
        <div className={`p-0.5 rounded-md ${
          feature.type === 'river' ? 'bg-blue-50 text-blue-500' : 
          feature.type === 'resource' ? 'bg-yellow-50 text-yellow-500' : 
          feature.type === 'relief' ? 'bg-orange-50 text-orange-500' : 
          'bg-emerald-50 text-emerald-500'
        }`}>
          {feature.type === 'river' && <Waves size={10} />}
          {feature.type === 'resource' && <HardHat size={10} />}
          {feature.type === 'relief' && <Mountain size={10} />}
          {feature.type === 'climate' && <Thermometer size={10} />}
        </div>
        <p className="font-black text-[7px] uppercase tracking-tighter text-slate-300">
          {t(`atlas.${feature.type}`)}
        </p>
      </div>
      
      <p className="font-extrabold text-slate-900 text-[11px] leading-tight my-1.5 px-0.5">
        {t(`atlas.lessons.${feature.id}.title`)}
      </p>

      <button
         onClick={(e) => {
            e.stopPropagation();
            HapticFeedback.selection();
            setAtlasFocusFeatureId(feature.id);
            if (onNavigate) {
                onNavigate('atlas');
            }
         }}
         className="w-full py-1.5 text-[8px] font-black uppercase text-white bg-blue-600 rounded-lg hover:bg-blue-500 active:scale-95 transition-all shadow-sm"
      >
         {t('atlas.readLesson')}
      </button>
    </div>
  );
  const [activeAtlasCategory, setActiveAtlasCategory] = useState<'none' | 'river' | 'resource' | 'relief' | 'climate'>('none');
  const [isAtlasMenuOpen, setIsAtlasMenuOpen] = useState(false);
  const [focusedFeatureId, setFocusedFeatureId] = useState<string | null>(null);
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

  // Set up geolocation independently (Native support)
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        if (!isLocationShared) return;
        
        // On demande officiellement l'accès aux sondes GPS natives
        const permission = await Geolocation.requestPermissions();
        if (permission.location !== 'granted' && permission.location !== 'prompt') {
            console.warn("Permission de géolocalisation native refusée.");
            return;
        }

        // Acquisition haute précision avec le capteur GPS
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        const { latitude, longitude } = position.coords;
        setMyLocation({ lat: latitude, lng: longitude });
        updateLocation(latitude, longitude, isLocationShared); // Gère Firebase & Presence
      } catch (error) {
        console.warn("Erreur Géolocalisation Native :", error);
      }
    };

    fetchLocation();
  }, [isLocationShared, updateLocation]);


  // Set up channel and subscriptions
  useEffect(() => {
    const channel = supabase.channel('global-presence', {
        config: { presence: { key: sessionKey } }
    });
    setChannelRef(channel);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: ActiveUser[] = [];
        
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
      .subscribe();

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
  }, [sessionKey, user?.id, addNotification]);

  // Track presence whenever location, channel, or sharing status changes
  useEffect(() => {
      const trackPresence = async () => {
          if (channelRef && isLocationShared && user) {
              try {
                  await channelRef.track({
                      user_id: user.id,
                      session_id: sessionKey,
                      name: user.name,
                      lat: myLocation?.lat || null,
                      lng: myLocation?.lng || null,
                      avatar: user.avatar?.image || user.avatar?.baseColor,
                      timestamp: Date.now()
                  });
              } catch (e) {
                  console.error("Track presence error:", e);
              }
          } else if (channelRef && !isLocationShared) {
              try {
                  await channelRef.untrack();
              } catch (e) {
                  console.error("Untrack presence error:", e);
              }
          }
      };
      
      // Attempt tracking slightly after initialization to ensure connection is ready
      const timer = setTimeout(() => {
          trackPresence();
      }, 500);
      
      return () => clearTimeout(timer);
  }, [channelRef, myLocation?.lat, myLocation?.lng, isLocationShared, user]);

  // Handle Atlas Focus from Library (Enhanced)
  useEffect(() => {
    if (map && mapFocusFeatureId) {
      const feature = ATLAS_DATA.find(f => f.id === mapFocusFeatureId);
      if (feature) {
        // Set the correct category first
        setActiveAtlasCategory(feature.type);
        
        // Find center coordinates
        let focusCoords: [number, number];
        if (Array.isArray(feature.coords[0])) {
            const coords = feature.coords as [number, number][];
            focusCoords = coords[Math.floor(coords.length / 2)];
        } else {
            focusCoords = feature.coords as [number, number];
        }

        // Fly to location
        setTimeout(() => {
            map.flyTo(focusCoords, 11, {
                animate: true,
                duration: 2
            });
            
            // Set focused ID to open popup
            setFocusedFeatureId(feature.id);
            HapticFeedback.success();
            
            // Clear the focus ID so it can be re-triggered
            setMapFocusFeatureId(null);
        }, 300);
      }
    }
  }, [map, mapFocusFeatureId, setMapFocusFeatureId, setActiveAtlasCategory]);

  const toggleLocationShare = () => {
    HapticFeedback.selection();
    const newState = !isLocationShared;
    setIsLocationShared(newState);
    if (myLocation) {
        updateLocation(myLocation.lat, myLocation.lng, newState);
        if (!newState) channelRef?.untrack();
        else if (user) {
            channelRef?.track({
                user_id: user.id,
                session_id: sessionKey,
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
      const questions = customBattleMode === 'custom_quiz' 
        ? customBattleData.questions 
        : (type === 'quiz' ? t('atlas.sampleQuestions', { returnObjects: true }) : []);
      
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
      addNotification('success', t('common.success'), t('atlas.duelSent', { name: otherUser.name }));
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
    const query = searchQuery.toLowerCase();

    // If Atlas is active, return ONLY Atlas data (Exclusive mode)
    if (activeAtlasCategory !== 'none') {
        const atlasResults = ATLAS_DATA.filter(f => {
            const title = t(`atlas.lessons.${f.id}.title`) || '';
            return f.type === activeAtlasCategory && 
            (title.toLowerCase().includes(query) || f.country.toLowerCase().includes(query) || query === 'guinée');
        });
        return atlasResults.map(f => ({
            user_id: f.id,
            name: t(`atlas.lessons.${f.id}.title`),
            lat: Array.isArray(f.coords[0]) ? (f.coords[0] as [number, number])[0] : (f.coords as [number, number])[0],
            lng: Array.isArray(f.coords[0]) ? (f.coords[0] as [number, number])[1] : (f.coords as [number, number])[1],
            avatar: '',
            timestamp: 0,
            isAtlas: true
        })) as any[];
    }

    // Default student search (Globe mode)
    // We combine all profiles and active users, but handle multi-session
    const combined: ActiveUser[] = [];
    const seenSessions = new Set<string>();

    // Add active users (potentially multiple sessions per user)
    activeUsers.forEach(u => {
        combined.push(u);
        seenSessions.add(u.user_id);
    });

    // Add offline profiles only if they aren't already active
    allProfiles.forEach(p => {
        if (!seenSessions.has(p.user_id)) {
            combined.push(p);
        }
    });
    
    if (!searchQuery.trim()) return combined;
    return combined.filter(u => u.name.toLowerCase().includes(query));
  }, [activeUsers, allProfiles, searchQuery, activeAtlasCategory, t]);

  // Count all unique sessions/devices active
  const totalActiveSessions = useMemo(() => {
    const sessions = new Set(activeUsers.map(u => (u as any).session_id || u.user_id));
    if (isLocationShared) sessions.add(sessionKey);
    return sessions.size;
  }, [activeUsers, isLocationShared, sessionKey]);

  const totalConnected = totalActiveSessions;
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
                          {t('common.cancel')}
                      </button>
                      <button onClick={() => respondToInvite(true)} className="flex-1 py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-400 transition shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                          {t('common.accept')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Atlas Category & Student Selector */}
      <div className="absolute top-32 left-8 z-[500] flex flex-col gap-3">
        {/* Globe / Students Button (Always Visible) */}
        <button
          onClick={() => {
            setActiveAtlasCategory('none');
            setIsAtlasMenuOpen(false);
            HapticFeedback.selection();
            map?.setView(defaultCenter, 4);
          }}
          className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl border transition-all duration-300 ${
            activeAtlasCategory === 'none' 
              ? 'bg-blue-600 border-white/30 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-110 z-10' 
              : 'bg-slate-900/80 backdrop-blur-md border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
          title="Vue Élèves"
        >
          <Globe size={20} />
          <div className="absolute left-full ml-4 px-3 py-1 bg-slate-900 border border-white/10 rounded-lg text-white text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[600]">
            Vue Étudiants
          </div>
        </button>

        {/* Atlas Menu Toggle (Hamburger) */}
        <button
          onClick={() => {
            setIsAtlasMenuOpen(!isAtlasMenuOpen);
            HapticFeedback.selection();
          }}
          className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl border transition-all duration-300 ${
            isAtlasMenuOpen || activeAtlasCategory !== 'none'
              ? 'bg-orange-600 border-white/30 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]' 
              : 'bg-slate-900/80 backdrop-blur-md border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
          title="Menu Atlas"
        >
          <Menu size={20} className={`${isAtlasMenuOpen ? 'rotate-90' : 'rotate-0'} transition-transform duration-300`} />
          <div className="absolute left-full ml-4 px-3 py-1 bg-slate-900 border border-white/10 rounded-lg text-white text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[600]">
            Atlas Géographique
          </div>
        </button>

        {/* Expandable Atlas Categories */}
        <AnimatePresence>
          {isAtlasMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-3 mt-2"
            >
              {[
                { id: 'river', icon: <Waves size={20} />, label: t('atlas.hydro'), color: 'bg-blue-600' },
                { id: 'resource', icon: <HardHat size={20} />, label: t('atlas.resource'), color: 'bg-yellow-600' },
                { id: 'relief', icon: <Mountain size={20} />, label: t('atlas.relief'), color: 'bg-orange-600' },
                { id: 'climate', icon: <Thermometer size={20} />, label: t('atlas.climate'), color: 'bg-emerald-600' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                      setActiveAtlasCategory(cat.id as any);
                      HapticFeedback.selection();
                      // Zoom sur la Guinée pour centrer l'Atlas
                      map?.flyTo([10.5, -11], 7, { animate: true, duration: 1.5 });
                  }}
                  className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl border transition-all duration-300 ${
                    activeAtlasCategory === cat.id 
                      ? `${cat.color} border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-110 z-10` 
                      : 'bg-slate-900/60 backdrop-blur-md border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                  }`}
                  title={cat.label}
                >
                  {cat.icon}
                  <div className="absolute left-full ml-4 px-3 py-1 bg-slate-900 border border-white/10 rounded-lg text-white text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[600]">
                    {cat.label}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <Globe className="text-blue-400" size={28} />
            {t('atlas.title')}
          </h2>
          <p className="text-slate-400 font-medium mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
            {t(totalConnected > 1 ? 'atlas.onlineStudents' : 'atlas.onlineStudent', { count: totalConnected })}
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
            {isLocationShared ? t('atlas.publicPos') : t('atlas.ghostMode')}
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
                  placeholder={t('atlas.searchMap')}
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    {activeAtlasCategory !== 'none' ? 'Résultats de l\'Atlas' : 'Résultats sur la carte'}
                  </p>
                  {displayedUsers.length > 0 ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                          {displayedUsers.map(u => (
                              <button 
                                  key={u.user_id}
                                  onClick={() => {
                                      if (map) {
                                          map.flyTo([u.lat, u.lng], 12, { duration: 1.5 });
                                          setSearchQuery('');
                                      }
                                  }}
                                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-blue-500/20 border border-transparent hover:border-blue-500/30 transition-all group"
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${(u as any).isAtlas ? 'bg-blue-400' : (activeUsers.some(au => au.user_id === u.user_id) ? 'bg-green-500 animate-pulse' : 'bg-slate-500')}`} />
                                      <span className="text-sm font-bold text-white group-hover:text-blue-400">{u.name}</span>
                                  </div>
                                  <MapIcon size={14} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
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
                          <p className="text-white font-bold mb-1">{t('atlas.noStudentFound')}</p>
                          <p className="text-slate-500 text-xs font-medium max-w-[200px] mx-auto text-balance">
                              {t('atlas.noStudentDesc', { query: searchQuery })}
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
          
          {/* Atlas Layer - Features */}
          {activeAtlasCategory !== 'none' && ATLAS_DATA.filter(f => f.type === activeAtlasCategory).map(feature => {
            const isSelected = focusedFeatureId === feature.id;
            const featureTitle = t(`atlas.lessons.${feature.id}.title`);
            
            return (
              <React.Fragment key={feature.id}>
                {feature.type === 'river' ? (
                  <>
                    {Array.isArray(feature.coords[0]) && (
                      <>
                        {/* Glow effect for selected path */}
                        {isSelected && (
                          <Polyline 
                            positions={feature.coords as [number, number][]} 
                            pathOptions={{ 
                              color: '#3B82F6', 
                              weight: 16, 
                              opacity: 0.2, 
                              lineJoin: 'round',
                              lineCap: 'round',
                            }}
                          />
                        )}
                        <Polyline 
                          positions={feature.coords as [number, number][]} 
                          eventHandlers={{
                            click: () => {
                              setFocusedFeatureId(feature.id);
                              HapticFeedback.selection();
                            }
                          }}
                          pathOptions={{ 
                            color: isSelected ? '#2563EB' : '#00B4FF', 
                            weight: isSelected ? 8 : 4, 
                            opacity: isSelected ? 1 : 0.7, 
                            lineJoin: 'round',
                            lineCap: 'round',
                            dashArray: isSelected ? undefined : '1, 10'
                          }}
                        >
                          <Popup>{renderAtlasPopup(feature)}</Popup>
                          {isSelected && (
                            <Tooltip permanent direction="top" className="premium-label" offset={[0, -5]}>
                              <div className="animate-in fade-in zoom-in duration-300">
                                <span className="font-black text-[9px] uppercase tracking-widest text-blue-600 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-[0_10px_25px_-5px_rgba(59,130,246,0.5)] border border-blue-100 flex items-center gap-1.5 whitespace-nowrap">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                  {featureTitle}
                                </span>
                              </div>
                            </Tooltip>
                          )}
                        </Polyline>
                        
                        {/* Mouth Marker (End of river) */}
                        {isSelected && (
                          <Marker 
                            position={(feature.coords as [number, number][])[feature.coords.length - 1]} 
                            icon={new L.DivIcon({
                              className: 'river-mouth-marker',
                              html: `<div class="relative flex items-center justify-center">
                                       <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
                                       <div class="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
                                     </div>`,
                              iconSize: [20, 20],
                              iconAnchor: [10, 10]
                            })}
                          >
                            <Tooltip direction="right">Embouchure</Tooltip>
                          </Marker>
                        )}
                      </>
                    )}
                    <Marker 
                      position={Array.isArray(feature.coords[0]) ? (feature.coords[0] as [number, number]) : (feature.coords as [number, number])} 
                      icon={RiverIcon}
                      eventHandlers={{
                        click: () => {
                          setFocusedFeatureId(feature.id);
                          HapticFeedback.selection();
                        }
                      }}
                    >
                      <Popup>{renderAtlasPopup(feature)}</Popup>
                      {isSelected && !Array.isArray(feature.coords[0]) && (
                        <Tooltip permanent direction="top" className="premium-label" offset={[0, -10]}>
                           <span className="font-black text-[10px] uppercase tracking-wider text-blue-600 px-2 py-1 bg-white rounded-lg shadow-xl border border-blue-100 flex items-center gap-1">
                              <Waves size={10} /> {featureTitle}
                            </span>
                        </Tooltip>
                      )}
                    </Marker>
                  </>
                ) : feature.type === 'climate' ? (
                  <Circle
                    center={feature.coords as [number, number]}
                    radius={isSelected ? 150000 : 120000}
                    eventHandlers={{
                      click: () => {
                        setFocusedFeatureId(feature.id);
                        HapticFeedback.selection();
                      }
                    }}
                    pathOptions={{ 
                      color: isSelected ? '#059669' : '#10B981', 
                      fillColor: isSelected ? '#059669' : '#10B981', 
                      fillOpacity: isSelected ? 0.3 : 0.15,
                      weight: isSelected ? 4 : 2
                    }}
                  >
                    <Popup>{renderAtlasPopup(feature)}</Popup>
                    {isSelected && (
                       <Tooltip permanent direction="top" className="premium-label">
                          <span className="font-black text-[10px] uppercase tracking-wider text-emerald-600 px-2 py-1 bg-white rounded-lg shadow-xl border border-emerald-100 flex items-center gap-1">
                            <Thermometer size={10} /> {featureTitle}
                          </span>
                       </Tooltip>
                    )}
                  </Circle>
                ) : (
                  <Marker 
                    position={feature.coords as [number, number]} 
                    icon={feature.type === 'resource' ? ResourceIcon : ReliefIcon}
                    eventHandlers={{
                      click: () => {
                        setFocusedFeatureId(feature.id);
                        HapticFeedback.selection();
                      }
                    }}
                  >
                    <Popup>{renderAtlasPopup(feature)}</Popup>
                    {isSelected && (
                       <Tooltip permanent direction="top" className="premium-label" offset={[0, -20]}>
                          <span className={`font-black text-[10px] uppercase tracking-wider px-2 py-1 bg-white rounded-lg shadow-xl border flex items-center gap-1 ${feature.type === 'resource' ? 'text-yellow-600 border-yellow-100' : 'text-orange-600 border-orange-100'}`}>
                            {feature.type === 'resource' ? <HardHat size={10} /> : <Mountain size={10} />} {featureTitle}
                          </span>
                       </Tooltip>
                    )}
                  </Marker>
                )}
              </React.Fragment>
            );
          })}
          
          {/* Active Users Markers */}
          {activeAtlasCategory === 'none' && displayedUsers.map((u, idx) => {
            if (u.lat == null || u.lng == null) return null;
            const isOnline = activeUsers.some(au => au.user_id === u.user_id);
            
            // Add a tiny jitter if multiple users/sessions overlap
            // Using a deterministic-looking random based on session/id to avoid jumpy movement
            const jitter = 0.0001; 
            const displayLat = u.lat + (Math.sin(idx * 123.45) * jitter);
            const displayLng = u.lng + (Math.cos(idx * 543.21) * jitter);

            return (
              <Marker 
                key={(u as any).session_id || `${u.user_id}-${idx}`} 
                position={[displayLat, displayLng]} 
                icon={isOnline ? StudentIcon : new L.DivIcon({
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
                              onClick={() => {
                                  HapticFeedback.action();
                                  sendDuelInvite(u, 'quiz');
                              }}
                              className={`w-full font-black text-[10px] py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 ${isOnline ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                              disabled={!isOnline}
                          >
                              <Swords size={12} /> {isOnline ? (customBattleMode ? 'INVITER AU DUEL ⚔️' : 'DUEL QUIZ ⚔️') : 'HORS-LIGNE'}
                          </button>
                          {!customBattleMode && isOnline && (
                              <button 
                                  onClick={() => {
                                      HapticFeedback.action();
                                      sendDuelInvite(u, 'doodle');
                                  }}
                                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[10px] py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95"
                              >
                                  <Palette size={12} /> BATAILLE PIXEL 🎨
                              </button>
                          )}
                      </div>
                      
                      {isOnline && (
                        <div className="flex justify-center gap-2 border-t border-white/10 pt-3">
                            <button onClick={() => { HapticFeedback.selection(); sendReaction(u, '🙌'); }} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 active:scale-90 transition tooltip tooltip-top" data-tip="High-Five">
                                <HandMetal size={14} className="text-blue-400" />
                            </button>
                            <button onClick={() => { HapticFeedback.selection(); sendReaction(u, '❤️'); }} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 active:scale-90 transition tooltip tooltip-top" data-tip="Soutien">
                                <Heart size={14} className="text-red-400" />
                            </button>
                            <button onClick={() => { HapticFeedback.selection(); sendReaction(u, '🔥'); }} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 active:scale-90 transition tooltip tooltip-top" data-tip="Force">
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
                  <Popup>{t('atlas.itIsYou')}</Popup>
              </Marker>
          )}

          {/* Focused Feature Popup (auto-opened) */}
          {focusedFeatureId && (() => {
              const feature = ATLAS_DATA.find(f => f.id === focusedFeatureId);
              if (!feature) return null;
              
              let focusCoords: [number, number];
              if (Array.isArray(feature.coords[0])) {
                  const coords = feature.coords as [number, number][];
                  focusCoords = coords[Math.floor(coords.length / 2)];
              } else {
                  focusCoords = feature.coords as [number, number];
              }
              
              return (
                <Popup 
                  position={focusCoords} 
                  eventHandlers={{
                    remove: () => setFocusedFeatureId(null)
                  }}
                >
                  {renderAtlasPopup(feature)}
                </Popup>
              );
          })()}
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

