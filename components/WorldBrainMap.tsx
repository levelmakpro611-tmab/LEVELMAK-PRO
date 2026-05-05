import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticFeedback } from '../services/nativeAdapters';
import { Globe, Menu, X, Waves, HardHat, Mountain, Thermometer, Ghost, Eye } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../services/supabase';
import { BattleRequest, BattleState, QuizQuestion } from '../types';
import { QuizBattle } from './QuizBattle';
import { CollaborativeDoodle } from './CollaborativeDoodle';
import { TicTacToe } from './TicTacToe';
import { ATLAS_DATA } from '../utils/geoAtlasData';
import { Geolocation } from '@capacitor/geolocation';

// Robust Marker Icons
const createIcon = (color: string, isSelf: boolean = false) => new L.DivIcon({
  className: isSelf ? 'marker-self-elite' : 'marker-student',
  html: `<div style="background-color: ${color}; width: ${isSelf ? '24px' : '20px'}; height: ${isSelf ? '24px' : '20px'}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 20px ${color}88; position: relative;">
            ${isSelf ? `<div style="position: absolute; inset: -8px; border-radius: 50%; border: 2px solid ${color}; opacity: 0.6; animation: pulse 1.5s infinite;"></div>` : ''}
         </div>`,
  iconSize: [isSelf ? 30 : 24, isSelf ? 30 : 24],
  iconAnchor: [isSelf ? 15 : 12, isSelf ? 15 : 12]
});

const SelfIcon = createIcon('#22C55E', true); // Vert pour soi
const StudentIcon = createIcon('#6366F1', false); // Indigo pour les autres

