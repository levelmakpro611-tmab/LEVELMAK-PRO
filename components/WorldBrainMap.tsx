import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticFeedback, sendLocalNotification } from '../services/nativeAdapters';
import { Globe, Menu, X, Waves, HardHat, Mountain, Thermometer, Ghost, Eye, Star } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../services/supabase';
import { BattleRequest, QuizQuestion } from '../types';
import { QuizBattle } from './QuizBattle';
import { CollaborativeDoodle } from './CollaborativeDoodle';
import { TicTacToe } from './TicTacToe';
import { ATLAS_DATA } from '../utils/geoAtlasData';
import { Geolocation } from '@capacitor/geolocation';
import { audioService } from '../services/audio';

// Robust Marker Icons
const createIcon = (color: string, isSelf: boolean = false) => new L.DivIcon({
  className: isSelf ? 'marker-self-elite' : 'marker-student',
  html: `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
            <div style="background-color: ${color}; width: ${isSelf ? '24px' : '20px'}; height: ${isSelf ? '24px' : '20px'}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 20px ${color}88; position: relative;">
                ${isSelf ? `<div style="position: absolute; inset: -8px; border-radius: 50%; border: 2px solid ${color}; opacity: 0.6; animation: pulse 1.5s infinite;"></div>` : ''}
            </div>
         </div>`,
  iconSize: [44, 44], // Larger hit area for touch
  iconAnchor: [22, 22]
});

const SelfIcon = createIcon('#22C55E', true); // Vert pour soi
const GhostIcon = createIcon('#9CA3AF', true); // Gris pour fantôme
const StudentIcon = createIcon('#6366F1', false); // Indigo pour les autres

// Atlas Feature Icons
const RiverIcon = createIcon('#3B82F6', false); // Bleu clair
const RiverFocusIcon = createIcon('#1E3A8A', true); // Bleu très foncé (Highlight)
const ResourceIcon = createIcon('#EAB308', false); // Jaune
const ResourceFocusIcon = createIcon('#CA8A04', true); // Jaune foncé (Highlight)
const ReliefIcon = createIcon('#166534', false); // Vert arbre
const ReliefFocusIcon = createIcon('#14532D', true); // Vert arbre foncé (Highlight)
const ClimateIcon = createIcon('#EF4444', false); // Rouge
const ClimateFocusIcon = createIcon('#991B1B', true); // Rouge foncé (Highlight)

// Helper: push ghost status to Supabase so other clients' DB fallback also respects it
const pushGhostStatus = async (userId: string, isGhost: boolean) => {
  if (!userId || userId.includes('anon')) return;
  try {
    if (isGhost) {
      // Ghost ON → set isPublic=false and clear GPS coords so no one finds us via DB fallback
      await supabase.from('profiles').update({
        avatar_config: supabase.rpc ? undefined : undefined // handled below
      }).eq('id', userId);
      // Use raw update to patch only location inside avatar_config jsonb
      await supabase.rpc('set_ghost_mode', { p_user_id: userId, p_is_ghost: true }).catch(() => {
        // Fallback: update directly
        supabase.from('profiles').select('avatar_config').eq('id', userId).single().then(({ data }) => {
          if (data?.avatar_config) {
            const updated = { ...data.avatar_config, location: { ...data.avatar_config.location, isPublic: false, latitude: null, longitude: null } };
            supabase.from('profiles').update({ avatar_config: updated }).eq('id', userId);
          }
        });
      });
    } else {
      // Ghost OFF → set isPublic=true (GPS will be restored on next heartbeat)
      await supabase.rpc('set_ghost_mode', { p_user_id: userId, p_is_ghost: false }).catch(() => {
        supabase.from('profiles').select('avatar_config').eq('id', userId).single().then(({ data }) => {
          if (data?.avatar_config) {
            const updated = { ...data.avatar_config, location: { ...data.avatar_config.location, isPublic: true } };
            supabase.from('profiles').update({ avatar_config: updated }).eq('id', userId);
          }
        });
      });
    }
  } catch (e) {
    console.warn('[Ghost] Could not update Supabase ghost status:', e);
  }
};

const isAdminUser = (u: any) => {
    if (!u) return false;
    const name = (u.name || '').toLowerCase();
    const phone = (u.phone_number || u.phoneNumber || '').toLowerCase();
    const id = u.id || u.user_id || '';
    return name.includes('administrateur') || 
           name.includes('admin') || 
           phone.includes('levelmak611') ||
           id === 'admin' ||
           id === 'levelmak611';
};

