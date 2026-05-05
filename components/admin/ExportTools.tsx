import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Database, ShieldCheck, Loader, ArrowRight, FileJson, Table, Users, Share2 } from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { exportUserData, exportSystemLogs, exportDemographicData } from '../../services/adminService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table as DocTable, TableRow, TableCell, WidthType } from 'docx';

interface ExportToolsProps {
    stats?: any; // Assuming these are optional props based on the instruction's signature change
    users?: any[];
    comments?: any[];
    period?: string;
    demographicStats?: any;
}

const ExportTools: React.FC<ExportToolsProps> = ({ demographicStats }) => {
    const [loading, setLoading] = useState<string | null>(null);

    const handleExport = async (type: 'users' | 'logs' | 'demographics', format: 'xlsx' | 'docx' | 'pdf', shareMethod: 'download' | 'share' = 'download') => {
        setLoading(`${type}-${format}-${shareMethod}`);
        try {
            let data;
            if (type === 'users') {
                data = await exportUserData();
                console.log(`[EXPORT] Users data fetched: ${data?.length || 0} items`);
            } else if (type === 'logs') {
                data = await exportSystemLogs();
                console.log(`[EXPORT] Logs data fetched: ${data?.length || 0} items`);
            } else { // type === 'demographics'
                data = await exportDemographicData();
                console.log(`[EXPORT] Demographic data fetched: ${data?.length || 0} items`);
            }

            if (!data || (Array.isArray(data) && data.length === 0)) {
                alert("Aucune donnée disponible pour cette période ou ce type d'export.");
                setLoading(null);
                return;
            }

            if (data) {
                const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
                await processNativeExport(data, filename, format, shareMethod);
            }
        } catch (error: any) {
            console.error('Export error:', error);
            alert('Erreur lors de l\'exportation: ' + (error as any).message);
        } finally {
            setLoading(null);
        }
    };

    const processNativeExport = async (data: any, filename: string, format: 'xlsx' | 'docx' | 'pdf', shareMethod: 'download' | 'share') => {
        let content: string | Uint8Array = '';
        let mimeType = '';

        const items = Array.isArray(data) ? data : [data];

        if (format === 'pdf') {
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            const items = Array.isArray(data) ? data : [data];
            
            // Header with Logo
            try {
                // On mobile, absolute paths are better. We also add a branding text fallback.
                doc.addImage('/tmab_logo.png', 'PNG', 14, 5, 25, 25);
            } catch (e) {
                console.warn("Logo not found for PDF", e);
                doc.setFontSize(24);
                doc.setTextColor(59, 130, 246);
                doc.text("TMAB", 14, 20);
            }

            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59); // Dark Slate
            doc.text(`RAPPORT : ${filename.split('_')[0].toUpperCase()}`, 45, 18);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`TMAB GROUP - Excellence Éducative`, 45, 24);
            doc.text(`Généré par Levelmak Pro | Date: ${new Date().toLocaleString('fr-FR')}`, 45, 30);
            
            // Decorative line
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(0.5);
            doc.line(14, 35, 283, 35);

            if (items.length > 0) {
                const headers = Object.keys(items[0]);
                const body = items.map(item => Object.values(item).map(v => 
                    v === null || v === undefined ? '' :
                    typeof v === 'object' ? JSON.stringify(v) : String(v)
                ));

                autoTable(doc, {
                    startY: 45,
                    head: [headers],
                    body: body,
                    theme: 'striped',
                    headStyles: { 
                        fillColor: [59, 130, 246],
                        fontSize: 9,
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    styles: { 
                        fontSize: 7.5, 
                        cellPadding: 2,
                        overflow: 'linebreak',
                        cellWidth: 'auto',
                        valign: 'middle'
                    },
                    columnStyles: {
                        0: { cellWidth: 38 }, // ID Utilisateur
                        1: { cellWidth: 26 }, // Nom
                        2: { cellWidth: 38 }, // Email
                        3: { cellWidth: 26 }, // Téléphone
                        4: { cellWidth: 15 }, // Âge
                        5: { cellWidth: 15 }, // Genre
                        6: { cellWidth: 20 }, // Niveau (was Éducation)
                        7: { cellWidth: 15 }, // XP
                        8: { cellWidth: 25 }, // Date Inscription
                        9: { cellWidth: 25 }, // Dernière Activité
                        10: { cellWidth: 15 } // Statut
                    },
                    margin: { top: 45, left: 10, right: 10 }
                });
            }

            content = new Uint8Array(doc.output('arraybuffer'));
            mimeType = 'application/pdf';
        } else if (format === 'xlsx') {
            console.log(`Generating Excel with ${items.length} items`);
            
            // Create a branded header row
            const wsData = [
                ["TMAB GROUP - RAPPORT ADMINISTRATIF"],
                [`Type: ${filename.split('_')[0]} | Date: ${new Date().toLocaleString()}`],
                [], // Empty row
                Object.keys(items[0] || {}), // Headers
                ...items.map(item => Object.values(item).map(v => v === null || v === undefined ? '' : String(v)))
            ];

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Basic styling for XLSX
            ws['!cols'] = Object.keys(items[0] || {}).map(() => ({ wch: 20 }));
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Rapport TMAB");
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            content = new Uint8Array(excelBuffer);
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (format === 'docx') {
            console.log(`Generating Word with ${items.length} items`);
            const headers = Object.keys(items[0] || {});
            const table = new DocTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: headers.map(h => new TableCell({ 
                            children: [new Paragraph({ text: h, bold: true })],
                            shading: { fill: "3B82F6", color: "FFFFFF" }
                        }))
                    }),
                    ...items.map(item => new TableRow({
                        children: Object.values(item).map(v => new TableCell({ 
                            children: [new Paragraph({ text: String(v === null || v === undefined ? '' : v) })] 
                        }))
                    }))
                ]
            });

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ text: `Rapport Administratif Levelmak`, heading: 'Title' }),
                        new Paragraph({ text: `Type: ${filename.split('_')[0]} | Date: ${new Date().toLocaleDateString()}` }),
                        new Paragraph({ text: "" }),
                        table
                    ]
                }]
            });

            // Use toBase64String for Capacitor Filesystem compatibility
            const base64Data = await Packer.toBase64String(doc);
            
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents,
            });

            if (shareMethod === 'share') {
                await Share.share({
                    title: `Export ${filename}`,
                    text: `Voici l'exportation ${filename} de Levelmak Pro.`,
                    url: result.uri,
                    dialogTitle: 'Partager l\'exportation',
                });
            } else {
                alert(`Fichier sauvegardé dans Documents : ${filename}`);
            }
            return; // Exit early as we've already saved
        }

        try {
            // Memory-safe Uint8Array to Base64 conversion
            const uint8 = new Uint8Array(content);
            let binary = "";
            const len = uint8.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(uint8[i]);
            }
            const dataToSave = btoa(binary);

            console.log(`[EXPORT] Saving file: ${filename} (${len} bytes)`);

            const result = await Filesystem.writeFile({
                path: filename,
                data: dataToSave,
                directory: Directory.Documents,
            });

            if (shareMethod === 'share') {
                // 2. Partager via le menu natif (WhatsApp, Email, etc.)
                await Share.share({
                    title: `Export ${filename}`,
                    text: `Voici l'exportation des données ${filename} de Levelmak Pro.`,
                    url: result.uri,
                    dialogTitle: 'Partager l\'exportation',
                });
            } else {
                // Web fallback/Download simulation for desktop or just alert success on mobile
                if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
                    const blob = new Blob([content], { type: mimeType });
                    (window.navigator as any).msSaveOrOpenBlob(blob, filename);
                } else {
                    const blob = new Blob([content], { type: mimeType });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                alert(`Fichier sauvegardé dans Documents : ${filename}`);
            }
        } catch (err) {
            console.error('Filesystem error:', err);
            // Fallback for browsers
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Users Export Card */}
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none group-hover:bg-blue-500/20 transition-all"></div>

                <div className="flex items-center gap-5 mb-8 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                        <Database size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Données Utilisateurs</h3>
                        <p className="text-sm text-slate-400">Exporter la liste complète des membres et statistiques</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                        <ExportButton
                            label="EXCEL"
                            format="Ordinateur"
                            icon={<FileSpreadsheet size={20} />}
                            onClick={() => handleExport('users', 'xlsx', 'download')}
                            isLoading={loading === 'users-xlsx-download'}
                            variant="blue"
                        />
                        <ExportButton
                            label="PDF"
                            format="Téléphone"
                            icon={<FileText size={20} />}
                            onClick={() => handleExport('users', 'pdf', 'share')}
                            isLoading={loading === 'users-pdf-share'}
                            variant="purple"
                        />
                    </div>
                    <button 
                        onClick={() => handleExport('users', 'docx', 'share')}
                        disabled={!!loading}
                        className="w-full py-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/20 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all"
                    >
                        {loading === 'users-docx-share' ? <Loader className="animate-spin" size={18} /> : <Share2 size={18} />}
                        Partager en mode WORD
                    </button>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <ArrowRight size={12} className="text-blue-500" />
                    Inclut les scores, niveaux et dates d'inscription
                </div>
            </div>

            {/* Logs Export Card */}
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-green-500/30 transition-all shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none group-hover:bg-green-500/20 transition-all"></div>

                <div className="flex items-center gap-5 mb-8 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400 shadow-inner">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Journaux Système</h3>
                        <p className="text-sm text-slate-400">Exporter l'historique des actions administratives</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                        <ExportButton
                            label="EXCEL"
                            format="Spreadsheet"
                            icon={<FileSpreadsheet size={20} />}
                            onClick={() => handleExport('logs', 'xlsx', 'download')}
                            isLoading={loading === 'logs-xlsx-download'}
                            variant="green"
                        />
                        <ExportButton
                            label="PDF"
                            format="Journal"
                            icon={<FileText size={20} />}
                            onClick={() => handleExport('logs', 'pdf', 'share')}
                            isLoading={loading === 'logs-pdf-share'}
                            variant="orange"
                        />
                    </div>
                    <button 
                        onClick={() => handleExport('logs', 'docx', 'share')}
                        disabled={!!loading}
                        className="w-full py-4 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-2xl border border-green-500/20 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all"
                    >
                        {loading === 'logs-docx-share' ? <Loader className="animate-spin" size={18} /> : <Share2 size={18} />}
                        Partager en mode WORD
                    </button>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <ArrowRight size={12} className="text-green-500" />
                    Journal complet des modifications et connexions
                </div>
            </div>

            {/* Demographic Export Card */}
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-pink-500/30 transition-all shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none group-hover:bg-pink-500/20 transition-all"></div>

                <div className="flex items-center gap-5 mb-8 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-pink-500/20 flex items-center justify-center text-pink-400 shadow-inner">
                        <Users size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Données Démographiques</h3>
                        <p className="text-sm text-slate-400">Exporter les statistiques démographiques des utilisateurs</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                        <ExportButton
                            label="EXCEL"
                            format="Spreadsheet"
                            icon={<Table size={20} />}
                            onClick={() => handleExport('demographics', 'xlsx', 'download')}
                            isLoading={loading === 'demographics-xlsx-download'}
                            variant="blue"
                        />
                        <ExportButton
                            label="PDF"
                            format="Analyse"
                            icon={<FileJson size={20} />}
                            onClick={() => handleExport('demographics', 'pdf', 'share')}
                            isLoading={loading === 'demographics-pdf-share'}
                            variant="purple"
                        />
                    </div>
                    <button 
                        onClick={() => handleExport('demographics', 'docx', 'share')}
                        disabled={!!loading}
                        className="w-full py-4 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 rounded-2xl border border-pink-500/20 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all"
                    >
                        {loading === 'demographics-docx-share' ? <Loader className="animate-spin" size={18} /> : <Share2 size={18} />}
                        Partager en mode WORD
                    </button>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <ArrowRight size={12} className="text-pink-500" />
                    Inclut l'âge, le genre et la localisation
                </div>
            </div>
        </div>
    );
};

interface ExportButtonProps {
    label: string;
    format: string;
    icon: React.ReactNode;
    onClick: () => void;
    isLoading: boolean;
    variant: 'blue' | 'purple' | 'green' | 'orange';
}

const ExportButton: React.FC<ExportButtonProps> = ({ label, format, icon, onClick, isLoading, variant }) => {
    const variants = {
        blue: 'from-blue-600 to-blue-700 shadow-blue-600/20 hover:shadow-blue-600/40',
        purple: 'from-purple-600 to-purple-700 shadow-purple-600/20 hover:shadow-purple-600/40',
        green: 'from-green-600 to-green-700 shadow-green-600/20 hover:shadow-green-600/40',
        orange: 'from-orange-600 to-orange-700 shadow-orange-600/20 hover:shadow-orange-600/40',
    };

    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl text-white transition-all bg-gradient-to-br shadow-xl hover:scale-[1.05] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
        >
            {isLoading ? <Loader className="animate-spin" size={20} /> : icon}
            <span className="font-black text-sm uppercase tracking-wider">{label}</span>
            <span className="text-[10px] font-bold opacity-60 uppercase">{format}</span>
        </button>
    );
};

export default ExportTools;
