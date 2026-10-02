import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticFeedback, sendLocalNotification } from '../services/nativeAdapters';
import { Globe, Menu, X, Waves, HardHat, Mountain, Thermometer, Ghost, Eye, Star, Coins } from 'lucide-react';
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
    // ✅ FIX 13: Check the 'role' field from DB first as primary source of truth.
    // Name/phone matching is kept as a fallback but should never be the sole check.
    if (u.role === 'admin') return true;
    const name = (u.name || '').toLowerCase();
    const phone = (u.phone_number || u.phoneNumber || '').toLowerCase();
    const id = u.id || u.user_id || '';
    // Secondary check: only for IDs that are hard-coded admin IDs
    return id === 'admin' || id === 'levelmak611' || phone.includes('levelmak611');
};

export const WorldBrainMap: React.FC<any> = ({ onCloseMap, onNavigate }) => {
  const { t, user, addNotification, mapFocusFeatureId, setMapFocusFeatureId, setAtlasFocusFeatureId, addLevelCoins, betLevelCoins, addXp, resolveBattle, pendingBattleInvite, clearPendingBattleInvite, acceptedBattleRequest, clearAcceptedBattleRequest } = useStore();

  const [activeAtlasCategory, setActiveAtlasCategory] = useState<'none' | 'river' | 'resource' | 'relief' | 'climate'>('none');
  const [isAtlasMenuOpen, setIsAtlasMenuOpen] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(!(user?.location?.isPublic ?? true));
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);

  const [favoriteUserIds, setFavoriteUserIds] = useState<string[]>(() => {
    try {
      const key = user?.id ? `levelmak_fav_users_${user.id}` : 'levelmak_fav_users';
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleFavoriteUser = useCallback((targetUserId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    HapticFeedback.selection();
    setFavoriteUserIds(prev => {
      const actualId = targetUserId.includes('_') ? targetUserId.split('_')[0] : targetUserId;
      const updated = prev.includes(actualId)
        ? prev.filter(id => id !== actualId)
        : [...prev, actualId];
      const key = user?.id ? `levelmak_fav_users_${user.id}` : 'levelmak_fav_users';
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [user?.id]);

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
  // incomingInvite is now sourced from the global store (pendingBattleInvite)
  // keeping a local setter for channel fallback when the map is already open
  const [localIncomingInvite, setLocalIncomingInvite] = useState<BattleRequest | null>(null);
  const incomingInvite = pendingBattleInvite ?? localIncomingInvite;
  const [isBettingOpen, setIsBettingOpen] = useState(false);
  const [outgoingBattleRequest, setOutgoingBattleRequest] = useState<any>(null);
  const duelChannelRef = useRef<any>(null);
  const inviteRetryIntervalRef = useRef<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pendingDuelType, setPendingDuelType] = useState<string>('quiz');
  const [pendingDifficulty, setPendingDifficulty] = useState<'easy' | 'hard' | 'expert'>('easy');
  const [pendingBetAmount, setPendingBetAmount] = useState<number>(20);

  // Clamp bet amount to available balance
  useEffect(() => {
    if (isBettingOpen) {
      const currentCoins = Number(user?.levelCoins ?? (user as any)?.level_coins ?? 0);
      setPendingBetAmount(prev => {
        if (prev > currentCoins) {
          return currentCoins >= 10 ? 10 : (currentCoins > 0 ? currentCoins : 0);
        }
        return prev;
      });
    }
  }, [isBettingOpen, user?.levelCoins, (user as any)?.level_coins]);

  const [highlightedFeatureId, setHighlightedFeatureId] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'locked' | 'error'>('searching');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUsersListOpen, setIsUsersListOpen] = useState(false);
  const channelRef = useRef<any>(null);
  const hasCentered = useRef(!!mapFocusFeatureId);

  // Stable battle launcher that clears any retry timers
  const startBattle = useCallback((request: any, isHost: boolean) => {
    if (inviteRetryIntervalRef.current) {
      clearInterval(inviteRetryIntervalRef.current);
      inviteRetryIntervalRef.current = null;
    }
    const bet = Number(request?.betAmount) || 0;
    if (bet > 0) {
      betLevelCoins(bet);
    }
    setActiveBattle({ state: { ...request, status: 'active' }, questions: request.questions, isHost });
  }, [betLevelCoins]);

  // Device-specific session ID
  const deviceSessionId = useMemo(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('levelmak_device_session_id');
      if (!id) {
        id = `device_${Math.random().toString(36).substring(2, 12)}`;
        sessionStorage.setItem('levelmak_device_session_id', id);
      }
      return id;
    }
    return `device_${Math.random().toString(36).substring(2, 12)}`;
  }, []);

  // Listen to battle start events (e.g. when accepted from global banner)
  useEffect(() => {
    const handleStartReceivedBattle = (e: any) => {
      if (e.detail?.request) {
        console.log("📍 [Map] Received start_received_battle event:", e.detail.request);
        setOutgoingBattleRequest(null);
        startBattle(e.detail.request, false);
      }
    };
    window.addEventListener('start_received_battle', handleStartReceivedBattle);
    return () => window.removeEventListener('start_received_battle', handleStartReceivedBattle);
  }, [startBattle]);

  // Check if a battle was already accepted while Map was not yet mounted
  useEffect(() => {
    if (acceptedBattleRequest) {
      console.log("📍 [Map] Consuming acceptedBattleRequest from store on mount:", acceptedBattleRequest);
      setOutgoingBattleRequest(null);
      startBattle(acceptedBattleRequest, false);
      clearAcceptedBattleRequest();
    }
  }, [acceptedBattleRequest, clearAcceptedBattleRequest, startBattle]);

  // Listen to battle accept for host (e.g. captured by useStore)
  useEffect(() => {
    const handleHostAccept = (e: any) => {
      if (e.detail?.request) {
        console.log("📍 [Map] Received host_received_battle_accept event:", e.detail.request);
        if (inviteRetryIntervalRef.current) {
          clearInterval(inviteRetryIntervalRef.current);
          inviteRetryIntervalRef.current = null;
        }
        setOutgoingBattleRequest(null);
        startBattle(e.detail.request, true);
      }
    };
    window.addEventListener('host_received_battle_accept', handleHostAccept);
    return () => window.removeEventListener('host_received_battle_accept', handleHostAccept);
  }, [startBattle]);

  // Listen to active_battle in user's profile stats as fail-safe guarantee
  useEffect(() => {
    if (outgoingBattleRequest && user?.stats?.active_battle?.id === outgoingBattleRequest.id) {
      console.log("📍 [Map] Active battle detected via Supabase profile sync:", user.stats.active_battle);
      setOutgoingBattleRequest(null);
      startBattle(user.stats.active_battle, true);
    }
  }, [user?.stats?.active_battle, outgoingBattleRequest, startBattle]);

  // Clean up duel room channel and timers on unmount
  useEffect(() => {
    return () => {
      if (inviteRetryIntervalRef.current) {
        clearInterval(inviteRetryIntervalRef.current);
        inviteRetryIntervalRef.current = null;
      }
      if (duelChannelRef.current) {
        supabase.removeChannel(duelChannelRef.current);
        duelChannelRef.current = null;
      }
    };
  }, []);

  // ✅ FIX 15: Cache avatar_config locally at mount to avoid re-fetching every 10s in heartbeat
  const cachedAvatarConfigRef = useRef<any>(null);

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

  // GPS Realtime Location (High Accuracy & Instant Sync)
  const requestGps = async (force: boolean = false) => {
    try {
      setGpsStatus('searching');

      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
      if (isNative) {
        try {
          const permission = await Geolocation.checkPermissions();
          if (permission.location !== 'granted') {
            await Geolocation.requestPermissions();
          }
        } catch (capErr) {
          console.warn("Capacitor checkPermissions error:", capErr);
        }
      }

      const getBrowserPosition = (): Promise<{ latitude: number; longitude: number }> => {
        return new Promise((resolve, reject) => {
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            return reject(new Error('Geolocation non supportée'));
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
          );
        });
      };

      try {
        console.log("📍 [Map] Fetching real high-accuracy GPS position...");
        const coords = await getBrowserPosition();
        if (isMountedRef.current) {
          const newLoc = { lat: coords.latitude, lng: coords.longitude };
          setMyLocation(newLoc);
          setGpsStatus('locked');
          localStorage.setItem('levelmak_cached_gps_coords', JSON.stringify(newLoc));
          localStorage.setItem('levelmak_last_gps_calc', String(Date.now()));
          
          if (mapRef.current && !mapFocusFeatureId && !hasCentered.current) {
            try {
              mapRef.current.flyTo([coords.latitude, coords.longitude], 13);
              hasCentered.current = true;
            } catch (_) {}
          }

          // Instant sync to Supabase profile and Realtime Presence
          if (user?.id && !user.id.includes('anon') && !isGhostMode) {
            const config = cachedAvatarConfigRef.current || user.avatar || {};
            const updatedConfig = {
              ...config,
              location: {
                latitude: coords.latitude,
                longitude: coords.longitude,
                isPublic: true
              }
            };
            cachedAvatarConfigRef.current = updatedConfig;
            supabase.from('profiles').update({
              status: 'online',
              last_active: new Date().toISOString(),
              avatar_config: updatedConfig
            }).eq('id', user.id).then(() => {});

            if (channelRef.current && isSubscribed) {
              channelRef.current.track({
                user_id: user.id,
                session_id: deviceSessionId,
                name: user.name,
                avatar: user.avatar?.image,
                lat: coords.latitude,
                lng: coords.longitude,
                has_location: true,
                is_ghost: false,
                last_seen: Date.now()
              });
            }
          }
        }
      } catch (err: any) {
        console.warn("📍 [Map] GPS fetch error, checking cache:", err);
        const cachedCoordsStr = localStorage.getItem('levelmak_cached_gps_coords');
        if (cachedCoordsStr) {
          try {
            const parsed = JSON.parse(cachedCoordsStr);
            if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
              setMyLocation({ lat: parsed.lat, lng: parsed.lng });
              setGpsStatus('locked');
              return null;
            }
          } catch (_) {}
        }
        setGpsStatus('error');
      }

      return null;
    } catch (e) {
      console.error("📍 [Map] Error in requestGps:", e);
      setGpsStatus('error');
      return null;
    }
  };

  useEffect(() => {
    requestGps(true);
    // Periodically refresh position every 2 minutes
    const interval = setInterval(() => {
      requestGps(true);
    }, 120000);
    return () => clearInterval(interval);
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
            if (p[0] && typeof p[0].lat === 'number' && p[0].lat !== 0 && typeof p[0].lng === 'number' && p[0].lng !== 0) {
                users.push({ ...p[0], session_id: key });
            }
        }
        console.log("📍 [Map] Active users mapped from presence:", users);
        setActiveUsers(users);
      })
      .on('broadcast', { event: 'battle_invite' }, (p) => { 
          const req = p?.payload?.request;
          if (!req) return;
          const currentDeviceId = typeof window !== 'undefined' ? sessionStorage.getItem('levelmak_device_session_id') : null;
          const myName = (user?.name || '').trim().toLowerCase();
          const guestName = (req.guest?.name || '').trim().toLowerCase();
          const isNameMatch = myName.length > 1 && guestName.length > 1 && (myName === guestName || myName.includes(guestName) || guestName.includes(myName));

          const isForMe = req.guest?.id === user?.id || 
                          req.guest?.original_id === user?.id || 
                          req.guest?.user_id === user?.id ||
                          (req.guest as any)?.sessionId === currentDeviceId ||
                          isNameMatch;

          if (isForMe) {
              console.log("⚔️ [Map] Received battle_invite in WorldBrainMap:", req);
              setLocalIncomingInvite(req); 
              sendLocalNotification('Nouveau Défi ! ⚔️', `${req.host?.name || 'Un ami'} te défie au ${req.type === 'quiz' ? 'Quiz' : req.type === 'doodle' ? 'Doodle' : 'Morpion'}`);
              HapticFeedback.success();
              audioService.playBattleInvite();
          }
      })
      .on('broadcast', { event: 'battle_accept' }, (p) => { 
          if (p.payload.request.host.id === user.id) {
              setOutgoingBattleRequest(null);
              startBattle(p.payload.request, true); 
          }
      })
      .on('broadcast', { event: 'battle_exit' }, (p) => {
          if (p.payload.battleId) {
              setOutgoingBattleRequest(prev => {
                  if (prev && prev.id === p.payload.battleId && p.payload.senderId !== user.id) {
                      addNotification('info', 'Défi décliné ⚔️', `L'adversaire a décliné le défi.`);
                      HapticFeedback.navigation();
                      return null;
                  }
                  return prev;
              });
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



    // Fetch profiles from Supabase database for metadata enrichment and online presence
    // ✅ FIX 8: Added .limit(300) to avoid loading the entire profiles table at once
    supabase.from('profiles').select('id, name, phone_number, avatar_config, role, status, last_active').limit(300).then(({data}) => {
        if (data) {
          setAllProfiles(data.map(p => ({ 
            user_id: p.id, 
            id: p.id,
            name: p.name || 'Étudiant Elite', 
            phone_number: p.phone_number,
            role: p.role,
            status: p.status,
            last_active: p.last_active,
            avatar_config: p.avatar_config,
            avatar: p.avatar_config?.image 
          })));
          // ✅ FIX 15: Also cache this user's avatar_config to avoid re-fetching in heartbeat
          const myProfile = data.find(p => p.id === user?.id);
          if (myProfile?.avatar_config) {
              cachedAvatarConfigRef.current = myProfile.avatar_config;
          }
        }
    });

    const profileSub = supabase
      .channel('public:profiles_map_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new && (payload.new as any).id) {
          const updated = payload.new as any;
          setAllProfiles(prev => {
            const idx = prev.findIndex(p => p.id === updated.id);
            const mapped = {
              user_id: updated.id,
              id: updated.id,
              name: updated.name || 'Étudiant Elite',
              phone_number: updated.phone_number,
              role: updated.role,
              status: updated.status,
              last_active: updated.last_active,
              avatar_config: updated.avatar_config,
              avatar: updated.avatar_config?.image
            };
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = mapped;
              return copy;
            }
            return [mapped, ...prev];
          });
        }
      })
      .subscribe();

    return () => { 
        console.log("📍 [Map] Cleaning up presence tracking");
        if (channelRef.current) {
          channelRef.current.untrack().catch(() => {});
        }
        supabase.removeChannel(profileSub);
    };
  }, [user?.id, deviceSessionId]);

  // Heartbeat tracking (Throttled & Guaranteed)
  const lastDbLocationWriteRef = useRef<number>(0);
  useEffect(() => {
    if (!channelRef.current || !isSubscribed || !user) return;

    if (isGhostMode) {
      channelRef.current.untrack();
      return;
    }

    const track = async () => {
        const hasRealCoords = !!(myLocation && typeof myLocation.lat === 'number' && typeof myLocation.lng === 'number' && myLocation.lat !== 0 && myLocation.lng !== 0);

        // 1. Broadcast in Realtime Channel
        channelRef.current.track({ 
            user_id: user.id, 
            session_id: deviceSessionId,
            name: user.name, 
            avatar: user.avatar?.image, 
            lat: hasRealCoords ? myLocation.lat : null, 
            lng: hasRealCoords ? myLocation.lng : null,
            has_location: hasRealCoords,
            is_ghost: false,
            last_seen: Date.now()
        });

        // 2. Only write location to profiles in DB at most once every 30 minutes
        const now = Date.now();
        if (hasRealCoords && (now - lastDbLocationWriteRef.current > 30 * 60 * 1000)) {
          lastDbLocationWriteRef.current = now;
          try {
              const config = cachedAvatarConfigRef.current || user.avatar || {};
              const updatedConfig = {
                  ...config,
                  location: {
                      latitude: myLocation.lat,
                      longitude: myLocation.lng,
                      isPublic: !isGhostMode
                  }
              };
              cachedAvatarConfigRef.current = updatedConfig;
              await supabase.from('profiles').update({
                  status: 'online',
                  last_active: new Date().toISOString(),
                  avatar_config: updatedConfig
              }).eq('id', user.id);
          } catch (e) {
              console.warn("📍 [Map] Could not write location to Supabase profiles fallback:", e);
          }
        }
    };
    
    track(); // Initial track
    const interval = setInterval(track, 60000); // Heartbeat presence broadcast every 60s
    return () => clearInterval(interval);
  }, [isSubscribed, myLocation?.lat, myLocation?.lng, user?.id, isGhostMode, deviceSessionId]);

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

  const handleBattleEnd = (winnerId: string | 'draw') => {
    if (!activeBattle || !user) return;
    const isWin = winnerId === user.id;
    const isDraw = winnerId === 'draw';
    const bet = Number(activeBattle.state.betAmount) || 0;
    const baseWinReward = 20;

    if (!isDraw) {
        setSessionScore(p => ({ host: p.host + (activeBattle.isHost ? (isWin?1:0) : (isWin?0:1)), guest: p.guest + (activeBattle.isHost ? (isWin?0:1) : (isWin?1:0)) }));
        if (isWin) {
            // Puisque la mise a été déduite au début chez les 2 joueurs, le vainqueur remporte la TOTALITÉ du pot commun (bet * 2) !
            const winAmount = bet > 0 ? bet * 2 : baseWinReward;
            const xpGained = bet > 0 ? bet * 5 : 50;
            addLevelCoins(winAmount);
            addXp(xpGained);
            addNotification('success', '⚔️ Victoire de Défi IA !', `Tu as remporté le pot de ${winAmount} LevelCoins et +${xpGained} XP !`);
        } else {
            // Le perdant a déjà perdu sa mise de départ (-bet LC), pas de double déduction.
            addXp(10);
            if (bet > 0) {
                addNotification('info', 'Défi terminé', `Tu as perdu le duel (${bet} LC misés).`);
            }
        }
    } else {
        // En cas d'égalité, chaque joueur est remboursé de sa mise
        if (bet > 0) {
            addLevelCoins(bet);
            addNotification('info', 'Match Nul 🤝', `Égalité ! Ta mise de ${bet} LevelCoins t'a été remboursée.`);
        }
        addXp(20);
    }
    resolveBattle(isDraw ? '' : winnerId, isDraw);
  };

  const handleBattleRematch = () => {
    if (!activeBattle || !user) return;
    const bet = Number(activeBattle.state.betAmount) || 0;
    if (bet > 0) {
      if ((user.levelCoins || 0) < bet) {
        addNotification('error', 'Solde insuffisant ❌', `Tu as besoin de ${bet} LC pour rejouer.`);
        return;
      }
      betLevelCoins(bet);
    }
  };

  const finalUsers = useMemo(() => {
      const mapUsers = new Map<string, any>();
      const now = Date.now();

      // 1. Add users actively broadcasting in Realtime Presence (live WebSocket)
      activeUsers.forEach(u => {
        const uUserId = u.user_id || u.id;
        const isCurrentSession = u.session_id ? u.session_id === deviceSessionId : (uUserId === user?.id && !u.session_id);

        if (
          !isCurrentSession && 
          !u.is_ghost && 
          !isAdminUser(u)
        ) {
          const isSelfOtherDevice = uUserId === user?.id;
          const dbMatch = allProfiles.find(p => (p.user_id || p.id) === uUserId) || {};
          const isDbGhost = dbMatch.avatar_config?.location?.isPublic === false;
          if (!isDbGhost) {
            const key = u.session_id || uUserId;
            const realUserId = uUserId || dbMatch.id || (key.startsWith('device_') ? null : key);
            const lat = (typeof u.lat === 'number' && u.lat !== 0) ? u.lat : (dbMatch.avatar_config?.location?.latitude || null);
            const lng = (typeof u.lng === 'number' && u.lng !== 0) ? u.lng : (dbMatch.avatar_config?.location?.longitude || null);

            mapUsers.set(key, { 
              ...dbMatch, 
              ...u, 
              lat,
              lng,
              user_id: realUserId || key, 
              original_user_id: realUserId || uUserId || dbMatch.id,
              session_id: u.session_id || key,
              name: isSelfOtherDevice ? `${u.name || user?.name || 'Moi'} (Mon autre appareil)` : (u.name || dbMatch.name || 'Élève'),
              avatar: u.avatar || dbMatch.avatar || dbMatch.avatar_config?.image || null,
              is_online: true 
            });
          }
        }
      });

      // 2. Database fallback: active within the last 5 minutes
      allProfiles.forEach(p => {
        const pUserId = p.user_id || p.id;
        if (
          pUserId && 
          pUserId !== user?.id && 
          !isAdminUser(p) && 
          !mapUsers.has(pUserId)
        ) {
          const loc = p.avatar_config?.location;
          const hasGps = loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && loc.latitude !== 0 && loc.longitude !== 0;
          const isGhost = loc?.isPublic === false;

          if (!isGhost && p.status === 'online' && p.last_active) {
            const lastActiveTime = new Date(p.last_active).getTime();
            if (!isNaN(lastActiveTime) && (now - lastActiveTime) < 5 * 60 * 1000) {
              mapUsers.set(pUserId, {
                ...p,
                user_id: pUserId,
                original_user_id: pUserId,
                lat: hasGps ? loc.latitude : null,
                lng: hasGps ? loc.longitude : null,
                avatar: p.avatar || p.avatar_config?.image || null,
                is_online: true,
                is_ghost: false
              });
            }
          }
        }
      });

      return Array.from(mapUsers.values());
  }, [activeUsers, allProfiles, user?.id, deviceSessionId]);

  const otherOnlineUsersCount = useMemo(() => {
      return finalUsers.length;
  }, [finalUsers]);

  const filteredUsers = useMemo(() => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return finalUsers;
      return finalUsers.filter(u => 
        u.name.toLowerCase().includes(q) || 
        (u.phone_number && u.phone_number.includes(q))
      );
  }, [finalUsers, searchQuery]);

  return (
    <div className={`glass bg-white/80 dark:bg-slate-900/90 p-6 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-xl relative min-h-[550px] ${onCloseMap ? 'fixed inset-4 z-[9999]' : ''}`}>
      {onCloseMap && <button onClick={onCloseMap} className="absolute top-6 right-6 z-[100] p-3 bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-white rounded-full"><X size={24} /></button>}

      <div className="mb-4 relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Globe className="text-blue-500 dark:text-blue-400" size={24} /> {t('atlas.title')}</h2>
          <p className="text-slate-600 dark:text-slate-400 text-[10px] font-bold mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${otherOnlineUsersCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} /> 
            {otherOnlineUsersCount === 0 ? '0 élève en ligne' : `${otherOnlineUsersCount} élève${otherOnlineUsersCount > 1 ? 's' : ''} en ligne`}
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
            className="px-3 sm:px-4 py-2 bg-purple-500/10 dark:bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider hover:bg-purple-500/20 transition-colors shadow-lg shadow-purple-500/10 flex-1 sm:flex-initial text-center"
          >
            Entraînement IA 🤖
          </button>
          <button 
            onClick={() => setIsUsersListOpen(!isUsersListOpen)}
            className="px-3 sm:px-4 py-2 bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors flex-1 sm:flex-initial text-center"
          >
            {isUsersListOpen ? 'Fermer Liste' : 'Voir Élèves'}
          </button>
        </div>
      </div>

      <div className="relative w-full h-[450px] rounded-[2rem] overflow-hidden border border-slate-200/80 dark:border-white/5 shadow-2xl z-0">
        {!myLocation && !isGhostMode && (
          <div className="absolute top-4 left-4 z-[500]">
            <button 
              onClick={() => {
                HapticFeedback.selection();
                requestGps();
              }}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-[10px] font-black uppercase tracking-wider rounded-xl backdrop-blur-md shadow-xl flex items-center gap-1.5 transition-all border border-white/20 active:scale-95 animate-pulse"
            >
              📍 Activer ma position
            </button>
          </div>
        )}

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
                  : 'bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'
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
          <button onClick={() => { setActiveAtlasCategory('none'); setIsAtlasMenuOpen(false); setHighlightedFeatureId(null); mapRef.current?.setView([10.5, -11], 6); }} className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${activeAtlasCategory === 'none' ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Globe size={18} /></button>
          <button onClick={() => setIsAtlasMenuOpen(!isAtlasMenuOpen)} className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${isAtlasMenuOpen ? 'bg-orange-600 text-white border-orange-500' : 'bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Menu size={18} /></button>
          {isAtlasMenuOpen && (
              <div className="flex flex-col gap-2 mt-1">
                  {[ {id:'river', icon:<Waves size={18}/>}, {id:'resource', icon:<HardHat size={18}/>}, {id:'relief', icon:<Mountain size={18}/>} ].map(cat => (
                      <button key={cat.id} onClick={() => { setActiveAtlasCategory(cat.id as any); setHighlightedFeatureId(null); }} className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${activeAtlasCategory === cat.id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{cat.icon}</button>
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
            <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
            />
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

            {activeAtlasCategory === 'none' && finalUsers.filter(u => u.is_online && typeof u.lat === 'number' && typeof u.lng === 'number' && u.lat !== 0 && u.lng !== 0).map((u) => (
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

            {/* Self marker - Snap Map style */}
            {myLocation && !isGhostMode && (
              <Marker 
                position={[myLocation.lat, myLocation.lng]} 
                icon={SelfIcon}
                zIndexOffset={1000}
              >
                <Popup className="premium-popup">
                  <div className="p-2 text-center min-w-[110px]">
                    <p className="font-black text-slate-900 text-xs">Moi ({user?.name || 'Ma position'}) 📍</p>
                    <p className="text-[9px] text-emerald-600 font-bold mt-0.5">En direct sur la carte</p>
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

                {filteredUsers.filter(u => u.is_online && !favoriteUserIds.includes(u.user_id.includes('_') ? u.user_id.split('_')[0] : u.user_id)).length === 0 ? (
                  <p className="text-center text-slate-500 text-[10px] py-3 italic">Aucun autre élève en ligne pour le moment</p>
                ) : (
                  filteredUsers.filter(u => u.is_online && !favoriteUserIds.includes(u.user_id.includes('_') ? u.user_id.split('_')[0] : u.user_id)).map((u) => {
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <AnimatePresence>
        {isBettingOpen && selectedUser && (
          <div key="betting-modal-backdrop" className="fixed inset-0 z-[1000] bg-slate-950/85 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/10">
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

                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-1.5">
                            <Coins size={12} className="text-amber-400" /> Mise en jeu (LevelCoins)
                        </p>
                        {(() => {
                            const currentBalance = Number(user?.levelCoins ?? (user as any)?.level_coins ?? 0);
                            return (
                                <>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[0, 10, 25, 50].map(amount => {
                                            const isInsufficient = amount > currentBalance;
                                            return (
                                                <button 
                                                    key={amount}
                                                    type="button"
                                                    disabled={isInsufficient}
                                                    onClick={() => setPendingBetAmount(amount)}
                                                    className={`py-2.5 rounded-2xl font-black uppercase text-[10px] transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                        isInsufficient
                                                            ? 'opacity-35 cursor-not-allowed bg-slate-100/50 dark:bg-white/5 text-slate-400 border border-transparent'
                                                            : pendingBetAmount === amount 
                                                                ? 'bg-amber-500 text-slate-900 shadow-glow-amber scale-105 font-black' 
                                                                : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-white'
                                                    }`}
                                                >
                                                    <span>{amount === 0 ? 'Amical' : `${amount} LC`}</span>
                                                    <span className="text-[8px] opacity-75">{amount === 0 ? 'Gratuit' : isInsufficient ? 'Trop élevé' : 'Mise'}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Custom free bet input */}
                                    <div className="mt-3 flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-2.5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap pl-1">
                                            Mise personnalisée :
                                        </label>
                                        <input 
                                            type="number" 
                                            min={0} 
                                            max={currentBalance}
                                            value={pendingBetAmount === 0 ? '' : pendingBetAmount}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                if (raw === '') {
                                                    setPendingBetAmount(0);
                                                    return;
                                                }
                                                const val = Math.max(0, Math.min(Math.floor(Number(raw) || 0), currentBalance));
                                                setPendingBetAmount(val);
                                            }}
                                            placeholder="0"
                                            className="w-full bg-transparent text-right font-black text-sm text-amber-500 dark:text-amber-400 focus:outline-none pr-1"
                                        />
                                        <span className="text-xs font-black text-amber-500 dark:text-amber-400 pr-1">LC</span>
                                    </div>

                                    <p className="text-[9px] text-slate-400 text-center mt-2">
                                        Solde disponible : <strong className="text-amber-400 font-bold">{currentBalance} LC</strong>
                                    </p>
                                </>
                            );
                        })()}
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
                                    betAmount: pendingBetAmount,
                                    status: 'active',
                                    timestamp: new Date().toISOString()
                                };
                                setIsBettingOpen(false);
                                startBattle(request, true);
                            } else {
                                const targetUserId = selectedUser.original_user_id || selectedUser.id || (selectedUser.user_id?.startsWith('device_') ? '' : selectedUser.user_id);
                                const targetSessionId = selectedUser.session_id || (selectedUser.user_id?.startsWith('device_') ? selectedUser.user_id : undefined);

                                const request = {
                                    id: `battle_${Date.now()}`,
                                    type: pendingDuelType,
                                    host: { id: user?.id, name: user?.name, avatar: user?.avatar?.image },
                                    guest: { 
                                        id: targetUserId, 
                                        original_id: targetUserId,
                                        sessionId: targetSessionId,
                                        name: selectedUser.name, 
                                        avatar: selectedUser.avatar 
                                    },
                                    betAmount: pendingBetAmount,
                                    status: 'pending',
                                    timestamp: new Date().toISOString()
                                };

                                // Helper to broadcast invite across all potential channels
                                const broadcastBattleInvite = (req: any) => {
                                    console.log('⚔️ [Map] Initiating broadcastBattleInvite to:', targetUserId, targetSessionId);

                                    // 1. Global map channel broadcast
                                    if (channelRef.current) {
                                        channelRef.current.send({ type: 'broadcast', event: 'battle_invite', payload: { request: req } })
                                          .then((res: any) => console.log('⚔️ [Map] Map broadcast result:', res))
                                          .catch((err: any) => console.warn('⚔️ [Map] Map broadcast err:', err));
                                    }

                                    // 2. Direct user battle channel broadcast (by userId)
                                    if (targetUserId) {
                                        const directChannel = supabase.channel(`user-battles-${targetUserId}`);
                                        if (directChannel.state === 'joined') {
                                            directChannel.send({ type: 'broadcast', event: 'battle_invite', payload: { request: req } })
                                              .then((res: any) => console.log('⚔️ [Map] Direct invite by userId sent:', res))
                                              .catch((err: any) => console.warn('⚔️ [Map] Direct invite error:', err));
                                        } else {
                                            directChannel.subscribe((status) => {
                                                if (status === 'SUBSCRIBED') {
                                                    directChannel.send({ type: 'broadcast', event: 'battle_invite', payload: { request: req } })
                                                      .then((res: any) => console.log('⚔️ [Map] Direct invite by userId sent (subscribed):', res))
                                                      .catch((err: any) => console.warn('⚔️ [Map] Direct invite error:', err));
                                                }
                                            });
                                        }
                                    }

                                    // 3. Direct user battle channel broadcast (by sessionId if different)
                                    if (targetSessionId && targetSessionId !== targetUserId) {
                                        const sessionChannel = supabase.channel(`user-battles-${targetSessionId}`);
                                        if (sessionChannel.state === 'joined') {
                                            sessionChannel.send({ type: 'broadcast', event: 'battle_invite', payload: { request: req } })
                                              .then((res: any) => console.log('⚔️ [Map] Direct invite by sessionId sent:', res))
                                              .catch((err: any) => console.warn('⚔️ [Map] Direct invite by sessionId error:', err));
                                        } else {
                                            sessionChannel.subscribe((status) => {
                                                if (status === 'SUBSCRIBED') {
                                                    sessionChannel.send({ type: 'broadcast', event: 'battle_invite', payload: { request: req } })
                                                      .then((res: any) => console.log('⚔️ [Map] Direct invite by sessionId sent (subscribed):', res))
                                                      .catch((err: any) => console.warn('⚔️ [Map] Direct invite by sessionId error:', err));
                                                }
                                            });
                                        }
                                    }
                                };

                                // 1. Immediately subscribe to dedicated duel room for this battle
                                if (duelChannelRef.current) {
                                    supabase.removeChannel(duelChannelRef.current);
                                    duelChannelRef.current = null;
                                }
                                if (inviteRetryIntervalRef.current) {
                                    clearInterval(inviteRetryIntervalRef.current);
                                    inviteRetryIntervalRef.current = null;
                                }

                                const duelRoom = supabase.channel(`duel-${request.id}`);
                                duelRoom
                                  .on('broadcast', { event: 'battle_accept' }, (p: any) => {
                                      console.log('⚔️ [Map] Received battle_accept on duel room:', p);
                                      if (inviteRetryIntervalRef.current) {
                                          clearInterval(inviteRetryIntervalRef.current);
                                          inviteRetryIntervalRef.current = null;
                                      }
                                      setOutgoingBattleRequest(null);
                                      startBattle(p.payload.request, true);
                                  })
                                  .on('broadcast', { event: 'battle_exit' }, (p: any) => {
                                      console.log('⚔️ [Map] Opponent rejected on duel room:', p);
                                      if (inviteRetryIntervalRef.current) {
                                          clearInterval(inviteRetryIntervalRef.current);
                                          inviteRetryIntervalRef.current = null;
                                      }
                                      setOutgoingBattleRequest(null);
                                      addNotification('info', 'Défi refusé ⚔️', `${selectedUser.name} a décliné le défi.`);
                                      HapticFeedback.navigation();
                                  })
                                  .subscribe((status) => {
                                      if (status === 'SUBSCRIBED') {
                                          console.log('⚔️ [Map] Host duel room SUBSCRIBED, broadcasting invite now');
                                          broadcastBattleInvite(request);

                                          // Retry broadcast up to 3 times (every 3.5s) in case of network jitter
                                          let retries = 0;
                                          if (inviteRetryIntervalRef.current) clearInterval(inviteRetryIntervalRef.current);
                                          inviteRetryIntervalRef.current = setInterval(() => {
                                              retries++;
                                              if (retries >= 3) {
                                                  if (inviteRetryIntervalRef.current) {
                                                      clearInterval(inviteRetryIntervalRef.current);
                                                      inviteRetryIntervalRef.current = null;
                                                  }
                                                  return;
                                              }
                                              console.log(`⚔️ [Map] Retrying battle invite broadcast (${retries + 1}/3)...`);
                                              broadcastBattleInvite(request);
                                          }, 3500);
                                      }
                                  });
                                duelChannelRef.current = duelRoom;

                                // 2. Show waiting screen immediately
                                setOutgoingBattleRequest(request);
                                setIsBettingOpen(false);

                                // 5. Save notification in database for recipient (strictly deduplicated and with real host avatar)
                                if (targetUserId && !targetUserId.startsWith('device_')) {
                                    const typeLabel = pendingDuelType === 'quiz' ? 'Quiz' : pendingDuelType === 'doodle' ? 'Doodle' : 'Morpion';
                                    supabase.from('profiles').select('stats').eq('id', targetUserId).single().then(({ data }) => {
                                        if (data) {
                                            const currentStats = data.stats || {};
                                            const notifs = currentStats.notifications || [];
                                            const alreadyExists = notifs.some((n: any) => n.id === request.id || n.battleId === request.id);
                                            if (!alreadyExists) {
                                                const newNotif = {
                                                    id: request.id,
                                                    battleId: request.id,
                                                    type: 'battle_invite',
                                                    title: 'Nouveau Défi ! ⚔️',
                                                    message: `${user?.name || 'Un ami'} te défie au ${typeLabel} !`,
                                                    avatar: user?.avatar?.image || null,
                                                    senderName: user?.name || 'Un ami',
                                                    timestamp: new Date().toISOString(),
                                                    read: false,
                                                    metadata: { request }
                                                };
                                                supabase.from('profiles').update({
                                                    stats: { ...currentStats, notifications: [newNotif, ...notifs].slice(0, 50) }
                                                }).eq('id', targetUserId).then(() => {});
                                            }
                                        }
                                    });
                                }

                                addNotification({
                                    id: `sent_${request.id}`,
                                    battleId: request.id,
                                    type: 'battle_sent',
                                    title: 'Défi envoyé ! ⚔️',
                                    message: `Attente de la réponse de ${selectedUser.name}...`,
                                    avatar: selectedUser.avatar || selectedUser.avatar_config?.image || null,
                                    senderName: selectedUser.name
                                });
                            }
                        }}
                        disabled={pendingBetAmount > Number(user?.levelCoins ?? (user as any)?.level_coins ?? 0)}
                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all ${
                            pendingBetAmount > Number(user?.levelCoins ?? (user as any)?.level_coins ?? 0)
                                ? 'bg-slate-300 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 active:scale-95'
                        }`}
                    >
                        {pendingBetAmount > Number(user?.levelCoins ?? (user as any)?.level_coins ?? 0) ? 'Solde insuffisant ❌' : 'Lancer le défi ⚔️'}
                    </button>
                </div>
            </motion.div>
          </div>
        )}

        {/* ===== OUTGOING CHALLENGE WAITING SCREEN (HOST WAITING MODAL) ===== */}
        {outgoingBattleRequest && (
          <div className="fixed inset-0 z-[2500] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#09101e] border-2 border-blue-500/80 rounded-[2.5rem] p-8 max-w-sm w-full text-center flex flex-col items-center shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.35)] relative overflow-hidden"
            >
              <div className="relative mb-6 flex items-center justify-center mt-2">
                <div className="w-24 h-24 rounded-full bg-blue-500/20 animate-ping absolute" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl shadow-xl shadow-blue-500/50">
                  ⚔️
                </div>
              </div>

              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
                Invitation Envoyée
              </span>

              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Défi envoyé à {outgoingBattleRequest.guest.name} !
              </h3>
              <p className="text-xs text-amber-400 font-bold mt-1 uppercase tracking-wider">
                Mode : {outgoingBattleRequest.type === 'quiz' ? 'Quiz de Connaissances' : outgoingBattleRequest.type === 'doodle' ? 'Toile Doodle' : 'Morpion Stratégique'}
              </p>

              <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs text-slate-300 font-medium">
                  En attente de sa réponse en direct...
                </p>
              </div>

              <button
                onClick={() => {
                  try {
                    HapticFeedback.selection();
                    if (inviteRetryIntervalRef.current) {
                      clearInterval(inviteRetryIntervalRef.current);
                      inviteRetryIntervalRef.current = null;
                    }
                    if (channelRef.current) {
                      channelRef.current.send({
                        type: 'broadcast',
                        event: 'battle_exit',
                        payload: { battleId: outgoingBattleRequest.id, senderId: user?.id }
                      });
                    }
                    if (duelChannelRef.current) {
                      duelChannelRef.current.send({
                        type: 'broadcast',
                        event: 'battle_exit',
                        payload: { battleId: outgoingBattleRequest.id, senderId: user?.id }
                      });
                      supabase.removeChannel(duelChannelRef.current);
                      duelChannelRef.current = null;
                    }
                    addNotification('info', 'Défi annulé ⚔️', `Tu as annulé le défi pour ${outgoingBattleRequest.guest.name}.`);
                  } catch (err) {
                    console.warn('[Map Cancel Warning]:', err);
                  } finally {
                    setOutgoingBattleRequest(null);
                  }
                }}
                className="w-full mt-6 py-3.5 bg-white/5 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 text-slate-400 rounded-2xl font-black uppercase tracking-wider text-xs border border-white/10 transition-all cursor-pointer select-none"
              >
                Annuler le défi
              </button>
            </motion.div>
          </div>
        )}

        {incomingInvite && (
           <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-10 left-6 right-6 z-[2000] bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-2xl border-2 border-blue-500 flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 bg-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-lg">
                      {incomingInvite.host.name[0]}
                  </div>
                  <div className="min-w-0">
                      <p className="text-xs font-black text-blue-500 uppercase">Nouveau Défi !</p>
                      <p className="text-sm font-bold dark:text-white truncate">
                          {incomingInvite.host.name} te défie au {incomingInvite.type === 'quiz' ? 'Quiz' : incomingInvite.type === 'doodle' ? 'Doodle' : 'Morpion'}
                          {incomingInvite.betAmount ? ` • ${incomingInvite.betAmount} LC` : ''}
                      </p>
                  </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setLocalIncomingInvite(null); clearPendingBattleInvite(); }} className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500"><X size={18}/></button>
                  <button 
                    onClick={() => {
                        const bet = incomingInvite.betAmount || 0;
                        if ((user?.levelCoins || 0) < bet) {
                            addNotification({
                                title: "Solde insuffisant ❌",
                                message: `Tu as besoin de ${bet} LC pour relever ce défi.`,
                                type: 'system'
                            });
                            setLocalIncomingInvite(null);
                            clearPendingBattleInvite();
                            return;
                        }
                        HapticFeedback.success();
                        const req = { ...incomingInvite, status: 'active' };

                        // 1. Dedicated duel room
                        const duelRoom = supabase.channel(`duel-${req.id}`);
                        if (duelRoom.state === 'joined') {
                            duelRoom.send({ type: 'broadcast', event: 'battle_accept', payload: { request: req } });
                        } else {
                            duelRoom.subscribe((s) => {
                                if (s === 'SUBSCRIBED') {
                                    duelRoom.send({ type: 'broadcast', event: 'battle_accept', payload: { request: req } });
                                }
                            });
                        }

                        // 2. Map channel
                        if (channelRef.current) {
                            channelRef.current.send({ type: 'broadcast', event: 'battle_accept', payload: { request: req } });
                        }

                        // 3. Direct host channel
                        if (req.host?.id) {
                            const hostChan = supabase.channel(`user-battles-${req.host.id}`);
                            if (hostChan.state === 'joined') {
                                hostChan.send({ type: 'broadcast', event: 'battle_accept', payload: { request: req } });
                                setTimeout(() => supabase.removeChannel(hostChan), 2500);
                            } else {
                                hostChan.subscribe((s) => {
                                    if (s === 'SUBSCRIBED') {
                                        hostChan.send({ type: 'broadcast', event: 'battle_accept', payload: { request: req } });
                                        setTimeout(() => supabase.removeChannel(hostChan), 2500);
                                    }
                                });
                            }
                        }

                        setLocalIncomingInvite(null);
                        clearPendingBattleInvite();
                        startBattle(req, false);
                    }}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg whitespace-nowrap"
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
                  onRematch={handleBattleRematch}
                  onEnd={handleBattleEnd} 
                  onExit={() => {
                      if (activeBattle.state.status !== 'finished') {
                          channelRef.current?.send({
                              type: 'broadcast',
                              event: 'battle_exit',
                              payload: { battleId: activeBattle.state.id, senderId: user!.id }
                          });
                      }
                      const duelChan = supabase.channel(`duel-${activeBattle.state.id}`);
                      duelChan.send({
                          type: 'broadcast',
                          event: 'battle_exit',
                          payload: { battleId: activeBattle.state.id, senderId: user!.id }
                      });
                      setActiveBattle(null);
                      setIsUsersListOpen(true);
                  }} 
                />
              ) : activeBattle.state.type === 'quiz' ? (
                <QuizBattle 
                  initialState={activeBattle.state} 
                  isHost={activeBattle.isHost} 
                  onClose={() => {
                      if (activeBattle.state.status !== 'finished') {
                          channelRef.current?.send({
                              type: 'broadcast',
                              event: 'battle_exit',
                              payload: { battleId: activeBattle.state.id, senderId: user!.id }
                          });
                      }
                      setActiveBattle(null);
                      setIsUsersListOpen(true);
                  }} 
                />
              ) : activeBattle.state.type === 'doodle' ? (
                <CollaborativeDoodle 
                  battleState={activeBattle.state} 
                  isHost={activeBattle.isHost} 
                  onClose={() => {
                      if (activeBattle.state.status !== 'finished') {
                          channelRef.current?.send({
                              type: 'broadcast',
                              event: 'battle_exit',
                              payload: { battleId: activeBattle.state.id, senderId: user!.id }
                          });
                      }
                      setActiveBattle(null);
                      setIsUsersListOpen(true);
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
