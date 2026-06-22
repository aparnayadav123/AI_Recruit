import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { CandidateHistory as CandidateHistoryType, JobApplication } from '../types';
import { formatCandidateId } from '../utils';
import {
    ChevronLeft, Briefcase, CheckCircle2, XCircle, Clock, Calendar,
    Loader2, History, Star, User, TrendingUp
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700',
    SHORTLISTED: 'bg-amber-100 text-amber-700',
    HIRED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
    WITHDRAWN: 'bg-slate-100 text-slate-500',
    NOT_ELIGIBLE: 'bg-slate-100 text-slate-500',
};

const OUTCOME_STYLES: Record<string, string> = {
    PASS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    FAIL: 'bg-rose-100 text-rose-700 border-rose-200',
    HOLD: 'bg-amber-100 text-amber-700 border-amber-200',
    PENDING: 'bg-slate-50 text-slate-400 border-slate-200',
};

const fmtDate = (d?: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; tone: string }> =
    ({ icon, label, value, tone }) => (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
            <div>
                <div className="text-lg font-bold text-slate-800 leading-none">{value}</div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
            </div>
        </div>
    );

const ApplicationCard: React.FC<{ app: JobApplication }> = ({ app }) => {
    const stages = app.stages || [];
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                        <span className="font-semibold text-slate-800">{app.jobTitle || app.jobId}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Applied {fmtDate(app.appliedDate)}</span>
                        {app.source && <span>· {app.source}</span>}
                        {typeof app.matchScore === 'number' && (
                            <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                                <Star className="h-3 w-3" /> {app.matchScore}% match
                            </span>
                        )}
                    </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[app.status] || 'bg-slate-100 text-slate-600'}`}>
                    {app.status?.replace(/_/g, ' ')}
                </span>
            </div>

            {app.status === 'REJECTED' && (app.rejectionReason || app.rejectedDate) && (
                <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                    <span className="font-semibold">Rejected:</span> {app.rejectionReason || 'Reason not recorded'}
                    {app.rejectedBy ? ` · by ${app.rejectedBy}` : ''}{app.rejectedDate ? ` · ${fmtDate(app.rejectedDate)}` : ''}
                </div>
            )}

            {stages.length > 0 && (
                <div className="mt-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Interview Timeline</div>
                    <div className="flex flex-wrap items-center gap-2">
                        {stages.map((s, i) => (
                            <div key={i} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${OUTCOME_STYLES[s.outcome || 'PENDING']}`}>
                                <div className="font-semibold">{s.name}</div>
                                <div className="opacity-80">
                                    {s.outcome || 'PENDING'}{s.rating ? ` · ★${s.rating}` : ''}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CandidateHistory: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<CandidateHistoryType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/candidates/${id}/history`);
                if (!cancelled) setData(res.data);
            } catch (e: any) {
                if (!cancelled) setError(e?.response?.data?.message || 'Failed to load candidate history.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading history…
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-6">
                <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error || 'No data.'}</div>
            </div>
        );
    }

    const c = data.candidate;
    const apps = data.applications || [];
    const interviews = data.interviews || [];

    return (
        <div className="mx-auto max-w-5xl p-6">
            <button onClick={() => navigate(`/candidates/${id}`)} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
                <ChevronLeft className="h-4 w-4" /> Back to profile
            </button>

            {/* Header */}
            <div className="mb-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
                    {c?.name ? c.name.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-800">{c?.name || 'Candidate'}</h1>
                        {c?.sequenceId != null && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                {formatCandidateId(c.sequenceId)}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-slate-500">{c?.role || '—'} · {c?.email}</div>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700">
                    <History className="h-4 w-4" />
                    <span className="text-sm font-semibold">Candidate History</span>
                </div>
            </div>

            {/* Summary */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={<Briefcase className="h-4 w-4 text-indigo-600" />} label="Applications" value={data.totalApplications} tone="bg-indigo-50" />
                <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Hires" value={(data.hires || []).length} tone="bg-emerald-50" />
                <StatCard icon={<XCircle className="h-4 w-4 text-rose-600" />} label="Rejections" value={(data.rejections || []).length} tone="bg-rose-50" />
                <StatCard icon={<Clock className="h-4 w-4 text-blue-600" />} label="Interviews" value={interviews.length} tone="bg-blue-50" />
            </div>

            {/* Applications across jobs/time */}
            <section className="mb-8">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                    <TrendingUp className="h-4 w-4" /> Application History ({apps.length})
                </h2>
                {apps.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                        No applications recorded yet for this candidate.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {apps.map((a) => <ApplicationCard key={a.id} app={a} />)}
                    </div>
                )}
            </section>

            {/* Scheduled interviews */}
            {interviews.length > 0 && (
                <section>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                        <Clock className="h-4 w-4" /> Scheduled Interviews ({interviews.length})
                    </h2>
                    <div className="space-y-2">
                        {interviews.map((iv) => (
                            <div key={iv.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                <div>
                                    <div className="font-semibold text-slate-800">{iv.type || 'Interview'}</div>
                                    <div className="text-[12px] text-slate-500">
                                        {fmtDate(iv.startTime)} · {iv.interviewer || 'Unassigned'}
                                    </div>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                    {iv.status || 'Scheduled'}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default CandidateHistory;
