export interface GeoFeature {
  id: string;
  name?: string;
  type: 'river' | 'resource' | 'relief' | 'climate';
  coords: [number, number] | [number, number][]; // Point [Lat, Lng] ou Chemin [[Lat, Lng], ...]
  country: string;
  info?: string;
  // Détails additionnels pour l'éducation
  details?: {
    altitude?: string;   // Pour les montagnes
    length?: string;     // Pour les fleuves
    source?: string;     // Pour les fleuves
    mouth?: string;      // Pour les fleuves
    rainfall?: string;   // Pour le climat
    mainResource?: string; // Pour les mines
    massif?: string;     // Pour le relief
    region?: string;     // Région administrative/naturelle
  }
}

export const ATLAS_DATA: GeoFeature[] = [
  // --- FLEUVES (HYDROGRAPHIE) ---
  { 
    id: 'river_niger', 
    type: 'river', 
    coords: [[9.0833, -10.6167], [9.32, -10.74], [10.65, -9.5], [11.5, -8.4]], 
    country: 'Guinée / Afrique de l\'Ouest', 
    details: { length: '4 184 km', source: 'Fouta-Djallon (Kobikoro, Faranah)', mouth: 'Delta du Niger (Nigeria/Océan Atlantique)', region: 'Haute-Guinée' }
  },
  { 
    id: 'river_senegal', 
    type: 'river', 
    coords: [[10.7, -12.2], [11.5, -12.5], [12.2, -13.1], [13.4, -13.8]], 
    country: 'Guinée / Sénégal', 
    details: { length: '1 790 km', source: 'Massif du Fouta-Djallon (Mali/Moyenne-Guinée)', mouth: 'Saint-Louis (Océan Atlantique)', region: 'Moyenne-Guinée' }
  },
  { 
    id: 'river_gambia', 
    type: 'river', 
    coords: [[11.3, -12.3], [12.1, -13.2], [13.4, -14.5]], 
    country: 'Guinée / Gambie / Sénégal', 
    details: { length: '1 130 km', source: 'Fouta-Djallon (Labé)', mouth: 'Banjul (Océan Atlantique)', region: 'Moyenne-Guinée' }
  },
  { 
    id: 'river_konkoure', 
    type: 'river', 
    coords: [[10.45, -12.6], [10.2, -13.15], [9.8, -13.52]], 
    country: 'Guinée', 
    details: { length: '303 km', source: 'Massif du Fouta-Djallon (Mamou)', mouth: 'Baie de Sangaréya (Océan Atlantique)', region: 'Basse-Guinée / Moyenne-Guinée' }
  },
  { 
    id: 'river_milo', 
    type: 'river', 
    coords: [[8.8, -8.7], [9.5, -9.0], [10.2, -9.3], [10.6, -9.4]], 
    country: 'Guinée', 
    details: { length: '430 km', source: 'Beyla (Guinée Forestière)', mouth: 'Se jette dans le Niger (Kouroussa)', region: 'Haute-Guinée' }
  },
  { 
    id: 'river_fatala', 
    type: 'river', 
    coords: [[10.5, -13.8], [10.2, -14.0]], 
    country: 'Guinée', 
    details: { region: 'Basse-Guinée (Boffa)' }
  },
  { 
    id: 'river_kogon', 
    type: 'river', 
    coords: [[11.4, -14.3], [11.0, -14.7]], 
    country: 'Guinée', 
    details: { region: 'Basse-Guinée (Boké)' }
  },
  { 
    id: 'river_kolente', 
    type: 'river', 
    coords: [[10.0, -12.8], [9.5, -13.0], [9.0, -13.3]], 
    country: 'Guinée / Sierra Leone', 
    details: { source: 'Kindia', region: 'Basse-Guinée' }
  },
  { 
    id: 'river_niandan', 
    type: 'river', 
    coords: [[9.0, -9.8], [9.5, -10.0], [10.1, -10.2]], 
    country: 'Guinée', 
    details: { region: 'Haute-Guinée' }
  },
  { 
    id: 'river_tinkisso', 
    type: 'river', 
    coords: [[11.5, -11.0], [11.2, -10.5], [10.8, -9.8]], 
    country: 'Guinée', 
    details: { length: '400 km', region: 'Haute-Guinée' }
  },
  { 
    id: 'river_diani', 
    type: 'river', 
    coords: [[8.5, -9.2], [8.0, -9.1], [7.6, -9.0]], 
    country: 'Guinée / Libéria', 
    details: { region: 'Guinée Forestière' }
  },
  { 
    id: 'river_soumba', 
    type: 'river', 
    coords: [[9.9, -13.5], [9.8, -13.7]], 
    country: 'Guinée', 
    details: { region: 'Basse-Guinée (Dubréka)' }
  },
  { 
    id: 'river_dubreka', 
    type: 'river', 
    coords: [[10.1, -13.3], [9.8, -13.5]], 
    country: 'Guinée', 
    details: { region: 'Basse-Guinée' }
  },
  { 
    id: 'river_pongo', 
    type: 'river', 
    coords: [[10.2, -13.9], [10.0, -14.1]], 
    country: 'Guinée', 
    details: { region: 'Basse-Guinée (Boffa)' }
  },
  { 
    id: 'river_makona', 
    type: 'river', 
    coords: [[8.5, -10.2], [8.2, -10.5]], 
    country: 'Guinée / Sierra Leone', 
    details: { region: 'Guinée Forestière' }
  },
  { 
    id: 'river_nunez', 
    type: 'river', 
    coords: [[11.0, -14.5], [10.6, -14.8]], 
    country: 'Guinée', 
    details: { region: 'Basse-Guinée' }
  },

  // --- MONTAGNES (RELIEF) ---
  { 
    id: 'relief_nimba', 
    type: 'relief', 
    coords: [7.5667, -8.4167], 
    country: 'Guinée / Côte d\'Ivoire', 
    details: { altitude: '1 752 m', massif: 'Dorsale Guinéenne', region: 'Guinée Forestière (Lola)' }
  },
  { 
    id: 'relief_richard_molard', 
    type: 'relief', 
    coords: [7.6225, -8.4056], 
    country: 'Guinée', 
    details: { altitude: '1 752 m', massif: 'Monts Nimba', region: 'Guinée Forestière' }
  },
  { 
    id: 'relief_pic_fon', 
    type: 'relief', 
    coords: [8.52, -8.92], 
    country: 'Guinée', 
    details: { altitude: '1 656 m', massif: 'Chaîne de Simandou', region: 'Guinée Forestière' }
  },
  { 
    id: 'relief_fouta', 
    type: 'relief', 
    coords: [11.0, -12.5], 
    country: 'Guinée', 
    details: { region: 'Moyenne-Guinée' }
  },
  { 
    id: 'relief_simandou', 
    type: 'relief', 
    coords: [8.8, -8.8], 
    country: 'Guinée', 
    details: { region: 'Guinée Forestière' }
  },
  { 
    id: 'relief_ziama', 
    type: 'relief', 
    coords: [8.2, -9.2], 
    country: 'Guinée', 
    details: { region: 'Guinée Forestière' }
  },
  { 
    id: 'relief_loura', 
    type: 'relief', 
    coords: [12.33, -12.3], 
    country: 'Guinée', 
    details: { altitude: '1 538 m', massif: 'Massif du Tamgué', region: 'Moyenne-Guinée (Mali)' }
  },
  { 
    id: 'relief_tinka', 
    type: 'relief', 
    coords: [10.7, -12.25], 
    country: 'Guinée', 
    details: { altitude: '1 425 m', massif: 'Fouta-Djalon', region: 'Moyenne-Guinée (Dalaba)' }
  },
  { 
    id: 'relief_kakoulima', 
    type: 'relief', 
    coords: [9.7, -13.4], 
    country: 'Guinée', 
    details: { altitude: '1 007 m', massif: 'Basse-Guinée', region: 'Coyah / Dubréka' }
  },
  { 
    id: 'relief_gangan', 
    type: 'relief', 
    coords: [10.05, -12.85], 
    country: 'Guinée', 
    details: { altitude: '1 115 m', massif: 'Fouta-Djalon (Sud)', region: 'Kindia' }
  },
  { 
    id: 'relief_bero', 
    type: 'relief', 
    coords: [8.25, -8.9], 
    country: 'Guinée', 
    details: { region: 'Guinée Forestière' }
  },
  { 
    id: 'relief_loma', 
    type: 'relief', 
    coords: [9.2, -11.1], 
    country: 'Guinée / Sierra Leone', 
    details: { region: 'Haute-Guinée' }
  },
  { 
    id: 'relief_kourandou', 
    type: 'relief', 
    coords: [9.3, -9.2], 
    country: 'Guinée', 
    details: { region: 'Haute-Guinée' }
  },
  { 
    id: 'relief_empereur', 
    type: 'relief', 
    coords: [8.9, -8.9], 
    country: 'Guinée', 
    details: { region: 'Guinée Forestière' }
  },

  // --- RESSOURCES MINIÈRES ---
  { 
    id: 'res_bauxite_sangaredi', 
    type: 'resource', 
    coords: [11.08, -13.91], 
    country: 'Guinée', 
    details: { mainResource: 'Bauxite (Aluminium)', region: 'Basse-Guinée (Boké)' }
  },
  { 
    id: 'res_gold_siguiri', 
    type: 'resource', 
    coords: [11.41, -9.16], 
    country: 'Guinée', 
    details: { mainResource: 'Or', region: 'Haute-Guinée (Bassin du Milo)' }
  },
  { 
    id: 'res_fer_simandou', 
    type: 'resource', 
    coords: [8.6, -8.7], 
    country: 'Guinée', 
    details: { mainResource: 'Fer', region: 'Guinée Forestière' }
  },

  // --- CLIMATS (RÉGIONS NATURELLES) ---
  { 
    id: 'climat_maritime', 
    type: 'climate', 
    coords: [10.5, -14.2], 
    country: 'Guinée (Ouest)', 
    details: { rainfall: '3 000 à 4 500 mm / an', region: 'Côtière' }
  },
  { 
    id: 'climat_moyenne', 
    type: 'climate', 
    coords: [11.2, -12.3], 
    country: 'Guinée (Centre)', 
    details: { rainfall: '1 500 à 2 000 mm / an', region: 'Montagneuse' }
  },
  { 
    id: 'climat_haute', 
    type: 'climate', 
    coords: [11.0, -9.5], 
    country: 'Guinée (Est)', 
    details: { rainfall: '1 000 à 1 500 mm / an', region: 'Plateaux' }
  },
  { 
    id: 'climat_forestiere', 
    type: 'climate', 
    coords: [8.5, -9.0], 
    country: 'Guinée (Sud-Est)', 
    details: { rainfall: '2 000 à 3 000 mm / an', region: 'Montagneuse du Sud' }
  }
];
