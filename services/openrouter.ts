/**
 * Service pour l'IA via OpenRouter (Alternative gratuite à Gemini)
 * Modèle par défaut : stepfun/step-3.5-flash:free
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = "stepfun/step-3.5-flash:free";
const MULTIMODAL_MODEL = "openrouter/free"; // Routage automatique vers le meilleur modèle gratuit (évite les 429)

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Appel générique à OpenRouter
 */
async function callOpenRouter(messages: any[], model: string = DEFAULT_MODEL, jsonMode: boolean = false) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Clé API OpenRouter manquante. Veuillez l'ajouter dans le fichier .env (VITE_OPENROUTER_API_KEY).");
  }

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://levelmak.com", // Optionnel pour OpenRouter
      "X-Title": "Levelmak Pro",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      response_format: jsonMode ? { type: "json_object" } : undefined,
    }),
  });

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
}

export const openrouterService = {
  /**
   * Génère un quiz à partir de sources textuelles ou visuelles
   */
  async generateMultimodalQuiz(sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], subject: string, difficulty: string = 'Intermédiaire', lang: string = 'fr') {
    const hasImages = sources.some(s => s.type === 'image' || s.type === 'pdf');
    // On force un modèle vision s'il y a des images.
    const model = hasImages ? "google/gemma-3-27b-it:free" : DEFAULT_MODEL;

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

    // Gestion du fallback en cas de 429 sur le premier modèle
    let text = "";
    try {
      console.log(`🚀 Quiz Multimodal: Envoi au modèle ${model}`);
      text = await callOpenRouter(messages, model, true);
    } catch (e: any) {
      if (e.status === 429 && hasImages) {
        console.warn("⚠️ 429 sur Gemma, fallback sur Mistral Vision...");
        text = await callOpenRouter(messages, "mistralai/mistral-small-3.1-24b-instruct:free", true);
      } else {
        throw e;
      }
    }

    const data = JSON.parse(text);

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
    const model = hasImage ? "google/gemma-3-27b-it:free" : DEFAULT_MODEL;

    const systemPrompt = `Tu es le "Elite Coach" de Levelmak Pro, un enseignant et mentor pédagogique exceptionnel, bienveillant mais exigeant.
Ton but est d'aider l'élève à progresser, à comprendre ses leçons et à rester motivé.
REGLER CRUCIALES DE FORMATAGE :
1. NE JAMAIS utiliser de séparateurs comme "---" ou "===".
2. Utilise des titres Markdown clairs (##, ###) pour structurer tes réponses.
3. Utilise des listes à puces pour les explications.
4. Ton ton doit être professionnel, encourageant et structuré.
5. Évite les emojis excessifs, utilise-les uniquement pour souligner un point de motivation important.
6. Ne réponds pas par des messages trop longs, sois incisif et efficace.

${hasImage ? `
DIRECTIVES SPÉCIFIQUES (Tu as reçu une image de l'élève) :
1. "Correction Experte (Snap & Solve)" : Si l'image contient un exercice (Maths, Physique, etc.), n'écris SURTOUT PAS juste la réponse finale. Agis comme un vrai tuteur : identifie le blocage, explique la méthodologie étape par étape avec pédagogie.
2. "Correcteur de Copies & Dissertations" : Si l'image est une copie (Philo, Français, etc.), corrige l'orthographe, analyse le plan et les arguments, donne une note estimative et des conseils très concrets d'amélioration.
3. "Professeur de Langues" : Si l'image est un texte en langue étrangère, ne te contente pas de traduire bêtement. Explique les règles de grammaire importantes utilisées dans le texte et dresse une liste du vocabulaire essentiel à mémoriser.
` : ''}`;

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
      console.log(`🚀 CoachIA: Envoi requête au modèle ${model}`);
      return await callOpenRouter(messages, model);
    } catch (e: any) {
      if (e.status === 429 && hasImage) {
        console.warn("⚠️ 429 sur Gemma Coach, fallback Mistral...");
        return await callOpenRouter(messages, "mistralai/mistral-small-3.1-24b-instruct:free");
      }
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
    return await callOpenRouter(messages, MULTIMODAL_MODEL);
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

    const text = await callOpenRouter(messages, DEFAULT_MODEL, true);
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

  async generateText(prompt: string) {
    return await callOpenRouter([{ role: "user", content: prompt }], DEFAULT_MODEL);
  },

  async generatePlanMultimodal(examDate: string, subjects: string[], sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], lang: string = 'fr') {
    const hasImages = sources.some(s => s.type === 'image' || s.type === 'pdf');
    const model = hasImages ? "google/gemma-3-27b-it:free" : DEFAULT_MODEL;

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
    
    let responseText = "";
    try {
      responseText = await callOpenRouter(messages, model, true);
    } catch (e: any) {
      if (e.status === 429 && hasImages) {
        console.warn("⚠️ 429 sur modèle Plan vision, fallback Mistral...");
        responseText = await callOpenRouter(messages, "mistralai/mistral-small-3.1-24b-instruct:free", true);
      } else {
         throw e;
      }
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
        content: "Expert en mémorisation. Crée des flashcards au format JSON { 'cards': [ { 'front', 'back' } ] }."
      },
      {
        role: "user",
        content: `Contenu : "${content || subject}". Langue: ${lang}.`
      }
    ];

    const text = await callOpenRouter(messages, DEFAULT_MODEL, true);
    const data = JSON.parse(text);

    return data.cards.map((card: any, idx: number) => ({
      ...card,
      id: `fc_${Date.now()}_${idx}`,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0
    }));
  },

  async getDailyVocabulary(seenWords: string[] = [], lang: string = 'fr') {
    const prompt = `Génère deux mots de vocabulaire sophistiqués en ${lang}. JSON: { "words": [ { "word", "explanation", "usage" } ] }.`;
    const text = await callOpenRouter([{ role: "user", content: prompt }], DEFAULT_MODEL, true);
    const data = JSON.parse(text);
    return data.words;
  },

  async getDailyMotivation(seenMotivations: string[] = [], lang: string = 'fr') {
    const prompt = `Génère une phrase de motivation pour un étudiant en ${lang}. JSON: { "quote", "author" }.`;
    const text = await callOpenRouter([{ role: "user", content: prompt }], DEFAULT_MODEL, true);
    return JSON.parse(text);
  },

  async summarizeBook(title: string, author: string, description: string, lang: string = 'fr') {
    const prompt = `Analyse littéraire de ${title} (${author}) en ${lang}. JSON: { "mainSummary", "keyTakeaways", "difficulty", "estimatedReadingTime" }.`;
    const text = await callOpenRouter([{ role: "user", content: prompt }], DEFAULT_MODEL, true);
    return JSON.parse(text);
  },

  async getDiceSurprise(lang: string = 'fr') {
    const prompt = `Génère une blague ou anecdote éducative en ${lang}. JSON: { "type", "title", "content", "author" }.`;
    const text = await callOpenRouter([{ role: "user", content: prompt }], DEFAULT_MODEL, true);
    return JSON.parse(text);
  },

  async generateOfflinePack(topic: string, level: string = 'Intermédiaire', lang: string = 'fr') {
    const prompt = `Pack de survie éducatif sur "${topic}" en ${lang}. JSON avec title, summary, keyPoints, definitions, faq, quiz.`;
    const text = await callOpenRouter([{ role: "user", content: prompt }], DEFAULT_MODEL, true);
    return JSON.parse(text);
  },

  async summarizeMultimodal(sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], subject: string = 'Inconnu', lang: string = 'fr') {
    const hasImages = sources.some(s => s.type === 'image' || s.type === 'pdf');
    const model = hasImages ? "google/gemma-3-27b-it:free" : DEFAULT_MODEL;

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
        const responseText = await callOpenRouter(messages, model, true);
        
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
        content: "Expert en correction littéraire. Retourne un JSON uniquement."
      },
      {
        role: "user",
        content: `Analyse ce texte "${title}": "${text}". Langue: ${lang}.`
      }
    ];

    const textResponse = await callOpenRouter(messages, DEFAULT_MODEL, true);
    return JSON.parse(textResponse);
  },

  async getBattleQuiz(lang: string = 'fr') {
    const prompt = `Génère un quiz de DUEL pour deux étudiants en ${lang}. 
    Le quiz doit comporter exactement 10 questions variées (Histoire, Géo, Sciences, Mathématiques, Culture Générale).
    Retourne UNIQUEMENT un objet JSON : { "questions": [ { "text", "options": [4], "correctAnswer": 0-3, "explanation" } ] }.`;
    
    const text = await callOpenRouter([{ role: "user", content: prompt }], DEFAULT_MODEL, true);
    const data = JSON.parse(text);
    
    if (data.questions) {
      return data.questions.map((q: any, idx: number) => ({
        ...q,
        id: `battle_q_${Date.now()}_${idx}`
      }));
    }
    throw new Error("Format de quiz battle invalide");
  }
};
