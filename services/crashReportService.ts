/**
 * ============================================================
 * CRASH REPORT SERVICE — LEVELMAK PRO
 * ============================================================
 * Capture automatiquement tous les crashs et erreurs,
 * et envoie un rapport détaillé par email via EmailJS.
 *
 * SETUP EMAILJS (gratuit) :
 * 1. Créer un compte sur https://www.emailjs.com
 * 2. Ajouter un Service Email (Gmail → levelmak611@gmail.com)
 * 3. Créer un Template avec les variables : {{to_email}}, {{subject}}, {{body}}
 * 4. Copier Service ID, Template ID, Public Key dans le .env
 * ============================================================
 */

import { supabase } from './supabase';

// ──────────────────────────────────────────────
// CONFIG EMAILJS (variables dans .env)
// ──────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || '';
const ADMIN_EMAIL         = 'levelmakpro611@gmail.com';

// Cooldown : ne pas spammer plus de 1 email par erreur identique toutes les 5 min
const sentErrorCache = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// ──────────────────────────────────────────────
// TYPE
// ──────────────────────────────────────────────
interface CrashReport {
  type: 'crash' | 'error' | 'unhandled_rejection' | 'network' | 'react';
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  appVersion: string;
  context?: string;
}

// ──────────────────────────────────────────────
// ENVOI EMAIL VIA EMAILJS
// ──────────────────────────────────────────────
async function sendCrashEmail(report: CrashReport): Promise<void> {
  // Vérifie que EmailJS est configuré et sans placeholder
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY.includes('YOUR_PUBLIC_KEY')) {
    return;
  }

  // Cooldown : éviter les doublons
  const cacheKey = `${report.type}:${report.message.substring(0, 80)}`;
  const lastSent = sentErrorCache.get(cacheKey);
  if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
    console.log('[CrashReport] Cooldown actif — email ignoré');
    return;
  }
  sentErrorCache.set(cacheKey, Date.now());

  const emoji = report.type === 'crash' || report.type === 'react' ? '🔴' :
                report.type === 'network' ? '🟠' : '🟡';

  const subject = `${emoji} [LEVELMAK] Crash détecté — ${report.type.toUpperCase()}`;

  const body = `
╔══════════════════════════════════════════════╗
  🚨 RAPPORT DE CRASH — LEVELMAK PRO
╚══════════════════════════════════════════════╝

📅 Date/Heure   : ${report.timestamp}
🏷️  Type         : ${report.type.toUpperCase()}
📱 Appareil     : ${report.userAgent}
🌐 URL          : ${report.url}
📦 Version App  : ${report.appVersion}

👤 Utilisateur  : ${report.userName || 'Non connecté'} (${report.userId || 'N/A'})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💥 ERREUR :
${report.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STACK TRACE :
${report.stack || 'Aucune stack trace disponible'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 CONTEXTE :
${report.context || 'Aucun contexte supplémentaire'}

══════════════════════════════════════════════
Ce message est envoyé automatiquement par Levelmak.
`.trim();

  try {
    // EmailJS REST API (sans npm package, fonctionne partout)
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id:     EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: ADMIN_EMAIL,
          subject,
          body,
          report_type: report.type,
          error_message: report.message,
          user_info: `${report.userName || 'Non connecté'} (${report.userId || 'N/A'})`,
          timestamp: report.timestamp,
          url: report.url,
        }
      })
    });

    if (response.ok) {
      console.log('[CrashReport] ✅ Email envoyé à', ADMIN_EMAIL);
    } else {
      console.error('[CrashReport] ❌ Échec envoi email:', response.status, await response.text());
    }
  } catch (e) {
    console.error('[CrashReport] Erreur réseau EmailJS:', e);
  }
}

