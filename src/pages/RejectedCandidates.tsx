import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { JobApplication, Candidate } from '../types';
import {
    Loader2,
    XCircle,
    RotateCcw,
    Search,
    Filter,
    Download,
    User,
    Mail,
    Phone,
    Briefcase,
    Calendar,
    Clock,
    UserCheck,
    History,
    AlertCircle,
    ArrowUpDown,
    RefreshCw,
    X,
    ExternalLink,
    ShieldAlert,
    Users
} from 'lucide-react';

interface EnrichedRejectedCandidate {
    id: string;
    candidateId: string;
    sequenceId?: string;
    candidateName: string;
    email?: string;
    phone?: string;
    role?: string;
    jobId?: string;
    jobTitle: string;
    rejectionReason: string;
    rejectedBy: string;
    rejectedDate?: string;
    source?: string;
    experience?: number;
    skills?: string[];
}

const currentActor = (): string => {
    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u?.name || u?.email || 'Hiring Manager';
    } catch {
        return 'Hiring Manager';
    }
};

const fmtDateDetails = (d?: string) => {
    if (!d) return { date: '—', time: '', relative: 'Not recorded' };
    try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return { date: d, time: '', relative: '' };

        const date = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const time = dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const now = new Date();
        const diffMs = now.getTime() - dateObj.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        let relative = '';
        if (diffDays === 0) relative = 'Today';
        else if (diffDays === 1) relative = 'Yesterday';
        else if (diffDays > 1 && diffDays < 30) relative = `${diffDays} days ago`;
        else if (diffDays >= 30 && diffDays < 365) relative = `${Math.floor(diffDays / 30)} mo ago`;
        else relative = `${Math.floor(diffDays / 365)} yr ago`;

        return { date, time, relative };
    } catch {
        return { date: d, time: '', relative: '' };
    }
};

