/**
 * Service pour l'IA via Google Gemini (Sécurisé via Supabase Edge Functions)
 */

import { supabase } from './supabase';

export const geminiService = {
  /**
   * Appel générique à Gemini via la Edge Function Supabase
   */
  async generateContent(messages: any[], jsonMode: boolean = false) {
    try {
      const { data, error } = await supabase.functions.invoke('gemini', {
        body: { messages, jsonMode }
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de l'appel de la fonction de génération.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data?.text || "";
    } catch (error: any) {
      console.error("[GeminiService] Échec via Edge Function :", error.message);
      throw error;
    }
  }
};
