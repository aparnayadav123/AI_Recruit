import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Job } from '../types';
import { Loader2, Sparkles, TrendingUp, RotateCcw, Star } from 'lucide-react';

interface Suggestion {
    candidateId: string;
    name: string;
    role: string;
    email: string;
    experience: number;
    matchScore: number;
    previouslyRejected: boolean;
    experienceUpgrade: boolean;
    reason: string;
}

const currentActor = (): string => {
    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u?.name || u?.email || 'HR';
    } catch { return 'HR'; }
};

const SuggestedCandidates: React.FC = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [jobId, setJobId] = useState('');
    const [list, setList] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/jobs?size=200');
                const content: Job[] = res.data?.content || res.data || [];
                setJobs(content);
                if (content.length) setJobId(content[0].id);
            } catch { setJobs([]); }
        })();
    }, []);

    useEffect(() => {
        if (!jobId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            if (!cancelled) setError(null);
            try {
                const res = await api.get(`/jobs/${jobId}/suggested-candidates`);
                if (!cancelled) setList(Array.isArray(res.data) ? res.data : []);
            } catch (e) { console.error(e); if (!cancelled) { setError('Failed to load suggestions.'); setList([]); } }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [jobId]);

    const assign = async (candidateId: string) => {
        setBusy(candidateId);
        try {
            const role = jobs.find(j => j.id === jobId)?.title;
            await api.post(`/candidates/${candidateId}/reconsider`, { jobId, role, by: currentActor() });
            setList(prev => prev.filter(s => s.candidateId !== candidateId));
        } catch (e: any) {
            alert('Assign failed: ' + (e?.response?.data?.message || e?.message || 'error'));
        } finally { setBusy(null); }
    };

    const scoreTone = (s: number) => s >= 85 ? 'text-emerald-700 bg-emerald-50' : s >= 70 ? 'text-amber-700 bg-amber-50' : 'text-slate-700 bg-slate-100';

    return (
        <div className="p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">AI Suggested Candidates</h1>
                    <p className="text-sm text-slate-500">Rediscover candidates who now fit — including those whose experience has since grown.</p>
                </div>
            </div>

            <div className="mb-5 flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-600">Target job:</label>
                <select value={jobId} onChange={e => setJobId(e.target.value)}
                    className="min-w-[280px] rounded-lg border border-slate-300 py-2 px-3 text-sm">
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}{j.department ? ` · ${j.department}` : ''}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Scanning candidate pool…</div>
            ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
            ) : list.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center text-sm text-slate-400">No suggested candidates for this job yet.</div>
            ) : (
                <div className="space-y-3">
                    {list.map(s => (
                        <div key={s.candidateId} className="flex items-center justify-between rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${scoreTone(s.matchScore)}`}>
                                    {s.matchScore}%
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => navigate(`/candidates/${s.candidateId}/history`)} className="font-semibold text-slate-800 hover:text-indigo-600">{s.name}</button>
                                        {s.experienceUpgrade && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><TrendingUp className="h-3 w-3" /> Experience Upgrade</span>
                                        )}
                                        {s.previouslyRejected && !s.experienceUpgrade && (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Previously Rejected</span>
                                        )}
                                    </div>
                                    <div className="text-[12px] text-slate-500">{s.role || '—'} · {s.experience}y exp · {s.email}</div>
                                    <div className="mt-1 flex items-center gap-1 text-[12px] text-slate-600"><Star className="h-3 w-3 text-violet-500" /> {s.reason}</div>
                                </div>
                            </div>
                            <button disabled={busy === s.candidateId} onClick={() => assign(s.candidateId)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                                {busy === s.candidateId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                Reconsider for this job
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SuggestedCandidates;
