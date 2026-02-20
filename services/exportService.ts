import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, HeadingLevel } from 'docx';
import { AdminStats, UserAnalytics, UserComment, PlatformRating } from '../types';

// ========== PDF EXPORT ==========

export const exportStatsToPDF = (stats: AdminStats, period: string): void => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LEVELMAK - Rapport Statistiques', 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Période: ${getPeriodLabel(period)}`, 14, 30);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 37);

    // Stats Table
    const statsData = [
        ['Métrique', 'Valeur'],
        ['Utilisateurs totaux', stats.totalUsers.toString()],
        ['Utilisateurs actifs', stats.activeUsers.toString()],
        ['Nouveaux aujourd\'hui', stats.newUsersToday.toString()],
        ['Nouveaux cette semaine', stats.newUsersWeek.toString()],
        ['Nouveaux ce mois', stats.newUsersMonth.toString()],
        ['Quiz générés', stats.quizzesGenerated.toString()],
        ['Flashcards créées', stats.flashcardsCreated.toString()],
        ['Histoires écrites', stats.storiesWritten.toString()],
        ['Livres lus', stats.booksRead.toString()],
        ['Heures d\'apprentissage', stats.totalLearningHours.toFixed(2)],
        ['Taux d\'engagement', `${stats.averageEngagementRate.toFixed(1)}%`]
    ];

    autoTable(doc, {
        startY: 45,
        head: [statsData[0]],
        body: statsData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }
    });

    // Footer
    doc.setFontSize(10);
    doc.text('LEVELMAK © TMAB GROUP', 14, doc.internal.pageSize.height - 10);

    doc.save(`levelmak-stats-${period}-${Date.now()}.pdf`);
};

export const exportUsersToPDF = (users: UserAnalytics[]): void => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LEVELMAK - Liste des Utilisateurs', 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${users.length} utilisateurs`, 14, 30);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 37);

    const usersData = users.map(u => [
        u.userName,
        u.phoneNumber || 'N/A',
        u.ageRange || 'N/A',
        u.gender || 'N/A',
        `${u.level}`,
        `${u.quizzesCompleted}`,
        new Date(u.registrationDate).toLocaleDateString('fr-FR')
    ]);

    autoTable(doc, {
        startY: 45,
        head: [['Nom', 'Téléphone', 'Âge', 'Genre', 'Niveau', 'Quiz', 'Inscription']],
        body: usersData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }
    });

    doc.setFontSize(10);
    doc.text('LEVELMAK © TMAB GROUP', 14, doc.internal.pageSize.height - 10);

    doc.save(`levelmak-users-${Date.now()}.pdf`);
};

export const exportCommentsToPDF = (comments: UserComment[]): void => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LEVELMAK - Commentaires Utilisateurs', 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${comments.length} commentaires`, 14, 30);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 37);

    const commentsData = comments.map(c => [
        c.userName,
        c.category,
        `${c.rating}⭐`,
        c.content.substring(0, 50) + '...',
        c.status,
        new Date(c.timestamp).toLocaleDateString('fr-FR')
    ]);

    autoTable(doc, {
        startY: 45,
        head: [['Utilisateur', 'Catégorie', 'Note', 'Commentaire', 'Statut', 'Date']],
        body: commentsData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 }
    });

    doc.setFontSize(10);
    doc.text('LEVELMAK © TMAB GROUP', 14, doc.internal.pageSize.height - 10);

    doc.save(`levelmak-comments-${Date.now()}.pdf`);
};

// ========== EXCEL EXPORT ==========

