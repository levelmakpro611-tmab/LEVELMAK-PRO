import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const MODELS_TO_TRY = ["gemini-flash-lite-latest", "gemini-pro-latest", "gemini-2.5-flash"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Gérer la requête de pré-vol CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Clé API Gemini manquante dans les secrets du projet Supabase.");
    }

    const { messages, jsonMode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Le paramètre 'messages' est requis et doit être un tableau.");
    }

    // Extraction du system prompt si présent
    const systemPrompt = messages.find((m: any) => m.role === "system")?.content;
    const contents = messages
      .filter((m: any) => m.role !== "system")
      .map((msg: any) => {
        const role = msg.role === "assistant" ? "model" : "user";
        
        let parts = [];
        if (typeof msg.content === "string") {
          parts.push({ text: msg.content });
        } else if (Array.isArray(msg.content)) {
          msg.content.forEach((part: any) => {
            if (part.type === "text") {
              parts.push({ text: part.text });
            } else if (part.type === "image_url") {
              let mimeType = "image/jpeg";
              if (part.image_url.url.startsWith("data:")) {
                mimeType = part.image_url.url.split(";")[0].split(":")[1];
              }
              const base64Data = part.image_url.url.split(",")[1] || part.image_url.url;
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
    let textResponse = "";
    let success = false;

    // Boucle à travers les modèles de repli pour trouver un modèle opérationnel
    for (const model of MODELS_TO_TRY) {
      try {
        console.log(`[Edge Function] Tentative avec le modèle : ${model}`);
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
          throw new Error("Aucune réponse retournée par l'API Gemini.");
        }

        console.log(`[Edge Function] Succès avec le modèle : ${model}`);
        textResponse = data.candidates[0].content.parts[0].text || "";
        success = true;
        break;
      } catch (error: any) {
        console.warn(`[Edge Function] Échec du modèle ${model} :`, error.message);
        lastError = error;
      }
    }

    if (!success) {
      throw lastError || new Error("Tous les modèles Gemini configurés ont échoué.");
    }

    return new Response(JSON.stringify({ text: textResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Edge Function Error]:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
