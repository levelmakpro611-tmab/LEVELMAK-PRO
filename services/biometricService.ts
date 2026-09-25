
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
   * Active la biométrie UNIQUEMENT après vérification du mot de passe auprès de Supabase
   */
  verifyAndEnable: async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!password || password.trim().length === 0) {
        return { success: false, error: 'Mot de passe requis' };
      }

      const { supabase } = await import('./supabase');

      // Identifier can be email, phone number, or username
      let emailToTest = identifier.trim();
      if (!emailToTest.includes('@')) {
        const cleaned = emailToTest.replace(/\D/g, '');
        // Lookup profile auth_email from database
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, auth_email')
            .or(`phone_number.eq."${emailToTest}",phone_number.eq."${cleaned}"`)
            .maybeSingle();

          if (profile?.auth_email) {
            emailToTest = profile.auth_email;
          } else if (profile?.email) {
            emailToTest = profile.email;
          } else {
            emailToTest = `${cleaned}@levelmak.app`;
          }
        } catch (_) {
          emailToTest = `${cleaned}@levelmak.app`;
        }
      }

      // Verify credentials with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToTest,
        password: password
      });

      if (error || !data.user) {
        return {
          success: false,
          error: 'Mot de passe incorrect. Impossible d\'activer TouchID/FaceID.'
        };
      }

      // Mot de passe vérifié et authentifié avec succès !
      await Preferences.set({ key: 'biometric_enabled', value: 'true' });
      await Preferences.set({ key: 'biometric_user_id', value: identifier });

      try {
        await NativeBiometric.setCredentials({
          username: identifier,
          password: password,
          server: 'levelmak.pro',
        });
      } catch (nativeErr) {
        console.warn('Native biometric setCredentials warning (non-fatal on web):', nativeErr);
      }

      return { success: true };
    } catch (e: any) {
      console.error('Erreur activation biométrie:', e);
      return { success: false, error: e.message || 'Erreur lors de la vérification' };
    }
  },

  /**
   * Met à jour le mot de passe stocké pour la biométrie (lors d'un changement de mot de passe)
   */
  updatePassword: async (newPassword: string): Promise<void> => {
    try {
      const isEnabled = await biometricService.isEnabled();
      if (!isEnabled) return;
      const { value: identifier } = await Preferences.get({ key: 'biometric_user_id' });
      if (identifier) {
        await NativeBiometric.setCredentials({
          username: identifier,
          password: newPassword,
          server: 'levelmak.pro',
        });
      }
    } catch (e) {
      console.warn('Could not update biometric credentials with new password:', e);
    }
  },

  /**
   * Active la biométrie pour l'utilisateur actuel et sauvegarde ses identifiants de manière sécurisée
   */
  enable: async (identifier: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    const res = await biometricService.verifyAndEnable(identifier, password);
    return res.success;
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
        reason: "Authentifiez-vous pour accéder à Levelmak",
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
