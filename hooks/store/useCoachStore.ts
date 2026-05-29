import { useState, useEffect, useCallback } from 'react';
import { CoachSession, CoachMessage, AILabSession } from '../../types';

export const useCoachStore = () => {
    const [coachSessions, setCoachSessions] = useState<CoachSession[]>([]);
    const [aiLabHistory, setAiLabHistory] = useState<AILabSession[]>([]);

    useEffect(() => {
        const storedCoach = localStorage.getItem('levelmak_coach_sessions');
        if (storedCoach) {
            try { setCoachSessions(JSON.parse(storedCoach)); } catch (e) {}
        }
        const storedLab = localStorage.getItem('levelmak_ailab_history');
        if (storedLab) {
            try { setAiLabHistory(JSON.parse(storedLab)); } catch (e) {}
        }
    }, []);

    const saveCoachMessage = useCallback((sessionId: string, message: CoachMessage) => {
        setCoachSessions(prev => {
            const updated = prev.map(s => 
                s.id === sessionId 
                ? { ...s, messages: [...s.messages, message], lastMessageAt: new Date().toISOString() } 
                : s
            );
            localStorage.setItem('levelmak_coach_sessions', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const createCoachSession = useCallback((firstMessage?: string) => {
        const id = `session_${Date.now()}`;
        const newSession: CoachSession = {
            id,
            title: firstMessage ? firstMessage.substring(0, 30) + '...' : 'Nouvelle session',
            messages: [],
            lastUpdated: new Date().toISOString()
        };
        setCoachSessions(prev => {
            const updated = [newSession, ...prev];
            localStorage.setItem('levelmak_coach_sessions', JSON.stringify(updated));
            return updated;
        });
        return id;
    }, []);

    const saveAILabSession = useCallback((session: AILabSession) => {
        setAiLabHistory(prev => {
            const index = prev.findIndex(s => s.id === session.id);
            let updated;
            if (index !== -1) {
                updated = prev.map(s => s.id === session.id ? session : s);
            } else {
                updated = [session, ...prev];
            }
            localStorage.setItem('levelmak_ailab_history', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const deleteAILabSession = useCallback((id: string) => {
        setAiLabHistory(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem('levelmak_ailab_history', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const deleteCoachSession = useCallback((id: string) => {
        setCoachSessions(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem('levelmak_coach_sessions', JSON.stringify(updated));
            return updated;
        });
    }, []);

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
