import React, { useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, BookOpen, Zap, Award, Clock, Activity, Sparkles, Download, Loader } from 'lucide-react';
import { AdminStats } from '../../types';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StatisticsPanelProps {
    stats: AdminStats;
    period: 'day' | 'week' | 'month' | 'year';
    onPeriodChange: (period: 'day' | 'week' | 'month' | 'year') => void;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ stats, period, onPeriodChange }) => {
    // Real data from AdminStats
    const flowData = useMemo(() => stats.flowData || [], [stats.flowData]);

    const growthCurveData = useMemo(() => stats.growthData || [], [stats.growthData]);

    const userTrendData = [
        { name: "Aujourd'hui", value: stats.newUsersToday },
        { name: 'Cette Semaine', value: stats.newUsersWeek },
        { name: 'Ce Mois', value: stats.newUsersMonth },
        { name: 'Cette Année', value: stats.newUsersYear },
    ];

    const activityData = [
        { name: 'Quiz', value: stats.quizzesGenerated, today: stats.quizzesToday },
        { name: 'Flashcards', value: stats.flashcardsCreated, today: stats.flashcardsToday },
        { name: 'Histoires', value: stats.storiesWritten, today: stats.storiesToday },
        { name: 'Livres', value: stats.booksRead, today: stats.booksToday },
    ];

    const engagementData = [
        { name: 'Moyenne Engagement', value: stats.averageEngagementRate },
        { name: 'Heures Apprentissage', value: stats.totalLearningHours },
    ];

    const [isExportingCSV, setIsExportingCSV] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    // Export handler
    const handleExportStats = async () => {
        if (!stats || stats.totalUsers === 0) {
            alert('Pas de données à exporter');
            return;
        }
        setIsExportingCSV(true);
        try {
            const csvRows = [
                'Métrique,Valeur',
                `Utilisateurs Totaux,${stats.totalUsers}`,
                `Utilisateurs Actifs,${stats.activeUsers}`,
                `Nouveaux Aujourd'hui,${stats.newUsersToday}`,
                `Nouveaux Semaine,${stats.newUsersWeek}`,
                `Nouveaux Mois,${stats.newUsersMonth}`,
                `Quiz Générés,${stats.quizzesGenerated}`,
                `Flashcards Créées,${stats.flashcardsCreated}`,
                `Histoires Écrites,${stats.storiesWritten}`,
                `Livres Lus,${stats.booksRead}`,
                `Heures d'Apprentissage,${stats.totalLearningHours.toFixed(1)}`,
                `Taux d'Engagement,${stats.averageEngagementRate.toFixed(1)}%`,
            ];
            const csvContent = csvRows.join('\n');
            const filename = `levelmak-stats-${period}-${new Date().toISOString().split('T')[0]}.csv`;

            if ((window as any).Capacitor?.getPlatform() !== 'web' && (window as any).Capacitor?.getPlatform() !== undefined) {
                const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
                const result = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Cache
                });
                await Share.share({
                    title: `Export ${filename}`,
                    text: `Voici l'exportation CSV des statistiques.`,
                    url: result.uri,
                    dialogTitle: 'Partager CSV'
                });
            } else {
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error('Export error:', e);
            alert('Erreur lors de l\'exportation CSV');
        } finally {
            setIsExportingCSV(false);
        }
    };

    const handlePrint = async () => {
        if (!stats || stats.totalUsers === 0) {
            alert('Pas de données à imprimer');
            return;
        }

        if ((window as any).Capacitor?.getPlatform() === 'web' || !(window as any).Capacitor?.getPlatform()) {
            window.print();
            return;
        }

        setIsExportingPDF(true);
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            try {
                doc.addImage('/tmab_logo.png', 'PNG', 14, 5, 25, 25);
            } catch (e) {
                doc.setFontSize(24);
                doc.setTextColor(59, 130, 246);
                doc.text("TMAB", 14, 20);
            }

            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59);
            doc.text(`STATISTIQUES LEVELMAK`, 45, 18);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Période: ${period.toUpperCase()}`, 45, 24);
            doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, 45, 30);
            
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(0.5);
            doc.line(14, 35, 196, 35);

            const statData = [
                ['Utilisateurs Totaux', stats.totalUsers],
                ['Utilisateurs Actifs', stats.activeUsers],
                ["Nouveaux Aujourd'hui", stats.newUsersToday],
                ['Nouveaux Semaine', stats.newUsersWeek],
                ['Nouveaux Mois', stats.newUsersMonth],
                ['Quiz Générés', stats.quizzesGenerated],
                ['Flashcards Créées', stats.flashcardsCreated],
                ['Histoires Écrites', stats.storiesWritten],
                ['Livres Lus', stats.booksRead],
                ["Heures d'Apprentissage", `${stats.totalLearningHours.toFixed(1)}h`],
                ["Taux d'Engagement", `${stats.averageEngagementRate.toFixed(1)}%`]
            ];

            autoTable(doc, {
                startY: 45,
                head: [['Métrique', 'Valeur']],
                body: statData,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246], fontSize: 12 },
                styles: { fontSize: 11, cellPadding: 5 }
            });

            const pdfArray = doc.output('arraybuffer');
            const uint8 = new Uint8Array(pdfArray);
            let binary = "";
            for (let i = 0; i < uint8.byteLength; i++) {
                binary += String.fromCharCode(uint8[i]);
            }
            const base64Data = btoa(binary);
            const filename = `stats_levelmak_${Date.now()}.pdf`;

            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });

            await Share.share({
                title: `Imprimer Stats`,
                text: `Voici le rapport PDF des statistiques.`,
                url: result.uri,
                dialogTitle: 'Partager / Imprimer PDF'
            });
        } catch (e) {
            console.error('Print PDF error:', e);
            alert('Erreur lors de la création du PDF');
        } finally {
            setIsExportingPDF(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Period Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 w-full md:w-auto">
                    <TrendingUp className="text-blue-500" size={18} />
                    Analyses Détaillées
                </h3>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div className="flex gap-1 bg-black/40 p-1 rounded-lg w-full md:w-auto">
                        {(['day', 'week', 'month', 'year'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => onPeriodChange(p)}
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${period === p
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {p === 'day' && 'Jour'}
                                {p === 'week' && 'Sem.'}
                                {p === 'month' && 'Mois'}
                                {p === 'year' && 'An.'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <button
                            onClick={handlePrint}
                            disabled={isExportingPDF}
                            className="flex-1 md:flex-none flex justify-center items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-slate-700 disabled:opacity-50"
                            title="Imprimer"
                        >
                            {isExportingPDF ? <Loader className="animate-spin" size={14} /> : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            )}
                            Print
                        </button>
                        <button
                            onClick={handleExportStats}
                            disabled={isExportingCSV}
                            className="flex-1 md:flex-none flex justify-center items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                            title="Exporter CSV"
                        >
                            {isExportingCSV ? <Loader className="animate-spin" size={14} /> : <Download size={14} />}
                            CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Stats Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricBox
                    label="Utilisateurs"
                    value={stats.totalUsers}
                    icon={<Users className="text-blue-400" size={16} />}
                    trend={`+${stats.newUsersMonth}`}
                    color="bg-slate-900/50 border-slate-800"
                />
                <MetricBox
                    label="Engagement"
                    value={`${(stats.averageEngagementRate || 0).toFixed(1)}%`}
                    icon={<Zap className="text-yellow-400" size={16} />}
                    trend="Stable"
                    color="bg-slate-900/50 border-slate-800"
                />
                <MetricBox
                    label="Temps Moyen"
                    value={`${((stats.totalLearningHours || 0) / Math.max(1, stats.totalUsers || 0)).toFixed(1)}h`}
                    icon={<Clock className="text-purple-400" size={16} />}
                    trend="+15%"
                    color="bg-slate-900/50 border-slate-800"
                />
                <MetricBox
                    label="Nouveaux (24h)"
                    value={stats.newUsersToday}
                    icon={<Sparkles className="text-green-400" size={16} />}
                    trend="Top"
                    color="bg-slate-900/50 border-slate-800"
                />
            </div>

            {/* Charts Row 1: Flow & Growth */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Flow Chart */}
                <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-800 relative overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <Activity className="text-emerald-500" size={16} />
                        Flux d'Activité en Temps Réel
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={flowData}>
                                <defs>
                                    <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="activity" stroke="#10B981" strokeWidth={2} fill="url(#colorFlow)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Growth Chart */}
                <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-800 relative overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <TrendingUp className="text-blue-500" size={16} />
                        Croissance Cumulative
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthCurveData}>
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} width={30} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }} />
                                <Line type="stepAfter" dataKey="users" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Main Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* User Distribution Chart */}
                <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-800 relative overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <Users className="text-blue-400" size={16} /> Nouveaux Utilisateurs
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={userTrendData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#64748b" style={{ fontSize: '10px' }} axisLine={false} tickLine={false} width={30} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Activity Distribution */}
                <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-800 relative overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <BookOpen className="text-purple-400" size={16} /> Activités & Contenu
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activityData} barSize={12}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#64748b" style={{ fontSize: '10px' }} axisLine={false} tickLine={false} width={30} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <Bar dataKey="value" name="Total Globale" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                                <Bar dataKey="today" name="Aujourd'hui" fill="#ec4899" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Engagement Pie */}
                <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-300 mb-2 w-full text-left">👥 Taux d'Activité</h3>
                    <div className="h-[150px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={engagementData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {engagementData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold text-white">{stats.averageEngagementRate.toFixed(0)}%</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Actifs</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                    <MetricBox
                        label="Histoires Créées"
                        value={stats.storiesWritten}
                        icon={<Award className="text-orange-400" size={16} />}
                        trend="+12%"
                        color="bg-slate-900/50 border-slate-800"
                    />
                    <MetricBox
                        label="Quiz Complétés"
                        value={stats.quizzesGenerated}
                        icon={<Zap className="text-purple-400" size={16} />}
                        trend="+24%"
                        color="bg-slate-900/50 border-slate-800"
                    />
                </div>
            </div>
        </div>
    );
};

const MetricBox = ({ label, value, icon, trend, color }: any) => (
    <div className={`p-4 rounded-xl border flex flex-col justify-between ${color} hover:bg-slate-800/50 transition-colors`}>
        <div className="flex justify-between items-start mb-2">
            <div className="p-1.5 bg-slate-800 rounded-md border border-slate-700">{icon}</div>
            <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{trend}</span>
        </div>
        <div>
            <h4 className="text-lg font-bold text-white">{value}</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{label}</p>
        </div>
    </div>
);

export default StatisticsPanel;
