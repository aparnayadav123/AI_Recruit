import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Calendar, CheckCircle, XCircle, Clock, User, Briefcase, ChevronRight, X, Filter, UserPlus, Users, ArrowRight, Star } from 'lucide-react';
import api from '../api';
import { Candidate } from '../types';
import { useSearchHighlight } from '../hooks/useSearchHighlight';
import { useSearch } from '../contexts/SearchContext';
import { INTERVIEW_ROUNDS as ROUNDS, roundOf } from '../constants/interviewRounds';

const InterviewPipeline: React.FC = () => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'Passed' | 'Rejected'>('All');
    const navigate = useNavigate();
    const location = useLocation();
    const [pageSearchParams] = useSearchParams();
    // Global search lands here as `/interview-pipeline?highlight=CAN-xxx` and
    // `state.keyword`; open the candidate's round modal and highlight matches.
    const highlightCandidateId = pageSearchParams.get('highlight');
    void location;
    const { highlightKeyword: globalKeyword } = useSearch();

    useEffect(() => {
        fetchCandidates();
    }, []);

    // When arriving from a global search result, open the round modal for the
    // matched candidate so their row is visible immediately.
    useEffect(() => {
        if (!highlightCandidateId || candidates.length === 0) return;
        const found = candidates.find(c => c.id === highlightCandidateId);
        if (found) setSelectedRoundId(roundOf(found.interviewRound));
    }, [highlightCandidateId, candidates]);

    useSearchHighlight(globalKeyword, [candidates.length, selectedRoundId, statusFilter, searchQuery]);

    const fetchCandidates = async () => {
        try {
            const response = await api.get('/candidates?size=1000');
            const data = response.data.content || response.data;
            const interviewCandidates = data.filter((c: Candidate) => c.status === 'Interview');
            setCandidates(interviewCandidates);
        } catch (error) {
            console.error("Failed to fetch candidates", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (candidateId: string, newStatus: 'Passed' | 'Rejected' | 'Scheduled') => {
        try {
            const candidate = candidates.find(c => c.id === candidateId);
            if (!candidate) return;

            const updated = { ...candidate, roundStatus: newStatus };
            setCandidates(candidates.map(c => c.id === candidateId ? updated : c));

            await api.put(`/candidates/${candidateId}`, updated);
        } catch (e) {
            console.error("Failed to update status", e);
            alert('Could not update status. Please try again.');
            fetchCandidates();
        }
    };

    const getCandidatesByRound = (roundId: string) => {
        // Bucket by roundOf() so EVERY active-pipeline candidate — including any with an
        // unset or legacy interviewRound — lands in exactly one of the six stages. This
        // guarantees the per-stage counts always sum to the total active-pipeline count
        // (NFRU05); an exact-match filter would silently drop unmapped candidates.
        return candidates.filter(c => roundOf(c.interviewRound) === roundId);
    };

    const filteredCandidates = useMemo(() => {
        if (!selectedRoundId) return [];
        let list = getCandidatesByRound(selectedRoundId);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(c =>
                (c.name || '').toLowerCase().includes(query) ||
                (c.role || '').toLowerCase().includes(query) ||
                (c.email || '').toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'All') {
            list = list.filter(c => {
                if (statusFilter === 'Scheduled') return !c.roundStatus || c.roundStatus === 'Scheduled';
                return c.roundStatus === statusFilter;
            });
        }

        return list;
    }, [selectedRoundId, candidates, searchQuery, statusFilter]);

    const activeRound = ROUNDS.find(r => r.id === selectedRoundId);

    const handleDownloadResume = async (resumeId: string | undefined, candidateName: string) => {
        if (!resumeId) {
            alert("No resume available for this candidate");
            return;
        }
        try {
            const response = await api.get(`/resumes/${resumeId}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${candidateName}_Resume.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Failed to download resume:", error);
            alert("Failed to download resume");
        }
    };

    const handleGlobalStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await api.patch(`/candidates/${id}/status`, null, { params: { status: newStatus } });
            fetchCandidates();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Initializing Pipeline...</p>
        </div>
    );

    return (
    <div className="space-y-4 animate-in fade-in duration-700">
      {/* Premium Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-300 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100/50">
            <Users size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5 leading-none">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Hiring Process</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">Interview Pipeline</h2>
          </div>
        </div>
      </div>

      {/* Stage Selector Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {ROUNDS.map((round) => {
          const roundCandidates = getCandidatesByRound(round.id);
          return (
            <div
              key={round.id}
              onClick={() => {
                setSelectedRoundId(round.id);
                setStatusFilter('All');
                setSearchQuery('');
              }}
              className={`group relative p-2.5 rounded-xl border border-slate-300 bg-gradient-to-br ${round.color} shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden active:scale-[0.98]`}
            >
              <div className="flex flex-col h-full relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className={`${round.iconBg} p-2 rounded-lg transition-transform group-hover:scale-110`}>
                    <round.Icon className={`${round.iconColor} w-4 h-4`} />
                  </div>
                  <span className={`text-xl font-black ${round.text} leading-none`}>{roundCandidates.length}</span>
                </div>

                <h3 className={`text-[11px] font-black uppercase tracking-wider ${round.text} mb-2.5`}>
                  {round.title}
                </h3>

                <div className="pt-2 border-t border-white/50 flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    {roundCandidates.slice(0, 4).map((c) => (
                      <div key={c.id} className="w-5 h-5 rounded-lg ring-2 ring-white bg-white shadow-sm flex items-center justify-center font-black text-blue-600 border border-slate-300 text-[10px]">
                        {c.name.charAt(0)}
                      </div>
                    ))}
                    {roundCandidates.length > 4 && (
                      <div className="w-5 h-5 rounded-lg ring-2 ring-white bg-slate-50 flex items-center justify-center font-black text-slate-600 text-[10px] border border-slate-300">
                        +{roundCandidates.length - 4}
                      </div>
                    )}
                  </div>
                  <ArrowRight size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

            {/* Premium Candidates Modal */}
            {selectedRoundId && activeRound && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden border border-blue-100 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Modal Header */}
                    <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className={`${activeRound.iconBg} p-2 rounded-lg`}>
                                <activeRound.Icon className={`${activeRound.iconColor} w-5 h-5`} />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${activeRound.accent}`} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Pipeline Stage</span>
                                </div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                                    {activeRound.title}
                                </h2>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedRoundId(null)}
                            className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Search and Tabs Container */}
                    <div className="px-5 py-3">
                        <div className="flex flex-col md:flex-row gap-3 md:items-center">
                            <div className="relative flex-1 w-full group">
                                {/* inset-y-0 + flex items-center is the bulletproof vertical-centering
                                    pattern — independent of line-height, padding, or rounding. */}
                                <span className="pointer-events-none absolute inset-y-0 left-0 w-9 flex items-center justify-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Search size={16} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Filter by name, role..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 transition-all text-[12px] font-medium text-slate-700 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="inline-flex h-9 p-1 bg-slate-100 rounded-lg w-full md:w-auto border border-slate-200">
                                {[
                                    { id: 'All', label: 'All' },
                                    { id: 'Scheduled', label: 'Waiting' },
                                    { id: 'Passed', label: 'Passed' },
                                    { id: 'Rejected', label: 'Rejected' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setStatusFilter(tab.id as any)}
                                        className={`flex-1 md:flex-none px-3 rounded-md text-[10px] font-black tracking-widest uppercase transition-all ${statusFilter === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Modern Card List */}
                    <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5 custom-scrollbar">
                        {filteredCandidates.length > 0 ? (
                            filteredCandidates.map((candidate) => (
                                <div
                                    key={candidate.id}
                                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                                    className="group bg-white rounded-xl p-3 border border-slate-300 shadow-sm hover:border-blue-200 transition-all flex flex-col md:flex-row items-center cursor-pointer gap-4"
                                >
                                    {/* Profile Info */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-black text-sm text-blue-600 shadow-sm">
                                            {candidate.name.charAt(0)}
                                        </div>
                                        <div className="truncate">
                                            <h4 className="text-sm font-black text-slate-900 leading-none mb-1 group-hover:text-blue-600">{candidate.name}</h4>
                                            <div className="flex items-center gap-1.5 leading-none">
                                                <span className="text-[9px] font-bold text-slate-600">{candidate.role}</span>
                                                <span className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                                                <span className="text-[9px] font-bold text-slate-400">{candidate.email}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Current Round — clearly labeled so it's obvious which stage the candidate is in */}
                                    {(() => {
                                        const currentRoundId = roundOf(candidate.interviewRound);
                                        const idx = ROUNDS.findIndex(round => round.id === currentRoundId);
                                        const cur = ROUNDS[idx] || ROUNDS[0];
                                        const CurIcon = cur.Icon;
                                        return (
                                            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gradient-to-br ${cur.color}`}>
                                                <div className={`${cur.iconBg} p-1.5 rounded-md`}>
                                                    <CurIcon className={`${cur.iconColor} w-3.5 h-3.5`} />
                                                </div>
                                                <div className="leading-tight">
                                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Current Round</div>
                                                    <div className={`text-[11px] font-black ${cur.text}`}>{cur.title}</div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Stage {idx + 1} of {ROUNDS.length}</div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Status & Actions */}
                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5
                                            ${candidate.roundStatus === 'Passed' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                candidate.roundStatus === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                    'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                            {candidate.roundStatus || 'Scheduled'}
                                        </div>

                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStatusChange(candidate.id, 'Passed');
                                                }}
                                                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-lg text-slate-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all shadow-xs"
                                            >
                                                <CheckCircle size={14} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStatusChange(candidate.id, 'Rejected');
                                                }}
                                                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-lg text-slate-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-xs"
                                            >
                                                <XCircle size={14} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-300">
                                <Search size={24} className="text-slate-200 mb-2" />
                                <h3 className="text-xs font-black text-slate-900">No matches found</h3>
                            </div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="px-5 py-4 bg-gray-50 border-t border-slate-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users size={12} className="text-blue-600" />
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                                {filteredCandidates.length} Candidates Listed
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedRoundId(null)}
                            className="px-6 py-2 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-blue-600 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
};

export default InterviewPipeline;
