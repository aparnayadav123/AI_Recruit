import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { JobApplication } from '../types';
import { Loader2, XCircle, RotateCcw, Search, Filter, Download } from 'lucide-react';

const currentActor = (): string => {
    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u?.name || u?.email || 'HR';
    } catch { return 'HR'; }
};

const fmtDate = (d?: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
};

const RejectedCandidates: React.FC = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState('');
    const [reasonFilter, setReasonFilter] = useState('All');
    const [busy, setBusy] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/applications/rejected');
            setRows(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error(e); setError('Failed to load rejected candidates.'); setRows([]); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const reasons = useMemo(() => {
        const s = new Set<string>();
        rows.forEach(r => { if (r.rejectionReason) s.add(r.rejectionReason); });
        return ['All', ...Array.from(s)];
    }, [rows]);

    const filtered = useMemo(() => rows.filter(r => {
        const matchesReason = reasonFilter === 'All' || r.rejectionReason === reasonFilter;
        const hay = `${r.candidateName || ''} ${r.jobTitle || ''} ${r.rejectionReason || ''}`.toLowerCase();
        return matchesReason && (!q || hay.includes(q.toLowerCase()));
    }), [rows, q, reasonFilter]);

    const exportCsv = () => {
        const headers = ['Candidate', 'Applied Job', 'Rejection Reason', 'Rejected By', 'Rejected Date'];
        const rows = filtered.map(r => [
            r.candidateName || r.candidateId || '',
            r.jobTitle || r.jobId || '',
            r.rejectionReason || '',
            r.rejectedBy || '',
            fmtDate(r.rejectedDate),
        ]);
        const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recruitai-rejected-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const reconsider = async (candidateId: string, jobId: string) => {
        if (!candidateId) return;
        setBusy(candidateId);
        try {
            await api.post(`/candidates/${candidateId}/reconsider`, { jobId, by: currentActor() });
            await load();
        } catch (e: any) {
            alert('Reconsider failed: ' + (e?.response?.data?.message || e?.message || 'error'));
        } finally { setBusy(null); }
    };

    return (
        <div className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                        <XCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Rejected Candidates</h1>
                        <p className="text-sm text-slate-500">Every rejection is preserved — reconsider anyone whose profile now fits.</p>
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
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, job, reason…"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select value={reasonFilter} onChange={e => setReasonFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 py-2 px-3 text-sm">
                        {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>
            ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center text-sm text-slate-400">No rejected candidates found.</div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                    <table className="w-full text-sm border-collapse [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-300">
                        <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-700 font-bold">
                            <tr>
                                <th className="px-4 py-3 text-left">Candidate</th>
                                <th className="px-4 py-3 text-left">Applied Job</th>
                                <th className="px-4 py-3 text-left">Reason</th>
                                <th className="px-4 py-3 text-left">Rejected By</th>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <button onClick={() => navigate(`/candidates/${r.candidateId}/history`)}
                                            className="font-semibold text-slate-800 hover:text-indigo-600">
                                            {r.candidateName || r.candidateId}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{r.jobTitle || r.jobId || '—'}</td>
                                    <td className="px-4 py-3"><span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">{r.rejectionReason || 'Not recorded'}</span></td>
                                    <td className="px-4 py-3 text-slate-600">{r.rejectedBy || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{fmtDate(r.rejectedDate)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            disabled={busy === r.candidateId}
                                            onClick={() => reconsider(r.candidateId, r.jobId)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                                            {busy === r.candidateId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                            Reconsider
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default RejectedCandidates;
