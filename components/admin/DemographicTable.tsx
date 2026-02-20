import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, User, UserCheck } from 'lucide-react';

interface DemographicStats {
    byGender: { HOMME: number; FEMME: number; TOTAL: number };
    byAge: {
        '15-18': number;
        '19-23': number;
        '24+': number;
        'unknown': number;
        total: number;
    };
    crossTable: { ageRange: string; HOMME: number; FEMME: number; total: number }[];
}

interface DemographicTableProps {
    stats: DemographicStats | null;
}

const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B'];

const DemographicTable: React.FC<DemographicTableProps> = ({ stats }) => {
    if (!stats) return <div className="p-8 text-center text-slate-400">Chargement des données démographiques...</div>;

    const genderData = [
        { name: 'Hommes', value: stats.byGender.HOMME },
        { name: 'Femmes', value: stats.byGender.FEMME }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-6 rounded-3xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                    <Users size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white">Démographie Utilisateurs</h2>
                    <p className="text-slate-400 font-medium">Analyse de la répartition par âge et sexe</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gender Distribution Pie Chart */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
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
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
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
                                <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Cross Table */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-lg font-black text-white">Tableau Détaillé</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black/20 text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="p-4">Tranche d'Âge</th>
                                <th className="p-4 text-center text-blue-400">Hommes</th>
                                <th className="p-4 text-center text-pink-400">Femmes</th>
                                <th className="p-4 text-right text-white">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats.crossTable.map((row, index) => (
                                <tr key={index} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-bold text-slate-200">
                                        <span className={`px-2 py-1 rounded-lg text-xs ${row.ageRange === 'Non spécifié' ? 'bg-slate-700' : 'bg-primary/20 text-primary-light'}`}>
                                            {row.ageRange}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center font-bold text-slate-300">{row.HOMME}</td>
                                    <td className="p-4 text-center font-bold text-slate-300">{row.FEMME}</td>
                                    <td className="p-4 text-right font-black text-white">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-white/5">
                            <tr>
                                <td className="p-4 font-black text-white">TOTAL</td>
                                <td className="p-4 text-center font-black text-blue-400">{stats.byGender.HOMME}</td>
                                <td className="p-4 text-center font-black text-pink-400">{stats.byGender.FEMME}</td>
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
