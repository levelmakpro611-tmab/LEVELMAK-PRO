import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import confetti from 'canvas-confetti';
import { audioService } from './audio';

/**
 * Service pour fournir des retours sensoriels (Tactile & Visuel)
 * aux utilisateurs, renforçant l'aspect "Premium Elite" de l'application.
 */
export const feedbackService = {
  /**
   * Retour haptique léger (utilisé pour les clics de boutons, sélections)
   */
  lightImpact: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Ignoré sur desktop
    }
  },

  /**
   * Retour haptique moyen (utilisé pour les validations d'étapes)
   */
  mediumImpact: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      // Ignoré sur desktop
    }
  },

  /**
   * Notification Tactile : Succès
   */
  hapticSuccess: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      // Ignoré
    }
  },

  /**
   * Notification Tactile : Erreur
   */
  hapticError: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      // Ignoré
    }
  },

  /**
   * Déclenche une explosion de confettis (succès majeur)
   */
  celebrate: () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'],
      zIndex: 9999
    });
  },

  /**
   * Joue un son Premium (Utilise audioService pour centraliser le contrôle)
   */
  playAudio: (type: 'success' | 'error', category: 'quiz' | 'timeMachine' | 'notifications' = 'quiz') => {
    try {
      if (type === 'success') {
        audioService.playSuccess(category);
      } else {
        audioService.playError(category);
      }
    } catch (e) {
      // Ignoré
    }
  },

  /**
   * Action complète sur Quiz Answer (Haptique + Audio)
   */
  answerFeedback: function(isCorrect: boolean, category: 'quiz' | 'timeMachine' | 'notifications' = 'quiz') {
    if (isCorrect) {
      this.hapticSuccess();
      this.playAudio('success', category);
    } else {
      this.hapticError();
      this.playAudio('error', category);
    }
  },

  /**
   * Déclenche un succès complet (Vibration + Confettis + Audio)
   */
  fullSuccess: function(category: 'quiz' | 'timeMachine' | 'notifications' = 'quiz') {
    this.hapticSuccess();
    this.playAudio('success', category);
    this.celebrate();
  }
};
