import React, { useEffect, useState } from 'react';
import api from '../api';
import { Loader2, BarChart3, Briefcase, Users, Clock, TrendingUp, XCircle, CheckCircle2 } from 'lucide-react';

interface Overview {
    totalJobs: number;
    totalApplications: number;
    interviewConversionRate: number;
    hiringConversionRate: number;
    rejectionRate: number;
    interviewed: number;
    hired: number;
    rejected: number;
    avgTimeToHireDays: number;
    sourceAnalysis: Record<string, number>;
    departmentHiring: Record<string, number>;
    rejectionReasons: Record<string, number>;
}

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: string; onClick?: () => void }> = ({ icon, label, value, tone, onClick }) => (
    <div 
        className={`rounded-xl border border-slate-300 bg-white p-4 shadow-sm ${onClick ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all' : ''}`}
        onClick={onClick}
    >
        <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-800">{value}</div>
    </div>
);

const BarList: React.FC<{ title: string; data: Record<string, number>; color?: string }> = ({ title, data, color = 'bg-indigo-500' }) => {
    const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
    const max = entries.reduce((m, [, v]) => Math.max(m, v), 0) || 1;
    return (
        <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-700">{title}</h3>
            {entries.length === 0 ? (
                <p className="text-sm text-slate-400">No data yet.</p>
            ) : (
                <div className="space-y-3">
                    {entries.map(([k, v]) => (
                        <div key={k}>
                            <div className="mb-1 flex justify-between text-[12px]"><span className="font-medium text-slate-600">{k}</span><span className="font-bold text-slate-800">{v}</span></div>
                            <div className="h-2 w-full rounded-full bg-slate-100">
                                <div className={`h-2 rounded-full ${color}`} style={{ width: `${(v / max) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Reports: React.FC = () => {
    const [data, setData] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [showApplications, setShowApplications] = useState(false);
    const [applications, setApplications] = useState<any[]>([]);
    const [loadingApps, setLoadingApps] = useState(false);

    const fetchApplications = async () => {
        setLoadingApps(true);
        try {
            const res = await api.get('/applications?size=100&sort=appliedDate,desc');
            setApplications(res.data?.content || []);
        } catch {
            setApplications([]);
        } finally {
            setLoadingApps(false);
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/analytics/overview');
                setData(res.data);
            } catch { setData(null); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <div className="flex h-[60vh] items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading reports…</div>;
    if (!data) return <div className="p-6 text-rose-600">Failed to load reports.</div>;

    return (
        <div className="p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><BarChart3 className="h-5 w-5" /></div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Reports &amp; Analytics</h1>
                    <p className="text-sm text-slate-500">Recruitment funnel, conversion rates, and hiring insights.</p>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <Metric icon={<Briefcase className="h-4 w-4 text-indigo-600" />} label="Total Jobs" value={`${data.totalJobs}`} tone="bg-indigo-50" />
                <Metric icon={<Users className="h-4 w-4 text-blue-600" />} label="Applications" value={`${data.totalApplications}`} tone="bg-blue-50" onClick={() => { setShowApplications(true); fetchApplications(); }} />
                <Metric icon={<TrendingUp className="h-4 w-4 text-violet-600" />} label="Interview Rate" value={`${data.interviewConversionRate}%`} tone="bg-violet-50" />
                <Metric icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Hire Rate" value={`${data.hiringConversionRate}%`} tone="bg-emerald-50" />
                <Metric icon={<XCircle className="h-4 w-4 text-rose-600" />} label="Rejection Rate" value={`${data.rejectionRate}%`} tone="bg-rose-50" />
                <Metric icon={<Clock className="h-4 w-4 text-amber-600" />} label="Avg Time-to-Hire" value={`${data.avgTimeToHireDays}d`} tone="bg-amber-50" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <BarList title="Candidate Source Analysis" data={data.sourceAnalysis} />
                <BarList title="Department Hiring (Hires)" data={data.departmentHiring} color="bg-emerald-500" />
                <BarList title="Rejection Reasons" data={data.rejectionReasons} color="bg-rose-500" />
            </div>

            {showApplications && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in">
                    <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h2 className="text-lg font-bold text-slate-800">Application Details</h2>
                            <button onClick={() => setShowApplications(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-slate-50">
                            {loadingApps ? (
                                <div className="flex items-center justify-center p-10 text-slate-500">
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Fetching applications...
                                </div>
                            ) : applications.length === 0 ? (
                                <div className="text-center p-10 text-slate-500">No applications found.</div>
                            ) : (
                                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Candidate</th>
                                                <th className="px-4 py-3">Applied Job</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {applications.map((app, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-slate-800">{app.candidateName || 'Unknown'}</td>
                                                    <td className="px-4 py-3 text-indigo-600 font-medium">{app.jobTitle || 'Unknown Job'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{app.status}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">{app.appliedDate || app.createdAt ? new Date(app.appliedDate || app.createdAt).toLocaleDateString() : 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