// ──────────────────────────────────────────────
// SAUVEGARDE EN BASE (backup)
// ──────────────────────────────────────────────
async function saveCrashToDb(report: CrashReport): Promise<void> {
  try {
    await supabase.from('user_comments').insert({
      user_id:    report.userId    || '00000000-0000-0000-0000-000000000000',
      user_name:  report.userName  || 'Système',
      user_phone: 'crash-reporter',
      content: `[CRASH ${report.type.toUpperCase()}]\n${report.message}\n\nStack: ${(report.stack || '').substring(0, 800)}`,
      rating: 0,
      category: 'support',
      status: 'pending',
      timestamp: report.timestamp,
    });
  } catch (e) {
    // Silencieux — ne pas créer une boucle d'erreurs
    console.warn('[CrashReport] DB backup échoué:', e);
  }
}

// ──────────────────────────────────────────────
// FONCTION PRINCIPALE : Traiter une erreur
// ──────────────────────────────────────────────
async function handleError(
  type: CrashReport['type'],
  message: string,
  stack?: string,
  context?: string
): Promise<void> {
  // Ignorer les erreurs non critiques et le bruit
  const IGNORED_PATTERNS = [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'Loading chunk',
    'ChunkLoadError',
    'Network request failed',
    'Failed to fetch',
    'cancelled',
    'AbortError',
    'The user aborted',
  ];

  if (IGNORED_PATTERNS.some(p => message.includes(p))) {
    return;
  }

  // Récupérer le contexte utilisateur depuis localStorage
  let userId: string | undefined;
  let userName: string | undefined;
  try {
    const storedUser = localStorage.getItem('levelmak_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      userId   = user?.id;
      userName = user?.name;
    }
  } catch (_) {}

  const report: CrashReport = {
    type,
    message,
    stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    userId,
    userName,
    timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Conakry' }),
    appVersion: '0.1.9.4',
    context,
  };

  console.error(`[CrashReport] ${type.toUpperCase()}:`, message);

  // Envoyer en parallèle (email + DB backup)
  await Promise.allSettled([
    sendCrashEmail(report),
    saveCrashToDb(report),
  ]);
}

// ──────────────────────────────────────────────
// INITIALISATION DES LISTENERS GLOBAUX
// ──────────────────────────────────────────────
export function initCrashReporter(): void {
  if (typeof window === 'undefined') return;

  // 1. Erreurs JavaScript globales
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    handleError(
      'crash',
      String(message),
      error?.stack,
      `Source: ${source} | Ligne: ${lineno}:${colno}`
    );
    // Appeler l'ancien handler s'il existait
    if (typeof originalOnError === 'function') {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // 2. Promesses non gérées (async/await errors)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason) || 'Unhandled Promise Rejection';
    const stack   = reason?.stack;
    handleError('unhandled_rejection', message, stack, 'Promise rejetée sans handler catch');
  });

  // 3. Erreurs réseau critiques (fetch override)
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      // Signaler les erreurs 5xx (erreurs serveur)
      if (response.status >= 500) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        handleError(
          'network',
          `Erreur serveur HTTP ${response.status}`,
          undefined,
          `URL: ${url}`
        );
      }
      return response;
    } catch (error: any) {
      // Ne pas signaler les erreurs réseau normales (offline, etc.)
      // Seulement les vraies erreurs inattendues
      const url = typeof args[0] === 'string' ? args[0] : '';
      if (url.includes('supabase') && !error.message?.includes('Failed to fetch')) {
        handleError('network', error.message || 'Fetch Error', error.stack, `URL: ${url}`);
      }
      throw error;
    }
  };

  console.log('[CrashReport] ✅ Système de surveillance des crashs actif');
}

// ──────────────────────────────────────────────
// EXPORT : Rapport manuel (pour React ErrorBoundary)
// ──────────────────────────────────────────────
export function reportReactCrash(error: Error, componentStack: string): void {
  handleError(
    'react',
    error.message,
    error.stack,
    `Component Stack:\n${componentStack}`
  );
}

// ──────────────────────────────────────────────
// EXPORT : Rapport manuel d'erreur depuis n'importe où
// ──────────────────────────────────────────────
export function reportError(message: string, context?: string): void {
  handleError('error', message, new Error().stack, context);
}
