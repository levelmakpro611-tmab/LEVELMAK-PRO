import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, User, UserCheck, Printer, Loader } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DemographicStats {
    byGender: { HOMME: number; FEMME: number; AUTRE: number; TOTAL: number };
    byAge: {
        '15-18': number;
        '19-23': number;
        '24+': number;
        'unknown': number;
        total: number;
    };
    byLocation?: Record<string, number>;
    crossTable: { ageRange: string; HOMME: number; FEMME: number; AUTRE: number; total: number }[];
}

interface DemographicTableProps {
    stats: DemographicStats | null;
}

const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B'];

const DemographicTable: React.FC<DemographicTableProps> = ({ stats }) => {
    // ✅ Hook called unconditionally at the top level (React Rules of Hooks)
    const [exporting, setExporting] = React.useState(false);

    if (!stats) return <div className="p-8 text-center text-slate-400">Chargement des données démographiques...</div>;

    const genderData = [
        { name: 'Hommes', value: stats.byGender.HOMME },
        { name: 'Femmes', value: stats.byGender.FEMME },
        { name: 'Autre', value: stats.byGender.AUTRE || 0 }
    ];

    const handlePrint = async () => {
        if (!stats || !stats.crossTable || stats.crossTable.length === 0) {
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
                doc.setTextColor(59, 130, 246);
                doc.text("TMAB", 14, 20);
            }
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59);
            doc.text(`DÉMOGRAPHIE UTILISATEURS`, 45, 18);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, 45, 24);
            
            const tableData = stats.crossTable.map(row => [
                row.ageRange,
                row.HOMME.toString(),
                row.FEMME.toString(),
                ((row as any).AUTRE || 0).toString(),
                row.total.toString()
            ]);
            
            // Add Total Row
            tableData.push([
                'TOTAL',
                stats.byGender.HOMME.toString(),
                stats.byGender.FEMME.toString(),
                ((stats.byGender as any).AUTRE || 0).toString(),
                stats.byGender.TOTAL.toString()
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['Tranche d\'Âge', 'Hommes', 'Femmes', 'Inconnu', 'Total']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }
            });
            const pdfArray = doc.output('arraybuffer');
            const uint8 = new Uint8Array(pdfArray);
            let binary = "";
            for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
            const base64Data = btoa(binary);
            const filename = `demographie_${Date.now()}.pdf`;
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

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-800 rounded-xl text-blue-400 border border-slate-700">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white">Démographie Utilisateurs</h2>
                        <p className="text-slate-400 font-medium">Analyse de la répartition par âge et sexe</p>
                    </div>
                </div>
                <button onClick={handlePrint} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white text-sm font-bold border border-white/10 disabled:opacity-50">
                    {exporting ? <Loader className="animate-spin" size={18} /> : <Printer size={18} />}
                    Imprimer
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gender Distribution Pie Chart */}
                <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-800">
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                        <UserCheck className="text-pink-500" size={20} />
                        Répartition par Sexe
                    </h3>
                    <div className="h-[250px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell key="male" fill="#3B82F6" />
                                    <Cell key="female" fill="#EC4899" />
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#fff'
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Age Distribution Bar Chart (from CrossTable) */}
                <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-800">
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                        <User className="text-green-500" size={20} />
                        Répartition par Âge
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.crossTable}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="ageRange" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#fff'
                                    }}
                                />
                                <Bar dataKey="HOMME" fill="#3B82F6" stackId="a" radius={[0, 0, 0, 0]} barSize={40} />
                                <Bar dataKey="FEMME" fill="#EC4899" stackId="a" radius={[0, 0, 0, 0]} barSize={40} />
                                <Bar dataKey="AUTRE" fill="#94a3b8" stackId="a" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Location Distribution */}
            {stats.byLocation && Object.keys(stats.byLocation).length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                        <Users className="text-blue-500" size={20} />
                        Répartition Géographique
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {Object.entries(stats.byLocation).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([city, count]) => (
                            <div key={city} className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest truncate">{city}</p>
                                <p className="text-2xl font-black text-white">{count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detailed Cross Table */}
            <div className="bg-slate-900/30 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-lg font-black text-white">Tableau Détaillé</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black/20 text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="p-4 whitespace-nowrap">Tranche d'Âge</th>
                                <th className="p-4 text-center text-blue-400 whitespace-nowrap">Hommes</th>
                                <th className="p-4 text-center text-pink-400 whitespace-nowrap">Femmes</th>
                                <th className="p-4 text-center text-slate-400 whitespace-nowrap">Inconnu</th>
                                <th className="p-4 text-right text-white whitespace-nowrap">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats.crossTable.map((row) => (
                                <tr key={row.ageRange} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-bold text-slate-200 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap ${row.ageRange === 'Non spécifié' ? 'bg-slate-700' : 'bg-primary/20 text-primary-light'}`}>
                                            {row.ageRange}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center font-bold text-slate-300 whitespace-nowrap">{row.HOMME}</td>
                                    <td className="p-4 text-center font-bold text-slate-300 whitespace-nowrap">{row.FEMME}</td>
                                    <td className="p-4 text-center font-bold text-slate-400 whitespace-nowrap">{(row as any).AUTRE || 0}</td>
                                    <td className="p-4 text-right font-black text-white whitespace-nowrap">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-white/5">
                            <tr>
                                <td className="p-4 font-black text-white">TOTAL</td>
                                <td className="p-4 text-center font-black text-blue-400">{stats.byGender.HOMME}</td>
                                <td className="p-4 text-center font-black text-pink-400">{stats.byGender.FEMME}</td>
                                <td className="p-4 text-center font-black text-slate-400">{(stats.byGender as any).AUTRE || 0}</td>
                                <td className="p-4 text-right font-black text-emerald-400 text-lg">{stats.byGender.TOTAL}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DemographicTable;
