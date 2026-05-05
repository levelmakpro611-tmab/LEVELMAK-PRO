/**
 * Service pour l'IA via OpenRouter
 * Modèle par défaut : nvidia/nemotron-3-super-120b-a12b:free
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// --- Système de Rotation des Modèles (Pro & Rapide) ---
const PRIMARY_MODEL = "google/gemini-2.0-flash-001"; // Ultra Rapide & Précis
const SECONDARY_MODEL = "google/gemini-2.0-flash-lite-preview-02-05:free";
const LOGIC_MODEL = "deepseek/deepseek-chat:free";
const TEXT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const GROK_MODEL = "x-ai/grok-2-1212:free";

const VISION_MODEL = "google/gemini-2.0-flash-001";
const DEFAULT_MODEL = PRIMARY_MODEL;
const FALLBACK_MODEL = "openrouter/free";
const MULTIMODAL_MODEL = VISION_MODEL;

const MODEL_ROTATION = [
  PRIMARY_MODEL,
  SECONDARY_MODEL,
  LOGIC_MODEL,
  TEXT_MODEL,
  GROK_MODEL,
  FALLBACK_MODEL
];

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Appel générique à OpenRouter
 */
async function callOpenRouter(messages: any[], model: string = DEFAULT_MODEL, jsonMode: boolean = false) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Clé API OpenRouter manquante. Veuillez l'ajouter dans le fichier .env (VITE_OPENROUTER_API_KEY).");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 secondes de timeout

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://levelmak.com",
        "X-Title": "Levelmak Pro",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        response_format: jsonMode ? { type: "json_object" } : undefined,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.error("OpenRouter Error:", response.status, errorBody);
    
    const err = new Error(
      response.status === 429 
        ? "L'IA est actuellement saturée ou votre limite d'utilisation gratuite est atteinte. Veuillez patienter une minute avant de réessayer."
        : `Erreur OpenRouter: ${response.status} ${errorBody?.error?.message || response.statusText}`
    );
    (err as any).status = response.status;
    throw err;
  }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error("L'IA met trop de temps à répondre. Vérifiez votre connexion ou réessayez avec un texte plus court.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Appelle l'IA avec une rotation automatique des modèles en cas d'erreur (Rate limit, etc.)
 */
async function callWithRotation(messages: any[], jsonMode: boolean = false) {
  let lastError = null;
  
  for (const model of MODEL_ROTATION) {
    try {
      console.log(`🚀 Tentative avec le modèle : ${model}`);
      return await callOpenRouter(messages, model, jsonMode);
    } catch (error: any) {
      lastError = error;
      // Si c'est une erreur 429 (Too Many Requests) ou une erreur serveur, on passe au suivant
      if (error.status === 429 || error.status >= 500 || error.message.includes("saturée") || error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        console.warn(`⚠️ Modèle ${model} indisponible ou erreur réseau, passage au suivant...`);
        continue;
      }
      // Pour les autres erreurs (ex: clé invalide), on arrête tout de suite
      throw error;
    }
  }
  
  throw lastError || new Error("Tous les modèles d'IA sont actuellement indisponibles.");
}

export const openrouterService = {
  /**
   * Génère un quiz à partir de sources textuelles ou visuelles
   */
  async generateMultimodalQuiz(sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], subject: string, difficulty: string = 'Intermédiaire', lang: string = 'fr') {
    const hasImages = sources.some(s => s.type === 'image' || s.type === 'pdf');
    // Modèle gratuit haute qualité — Llama 3.3 70B (texte) / Gemma 3 27B (vision)
    const model = hasImages ? VISION_MODEL : DEFAULT_MODEL;

    const messages = [
      {
        role: "system",
        content: `Tu es un expert en pédagogie d'élite. Ton rôle est de concevoir un quiz rigoureusement basé SUR LE DOCUMENT fourni.
        Retourne UNIQUEMENT un objet JSON.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Sujet général: ${subject}
            Difficulté: ${difficulty}
            Langue de réponse: ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}
            
            Règles ABSOLUES :
            1. Ton quiz DOIT porter exclusivement sur le contenu des documents/images qui suivent. Ne tire pas de questions de tes connaissances générales, utilise uniquement le texte fourni.
            2. Génère un JSON structuré :
               - "title": Titre accrocheur.
               - "summary": Résumé de 3-4 phrases.
               - "keyPoints": 5-7 points clés d'après le document.
               - "definitions": [{ term, definition }].
               - "questions": 10 questions QCM avec { text, options: [4], correctAnswer: 0-3, explanation }.`
          }
        ]
      }
    ];

    // Ajouter les sources au message user avec insistance
    let textContent = "";
    sources.forEach(source => {
      if (source.type === 'text') {
        textContent += "\n\n" + source.data;
      } else if (source.type === 'image') {
        const base64Data = source.data.includes(',') ? source.data : `data:image/jpeg;base64,${source.data}`;
        (messages[1].content as any[]).push({ type: "image_url", image_url: { url: base64Data } });
      }
    });

    if (textContent.trim() !== "") {
      (messages[1].content as any[]).push({ 
        type: "text", 
        text: `\n\n=== CONTENU DU DOCUMENT À ANALYSER ET UTILISER POUR LE QUIZ ===\n${textContent}\n=======================================================\n\nMaintenant, génère le JSON complet exclusivement basé sur ce contenu.`
      });
    }

    // Utilisation de la rotation automatique pour garantir rapidité et précision
    const responseText = await callWithRotation(messages, true);

    let data: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      data = JSON.parse(jsonStr);
    } catch (err) {
      console.error("Erreur de formatage Quiz:", err, "Texte brut:", responseText);
      throw new Error("L'IA n'a pas réussi à structurer le Quiz correctement.");
    }

    if (data.questions) {
      data.questions = data.questions.map((q: any, idx: number) => ({
        ...q,
        id: `q_${Date.now()}_${idx}`
      }));
    }

    return data;
  },

  async coachChat(message: string, history: { role: 'user' | 'bot'; text: string }[], userContext: string, base64Image?: string) {
    const hasImage = !!base64Image;
    const model = hasImage ? VISION_MODEL : DEFAULT_MODEL;

    const systemPrompt = `Tu es l'ELITE COACH de LEVELMAK PRO, un professeur émérite et un mentor pédagogique d'élite.
Ton langage est soutenu, élégant et profondément intellectuel. Tu ne parles pas comme une machine, mais comme un véritable maître à penser qui s'adresse à un esprit brillant.
Directives cruciales :
1. ÉLOQUENCE : Utilise un vocabulaire riche et une structure de phrase soignée. Évite les réponses robotiques ou trop courtes.
2. TON PROFESSORAL : Sois courtois, solennel et inspirant. Salue l'utilisateur avec distinction si c'est le début de la conversation.
3. PÉDAGOGIE DE MAÎTRE : Ne donne pas seulement la réponse. Guide la réflexion par des analogies puissantes ou des questions socratiques qui stimulent l'intelligence.
4. ANALYSE D'EXPERT : Pour les images d'exercices, décompose la complexité avec la rigueur d'un académicien.
5. ÉVITE LA BRIÈVETÉ EXCESSIVE : Prends le temps d'expliquer les concepts en profondeur si nécessaire, tout en restant pertinent.
6. FORMATAGE : Utilise le Markdown (##, ###) pour une présentation digne d'une thèse universitaire.

Contexte actuel : ${userContext}`;

    const formattedHistory = history.map(msg => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.text
    }));

    const currentMessageContent: any[] = [{ type: "text", text: message || "Regarde cette image." }];
    
    if (base64Image) {
      const imgData = base64Image.includes(',') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      currentMessageContent.push({ type: "image_url", image_url: { url: imgData } });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      { role: "user", content: currentMessageContent }
    ];

    try {
      console.log(`🚀 CoachIA: Envoi requête avec rotation`);
      return await callWithRotation(messages);
    } catch (e: any) {
      throw e;
    }
  },

  async performOCR(base64Image: string) {
    const base64Data = base64Image.includes(',') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: "Extrais tout le contenu textuel de ce document." },
          { type: "image_url", image_url: { url: base64Data } }
        ]
      }
    ];
    return await callWithRotation(messages);
  },

  async searchBooksWithGemini(query: string, lang: string = 'fr') {
    const messages = [
      {
        role: "system",
        content: "Tu es une IA experte en bibliographie éducative. Retourne un JSON uniquement."
      },
      {
        role: "user",
        content: `L'élève recherche : "${query}". Langue: ${lang}.
        Fournis des recommandations de livres avec titre, auteurs, description et liens suggérés (Gallica, Archive.org, Google).`
      }
    ];

    const text = await callWithRotation(messages, true);
    const data = JSON.parse(text);

    if (!data.recommendations) return { text: "Pas de résultats précis.", links: [] };

    const books = data.recommendations.map((rec: any) => ({
      title: rec.title,
      authors: rec.authors,
      uri: rec.directLink || `https://www.google.com/search?q=${encodeURIComponent(rec.title + " " + rec.authors + " pdf gratuit")}`,
      thumbnail: `https://placehold.co/300x450/1e293b/FFFFFF/png?text=${encodeURIComponent(rec.title)}`,
      description: rec.description,
      isGeminiFallback: true,
      source: rec.source || "Recherche IA",
      fallbacks: rec.fallbacks || {
        Google: `https://www.google.fr/search?q=${encodeURIComponent(rec.title + " " + rec.authors + " pdf")}`
      }
    }));

    return {
      text: data.text || `Voici les ressources pour : "${query}"`,
      links: books
    };
  },

  async searchBooks(query: string) {
    return this.searchBooksWithGemini(query);
  },

  async generateQuiz(content: string, subject: string, difficulty: string = 'Intermédiaire', lang: string = 'fr') {
    return this.generateMultimodalQuiz([{ type: 'text', data: content }], subject, difficulty, lang);
  },

  async generatePlanWithImages(examDate: string, subjects: string[], base64Images: string[]) {
    return this.generatePlanMultimodal(examDate, subjects, base64Images.map(img => ({ type: 'image', data: img })));
  },

  async generateText(prompt: string, model: string = DEFAULT_MODEL) {
    return await callWithRotation([{ role: "user", content: prompt }]);
  },

  async generatePlanMultimodal(examDate: string, subjects: string[], sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], lang: string = 'fr') {
    const hasImages = sources.some(s => s.type === 'image' || s.type === 'pdf');
    const model = hasImages ? VISION_MODEL : DEFAULT_MODEL;

    const prompt = `Génère un plan d'étude réaliste et structuré pour un étudiant préparant ses examens le ${examDate}.
Les matières à réviser sont : ${subjects.join(', ')}.

Retourne UNIQUEMENT un objet JSON valide avec la structure suivante :
{
  "title": "Nom du plan de révision",
  "startDate": "${new Date().toISOString().split('T')[0]}",
  "endDate": "${examDate}",
  "tasks": [
    {
      "id": "task_1",
      "title": "Titre explicite de la session",
      "subject": "Nom de la matière",
      "description": "Objectif précis de la révision",
      "duration": "Durée (ex: 2h)",
      "priority": "high",
      "date": "YYYY-MM-DD"
    }
  ]
}

Assure-toi que les sessions sont réparties intelligemment jusqu'à la veille de l'examen. Varie les matières et prévois des temps de pause. Langue: ${lang}.`;

    const messages: any[] = [
      {
        role: "system",
        content: "Tu es un expert en planification pédagogique d'élite. Tu ne réponds que par du JSON pur et tu te bases absolument sur les documents fournis si présents."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    // Ajouter les sources visuelles si présentes
    let textContent = "";
    sources.forEach(source => {
      if (source.type === 'text') {
        textContent += "\n\n" + source.data;
      } else if (source.type === 'image') {
        const base64Data = source.data.includes(',') ? source.data : `data:image/jpeg;base64,${source.data}`;
        if (typeof messages[1].content === 'string') {
          messages[1].content = [
            { type: "text", text: messages[1].content },
            { type: "image_url", image_url: { url: base64Data } }
          ];
        } else {
          (messages[1].content as any[]).push({ type: "image_url", image_url: { url: base64Data } });
        }
      }
    });

    if (textContent.trim() !== "") {
      if (typeof messages[1].content === 'string') {
         messages[1].content += "\n\n=== DOCUMENTS À PRENDRE EN COMPTE ===\n" + textContent;
      } else {
         (messages[1].content as any[]).push({ type: "text", text: "\n\n=== DOCUMENTS À PRENDRE EN COMPTE ===\n" + textContent });
      }
    }

    console.log("🚀 Envoi requête Plan Multimodal à OpenRouter avec le modèle:", model);
    
    try {
      responseText = await callWithRotation(messages, true);
    } catch (e: any) {
      throw e;
    }

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Erreur parsing JSON Plan:", error);
      throw error;
    }
  },

  async generateFlashcards(content: string, subject: string, lang: string = 'fr') {
    const messages = [
      {
        role: "system",
        content: "Expert en mémorisation d'élite. Tu dois ABSOLUMENT répondre par un objet JSON pur: { \"cards\": [ { \"front\": \"Question\", \"back\": \"Réponse detaillee\" } ] }."
      },
      {
        role: "user",
        content: `Conçois un deck de flashcards complet basé STRICTEMENT sur ce cours.\nSujet: ${subject}\nLangue: ${lang}\n\nCours: "${content}"`
      }
    ];

    let text = "";
    try {
      text = await callWithRotation(messages, false);
    } catch (e: any) {
      throw e;
    }

    try {
      // Extraction robuste du JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      const data = JSON.parse(jsonStr);

      if (!data.cards || !Array.isArray(data.cards)) {
        throw new Error("Structure JSON invalide: 'cards' manquant.");
      }

      return data.cards.map((card: any, idx: number) => ({
        ...card,
        id: `fc_${Date.now()}_${idx}`,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0
      }));
    } catch (error: any) {
       console.error("Erreur de formatage Flashcards:", error, "Texte brut:", text);
       throw new Error(`Erreur de formatage: ${error.message || "Impossible de lire la réponse de l'IA"}`);
    }
  },

  async getDailyVocabulary(seenWords: string[] = [], lang: string = 'fr') {
    const excludeList = seenWords.length > 0 ? `NE SOUMETS SURTOUT PAS ces mots : ${seenWords.map(w => w.split(':')[0]).join(', ')}.` : '';
    const prompt = `Tu dois agir comme un professeur d'élite.
Génère STRICTEMENT exactement deux NOUVEAUX mots de vocabulaire sophistiqués en ${lang}.
${excludeList}
RÈGLE ABSOLUE : Remplace les valeurs par du VRAI texte, n'écris JAMAIS "...".
JSON REQUIS : { "words": [ { "word": "Mot", "explanation": "Explication claire", "usage": "Phrase d'exemple" } ] }.`;
    const text = await callWithRotation([{ role: "user", content: prompt }], true);
    const data = JSON.parse(text);
    return data.words;
  },

  async getDailyMotivation(seenMotivations: string[] = [], lang: string = 'fr') {
    const excludeList = seenMotivations.length > 0 ? `NE SOUMETS SURTOUT PAS ces citations : ${seenMotivations.map(m => `"${m.substring(0, 20)}..."`).join(', ')}.` : '';
    const prompt = `Tu dois agir comme un grand sage inspirant.
Génère STRICTEMENT une NOUVELLE phrase de motivation puissante et rare pour un étudiant en ${lang}.
${excludeList}
RÈGLE ABSOLUE : Remplace les valeurs par du VRAI texte, n'écris JAMAIS "...".
JSON REQUIS : { "quote": "La citation inspirante", "author": "Nom de l'Auteur" }.`;
    const text = await callWithRotation([{ role: "user", content: prompt }], true);
    return JSON.parse(text);
  },

  async summarizeBook(title: string, author: string, description: string, lang: string = 'fr') {
    const prompt = `Analyse littéraire de ${title} (${author}) en ${lang}. JSON: { "mainSummary", "keyTakeaways", "difficulty", "estimatedReadingTime" }.`;
    const text = await callWithRotation([{ role: "user", content: prompt }], true);
    return JSON.parse(text);
  },

  async getDiceSurprise(lang: string = 'fr') {
    const prompt = `Génère une blague ou anecdote éducative en ${lang}. JSON: { "type", "title", "content", "author" }.`;
    const text = await callWithRotation([{ role: "user", content: prompt }], true);
    return JSON.parse(text);
  },

  async generateOfflinePack(topic: string, level: string = 'Intermédiaire', lang: string = 'fr') {
    const prompt = `Pack de survie éducatif sur "${topic}" en ${lang}. JSON avec title, summary, keyPoints, definitions, faq, quiz.`;
    const text = await callWithRotation([{ role: "user", content: prompt }], true);
    return JSON.parse(text);
  },

  async summarizeMultimodal(sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], subject: string = 'Inconnu', lang: string = 'fr') {
    const hasImages = sources.some(s => s.type === 'image' || s.type === 'pdf');
    const model = hasImages ? VISION_MODEL : DEFAULT_MODEL;

    const messages = [
      {
        role: "system",
        content: `Tu es un expert en pédagogie d'élite. Ton but est de produire une synthèse structurée et pédagogique DU DOCUMENT fourni.
        Tu dois répondre UNIQUEMENT par un objet JSON respectant strictement ce format :
        {
          "title": "Un titre court et accrocheur",
          "mainSummary": "Une synthèse globale de 2-3 paragraphes",
          "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
          "definitions": [{"term": "Mot 1", "definition": "Explication 1"}],
          "estimatedReadingTime": "X min",
          "difficulty": "Facile | Intermédiaire | Difficile"
        }`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Sujet suggéré: ${subject}
            Langue: ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}
            
            Analyse les documents suivants et génère la synthèse au format JSON demandé.`
          }
        ]
      }
    ];

    // Ajouter les sources au message user
    let textContent = "";
    sources.forEach(source => {
      if (source.type === 'text') {
        textContent += "\n\n" + source.data;
      } else if (source.type === 'image') {
        const base64Data = source.data.includes(',') ? source.data : `data:image/jpeg;base64,${source.data}`;
        (messages[1].content as any[]).push({ type: "image_url", image_url: { url: base64Data } });
      }
    });

    if (textContent.trim() !== "") {
      (messages[1].content as any[]).push({ 
        type: "text", 
        text: `\n\n=== CONTENU DU DOCUMENT ===\n${textContent}\n==========================`
      });
    }

    try {
        console.log(`🚀 Synthèse Multimodale: Envoi au modèle ${model}`);
        const responseText = await callWithRotation(messages, true);
        
        // Nettoyage au cas où l'IA ajoute du texte avant/après le JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText;
        
        const data = JSON.parse(cleanJson);
        
        // Garantir les champs par défaut pour éviter les crashs UI
        return {
            title: data.title || subject || "Résumé sans titre",
            mainSummary: data.mainSummary || "Pas de synthèse générée.",
            keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
            definitions: Array.isArray(data.definitions) ? data.definitions : [],
            estimatedReadingTime: data.estimatedReadingTime || "5 min",
            difficulty: data.difficulty || "Intermédiaire"
        };
    } catch (error) {
        console.error("Erreur lors de la synthèse:", error);
        throw error;
    }
  },

  async analyzeWriting(text: string, title: string, lang: string = 'fr') {
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en linguistique et en correction littéraire d'élite.
        Ton rôle est d'analyser le texte d'un élève pour détecter :
        1. Les fautes d'orthographe.
        2. Les fautes de grammaire et de conjugaison.
        3. Les fautes d'accord (sujet-verbe, adjectifs, etc.).
        4. Le style et le vocabulaire.

        Tu dois ABSOLUMENT fournir une explication pédagogique pour chaque erreur afin que l'élève comprenne la règle et ne la reproduise plus.
        RETOURNE UNIQUEMENT UN OBJET JSON avec cette structure :
        {
          "score": 0-100,
          "criteria": { "style": 0-100, "grammar": 0-100, "vocabulary": 0-100, "structure": 0-100 },
          "feedback": "Commentaire global encourageant et pro",
          "corrections": [
            { "original": "le mot faux", "correction": "le mot juste", "reason": "Explication de la règle d'orthographe ou d'accord appliquée ici." }
          ],
          "synonyms": [
            { "word": "mot simple", "suggestions": ["synonyme 1", "synonyme 2"], "context": "Pourquoi ce synonyme est plus adapté ici ?" }
          ]
        }`
      },
      {
        role: "user",
        content: `Analyse ce texte intitulé "${title}" :
        "${text}"
        
        Langue : ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}`
      }
    ];

    try {
      const textResponse = await callWithRotation(messages, true);
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);
    } catch (e) {
      throw e;
    }
  },

  async getBattleQuiz(lang: string = 'fr') {
    const prompt = `Génère un quiz de DUEL pour deux étudiants en ${lang}. 
    Le quiz doit comporter exactement 10 questions variées (Histoire, Géo, Sciences, Mathématiques, Culture Générale).
    Retourne UNIQUEMENT un objet JSON : { "questions": [ { "text", "options": [4], "correctAnswer": 0-3, "explanation" } ] }.`;
    
    const text = await callWithRotation([{ role: "user", content: prompt }], true);
    const data = JSON.parse(text);
    
    if (data.questions) {
      return data.questions.map((q: any, idx: number) => ({
        ...q,
        id: `battle_q_${Date.now()}_${idx}`
      }));
    }
    throw new Error("Format de quiz battle invalide");
  },

  async feynmanChat(message: string, history: { role: 'user' | 'assistant'; content: string }[], topic: string, lang: string = 'fr') {
    const systemPrompt = `Tu es Léo, un élève curieux de 10 ans. Tu discutes avec ton "professeur" (l'utilisateur).
Ton but est de comprendre le sujet suivant : "${topic}".
REGLER CRUCIALES :
1. Tu es naïf mais intelligent.
2. Si le prof utilise des mots compliqués (jargon), demande-lui de t'expliquer comme si tu étais petit.
3. Pose une seule question à la fois, courte et directe.
4. Si l'explication est vraiment claire et imagée (avec des analogies), dis "Génial ! J'ai enfin compris !" et résume ce que tu as retenu en une phrase.
5. Sinon, continue de poser des questions de curiosité ("Pourquoi ?", "Comment ça marche ?").
6. RÈGLE DE SALUTATION : Ne salue JAMAIS l'utilisateur si l'historique contient déjà des messages.
Langue: ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    return await callWithRotation(messages);
  },

  async historyChat(message: string, history: { role: 'user' | 'assistant'; content: string }[], character: string, era: string, lang: string = 'fr') {
    const systemPrompt = `Tu es ${character}. Ton époque est ${era}.
Tu discutes avec un "voyageur du temps" (l'utilisateur).
REGLER CRUCIALES :
1. Adopte strictement le ton, le vocabulaire et les opinions de ${character}.
2. Tu ne connais rien de ce qui s'est passé après ta mort ou ton époque, sauf si le voyageur t'en parle.
3. Sois immersif et passionnant.
4. Réponds en ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}.
5. RÈGLE DE SALUTATION : Ne salue JAMAIS l'utilisateur si l'historique contient déjà des messages.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    return await callWithRotation(messages);
  },

  async solveScientificProblem(problem: string, context?: string, base64Image?: string, lang: string = 'fr') {
    const hasImage = !!base64Image;
    const model = hasImage ? VISION_MODEL : DEFAULT_MODEL;

    const systemPrompt = `Tu es "Elite Scientist", un professeur expert en Mathématiques, Physique et Chimie.
Ton rôle est de résoudre le problème fourni avec une rigueur absolue et une pédagogie exceptionnelle.
STRUCTURE DE TA RÉPONSE (JSON REQUIS) :
{
  "solution": "Texte court de la solution finale",
  "steps": ["Étape 1...", "Étape 2..."],
  "pedagogy": "Explication du 'Pourquoi' et du 'Comment' pour aider l'élève à comprendre le concept.",
  "formulas": ["Formule 1", "Formule 2"],
  "subject": "Maths | Physique | Chimie"
}
RÈGLES :
1. Utilise le format LaTeX pour les formules mathématiques (ex: $x^2$, $\\frac{a}{b}$).
2. Sois précis et encourageant.
3. Langue : ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}.`;

    const userContent: any[] = [{ type: "text", text: `Problème : ${problem}\nContexte additionnel : ${context || 'Aucun'}` }];
    if (base64Image) {
      const imgData = base64Image.includes(',') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      userContent.push({ type: "image_url", image_url: { url: imgData } });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ];

    const response = await callWithRotation(messages, true);
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      console.error("Erreur parsing solution scientifique:", e);
      throw new Error("Impossible d'analyser la solution générée.");
    }
  },

  async verifyScientificSolution(problemContext: string, studentSolutionBase64: string, lang: string = 'fr') {
    const model = VISION_MODEL; // Vision requise

    const systemPrompt = `Tu es "Elite Corrector". Tu dois analyser la photo de la solution manuscrite d'un élève et la comparer au problème posé.
OBJECTIF : Dire si c'est juste, identifier les erreurs et donner des conseils.
STRUCTURE DE TA RÉPONSE (JSON REQUIS) :
{
  "isCorrect": boolean,
  "score": 0-100,
  "feedback": "Commentaire global sur le travail",
  "errors": ["Description de l'erreur 1", "Erreur 2..."],
  "suggestions": ["Conseil pour s'améliorer..."],
  "ocrTranscript": "Transcription du texte détecté sur la photo"
}
RÈGLES :
1. Sois bienveillant mais très précis sur les erreurs de calcul ou de raisonnement.
2. Si le texte est illisible, mentionne-le dans le feedback.
3. Langue : ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}.`;

    const imgData = studentSolutionBase64.includes(',') ? studentSolutionBase64 : `data:image/jpeg;base64,${studentSolutionBase64}`;
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: [
        { type: "text", text: `Contexte du problème / Énoncé : ${problemContext}` },
        { type: "image_url", image_url: { url: imgData } }
      ]}
    ];

    const response = await callWithRotation(messages, true);
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      console.error("Erreur parsing vérification scientifique:", e);
      throw new Error("Erreur lors de l'analyse de ta photo.");
    }
  }
};

