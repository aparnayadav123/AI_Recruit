import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { 
    CheckCircle2, AlertCircle, Loader2, ArrowLeft, RefreshCw, 
    Sparkles, Hash, Shuffle, Terminal, Layers
} from 'lucide-react';

interface BatchMaintenanceProps {
    action: 'rescore-all' | 'deep-rematch' | 'renumber';
}

const META = {
    'rescore-all': {
        title: 'Rescore All Candidates',
        subtitle: 'Recomputes ATS auto-match and fit-score formula across every candidate in the database.',
        endpoint: '/api/candidates/rescore-all',
        icon: Sparkles,
        iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        badge: '7.2.16 Fit-Score Batch Calculation',
    },
    'deep-rematch': {
        title: 'Deep Rematch All Candidates',
        subtitle: 'Re-assigns every candidate to their highest-scoring Open/Active job across the entire system.',
        endpoint: '/api/candidates/deep-rematch',
        icon: Shuffle,
        iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
        badge: '7.2.16 Global Job Rematch',
    },
    'renumber': {
        title: 'Renumber Candidate Sequence IDs',
        subtitle: 'Performs safe two-pass renumbering of sequenceIds (CAN0001, CAN0002...) in createdAt order without modifying MongoDB ObjectIds.',
        endpoint: '/api/candidates/renumber',
        icon: Hash,
        iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        badge: '7.2.16 Atomic Sequence Reset',
    },
};

const BatchMaintenance: React.FC<BatchMaintenanceProps> = ({ action }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const meta = META[action] || META['rescore-all'];
    const Icon = meta.icon;

    const [loading, setLoading] = useState<boolean>(true);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [executedAt, setExecutedAt] = useState<string>('');

    const runMaintenance = async () => {
        setLoading(true);
        setError(null);
        try {
            // First try POST as documented, fallback to GET if needed
            let response;
            try {
                response = await api.post(`/candidates/${action}`);
            } catch (err: any) {
                if (err.response?.status === 405) {
                    response = await api.get(`/candidates/${action}`);
                } else {
                    throw err;
                }
            }
            setResult(response.data);
            setExecutedAt(new Date().toLocaleTimeString());
        } catch (err: any) {
            console.error(`Failed to execute batch maintenance for ${action}:`, err);
            const msg = err.response?.data?.message || err.message || 'Operation failed';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runMaintenance();
    }, [action]);

    return (
        <div className="min-h-[85vh] flex flex-col justify-center items-center p-6 bg-slate-50/50">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
                {/* Header banner */}
                <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                            <Icon className="w-6 h-6 text-indigo-300" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-1">
                                {meta.badge}
                            </div>
                            <h1 className="text-xl font-bold text-white tracking-tight">{meta.title}</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/candidates')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Candidates
                    </button>
                </div>

                {/* Body content */}
                <div className="p-6 space-y-6">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        {meta.subtitle}
                    </p>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">POST</span>
                            <span className="text-slate-800 font-semibold">{meta.endpoint}</span>
                        </div>
                        <span className="text-slate-400">HTTP/1.1</span>
                    </div>

                    {/* Status State */}
                    {loading && (
                        <div className="p-8 text-center rounded-xl bg-slate-50/80 border border-dashed border-slate-200">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-800">Executing Maintenance Routine…</h3>
                            <p className="text-xs text-slate-500 mt-1">Processing candidate database records. Please wait.</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="p-5 rounded-xl bg-red-50/80 border border-red-200 text-red-900 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-red-900">Execution Error</h3>
                                <p className="text-xs text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {!loading && !error && result && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                            Status: 200 OK — Succeeded
                                        </div>
                                        <div className="text-sm font-semibold text-emerald-950 mt-0.5">
                                            {result.message || 'Operation executed successfully.'}
                                        </div>
                                    </div>
                                </div>
                                {executedAt && (
                                    <div className="text-right text-[11px] text-emerald-700">
                                        Executed: <span className="font-semibold">{executedAt}</span>
                                    </div>
                                )}
                            </div>

                            {/* Response Payload Viewer */}
                            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900">
                                <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                                        Response Payload (JSON)
                                    </div>
                                    <span className="text-[10px] text-emerald-400 font-mono">HTTP 200</span>
                                </div>
                                <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={runMaintenance}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Re-run Operation
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/candidates')}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition"
                        >
                            <Layers className="w-3.5 h-3.5" />
                            View Candidates List
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchMaintenance;
