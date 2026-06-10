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
    }, [user]);

    const saveCoachMessage = useCallback((sessionId: string, message: CoachMessage) => {
        let updatedSessions: CoachSession[] = [];
        setCoachSessions(prev => {
            const updated = prev.map(s => 
                s.id === sessionId 
                ? { ...s, messages: [...s.messages, message], lastMessageAt: new Date().toISOString() } 
                : s
            );
            const coachKey = userId ? `levelmak_${userId}_coach_sessions` : 'levelmak_coach_sessions';
            localStorage.setItem(coachKey, JSON.stringify(updated));
            updatedSessions = updated;
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    coachSessions: updatedSessions
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
        let updatedSessions: CoachSession[] = [];
        setCoachSessions(prev => {
            const updated = [newSession, ...prev];
            const coachKey = userId ? `levelmak_${userId}_coach_sessions` : 'levelmak_coach_sessions';
            localStorage.setItem(coachKey, JSON.stringify(updated));
            updatedSessions = updated;
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    coachSessions: updatedSessions
                };
            });
        }
        return id;
    }, [userId, setUser]);

    const saveAILabSession = useCallback((session: AILabSession) => {
        let updatedHistory: AILabSession[] = [];
        setAiLabHistory(prev => {
            const index = prev.findIndex(s => s.id === session.id);
            let updated;
            if (index !== -1) {
                updated = prev.map(s => s.id === session.id ? session : s);
            } else {
                updated = [session, ...prev];
            }
            const labKey = userId ? `levelmak_${userId}_ailab_history` : 'levelmak_ailab_history';
            localStorage.setItem(labKey, JSON.stringify(updated));
            updatedHistory = updated;
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    stats: {
                        ...prev.stats,
                        aiLabHistory: updatedHistory
                    }
                };
            });
        }
    }, [userId, setUser]);

    const deleteAILabSession = useCallback((id: string) => {
        let updatedHistory: AILabSession[] = [];
        setAiLabHistory(prev => {
            const updated = prev.filter(s => s.id !== id);
            const labKey = userId ? `levelmak_${userId}_ailab_history` : 'levelmak_ailab_history';
            localStorage.setItem(labKey, JSON.stringify(updated));
            updatedHistory = updated;
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    stats: {
                        ...prev.stats,
                        aiLabHistory: updatedHistory
                    }
                };
            });
        }
    }, [userId, setUser]);

    const deleteCoachSession = useCallback((id: string) => {
        let updatedSessions: CoachSession[] = [];
        setCoachSessions(prev => {
            const updated = prev.filter(s => s.id !== id);
            const coachKey = userId ? `levelmak_${userId}_coach_sessions` : 'levelmak_coach_sessions';
            localStorage.setItem(coachKey, JSON.stringify(updated));
            updatedSessions = updated;
            return updated;
        });

        if (setUser) {
            setUser(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    coachSessions: updatedSessions
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
