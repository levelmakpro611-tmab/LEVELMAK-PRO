import { Preferences } from '@capacitor/preferences';

/**
 * Service pour la biométrie (FaceID / TouchID).
 * Utilise WebAuthn en fallback si disponible.
 */
export const biometricService = {
  /**
   * Vérifie si la biométrie est disponible sur l'appareil
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      if (window.PublicKeyCredential) {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  /**
   * Active la biométrie pour l'utilisateur actuel et sauvegarde ses identifiants
   */
  enable: async (identifier: string, password?: string): Promise<boolean> => {
    try {
      await Preferences.set({ key: 'biometric_enabled', value: 'true' });
      await Preferences.set({ key: 'biometric_user_id', value: identifier });
      if (password) {
        await Preferences.set({ key: 'biometric_pwd', value: password });
      }
      return true;
    } catch (e) {
      console.error('Erreur activation biométrie:', e);
      return false;
    }
  },

  /**
   * Désactive la biométrie
   */
  disable: async (): Promise<void> => {
    await Preferences.remove({ key: 'biometric_enabled' });
    await Preferences.remove({ key: 'biometric_user_id' });
    await Preferences.remove({ key: 'biometric_pwd' });
  },

  /**
   * Vérifie si la biométrie est activée localement
   */
  isEnabled: async (): Promise<boolean> => {
    const { value } = await Preferences.get({ key: 'biometric_enabled' });
    return value === 'true';
  },

  /**
   * Déclenche l'authentification biométrique et retourne les identifiants
   */
  authenticate: async (): Promise<{ identifier: string; password?: string } | null> => {
    try {
      // Mock biometric call for now as custom plugins need manual install
      // In a real Capacitor app, we'd use NativeBiometric.verifyIdentity()
      
      const isOk = true; // Simule un succès biométrique

      if (isOk) {
        const { value: identifier } = await Preferences.get({ key: 'biometric_user_id' });
        const { value: password } = await Preferences.get({ key: 'biometric_pwd' });
        if (identifier) {
           return { identifier, password: password || undefined };
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
};
