// ============================================================
// CHEMISTRY LAB DATA — Scientifically Accurate
// ============================================================

export interface Reagent {
  id: string;
  name?: string;
  shortName?: string;
  formula: string;
  color: string; // CSS rgb
  opacity: number;
  type: 'acid' | 'base' | 'salt' | 'metal' | 'solid' | 'oxidant';
}

export interface ReactionResult {
  resultColor: string;
  resultOpacity: number;
  hasPrecipitate: boolean;
  precipitateColor?: string;
  precipitateLabel?: string;
  hasBubbles: boolean;
  bubbleLabel?: string; // e.g. 'CO₂', 'H₂', 'O₂'
  equation: string;
  fullEquation: string;
  observable?: string;
  explanation?: string;
  keyFacts: string[];
}

// ── Reagent Catalog ──────────────────────────────────────────
export const REAGENTS: Record<string, Reagent> = {
  HCl:      { id:'HCl',      formula:'HCl(aq)',       color:'210,235,255', opacity:0.15, type:'acid'    },
  H2SO4:    { id:'H2SO4',    formula:'H₂SO₄(aq)',    color:'230,240,255', opacity:0.15, type:'acid'    },
  HNO3c:    { id:'HNO3c',    formula:'HNO₃(conc)',    color:'255,250,200', opacity:0.25, type:'acid'    },
  H2C2O4:   { id:'H2C2O4',   formula:'H₂C₂O₄(aq)',   color:'255,252,200', opacity:0.15, type:'acid'    },
  NaHCO3:   { id:'NaHCO3',   formula:'NaHCO₃(aq)',   color:'220,235,255', opacity:0.18, type:'salt'    },
  NaOH:     { id:'NaOH',     formula:'NaOH(aq)',      color:'220,235,255', opacity:0.15, type:'base'    },
  NaOH_BBT: { id:'NaOH_BBT', formula:'NaOH+BBT',    color:'29,100,220',  opacity:0.8,  type:'base'    },
  KOH:      { id:'KOH',      formula:'KOH(aq)',      color:'220,235,255', opacity:0.15, type:'base'    },
  AgNO3:    { id:'AgNO3',    formula:'AgNO₃(aq)',    color:'240,245,255', opacity:0.2,  type:'salt'    },
  NaCl:     { id:'NaCl',     formula:'NaCl(aq)',     color:'220,235,255', opacity:0.15, type:'salt'    },
  BaCl2:    { id:'BaCl2',    formula:'BaCl₂(aq)',    color:'220,235,255', opacity:0.15, type:'salt'    },
  Na2SO4:   { id:'Na2SO4',   formula:'Na₂SO₄(aq)',   color:'220,235,255', opacity:0.15, type:'salt'    },
  FeCl3:    { id:'FeCl3',    formula:'FeCl₃(aq)',    color:'251,146,60',  opacity:0.55, type:'salt'    },
  KMnO4:    { id:'KMnO4',    formula:'KMnO₄(aq)',    color:'109,40,217',  opacity:0.9,  type:'oxidant' },
  CaCO3:    { id:'CaCO3',    formula:'CaCO₃(s)',     color:'240,242,245', opacity:0.7,  type:'solid'   },
  Zn:       { id:'Zn',       formula:'Zn(s)',        color:'190,200,205', opacity:0.55, type:'metal'   },
  Al:       { id:'Al',       formula:'Al(s)',        color:'200,210,220', opacity:0.5,  type:'metal'   },
  Cu:       { id:'Cu',       formula:'Cu(s)',        color:'184,115,51',  opacity:0.6,  type:'metal'   },
};

// ── Preset Reactions (10) ────────────────────────────────────
export interface PresetReaction {
  id: string;
  level: string;
  type: 'acid-base' | 'precipitation' | 'redox' | 'metal-acid' | 'metal-base' | 'decomposition';
  flask: Reagent;
  beaker: Reagent;
  result: ReactionResult;
}

const NO_REACTION: ReactionResult = {
  resultColor: '220,235,255', resultOpacity: 0.15,
  hasPrecipitate: false, hasBubbles: false,
  equation: 'Pas de réaction', fullEquation: 'Aucune réaction observable.',
  keyFacts: [],
};