export const WorldBrainMap: React.FC<any> = ({ onCloseMap, onNavigate }) => {
  const { t, user, addNotification, mapFocusFeatureId, setMapFocusFeatureId, setAtlasFocusFeatureId, addLevelCoins, resolveBattle } = useStore();

  const [activeAtlasCategory, setActiveAtlasCategory] = useState<'none' | 'river' | 'resource' | 'relief' | 'climate'>('none');
  const [isAtlasMenuOpen, setIsAtlasMenuOpen] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(!(user?.location?.isPublic ?? true));
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  const isMountedRef = useRef(true);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      mapRef.current = null;
    };
  }, []);
  const [activeBattle, setActiveBattle] = useState<any>(null);
  const [sessionScore, setSessionScore] = useState({ host: 0, guest: 0 });
  const [incomingInvite, setIncomingInvite] = useState<BattleRequest | null>(null);
  const [isBettingOpen, setIsBettingOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pendingDuelType, setPendingDuelType] = useState<string>('quiz');
  const [pendingDifficulty, setPendingDifficulty] = useState<'easy' | 'hard' | 'expert'>('easy');
  const [highlightedFeatureId, setHighlightedFeatureId] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'locked' | 'error'>('searching');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUsersListOpen, setIsUsersListOpen] = useState(false);
  const channelRef = useRef<any>(null);
  const hasCentered = useRef(!!mapFocusFeatureId);

  // Device-specific session ID
  const deviceSessionId = useMemo(() => `device_${Math.random().toString(36).substring(2, 12)}`, []);

  // initial load of location
  useEffect(() => {
      const loc = user?.location || (user?.avatar as any)?.location;
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
          setMyLocation({ lat: loc.latitude, lng: loc.longitude });
      }
  }, []);

  // Listen to find_opponent event
  useEffect(() => {
    const handleFindOpponent = () => {
      setIsUsersListOpen(true);
      const el = document.getElementById('world-map');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    };
    window.addEventListener('find_opponent', handleFindOpponent);
    return () => window.removeEventListener('find_opponent', handleFindOpponent);
  }, []);

  // GPS Watcher & Initial Lock
  const requestGps = async () => {
    try {
      setGpsStatus('searching');
      
      const permission = await Geolocation.checkPermissions();
      console.log("📍 [Map] Permission status:", permission.location);
      
      if (permission.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
           console.error("📍 [Map] Permission denied by user");
           setGpsStatus('error');
           return null;
        }
      }

      // 1. Get initial quick position
      try {
          console.log("📍 [Map] Fetching initial position...");
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
          if (pos) {
              const { latitude, longitude } = pos.coords;
              console.log(`📍 [Map] Initial Pos: ${latitude}, ${longitude}`);
              if (isMountedRef.current) {
                  setMyLocation({ lat: latitude, lng: longitude });
                  setGpsStatus('locked');
                  if (mapRef.current && !mapFocusFeatureId) {
                      try {
                          mapRef.current.flyTo([latitude, longitude], 13);
                      } catch (err) {
                          console.warn("flyTo failed:", err);
                      }
                  }
              }
          }
      } catch (e) {
          console.warn("📍 [Map] High accuracy initial fetch failed, trying fallback...", e);
          try {
              const fallbackPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 5000 });
              if (fallbackPos) {
                  const { latitude, longitude } = fallbackPos.coords;
                  if (isMountedRef.current) {
                      setMyLocation({ lat: latitude, lng: longitude });
                      setGpsStatus('locked');
                  }
              }
          } catch (innerE) {
              console.error("📍 [Map] All initial fetch attempts failed, setting default Conakry coords", innerE);
              if (isMountedRef.current) {
                  setMyLocation({ lat: 9.5370, lng: -13.6785 });
                  setGpsStatus('locked');
              }
          }
      }

      // 2. Continuous Watch
      console.log("📍 [Map] Starting watchPosition...");
      return await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
        if (err) {
            console.error("📍 [Map] Watch error:", err);
            return;
        }
        if (pos) {
          const { latitude, longitude } = pos.coords;
          console.log(`📍 [Map] Watch Update: ${latitude}, ${longitude}`);
          if (!isMountedRef.current) return;
          setMyLocation({ lat: latitude, lng: longitude });
          setGpsStatus('locked');
          
          if (!hasCentered.current && mapRef.current) {
              try {
                  mapRef.current.flyTo([latitude, longitude], 13);
                  hasCentered.current = true;
              } catch (err) {
                  console.warn("flyTo failed in watch:", err);
              }
          }
        }
      });
    } catch (e) {
        console.error("📍 [Map] Critical error in requestGps:", e);
        setGpsStatus('error');
        return null;
    }
  };

  useEffect(() => {
    let watchId: string | null = null;
    requestGps().then(id => { if (id && isMountedRef.current) watchId = id; });
    return () => { if (watchId) Geolocation.clearWatch({ id: watchId }); };
  }, []);

  // Presence & Database Fallback
  useEffect(() => {
    if (!user) return;
    console.log("📍 [Map] Initializing Supabase presence channel for device:", deviceSessionId);
    const channel = supabase.channel('world-presence-v3', { config: { presence: { key: deviceSessionId } } });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log("📍 [Map] Realtime Presence Sync State:", state);
        const users: any[] = [];
        for (const key in state) {
            // Allow same user on different sessions (e.g. computer and phone testing)
            const p = state[key] as any;
            if (p[0] && typeof p[0].lat === 'number') {
                users.push({ ...p[0], session_id: key });
            }
        }
        console.log("📍 [Map] Active users mapped from presence:", users);
        setActiveUsers(users);
      })
      .on('broadcast', { event: 'battle_invite' }, (p) => { 
          if (p.payload.request.guest.id === user.id) {
              setIncomingInvite(p.payload.request); 
              sendLocalNotification('Nouveau Défi ! ⚔️', `${p.payload.request.host.name} te défie au ${p.payload.request.type === 'quiz' ? 'Quiz' : p.payload.request.type === 'doodle' ? 'Doodle' : 'Morpion'}`);
              HapticFeedback.success();
              audioService.playBattleInvite();
          }
      })
      .on('broadcast', { event: 'battle_accept' }, (p) => { if (p.payload.request.host.id === user.id) startBattle(p.payload.request, true); })
      .on('broadcast', { event: 'battle_exit' }, (p) => {
          if (p.payload.battleId) {
              setActiveBattle(prev => {
                  if (prev && prev.state.id === p.payload.battleId && p.payload.senderId !== user.id) {
                      if (prev.state.status === 'active') return prev;
                      addNotification('info', 'Défi annulé ⚔️', `L'adversaire a quitté la partie.`);
                      HapticFeedback.navigation();
                      return null;
                  }
                  return prev;
              });
          }
      })
      .subscribe((status) => {
          console.log("📍 [Map] Supabase presence subscription status changed:", status);
          if (status === 'SUBSCRIBED') {
              setIsSubscribed(true);
          }
      });

    // Fallback: Fetch all profiles from Supabase database
    supabase.from('profiles').select('id, name, phone_number, avatar_config').then(({data}) => {
        if (data) {
          // Show users who are public (or if not specified, default to true) and are not admins
          const visibleProfiles = data.filter(p => 
            p.avatar_config?.location?.isPublic !== false &&
            !isAdminUser(p)
          );
          console.log("📍 [Map] Fallback profiles loaded from DB:", visibleProfiles.length);
          setAllProfiles(visibleProfiles.map(p => ({ 
            user_id: p.id, 
            name: p.name, 
            phone_number: p.phone_number,
            lat: p.avatar_config?.location?.latitude, 
            lng: p.avatar_config?.location?.longitude, 
            avatar: p.avatar_config?.image 
          })));
        }
    });

    return () => { 
        console.log("📍 [Map] Removing Supabase presence channel");
        supabase.removeChannel(channel); 
    };
  }, [user, deviceSessionId]);

  // Heartbeat tracking (Throttled & Guaranteed)
  useEffect(() => {
    if (!channelRef.current || !isSubscribed || !user) return;

    if (isGhostMode) {
      channelRef.current.untrack();
      return;
    }

    const currentCoords = myLocation || { lat: 9.5370, lng: -13.6785 }; // Fallback to Conakry coordinates

    const track = async () => {
        console.log("📍 [Map] Heartbeat track sending location:", currentCoords);
        
        // 1. Broadcast in Realtime Channel
        channelRef.current.track({ 
            user_id: user.id, 
            name: user.name, 
            avatar: user.avatar?.image, 
            lat: currentCoords.lat, 
            lng: currentCoords.lng,
            is_ghost: false,
            last_seen: Date.now()
        });

        // 2. Also write/save to Supabase profiles database to guarantee fallback is 100% up to date
        try {
            const { data: profile } = await supabase.from('profiles').select('avatar_config').eq('id', user.id).single();
            const config = profile?.avatar_config || {};
            const updatedConfig = {
                ...config,
                location: {
                    latitude: currentCoords.lat,
                    longitude: currentCoords.lng,
                    isPublic: !isGhostMode
                }
            };
            await supabase.from('profiles').update({ avatar_config: updatedConfig }).eq('id', user.id);
            console.log("📍 [Map] Geolocation successfully saved to Supabase profiles database");
        } catch (e) {
            console.warn("📍 [Map] Could not write location to Supabase profiles fallback:", e);
        }
    };
    
    track(); // Initial track
    const interval = setInterval(track, 10000); // Heartbeat every 10s
    return () => clearInterval(interval);
  }, [isSubscribed, myLocation, user, isGhostMode]);

  // Atlas Focus Logic
  useEffect(() => {
    if (map && mapFocusFeatureId) {
      setHighlightedFeatureId(mapFocusFeatureId);
      const f = ATLAS_DATA.find(x => x.id === mapFocusFeatureId);
      if (f) {
        setActiveAtlasCategory(f.type as any);
        const coords = Array.isArray(f.coords[0]) ? (f.coords as any)[0] : f.coords;
        if (typeof coords[0] === 'number') {
          const timer = setTimeout(() => {
              if (isMountedRef.current && mapRef.current) {
                  try {
                      mapRef.current.flyTo(coords, 10, { animate: true });
                  } catch (err) {
                      console.warn("flyTo failed in focus logic:", err);
                  }
              }
              setMapFocusFeatureId(null);
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [map, mapFocusFeatureId]);

  const startBattle = (request: any, isHost: boolean) => {
      setActiveBattle({ state: { ...request, status: 'active' }, questions: request.questions, isHost });
  };

  const handleBattleEnd = (winnerId: string | 'draw') => {
    if (!activeBattle || !user) return;
    const isWin = winnerId === user.id;
    if (winnerId !== 'draw') {
        setSessionScore(p => ({ host: p.host + (activeBattle.isHost ? (isWin?1:0) : (isWin?0:1)), guest: p.guest + (activeBattle.isHost ? (isWin?0:1) : (isWin?1:0)) }));
        if (activeBattle.state.betAmount) addLevelCoins(isWin ? activeBattle.state.betAmount : -activeBattle.state.betAmount);
    }
    resolveBattle(winnerId === 'draw' ? '' : winnerId, winnerId === 'draw');
  };

  const finalUsers = useMemo(() => {
      const mapUsers = new Map<string, any>();
      const activeUserIds = new Set(activeUsers.map(u => u.user_id));

      // 1. Add all profiles from Supabase DB (default is_online: false)
      allProfiles.forEach(p => {
        if (p.user_id !== user?.id && !isAdminUser(p) && typeof p.lat === 'number' && typeof p.lng === 'number') {
          const isOnline = activeUserIds.has(p.user_id);
          mapUsers.set(p.user_id, { ...p, is_online: isOnline });
        }
      });
      // 2. Override/enrich with Realtime active presence users (is_online: true)
      activeUsers.forEach(u => {
        if (!u.is_ghost && !isAdminUser(u)) {
          // Allow showing same user ID if it is a different session (phone vs computer testing)
          const isSelfDifferentSession = u.user_id === user?.id && u.session_id !== deviceSessionId;
          if (u.user_id !== user?.id || isSelfDifferentSession) {
             const key = isSelfDifferentSession ? `${u.user_id}_${u.session_id}` : u.user_id;
             const existing = mapUsers.get(key) || {};
             mapUsers.set(key, { ...existing, ...u, user_id: key, actual_user_id: u.user_id, is_online: true });
          }
        }
      });
      return Array.from(mapUsers.values());
  }, [activeUsers, allProfiles, user?.id, deviceSessionId]);

  const filteredUsers = useMemo(() => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return finalUsers;
      return finalUsers.filter(u => 
        u.name.toLowerCase().includes(q) || 
        (u.phone_number && u.phone_number.includes(q))
      );
  }, [finalUsers, searchQuery]);

  return (
    <div className={`bg-slate-900 p-6 rounded-[2rem] border border-white/5 relative min-h-[550px] ${onCloseMap ? 'fixed inset-4 z-[9999]' : ''}`}>
      {onCloseMap && <button onClick={onCloseMap} className="absolute top-6 right-6 z-[100] p-3 bg-white/10 text-white rounded-full"><X size={24} /></button>}

      <div className="mb-4 relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><Globe className="text-blue-400" size={24} /> {t('atlas.title')}</h2>
          <p className="text-slate-400 text-[10px] font-bold mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 
            {activeUsers.length + 1} élève{activeUsers.length + 1 > 1 ? 's' : ''} en ligne (Toi {activeUsers.length > 0 ? `+ ${activeUsers.length}` : ''})
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <button 
            onClick={() => {
              setSelectedUser({ user_id: 'levelbot', name: 'LevelBot 🤖', avatar: null });
              setPendingDuelType('quiz');
              setPendingDifficulty('easy');
              setIsBettingOpen(true);
              HapticFeedback.selection();
            }}
            className="px-3 sm:px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400 hover:text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/10 flex-1 sm:flex-initial text-center"
          >
            Entraînement IA 🤖
          </button>
          <button 
            onClick={() => setIsUsersListOpen(!isUsersListOpen)}
            className="px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider hover:bg-white/10 transition-colors flex-1 sm:flex-initial text-center"
          >
            {isUsersListOpen ? 'Fermer Liste' : 'Voir Élèves'}
          </button>
        </div>
      </div>

      <div className="relative w-full h-[450px] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl z-0">
        {/* Atlas Controls moved inside the map container */}
        <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
          <button 
              onClick={async () => {
                  HapticFeedback.selection();
                  const newGhostState = !isGhostMode;
                  setIsGhostMode(newGhostState);
                  
                  if (newGhostState) {
                    // ---- ACTIVATE GHOST ----
                    // 1. Stop broadcasting presence
                    if (channelRef.current) channelRef.current.untrack();
                    // 2. Remove from Supabase DB so DB-fallback query won't see us
                    if (user?.id) await pushGhostStatus(user.id, true);
                  } else {
                    // ---- DEACTIVATE GHOST ----
                    // 1. Re-enable in Supabase
                    if (user?.id) await pushGhostStatus(user.id, false);
                    // 2. Presence heartbeat will auto-restart via useEffect
                  }
              }} 
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${
                isGhostMode 
                  ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.5)]' 
                  : 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'
              }`}
              title={isGhostMode ? '👻 Mode Fantôme ACTIF — invisible pour tous' : 'Activer Mode Fantôme'}
          >
              {isGhostMode ? <Ghost size={18} /> : <Eye size={18} />}
          </button>
          {isGhostMode && (
            <div className="absolute top-14 right-0 bg-purple-900/90 text-purple-200 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-purple-500/40 whitespace-nowrap shadow-xl backdrop-blur-md">
              👻 Invisible
            </div>
          )}
          <button onClick={() => { setActiveAtlasCategory('none'); setIsAtlasMenuOpen(false); setHighlightedFeatureId(null); mapRef.current?.setView([10.5, -11], 6); }} className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${activeAtlasCategory === 'none' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'}`}><Globe size={18} /></button>
          <button onClick={() => setIsAtlasMenuOpen(!isAtlasMenuOpen)} className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${isAtlasMenuOpen ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'}`}><Menu size={18} /></button>
          {isAtlasMenuOpen && (
              <div className="flex flex-col gap-2 mt-1">
                  {[ {id:'river', icon:<Waves size={18}/>}, {id:'resource', icon:<HardHat size={18}/>}, {id:'relief', icon:<Mountain size={18}/>} ].map(cat => (
                      <button key={cat.id} onClick={() => { setActiveAtlasCategory(cat.id as any); setHighlightedFeatureId(null); }} className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${activeAtlasCategory === cat.id ? 'bg-white text-slate-900 border-white' : 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'}`}>{cat.icon}</button>
                  ))}
              </div>
          )}
        </div>
        <MapContainer 
            center={myLocation ? [myLocation.lat, myLocation.lng] : [10.5, -11]} 
            zoom={6} 
            scrollWheelZoom={false} 
            zoomAnimation={false}
            markerZoomAnimation={false}
            className="w-full h-full" 
            ref={(mapInstance) => {
                if (mapInstance) {
                    setMap(mapInstance);
                    mapRef.current = mapInstance;
                }
            }}
        >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            {activeAtlasCategory !== 'none' && ATLAS_DATA.filter(f => f.type === activeAtlasCategory).map(f => {
                const isHighlighted = highlightedFeatureId === f.id;
                let featureIcon = StudentIcon;
                if (f.type === 'river') featureIcon = isHighlighted ? RiverFocusIcon : RiverIcon;
                else if (f.type === 'resource') featureIcon = isHighlighted ? ResourceFocusIcon : ResourceIcon;
                else if (f.type === 'relief') featureIcon = isHighlighted ? ReliefFocusIcon : ReliefIcon;

                return (
                  <React.Fragment key={f.id}>
                      {f.type === 'river' && Array.isArray(f.coords[0]) && (
                          <Polyline 
                              positions={f.coords as any} 
                              pathOptions={{ 
                                  color: isHighlighted ? '#1E3A8A' : '#3B82F6', 
                                  weight: isHighlighted ? 6 : 3, 
                                  opacity: isHighlighted ? 1 : 0.5,
                                  dashArray: isHighlighted ? '10, 10' : undefined
                              }} 
                          />
                      )}
                      <Marker position={Array.isArray(f.coords[0]) ? (f.coords as any)[0] : (f.coords as any)} icon={featureIcon} zIndexOffset={isHighlighted ? 1000 : 0}>
                          <Popup className="premium-popup">
                              <div className="p-2 text-center min-w-[100px]">
                                  <p className="font-black text-slate-900 text-xs">{t(`atlas.lessons.${f.id}.title`)}</p>
                                  <button 
                                    onClick={() => { 
                                      HapticFeedback.success();
                                      setAtlasFocusFeatureId(f.id); 
                                      if(onNavigate) onNavigate('atlas'); 
                                    }} 
                                    className="mt-2 w-full py-2 bg-blue-600 text-white text-[10px] rounded-lg font-black uppercase shadow-md active:scale-95 transition-transform"
                                  >
                                    Lire
                                  </button>
                              </div>
                          </Popup>
                      </Marker>
                  </React.Fragment>
                );
            })}

            {activeAtlasCategory === 'none' && finalUsers.map((u) => (
                <Marker 
                  key={u.user_id} 
                  position={[u.lat, u.lng]} 
                  icon={StudentIcon}
                  eventHandlers={{
                    click: () => {
                        HapticFeedback.selection();
                        if (mapRef.current) {
                            try {
                                mapRef.current.flyTo([u.lat, u.lng], 14);
                            } catch (_) {}
                        }
                    }
                  }}
                >
                    <Popup className="premium-popup">
                        <div className="p-3 text-center">
                            <p className="font-black text-slate-900 text-sm mb-1">{u.name}</p>
                            <button onClick={() => { setSelectedUser(u); setPendingDuelType('quiz'); setIsBettingOpen(true); }} className="w-full py-2 bg-blue-600 text-white text-[10px] rounded-xl font-black">DÉFIER ⚔️</button>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {myLocation && typeof myLocation.lat === 'number' && (
                <Marker position={[myLocation.lat, myLocation.lng]} icon={isGhostMode ? GhostIcon : SelfIcon} zIndexOffset={500}>
                    <Popup className="premium-popup">
                        <div className="p-2 text-center">
                            <p className="font-black text-blue-600 text-[10px] uppercase">
                                {isGhostMode ? "C'est Toi (Fantôme) 👻" : "C'est Toi (Visible) 🚀"}
                            </p>
                            <p className="text-[8px] text-slate-400 font-mono mt-1">{myLocation.lat.toFixed(4)}, {myLocation.lng.toFixed(4)}</p>
                            {isGhostMode && <p className="text-[7px] text-purple-400 font-bold mt-1 uppercase">Invisible pour les autres</p>}
                        </div>
                    </Popup>
                </Marker>
            )}
        </MapContainer>

        {/* Floating Users List Overlay */}
        <AnimatePresence>
          {isUsersListOpen && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 right-0 w-64 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-[1000] p-4 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black text-xs uppercase tracking-widest">Élèves Connectés</h3>
                <button onClick={() => setIsUsersListOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Rechercher (Nom, Tel...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {/* Pinned LevelBot IA Item */}
                <div 
                  onClick={() => {
                    HapticFeedback.selection();
                    setSelectedUser({ user_id: 'levelbot', name: 'LevelBot 🤖', avatar: null });
                    setPendingDuelType('quiz');
                    setPendingDifficulty('easy');
                    setIsBettingOpen(true);
                    if (window.innerWidth < 640) setIsUsersListOpen(false);
                  }}
                  className="p-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-2xl cursor-pointer transition-all group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-[10px] shadow-lg animate-pulse">
                      🤖
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[11px] font-black tracking-wide truncate">LevelBot (Tuteur IA)</p>
                      <p className="text-purple-400 text-[9px] truncate">Entraînement Solo & Défis</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      HapticFeedback.selection();
                      setSelectedUser({ user_id: 'levelbot', name: 'LevelBot 🤖', avatar: null });
                      setPendingDuelType('quiz');
                      setPendingDifficulty('easy');
                      setIsBettingOpen(true);
                      if (window.innerWidth < 640) setIsUsersListOpen(false);
                    }}
                    className="mt-2 w-full py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-[9px] font-black rounded-lg transition-all border border-purple-500/30"
                  >
                    S'ENTRAÎNER ⚔️
                  </button>
                </div>

                {/* FAVORITES SECTION ⭐ */}
                {filteredUsers.filter(u => {
                  const actualId = u.user_id.includes('_') ? u.user_id.split('_')[0] : u.user_id;
                  return favoriteUserIds.includes(actualId);
                }).length > 0 && (
                  <>
                    <div className="relative py-1 mt-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-amber-500/30"></div></div>
                      <div className="relative flex justify-center text-[8px]"><span className="px-2 bg-[#0d1527] text-amber-400 font-black uppercase tracking-widest leading-none flex items-center gap-1"><Star size={10} className="fill-amber-400" /> Mes Amis & Rivaux Favoris</span></div>
                    </div>

                    {filteredUsers.filter(u => {
                      const actualId = u.user_id.includes('_') ? u.user_id.split('_')[0] : u.user_id;
                      return favoriteUserIds.includes(actualId);
                    }).map((u) => {
                      const actualId = u.user_id.includes('_') ? u.user_id.split('_')[0] : u.user_id;
                      const isFav = favoriteUserIds.includes(actualId);
                      return (
                        <div 
                          key={`fav_${u.user_id}`}
                          onClick={() => {
                            if (mapRef.current) {
                                try { mapRef.current.flyTo([u.lat, u.lng], 15); } catch (_) {}
                            }
                            HapticFeedback.selection();
                            if (window.innerWidth < 640) setIsUsersListOpen(false);
                          }}
                          className="p-3 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 rounded-2xl cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 font-black text-[10px] shadow-lg">
                              {u.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-[11px] font-bold truncate flex items-center gap-1">
                                {u.name} <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                              </p>
                              <p className={`text-[9px] font-semibold truncate ${u.is_online ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {u.is_online ? 'En ligne 🟢' : 'Hors-ligne ⚪'}
                              </p>
                            </div>
                            <button
                              onClick={(e) => toggleFavoriteUser(u.user_id, e)}
                              className="p-1.5 text-amber-400 hover:text-amber-300 transition-colors"
                              title="Retirer des favoris"
                            >
                              <Star size={14} className="fill-amber-400" />
                            </button>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(u);
                              setPendingDuelType('quiz');
                              setIsBettingOpen(true);
                            }}
                            className="mt-2 w-full py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-900 text-[9px] font-black rounded-lg transition-all border border-amber-500/40"
                          >
                            DÉFIER FAVORIS ⚔️
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}

                <div className="relative py-1 mt-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-[8px]"><span className="px-2 bg-[#0d1527] text-slate-500 font-bold uppercase tracking-widest leading-none">Élèves en Ligne</span></div>
                </div>

                {filteredUsers.filter(u => u.is_online).length === 0 ? (
                  <p className="text-center text-slate-500 text-[10px] py-3 italic">Aucun autre élève en ligne pour le moment</p>
                ) : (
                  filteredUsers.filter(u => u.is_online).map((u) => {
                    const actualId = u.user_id.includes('_') ? u.user_id.split('_')[0] : u.user_id;
                    const isFav = favoriteUserIds.includes(actualId);
                    return (
                      <div 
                        key={u.user_id}
                        onClick={() => {
                          if (mapRef.current) {
                              try {
                                  mapRef.current.flyTo([u.lat, u.lng], 15);
                              } catch (_) {}
                          }
                          HapticFeedback.selection();
                          if (window.innerWidth < 640) setIsUsersListOpen(false);
                        }}
                        className="p-3 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 rounded-2xl cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-[10px] shadow-lg">
                            {u.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-[11px] font-bold truncate">{u.name}</p>
                            <p className="text-emerald-400 text-[9px] font-semibold truncate">En ligne 🟢</p>
                          </div>
                          <button
                            onClick={(e) => toggleFavoriteUser(u.user_id, e)}
                            className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                            title={isFav ? "Favori" : "Ajouter aux favoris"}
                          >
                            <Star size={14} className={isFav ? "fill-amber-400 text-amber-400" : ""} />
                          </button>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                            setPendingDuelType('quiz');
                            setIsBettingOpen(true);
                          }}
                          className="mt-2 w-full py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-[9px] font-black rounded-lg transition-all border border-blue-500/30"
                        >
                          DÉFIER ⚔️
                        </button>
                      </div>
                    );
                  })
                )}

                {/* Offline Users / Profiles Section */}
                {filteredUsers.filter(u => !u.is_online).length > 0 && (
                  <>
                    <div className="relative py-1 mt-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                      <div className="relative flex justify-center text-[8px]"><span className="px-2 bg-[#0d1527] text-slate-500 font-bold uppercase tracking-widest leading-none">Inscrits (Hors-Ligne)</span></div>
                    </div>

                    {filteredUsers.filter(u => !u.is_online).map((u) => {
                      const actualId = u.user_id.includes('_') ? u.user_id.split('_')[0] : u.user_id;
                      const isFav = favoriteUserIds.includes(actualId);
                      return (
                        <div 
                          key={u.user_id}
                          onClick={() => {
                            if (mapRef.current) {
                                try {
                                    mapRef.current.flyTo([u.lat, u.lng], 15);
                                } catch (_) {}
                            }
                            HapticFeedback.selection();
                            if (window.innerWidth < 640) setIsUsersListOpen(false);
                          }}
                          className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl cursor-pointer transition-all group opacity-75 hover:opacity-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-black text-[10px] shadow-lg">
                              {u.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-300 text-[11px] font-bold truncate">{u.name}</p>
                              <p className="text-slate-500 text-[9px] truncate">Hors-ligne ⚪</p>
                            </div>
                            <button
                              onClick={(e) => toggleFavoriteUser(u.user_id, e)}
                              className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                              title={isFav ? "Favori" : "Ajouter aux favoris"}
                            >
                              <Star size={14} className={isFav ? "fill-amber-400 text-amber-400" : ""} />
                            </button>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(u);
                              setPendingDuelType('quiz');
                              setIsBettingOpen(true);
                            }}
                            className="mt-2 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[9px] font-black rounded-lg transition-all border border-white/10"
                          >
                            DÉFIER (ASYNCHRONE) ⚔️
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <AnimatePresence>
        {isBettingOpen && selectedUser && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black dark:text-white uppercase">Défier {selectedUser.name}</h3>
                    <button onClick={() => setIsBettingOpen(false)}><X size={24} className="dark:text-white" /></button>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Type de Duel</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => setPendingDuelType('quiz')}
                                className={`py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${pendingDuelType === 'quiz' ? 'bg-blue-600 text-white shadow-glow-blue scale-105' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
                            >
                                Quiz
                            </button>
                            <button 
                                onClick={() => setPendingDuelType('doodle')}
                                disabled={selectedUser.user_id === 'levelbot'}
                                className={`py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${
                                    selectedUser.user_id === 'levelbot' 
                                        ? 'opacity-30 cursor-not-allowed' 
                                        : pendingDuelType === 'doodle' 
                                            ? 'bg-pink-600 text-white shadow-glow-pink scale-105' 
                                            : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                                }`}
                            >
                                Doodle
                            </button>
                            <button 
                                onClick={() => setPendingDuelType('ttt')}
                                className={`py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${pendingDuelType === 'ttt' ? 'bg-orange-600 text-white shadow-glow-orange scale-105' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
                            >
                                Morpion
                            </button>
                        </div>
                    </div>

                    {selectedUser.user_id === 'levelbot' && (
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Difficulté de l'IA</p>
                            <div className="grid grid-cols-3 gap-2">
                                {(['easy', 'hard', 'expert'] as const).map(diff => (
                                    <button 
                                        key={diff}
                                        onClick={() => setPendingDifficulty(diff)}
                                        className={`py-3 rounded-2xl font-black uppercase text-[10px] transition-all ${pendingDifficulty === diff ? 'bg-purple-600 text-white shadow-glow-purple scale-105' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
                                    >
                                        {diff === 'easy' ? 'Facile' : diff === 'hard' ? 'Difficile' : 'Expert'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={async () => {
                            HapticFeedback.success();
                            if (selectedUser.user_id === 'levelbot') {
                                const difficultyLabel = pendingDifficulty === 'easy' ? 'Facile' : pendingDifficulty === 'hard' ? 'Difficile' : 'Expert';
                                const request = {
                                    id: `battle_${Date.now()}`,
                                    type: pendingDuelType,
                                    host: { id: user?.id, name: user?.name, avatar: user?.avatar?.image, score: 0 },
                                    guest: { id: 'levelbot', name: `LevelBot 🤖 (${difficultyLabel})`, avatar: null, difficulty: pendingDifficulty, score: 0 },
                                    status: 'active',
                                    timestamp: new Date().toISOString()
                                };
                                setIsBettingOpen(false);
                                startBattle(request, true);
                            } else {
                                const request = {
                                    id: `battle_${Date.now()}`,
                                    type: pendingDuelType,
                                    host: { id: user?.id, name: user?.name, avatar: user?.avatar?.image },
                                    guest: { id: selectedUser.user_id, name: selectedUser.name, avatar: selectedUser.avatar },
                                    status: 'pending',
                                    timestamp: new Date().toISOString()
                                };
                                channelRef.current.send({ type: 'broadcast', event: 'battle_invite', payload: { request } });
                                setIsBettingOpen(false);
                                addNotification('info', 'Défi envoyé !', `Attente de la réponse de ${selectedUser.name}...`);
                            }
                        }}
                        className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:scale-105 transition-transform"
                    >
                        Lancer le défi ⚔️
                    </button>
                </div>
            </motion.div>
          </div>
        )}

        {incomingInvite && (
           <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-10 left-6 right-6 z-[2000] bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-2xl border-2 border-blue-500 flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                      {incomingInvite.host.name[0]}
                  </div>
                  <div>
                      <p className="text-xs font-black text-blue-500 uppercase">Nouveau Défi !</p>
                      <p className="text-sm font-bold dark:text-white">{incomingInvite.host.name} te défie au {incomingInvite.type === 'quiz' ? 'Quiz' : incomingInvite.type === 'doodle' ? 'Doodle' : 'Morpion'}</p>
                  </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setIncomingInvite(null)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500"><X size={20}/></button>
                  <button 
                    onClick={() => {
                        HapticFeedback.success();
                        const req = { ...incomingInvite, status: 'active' };
                        channelRef.current.send({ type: 'broadcast', event: 'battle_accept', payload: { request: req } });
                        setIncomingInvite(null);
                        startBattle(req, false);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg"
                  >
                    Accepter
                  </button>
              </div>
           </motion.div>
        )}

        {activeBattle && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full h-full">
              {activeBattle.state.type === 'ttt' ? (
                <TicTacToe 
                  battleId={activeBattle.state.id} 
                  currentUser={user!} 
                  opponent={activeBattle.isHost ? activeBattle.state.guest : activeBattle.state.host} 
                  isHost={activeBattle.isHost} 
                  channel={channelRef.current} 
                  currentScore={sessionScore} 
                  currentBet={activeBattle.state.betAmount || 0}
                  onRematch={() => {}}
                  onEnd={handleBattleEnd} 
                  onExit={() => {
                      if (activeBattle.state.status !== 'finished') {
                          channelRef.current.send({
                              type: 'broadcast',
                              event: 'battle_exit',
                              payload: { battleId: activeBattle.state.id, senderId: user!.id }
                          });
                      }
                      setActiveBattle(null);
                  }} 
                />
              ) : activeBattle.state.type === 'quiz' ? (
                <QuizBattle 
                  initialState={activeBattle.state} 
                  isHost={activeBattle.isHost} 
                  onClose={() => {
                      if (activeBattle.state.status !== 'finished') {
                          channelRef.current.send({
                              type: 'broadcast',
                              event: 'battle_exit',
                              payload: { battleId: activeBattle.state.id, senderId: user!.id }
                          });
                      }
                      setActiveBattle(null);
                  }} 
                />
              ) : activeBattle.state.type === 'doodle' ? (
                <CollaborativeDoodle 
                  battleState={activeBattle.state} 
                  isHost={activeBattle.isHost} 
                  onClose={() => {
                      if (activeBattle.state.status !== 'finished') {
                          channelRef.current.send({
                              type: 'broadcast',
                              event: 'battle_exit',
                              payload: { battleId: activeBattle.state.id, senderId: user!.id }
                          });
                      }
                      setActiveBattle(null);
                  }} 
                />
              ) : null}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
