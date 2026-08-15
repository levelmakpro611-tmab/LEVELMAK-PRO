import { useState, useEffect, useCallback } from 'react';
import { translations, Language } from '../../utils/translations';
import { audioService } from '../../services/audio';

export const useUIStore = () => {
    const [settings, setSettings] = useState({
        theme: 'dark' as 'light' | 'dark',
        fontSize: 'base' as 'xs' | 'sm' | 'base' | 'lg' | 'xl',
        soundEnabled: true,
        soundSettings: {
            quiz: true,
            timeMachine: true,
            notifications: true
        },
        language: 'fr' as 'fr' | 'en' | 'ar',
        notifications: {
            missions: true,
            quiz: true,
            community: true
        }
    });

    const [isOnline, setIsOnline] = useState(true);
    const [showBubbleWrap, setShowBubbleWrap] = useState(false);
    const [mapFocusFeatureId, setMapFocusFeatureId] = useState<string | null>(null);
    const [atlasFocusFeatureId, setAtlasFocusFeatureId] = useState<string | null>(null);

    // Load settings from LocalStorage
    useEffect(() => {
        const stored = localStorage.getItem('levelmak_settings');
        if (stored) {
            try { 
                const parsed = JSON.parse(stored);
                setSettings(prev => {
                    const merged = { ...prev, ...parsed };
                    audioService.setEnabled(merged.soundEnabled);
                    if (merged.soundSettings) {
                        audioService.setSoundSettings(merged.soundSettings);
                    }
                    return merged;
                }); 
            } catch (e) {}
        }
    }, []);

    const updateSettings = useCallback((newSettings: any) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            localStorage.setItem('levelmak_settings', JSON.stringify(updated));
            if (newSettings.soundEnabled !== undefined) {
                audioService.setEnabled(updated.soundEnabled);
            }
            if (newSettings.soundSettings !== undefined) {
                audioService.setSoundSettings(updated.soundSettings);
            }
            return updated;
        });
    }, []);

    // Translation Helper
    const t = useCallback((path: string, params?: Record<string, string>): string => {
        const pathKeys = path.split('.');
        let currentTranslation: any = translations[settings.language as Language] || translations.fr;

        for (const key of pathKeys) {
            if (!currentTranslation || currentTranslation[key] === undefined) {
                // Fallback to French if the specific language path is missing
                currentTranslation = translations.fr;
                for (const fallbackKey of pathKeys) {
                    if (!currentTranslation || currentTranslation[fallbackKey] === undefined) return path;
                    currentTranslation = currentTranslation[fallbackKey];
                }
                break;
            }
            currentTranslation = currentTranslation[key];
        }
        
        if (typeof currentTranslation !== 'string') return currentTranslation || path;

        let result = currentTranslation;
        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                result = result.split(`{${paramKey}}`).join(paramValue);
            });
        }
        return result;
    }, [settings.language]);

    const dir = settings.language === 'ar' ? 'rtl' : 'ltr';

    return {
        settings,
        updateSettings,
        isOnline,
        setIsOnline,
        showBubbleWrap,
        setShowBubbleWrap,
        mapFocusFeatureId,
        setMapFocusFeatureId,
        atlasFocusFeatureId,
        setAtlasFocusFeatureId,
        t,
        dir
    };
};