export const PRESET_REACTIONS: PresetReaction[] = [
  {
    id: 'r1', level: 'Terminale / 1ère', type: 'acid-base',
    flask: REAGENTS.HCl, beaker: REAGENTS.NaOH_BBT,
    result: {
      resultColor:'22,163,74', resultOpacity:0.75, hasPrecipitate:false, hasBubbles:false,
      equation:'H⁺ + OH⁻ → H₂O',
      fullEquation:'H₃O⁺(aq) + OH⁻(aq) → 2H₂O(l)',
      keyFacts:[],
    }
  },
  {
    id: 'r2', level: 'Terminale / BTS', type: 'precipitation',
    flask: REAGENTS.AgNO3, beaker: REAGENTS.NaCl,
    result: {
      resultColor:'235,240,250', resultOpacity:0.45, hasPrecipitate:true,
      precipitateColor:'#F0F4FF', precipitateLabel:'AgCl(s) ↓',
      hasBubbles:false,
      equation:'Ag⁺ + Cl⁻ → AgCl(s) ↓',
      fullEquation:'Ag⁺(aq) + Cl⁻(aq) → AgCl(s) ↓',
      keyFacts:[],
    }
  },
  {
    id: 'r3', level: 'Terminale / MP', type: 'redox',
    flask: REAGENTS.H2C2O4, beaker: REAGENTS.KMnO4,
    result: {
      resultColor:'200,215,205', resultOpacity:0.3, hasPrecipitate:false, hasBubbles:true, bubbleLabel:'CO₂',
      equation:'2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ → 2Mn²⁺ + 10CO₂↑ + 8H₂O',
      fullEquation:'2MnO₄⁻(aq) + 5C₂O₄²⁻(aq) + 16H⁺(aq) → 2Mn²⁺(aq) + 10CO₂(g) + 8H₂O(l)',
      keyFacts:[],
    }
  },
  {
    id: 'r4', level: 'Terminale / BTS', type: 'metal-base',
    flask: REAGENTS.NaOH, beaker: REAGENTS.Al,
    result: {
      resultColor:'230,240,255', resultOpacity:0.25, hasPrecipitate:false, hasBubbles:true, bubbleLabel:'H₂',
      equation:'2Al + 2NaOH + 2H₂O → 2NaAlO₂ + 3H₂↑',
      fullEquation:'2Al(s) + 2NaOH(aq) + 2H₂O(l) → 2NaAlO₂(aq) + 3H₂(g)↑',
      keyFacts:[],
    }
  },
  {
    id: 'r5', level: '3ème / Seconde', type: 'metal-acid',
    flask: REAGENTS.HCl, beaker: REAGENTS.CaCO3,
    result: {
      resultColor:'230,243,255', resultOpacity:0.2, hasPrecipitate:false, hasBubbles:true, bubbleLabel:'CO₂',
      equation:'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑',
      fullEquation:'CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + H₂O(l) + CO₂(g)↑',
      keyFacts:[],
    }
  },
  {
    id: 'r6', level: 'Terminale', type: 'precipitation',
    flask: REAGENTS.NaOH, beaker: REAGENTS.FeCl3,
    result: {
      resultColor:'180,90,30', resultOpacity:0.7, hasPrecipitate:true,
      precipitateColor:'#B45309', precipitateLabel:'Fe(OH)₃(s) ↓',
      hasBubbles:false,
      equation:'Fe³⁺ + 3OH⁻ → Fe(OH)₃(s) ↓',
      fullEquation:'Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s) ↓',
      keyFacts:[],
    }
  },
  {
    id: 'r7', level: 'Terminale / BTS', type: 'precipitation',
    flask: REAGENTS.BaCl2, beaker: REAGENTS.Na2SO4,
    result: {
      resultColor:'235,240,245', resultOpacity:0.4, hasPrecipitate:true,
      precipitateColor:'#FFFFFF', precipitateLabel:'BaSO₄(s) ↓',
      hasBubbles:false,
      equation:'Ba²⁺ + SO₄²⁻ → BaSO₄(s) ↓',
      fullEquation:'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s) ↓',
      keyFacts:[],
    }
  },
  {
    id: 'r8', level: '3ème / Lycée', type: 'metal-acid',
    flask: REAGENTS.H2SO4, beaker: REAGENTS.Zn,
    result: {
      resultColor:'225,240,255', resultOpacity:0.2, hasPrecipitate:false, hasBubbles:true, bubbleLabel:'H₂',
      equation:'Zn + H₂SO₄ → ZnSO₄ + H₂↑',
      fullEquation:'Zn(s) + H₂SO₄(aq) → ZnSO₄(aq) + H₂(g)↑',
      keyFacts:[],
    }
  },
  {
    id: 'r9', level: 'Collège / Seconde', type: 'acid-base',
    flask: REAGENTS.HCl, beaker: REAGENTS.NaHCO3,
    result: {
      resultColor:'225,240,255', resultOpacity:0.2, hasPrecipitate:false, hasBubbles:true, bubbleLabel:'CO₂',
      equation:'NaHCO₃ + HCl → NaCl + H₂O + CO₂↑',
      fullEquation:'NaHCO₃(aq) + HCl(aq) → NaCl(aq) + H₂O(l) + CO₂(g)↑',
      keyFacts:[],
    }
  },
  {
    id: 'r10', level: 'Terminale / MP', type: 'redox',
    flask: REAGENTS.HNO3c, beaker: REAGENTS.Cu,
    result: {
      resultColor:'20,120,200', resultOpacity:0.7, hasPrecipitate:false, hasBubbles:true, bubbleLabel:'NO₂',
      equation:'Cu + 4HNO₃(conc) → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O',
      fullEquation:'Cu(s) + 4HNO₃(aq, conc) → Cu(NO₃)₂(aq) + 2NO₂(g)↑ + 2H₂O(l)',
      keyFacts:[],
    }
  },
];

