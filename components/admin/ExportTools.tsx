import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Database, ShieldCheck, Loader, ArrowRight, FileJson, Table, Users } from 'lucide-react';
import { exportUserData, exportSystemLogs, exportDemographicData } from '../../services/adminService';

interface ExportToolsProps {
    stats?: any; // Assuming these are optional props based on the instruction's signature change
    users?: any[];
    comments?: any[];
    period?: string;
    demographicStats?: any;
}

const ExportTools: React.FC<ExportToolsProps> = ({ demographicStats }) => {
    const [loading, setLoading] = useState<string | null>(null);

    const handleExport = async (type: 'users' | 'logs' | 'demographics', format: 'csv' | 'json') => {
        setLoading(`${type}-${format}`);
        try {
            let data;
            if (type === 'users') {
                data = await exportUserData();
            } else if (type === 'logs') {
                data = await exportSystemLogs();
            } else { // type === 'demographics'
                data = await exportDemographicData(demographicStats, format); // Pass demographicStats to the service
            }
            if (data) {
                // The service handles download for demographic, this might be redundant or needed for others
                // exportDemographicData returns void, so data is undefined. 
                // We need to adjust logic. 
                // Actually exportUserData and exportSystemLogs returned data, but exportDemographicData handles download internally.
                // So we only call downloadFile if data is returned.
                downloadFile(data, `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`, format);
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Erreur lors de l\'exportation');
        } finally {
            setLoading(null);
        }
    };

    const downloadFile = (data: any[], filename: string, format: 'csv' | 'json') => {
        let content = '';
        let type = '';

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            type = 'application/json';
        } else {
            // Simple CSV conversion
            if (data && data.length > 0) {
                const headers = Object.keys(data[0]).join(',');
                const rows = data.map(row => Object.values(row).map(value =>
                    typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
                ).join(','));
                content = [headers, ...rows].join('\n');
            }
            type = 'text/csv';
        }

        const blob = new Blob([content], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

                <div className="flex gap-4 relative z-10">
                    <ExportButton
                        label="CSV"
                        format="Tableur"
                        icon={<FileSpreadsheet size={20} />}
                        onClick={() => handleExport('users', 'csv')}
                        isLoading={loading === 'users-csv'}
                        variant="blue"
                    />
                    <ExportButton
                        label="JSON"
                        format="Développeur"
                        icon={<FileText size={20} />}
                        onClick={() => handleExport('users', 'json')}
                        isLoading={loading === 'users-json'}
                        variant="purple"
                    />
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

                <div className="flex gap-4 relative z-10">
                    <ExportButton
                        label="CSV"
                        format="Rapport"
                        icon={<FileSpreadsheet size={20} />}
                        onClick={() => handleExport('logs', 'csv')}
                        isLoading={loading === 'logs-csv'}
                        variant="green"
                    />
                    <ExportButton
                        label="JSON"
                        format="Archive"
                        icon={<FileText size={20} />}
                        onClick={() => handleExport('logs', 'json')}
                        isLoading={loading === 'logs-json'}
                        variant="orange"
                    />
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

                <div className="flex gap-4 relative z-10">
                    <ExportButton
                        label="CSV"
                        format="Analyse"
                        icon={<Table size={20} />}
                        onClick={() => handleExport('demographics', 'csv')}
                        isLoading={loading === 'demographics-csv'}
                        variant="blue" // Using blue for consistency, could be a new color
                    />
                    <ExportButton
                        label="JSON"
                        format="Brut"
                        icon={<FileJson size={20} />}
                        onClick={() => handleExport('demographics', 'json')}
                        isLoading={loading === 'demographics-json'}
                        variant="purple" // Using purple for consistency, could be a new color
                    />
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
