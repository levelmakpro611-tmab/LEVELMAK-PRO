
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Preferences } from '@capacitor/preferences';

/**
 * Service pour la biométrie (FaceID / TouchID).
 * Utilise @capgo/capacitor-native-biometric pour une sécurité matérielle réelle.
 */
export const biometricService = {
  /**
   * Vérifie si la biométrie est disponible et configurée sur l'appareil
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (e) {
      console.error('Biométrie non disponible:', e);
      return false;
    }
  },

  /**
   * Retourne le type de biométrie disponible (FaceID, TouchID, Fingerprint, etc.)
   */
  getBiometryType: async (): Promise<string> => {
    try {
      const result = await NativeBiometric.isAvailable();
      return String(result.biometryType || 'NONE');
    } catch (e) {
      return 'NONE';
    }
  },

  /**
   * Active la biométrie pour l'utilisateur actuel et sauvegarde ses identifiants de manière sécurisée
   */
  enable: async (identifier: string, password?: string): Promise<boolean> => {
    try {
      if (!password) return false;

      // 1. Marquer comme activé dans les préférences (pour l'UI)
      await Preferences.set({ key: 'biometric_enabled', value: 'true' });
      await Preferences.set({ key: 'biometric_user_id', value: identifier });

      // 2. Sauvegarder les identifiants dans le Keystore/Keychain natif (SÉCURISÉ)
      await NativeBiometric.setCredentials({
        username: identifier,
        password: password,
        server: 'levelmak.pro',
      });

      return true;
    } catch (e) {
      console.error('Erreur activation biométrie:', e);
      return false;
    }
  },

  /**
   * Désactive la biométrie et supprime les identifiants sécurisés
   */
  disable: async (): Promise<void> => {
    try {
      await Preferences.remove({ key: 'biometric_enabled' });
      await Preferences.remove({ key: 'biometric_user_id' });
      
      await NativeBiometric.deleteCredentials({
        server: 'levelmak.pro',
      });
    } catch (e) {
      console.error('Erreur désactivation biométrie:', e);
    }
  },

  /**
   * Vérifie si la biométrie est activée par l'utilisateur
   */
  isEnabled: async (): Promise<boolean> => {
    const { value } = await Preferences.get({ key: 'biometric_enabled' });
    if (value !== 'true') return false;
    
    // Vérifier aussi si le hardware est toujours dispo
    return await biometricService.isAvailable();
  },

  /**
   * Déclenche l'authentification biométrique native et retourne les identifiants sécurisés
   */
  authenticate: async (): Promise<{ identifier: string; password?: string } | null> => {
    try {
      // 1. Déclencher le prompt natif (Fingerprint/FaceID)
      await NativeBiometric.verifyIdentity({
        reason: "Authentifiez-vous pour accéder à Levelmak Pro",
        title: "Connexion Biométrique",
        subtitle: "Utilisez votre empreinte ou visage",
        description: "Sécurisez votre accès élite",
        negativeButtonText: "Annuler",
      });

      // 2. Si succès, récupérer les identifiants du stockage sécurisé
      const credentials = await NativeBiometric.getCredentials({
        server: 'levelmak.pro',
      });

      if (credentials && credentials.username && credentials.password) {
        return { 
          identifier: credentials.username, 
          password: credentials.password 
        };
      }
      
      return null;
    } catch (e: any) {
      // L'utilisateur a annulé ou l'auth a échoué
      console.error('Échec authentification biométrique:', e);
      return null;
    }
  }
};
