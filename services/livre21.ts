// Service pour intégrer les livres de livre21.com

export interface Livre21Book {
    id: string;
    title: string;
    category: string;
    pdfUrl: string;
    cover?: string;
}

// Extraction des catégories disponibles
export const LIVRE21_CATEGORIES = {
    science: 'http://livre21.com/pf5.html',
    droitEconomie: 'http://livre21.com/pf6.html',
    magazines: 'http://livre21.com/pf2.html',
    romans: 'http://livre21.com/pf3.html',
    religion: 'http://livre21.com/pf4.html',
    divers: 'http://livre21.com/pf1.html',
};

/**
 * Extrait les liens PDF depuis le contenu HTML
 */
function extractPDFLinks(htmlContent: string): string[] {
    const pdfRegex = /href=["'](http:\/\/livre21\.com\/[^"']*\.pdf)["']/gi;
    const links: string[] = [];
    let match;

    while ((match = pdfRegex.exec(htmlContent)) !== null) {
        links.push(match[1]);
    }

    return [...new Set(links)]; // Remove duplicates
}

/**
 * Génère un titre basé sur le nom du fichier PDF
 */
function generateTitleFromPDF(pdfUrl: string): string {
    const filename = pdfUrl.split('/').pop() || 'Livre';
    return filename.replace('.pdf', '').replace(/%20/g, ' ');
}

/**
 * Récupère les livres depuis une catégorie livre21.com via un proxy CORS
 */
export async function fetchLivre21Books(categoryUrl: string, categoryName: string): Promise<Livre21Book[]> {
    try {
        // Utilisation d'un proxy CORS pour contourner les restrictions du navigateur
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(categoryUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const html = await response.text();
        const pdfLinks = extractPDFLinks(html);

        return pdfLinks.map((pdfUrl, index) => ({
            id: `livre21_${categoryName}_${index}`,
            title: generateTitleFromPDF(pdfUrl),
            category: categoryName,
            pdfUrl: pdfUrl,
            cover: 'https://via.placeholder.com/200x300?text=' + encodeURIComponent(categoryName),
        }));
    } catch (error) {
        console.error(`Erreur lors de la récupération des livres de ${categoryName}:`, error);
        return [];
    }
}

/**
 * Récupère tous les livres de toutes les catégories
 */
export async function fetchAllLivre21Books(): Promise<Livre21Book[]> {
    const allBooks: Livre21Book[] = [];

    for (const [key, url] of Object.entries(LIVRE21_CATEGORIES)) {
        const categoryName = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        const books = await fetchLivre21Books(url, categoryName);
        allBooks.push(...books);
    }

    return allBooks;
}
