import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Database, ShieldCheck, Loader, ArrowRight, Table, Users, Share2, Printer, X } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { exportUserData, exportSystemLogs, exportDemographicData } from '../../services/adminService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table as DocTable, TableRow, TableCell, WidthType, TextRun, ImageRun, PageOrientation, BorderStyle, AlignmentType } from 'docx';
import { motion, AnimatePresence } from 'framer-motion';

interface ExportToolsProps {
    stats?: any;
    users?: any[];
    comments?: any[];
    period?: string;
    demographicStats?: any;
}

const ExportTools: React.FC<ExportToolsProps> = ({ demographicStats }) => {
    const [loading, setLoading] = useState<string | null>(null);
    const [selectedExport, setSelectedExport] = useState<{
        type: 'users' | 'logs' | 'demographics';
        format: 'xlsx' | 'pdf' | 'docx';
    } | null>(null);

    const handleExport = async (
        type: 'users' | 'logs' | 'demographics',
        format: 'xlsx' | 'pdf' | 'docx',
        shareMethod: 'download' | 'share' | 'print' = 'download'
    ) => {
        setLoading(`${type}-${format}`);
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

            const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
            await processExport(data, filename, format, shareMethod, type);
        } catch (error: any) {
            console.error('Export error:', error);
            alert('Erreur lors de l\'exportation: ' + error.message);
        } finally {
            setLoading(null);
        }
    };

    const processExport = async (
        data: any,
        filename: string,
        format: 'xlsx' | 'pdf' | 'docx',
        shareMethod: 'download' | 'share' | 'print',
        type: 'users' | 'logs' | 'demographics'
    ) => {
        const items = Array.isArray(data) ? data : [data];
        const isWeb = (window as any).Capacitor?.getPlatform() === 'web';

        // 1. Direct Web Print (Opens print preview with TMAB logo & official blue layout)
        if (shareMethod === 'print' && isWeb) {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert("Veuillez autoriser les fenêtres contextuelles (popups) pour imprimer.");
                return;
            }

            const headers = Object.keys(items[0] || {});
            
            const html = `
                <html>
                <head>
                    <title>Impression Rapport - Levelmak Pro</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
                            color: #1e293b;
                            padding: 30px;
                            margin: 0;
                        }
                        .header {
                            display: flex;
                            align-items: center;
                            margin-bottom: 5px;
                        }
                        .logo {
                            height: 75px;
                            width: auto;
                            margin-right: 25px;
                        }
                        .title-container {
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                        }
                        h1 {
                            font-size: 28px;
                            font-weight: 700;
                            color: #1e293b;
                            margin: 0 0 4px 0;
                            letter-spacing: -0.5px;
                        }
                        .company-name {
                            font-size: 14px;
                            color: #64748b;
                            font-weight: 500;
                            margin-bottom: 2px;
                        }
                        .meta {
                            font-size: 12px;
                            color: #64748b;
                        }
                        .blue-line {
                            height: 2px;
                            background-color: #3b82f6;
                            width: 100%;
                            margin-top: 15px;
                            margin-bottom: 30px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 11px;
                        }
                        th, td {
                            white-space: nowrap;
                            text-overflow: ellipsis;
                            overflow: hidden;
                        }
                        th {
                            background-color: #3b82f6 !important;
                            color: white !important;
                            font-weight: 600;
                            text-align: left;
                            padding: 8px 6px;
                            font-size: 10px;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        td {
                            padding: 8px 6px;
                            border-bottom: 1px solid #f1f5f9;
                            color: #334155;
                        }
                        tr:nth-child(even) {
                            background-color: #f8fafc !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        @media print {
                            @page {
                                size: landscape;
                                margin: 10mm;
                            }
                            body {
                                padding: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="/tmab_logo.png" class="logo" onerror="this.style.display='none'" />
                        <div class="title-container">
                            <h1>RAPPORT : ${filename.split('_')[0].toUpperCase()}</h1>
                            <div class="company-name">TMAB GROUP - Excellence Éducative</div>
                            <div class="meta">Généré par Levelmak Pro | Date: ${new Date().toLocaleString('fr-FR')}</div>
                        </div>
                    </div>
                    <div class="blue-line"></div>
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(h => `<th>${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    ${Object.values(item).map(v => `<td>${v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
                </html>
            `;
            printWindow.document.write(html);
            printWindow.document.close();
            return;
        }

        let content = new Uint8Array(0);
        let mimeType = '';

        if (format === 'pdf') {
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Header with Logo
            try {
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

                let columnStylesConfig: any = {};
                if (type === 'users') {
                    columnStylesConfig = {
                        0: { cellWidth: 42, fontSize: 5.5 }, // ID Utilisateur
                        1: { cellWidth: 25 }, // Nom
                        2: { cellWidth: 46, fontSize: 6.5 }, // Email
                        3: { cellWidth: 20 }, // Classe
                        4: { cellWidth: 26 }, // Téléphone
                        5: { cellWidth: 15 }, // Âge
                        6: { cellWidth: 16 }, // Genre
                        7: { cellWidth: 20 }, // Niveau
                        8: { cellWidth: 12 }, // XP
                        9: { cellWidth: 25 }, // Date Inscription
                        10: { cellWidth: 25 }, // Dernière Activité
                        11: { cellWidth: 15 } // Statut
                    };
                } else if (type === 'logs') {
                    columnStylesConfig = {
                        0: { cellWidth: 35, fontSize: 6.5 }, // ID Log
                        1: { cellWidth: 35 }, // Admin
                        2: { cellWidth: 45 }, // Action
                        3: { cellWidth: 30 }, // Date
                        4: { cellWidth: 112, fontSize: 7 }, // Détails
                        5: { cellWidth: 30 } // Cible
                    };
                } else { // demographics
                    columnStylesConfig = {
                        0: { cellWidth: 45, fontSize: 5.5 }, // ID Utilisateur
                        1: { cellWidth: 40 }, // Nom
                        2: { cellWidth: 25 }, // Genre
                        3: { cellWidth: 32 }, // Tranche d'âge
                        4: { cellWidth: 45 }, // Ville
                        5: { cellWidth: 55 }, // Quartier
                        6: { cellWidth: 45 } // Date Inscription
                    };
                }

                autoTable(doc, {
                    startY: 45,
                    head: [headers],
                    body: body,
                    theme: 'striped',
                    headStyles: {
                        fillColor: [59, 130, 246],
                        fontSize: 8,
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    styles: {
                        fontSize: 7,
                        cellPadding: 1.5,
                        overflow: 'ellipsize',
                        valign: 'middle',
                        halign: 'left'
                    },
                    columnStyles: columnStylesConfig,
                    margin: { top: 45, left: 5, right: 5 },
                    tableWidth: 'auto'
                });
            }

            content = new Uint8Array(doc.output('arraybuffer'));
            mimeType = 'application/pdf';
        } else if (format === 'xlsx') {
            console.log(`Generating Excel with ${items.length} items`);

            const wsData = [
                ["TMAB GROUP - RAPPORT ADMINISTRATIF"],
                [`Type: ${filename.split('_')[0]} | Date: ${new Date().toLocaleString()}`],
                [], // Empty row
                Object.keys(items[0] || {}), // Headers
                ...items.map(item => Object.values(item).map(v => v === null || v === undefined ? '' : String(v)))
            ];

            const ws = XLSX.utils.aoa_to_sheet(wsData);

            ws['!cols'] = Object.keys(items[0] || {}).map(key => {
                if (key.includes('ID') || key.includes('Email')) return { wch: 35 };
                if (key.includes('Date') || key.includes('Activité')) return { wch: 25 };
                return { wch: 20 };
            });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Rapport TMAB");
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            content = new Uint8Array(excelBuffer);
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (format === 'docx') {
            console.log(`Generating Word with ${items.length} items`);
            
            // Try fetching the TMAB logo image
            let logoArrayBuffer: ArrayBuffer | null = null;
            try {
                const logoResponse = await fetch('/tmab_logo.png');
                if (logoResponse.ok) {
                    logoArrayBuffer = await logoResponse.arrayBuffer();
                    console.log("[EXPORT] TMAB Logo fetched successfully for DOCX");
                }
            } catch (e) {
                console.warn("[EXPORT] Failed to fetch TMAB logo for DOCX", e);
            }

            const headers = Object.keys(items[0] || {});

            // Helper to create styled table cells in docx
            const createCell = (text: string, isHeader: boolean, isEven: boolean) => {
                return new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: text === null || text === undefined ? '' : String(text),
                                    bold: isHeader,
                                    color: isHeader ? "FFFFFF" : "1E293B",
                                    size: isHeader ? 18 : 16 // half-points: 9pt for header, 8pt for body
                                })
                            ],
                            alignment: AlignmentType.LEFT,
                        })
                    ],
                    shading: {
                        fill: isHeader ? "3B82F6" : (isEven ? "F8FAFC" : "FFFFFF")
                    },
                    margins: {
                        top: 140, // 7pt
                        bottom: 140,
                        left: 160, // 8pt
                        right: 160
                    },
                    borders: {
                        top: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                        bottom: { 
                            style: isHeader ? BorderStyle.NONE : BorderStyle.SINGLE, 
                            size: 4, // 0.5pt
                            color: "E2E8F0" 
                        }
                    }
                });
            };

            const docTable = new DocTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: headers.map(h => createCell(h, true, false))
                    }),
                    ...items.map((item, index) => new TableRow({
                        children: Object.values(item).map(v => createCell(v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v), false, index % 2 === 0))
                    }))
                ]
            });

            // Layout elements
            const headerCells = [];
            if (logoArrayBuffer) {
                headerCells.push(new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: logoArrayBuffer,
                                    transformation: {
                                        width: 60,
                                        height: 60
                                    }
                                } as any)
                            ],
                            alignment: AlignmentType.CENTER
                        })
                    ],
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE }
                    }
                }));
            }

            headerCells.push(new TableCell({
                width: { size: logoArrayBuffer ? 85 : 100, type: WidthType.PERCENTAGE },
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `RAPPORT : ${filename.split('_')[0].toUpperCase()}`,
                                bold: true,
                                color: "1E293B",
                                size: 36 // 18pt
                            })
                        ],
                        alignment: AlignmentType.LEFT
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `TMAB GROUP - Excellence Éducative`,
                                bold: true,
                                color: "3B82F6",
                                size: 24 // 12pt
                            })
                        ],
                        alignment: AlignmentType.LEFT
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Généré par Levelmak Pro | Date: ${new Date().toLocaleString('fr-FR')}`,
                                color: "64748B",
                                size: 18 // 9pt
                            })
                        ],
                        alignment: AlignmentType.LEFT
                    })
                ],
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                }
            }));

            const docHeaderTable = new DocTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: headerCells
                    })
                ],
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                }
            });

            const divider = new Paragraph({
                border: {
                    bottom: {
                        color: "3B82F6",
                        space: 12,
                        style: BorderStyle.SINGLE,
                        size: 12 // 1.5pt
                    }
                }
            });

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            size: {
                                orientation: PageOrientation.LANDSCAPE,
                                width: 16838, // A4 Landscape width
                                height: 11906, // A4 Landscape height
                            },
                            margin: {
                                top: 1000,
                                right: 1000,
                                bottom: 1000,
                                left: 1000,
                            }
                        },
                    },
                    children: [
                        docHeaderTable,
                        divider,
                        new Paragraph({ text: "" }), // Space
                        docTable
                    ]
                }]
            });

            const base64Data = await Packer.toBase64String(doc);
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            content = bytes;
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        // Convert Uint8Array to base64 for Capacitor Filesystem
        let binary = "";
        const len = content.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(content[i]);
        }
        const dataToSave = btoa(binary);

        console.log(`[EXPORT] Processing saving/sharing: ${filename} (${len} bytes)`);

        // 2. Native Mobile Platform
        if (!isWeb) {
            try {
                const result = await Filesystem.writeFile({
                    path: filename,
                    data: dataToSave,
                    directory: Directory.Cache,
                });

                if (shareMethod === 'share' || shareMethod === 'print') {
                    await Share.share({
                        title: `Export ${filename}`,
                        text: `Voici le rapport ${filename} exporté de Levelmak Pro.`,
                        url: result.uri,
                        dialogTitle: shareMethod === 'print' ? 'Imprimer le rapport' : 'Partager le rapport',
                    });
                } else {
                    // Mobile Download option: trigger share sheet so user can "Save to Files"
                    await Share.share({
                        title: `Enregistrer ${filename}`,
                        text: `Enregistrer le document dans vos fichiers.`,
                        url: result.uri,
                        dialogTitle: 'Enregistrer le fichier',
                    });
                }
            } catch (err) {
                console.error('Filesystem error on native:', err);
                alert("Erreur lors de l'enregistrement ou du partage du fichier sur mobile.");
            }
        } 
        // 3. Web Platform (PC/Computer) fallback
        else {
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);

            if (shareMethod === 'share') {
                if (navigator.share) {
                    try {
                        const file = new File([blob], filename, { type: mimeType });
                        await navigator.share({
                            title: `Export ${filename}`,
                            files: [file],
                        });
                        return;
                    } catch (e) {
                        console.warn("Navigator share failed, falling back to download", e);
                    }
                }
                // If sharing failed or is unsupported on browser, download it
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // Download
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500 relative">
            
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
                    <div className="grid grid-cols-4 gap-1.5">
                        <ExportButton
                            label="EXCEL"
                            format="XLSX"
                            icon={<FileSpreadsheet size={20} />}
                            onClick={() => setSelectedExport({ type: 'users', format: 'xlsx' })}
                            isLoading={loading === 'users-xlsx'}
                            variant="blue"
                        />
                        <ExportButton
                            label="PDF"
                            format="PDF"
                            icon={<FileText size={20} />}
                            onClick={() => setSelectedExport({ type: 'users', format: 'pdf' })}
                            isLoading={loading === 'users-pdf'}
                            variant="purple"
                        />
                        <ExportButton
                            label="WORD"
                            format="DOCX"
                            icon={<FileText size={20} />}
                            onClick={() => setSelectedExport({ type: 'users', format: 'docx' })}
                            isLoading={loading === 'users-docx'}
                            variant="green"
                        />
                        <ExportButton
                            label="IMPRIMER"
                            format="DIRECT"
                            icon={<Printer size={20} />}
                            onClick={() => handleExport('users', 'pdf', 'print')}
                            isLoading={loading === 'users-pdf'}
                            variant="red"
                        />
                    </div>
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
                    <div className="grid grid-cols-4 gap-1.5">
                        <ExportButton
                            label="EXCEL"
                            format="XLSX"
                            icon={<FileSpreadsheet size={20} />}
                            onClick={() => setSelectedExport({ type: 'logs', format: 'xlsx' })}
                            isLoading={loading === 'logs-xlsx'}
                            variant="green"
                        />
                        <ExportButton
                            label="PDF"
                            format="PDF"
                            icon={<FileText size={20} />}
                            onClick={() => setSelectedExport({ type: 'logs', format: 'pdf' })}
                            isLoading={loading === 'logs-pdf'}
                            variant="orange"
                        />
                        <ExportButton
                            label="WORD"
                            format="DOCX"
                            icon={<FileText size={20} />}
                            onClick={() => setSelectedExport({ type: 'logs', format: 'docx' })}
                            isLoading={loading === 'logs-docx'}
                            variant="blue"
                        />
                        <ExportButton
                            label="IMPRIMER"
                            format="DIRECT"
                            icon={<Printer size={20} />}
                            onClick={() => handleExport('logs', 'pdf', 'print')}
                            isLoading={loading === 'logs-pdf'}
                            variant="red"
                        />
                    </div>
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
                    <div className="grid grid-cols-4 gap-1.5">
                        <ExportButton
                            label="EXCEL"
                            format="XLSX"
                            icon={<Table size={20} />}
                            onClick={() => setSelectedExport({ type: 'demographics', format: 'xlsx' })}
                            isLoading={loading === 'demographics-xlsx'}
                            variant="blue"
                        />
                        <ExportButton
                            label="PDF"
                            format="PDF"
                            icon={<FileText size={20} />}
                            onClick={() => setSelectedExport({ type: 'demographics', format: 'pdf' })}
                            isLoading={loading === 'demographics-pdf'}
                            variant="purple"
                        />
                        <ExportButton
                            label="WORD"
                            format="DOCX"
                            icon={<FileText size={20} />}
                            onClick={() => setSelectedExport({ type: 'demographics', format: 'docx' })}
                            isLoading={loading === 'demographics-docx'}
                            variant="green"
                        />
                        <ExportButton
                            label="IMPRIMER"
                            format="DIRECT"
                            icon={<Printer size={20} />}
                            onClick={() => handleExport('demographics', 'pdf', 'print')}
                            isLoading={loading === 'demographics-pdf'}
                            variant="red"
                        />
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <ArrowRight size={12} className="text-pink-500" />
                    Inclut l'âge, le genre et la localisation
                </div>
            </div>

            {/* Interactive Modal for Options */}
            <AnimatePresence>
                {selectedExport && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedExport(null)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center"
                        >
                            <div className="flex justify-between items-start">
                                <div className="text-left">
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Options du Rapport</span>
                                    <h3 className="text-2xl font-black text-white capitalize">
                                        {selectedExport.format.toUpperCase()} : {selectedExport.type === 'users' ? 'Utilisateurs' : selectedExport.type === 'logs' ? 'Journaux' : 'Démographie'}
                                    </h3>
                                </div>
                                <button onClick={() => setSelectedExport(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-2">
                                {/* Action 1: Download */}
                                <button
                                    onClick={() => {
                                        handleExport(selectedExport.type, selectedExport.format, 'download');
                                        setSelectedExport(null);
                                    }}
                                    className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-4 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Download size={22} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-base">Télécharger le fichier</h4>
                                        <p className="text-xs text-slate-400">Enregistrer sur votre ordinateur ou mobile</p>
                                    </div>
                                </button>

                                {/* Action 2: Share */}
                                <button
                                    onClick={() => {
                                        handleExport(selectedExport.type, selectedExport.format, 'share');
                                        setSelectedExport(null);
                                    }}
                                    className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-4 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Share2 size={22} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-base">Partager / Envoyer</h4>
                                        <p className="text-xs text-slate-400">Envoyer par WhatsApp, Mail ou autres apps</p>
                                    </div>
                                </button>

                                {/* Action 3: Print (PDF only) */}
                                {selectedExport.format === 'pdf' && (
                                    <button
                                        onClick={() => {
                                            handleExport(selectedExport.type, selectedExport.format, 'print');
                                            setSelectedExport(null);
                                        }}
                                        className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-4 transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Printer size={22} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-base">Imprimer le document</h4>
                                            <p className="text-xs text-slate-400">Lancer l'impression directe du rapport</p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

interface ExportButtonProps {
    label: string;
    format: string;
    icon: React.ReactNode;
    onClick: () => void;
    isLoading: boolean;
    variant: 'blue' | 'purple' | 'green' | 'orange' | 'red';
}

const ExportButton: React.FC<ExportButtonProps> = ({ label, format, icon, onClick, isLoading, variant }) => {
    const variants = {
        blue: 'from-blue-600 to-blue-700 shadow-blue-600/20 hover:shadow-blue-600/40',
        purple: 'from-purple-600 to-purple-700 shadow-purple-600/20 hover:shadow-purple-600/40',
        green: 'from-green-600 to-green-700 shadow-green-600/20 hover:shadow-green-600/40',
        orange: 'from-orange-600 to-orange-700 shadow-orange-600/20 hover:shadow-orange-600/40',
        red: 'from-rose-600 to-rose-700 shadow-rose-600/20 hover:shadow-rose-600/40',
    };

    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-2xl text-white transition-all bg-gradient-to-br shadow-xl hover:scale-[1.05] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
        >
            {isLoading ? <Loader className="animate-spin" size={20} /> : icon}
            <span className="font-black text-[11px] uppercase tracking-wider">{label}</span>
            <span className="text-[8px] font-bold opacity-60 uppercase">{format}</span>
        </button>
    );
};

export default ExportTools;
