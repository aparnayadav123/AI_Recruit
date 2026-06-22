import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Candidate } from '../types';
import { formatCandidateId } from '../utils';
import { useSearchHighlight } from '../hooks/useSearchHighlight';
import { useSearch } from '../contexts/SearchContext';
import {
  Mail,
  Phone,
  Download,
  Search,
  Briefcase,
  X,
  Flame,
  Plus,
  Trash2,
  Filter,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import api from '../api';

interface CandidatesProps {
  searchQuery?: string;
}

// Status pill — matches project's badge style (font-black, uppercase, tracking-wider)
const statusStyles = (status: string) => {
  switch (status) {
    case 'Shortlisted': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'Interview':   return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'Offer':       return 'bg-violet-50 text-violet-600 border-violet-100';
    case 'Hired':       return 'bg-teal-50 text-teal-600 border-teal-100';
    case 'Rejected':    return 'bg-rose-50 text-rose-600 border-rose-100';
    case 'Screening':   return 'bg-amber-50 text-amber-600 border-amber-100';
    default:            return 'bg-slate-50 text-slate-600 border-slate-300';
  }
};

// A real hotlist is a named group. Ignore blanks and boolean-coerced junk
// ("true"/"false") so a polluted value never shows as a phantom hotlist.
const isRealHotlist = (h?: string | null): boolean => {
  const t = (h || '').trim().toLowerCase();
  return t !== '' && t !== 'true' && t !== 'false';
};

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all';

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className="block space-y-1">
    <span className="block text-[9px] font-black text-gray-600 uppercase tracking-widest px-1">
      {label}{required && <span className="text-rose-500"> *</span>}
    </span>
    {children}
  </label>
);

