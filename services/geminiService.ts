/**
 * Service pour l'IA via Google Gemini (Direct)
 * Système de repli automatique (Fallback Chain) ultra-résilient et rapide.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODELS_TO_TRY = ["gemini-flash-lite-latest", "gemini-pro-latest", "gemini-2.5-flash"];

export const geminiService = {
  /**
   * Appel générique à Gemini avec système de repli automatique
   */
  async generateContent(messages: any[], jsonMode: boolean = false) {
    if (!GEMINI_API_KEY) {
      throw new Error("Clé API Gemini manquante.");
    }

    // Extraction du system prompt si présent
    const systemPrompt = messages.find(m => m.role === 'system')?.content;
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(msg => {
        const role = msg.role === "assistant" ? "model" : "user";
        
        let parts = [];
        if (typeof msg.content === 'string') {
          parts.push({ text: msg.content });
        } else if (Array.isArray(msg.content)) {
          msg.content.forEach((part: any) => {
            if (part.type === 'text') {
              parts.push({ text: part.text });
            } else if (part.type === 'image_url') {
              let mimeType = "image/jpeg";
              if (part.image_url.url.startsWith('data:')) {
                  mimeType = part.image_url.url.split(';')[0].split(':')[1];
              }
              const base64Data = part.image_url.url.split(',')[1] || part.image_url.url;
              parts.push({
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              });
            }
          });
        }

        return { role, parts };
      });

    const payload: any = {
      contents,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        responseMimeType: jsonMode ? "application/json" : "text/plain",
      }
    };

    if (systemPrompt) {
      payload.system_instruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    let lastError: any = null;

    // Boucle à travers les modèles pour trouver un modèle opérationnel
    for (const model of MODELS_TO_TRY) {
      try {
        console.log(`[GeminiService] Tentative avec le modèle : ${model}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(`Gemini Error ${response.status}: ${error?.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error("Aucune réponse de Gemini.");
        }

        console.log(`[GeminiService] Succès avec le modèle : ${model}`);
        return data.candidates[0].content.parts[0].text || "";
      } catch (error: any) {
        console.warn(`[GeminiService] Échec du modèle ${model} :`, error.message);
        lastError = error;
      }
    }

    // Si tous les modèles ont échoué
    throw lastError || new Error("Tous les modèles Gemini ont échoué.");
  }
};