const getAvatarColor = (name: string) => {
    const colors = [
        'bg-rose-100 text-rose-700 border-rose-200',
        'bg-indigo-100 text-indigo-700 border-indigo-200',
        'bg-amber-100 text-amber-700 border-amber-200',
        'bg-emerald-100 text-emerald-700 border-emerald-200',
        'bg-blue-100 text-blue-700 border-blue-200',
        'bg-purple-100 text-purple-700 border-purple-200',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
};

const RejectedCandidates: React.FC = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState<EnrichedRejectedCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [reasonFilter, setReasonFilter] = useState('All');
    const [reviewerFilter, setReviewerFilter] = useState('All');
    const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'reason-asc'>('date-desc');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Reconsider confirmation modal state
    const [reconsiderTarget, setReconsiderTarget] = useState<EnrichedRejectedCandidate | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [appsRes, candsRes] = await Promise.all([
                api.get('/applications/rejected').catch(() => ({ data: [] })),
                api.get('/candidates?size=1000').catch(() => ({ data: [] })),
            ]);

            const apps: JobApplication[] = Array.isArray(appsRes.data) ? appsRes.data : [];
            const cands: Candidate[] = Array.isArray(candsRes.data)
                ? candsRes.data
                : (candsRes.data?.content || []);

            const candMap = new Map<string, Candidate>();
            cands.forEach(c => {
                if (c.id) candMap.set(c.id, c);
                if ((c as any)._id) candMap.set((c as any)._id, c);
            });

            const merged: EnrichedRejectedCandidate[] = [];
            const seenCandidateIds = new Set<string>();

            // 1. Process application records marked REJECTED
            apps.forEach(app => {
                const c = candMap.get(app.candidateId);
                const candId = app.candidateId || c?.id || app.id;
                seenCandidateIds.add(candId);

                const seqNum = c?.sequenceId;
                const seqStr = seqNum != null ? `CAN${String(seqNum).padStart(3, '0')}` : undefined;

                merged.push({
                    id: app.id || `app-${candId}`,
                    candidateId: candId,
                    sequenceId: seqStr,
                    candidateName: app.candidateName || c?.name || 'Unknown Candidate',
                    email: c?.email,
                    phone: c?.phone,
                    role: c?.role,
                    jobId: app.jobId || c?.jobId,
                    jobTitle: app.jobTitle || c?.role || 'General Application',
                    rejectionReason: app.rejectionReason || c?.rejectionReason || 'Profile criteria not met',
                    rejectedBy: app.rejectedBy || c?.rejectedBy || 'Hiring Team',
                    rejectedDate: app.rejectedDate || c?.rejectedDate || (c as any)?.updatedAt || c?.appliedDate || c?.createdAt || app.appliedDate || app.updatedAt,
                    source: app.source || c?.source,
                    experience: c?.experience,
                    skills: c?.skills || [],
                });
            });

            // 2. Also incorporate candidates marked 'Rejected' who might not have an application record yet
            cands.filter(c => c.status === 'Rejected' && !seenCandidateIds.has(c.id) && !seenCandidateIds.has((c as any)._id)).forEach(c => {
                const candId = c.id || (c as any)._id;
                const seqNum = c.sequenceId;
                const seqStr = seqNum != null ? `CAN${String(seqNum).padStart(3, '0')}` : undefined;

                merged.push({
                    id: `cand-${candId}`,
                    candidateId: candId,
                    sequenceId: seqStr,
                    candidateName: c.name || 'Unknown Candidate',
                    email: c.email,
                    phone: c.phone,
                    role: c.role,
                    jobId: c.jobId,
                    jobTitle: c.role || 'General Application',
                    rejectionReason: c.rejectionReason || 'Profile criteria not met',
                    rejectedBy: c.rejectedBy || 'Hiring Team',
                    rejectedDate: c.rejectedDate || (c as any)?.updatedAt || c.appliedDate || c.createdAt,
                    source: c.source,
                    experience: c.experience,
                    skills: c.skills || [],
                });
            });

            setRows(merged);
        } catch (e) {
            console.error(e);
            setError('Failed to load rejected candidates.');
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // Summary KPIs
    const stats = useMemo(() => {
        const total = rows.length;
        const now = new Date();
        const thisMonth = rows.filter(r => {
            if (!r.rejectedDate) return false;
            const d = new Date(r.rejectedDate);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length;

        // Reason counts
        const reasonFreq: Record<string, number> = {};
        rows.forEach(r => {
            const reason = r.rejectionReason || 'Unspecified';
            reasonFreq[reason] = (reasonFreq[reason] || 0) + 1;
        });

        let topReason = 'None';
        let maxCount = 0;
        Object.entries(reasonFreq).forEach(([reason, count]) => {
            if (count > maxCount) {
                maxCount = count;
                topReason = reason;
            }
        });

        // Reviewers
        const reviewers = new Set<string>();
        rows.forEach(r => {
            if (r.rejectedBy) reviewers.add(r.rejectedBy);
        });

        return {
            total,
            thisMonth,
            topReason: maxCount > 0 ? `${topReason} (${Math.round((maxCount / (total || 1)) * 100)}%)` : '—',
            reviewerCount: reviewers.size,
        };
    }, [rows]);

    // Unique Reasons & Reviewers for Filter Dropdowns
    const availableReasons = useMemo(() => {
        const s = new Set<string>();
        rows.forEach(r => { if (r.rejectionReason) s.add(r.rejectionReason); });
        return ['All', ...Array.from(s).sort()];
    }, [rows]);

    const availableReviewers = useMemo(() => {
        const s = new Set<string>();
        rows.forEach(r => { if (r.rejectedBy) s.add(r.rejectedBy); });
        return ['All', ...Array.from(s).sort()];
    }, [rows]);

    // Filtered & Sorted Rows
    const filteredRows = useMemo(() => {
        return rows
            .filter(r => {
                const matchesReason = reasonFilter === 'All' || r.rejectionReason === reasonFilter;
                const matchesReviewer = reviewerFilter === 'All' || r.rejectedBy === reviewerFilter;

                const q = searchQuery.toLowerCase().trim();
                const hay = [
                    r.candidateName,
                    r.sequenceId,
                    r.email,
                    r.phone,
                    r.jobTitle,
                    r.rejectionReason,
                    r.rejectedBy,
                ].filter(Boolean).join(' ').toLowerCase();

                const matchesQuery = !q || hay.includes(q);
                return matchesReason && matchesReviewer && matchesQuery;
            })
            .sort((a, b) => {
                if (sortBy === 'date-desc') {
                    const da = a.rejectedDate ? new Date(a.rejectedDate).getTime() : 0;
                    const db = b.rejectedDate ? new Date(b.rejectedDate).getTime() : 0;
                    return db - da;
                }
                if (sortBy === 'date-asc') {
                    const da = a.rejectedDate ? new Date(a.rejectedDate).getTime() : 0;
                    const db = b.rejectedDate ? new Date(b.rejectedDate).getTime() : 0;
                    return da - db;
                }
                if (sortBy === 'name-asc') {
                    return (a.candidateName || '').localeCompare(b.candidateName || '');
                }
                if (sortBy === 'reason-asc') {
                    return (a.rejectionReason || '').localeCompare(b.rejectionReason || '');
                }
                return 0;
            });
    }, [rows, searchQuery, reasonFilter, reviewerFilter, sortBy]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setReasonFilter('All');
        setReviewerFilter('All');
        setSortBy('date-desc');
    };

    const hasActiveFilters = searchQuery !== '' || reasonFilter !== 'All' || reviewerFilter !== 'All' || sortBy !== 'date-desc';

    // Export to Excel / CSV
    const exportCsv = () => {
        const headers = [
            'Candidate ID',
            'Candidate Name',
            'Email',
            'Phone',
            'Applied Job',
            'Rejection Reason',
            'Rejected By',
            'Rejected Date',
            'Rejected Time',
            'Source'
        ];

        const exportData = filteredRows.map(r => {
            const dt = fmtDateDetails(r.rejectedDate);
            return [
                r.sequenceId || r.candidateId,
                r.candidateName,
                r.email || '',
                r.phone || '',
                r.jobTitle || '',
                r.rejectionReason,
                r.rejectedBy,
                dt.date,
                dt.time,
                r.source || 'Direct'
            ];
        });

        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv = [headers, ...exportData].map(row => row.map(esc).join(',')).join('\r\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RecruitAI_Rejected_Candidates_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Execute Reconsideration
    const confirmReconsider = async () => {
        if (!reconsiderTarget) return;
        const candidateId = reconsiderTarget.candidateId;
        const jobId = reconsiderTarget.jobId || '';
        const name = reconsiderTarget.candidateName;

        setBusyId(candidateId);
        try {
            await api.post(`/candidates/${candidateId}/reconsider`, {
                jobId,
                by: currentActor()
            });

            setToastMessage(`✓ ${name} has been successfully restored to the active pipeline (Screening).`);
            setReconsiderTarget(null);
            setTimeout(() => setToastMessage(null), 5000);
            await load();
        } catch (e: any) {
            alert('Reconsideration failed: ' + (e?.response?.data?.message || e?.message || 'Server error'));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-3.5 text-white shadow-xl animate-in slide-in-from-top duration-300">
                    <UserCheck className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-semibold">{toastMessage}</span>
                    <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-sm border border-rose-200">
                        <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-slate-800">Rejected Candidates</h1>
                            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                                {rows.length} Total
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Comprehensive record of rejected profiles with reviewer details and timestamps — reconsider candidates anytime.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-50"
                        title="Reload latest records"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={exportCsv}
                        disabled={filteredRows.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition-all disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" /> Export to Excel (CSV)
                    </button>
                </div>
            </div>

            {/* Top KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Rejected</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                            <XCircle className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-800">{stats.total}</div>
                    <p className="text-xs text-slate-500 mt-1">Preserved in archive</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">This Month</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                            <Calendar className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-800">{stats.thisMonth}</div>
                    <p className="text-xs text-slate-500 mt-1">Current month rejections</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Reason</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <ShieldAlert className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-base font-black text-slate-800 truncate" title={stats.topReason}>
                        {stats.topReason}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Primary rejection category</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Reviewers</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Users className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-800">{stats.reviewerCount}</div>
                    <p className="text-xs text-slate-500 mt-1">Distinct decision makers</p>
                </div>
            </div>

            {/* Filter, Search & Sort Control Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by name, ID (CANxxx), email, job title, reason, or reviewer..."
                            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-9 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter by Rejection Reason */}
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-[170px]">
                            <select
                                value={reasonFilter}
                                onChange={e => setReasonFilter(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-8 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                            >
                                <option value="All">All Reasons ({rows.length})</option>
                                {availableReasons.filter(r => r !== 'All').map(r => {
                                    const count = rows.filter(item => item.rejectionReason === r).length;
                                    return (
                                        <option key={r} value={r}>
                                            {r} ({count})
                                        </option>
                                    );
                                })}
                            </select>
                            <Filter className="absolute right-2.5 top-3 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                        </div>

                        {/* Filter by Rejected By */}
                        <div className="relative min-w-[160px]">
                            <select
                                value={reviewerFilter}
                                onChange={e => setReviewerFilter(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-8 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                            >
                                <option value="All">All Reviewers ({availableReviewers.length - 1})</option>
                                {availableReviewers.filter(r => r !== 'All').map(r => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                            <User className="absolute right-2.5 top-3 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                        </div>

                        {/* Sort Order */}
                        <div className="relative min-w-[170px]">
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as any)}
                                className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-8 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                            >
                                <option value="date-desc">Newest Rejection</option>
                                <option value="date-asc">Oldest Rejection</option>
                                <option value="name-asc">Candidate (A-Z)</option>
                                <option value="reason-asc">Reason (A-Z)</option>
                            </select>
                            <ArrowUpDown className="absolute right-2.5 top-3 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* Filter Summary & Clear */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <div>
                        Showing <span className="font-bold text-slate-800">{filteredRows.length}</span> of{' '}
                        <span className="font-bold text-slate-800">{rows.length}</span> candidates
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" /> Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Table Container */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-slate-200 bg-white">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-600">Loading rejected candidate profiles...</p>
                    <p className="text-xs text-slate-400">Fetching rejection logs, reviewers, and timestamps</p>
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                    <AlertCircle className="h-8 w-8 text-rose-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-rose-800">{error}</p>
                    <button
                        onClick={load}
                        className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                    >
                        Try Again
                    </button>
                </div>
            ) : filteredRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center px-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-3">
                        <Users className="h-7 w-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-700">No rejected candidates found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        {hasActiveFilters
                            ? 'No profiles match your current search query or filter criteria. Try adjusting your filters.'
                            : 'There are currently no candidates in the rejected candidate archive.'}
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                                <tr>
                                    <th scope="col" className="px-5 py-4 min-w-[240px]">Candidate Details</th>
                                    <th scope="col" className="px-5 py-4 min-w-[190px]">Applied Job / Role</th>
                                    <th scope="col" className="px-5 py-4 min-w-[180px]">Rejection Reason</th>
                                    <th scope="col" className="px-5 py-4 min-w-[170px]">Rejected By</th>
                                    <th scope="col" className="px-5 py-4 min-w-[170px]">Date & Time</th>
                                    <th scope="col" className="px-5 py-4 text-right min-w-[150px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredRows.map(r => {
                                    const dt = fmtDateDetails(r.rejectedDate);
                                    const avatarClass = getAvatarColor(r.candidateName);
                                    const initials = getInitials(r.candidateName);

                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                            {/* Candidate Details */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-start gap-3">
                                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-black shadow-sm ${avatarClass}`}>
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <button
                                                                onClick={() => navigate(`/candidates/${r.candidateId}`)}
                                                                className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-sm truncate"
                                                                title="View full candidate profile"
                                                            >
                                                                {r.candidateName}
                                                            </button>
                                                            {r.sequenceId && (
                                                                <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-600">
                                                                    {r.sequenceId}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {r.email && (
                                                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-1 truncate" title={r.email}>
                                                                <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                                                                <span className="truncate">{r.email}</span>
                                                            </div>
                                                        )}

                                                        {r.phone && (
                                                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                                                                <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                                                                <span>{r.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Applied Job */}
                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                                        <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{r.jobTitle}</span>
                                                    </div>
                                                    {r.source && (
                                                        <div className="text-[11px] text-slate-500">
                                                            Source: <span className="font-medium text-slate-700">{r.source}</span>
                                                        </div>
                                                    )}
                                                    {r.experience != null && r.experience > 0 && (
                                                        <div className="text-[10px] text-slate-400">
                                                            {r.experience} {r.experience === 1 ? 'yr' : 'yrs'} total exp
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Rejection Reason */}
                                            <td className="px-5 py-4">
                                                <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/90 px-3 py-1.5 text-rose-700 font-semibold shadow-2xs">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                                                    <span className="text-[11px] tracking-tight">{r.rejectionReason}</span>
                                                </div>
                                            </td>

                                            {/* Rejected By */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                                                        <User className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-800 truncate text-xs" title={r.rejectedBy}>
                                                            {r.rejectedBy}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-medium">
                                                            Reviewer / Recruiter
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date & Time */}
                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                                                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span>{dt.date}</span>
                                                    </div>
                                                    {dt.time && (
                                                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                                                            <Clock className="h-3 w-3 shrink-0" />
                                                            <span>{dt.time}</span>
                                                            {dt.relative && (
                                                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600">
                                                                    {dt.relative}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        disabled={busyId === r.candidateId}
                                                        onClick={() => setReconsiderTarget(r)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 active:bg-indigo-200 transition-all disabled:opacity-50 shadow-2xs"
                                                        title="Restore candidate to active pipeline"
                                                    >
                                                        {busyId === r.candidateId ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <RotateCcw className="h-3.5 w-3.5 text-indigo-600" />
                                                        )}
                                                        Reconsider
                                                    </button>

                                                    <button
                                                        onClick={() => navigate(`/candidates/${r.candidateId}/history`)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-2xs"
                                                        title="View full application history"
                                                    >
                                                        <History className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Reconsider Confirmation Modal */}
            {reconsiderTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                                    <RotateCcw className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800">Reconsider Candidate</h3>
                                    <p className="text-xs text-slate-500">Restore back to active pipeline</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setReconsiderTarget(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="my-5 space-y-3.5 text-xs text-slate-600">
                            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-500">Candidate:</span>
                                    <span className="font-bold text-slate-800">{reconsiderTarget.candidateName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-500">Target Role:</span>
                                    <span className="font-bold text-slate-800">{reconsiderTarget.jobTitle}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-500">Prior Rejection:</span>
                                    <span className="font-bold text-rose-600">{reconsiderTarget.rejectionReason}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-500">Original Reviewer:</span>
                                    <span className="font-medium text-slate-700">{reconsiderTarget.rejectedBy}</span>
                                </div>
                            </div>

                            <p className="text-slate-600 leading-relaxed">
                                Are you sure you want to reconsider <strong>{reconsiderTarget.candidateName}</strong>?
                                This candidate will be moved into <strong>Screening</strong> status and an audit log will be written to document this change.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setReconsiderTarget(null)}
                                disabled={busyId === reconsiderTarget.candidateId}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmReconsider}
                                disabled={busyId === reconsiderTarget.candidateId}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {busyId === reconsiderTarget.candidateId ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reconsidering...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="h-3.5 w-3.5" /> Confirm & Reconsider
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RejectedCandidates;
