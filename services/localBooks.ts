// Service pour charger les livres locaux depuis le dossier /livre

export interface LocalBook {
    id: string;
    title: string;
    fileName: string;
    filePath: string;
    sizeBytes: number;
    category: string;
}

// Liste statique des livres dans le dossier /livre
// Cette liste doit être mise à jour manuellement si de nouveaux livres sont ajoutés
export const LOCAL_BOOKS: LocalBook[] = [
    {
        id: 'local_1',
        title: "L'égo est l'ennemi",
        fileName: "L'égo est l'ennemi.pdf",
        filePath: "/livre/L'égo est l'ennemi.pdf",
        sizeBytes: 1082702,
        category: 'Développement Personnel'
    },
    {
        id: 'local_2',
        title: '45 Secondes Qui Changeront Votre Vie',
        fileName: 'Ouvrir 45 SECONDES QUI CHANGERONT VOTRE VIE .pdf',
        filePath: '/livre/Ouvrir 45 SECONDES QUI CHANGERONT VOTRE VIE .pdf',
        sizeBytes: 5956302,
        category: 'Développement Personnel'
    },
    {
        id: 'local_3',
        title: 'Le Dôme Océanique',
        fileName: 'Le Dome Oceanique_1.pdf',
        filePath: '/livre/Le Dome Oceanique_1.pdf',
        sizeBytes: 634329,
        category: 'Science-Fiction'
    },
    {
        id: 'local_4',
        title: 'Le Savoir-Être',
        fileName: 'le savoir etre .pdf',
        filePath: '/livre/le savoir etre .pdf',
        sizeBytes: 7492740,
        category: 'Formation'
    },
    {
        id: 'local_5',
        title: 'La Logistique des Entreprises',
        fileName: 'la logistique des entreprise.pdf',
        filePath: '/livre/la logistique des entreprise.pdf',
        sizeBytes: 14274974,
        category: 'Business'
    },
    {
        id: 'local_6',
        title: 'Mobilité Interne',
        fileName: 'mobiliter interne.pdf',
        filePath: '/livre/mobiliter interne.pdf',
        sizeBytes: 1250046,
        category: 'RH'
    },
    {
        id: 'local_7',
        title: 'Pierre',
        fileName: 'pierre .pdf',
        filePath: '/livre/pierre .pdf',
        sizeBytes: 3702161,
        category: 'Roman'
    },
    {
        id: 'local_8',
        title: 'F020094',
        fileName: 'F020094.pdf',
        filePath: '/livre/F020094.pdf',
        sizeBytes: 1354799,
        category: 'Divers'
    }
];

/**
 * Récupère tous les livres locaux
 */
export function getLocalBooks(): LocalBook[] {
    return LOCAL_BOOKS;
}

/**
 * Formate la taille du fichier en Mo
 */
export function formatFileSize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} Mo`;
}