export const WorldBrainMap: React.FC<any> = ({ onCloseMap, onNavigate }) => {
  const { t, user, addNotification, updateLocation, mapFocusFeatureId, setMapFocusFeatureId, setAtlasFocusFeatureId, addLevelCoins, resolveBattle } = useStore();

  const [activeAtlasCategory, setActiveAtlasCategory] = useState<'none' | 'river' | 'resource' | 'relief' | 'climate'>('none');
  const [isAtlasMenuOpen, setIsAtlasMenuOpen] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(!(user?.location?.isPublic ?? true));
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [activeBattle, setActiveBattle] = useState<any>(null);
  const [sessionScore, setSessionScore] = useState({ host: 0, guest: 0 });
  const [incomingInvite, setIncomingInvite] = useState<BattleRequest | null>(null);
  const [isBettingOpen, setIsBettingOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'locked' | 'error'>('searching');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<any>(null);
  const hasCentered = useRef(false);

  // Device-specific session ID
  const deviceSessionId = useMemo(() => `device_${Math.random().toString(36).substring(2, 12)}`, []);

  // initial load of location
  useEffect(() => {
      const loc = user?.location || (user?.avatar as any)?.location;
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
          setMyLocation({ lat: loc.latitude, lng: loc.longitude });
      }
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
              setMyLocation({ lat: latitude, lng: longitude });
              setGpsStatus('locked');
              updateLocation(latitude, longitude, !isGhostMode);
              if (map) map.flyTo([latitude, longitude], 13);
          }
      } catch (e) {
          console.warn("📍 [Map] High accuracy initial fetch failed, trying fallback...", e);
          try {
              const fallbackPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 5000 });
              if (fallbackPos) {
                  const { latitude, longitude } = fallbackPos.coords;
                  setMyLocation({ lat: latitude, lng: longitude });
                  setGpsStatus('locked');
              }
          } catch (innerE) {
              console.error("📍 [Map] All initial fetch attempts failed", innerE);
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
          setMyLocation({ lat: latitude, lng: longitude });
          setGpsStatus('locked');
          updateLocation(latitude, longitude, !isGhostMode);
          
          if (!hasCentered.current && map) {
              map.flyTo([latitude, longitude], 13);
              hasCentered.current = true;
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
    requestGps().then(id => { if (id) watchId = id; });
    return () => { if (watchId) Geolocation.clearWatch({ id: watchId }); };
  }, [map]);

  // Presence & Database Fallback
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('world-presence-v3', { config: { presence: { key: deviceSessionId } } });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: any[] = [];
        for (const key in state) {
            if (key !== deviceSessionId) {
                const p = state[key] as any;
                if (p[0] && typeof p[0].lat === 'number') users.push({ ...p[0], session_id: key });
            }
        }
        setActiveUsers(users);
      })
      .on('broadcast', { event: 'battle_invite' }, (p) => { if (p.payload.request.guest.id === user.id) setIncomingInvite(p.payload.request); })
      .on('broadcast', { event: 'battle_accept' }, (p) => { if (p.payload.request.host.id === user.id) startBattle(p.payload.request, true); })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              setIsSubscribed(true);
          }
      });

    supabase.from('profiles').select('id, name, avatar_config').then(({data}) => {
        if (data) setAllProfiles(data.filter(p => p.id !== user.id).map(p => ({ user_id: p.id, name: p.name, lat: p.avatar_config?.location?.latitude, lng: p.avatar_config?.location?.longitude, avatar: p.avatar_config?.image })));
    });

    return () => { supabase.removeChannel(channel); };
  }, [user, deviceSessionId]);

  // Heartbeat tracking (Throttled & Guaranteed)
  useEffect(() => {
    if (channelRef.current && isSubscribed && user && myLocation && !isGhostMode) {
        const track = () => {
            channelRef.current.track({ 
                user_id: user.id, 
                name: user.name, 
                avatar: user.avatar?.image, 
                lat: myLocation.lat, 
                lng: myLocation.lng,
                last_seen: Date.now()
            });
        };
        
        track(); // Initial track
        const interval = setInterval(track, 15000); // Heartbeat every 15s
        return () => clearInterval(interval);
    }
  }, [isSubscribed, myLocation, user, isGhostMode]);

  // Atlas Focus Logic
  useEffect(() => {
    if (map && mapFocusFeatureId) {
      const f = ATLAS_DATA.find(x => x.id === mapFocusFeatureId);
      if (f) {
        setActiveAtlasCategory(f.type as any);
        const coords = Array.isArray(f.coords[0]) ? (f.coords as any)[0] : f.coords;
        if (typeof coords[0] === 'number') {
            setTimeout(() => { map.flyTo(coords, 10, { animate: true }); setMapFocusFeatureId(null); }, 500);
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
      const activeIds = new Set(activeUsers.map(u => u.user_id));
      const offline = allProfiles.filter(p => !activeIds.has(p.user_id) && typeof p.lat === 'number');
      return [...activeUsers, ...offline];
  }, [activeUsers, allProfiles]);

  return (
    <div className={`bg-slate-900 p-6 rounded-[2rem] border border-white/5 relative min-h-[550px] ${onCloseMap ? 'fixed inset-4 z-[9999]' : ''}`}>
      {onCloseMap && <button onClick={onCloseMap} className="absolute top-6 right-6 z-[100] p-3 bg-white/10 text-white rounded-full"><X size={24} /></button>}

      <div className="mb-4 relative z-10">
        <h2 className="text-2xl font-black text-white flex items-center gap-2"><Globe className="text-blue-400" size={24} /> {t('atlas.title')}</h2>
        <p className="text-slate-400 text-[10px] font-bold mt-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 
          {finalUsers.length + 1} élève{finalUsers.length + 1 > 1 ? 's' : ''} en ligne (Toi {finalUsers.length > 0 ? `+ ${finalUsers.length}` : ''})
        </p>
      </div>

      <div className="relative w-full h-[420px] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl z-0">
        {/* Atlas Controls moved inside the map container */}
        <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
          <button 
              onClick={() => {
                  const newGhostState = !isGhostMode;
                  setIsGhostMode(newGhostState);
                  updateLocation(myLocation?.lat || 0, myLocation?.lng || 0, !newGhostState);
                  if (newGhostState && channelRef.current) channelRef.current.untrack();
              }} 
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${isGhostMode ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'}`}
              title={isGhostMode ? 'Mode Fantôme Actif' : 'Activer Mode Fantôme'}
          >
              {isGhostMode ? <Ghost size={18} /> : <Eye size={18} />}
          </button>
          <button onClick={() => { setActiveAtlasCategory('none'); setIsAtlasMenuOpen(false); map?.setView([10.5, -11], 6); }} className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${activeAtlasCategory === 'none' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'}`}><Globe size={18} /></button>
          <button onClick={() => setIsAtlasMenuOpen(!isAtlasMenuOpen)} className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${isAtlasMenuOpen ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'}`}><Menu size={18} /></button>
          {isAtlasMenuOpen && (
              <div className="flex flex-col gap-2 mt-1">
                  {[ {id:'river', icon:<Waves size={18}/>}, {id:'resource', icon:<HardHat size={18}/>}, {id:'relief', icon:<Mountain size={18}/>} ].map(cat => (
                      <button key={cat.id} onClick={() => setActiveAtlasCategory(cat.id as any)} className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${activeAtlasCategory === cat.id ? 'bg-white text-slate-900 border-white' : 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'}`}>{cat.icon}</button>
                  ))}
              </div>
          )}
        </div>
        <MapContainer center={myLocation ? [myLocation.lat, myLocation.lng] : [10.5, -11]} zoom={6} scrollWheelZoom={false} className="w-full h-full" ref={setMap as any}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            {activeAtlasCategory !== 'none' && ATLAS_DATA.filter(f => f.type === activeAtlasCategory).map(f => (
                <React.Fragment key={f.id}>
                    {f.type === 'river' && Array.isArray(f.coords[0]) && <Polyline positions={f.coords as any} pathOptions={{ color: '#3B82F6', weight: 3, opacity: 0.5 }} />}
                    <Marker position={Array.isArray(f.coords[0]) ? (f.coords as any)[0] : (f.coords as any)} icon={StudentIcon}>
                        <Popup className="premium-popup">
                            <div className="p-2 text-center min-w-[100px]">
                                <p className="font-black text-slate-900 text-xs">{t(`atlas.lessons.${f.id}.title`)}</p>
                                <button onClick={() => { setAtlasFocusFeatureId(f.id); if(onNavigate) onNavigate('atlas'); }} className="mt-2 w-full py-1.5 bg-blue-600 text-white text-[9px] rounded-lg font-black uppercase">Lire</button>
                            </div>
                        </Popup>
                    </Marker>
                </React.Fragment>
            ))}

            {activeAtlasCategory === 'none' && finalUsers.map((u, i) => (
                <Marker key={`${u.user_id}-${i}`} position={[u.lat, u.lng]} icon={StudentIcon}>
                    <Popup className="premium-popup">
                        <div className="p-3 text-center">
                            <p className="font-black text-slate-900 text-sm mb-1">{u.name}</p>
                            <button onClick={() => { setSelectedUser(u); setPendingDuelType('quiz'); setIsBettingOpen(true); }} className="w-full py-2 bg-blue-600 text-white text-[10px] rounded-xl font-black">DÉFIER ⚔️</button>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {myLocation && typeof myLocation.lat === 'number' && (
                <Marker position={[myLocation.lat, myLocation.lng]} icon={SelfIcon} zIndexOffset={2000}>
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

      </div>

      <AnimatePresence>
        {activeBattle && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full h-full">
              {activeBattle.state.type === 'ttt' ? <TicTacToe battleId={activeBattle.state.id} currentUser={user!} opponent={activeBattle.isHost?activeBattle.state.guest:activeBattle.state.host} isHost={activeBattle.isHost} channel={channelRef.current} currentScore={sessionScore} onEnd={handleBattleEnd} onExit={() => setActiveBattle(null)} /> : 
               activeBattle.state.type === 'quiz' ? <QuizBattle initialState={activeBattle.state} isHost={activeBattle.isHost} currentScore={sessionScore} onEnd={handleBattleEnd} onClose={() => setActiveBattle(null)} /> : 
               activeBattle.state.type === 'doodle' ? <CollaborativeDoodle battleState={activeBattle.state} isHost={activeBattle.isHost} currentScore={sessionScore} onEnd={handleBattleEnd} onClose={() => setActiveBattle(null)} /> : null}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
