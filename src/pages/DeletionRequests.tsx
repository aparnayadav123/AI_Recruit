import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Check, X as XIcon, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { useSearchHighlight } from '../hooks/useSearchHighlight';
import { useSearch } from '../contexts/SearchContext';

type DeletionRequest = {
  id: string;
  candidateId: string;
  candidateName: string;
  requestedByEmail: string;
  requestedByName: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  decidedByEmail?: string;
  decidedByName?: string;
  decidedAt?: string;
  decisionNotes?: string;
};

const statusPill = (status: string) => {
  switch (status) {
    case 'PENDING':  return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'APPROVED': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'REJECTED': return 'bg-slate-50 text-slate-600 border-slate-200';
    default:         return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const formatTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const DeletionRequests: React.FC = () => {
  const navigate = useNavigate();
  const { highlightKeyword } = useSearch();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [rejectTarget, setRejectTarget] = useState<DeletionRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Manager-or-admin only. HR users get bounced back to candidates.
  const userRole = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return (u.role || '').toString().toUpperCase();
    } catch { return ''; }
  }, []);
  const canReview = userRole === 'MANAGER' || userRole === 'ADMIN';

  useEffect(() => {
    if (!canReview) {
      navigate('/candidates', { replace: true });
    }
  }, [canReview, navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = filter === 'PENDING'
        ? '/deletion-requests?status=PENDING'
        : '/deletion-requests';
      const res = await api.get(url);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error('Failed to load deletion requests', e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (canReview) fetchRequests(); }, [filter, canReview]);

  useSearchHighlight(highlightKeyword, [requests]);

  const handleApprove = async (req: DeletionRequest) => {
    const ok = window.confirm(
      `Approve deletion of "${req.candidateName}"?\n\nThis is irreversible — the candidate row, resume, applications, and interviews will all be deleted.`
    );
    if (!ok) return;
    setActionBusy(req.id);
    try {
      await api.post(`/deletion-requests/${req.id}/approve`, {});
      await fetchRequests();
    } catch (e: any) {
      alert(`Approve failed: ${e?.response?.data?.message || 'Unknown error'}`);
    } finally {
      setActionBusy(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setActionBusy(rejectTarget.id);
    try {
      await api.post(`/deletion-requests/${rejectTarget.id}/reject`, {
        notes: rejectNotes.trim() || null,
      });
      setRejectTarget(null);
      setRejectNotes('');
      await fetchRequests();
    } catch (e: any) {
      alert(`Reject failed: ${e?.response?.data?.message || 'Unknown error'}`);
    } finally {
      setActionBusy(null);
    }
  };

  if (!canReview) return null;

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Trash2 size={22} className="text-rose-600" />
            Deletion Requests
          </h1>
          <p className="text-[12px] text-slate-600 font-medium mt-1">
            HR submits a request with a reason. You approve to delete the candidate, or reject to keep them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border ${
              filter === 'PENDING' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >Pending ({pendingCount})</button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border ${
              filter === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >All</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl py-16 text-center text-slate-500">
          <AlertCircle size={32} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-bold">
            {filter === 'PENDING' ? 'No pending deletion requests.' : 'No deletion requests yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map(req => (
                <tr key={req.id} className="text-[12px] hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-800">{req.candidateName}</div>
                    <div className="text-[10px] text-slate-500 font-bold">{req.candidateId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-700">{req.requestedByName}</div>
                    <div className="text-[10px] text-slate-500">{req.requestedByEmail}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium text-slate-700 whitespace-pre-wrap break-words">{req.reason}</div>
                    {req.status !== 'PENDING' && req.decisionNotes && (
                      <div className="mt-1 text-[10px] text-slate-500 italic">
                        Manager note: {req.decisionNotes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {formatTime(req.createdAt)}
                    </div>
                    {req.status !== 'PENDING' && req.decidedAt && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        decided {formatTime(req.decidedAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusPill(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {req.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={actionBusy === req.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-[10px] font-black uppercase tracking-widest rounded-lg"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => { setRejectTarget(req); setRejectNotes(''); }}
                          disabled={actionBusy === req.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg"
                        >
                          <XIcon size={12} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        by {req.decidedByName || '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-black text-gray-900 mb-1">Reject Deletion Request</h3>
            <p className="text-[11px] text-slate-600 font-bold mb-4">
              The candidate will <span className="text-emerald-600">not</span> be deleted. The requester sees your reason.
            </p>
            <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Candidate</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{rejectTarget.candidateName}</div>
              <div className="text-[11px] text-slate-600 font-medium mt-2">
                <span className="font-black uppercase text-slate-400 mr-1">HR reason:</span>
                {rejectTarget.reason}
              </div>
            </div>
            <label className="block">
              <span className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">
                Decision notes (optional)
              </span>
              <textarea
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Candidate is still in active pipeline — keep on record."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none text-[12px] font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </label>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setRejectTarget(null); setRejectNotes(''); }}
                disabled={actionBusy === rejectTarget.id}
                className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-lg"
              >Cancel</button>
              <button
                onClick={submitReject}
                disabled={actionBusy === rejectTarget.id}
                className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg"
              >{actionBusy === rejectTarget.id ? 'Submitting…' : 'Reject Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletionRequests;
