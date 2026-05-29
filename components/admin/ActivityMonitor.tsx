import React, { useState, useEffect } from 'react';
import {
    Activity, Shield, User, BookOpen, BrainCircuit, Heart,
    Zap, LogIn, Monitor, Clock, Filter, Search, Download, Printer, RefreshCw
} from 'lucide-react';
import { UserActivity, subscribeToActivities, ActivityType } from '../../services/activityService';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ActivityMonitor: React.FC = () => {
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [filter, setFilter] = useState<ActivityType | 'all'>('all');
    const [search, setSearch] = useState('');
    const [isLive, setIsLive] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToActivities((newActivities) => {
            if (isLive) {
                setActivities(newActivities);
            }
        }, 100);
        return () => unsubscribe();
    }, [isLive]);

    const getIcon = (type: ActivityType) => {
        switch (type) {
            case 'auth': return <LogIn className="text-blue-400" size={18} />;
            case 'quiz': return <BrainCircuit className="text-purple-400" size={18} />;
            case 'library': return <BookOpen className="text-green-400" size={18} />;
            case 'social': return <Heart className="text-pink-400" size={18} />;
            case 'system': return <Shield className="text-slate-400" size={18} />;
            case 'creative': return <Zap className="text-yellow-400" size={18} />;
            default: return <Activity className="text-slate-400" size={18} />;
        }
    };

    const getBadgeColor = (type: ActivityType) => {
        switch (type) {
            case 'auth': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'quiz': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'library': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'social': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
            case 'system': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
            case 'creative': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const filteredActivities = activities.filter(act => {
        const matchesType = filter === 'all' || act.type === filter;
        const matchesSearch = act.userName.toLowerCase().includes(search.toLowerCase()) ||
            act.action.toLowerCase().includes(search.toLowerCase());
        return matchesType && matchesSearch;
    });

    const handleExportPDF = async () => {
        if (filteredActivities.length === 0) {
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
            doc.text(`SPY MODE - ACTIVITÉS`, 45, 18);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Filtre: ${filter.toUpperCase()}`, 45, 24);
            doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, 45, 30);
            
            const tableData = filteredActivities.map(act => [
                new Date(act.timestamp).toLocaleTimeString('fr-FR'),
                act.userName,
                act.type,
                act.action
            ]);
            autoTable(doc, {
                startY: 45,
                head: [['Heure', 'Utilisateur', 'Type', 'Action']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }
            });
            const pdfArray = doc.output('arraybuffer');
            const uint8 = new Uint8Array(pdfArray);
            let binary = "";
            for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
            const base64Data = btoa(binary);
            const filename = `spy_mode_${Date.now()}.pdf`;
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });
            await Share.share({ url: result.uri, dialogTitle: 'Partager / Imprimer PDF' });
        } catch(e) {
            console.error(e);
            alert('Erreur lors de l\'création du PDF');
        } finally {
            setExporting(false);
        }
    };

    const handleExportCSV = async () => {
        if (filteredActivities.length === 0) {
            alert('Pas de données à exporter');
            return;
        }

        setExporting(true);
        try {
            const rows = [
                'Heure,Utilisateur,Type,Action,Détails',
                ...filteredActivities.map(act =>
                    `"${new Date(act.timestamp).toLocaleString('fr-FR')}","${act.userName}","${act.type}","${act.action}","${act.details ? JSON.stringify(act.details).replace(/"/g, '""') : ''}"`
                )
            ];
            const csvContent = rows.join('\n');
            const filename = `spy-mode-${new Date().toISOString().split('T')[0]}.csv`;

            if ((window as any).Capacitor?.getPlatform() !== 'web' && (window as any).Capacitor?.getPlatform() !== undefined) {
                const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
                const result = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Cache
                });
                await Share.share({ url: result.uri, dialogTitle: 'Partager CSV' });
            } else {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
            console.error(e);
            alert('Erreur lors de l\'exportation CSV');
        } finally {
            setExporting(false);
        }
    };

    const handlePrint = handleExportPDF;

    return (
        <div className="space-y-4 flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un utilisateur ou une action..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {(['all', 'auth', 'quiz', 'library', 'social'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${filter === type
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                                }`}
                        >
                            {type === 'all' ? 'Tout' : type}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex justify-end items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isLive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                        <span className="text-xs font-bold">{isLive ? 'EN DIRECT' : 'PAUSE'}</span>
                    </div>
                    <button onClick={() => setIsLive(!isLive)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-400" title={isLive ? 'Mettre en pause' : 'Reprendre'}>
                        {isLive ? <Zap size={18} /> : <Activity size={18} />}
                    </button>
                    <button onClick={handleExportCSV} disabled={exporting} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 disabled:opacity-50" title="Exporter CSV">
                        <Download size={18} />
                    </button>
                    <button onClick={handlePrint} disabled={exporting} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 disabled:opacity-50" title="Imprimer la vue">
                        <Printer size={18} />
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
                        title="Enregistrer en PDF TMAB"
                    >
                        <Download size={14} />
                        PDF
                    </button>
                </div>
            </div>

            {/* Monitor Stream */}
            <div className="flex-1 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden flex flex-col shadow-inner shadow-black/50">
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Monitor size={18} className="text-blue-400" />
                        Flux d'Activités
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{filteredActivities.length} / {activities.length} événements</span>
                        <span className="text-xs text-slate-600 font-mono">{new Date().toLocaleTimeString('fr-FR')}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {filteredActivities.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 py-20">
                            <Activity size={48} className="mb-4" />
                            <p className="font-medium">Aucune activité détectée pour le moment</p>
                            <p className="text-xs mt-1">Les nouvelles activités apparaîtront ici en temps réel</p>
                        </div>
                    ) : (
                        filteredActivities.map((act) => (
                            <div key={act.id} className="group flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
                                {/* Time */}
                                <div className="flex flex-col items-center gap-0.5 min-w-[55px]">
                                    <span className="text-xs font-mono text-slate-400">
                                        {new Date(act.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[10px] text-slate-600 font-mono">
                                        {new Date(act.timestamp).toLocaleTimeString('fr-FR', { second: '2-digit' })}s
                                    </span>
                                </div>

                                {/* Icon */}
                                <div className={`p-2 rounded-lg ${getBadgeColor(act.type)} border`}>
                                    {getIcon(act.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                            {act.userName}
                                        </h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border shrink-0 ml-2 ${getBadgeColor(act.type)}`}>
                                            {act.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 mt-0.5 truncate">{act.action}</p>

                                    {act.details && Object.keys(act.details).length > 0 && (
                                        <div className="mt-2 text-xs text-slate-500 font-mono bg-black/30 p-2 rounded-lg hidden group-hover:block">
                                            {JSON.stringify(act.details, null, 2).replace(/{|}|"/g, '')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityMonitor;
