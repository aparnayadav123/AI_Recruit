import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { JobApplication } from '../types';
import { Loader2, Search, Filter, Download, ClipboardList } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    SCREENING: 'bg-sky-100 text-sky-700',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700',
    SHORTLISTED: 'bg-amber-100 text-amber-700',
    INTERVIEW: 'bg-indigo-100 text-indigo-700',
    OFFER: 'bg-violet-100 text-violet-700',
    HIRED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
    WITHDRAWN: 'bg-slate-100 text-slate-500',
    NOT_ELIGIBLE: 'bg-slate-100 text-slate-500',
};

const fmtDate = (d?: string) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
};

const ApplicationTracker: React.FC = () => {
    const navigate = useNavigate();
    const [apps, setApps] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get('/applications?size=2000&sortBy=appliedDate&sortDir=desc');
                const data: JobApplication[] = res.data?.content || res.data || [];
                setApps(data.filter(a => !a.deleted));
            } catch (e) { console.error(e); setError('Failed to load applications.'); setApps([]); }
            finally { setLoading(false); }
        })();
    }, []);

    const statuses = useMemo(() => {
        const s = new Set<string>();
        apps.forEach(a => { if (a.status) s.add(a.status); });
        return ['All', ...Array.from(s)];
    }, [apps]);

    const filtered = useMemo(() => apps.filter(a => {
        const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
        const hay = `${a.candidateName || ''} ${a.jobTitle || ''} ${a.jobId || ''} ${a.status || ''} ${a.stage || ''}`.toLowerCase();
        return matchesStatus && (!q || hay.includes(q.toLowerCase()));
    }), [apps, q, statusFilter]);

    const exportCsv = () => {
        const headers = ['Candidate', 'Job', 'Status', 'Current Stage', 'Match %', 'Source', 'Applied Date', 'Rejection Reason', 'Rejected By', 'Hired Date'];
        const rows = filtered.map(a => [
            a.candidateName || a.candidateId || '',
            a.jobTitle || a.jobId || '',
            a.status || '',
            a.stage || '',
            a.matchScore != null ? `${a.matchScore}%` : '',
            a.source || '',
            fmtDate(a.appliedDate),
            a.rejectionReason || '',
            a.rejectedBy || '',
            fmtDate(a.hiredDate),
        ]);
        const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
        // BOM so Excel reads UTF-8 correctly.
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `recruitai-applications-${stamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                        <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Application Tracker</h1>
                        <p className="text-sm text-slate-500">Every application across all candidates and jobs — one source of truth.</p>
                    </div>
                </div>
                <button
                    onClick={exportCsv}
                    disabled={filtered.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                    <Download className="h-4 w-4" /> Export to Excel (CSV)
                </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search candidate, job, status, stage…"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 py-2 px-3 text-sm">
                        {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                </div>
                <span className="text-[12px] font-semibold text-slate-500">{filtered.length} of {apps.length}</span>
            </div>

            {loading ? (
                <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading applications…</div>
            ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center text-sm text-slate-400">No applications found.</div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
                    <table className="w-full text-sm border-collapse [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-300">
                        <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-700 font-bold">
                            <tr>
                                <th className="px-4 py-3 text-left">Candidate</th>
                                <th className="px-4 py-3 text-left">Job</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Stage</th>
                                <th className="px-4 py-3 text-left">Match</th>
                                <th className="px-4 py-3 text-left">Source</th>
                                <th className="px-4 py-3 text-left">Applied</th>
                                <th className="px-4 py-3 text-left">Rejection Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <button onClick={() => a.candidateId && navigate(`/candidates/${a.candidateId}/history`)}
                                            className="font-semibold text-slate-800 hover:text-indigo-600">
                                            {a.candidateName || a.candidateId || '—'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{a.jobTitle || a.jobId || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${STATUS_STYLES[a.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {a.status?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{a.stage || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600">{a.matchScore != null ? `${a.matchScore}%` : '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{a.source || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{fmtDate(a.appliedDate) || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{a.rejectionReason || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ApplicationTracker;
