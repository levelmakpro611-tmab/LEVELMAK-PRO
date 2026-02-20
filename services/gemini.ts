import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuration des clés API Gemini (Support de la rotation pour éviter les quotas)
const getAPIKeys = () => {
  const keysStr = import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY || "";
  return keysStr.split(',').map(k => k.trim()).filter(Boolean);
};

let apiKeys = getAPIKeys();
let currentKeyIndex = parseInt(localStorage.getItem('gemini_api_key_index') || '0');

// Système de cooldown pour les clés épuisées
interface KeyCooldown {
  keyIndex: number;
  exhaustedAt: number;
  cooldownUntil: number;
}

const COOLDOWN_DURATION = 60 * 1000; // 1 minute de cooldown
const REQUEST_DELAY = 1500; // 1.5 secondes entre chaque requête

let keyCooldowns: KeyCooldown[] = [];
let lastRequestTime = 0;

// Charger les cooldowns depuis localStorage
const loadCooldowns = () => {
  try {
    const stored = localStorage.getItem('gemini_key_cooldowns');
    if (stored) {
      const cooldowns = JSON.parse(stored);
      // Filtrer les cooldowns expirés
      keyCooldowns = cooldowns.filter((c: KeyCooldown) => c.cooldownUntil > Date.now());
    }
  } catch (e) {
    console.error('Erreur chargement cooldowns:', e);
  }
};

const saveCooldowns = () => {
  try {
    localStorage.setItem('gemini_key_cooldowns', JSON.stringify(keyCooldowns));
  } catch (e) {
    console.error('Erreur sauvegarde cooldowns:', e);
  }
};

const addCooldown = (keyIndex: number) => {
  const now = Date.now();
  keyCooldowns = keyCooldowns.filter(c => c.keyIndex !== keyIndex);
  keyCooldowns.push({
    keyIndex,
    exhaustedAt: now,
    cooldownUntil: now + COOLDOWN_DURATION
  });
  saveCooldowns();
  console.log(`❄️ Clé ${keyIndex + 1} en cooldown pour ${COOLDOWN_DURATION / 1000}s`);
};

const isKeyInCooldown = (keyIndex: number): boolean => {
  const now = Date.now();
  const cooldown = keyCooldowns.find(c => c.keyIndex === keyIndex);
  if (cooldown && cooldown.cooldownUntil > now) {
    return true;
  }
  return false;
};

// Trouver la prochaine clé disponible
const findNextAvailableKey = (): number | null => {
  for (let i = 0; i < apiKeys.length; i++) {
    const keyIndex = (currentKeyIndex + i) % apiKeys.length;
    if (!isKeyInCooldown(keyIndex)) {
      return keyIndex;
    }
  }
  return null;
};

// S'assurer que l'index est valide
loadCooldowns();
if (isNaN(currentKeyIndex) || currentKeyIndex >= apiKeys.length) {
  currentKeyIndex = 0;
}

const getGenAI = () => new GoogleGenerativeAI(apiKeys[currentKeyIndex]);

const rotateKey = () => {
  if (apiKeys.length <= 1) return false;

  const nextKey = findNextAvailableKey();
  if (nextKey === null) {
    console.error('❌ Toutes les clés sont en cooldown!');
    return false;
  }

  currentKeyIndex = nextKey;
  localStorage.setItem('gemini_api_key_index', currentKeyIndex.toString());
  console.log(`🔄 Rotation de clé : Passage à la clé ${currentKeyIndex + 1}/${apiKeys.length}`);
  return true;
};

// DEBUG: Affichage de la configuration initiale
console.log(`🔑 Gemini : ${apiKeys.length} clé(s) configurée(s). Clé active index : ${currentKeyIndex}`);

// Modèle Gemini exact observé dans ton dashboard Google AI Studio
const MODEL_NAME = "gemini-1.5-flash";