const Candidates: React.FC<CandidatesProps> = ({ searchQuery = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Optional `?status=Hired` (e.g. from the Dashboard "Hired" card) filters the list.
  const statusParam = searchParams.get('status');
  const highlightId = location.state?.highlightId;
  const { highlightKeyword } = useSearch();
  const itemsPerPage = 10;

  // ============== STATE ==============
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedView, setSelectedView] = useState('All Candidates');
  const [selectedHotlist, setSelectedHotlist] = useState<string | null>(null);
  const [hotlistSearch, setHotlistSearch] = useState('');
  const [isCandidateViewExpanded, setIsCandidateViewExpanded] = useState(true);
  const [isHotlistExpanded, setIsHotlistExpanded] = useState(true);

  const [jobs, setJobs] = useState<any[]>([]);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const [localSearch, setLocalSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All Skills');
  const [selectedJob, setSelectedJob] = useState('All Jobs');
  // Candidate ids whose skill list is expanded (the "+N" badge was clicked).
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const toggleSkills = (id: string) => setExpandedSkills(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  // Sort dropdown removed per request; the list is always Fit Score: high → low.

  const [formData, setFormData] = useState<Partial<Candidate>>({
    name: '', email: '', role: '', experience: 0, skills: [], status: 'New',
  });

  // Role-gated UI: HR users can only *request* a deletion (Manager approves);
  // Manager/Admin can delete directly.
  const userRole = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return (u.role || '').toString().toUpperCase();
    } catch { return ''; }
  })();
  const canDeleteDirectly = userRole === 'MANAGER' || userRole === 'ADMIN';
  const [deletionTarget, setDeletionTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingDeletion, setSubmittingDeletion] = useState(false);

  // ============== EFFECTS ==============
  useEffect(() => {
    if (highlightId && filteredCandidates.length > 0) {
      const index = filteredCandidates.findIndex(c => c.id === highlightId);
      if (index !== -1) {
        const targetPage = Math.ceil((index + 1) / itemsPerPage);
        if (currentPage !== targetPage) setCurrentPage(targetPage);
        setTimeout(() => {
          const element = document.getElementById(`candidate-${highlightId}`);
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    }
  }, [highlightId, filteredCandidates, itemsPerPage]);

  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        navigate(location.pathname, { replace: true, state: {} });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, navigate, location.pathname]);

  useEffect(() => { fetchCandidates(); fetchJobs(); }, []);

  // ============== DATA ==============
  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs?size=100');
      setJobs(response.data.content || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await api.get('/candidates?size=100');
      const content = Array.isArray(response.data) ? response.data : (response.data?.content || []);
      const data = content.map((c: any) => ({
        ...c,
        appliedDate: (c.createdAt && typeof c.createdAt === 'string')
          ? c.createdAt.split('T')[0]
          : new Date().toISOString().split('T')[0],
      }));
      setCandidates(data);
      setFilteredCandidates(data);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
      setCandidates([]);
      setFilteredCandidates([]);
    }
  };

  // ============== HELPERS ==============
  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-100 text-yellow-800 px-0.5 rounded-sm">{part}</mark>
        : part
    );
  };

  const getFitScoreColor = (score: number) => {
    if (score < 40) return 'bg-rose-500';
    if (score < 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // ============== FILTERING ==============
  useEffect(() => {
    let filtered = [...candidates];

    if (selectedView === 'My Candidates') {
      filtered = filtered.filter(c => c.source === 'Manual' || c.source?.includes('Internal'));
    } else if (selectedView === 'All Website Applicants') {
      filtered = filtered.filter(c => c.source === 'Website');
    } else if (selectedView === 'Not In Any Hotlist') {
      filtered = filtered.filter(c => !isRealHotlist(c.hotlist));
    }
    if (selectedHotlist) {
      filtered = filtered.filter(c => c.hotlist === selectedHotlist);
    }

    const q = (localSearch || searchQuery).toLowerCase();
    if (q) {
      // Strip a leading "can" + zero padding so "CAN008", "can8", "008" and "8"
      // all match the candidate whose displayed ID is CAN008.
      const qIdDigits = q.replace(/^can[-\s]?0*/i, '').replace(/^0+/, '');
      filtered = filtered.filter(c => {
        const displayId = formatCandidateId(c.sequenceId).toLowerCase(); // e.g. "can008"
        const idDigits = String(c.sequenceId ?? '');                      // e.g. "8"
        return (
          c.name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.skills || []).some(s => s.toLowerCase().includes(q)) ||
          c.status.toLowerCase().includes(q) ||
          (c.assignedBy || '').toLowerCase().includes(q) ||
          (c.assignedTo || '').toLowerCase().includes(q) ||
          // Search by candidate ID — the displayed CANxxx, the raw id, or the bare number.
          displayId.includes(q) ||
          (c.id || '').toLowerCase().includes(q) ||
          (qIdDigits !== '' && idDigits === qIdDigits)
        );
      });
    }

    if (statusParam) {
      filtered = filtered.filter(c => (c.status || '').toLowerCase() === statusParam.toLowerCase());
    }
    if (selectedSkill !== 'All Skills') {
      filtered = filtered.filter(c => (c.skills || []).some(s => s === selectedSkill));
    }
    if (selectedJob !== 'All Jobs') {
      filtered = filtered.filter(c => c.role === selectedJob);
    }
    // Order by candidate ID (sequenceId) ascending so the list reads CAN001, CAN002,
    // CAN003 … in order. Fit-score tie-break keeps it stable if a sequenceId is missing.
    filtered.sort((a, b) => {
      const sa = (a as any).sequenceId ?? Number.MAX_SAFE_INTEGER;
      const sb = (b as any).sequenceId ?? Number.MAX_SAFE_INTEGER;
      return sa !== sb ? sa - sb : (b.fitScore || 0) - (a.fitScore || 0);
    });

    setFilteredCandidates(filtered);
    setCurrentPage(1);
  }, [searchQuery, localSearch, selectedSkill, selectedJob, candidates, selectedView, selectedHotlist, statusParam]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Apply the global-search keyword highlight on this page. Pulls from the
  // shared context so the highlight persists across navigation and refreshes,
  // not just on the page the user clicked into from the search dropdown.
  useSearchHighlight(highlightKeyword, [paginatedCandidates]);

  // ============== ACTIONS ==============
  const handleDownloadResume = async (resumeId: string | undefined, candidateName: string) => {
    if (!resumeId) { alert("No resume available for this candidate"); return; }
    try {
      const response = await api.get(`/resumes/${resumeId}`, { responseType: 'blob' });
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

  const handleExportCSV = () => {
    const headers = ['Candidate ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Experience (yrs)', 'Fit Score', 'Skills', 'Source', 'Assigned To', 'Assigned By'];
    const rows = filteredCandidates.map(c => [
      formatCandidateId(c.sequenceId), c.name, c.email, c.phone || 'N/A', c.role, c.status,
      c.experience, c.fitScore, (c.skills || []).join('; '), c.source || 'N/A', c.assignedTo || '—', c.assignedBy || '—'
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
    // BOM so Excel reads UTF-8 correctly.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `recruitai-candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
    setFilteredCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
    try {
      await api.patch(`/candidates/${id}/status`, null, { params: { status: newStatus } });
    } catch (error) {
      console.error("Failed to update status", error);
      alert('Update failed. Please try again.');
      fetchCandidates();
    }
  };

  const handleAssignJob = async (id: string, jobId: string) => {
    const userStr = localStorage.getItem('user');
    let assignerName = 'System';
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        const fullName = userObj.name || userObj.email || 'System';
        assignerName = fullName.split(' ')[0];
      } catch (e) {}
    }
    if (!jobId) {
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, jobId: '', assignedTo: '', assignedBy: assignerName } : c));
      setFilteredCandidates(prev => prev.map(c => c.id === id ? { ...c, jobId: '', assignedTo: '', assignedBy: assignerName } : c));
      try {
        await api.patch(`/candidates/${id}/assign-job`, null, { params: { jobId: '', role: '', jobAssignedBy: assignerName } });
      } catch (error) {
        console.error("Failed to assign job", error);
        alert('Update failed. Please try again.');
        fetchCandidates();
      }
      return;
    }
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, jobId, assignedTo: job.title, assignedBy: assignerName } : c));
    setFilteredCandidates(prev => prev.map(c => c.id === id ? { ...c, jobId, assignedTo: job.title, assignedBy: assignerName } : c));
    try {
      await api.patch(`/candidates/${id}/assign-job`, null, { params: { jobId, role: job.title, jobAssignedBy: assignerName } });
    } catch (error) {
      console.error("Failed to assign job", error);
      alert('Update failed. Please try again.');
      fetchCandidates();
    }
  };

  const handleDeleteCandidate = async (id: string, name: string) => {
    // HR can't delete — show the request-deletion modal instead.
    if (!canDeleteDirectly) {
      setDeletionTarget({ id, name });
      setDeletionReason('');
      return;
    }
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    const previousCandidates = [...candidates];
    setCandidates(prev => prev.filter(c => c.id !== id));
    setFilteredCandidates(prev => prev.filter(c => c.id !== id));
    try {
      await api.delete(`/candidates/${id}`);
    } catch (error: any) {
      console.error("Failed to delete candidate:", error);
      alert(`Failed to delete candidate: ${error?.response?.data?.message || error?.response?.data?.error || 'Unknown error'}`);
      setCandidates(previousCandidates);
      setFilteredCandidates(previousCandidates);
    }
  };

  const submitDeletionRequest = async () => {
    if (!deletionTarget) return;
    if (deletionReason.trim().length < 5) {
      alert('Please provide a reason of at least 5 characters.');
      return;
    }
    setSubmittingDeletion(true);
    try {
      await api.post('/deletion-requests', {
        candidateId: deletionTarget.id,
        reason: deletionReason.trim(),
      });
      alert(`Deletion request submitted for ${deletionTarget.name}. A Manager will review it.`);
      setDeletionTarget(null);
      setDeletionReason('');
    } catch (error: any) {
      alert(`Could not submit request: ${error?.response?.data?.message || 'Unknown error'}`);
    } finally {
      setSubmittingDeletion(false);
    }
  };

  const handleSaveCandidate = async () => {
    const problems: string[] = [];
    if (!formData.name || !formData.name.trim()) {
      problems.push('Name is required.');
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      problems.push('A valid email is required.');
    }
    if (problems.length > 0) {
      alert('Please fix:\n' + problems.join('\n'));
      return;
    }
    try {
      const userStr = localStorage.getItem('user');
      let uploaderName = 'System';
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          const fullName = userObj.name || userObj.email || 'System';
          uploaderName = fullName.split(' ')[0];
        } catch (e) {}
      }
      const payload: any = { ...formData };
      if (modalMode === 'add') {
        payload.source = payload.source || 'Manual';
        payload.uploadedBy = uploaderName;
        const res = await api.post('/candidates', payload);
        setCandidates(prev => [res.data, ...prev]);
        if (selectedJob === 'All Jobs' || res.data.role === selectedJob) {
          setFilteredCandidates(prev => [res.data, ...prev]);
        }
      } else if (selectedCandidate) {
        setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...payload } : c));
        setFilteredCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...payload } : c));
        await api.put(`/candidates/${selectedCandidate.id}`, payload);
      }
      setIsCandidateModalOpen(false);
      fetchCandidates();
    } catch (error: any) {
      console.error("Save failed:", error);
      alert(`Failed to save candidate: ${error?.response?.data?.message || error?.response?.data?.error || 'Unknown error'}`);
      fetchCandidates();
    }
  };

  // ============== DERIVED ==============
  const myCandidatesCount = candidates.filter(c => c.source === 'Manual' || c.source?.includes('Internal')).length;
  const websiteApplicantsCount = candidates.filter(c => c.source === 'Website').length;
  const notInHotlistCount = candidates.filter(c => !isRealHotlist(c.hotlist)).length;

  const hotlistCounts = candidates.reduce((acc, c) => {
    if (isRealHotlist(c.hotlist)) acc[c.hotlist!] = (acc[c.hotlist!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hotlistEntries = Object.entries(hotlistCounts)
    .filter(([name]) => name.toLowerCase().includes(hotlistSearch.toLowerCase()))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const views = [
    { label: 'All Candidates',     key: 'All Candidates',          count: candidates.length },
    { label: 'My Candidates',      key: 'My Candidates',           count: myCandidatesCount },
    { label: 'Website Applicants', key: 'All Website Applicants',  count: websiteApplicantsCount },
    { label: 'Not in any Hotlist', key: 'Not In Any Hotlist',      count: notInHotlistCount },
  ];

  // ============== RENDER ==============
  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 text-slate-900">
      {/* Sidebar */}
      <aside
        className={`shrink-0 transition-all duration-300 overflow-hidden ${
          isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div className="h-full bg-white rounded-xl border border-slate-300 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-300">
            <h3 className="text-sm font-black text-gray-900 tracking-tight">Quick View</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Views */}
            <section>
              <button
                onClick={() => setIsCandidateViewExpanded(!isCandidateViewExpanded)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-black text-gray-700 uppercase tracking-widest hover:bg-slate-50 rounded transition-colors"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${!isCandidateViewExpanded ? '-rotate-90' : ''}`}
                />
                <span>Candidate View</span>
              </button>
              {isCandidateViewExpanded && (
                <div className="mt-1 space-y-0.5">
                  {views.map(item => {
                    const active = selectedView === item.key && !selectedHotlist;
                    return (
                      <button
                        key={item.key}
                        onClick={() => { setSelectedView(item.key); setSelectedHotlist(null); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${
                          active
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={active ? 'text-blue-500 text-[10px]' : 'bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-black'}>
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Hotlists */}
            <section>
              <button
                onClick={() => setIsHotlistExpanded(!isHotlistExpanded)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-black text-gray-700 uppercase tracking-widest hover:bg-slate-50 rounded transition-colors"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${!isHotlistExpanded ? '-rotate-90' : ''}`}
                />
                <span>Candidate Hotlist</span>
              </button>
              {isHotlistExpanded && (
                <div className="mt-1 space-y-1">
                  <div className="px-2 mb-2">
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 w-7 flex items-center justify-center text-gray-500">
                        <Search size={12} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search..."
                        value={hotlistSearch}
                        onChange={e => setHotlistSearch(e.target.value)}
                        className="w-full h-7 pl-7 pr-2 bg-gray-50 border border-slate-300 rounded-lg outline-none text-[10px] font-bold focus:border-blue-300 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {hotlistEntries.map((list, i) => {
                      const active = selectedHotlist === list.name;
                      return (
                        <button
                          key={i}
                          onClick={() => { setSelectedHotlist(list.name); setSelectedView(''); }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                            active ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate pr-2">{list.name}</span>
                          <span className={active ? 'text-blue-500' : 'bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-black'}>
                            {list.count}
                          </span>
                        </button>
                      );
                    })}
                    {hotlistEntries.length === 0 && (
                      <div className="px-3 py-3 text-center text-gray-600 text-[10px] font-bold border border-dashed border-slate-300 rounded-lg mt-2">
                        No hotlists found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-3">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-300 shadow-sm px-3 py-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border border-slate-300"
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100/50">
              <Briefcase size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Talent Intelligence</span>
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">Candidate Database</h2>
              <p className="text-[10px] text-gray-600 font-medium leading-none mt-1">
                Found {filteredCandidates.length} {filteredCandidates.length === 1 ? 'profile' : 'profiles'}
                {filteredCandidates.length !== candidates.length && <> &nbsp;|&nbsp; filtered from {candidates.length}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors border border-slate-300"
              title="Export CSV"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => {
                setModalMode('add');
                setFormData({ name: '', email: '', role: '', experience: 0, skills: [], status: 'New' });
                setIsCandidateModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-blue-600 px-4 py-2 rounded-lg shadow-lg shadow-blue-100 text-[11px] font-bold text-white hover:bg-blue-700 transition active:scale-95"
            >
              <Plus size={14} /> Add Candidate
            </button>
          </div>
        </header>

        {/* Filters + Table */}
        <div className="flex-1 bg-white rounded-xl border border-slate-300 shadow-sm flex flex-col min-h-0 overflow-hidden p-2.5 gap-2">
          {/* Filters */}
          <div className="bg-blue-50/30 p-2 rounded-xl border border-blue-100/40 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <span className="pointer-events-none absolute inset-y-0 left-0 w-9 flex items-center justify-center text-gray-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search ID, name, email, role, skills..."
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-white border border-slate-300 rounded-lg outline-none text-[11px] font-bold text-gray-600 hover:border-indigo-100 transition-all shadow-sm placeholder:text-gray-400"
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 w-9 flex items-center justify-center text-gray-500">
                <Filter size={14} />
              </span>
              <select
                value={selectedSkill}
                onChange={e => setSelectedSkill(e.target.value)}
                className="h-9 pl-9 pr-8 bg-white border border-slate-300 rounded-lg outline-none text-[11px] font-bold text-gray-600 appearance-none min-w-[140px] cursor-pointer hover:border-indigo-100 transition-all shadow-sm"
              >
                <option>All Skills</option>
                {Array.from(new Set(candidates.flatMap(c => c.skills || []))).map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 w-9 flex items-center justify-center text-gray-500">
                <Briefcase size={14} />
              </span>
              <select
                value={selectedJob}
                onChange={e => setSelectedJob(e.target.value)}
                className="h-9 pl-9 pr-8 bg-white border border-slate-300 rounded-lg outline-none text-[11px] font-bold text-gray-600 appearance-none min-w-[140px] cursor-pointer hover:border-indigo-100 transition-all shadow-sm"
              >
                <option>All Jobs</option>
                {jobs.map(job => <option key={job.id} value={job.title}>{job.title}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-300/80">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest w-10">S.No</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest w-16">ID</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Candidate</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Role</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest w-16">Exp</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Skills</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest w-32">Fit</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Source</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Assign</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-black text-slate-600 uppercase tracking-widest w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {paginatedCandidates.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center">
                      <div className="text-gray-600 text-[11px] font-bold">No candidates match your filters.</div>
                      <button
                        onClick={() => {
                          setLocalSearch('');
                          setSelectedSkill('All Skills');
                          setSelectedJob('All Jobs');
                          setSelectedView('All Candidates');
                          setSelectedHotlist(null);
                        }}
                        className="mt-2 text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest"
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                )}
                {paginatedCandidates.map((candidate, indexInPage) => {
                  // Running serial across the *currently filtered* list — resets to 1
                  // every time the user changes role/skill/search filters, so the
                  // "Backend Engineer" view shows 1, 2, 3, … not the candidate's
                  // permanent CAN-id sequence.
                  const serialNumber = (currentPage - 1) * itemsPerPage + indexInPage + 1;
                  const displayId = formatCandidateId(candidate.sequenceId);
                  const isHighlighted = highlightId === candidate.id;
                  const cleanPhone = candidate.phone && candidate.phone !== 'NOT_FOUND' && candidate.phone !== 'Not Found' ? candidate.phone : null;
                  return (
                    <tr
                      key={candidate.id}
                      id={`candidate-${candidate.id}`}
                      className={`group hover:bg-gray-50/50 transition-colors ${isHighlighted ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}`}
                    >
                      <td className="px-3 py-2.5 text-[11px] font-black text-slate-800 whitespace-nowrap align-top pt-3">
                        {serialNumber}
                      </td>
                      <td className="px-3 py-2.5 text-[10px] font-black text-gray-600 whitespace-nowrap align-top pt-3">
                        {displayId}
                      </td>

                      <td className="px-3 py-2.5 align-top pt-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[11px] shadow-sm shrink-0">
                            {candidate.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => navigate(`/candidates/${candidate.id}`)}
                              className="text-[11px] font-bold text-gray-900 hover:text-blue-600 hover:underline text-left block truncate max-w-[200px] leading-tight"
                              title="View details"
                            >
                              {highlightText(candidate.name)}
                            </button>
                            <div className="text-[10px] text-gray-600 font-medium flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                              <Mail className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                              <span className="truncate">{highlightText(candidate.email)}</span>
                            </div>
                            {cleanPhone && (
                              <div className="text-[10px] text-gray-600 font-medium flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5 text-indigo-400 shrink-0" /> {cleanPhone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-top pt-3">
                        <div className="text-[11px] font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded border border-slate-300 inline-block leading-none w-fit max-w-[180px] truncate" title={candidate.role}>
                          {highlightText(candidate.role)}
                        </div>
                        {candidate.currentOrganization && (
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-tight mt-1 truncate max-w-[180px]">
                            @ {candidate.currentOrganization}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-[11px] font-bold text-gray-700 whitespace-nowrap align-top pt-3">
                        {candidate.experience || 0}y
                      </td>

                      <td className="px-3 py-2.5 align-top pt-3">
                        {(() => {
                          const skills = candidate.skills || [];
                          const isExpanded = expandedSkills.has(candidate.id);
                          const shown = isExpanded ? skills : skills.slice(0, 2);
                          return (
                            <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                              {shown.map((skill, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-100/50">
                                  {skill}
                                </span>
                              ))}
                              {skills.length > 2 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleSkills(candidate.id); }}
                                  className="px-1.5 py-0.5 bg-white text-indigo-600 rounded text-[10px] font-bold border border-indigo-200 hover:bg-indigo-50 transition-colors cursor-pointer"
                                >
                                  {isExpanded ? 'Show less' : `+${skills.length - 2}`}
                                </button>
                              )}
                              {skills.length === 0 && (
                                <span className="text-[10px] text-gray-400 font-bold">—</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="px-3 py-2.5 align-top pt-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getFitScoreColor(candidate.fitScore)} transition-all duration-1000 ease-out`}
                              style={{ width: `${candidate.fitScore || 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-gray-900 tabular-nums">
                            {candidate.fitScore || 0}%
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-top pt-3">
                        <select
                          value={candidate.status}
                          onChange={e => handleStatusUpdate(candidate.id, e.target.value)}
                          className={`text-[10px] font-black rounded-full px-2 py-1 border outline-none cursor-pointer uppercase tracking-wider ${statusStyles(candidate.status)}`}
                        >
                          <option value="New">New</option>
                          <option value="Screening">Screening</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Interview">Interview</option>
                          <option value="Offer">Offer</option>
                          <option value="Hired">Hired</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>

                      <td className="px-3 py-2.5 align-top pt-3">
                        <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-slate-600 border border-slate-300 bg-slate-50">
                          {candidate.source || 'Direct'}
                        </span>
                        {candidate.uploadedBy && (
                          <div className="text-[10px] text-gray-600 font-medium truncate max-w-[100px] mt-1">
                            {candidate.uploadedBy.split(' ')[0]}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-top pt-3">
                        <select
                          value={candidate.jobId || ''}
                          onChange={e => handleAssignJob(candidate.id, e.target.value)}
                          className="text-[10px] font-bold bg-white border border-slate-300 rounded px-1.5 py-1 outline-none text-gray-600 max-w-[140px] cursor-pointer hover:border-indigo-200 transition-colors"
                        >
                          <option value="">Assign job…</option>
                          {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                        </select>
                        {candidate.assignedBy && (
                          <div className="text-[9px] text-gray-600 font-medium mt-1">by {candidate.assignedBy}</div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-top pt-3">
                        <div className="flex items-center justify-end gap-1">
                          {isRealHotlist(candidate.hotlist) && (
                            <span
                              className="px-1.5 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 mr-1"
                              title={`Hotlist: ${candidate.hotlist}`}
                            >
                              <Flame size={10} />
                              <span className="truncate max-w-[60px]">{candidate.hotlist}</span>
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedCandidate(candidate);
                              setModalMode('edit');
                              setFormData({ ...candidate });
                              setIsCandidateModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDownloadResume(candidate.resumeId, candidate.name)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Download resume"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(candidate.id, candidate.name)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-3 py-2.5 bg-white border-t border-slate-300 flex items-center justify-between">
            <div className="text-[11px] text-gray-600 font-bold bg-gray-50 px-3 py-1.5 rounded-md">
              {filteredCandidates.length > 0 ? (() => {
                const start = (currentPage - 1) * itemsPerPage + 1;
                const end = Math.min(currentPage * itemsPerPage, filteredCandidates.length);
                return (
                  <>
                    Showing <span className="text-gray-900 font-black">{start}–{end}</span>
                    {' '}of <span className="text-gray-900 font-black">{filteredCandidates.length}</span>
                    {filteredCandidates.length === 1 ? ' candidate' : ' candidates'}
                    {totalPages > 1 && (
                      <span className="text-gray-400"> &nbsp;|&nbsp; Page {currentPage} of {totalPages}</span>
                    )}
                  </>
                );
              })() : (
                <>No candidates match the current filters</>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-[10px] font-bold text-gray-600 bg-white border border-slate-300 rounded-lg hover:bg-gray-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <div className="h-4 w-px bg-gray-100 mx-1"></div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-md shadow-blue-100"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-300 max-h-[90vh] flex flex-col animate-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-slate-300 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight uppercase">
                  {modalMode === 'add' ? 'Add New Candidate' : 'Edit Candidate Profile'}
                </h3>
                <p className="text-[10px] font-bold text-slate-600 mt-0.5 uppercase tracking-widest">
                  {modalMode === 'add' ? 'Create a new candidate profile' : 'Update candidate details'}
                </p>
              </div>
              <button
                onClick={() => setIsCandidateModalOpen(false)}
                className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name" required>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className={inputClass}
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+81 00-0000-0000"
                    className={inputClass}
                  />
                </Field>
                <Field label="Locality / Country">
                  <input
                    type="text"
                    value={formData.locality || ''}
                    onChange={e => setFormData({ ...formData, locality: e.target.value })}
                    placeholder="Tokyo, Japan"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Role / Headline">
                  <input
                    type="text"
                    value={formData.role || ''}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Senior Fullstack Engineer"
                    className={inputClass}
                  />
                </Field>
                <Field label="Current Organization">
                  <input
                    type="text"
                    value={formData.currentOrganization || ''}
                    onChange={e => setFormData({ ...formData, currentOrganization: e.target.value })}
                    placeholder="e.g. TCS"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Experience (yrs)">
                  <input
                    type="number"
                    min={0}
                    value={formData.experience ?? 0}
                    onChange={e => setFormData({ ...formData, experience: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Postal Code">
                  <input
                    type="text"
                    value={formData.postalCode || ''}
                    onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Japanese Proficiency">
                  <select
                    value={formData.japaneseLanguageProficiency || ''}
                    onChange={e => setFormData({ ...formData, japaneseLanguageProficiency: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">None / N/A</option>
                    <option value="N1">N1 — Proficient</option>
                    <option value="N2">N2 — Advanced</option>
                    <option value="N3">N3 — Intermediate</option>
                    <option value="N4">N4 — Elementary</option>
                    <option value="N5">N5 — Basic</option>
                    <option value="Native">Native</option>
                    <option value="BJT">BJT (Business)</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <select
                    value={formData.status || 'New'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="New">New</option>
                    <option value="Screening">Screening</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Interview">Interview</option>
                    <option value="Offer">Offer</option>
                    <option value="Hired">Hired</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </Field>
                <Field label="Languages">
                  <input
                    type="text"
                    value={(formData.languageSkills || []).join(', ')}
                    onChange={e => setFormData({ ...formData, languageSkills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="English, Japanese"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-300">
                <Field label="Current Salary">
                  <input
                    type="text"
                    value={formData.currentSalary || ''}
                    onChange={e => setFormData({ ...formData, currentSalary: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Expected Salary">
                  <input
                    type="text"
                    value={formData.salaryExpectation || ''}
                    onChange={e => setFormData({ ...formData, salaryExpectation: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Notice (days)">
                  <input
                    type="number"
                    min={0}
                    value={formData.noticePeriod ?? 0}
                    onChange={e => setFormData({ ...formData, noticePeriod: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Visa Type / Status">
                <input
                  type="text"
                  value={formData.visaType || ''}
                  onChange={e => setFormData({ ...formData, visaType: e.target.value })}
                  placeholder="e.g. Engineer/Humanities, Permanent Resident"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-300 flex justify-end gap-3">
              <button
                onClick={() => setIsCandidateModalOpen(false)}
                className="px-6 py-2.5 text-[11px] font-black tracking-widest text-slate-600 uppercase hover:text-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCandidate}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition active:scale-95"
              >
                {modalMode === 'add' ? 'Create Candidate' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HR Deletion-Request modal */}
      {deletionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-black text-gray-900 mb-1">Request Deletion</h3>
            <p className="text-[11px] text-slate-600 font-bold mb-4">
              You don't have permission to delete candidates directly. Your request will be sent to a Manager for approval.
            </p>
            <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Candidate</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{deletionTarget.name}</div>
              <div className="text-[10px] text-slate-500 font-bold">{deletionTarget.id}</div>
            </div>
            <label className="block">
              <span className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">
                Reason <span className="text-rose-500">*</span>
              </span>
              <textarea
                value={deletionReason}
                onChange={e => setDeletionReason(e.target.value)}
                rows={4}
                placeholder="e.g. Candidate withdrew their application via email."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none text-[12px] font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </label>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setDeletionTarget(null); setDeletionReason(''); }}
                disabled={submittingDeletion}
                className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-lg"
              >Cancel</button>
              <button
                onClick={submitDeletionRequest}
                disabled={submittingDeletion || deletionReason.trim().length < 5}
                className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 rounded-lg"
              >{submittingDeletion ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Candidates;
