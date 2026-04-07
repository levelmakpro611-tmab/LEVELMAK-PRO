
export interface AtlasLesson {
  id: string;
  category: 'hydro' | 'relief' | 'climate' | 'resource';
  keyFacts: { label: string; value: string }[];
}

export const ATLAS_LESSONS: Record<string, AtlasLesson> = {
  // --- HYDROGRAPHIE : FLEUVES INTERNATIONAUX ---
  'river_niger': {
    id: 'river_niger',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Faranah (Massif du Fouta-Djalon)' },
      { label: 'length', value: '≈ 4 184 km' },
      { label: 'mouth', value: 'Océan Atlantique (Nigeria)' },
      { label: 'countries', value: 'Guinée, Mali, Niger, Bénin, Nigeria' }
    ]
  },
  'river_senegal': {
    id: 'river_senegal',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Fouta-Djalon (Moyenne-Guinée)' },
      { label: 'length', value: '≈ 1 790 km' },
      { label: 'mouth', value: 'Océan Atlantique (Sénégal)' },
      { label: 'countries', value: 'Guinée, Mali, Sénégal, Mauritanie' }
    ]
  },
  'river_gambia': {
    id: 'river_gambia',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Fouta-Djalon (Labé, Guinée)' },
      { label: 'length', value: '≈ 1 130 km' },
      { label: 'mouth', value: 'Océan Atlantique (Banjul)' },
      { label: 'countries', value: 'Guinée, Sénégal, Gambie' }
    ]
  },

  // --- HYDROGRAPHIE : FLEUVES NATIONAUX & CÔTIERS ---
  'river_konkoure': {
    id: 'river_konkoure',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Mamou (Fouta-Djalon)' },
      { label: 'length', value: '≈ 303 km' },
      { label: 'mouth', value: 'Baie de Sangaréya (Atlantique)' },
      { label: 'location', value: 'Basse et Moyenne Guinée' }
    ]
  },
  'river_fatala': {
    id: 'river_fatala',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Fouta-Djalon' },
      { label: 'length', value: '≈ 205 km' },
      { label: 'mouth', value: 'Boffa (Océan Atlantique)' },
      { label: 'location', value: 'Basse-Guinée' }
    ]
  },
  'river_kogon': {
    id: 'river_kogon',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Fouta-Djalon' },
      { label: 'length', value: '≈ 240 km' },
      { label: 'mouth', value: 'Océan Atlantique (Rio Nunez)' },
      { label: 'location', value: 'Basse-Guinée (Boké)' }
    ]
  },
  'river_kolente': {
    id: 'river_kolente',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Kindia / Forécariah' },
      { label: 'length', value: '≈ 258 km' },
      { label: 'mouth', value: 'Océan Atlantique' },
      { label: 'location', value: 'Guinée / Sierra Leone' }
    ]
  },
  'river_makona': {
    id: 'river_makona',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Monts Loma (Guinée Forestière)' },
      { label: 'length', value: '≈ 300 km' },
      { label: 'mouth', value: 'Océan Atlantique' },
      { label: 'location', value: 'Guinée / Sierra Leone / Libéria' }
    ]
  },
  'river_diani': {
    id: 'river_diani',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Macenta (Guinée Forestière)' },
      { label: 'length', value: '≈ 350 km' },
      { label: 'mouth', value: 'Océan Atlantique (via Libéria)' },
      { label: 'location', value: 'Guinée Forestière' }
    ]
  },
  'river_soumba': {
    id: 'river_soumba',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Mont Kakoulima' },
      { label: 'length', value: '≈ 50 km' },
      { label: 'mouth', value: 'Océan Atlantique (Dubréka)' },
      { label: 'location', value: 'Basse-Guinée' }
    ]
  },
  'river_dubreka': {
    id: 'river_dubreka',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Fouta-Djalon' },
      { label: 'length', value: '≈ 100 km' },
      { label: 'mouth', value: 'Baie de Sangaréya (Atlantique)' },
      { label: 'location', value: 'Basse-Guinée' }
    ]
  },
  'river_nunez': {
    id: 'river_nunez',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Fouta-Djalon' },
      { label: 'length', value: '≈ 300 km' },
      { label: 'mouth', value: 'Océan Atlantique (Boké)' },
      { label: 'location', value: 'Basse-Guinée' }
    ]
  },
  'river_pongo': {
    id: 'river_pongo',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Fouta-Djalon' },
      { label: 'length', value: '≈ 200 km' },
      { label: 'mouth', value: 'Boffa (Océan Atlantique)' },
      { label: 'location', value: 'Basse-Guinée' }
    ]
  },
  'river_milo': {
    id: 'river_milo',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Beyla (Guinée Forestière)' },
      { label: 'length', value: '430 km' },
      { label: 'mouth', value: 'Fleuve Niger (Kouroussa)' },
      { label: 'location', value: 'Haute-Guinée' }
    ]
  },
  'river_tinkisso': {
    id: 'river_tinkisso',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Dabola (Fouta-Djalon)' },
      { label: 'length', value: '400 km' },
      { label: 'mouth', value: 'Fleuve Niger (Siguiri)' },
      { label: 'location', value: 'Haute-Guinée' }
    ]
  },
  'river_bafing': {
    id: 'river_bafing',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Timbo (Fouta-Djalon)' },
      { label: 'length', value: '≈ 500 km' },
      { label: 'mouth', value: 'Fleuve Sénégal' },
      { label: 'location', value: 'Moyenne-Guinée' }
    ]
  },
  'river_niandan': {
    id: 'river_niandan',
    category: 'hydro',
    keyFacts: [
      { label: 'source', value: 'Massif de Kourandou (Kissidougou)' },
      { label: 'length', value: '≈ 190 km' },
      { label: 'mouth', value: 'Fleuve Niger (Kouroussa)' },
      { label: 'location', value: 'Haute-Guinée' }
    ]
  },

  // --- RELIEF : MASSIFS ---
  'relief_fouta': {
    id: 'relief_fouta',
    category: 'relief',
    keyFacts: [
      { label: 'maxAltitude', value: '1 538 m (Mont Loura)' },
      { label: 'nickname', value: 'Château d\'eau de l\'Afrique' },
      { label: 'location', value: 'Moyenne-Guinée' }
    ]
  },
  'relief_nimba_massif': {
    id: 'relief_nimba_massif',
    category: 'relief',
    keyFacts: [
      { label: 'maxAltitude', value: '1 752 m (Mont Richard-Molard)' },
      { label: 'status', value: 'Patrimoine UNESCO' },
      { label: 'location', value: 'Guinée Forestière / Côte d\'Ivoire' }
    ]
  },
  'relief_simandou': {
    id: 'relief_simandou',
    category: 'relief',
    keyFacts: [
      { label: 'maxAltitude', value: '1 656 m (Pic de Fon)' },
      { label: 'resourceType', value: 'Minerai de Fer' },
      { label: 'location', value: 'Guinée Forestière' }
    ]
  },

  // --- RELIEF : SOMMETS ---
  'relief_nimba': {
    id: 'relief_nimba',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '1 752 m' },
      { label: 'massif', value: 'Monts Nimba' },
      { label: 'location', value: 'Guinée Forestière (Lola)' }
    ]
  },
  'relief_pic_fon': {
    id: 'relief_pic_fon',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '1 656 m' },
      { label: 'massif', value: 'Chaîne de Simandou' },
      { label: 'location', value: 'Guinée Forestière (Beyla)' }
    ]
  },
  'relief_loura': {
    id: 'relief_loura',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '1 538 m' },
      { label: 'massif', value: 'Tamgué (Fouta-Djalon)' },
      { label: 'location', value: 'Moyenne-Guinée (Mali)' }
    ]
  },
  'relief_tinka': {
    id: 'relief_tinka',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '1 425 m' },
      { label: 'massif', value: 'Fouta-Djalon' },
      { label: 'location', value: 'Moyenne-Guinée (Dalaba)' }
    ]
  },
  'relief_richard_molard': {
    id: 'relief_richard_molard',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '1 752 m' },
      { label: 'massif', value: 'Monts Nimba' },
      { label: 'location', value: 'Guinée Forestière' }
    ]
  },
  'relief_gangan': {
    id: 'relief_gangan',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '1 115 m' },
      { label: 'massif', value: 'Fouta-Djalon' },
      { label: 'location', value: 'Basse-Guinée (Kindia)' }
    ]
  },
  'relief_kakoulima': {
    id: 'relief_kakoulima',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '1 007 m' },
      { label: 'massif', value: 'Chaîne Côtière' },
      { label: 'location', value: 'Basse-Guinée (Coyah / Dubréka)' }
    ]
  },
  'relief_bero': {
    id: 'relief_bero',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '≈ 1 115 m' },
      { label: 'massif', value: 'Mont Béro' },
      { label: 'location', value: 'Guinée Forestière' }
    ]
  },
  'relief_loma': {
    id: 'relief_loma',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '≈ 1 945 m (en Sierra Leone)' },
      { label: 'massif', value: 'Monts Loma' },
      { label: 'location', value: 'Haute-Guinée / Sierra Leone' }
    ]
  },
  'relief_kourandou': {
    id: 'relief_kourandou',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '≈ 700 - 800 m' },
      { label: 'massif', value: 'Massif de Kourandou' },
      { label: 'location', value: 'Haute-Guinée' }
    ]
  },
  'relief_empereur': {
    id: 'relief_empereur',
    category: 'relief',
    keyFacts: [
      { label: 'altitude', value: '≈ 1 500 m' },
      { label: 'massif', value: 'Chaîne de Simandou' },
      { label: 'location', value: 'Guinée Forestière' }
    ]
  },

  // --- RÉGIONS CLIMATIQUES ---
  'climat_maritime': {
    id: 'climat_maritime',
    category: 'climate',
    keyFacts: [
      { label: 'rainfall', value: '3 000 – 4 500 mm/an' },
      { label: 'capital', value: 'Conakry' },
      { label: 'vegetation', value: 'Mangroves et forêts' }
    ]
  },
  'climat_moyenne': {
    id: 'climat_moyenne',
    category: 'climate',
    keyFacts: [
      { label: 'rainfall', value: '1 500 – 2 000 mm/an' },
      { label: 'temperatures', value: 'Fraîches (15-25°C)' },
      { label: 'mainCity', value: 'Labé' }
    ]
  },
  'climat_haute': {
    id: 'climat_haute',
    category: 'climate',
    keyFacts: [
      { label: 'rainfall', value: '1 000 – 1 500 mm/an' },
      { label: 'temperatures', value: 'Très chaudes' },
      { label: 'mainCity', value: 'Kankan' }
    ]
  },
  'climat_forestiere': {
    id: 'climat_forestiere',
    category: 'climate',
    keyFacts: [
      { label: 'rainfall', value: '2 000 – 3 000 mm/an' },
      { label: 'vegetation', value: 'Forêt Tropicale Dense' },
      { label: 'mainCity', value: 'N’Zérékoré' }
    ]
  },

  // --- RESSOURCES MINIÈRES ---
  'res_bauxite_sangaredi': {
    id: 'res_bauxite_sangaredi',
    category: 'resource',
    keyFacts: [
      { label: 'resourceType', value: 'Bauxite de haute teneur' },
      { label: 'location', value: 'Basse-Guinée (Boké)' }
    ]
  },
  'res_gold_siguiri': {
    id: 'res_gold_siguiri',
    category: 'resource',
    keyFacts: [
      { label: 'resourceType', value: 'Or Alluvionnaire et Filonien' },
      { label: 'location', value: 'Haute-Guinée (Siguiri)' }
    ]
  },
  'res_fer_simandou': {
    id: 'res_fer_simandou',
    category: 'resource',
    keyFacts: [
      { label: 'resourceType', value: 'Minerai de Fer de haute teneur' },
      { label: 'location', value: 'Guinée Forestière' }
    ]
  }
};