export const exportStatsToExcel = (stats: AdminStats, period: string): void => {
    const worksheetData = [
        ['LEVELMAK - Rapport Statistiques'],
        [`Période: ${getPeriodLabel(period)}`],
        [`Généré le: ${new Date().toLocaleDateString('fr-FR')}`],
        [],
        ['Métrique', 'Valeur'],
        ['Utilisateurs totaux', stats.totalUsers],
        ['Utilisateurs actifs', stats.activeUsers],
        ['Nouveaux aujourd\'hui', stats.newUsersToday],
        ['Nouveaux cette semaine', stats.newUsersWeek],
        ['Nouveaux ce mois', stats.newUsersMonth],
        ['Nouveaux cette année', stats.newUsersYear],
        ['Quiz générés', stats.quizzesGenerated],
        ['Quiz aujourd\'hui', stats.quizzesToday],
        ['Flashcards créées', stats.flashcardsCreated],
        ['Flashcards aujourd\'hui', stats.flashcardsToday],
        ['Histoires écrites', stats.storiesWritten],
        ['Histoires aujourd\'hui', stats.storiesToday],
        ['Livres lus', stats.booksRead],
        ['Livres aujourd\'hui', stats.booksToday],
        ['Heures d\'apprentissage', stats.totalLearningHours.toFixed(2)],
        ['Taux d\'engagement (%)', stats.averageEngagementRate.toFixed(1)]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Statistiques');

    XLSX.writeFile(workbook, `levelmak-stats-${period}-${Date.now()}.xlsx`);
};

export const exportUsersToExcel = (users: UserAnalytics[]): void => {
    const worksheetData = [
        ['LEVELMAK - Liste des Utilisateurs'],
        [`Total: ${users.length} utilisateurs`],
        [`Généré le: ${new Date().toLocaleDateString('fr-FR')}`],
        [],
        ['Nom', 'Email', 'Téléphone', 'Tranche d\'âge', 'Genre', 'Éducation', 'Niveau', 'XP', 'Quiz', 'Histoires', 'Inscription', 'Dernière activité']
    ];

    users.forEach(u => {
        worksheetData.push([
            u.userName,
            u.email,
            u.phoneNumber || 'N/A',
            u.ageRange || 'N/A',
            u.gender || 'N/A',
            u.education || 'N/A',
            u.level,
            u.xp,
            u.quizzesCompleted,
            u.storiesWritten,
            new Date(u.registrationDate).toLocaleDateString('fr-FR'),
            new Date(u.lastActive).toLocaleDateString('fr-FR')
        ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Utilisateurs');

    XLSX.writeFile(workbook, `levelmak-users-${Date.now()}.xlsx`);
};

export const exportCommentsToExcel = (comments: UserComment[]): void => {
    const worksheetData = [
        ['LEVELMAK - Commentaires Utilisateurs'],
        [`Total: ${comments.length} commentaires`],
        [`Généré le: ${new Date().toLocaleDateString('fr-FR')}`],
        [],
        ['Utilisateur', 'Téléphone', 'Catégorie', 'Note', 'Commentaire', 'Statut', 'Réponse Admin', 'Date']
    ];

    comments.forEach(c => {
        worksheetData.push([
            c.userName,
            c.userPhone || 'N/A',
            c.category,
            c.rating,
            c.content,
            c.status,
            c.adminResponse || '',
            new Date(c.timestamp).toLocaleDateString('fr-FR')
        ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Commentaires');

    XLSX.writeFile(workbook, `levelmak-comments-${Date.now()}.xlsx`);
};

// ========== WORD EXPORT ==========

export const exportStatsToWord = async (stats: AdminStats, period: string): Promise<void> => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: 'LEVELMAK - Rapport Statistiques',
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Période: ${getPeriodLabel(period)}`, break: 1 }),
                        new TextRun({ text: `Généré le: ${new Date().toLocaleDateString('fr-FR')}`, break: 1 })
                    ],
                    spacing: { after: 400 }
                }),
                new Table({
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: 'Métrique', bold: true })] }),
                                new TableCell({ children: [new Paragraph({ text: 'Valeur', bold: true })] })
                            ]
                        }),
                        createStatsRow('Utilisateurs totaux', stats.totalUsers.toString()),
                        createStatsRow('Utilisateurs actifs', stats.activeUsers.toString()),
                        createStatsRow('Nouveaux aujourd\'hui', stats.newUsersToday.toString()),
                        createStatsRow('Nouveaux cette semaine', stats.newUsersWeek.toString()),
                        createStatsRow('Nouveaux ce mois', stats.newUsersMonth.toString()),
                        createStatsRow('Quiz générés', stats.quizzesGenerated.toString()),
                        createStatsRow('Flashcards créées', stats.flashcardsCreated.toString()),
                        createStatsRow('Histoires écrites', stats.storiesWritten.toString()),
                        createStatsRow('Livres lus', stats.booksRead.toString()),
                        createStatsRow('Heures d\'apprentissage', stats.totalLearningHours.toFixed(2)),
                        createStatsRow('Taux d\'engagement', `${stats.averageEngagementRate.toFixed(1)}%`)
                    ]
                }),
                new Paragraph({
                    text: 'LEVELMAK © TMAB GROUP',
                    spacing: { before: 400 }
                })
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `levelmak-stats-${period}-${Date.now()}.docx`);
};

// ========== HELPERS ==========

function getPeriodLabel(period: string): string {
    const labels: Record<string, string> = {
        'day': 'Aujourd\'hui',
        'week': 'Cette semaine',
        'month': 'Ce mois',
        'year': 'Cette année'
    };
    return labels[period] || period;
}

function createStatsRow(metric: string, value: string): TableRow {
    return new TableRow({
        children: [
            new TableCell({ children: [new Paragraph(metric)] }),
            new TableCell({ children: [new Paragraph(value)] })
        ]
    });
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
