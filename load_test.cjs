/**
 * ============================================================
 * LEVELMAK PRO — LOAD TEST v2 (Corrigé)
 * ============================================================
 * - UN seul client Supabase partagé (pool de connexions HTTP réutilisées)
 * - Sémaphore de concurrence réelle (pas plus de N requêtes en vol)
 * - Métriques précises : latence, débit, taux d'erreur
 *
 * USAGE:
 *   node load_test.cjs                      → 1 000 utilisateurs
 *   node load_test.cjs --users 10000        → 10 000 utilisateurs
 *   node load_test.cjs --users 100000       → 100 000 utilisateurs
 *   node load_test.cjs --users 5000 --concurrency 50
 * ============================================================
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Variables Supabase manquantes dans .env');
    process.exit(1);
}

const getArg = (name, def) => {
    const idx = process.argv.indexOf(`--${name}`);
    return idx !== -1 ? process.argv[idx + 1] : def;
};

const TARGET_USERS  = parseInt(getArg('users', '1000'));
const CONCURRENCY   = parseInt(getArg('concurrency', '30')); // max requêtes simultanées

// ──────────────────────────────────────────────
// CLIENT UNIQUE PARTAGÉ
// ──────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

// ──────────────────────────────────────────────
// TERMINAL COLORS
// ──────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bold: '\x1b[1m',
    cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
    red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m', gray: '\x1b[90m',
};
const log = (color, icon, msg) => console.log(`${color}${icon} ${msg}${C.reset}`);

// ──────────────────────────────────────────────
// MÉTRIQUES
// ──────────────────────────────────────────────
const metrics = {
    total: 0, success: 0, errors: 0,
    durations: [],
    byScenario: {},
    errorMessages: {},
    startTime: null,
};

function record(scenario, durationMs, error = null) {
    metrics.total++;
    metrics.durations.push(durationMs);
    if (!metrics.byScenario[scenario]) metrics.byScenario[scenario] = { ok: 0, err: 0, durations: [] };
    metrics.byScenario[scenario].durations.push(durationMs);

    if (error) {
        metrics.errors++;
        metrics.byScenario[scenario].err++;
        const key = String(error?.message || error?.code || 'Unknown').substring(0, 80);
        metrics.errorMessages[key] = (metrics.errorMessages[key] || 0) + 1;
    } else {
        metrics.success++;
        metrics.byScenario[scenario].ok++;
    }
}

const pct = (arr, p) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
};

// ──────────────────────────────────────────────
// SÉMAPHORE (limite la vraie concurrence)
// ──────────────────────────────────────────────
class Semaphore {
    constructor(n) { this.n = n; this.queue = []; }
    acquire() {
        return new Promise(res => {
            if (this.n > 0) { this.n--; res(); }
            else this.queue.push(res);
        });
    }
    release() {
        this.n++;
        if (this.queue.length) { this.n--; this.queue.shift()(); }
    }
}

// ──────────────────────────────────────────────
// IDs RÉELS
// ──────────────────────────────────────────────
let realIds = [];
async function loadRealIds() {
    const { data } = await supabase.from('profiles').select('id').limit(500);
    if (data && data.length > 0) {
        realIds = data.map(u => u.id);
        log(C.green, '✅', `${realIds.length} IDs réels chargés`);
    } else {
        log(C.yellow, '⚠️', 'Aucun ID réel — simulation avec UUIDs fictifs');
    }
}
const randId = () => realIds.length
    ? realIds[Math.floor(Math.random() * realIds.length)]
    : `00000000-0000-0000-0000-${String(Math.floor(Math.random() * 1e11)).padStart(12,'0')}`;

// ──────────────────────────────────────────────
// SCÉNARIOS DE TEST
// ──────────────────────────────────────────────
const SCENARIOS = [
    {
        name: '📖 Profil utilisateur',
        weight: 35,
        async run() {
            const { error } = await supabase
                .from('profiles')
                .select('id, name, xp, level, status, role, total_xp')
                .eq('id', randId())
                .maybeSingle();
            return error;
        }
    },
    {
        name: '🏆 Classement top 50',
        weight: 20,
        async run() {
            const { error } = await supabase
                .from('profiles')
                .select('id, name, total_xp, level, role')
                .order('total_xp', { ascending: false })
                .limit(50);
            return error;
        }
    },
    {
        name: '💬 Commentaires récents',
        weight: 15,
        async run() {
            const { error } = await supabase
                .from('user_comments')
                .select('id, user_name, content, rating, category, status')
                .order('timestamp', { ascending: false })
                .limit(20);
            return error;
        }
    },
    {
        name: '🎓 Enseignants vérifiés',
        weight: 15,
        async run() {
            const { error } = await supabase
                .from('teachers')
                .select('id, name, subjects, city, status, rating_avg')
                .eq('status', 'verified')
                .limit(30);
            return error;
        }
    },
    {
        name: '📊 Vue admin utilisateurs',
        weight: 10,
        async run() {
            const { error } = await supabase
                .from('profiles')
                .select('id, name, status, role, created_at, last_active')
                .order('created_at', { ascending: false })
                .limit(100);
            return error;
        }
    },
    {
        name: '🔍 Recherche par nom',
        weight: 5,
        async run() {
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            const letter = letters[Math.floor(Math.random() * letters.length)];
            const { error } = await supabase
                .from('profiles')
                .select('id, name, email')
                .ilike('name', `%${letter}%`)
                .limit(10);
            return error;
        }
    }
];

// Roue pondérée
const WHEEL = SCENARIOS.flatMap(s => Array(s.weight).fill(s));
const pick = () => WHEEL[Math.floor(Math.random() * WHEEL.length)];

// ──────────────────────────────────────────────
// SIMULATION D'UN UTILISATEUR VIRTUEL
// ──────────────────────────────────────────────
async function runUser(sem) {
    await sem.acquire();
    const scenario = pick();
    const t0 = Date.now();
    try {
        const err = await scenario.run();
        record(scenario.name, Date.now() - t0, err || null);
    } catch (e) {
        record(scenario.name, Date.now() - t0, e);
    } finally {
        sem.release();
    }
}

// ──────────────────────────────────────────────
// AFFICHAGE TEMPS RÉEL
// ──────────────────────────────────────────────
function printLive() {
    const elapsed = Date.now() - metrics.startTime;
    const done    = metrics.total;
    const pctDone = Math.round((done / TARGET_USERS) * 100);
    const bar     = '█'.repeat(Math.floor(pctDone / 5)) + '░'.repeat(20 - Math.floor(pctDone / 5));
    const rps     = elapsed > 0 ? Math.round(done / (elapsed / 1000)) : 0;
    const errPct  = done > 0 ? ((metrics.errors / done) * 100).toFixed(1) : '0.0';
    const color   = parseFloat(errPct) < 5 ? C.green : parseFloat(errPct) < 20 ? C.yellow : C.red;

    process.stdout.write(
        `\r${C.cyan}${bar}${C.reset} ${C.bold}${pctDone}%${C.reset}` +
        ` | ${C.green}✓ ${metrics.success}${C.reset}` +
        ` | ${color}✗ ${metrics.errors} (${errPct}%)${C.reset}` +
        ` | ${C.yellow}${rps} req/s${C.reset}` +
        ` | ⏱ ${Math.round(elapsed / 1000)}s   `
    );
}

// ──────────────────────────────────────────────
// RAPPORT FINAL
// ──────────────────────────────────────────────
function printReport() {
    const elapsed  = Date.now() - metrics.startTime;
    const d        = metrics.durations;
    const avg      = d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : 0;
    const rps      = Math.round(metrics.total / (elapsed / 1000));
    const errPct   = metrics.total > 0 ? ((metrics.errors / metrics.total) * 100).toFixed(2) : '0.00';
    const ep       = parseFloat(errPct);

    const verdict =
        ep < 1  ? `${C.green}🟢 EXCELLENT — Application stable en production${C.reset}` :
        ep < 5  ? `${C.yellow}🟡 BON — Légères optimisations recommandées${C.reset}` :
        ep < 15 ? `${C.yellow}🟠 MOYEN — Surveiller sous charge réelle${C.reset}` :
                  `${C.red}🔴 CRITIQUE — Risque de crash en production${C.reset}`;

    console.log('\n\n' + '═'.repeat(62));
    log(C.bold + C.cyan, '📊', 'RAPPORT FINAL — LEVELMAK PRO LOAD TEST v2');
    console.log('═'.repeat(62));
    log(C.blue,    '🎯', `Utilisateurs simulés  : ${C.bold}${metrics.total.toLocaleString()}`);
    log(C.green,   '✅', `Succès                : ${C.bold}${metrics.success.toLocaleString()}`);
    log(C.red,     '❌', `Échecs                : ${C.bold}${metrics.errors.toLocaleString()} (${errPct}%)`);
    log(C.yellow,  '⚡', `Débit réel            : ${C.bold}${rps} req/s`);
    log(C.gray,    '⏱️ ', `Durée totale          : ${C.bold}${(elapsed / 1000).toFixed(1)}s`);
    log(C.gray,    '🔄', `Concurrence max       : ${C.bold}${CONCURRENCY} requêtes en vol`);
    console.log('─'.repeat(62));
    log(C.magenta, '📈', `Latence moyenne       : ${C.bold}${avg}ms`);
    log(C.magenta, '📈', `P50 (médiane)         : ${C.bold}${pct(d, 50)}ms`);
    log(C.magenta, '📈', `P90                   : ${C.bold}${pct(d, 90)}ms`);
    log(C.magenta, '📈', `P99                   : ${C.bold}${pct(d, 99)}ms`);
    log(C.magenta, '📈', `MAX                   : ${C.bold}${Math.max(...d)}ms`);
    console.log('─'.repeat(62));

    // Par scénario
    log(C.bold, '📋', 'Résultats par scénario :');
    for (const [name, s] of Object.entries(metrics.byScenario)) {
        const total = s.ok + s.err;
        const rate  = total > 0 ? ((s.ok / total) * 100).toFixed(1) : '0';
        const avg   = s.durations.length ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length) : 0;
        const color = parseFloat(rate) >= 95 ? C.green : parseFloat(rate) >= 80 ? C.yellow : C.red;
        console.log(`  ${color}${name.padEnd(30)}${C.reset} | ✓${s.ok} ✗${s.err} | ${color}${rate}% OK${C.reset} | ~${avg}ms`);
    }
    console.log('─'.repeat(62));
    console.log(`  Verdict: ${verdict}`);

    if (Object.keys(metrics.errorMessages).length > 0) {
        console.log('─'.repeat(62));
        log(C.red, '🐛', 'Erreurs détectées :');
        for (const [msg, cnt] of Object.entries(metrics.errorMessages).sort((a, b) => b[1] - a[1])) {
            log(C.red, '  •', `[${cnt}×] ${msg}`);
        }
    }
    console.log('═'.repeat(62));
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
async function main() {
    console.clear();
    console.log(`\n${C.bold}${C.cyan}${'═'.repeat(62)}`);
    console.log(`  ⚡  LEVELMAK PRO — STRESS TEST v2  ⚡`);
    console.log(`${'═'.repeat(62)}${C.reset}\n`);

    await loadRealIds();

    log(C.bold + C.yellow, '🚀', `Lancement du test de charge`);
    log(C.gray, '   ', `→ Utilisateurs cibles : ${C.bold}${TARGET_USERS.toLocaleString()}`);
    log(C.gray, '   ', `→ Concurrence réelle  : ${C.bold}${CONCURRENCY} requêtes en vol max`);
    log(C.gray, '   ', `→ Scénarios actifs    : ${C.bold}${SCENARIOS.length}\n`);

    // Ticker d'affichage toutes les 500ms
    const ticker = setInterval(printLive, 500);

    metrics.startTime = Date.now();
    const sem = new Semaphore(CONCURRENCY);

    // Lance TOUTES les tâches utilisateurs en parallèle — le sémaphore contrôle la concurrence réelle
    const tasks = Array.from({ length: TARGET_USERS }, () => runUser(sem));
    await Promise.allSettled(tasks);

    clearInterval(ticker);
    printReport();
}

main().catch(err => {
    console.error('\n❌ Erreur fatale :', err.message);
    process.exit(1);
});
