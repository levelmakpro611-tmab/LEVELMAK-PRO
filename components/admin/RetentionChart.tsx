import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Users, TrendingUp, Info, Download, Printer, RefreshCw } from 'lucide-react';
import { calculateRetentionStats, RetentionData } from '../../services/activityService';
import { motion } from 'framer-motion';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const RetentionChart: React.FC = () => {
    const [data, setData] = useState<RetentionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const stats = await calculateRetentionStats();
            setData(stats || []);
        } catch (e) {
            console.error(e);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const getColor = (percentage: number) => {
        if (percentage >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (percentage >= 50) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        if (percentage >= 30) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    };

    const handleExportPDF = async () => {
        if (!data || data.length === 0) {
            alert('Pas de données à imprimer');
            return;
        }

        if ((window as any).Capacitor?.getPlatform() === 'web' || !(window as any).Capacitor?.getPlatform()) {
            window.print();
            return;
        }
        setExporting(true);
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            try { doc.addImage('/tmab_logo.png', 'PNG', 14, 5, 25, 25); } catch (e) {
                doc.setFontSize(24);
                doc.setTextColor(147, 51, 234);
                doc.text("TMAB", 14, 20);
            }
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59);
            doc.text(`RÉTENTION - COHORTES`, 45, 18);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, 45, 24);
            
            const tableData = data.map(row => [
                row.period,
                row.cohortSize.toString(),
                `${row.days.day1}%`,
                `${row.days.day7}%`,
                `${row.days.day30}%`
            ]);
            autoTable(doc, {
                startY: 40,
                head: [['Cohorte', 'Utilisateurs', 'J+1', 'J+7', 'J+30']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [147, 51, 234] }
            });
            const pdfArray = doc.output('arraybuffer');
            const uint8 = new Uint8Array(pdfArray);
            let binary = "";
            for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
            const base64Data = btoa(binary);
            const filename = `retention_${Date.now()}.pdf`;
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });
            await Share.share({ url: result.uri, dialogTitle: 'Partager / Imprimer PDF' });
        } catch(e) {
            console.error(e);
            alert('Erreur lors de la création du PDF');
        } finally {
            setExporting(false);
        }
    };

    const handlePrint = handleExportPDF;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="text-purple-400" /> Analyse des Cohortes
                    </h3>
                    <p className="text-slate-400 text-sm">Pourcentage d'utilisateurs qui reviennent après leur inscription.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg text-slate-300 transition-colors border border-white/10"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 px-3 py-2 rounded-lg text-white transition-all shadow-lg shadow-purple-600/30 font-bold active:scale-95 disabled:opacity-50"
                    >
                        <Download size={13} />
                        PDF TMAB
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={exporting}
                        className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg text-slate-300 transition-colors border border-white/10 disabled:opacity-50"
                    >
                        <Printer size={13} />
                        Imprimer
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
                        <p className="text-slate-500 text-sm font-medium">Chargement des données...</p>
                    </div>
                </div>
            ) : (
                <div ref={tableRef} className="bg-black/40 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Cohorte</th>
                                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">Utilisateurs</th>
                                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">J+1</th>
                                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">J+7</th>
                                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">J+30</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, index) => (
                                    <motion.tr
                                        key={row.period}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.08 }}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-4 font-bold text-white flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-500" />
                                            {row.period}
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-300 font-bold">
                                            {row.cohortSize}
                                        </td>
                                        <td className="p-2 text-center">
                                            <div className={`px-2 py-1 rounded-lg border text-xs font-bold inline-block min-w-[3rem] ${getColor(row.days.day1)}`}>
                                                {row.days.day1}%
                                            </div>
                                        </td>
                                        <td className="p-2 text-center">
                                            <div className={`px-2 py-1 rounded-lg border text-xs font-bold inline-block min-w-[3rem] ${getColor(row.days.day7)}`}>
                                                {row.days.day7}%
                                            </div>
                                        </td>
                                        <td className="p-2 text-center">
                                            <div className={`px-2 py-1 rounded-lg border text-xs font-bold inline-block min-w-[3rem] ${getColor(row.days.day30)}`}>
                                                {row.days.day30}%
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                {[
                    { label: '≥ 80% Excellent', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                    { label: '≥ 50% Bon', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                    { label: '≥ 30% Moyen', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
                    { label: '< 30% Faible', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                ].map(item => (
                    <span key={item.label} className={`px-3 py-1 rounded-lg border text-xs font-bold ${item.color}`}>
                        {item.label}
                    </span>
                ))}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-blue-300">Comment lire ce tableau ?</h4>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                        Chaque ligne représente un groupe d'utilisateurs inscrits le même mois.
                        Les colonnes J+1, J+7, J+30 montrent quel pourcentage de ce groupe est revenu sur l'application après ce délai.
                        Un taux de rétention élevé à J+30 est signe d'une excellente fidélisation ("product-market fit").
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RetentionChart;
