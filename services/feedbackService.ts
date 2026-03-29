import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import confetti from 'canvas-confetti';

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
   * Joue un son Premium (Web Audio API pour garantir le fonctionnement sans fichier externe)
   */
  playAudio: (type: 'success' | 'error') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Ignore si le navigateur bloque l'audio non sollicité
    }
  },

  /**
   * Action complète sur Quiz Answer (Haptique + Audio)
   */
  answerFeedback: function(isCorrect: boolean) {
    if (isCorrect) {
      this.hapticSuccess();
      this.playAudio('success');
    } else {
      this.hapticError();
      this.playAudio('error');
    }
  },

  /**
   * Déclenche un succès complet (Vibration + Confettis + Audio)
   */
  fullSuccess: function() {
    this.hapticSuccess();
    this.playAudio('success');
    this.celebrate();
  }
};