// Délai entre les requêtes pour éviter de saturer trop vite
const waitBeforeRequest = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_DELAY) {
    const waitTime = REQUEST_DELAY - timeSinceLastRequest;
    console.log(`⏳ Attente de ${waitTime}ms avant la requête...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
};

/**
 * Wrapper pour gérer automatiquement le basculement de clé en cas d'erreur de quota (429)
 */
async function withRetry<T>(fn: (genAI: GoogleGenerativeAI) => Promise<T>): Promise<T> {
  let attempts = 0;
  const maxAttempts = Math.min(3, apiKeys.length); // Maximum 3 tentatives

  while (attempts < maxAttempts) {
    try {
      await waitBeforeRequest();
      const genAI = getGenAI();
      return await fn(genAI);
    } catch (error: any) {
      const errorMsg = error.message || "";
      const isQuotaError = error.status === 429 || errorMsg.includes('429') || errorMsg.includes('quota');


      if (isQuotaError) {
        console.warn(`⚠️ Quota atteint pour la clé ${currentKeyIndex + 1}.`);
        addCooldown(currentKeyIndex);

        if (attempts < maxAttempts - 1 && apiKeys.length > 1) {
          const rotated = rotateKey();
          if (!rotated) {
            throw new Error('Toutes les clés API sont temporairement épuisées. Réessaye dans quelques minutes.');
          }
          attempts++;
          continue;
        }
      }

      // Toute autre erreur est lancée directement
      throw error;
    }
  }

  // Si toutes les tentatives échouent
  throw new Error("Désolé, toutes les clés API LEVELMAK ont atteint leur limite de requêtes. Réessaie dans quelques minutes !");
}

export const geminiService = {
  async generateMultimodalQuiz(sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], subject: string, difficulty: string = 'Intermédiaire', lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const prompt = `Tu es un expert en pédagogie d'élite (niveau GPT-4o). Ton rôle est de transformer un cours en une expérience d'apprentissage interactive de haute qualité.
      
      Sujet: ${subject}
      Difficulté: ${difficulty}
      Langue de réponse: ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}
      
      Règles strictes :
      1. Analyse l'ENSEMBLE des sources fournies (textes, images de cours, documents).
      2. Croise les informations pour ne rien oublier d'essentiel.
      3. Génère un JSON structuré en respectant la langue cible (${lang}).
      4. Le JSON doit contenir :
         - "title": Un titre accrocheur.
         - "summary": Un résumé pédagogique de 3-4 phrases.
         - "keyPoints": Une liste des 5-7 points clés essentiels.
         - "definitions": Une liste d'objets { term, definition } pour les mots techniques.
         - "questions": Une liste de 10 questions QCM avec :
            - "text": La question.
            - "options": 4 choix de réponse.
            - "correctAnswer": Index de la bonne réponse (0-3).
            - "explanation": Une explication pédagogique détaillée.

      Retourne UNIQUEMENT le JSON.`;

      const contentParts: any[] = [prompt];

      // Ajouter chaque source au contenu
      sources.forEach(source => {
        if (source.type === 'text') {
          contentParts.push(source.data);
        } else {
          const base64Data = source.data.includes(',') ? source.data.split(',')[1] : source.data;
          const mimeType = source.type === 'image' ? 'image/jpeg' : 'application/pdf';

          contentParts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            }
          });
        }
      });

      const result = await model.generateContent(contentParts);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      const data = JSON.parse(jsonString);

      if (data.questions) {
        data.questions = data.questions.map((q: any, idx: number) => ({
          ...q,
          id: `q_${Date.now()}_${idx}`
        }));
      }

      return data;
    });
  },

  /**
   * Génère un quiz à partir de contenu textuel (Legacy)
   */
  async generateQuiz(content: string, subject: string, difficulty: string = 'Intermédiaire', lang: string = 'fr') {
    return this.generateMultimodalQuiz([{ type: 'text', data: content }], subject, difficulty, lang);
  },

  async coachChat(message: string, history: { role: 'user' | 'bot'; text: string }[], userContext: string) {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: `Tu es un assistant pédagogique d'élite de niveau GPT-4o, expert en coaching scolaire et en transmission de savoir à haute précision.
        
        Ta mission : Répondre aux questions des élèves avec une précision chirurgicale, une clarté absolue et une profondeur de réflexion digne de ChatGPT.
        
        Capacités de Raisonnement Avancées :
        1. INFERENCE : Si une question est incomplète ou ambiguë, devine l'intention de l'élève en fournissant d'abord une réponse globale pertinente avant de demander plus de détails.
        2. PRÉCISION : Tes explications doivent être rigoureuses, vérifiées et structurées.
        3. MULTILINGUE : Réponds TOUJOURS dans la langue utilisée par l'utilisateur ou explicitement demandée dans le contexte.
        
        Règles de FORMATTAGE (Style ChatGPT) :
        1. Utilise IMMÉDIATEMENT le formatage Markdown.
        2. Point par point sur une NOUVELLE LIGNE.
        3. Listes à puces ou numérotées.
        4. Titres (## ou ###) clairs.
        5. Gras (**texte**) pour les termes clés.
        
        Règles d'or :
        1. Aucun mention de TMAB Group ou de créateurs.
        2. Ton encourageant et professionnel.
        3. Réponds à TOUTE question de savoir.`
      });

      const chatHistory = history
        .filter((msg, index) => !(index === 0 && msg.role === 'bot'))
        .map(msg => ({
          role: msg.role === 'bot' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }));

      const chat = model.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessage(message);
      return result.response.text();
    });
  },

  /**
   * OCR depuis une image (Legacy)
   */
  async performOCR(base64Image: string) {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

      const result = await model.generateContent([
        "Extrais tout le contenu textuel de ce document.",
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
      ]);
      return result.response.text();
    });
  },

  /**
   * Recherche de livres via Google Books API avec fallback Gemini
   */
  async searchBooks(query: string) {
    // Phase 1: Demander à l'IA intelligente de trouver ou recommander les meilleurs ouvrages
    // On utilise directement searchBooksWithGemini qui a été optimisé
    console.log(`🔍 Recherche intelligente pour : "${query}"`);
    return await this.searchBooksWithGemini(query);
  },

  async searchBooksWithGemini(query: string, lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Tu es une Intelligence Artificielle experte en bibliographie d'élite. 
      L'élève recherche : "${query}".
      Langue préférée: ${lang}
      
      Ta mission : Aider les étudiants à trouver les meilleurs ouvrages et ressources éducatives.
      Sources de confiance : Gallica (BnF), Anna’s Archive, LibGen, Z-Library, PDF Drive.
      
      RÈGLES CRITIQUES :
      1. NE JAMAIS inventer de liens "directLink".
      2. Si tu n'es pas SÛR, "directLink": "".
      3. Adapte ton message "text" et les descriptions à la langue cible (${lang}).
      
      Format JSON :
      {
        "text": "Message d'introduction.",
        "recommendations": [
          {
            "title": "Titre",
            "authors": "Auteur(s)",
            "description": "Description.",
            "directLink": "", 
            "source": "Source suggérée",
            "fallbacks": {
              "Gallica": "URL recherche",
              "AnnasArchive": "URL recherche",
              "LibGen": "URL recherche",
              "Google": "URL recherche"
            }
          }
        ]
      }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
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
          Gallica: `https://gallica.bnf.fr/services/engine/search/direct?query=${encodeURIComponent(rec.title + " " + rec.authors)}`,
          Annas: `https://annas-archive.org/search?q=${encodeURIComponent(rec.title + " " + rec.authors)}`,
          LibGen: `https://libgen.is/search.php?req=${encodeURIComponent(rec.title + " " + rec.authors)}`,
          Google: `https://www.google.fr/search?q=${encodeURIComponent(rec.title + " " + rec.authors + " pdf")}`
        }
      }));

      return {
        text: data.text || `Voici les ressources vérifiées pour : "${query}"`,
        links: books
      };
    });
  },

  async generateText(prompt: string) {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  },

  /**
   * Génère un plan d'étude multimodal
   */
  async generatePlanMultimodal(examDate: string, subjects: string[], sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Tu es une IA experte en organisation scolaire stratégique. 
      L'élève prépare ses examens pour le ${examDate} en : ${subjects.join(', ')}.
      Langue: ${lang}
      
      Instructions :
      1. Analyse les cours fournis (photos, textes).
      2. Génère un plan de révisions ultra-personnalisé en respectant la langue (${lang}).
      3. Structure le JSON précisément.

      JSON structure:
      {
        "title": "Nom du programme",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "extractedTopics": ["Sujet 1", "Sujet 2"],
        "tasks": [
          {
            "id": "task_ID",
            "title": "Titre",
            "subject": "Matière",
            "description": "Détails (basés sur le cours)",
            "duration": "Ex: 1h30",
            "priority": "high" | "medium" | "low",
            "date": "YYYY-MM-DD"
          }
        ]
      }`;

      const contentParts: any[] = [prompt];

      sources.forEach(s => {
        if (s.type === 'text') {
          contentParts.push(s.data);
        } else {
          const base64Data = s.data.includes(',') ? s.data.split(',')[1] : s.data;
          contentParts.push({
            inlineData: {
              data: base64Data,
              mimeType: s.type === 'image' ? "image/jpeg" : "application/pdf",
            }
          });
        }
      });

      const result = await model.generateContent(contentParts);
      const text = result.response.text();
      return JSON.parse(text);
    });
  },

  // Legacy fallback
  async generatePlanWithImages(examDate: string, subjects: string[], base64Images: string[]) {
    return this.generatePlanMultimodal(examDate, subjects, base64Images.map(img => ({ type: 'image', data: img })));
  },

  /**
   * Génère des flashcards à partir d'un sujet ou contenu
   */
  async generateFlashcards(content: string, subject: string, lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const prompt = `Tu es un expert en mémorisation (Anki-style). 
      Crée un set de 10-15 flashcards à partir de : "${content || subject}".
      Langue: ${lang}
      
      Règles :
      1. Front: Question courte.
      2. Back: Réponse concise.
      3. Utilise la langue cible (${lang}).
      
      Format JSON :
      { "cards": [ { "front": "...", "back": "..." } ] }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      const data = JSON.parse(jsonString);

      return data.cards.map((card: any, idx: number) => ({
        ...card,
        id: `fc_${Date.now()}_${idx}`,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0
      }));
    });
  },

  /**
   * Génère deux mots de vocabulaire complexes avec définition et exemple
   */
  async getDailyVocabulary(seenWords: string[] = [], lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const seenContext = seenWords.length > 0 ? `Évite ABSOLUMENT ces mots déjà vus récemment : ${seenWords.join(', ')}.` : '';

      const prompt = `Tu es un expert en linguistique d'élite. 
      Génère deux mots de vocabulaire sophistiqués pour enrichir le style d'un étudiant.
      Langue: ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}
      ${seenContext}
      
      Pour chaque mot, fournis en ${lang} :
      - "word": Le mot.
      - "explanation": Définition pédagogique.
      - "usage": Exemple littéraire.

      JSON :
      { "words": [ { "word": "...", "explanation": "...", "usage": "..." } ] }`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text());
      return data.words;
    });
  },

  /**
   * Génère une motivation/affirmation quotidienne unique et universelle
   */
  async getDailyMotivation(seenMotivations: string[] = [], lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { responseMimeType: "application/json" }
      });

      const seenContext = seenMotivations.length > 0 ? `Évite ABSOLUMENT ces thèmes ou citations déjà vus : ${seenMotivations.slice(-20).join(', ')}.` : '';

      const prompt = `Génère une puissante phrase de motivation universelle pour un étudiant.
      Langue: ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}
      ${seenContext}
      
      RÈGLES :
      1. S'adresser à TOUT étudiant (pas de noms).
      2. Inspirant, original, profond.
      3. Réponds en ${lang}.
      
      JSON :
      { "quote": "...", "author": "..." }`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    });
  },

  async summarizeBook(title: string, author: string, description: string, lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const prompt = `Analyse littéraire d'élite : ${title} (${author}).
      Langue: ${lang}
      
      Produis un résumé motivant et pédagogique en ${lang}.
      JSON :
      {
        "mainSummary": "Résumé (4-5 phrases).",
        "keyTakeaways": ["Point 1", "Point 2", "Point 3"],
        "difficulty": "Facile" | "Moyen" | "Avancé",
        "estimatedReadingTime": "Ex: 4h"
      }`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    });
  },

  async getDiceSurprise(lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Génère une surprise du Coach (Blague ou Anecdote éducative).
      Langue: ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}
      
      JSON :
      {
        "type": "joke" | "fact",
        "title": "Titre court",
        "content": "Texte en ${lang}",
        "author": "Coach IA"
      }`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    });
  },

  async generateOfflinePack(topic: string, level: string = 'Intermédiaire', lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Génère un "Pack de Survie" éducatif d'élite (Mode Hors Ligne).
      Sujet : ${topic}
      Langue: ${lang}
      
      Le JSON doit être complet en ${lang} :
      1. "title": Titre.
      2. "summary": Résumé structuré.
      3. "keyPoints": points clés.
      4. "definitions": {term, definition}.
      5. "faq": 10 Q/R.
      6. "quiz": Objet quiz standard.
      
      Réponds UNIQUEMENT le JSON.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonString);
    });
  },

  async summarizeMultimodal(sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], subject: string = 'Inconnu', lang: string = 'fr') {
    return withRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const prompt = `Synthèse pédagogique d'élite (multimodale).
      Sujet: ${subject}
      Langue: ${lang}
      
      JSON structuré en ${lang} :
         - "title": Titre.
         - "mainSummary": Synthèse (Markdown OK).
         - "keyPoints": [Points essentiels].
         - "definitions": [{ term, definition }].
         - "difficulty": "Facile" | "Intermédiaire" | "Avancé".
         - "estimatedReadingTime": Temps.`;

      const contentParts: any[] = [prompt];
      sources.forEach(source => {
        if (source.type === 'text') {
          contentParts.push(source.data);
        } else {
          const base64Data = source.data.includes(',') ? source.data.split(',')[1] : source.data;
          const mimeType = source.type === 'image' ? 'image/jpeg' : 'application/pdf';
          contentParts.push({
            inlineData: { data: base64Data, mimeType }
          });
        }
      });

      const result = await model.generateContent(contentParts);
      const text = result.response.text();
      // Nettoyage JSON plus robuste
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonString);
    });
  }
};