// ── Custom Reaction Lookup ───────────────────────────────────
function makeKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

export const CUSTOM_REACTION_DB: Record<string, ReactionResult> = {
  [makeKey('HCl','NaOH_BBT')]:   PRESET_REACTIONS[0].result,
  [makeKey('HCl','NaOH')]:       { ...PRESET_REACTIONS[0].result, resultColor:'220,235,255', resultOpacity:0.2 },
  [makeKey('AgNO3','NaCl')]:     PRESET_REACTIONS[1].result,
  [makeKey('H2C2O4','KMnO4')]:   PRESET_REACTIONS[2].result,
  [makeKey('NaOH','Al')]:         PRESET_REACTIONS[3].result,
  [makeKey('HCl','CaCO3')]:      PRESET_REACTIONS[4].result,
  [makeKey('NaOH','FeCl3')]:     PRESET_REACTIONS[5].result,
  [makeKey('KOH','FeCl3')]:      { ...PRESET_REACTIONS[5].result },
  [makeKey('BaCl2','Na2SO4')]:   PRESET_REACTIONS[6].result,
  [makeKey('H2SO4','Zn')]:       PRESET_REACTIONS[7].result,
  [makeKey('HCl','Zn')]:         { ...PRESET_REACTIONS[7].result, equation:'Zn + 2HCl → ZnCl₂ + H₂↑', fullEquation:'Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g)↑' },
  [makeKey('HCl','NaHCO3')]:     PRESET_REACTIONS[8].result,
  [makeKey('H2SO4','NaHCO3')]:   { ...PRESET_REACTIONS[8].result, equation:'NaHCO₃ + H₂SO₄ → Na₂SO₄ + H₂O + CO₂↑' },
  [makeKey('HNO3c','Cu')]:       PRESET_REACTIONS[9].result,
  [makeKey('HCl','Al')]:         { ...PRESET_REACTIONS[3].result, equation:'2Al + 6HCl → 2AlCl₃ + 3H₂↑', fullEquation:'2Al(s) + 6HCl(aq) → 2AlCl₃(aq) + 3H₂(g)↑' },
  [makeKey('H2SO4','Al')]:       { ...PRESET_REACTIONS[3].result, equation:'2Al + 3H₂SO₄ → Al₂(SO₄)₃ + 3H₂↑' },
  [makeKey('AgNO3','HCl')]:      PRESET_REACTIONS[1].result,
  [makeKey('BaCl2','H2SO4')]:    { ...PRESET_REACTIONS[6].result, equation:'Ba²⁺ + SO₄²⁻ → BaSO₄↓' },
};

export function lookupCustomReaction(flaskId: string, beakerId: string): ReactionResult {
  const key = makeKey(flaskId, beakerId);
  return CUSTOM_REACTION_DB[key] ?? NO_REACTION;
}

// ── Valid pairs map ───
export const VALID_BEAKERS_FOR: Record<string, string[]> = {
  HCl:    ['NaOH_BBT', 'NaOH', 'CaCO3', 'Zn', 'Al', 'FeCl3', 'NaHCO3'],
  H2SO4:  ['NaOH_BBT', 'NaOH', 'Zn', 'Al', 'NaHCO3', 'Na2SO4'],
  HNO3c:  ['Cu', 'Zn', 'Al'],
  H2C2O4: ['KMnO4'],
  NaOH:   ['FeCl3', 'Al', 'NaHCO3', 'CaCO3'],
  KOH:    ['FeCl3', 'Al'],
  BaCl2:  ['Na2SO4', 'H2SO4'],
  AgNO3:  ['NaCl', 'HCl'],
};

export const FLASK_OPTIONS = Object.keys(VALID_BEAKERS_FOR);

// ── Suggested starter combos ───
export interface SuggestedPair {
  id: string;
  emoji: string;
  flaskId: string;
  beakerId: string;
}

export const SUGGESTED_PAIRS: SuggestedPair[] = [
  { id:'r1',  emoji:'🔵→🟢', flaskId:'HCl',    beakerId:'NaOH_BBT' },
  { id:'r2',  emoji:'⬜↓',   flaskId:'AgNO3',  beakerId:'NaCl' },
  { id:'r3',  emoji:'🟣→💧', flaskId:'H2C2O4', beakerId:'KMnO4' },
  { id:'r8',  emoji:'🫧H₂', flaskId:'H2SO4',  beakerId:'Zn' },
  { id:'r6',  emoji:'🟤↓',   flaskId:'NaOH',   beakerId:'FeCl3' },
  { id:'r5',  emoji:'🫧CO₂', flaskId:'HCl',    beakerId:'CaCO3' },
  { id:'r7',  emoji:'⬜↓',   flaskId:'BaCl2',  beakerId:'Na2SO4' },
  { id:'r10', emoji:'🔵Cu',  flaskId:'HNO3c',  beakerId:'Cu' },
  { id:'r4',  emoji:'🫧Al',  flaskId:'NaOH',   beakerId:'Al' },
  { id:'r9',  emoji:'🫧CO₂', flaskId:'HCl',    beakerId:'NaHCO3' },
];
