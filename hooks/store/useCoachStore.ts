import React, { useState, useEffect, useCallback } from 'react';
import { CoachSession, CoachMessage, AILabSession, User } from '../../types';

export const useCoachStore = (
    user?: User | null,
    setUser?: React.Dispatch<React.SetStateAction<User | null>>
) => {
    const userId = user?.id;
    const [coachSessions, setCoachSessions] = useState<CoachSession[]>([]);
    const [aiLabHistory, setAiLabHistory] = useState<AILabSession[]>([]);

    useEffect(() => {
        const coachKey = userId ? `levelmak_${userId}_coach_sessions` : 'levelmak_coach_sessions';
        const labKey = userId ? `levelmak_${userId}_ailab_history` : 'levelmak_ailab_history';

        // Cloud recovery: if local storage is empty and cloud has backup, restore it
        if (!localStorage.getItem(coachKey) && user?.coachSessions) {
            localStorage.setItem(coachKey, JSON.stringify(user.coachSessions));
        }
        if (!localStorage.getItem(labKey) && user?.stats?.aiLabHistory) {
            localStorage.setItem(labKey, JSON.stringify(user.stats.aiLabHistory));
        }

        const storedCoach = localStorage.getItem(coachKey);
        if (storedCoach) {
            try { setCoachSessions(JSON.parse(storedCoach)); } catch (e) { console.error(e); }
        } else {
            setCoachSessions([]); // Reset if new user has no sessions
        }
        
        const storedLab = localStorage.getItem(labKey);
        if (storedLab) {
            try { setAiLabHistory(JSON.parse(storedLab)); } catch (e) { console.error(e); }
        } else {
            setAiLabHistory([]); // Reset if new user has no lab history
        }
    }, [userId, !!user?.coachSessions, !!user?.stats?.aiLabHistory]);

    const saveCoachMessage = useCallback((sessionId: string, message: CoachMessage) => {
        const coachKey = userId ? `levelmak_${userId}_coach_sessions` : 'levelmak_coach_sessions';
        
        setCoachSessions(prev => {
            const updated = prev.map(s => 
                s.id === sessionId 
                ? { ...s, messages: [...s.messages, message], lastMessageAt: new Date().toISOString() } 
                : s
            );
            localStorage.setItem(coachKey, JSON.stringify(updated));
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                const currentSessions = prev.coachSessions || [];
                const updated = currentSessions.map(s => 
                    s.id === sessionId 
                    ? { ...s, messages: [...s.messages, message], lastMessageAt: new Date().toISOString() } 
                    : s
                );
                return {
                    ...prev,
                    coachSessions: updated
                };
            });
        }
    }, [userId, setUser]);

    const createCoachSession = useCallback((firstMessage?: string) => {
        const id = `session_${Date.now()}`;
        const newSession: CoachSession = {
            id,
            title: firstMessage ? firstMessage.substring(0, 30) + '...' : 'Nouvelle session',
            messages: [],
            lastUpdated: new Date().toISOString()
        };
        const coachKey = userId ? `levelmak_${userId}_coach_sessions` : 'levelmak_coach_sessions';
        
        setCoachSessions(prev => {
            const updated = [newSession, ...prev];
            localStorage.setItem(coachKey, JSON.stringify(updated));
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                const currentSessions = prev.coachSessions || [];
                const updated = [newSession, ...currentSessions];
                return {
                    ...prev,
                    coachSessions: updated
                };
            });
        }
        return id;
    }, [userId, setUser]);

    const saveAILabSession = useCallback((session: AILabSession) => {
        const labKey = userId ? `levelmak_${userId}_ailab_history` : 'levelmak_ailab_history';
        
        setAiLabHistory(prev => {
            const index = prev.findIndex(s => s.id === session.id);
            const updated = index !== -1 
                ? prev.map(s => s.id === session.id ? session : s)
                : [session, ...prev];
            localStorage.setItem(labKey, JSON.stringify(updated));
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                const currentHistory = prev.stats?.aiLabHistory || [];
                const index = currentHistory.findIndex((s: any) => s.id === session.id);
                const updated = index !== -1 
                    ? currentHistory.map((s: any) => s.id === session.id ? session : s)
                    : [session, ...currentHistory];
                return {
                    ...prev,
                    stats: {
                        ...prev.stats,
                        aiLabHistory: updated
                    }
                };
            });
        }
    }, [userId, setUser]);

    const deleteAILabSession = useCallback((id: string) => {
        const labKey = userId ? `levelmak_${userId}_ailab_history` : 'levelmak_ailab_history';
        
        setAiLabHistory(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem(labKey, JSON.stringify(updated));
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                const currentHistory = prev.stats?.aiLabHistory || [];
                const updated = currentHistory.filter((s: any) => s.id !== id);
                return {
                    ...prev,
                    stats: {
                        ...prev.stats,
                        aiLabHistory: updated
                    }
                };
            });
        }
    }, [userId, setUser]);

    const deleteCoachSession = useCallback((id: string) => {
        const coachKey = userId ? `levelmak_${userId}_coach_sessions` : 'levelmak_coach_sessions';
        
        setCoachSessions(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem(coachKey, JSON.stringify(updated));
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                const currentSessions = prev.coachSessions || [];
                const updated = currentSessions.filter(s => s.id !== id);
                return {
                    ...prev,
                    coachSessions: updated
                };
            });
        }
    }, [userId, setUser]);

    return {
        coachSessions,
        setCoachSessions,
        aiLabHistory,
        setAiLabHistory,
        saveCoachMessage,
        createCoachSession,
        saveAILabSession,
        deleteAILabSession,
        deleteCoachSession
    };
};
