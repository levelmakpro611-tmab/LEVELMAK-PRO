import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, BookOpen, Zap, Award, Clock } from 'lucide-react';
import { AdminStats } from '../../types';

interface StatisticsPanelProps {
    stats: AdminStats;
    period: 'day' | 'week' | 'month' | 'year';
    onPeriodChange: (period: 'day' | 'week' | 'month' | 'year') => void;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ stats, period, onPeriodChange }) => {
    // Prepare data for charts with gradient fills
    const userTrendData = [
        { name: 'Aujourd\'hui', value: stats.newUsersToday },
        { name: 'Cette semaine', value: stats.newUsersWeek },
        { name: 'Ce mois', value: stats.newUsersMonth },
        { name: 'Cette année', value: stats.newUsersYear }
    ];

    const activityData = [
        { name: 'Quiz', value: stats.quizzesGenerated, today: stats.quizzesToday },
        { name: 'Flashcards', value: stats.flashcardsCreated, today: stats.flashcardsToday },
        { name: 'Histoires', value: stats.storiesWritten, today: stats.storiesToday },
        { name: 'Livres', value: stats.booksRead, today: stats.booksToday }
    ];

    const engagementData = [
        { name: 'Actifs', value: stats.activeUsers },
        { name: 'Inactifs', value: stats.totalUsers - stats.activeUsers }
    ];

    return (
        <div className="space-y-6">
            {/* Header with Period Selector */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <TrendingUp className="text-blue-400" />
                    Analyses Détaillées
                </h3>
                <div className="flex gap-1 bg-black/20 p-1 rounded-xl">
                    {(['day', 'week', 'month', 'year'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => onPeriodChange(p)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${period === p
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {p === 'day' && 'Jour'}
                            {p === 'week' && 'Semaine'}
                            {p === 'month' && 'Mois'}
                            {p === 'year' && 'Année'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth Chart */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <h3 className="text-lg font-black text-white mb-6 relative z-10">🚀 Croissance Utilisateurs</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={userTrendData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '10px', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '10px', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(6, 9, 21, 0.9)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        backdropFilter: 'blur(10px)',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: '#fff'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Activity Distribution */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <h3 className="text-lg font-black text-white mb-6 relative z-10">⚡ Activités & Contenu</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activityData} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '10px', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '10px', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(6, 9, 21, 0.9)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        backdropFilter: 'blur(10px)',
                                        fontSize: '12px',
                                        color: '#fff'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                                <Bar dataKey="value" name="Total Globale" fill="url(#statsBarGradient1)" radius={[4, 4, 0, 0]}>
                                    <defs>
                                        <linearGradient id="statsBarGradient1" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8B5CF6" />
                                            <stop offset="100%" stopColor="#6366f1" />
                                        </linearGradient>
                                    </defs>
                                </Bar>
                                <Bar dataKey="today" name="Aujourd'hui" fill="url(#statsBarGradient2)" radius={[4, 4, 0, 0]}>
                                    <defs>
                                        <linearGradient id="statsBarGradient2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ec4899" />
                                            <stop offset="100%" stopColor="#db2777" />
                                        </linearGradient>
                                    </defs>
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Engagement Pie */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    <h3 className="text-lg font-black text-white mb-2 w-full text-left">👥 Taux d'Activité</h3>
                    <div className="h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={engagementData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {engagementData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(6, 9, 21, 0.9)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-white">{stats.averageEngagementRate.toFixed(0)}%</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Actifs</span>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <MetricBox
                        label="Temps d'apprentissage"
                        value={`${stats.totalLearningHours.toFixed(1)}h`}
                        icon={<Clock className="text-green-400" />}
                        trend="+5.2%"
                        color="bg-green-500/10 border-green-500/20"
                    />
                    <MetricBox
                        label="Histoires Créées"
                        value={stats.storiesWritten}
                        icon={<Award className="text-orange-400" />}
                        trend="+12%"
                        color="bg-orange-500/10 border-orange-500/20"
                    />
                    <MetricBox
                        label="Livres Consultés"
                        value={stats.booksRead}
                        icon={<BookOpen className="text-blue-400" />}
                        trend="+8%"
                        color="bg-blue-500/10 border-blue-500/20"
                    />
                    <MetricBox
                        label="Quiz Complétés"
                        value={stats.quizzesGenerated}
                        icon={<Zap className="text-purple-400" />}
                        trend="+24%"
                        color="bg-purple-500/10 border-purple-500/20"
                    />
                </div>
            </div>
        </div>
    );
};

const MetricBox = ({ label, value, icon, trend, color }: any) => (
    <div className={`p-6 rounded-2xl border backdrop-blur-md flex flex-col justify-between ${color} hover:scale-[1.02] transition-transform`}>
        <div className="flex justify-between items-start">
            <div className="p-2 bg-white/10 rounded-lg">{icon}</div>
            <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">{trend}</span>
        </div>
        <div>
            <h4 className="text-2xl font-black text-white mt-4">{value}</h4>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{label}</p>
        </div>
    </div>
);

export default StatisticsPanel;
