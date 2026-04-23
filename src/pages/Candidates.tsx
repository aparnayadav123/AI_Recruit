import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Candidate } from '../types';
import {
  Mail,
  Phone,
  Download,
  Search,
  CheckCircle2,
  Clock,
  User,
  Users,
  Briefcase,
  X,
  Flame,
  Target,
  Plus,
  Trash2,
  Filter,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ChevronDown,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import api from '../api';

interface CandidatesProps {
  searchQuery?: string;
}

const Candidates: React.FC<CandidatesProps> = ({ searchQuery = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const highlightId = location.state?.highlightId;
  const itemsPerPage = 10;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedView, setSelectedView] = useState('All Candidates');
  const [selectedHotlist, setSelectedHotlist] = useState<string | null>(null);
  const [hotlistSearch, setHotlistSearch] = useState('');
  const [isCandidateViewExpanded, setIsCandidateViewExpanded] = useState(true);
  const [isHotlistExpanded, setIsHotlistExpanded] = useState(true);

  // Auto-scroll and Pagination Logic
  useEffect(() => {
    if (highlightId && filteredCandidates.length > 0) {
      const index = filteredCandidates.findIndex(c => c.id === highlightId);
      if (index !== -1) {
        const targetPage = Math.ceil((index + 1) / itemsPerPage);
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
        // Scroll with delay to ensure render
        setTimeout(() => {
          const element = document.getElementById(`candidate-${highlightId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [highlightId, filteredCandidates, itemsPerPage]); // currentPage removed to avoid loop, we just set it once.

  // Clear highlight state after 10 seconds
  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        navigate(location.pathname, { replace: true, state: {} });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, navigate, location.pathname]);

  const [jobs, setJobs] = useState<any[]>([]);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Filter states
  const [localSearch, setLocalSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All Skills');
  const [selectedJob, setSelectedJob] = useState('All Jobs');
  const [sortBy, setSortBy] = useState('Sort by Fit Score');

  const [expandedSkillsCandidate, setExpandedSkillsCandidate] = useState<string | null>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setExpandedSkillsCandidate(null);
      }
    };
    if (expandedSkillsCandidate) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedSkillsCandidate]);

  const [formData, setFormData] = useState<Partial<Candidate>>({
    name: '',
    email: '',
    role: '',
    experience: 0,
    skills: [],
    status: 'New'
  });

  /* ===================== FETCH ===================== */
  useEffect(() => {
    fetchCandidates();
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await api.get('/jobs?size=100');
      setJobs(response.data.content || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoadingJobs(false);
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

  /* ===================== HELPERS ===================== */
  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-100 text-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getFitScoreColor = (score: number) => {
    // User Rule:
    // 0-39% = RED
    // 40-69% = ORANGE
    // 70-100% = GREEN
    if (score < 40) return 'bg-red-500';
    if (score < 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  /* ===================== FILTERING ===================== */
  useEffect(() => {
    let filtered = [...candidates];

    // 0. Views and Hotlists
    if (selectedView === 'My Candidates') {
      filtered = filtered.filter(c => c.source === 'Manual' || c.source?.includes('Internal')); 
    } else if (selectedView === 'All Website Applicants') {
      filtered = filtered.filter(c => c.source === 'Website');
    } else if (selectedView === 'Not In Any Hotlist') {
      filtered = filtered.filter(c => !c.hotlist);
    }
    
    if (selectedHotlist) {
      filtered = filtered.filter(c => c.hotlist === selectedHotlist);
    }

    // 1. Search (Global or Local)
    const q = (localSearch || searchQuery).toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.skills || []).some((s) => s.toLowerCase().includes(q)) ||
          c.status.toLowerCase().includes(q) ||
          (c.assignedBy || '').toLowerCase().includes(q) ||
          (c.assignedTo || '').toLowerCase().includes(q)
      );
    }

    // 2. Skill Filter
    if (selectedSkill !== 'All Skills') {
      filtered = filtered.filter(c =>
        (c.skills || []).some(s => s === selectedSkill)
      );
    }

    // 3. Job Filter
    if (selectedJob !== 'All Jobs') {
      filtered = filtered.filter(c => c.role === selectedJob);
    }

    // 4. Sorting
    if (sortBy === 'Highest First') {
      filtered.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
    } else if (sortBy === 'Lowest First') {
      filtered.sort((a, b) => (a.fitScore || 0) - (b.fitScore || 0));
    }

    setFilteredCandidates(filtered);
    setCurrentPage(1); // Reset to page 1 on filter change
  }, [searchQuery, localSearch, selectedSkill, selectedJob, sortBy, candidates, selectedView, selectedHotlist]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownloadResume = async (resumeId: string, candidateName: string) => {
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

  const handleExportCSV = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Role', 'Experience', 'Fit Score', 'Source', 'Assigned To', 'Assigned By'],
      ...filteredCandidates.map((c) => [
        c.name,
        c.email,
        c.phone || 'N/A',
        c.role,
        c.experience,
        c.fitScore,
        c.source || 'N/A',
        c.assignedTo || '—',
        c.assignedBy || '—'
      ]),
    ]
      .map((r) => r.map((v) => `"${v}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'candidates.csv';
    link.click();
  };

  /* ===================== STATUS UPDATE ===================== */
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    // Optimistic Update
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
    setFilteredCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));

    try {
      await api.patch(`/candidates/${id}/status`, null, { params: { status: newStatus } });
    } catch (error) {
      console.error("Failed to update status", error);
      fetchCandidates();
    }
  };

  const handleAssignJob = async (id: string, jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const userStr = localStorage.getItem('user');
    let assignerName = 'System';
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        const fullName = userObj.name || userObj.email || 'System';
        assignerName = fullName.split(' ')[0];
      } catch (e) {}
    }

    // Optimistic Update
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, jobId, assignedTo: job.title, assignedBy: assignerName } : c));
    setFilteredCandidates(prev => prev.map(c => c.id === id ? { ...c, jobId, assignedTo: job.title, assignedBy: assignerName } : c));

    try {
      await api.patch(`/candidates/${id}/assign-job`, null, { params: { jobId, role: job.title, jobAssignedBy: assignerName } });
    } catch (error) {
      console.error("Failed to assign job", error);
      fetchCandidates();
    }
  };

  /* ===================== CRUD ACTIONS ===================== */
  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    // Optimistic Update: Remove immediately from UI
    const previousCandidates = [...candidates];
    setCandidates(prev => prev.filter(c => c.id !== id));
    setFilteredCandidates(prev => prev.filter(c => c.id !== id));

    try {
      await api.delete(`/candidates/${id}`);
      // Success - no further action needed
    } catch (error: any) {
      console.error("Failed to delete candidate:", error);
      alert(`Failed to delete candidate: ${error?.response?.data?.message || error?.response?.data?.error || 'Unknown error'}`);
      // Revert on failure
      setCandidates(previousCandidates);
      setFilteredCandidates(previousCandidates);
    }
  };

  const handleSaveCandidate = async () => {
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

      const payload = { ...formData };
      
      if (modalMode === 'add') {
        payload.source = payload.source || 'Manual';
        payload.uploadedBy = uploaderName;
        // payload.assignedBy = uploaderName; // Stop using assignedBy for uploader

        const res = await api.post('/candidates', payload);
        // Add new to top of list
        setCandidates(prev => [res.data, ...prev]);
        if (selectedJob === 'All Jobs' || res.data.role === selectedJob) {
          setFilteredCandidates(prev => [res.data, ...prev]);
        }
      } else if (selectedCandidate) {
        // Optimistic Edit
        setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...payload } : c));
        setFilteredCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...payload } : c));

        await api.put(`/candidates/${selectedCandidate.id}`, payload);
      }
      setIsCandidateModalOpen(false);
      // Optional: Background re-fetch to ensure consistency
      fetchCandidates();
    } catch (error: any) {
      console.error("Save failed:", error);
      alert(`Failed to save candidate: ${error?.response?.data?.message || error?.response?.data?.error || 'Unknown error'}`);
      // On error, we rely on the fetchCandidates from the background re-sync or page reload to fix state, 
      // or we could store previous state to revert more gracefully.
      fetchCandidates();
    }
  };
  /* ===================== SIDEBAR COMPUTATIONS ===================== */
  const myCandidatesCount = candidates.filter(c => c.source === 'Manual' || c.source?.includes('Internal')).length;
  const websiteApplicantsCount = candidates.filter(c => c.source === 'Website').length;
  const notInHotlistCount = candidates.filter(c => !c.hotlist).length;

  const hotlistCounts = candidates.reduce((acc, c) => {
    if (c.hotlist) {
      acc[c.hotlist] = (acc[c.hotlist] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const hotlistEntries = Object.entries(hotlistCounts)
    .filter(([name]) => name.toLowerCase().includes(hotlistSearch.toLowerCase()))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex h-[calc(100vh-120px)] gap-3 animate-in fade-in duration-700">
      
      {/* Quick View Sidebar */}
      <div className={`bg-white rounded-xl border border-blue-50 shadow-sm transition-all duration-300 flex flex-col overflow-hidden shrink-0 ${isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none'}`}>
        <div className="p-4 flex flex-col gap-3 border-b border-gray-50">
            <h3 className="text-sm font-black text-gray-900 tracking-tight">Quick View</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 no-scrollbar space-y-4">
            
            {/* Candidate View */}
            <div>
                <div 
                  onClick={() => setIsCandidateViewExpanded(!isCandidateViewExpanded)}
                  className="flex items-center justify-between px-2 py-1.5 text-gray-700 font-bold text-[11px] uppercase tracking-widest cursor-pointer hover:bg-slate-50 rounded"
                >
                    <div className="flex items-center gap-2">
                      <ChevronDown size={14} className={`transition-transform duration-200 ${!isCandidateViewExpanded ? '-rotate-90' : ''}`} /> 
                      Candidate View
                    </div>
                </div>
                {isCandidateViewExpanded && (
                  <div className="mt-1 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                      <button onClick={() => { setSelectedView('All Candidates'); setSelectedHotlist(null); }} className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${selectedView === 'All Candidates' && !selectedHotlist ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                          All Candidates <span className={selectedView === 'All Candidates' && !selectedHotlist ? "text-blue-500" : "bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[9px]"}>{candidates.length}</span>
                      </button>
                      <button onClick={() => { setSelectedView('My Candidates'); setSelectedHotlist(null); }} className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${selectedView === 'My Candidates' && !selectedHotlist ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                          My Candidates <span className={selectedView === 'My Candidates' && !selectedHotlist ? "text-blue-500" : "bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[9px]"}>{myCandidatesCount}</span>
                      </button>
                      <button onClick={() => { setSelectedView('All Website Applicants'); setSelectedHotlist(null); }} className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${selectedView === 'All Website Applicants' && !selectedHotlist ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                          All Website Applicants <span className={selectedView === 'All Website Applicants' && !selectedHotlist ? "text-blue-500" : "bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[9px]"}>{websiteApplicantsCount}</span>
                      </button>
                      <button onClick={() => { setSelectedView('Not In Any Hotlist'); setSelectedHotlist(null); }} className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${selectedView === 'Not In Any Hotlist' && !selectedHotlist ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                          Not In Any Hotlist <span className={selectedView === 'Not In Any Hotlist' && !selectedHotlist ? "text-blue-500" : "bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[9px]"}>{notInHotlistCount}</span>
                      </button>
                  </div>
                )}
            </div>

            {/* Hotlists */}
            <div>
                <div 
                  onClick={() => setIsHotlistExpanded(!isHotlistExpanded)}
                  className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-slate-50 rounded"
                >
                    <div className="flex items-center gap-2 text-gray-700 font-bold text-[11px] uppercase tracking-widest">
                        <ChevronDown size={14} className={`transition-transform duration-200 ${!isHotlistExpanded ? '-rotate-90' : ''}`} /> 
                        Candidate Hotlist
                    </div>
                </div>
                {isHotlistExpanded && (
                  <div className="animate-in slide-in-from-top-1 duration-200">
                    <div className="px-2 mb-2 mt-1">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input type="text" placeholder="Search..." value={hotlistSearch} onClick={(e) => e.stopPropagation()} onChange={e => setHotlistSearch(e.target.value)} className="w-full pl-6 pr-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg outline-none text-[10px] font-bold focus:border-blue-300 transition-colors" />
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        {hotlistEntries.map((list, i) => (
                            <button key={i} onClick={() => { setSelectedHotlist(list.name); setSelectedView(''); }} className={`w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${selectedHotlist === list.name ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                                <span className="truncate pr-2">{list.name}</span>
                                <span className={selectedHotlist === list.name ? "text-blue-500" : "bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[8px]"}>{list.count}</span>
                            </button>
                        ))}
                        {hotlistEntries.length === 0 && (
                            <div className="px-3 py-3 text-center text-gray-400 text-[10px] font-bold border border-dashed border-gray-100 rounded-lg mt-2">
                                No hotlists found
                            </div>
                        )}
                    </div>
                  </div>
                )}
            </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 space-y-3">
        {/* Premium Header Container */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-blue-50 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100 mr-1"
              title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100/50">
              <Users size={16} />
            </div>

          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Talent Intelligence</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">Candidate Database</h2>
            <p className="text-[10px] text-gray-500 font-medium leading-none mt-1">Found {filteredCandidates.length} professional profiles</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
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
      </div>

      <div className="bg-white rounded-xl border border-blue-50 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden p-2.5 space-y-2">

        {/* Unified Filter Section - Fixed Horizontal Layout */}
        <div className="bg-blue-50/30 p-2 rounded-xl border border-blue-100/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border border-blue-100/50 hover:border-blue-300 transition-all cursor-pointer group">
            <Search className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600 transition-colors" />
          </div>

          <div className="flex items-center gap-1.5 flex-nowrap">
            {/* Skills Filter */}
            <div className="relative flex-shrink-0">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select
                className="pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-lg outline-none text-[11px] font-bold text-gray-600 appearance-none min-w-[120px] cursor-pointer hover:border-indigo-100 transition-all shadow-sm"
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
              >
                <option>All Skills</option>
                {Array.from(new Set(candidates.flatMap(c => c.skills || []))).map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            </div>

            {/* Jobs Filter */}
            <div className="relative flex-shrink-0">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select
                className="pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-lg outline-none text-[11px] font-bold text-gray-600 appearance-none min-w-[120px] cursor-pointer hover:border-indigo-100 transition-all shadow-sm"
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
              >
                <option>All Jobs</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.title}>{job.title}</option>
                ))}
              </select>
            </div>

            {/* Sort by Fit Score Filter */}
            <div className="relative flex-shrink-0">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select
                className="pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-lg outline-none text-[11px] font-bold text-gray-600 appearance-none min-w-[140px] cursor-pointer hover:border-indigo-100 transition-all shadow-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="">Sort by Fit Score</option>
                <option value="Highest First">Highest First</option>
                <option value="Lowest First">Lowest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Candidates Table - Added vertical scroll */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm border-b border-gray-100/80">
              <tr className="border-b border-gray-100/80 bg-slate-50/40">
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest w-10">ID</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Candidate Name</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Phone</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Exp</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Skills</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Job Role</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fit</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Source / Uploaded By</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assign</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assigned By</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hotlist</th>
                <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {paginatedCandidates.map((candidate, index) => {
                 const displayId = (candidate.sequenceId || ((currentPage - 1) * itemsPerPage + index + 1));
                 return (
                  <tr
                    key={candidate.id}
                    id={`candidate-${candidate.id}`}
                    className={`group hover:bg-gray-50/50 transition-colors ${highlightId === candidate.id ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}`}
                  >
                    <td className="px-3 py-2 text-[10px] font-black text-gray-400 whitespace-nowrap">
                      <span className="text-slate-300">ID - </span>{displayId.toString().padStart(2, '0')}
                    </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] shadow-sm">
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        {/* NAVIGATE TO DETAILS PAGE */}
                        <button
                          onClick={() => navigate(`/candidates/${candidate.id}`)}
                          className="text-[11px] font-bold text-gray-900 hover:text-blue-600 hover:underline text-left leading-none"
                          title="View Details"
                        >
                          {highlightText(candidate.name)}
                        </button>
                        <div className="text-[9px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-2.5 h-2.5 text-indigo-400" /> {highlightText(candidate.email)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 text-[10px] text-gray-600 font-medium whitespace-nowrap">
                      <Phone className="w-3 h-3 text-indigo-400" />
                      {candidate.phone && candidate.phone !== 'NOT_FOUND' ? candidate.phone : 'N/A'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[10px] font-semibold text-gray-700">
                    {candidate.experience || 0}y
                  </td>
                  <td className="px-3 py-2 relative">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {(candidate.skills || []).slice(0, 2).map((skill, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[8px] font-bold border border-indigo-100/50">
                          {skill}
                        </span>
                      ))}
                      {(candidate.skills || []).length > 2 && (
                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setExpandedSkillsCandidate(expandedSkillsCandidate === candidate.id ? null : candidate.id);
                          }}
                          className="px-1.5 py-0.5 bg-white text-indigo-600 rounded text-[8px] font-bold border border-indigo-200 hover:bg-indigo-50 transition"
                        >
                          +{(candidate.skills || []).length - 2}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 inline-block leading-none w-fit">
                        {highlightText(candidate.role)}
                      </div>
                      {candidate.currentOrganization && (
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5 px-0.5">
                          @ {candidate.currentOrganization}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getFitScoreColor(candidate.fitScore)} transition-all duration-1000 ease-out`}
                          style={{ width: `${candidate.fitScore || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-black text-gray-900">{candidate.fitScore || 0}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-slate-400 border border-slate-50">
                        {candidate.source || 'Direct'}
                      </span>
                      <span className="text-[9px] text-gray-500 font-medium truncate max-w-[100px]" title={candidate.uploadedBy || 'System'}>
                        {(candidate.uploadedBy || 'System').split(' ')[0]}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="text-[9px] bg-white border border-gray-100 rounded px-1 py-0.5 outline-none font-bold text-gray-600"
                      value={candidate.jobId || ''}
                      onChange={(e) => handleAssignJob(candidate.id, e.target.value)}
                    >
                      <option value="">Assign</option>
                      {jobs.map(job => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-[9px] font-black text-gray-900 uppercase tracking-tighter">
                      {candidate.assignedBy || '—'}
                    </div>
                    {candidate.assignedTo && (
                      <div className="text-[7px] text-blue-500 font-medium italic mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                        to {candidate.assignedTo}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {candidate.hotlist ? (
                      <div className="flex justify-center text-lg" title={`Hotlist: ${candidate.hotlist}`}>
                        🔥
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${candidate.status === 'Shortlisted' ? 'bg-green-50 text-green-600 border border-green-100' :
                      candidate.status === 'Interview' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-gray-50 text-gray-400 border border-gray-100'
                      }`}>
                      {candidate.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setModalMode('edit');
                          setFormData({ ...candidate });
                          setIsCandidateModalOpen(true);
                        }}
                        className="p-1 text-slate-300 hover:text-blue-600 transition"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDownloadResume(candidate.resumeId, candidate.name)} className="p-1 text-slate-300 hover:text-blue-600 transition"><Download size={13} /></button>
                      <button onClick={() => handleDeleteCandidate(candidate.id, candidate.name)} className="p-1 text-slate-300 hover:text-rose-500 transition"><Trash2 size={13} /></button>
                    </div>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - Enhanced UI */}
        <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-[10px] font-bold text-gray-500 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 hover:text-blue-600 disabled:opacity-30 transition-all flex items-center gap-1 shadow-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <div className="h-4 w-px bg-gray-100 mx-1"></div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-30 transition-all flex items-center gap-1 shadow-md shadow-blue-100"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Candidate Add/Edit Modal (Existing) */}
        {isCandidateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight uppercase">
                    {modalMode === 'add' ? 'Add New Candidate' : 'Edit Candidate Profile'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Please fill in all candidate professional information</p>
                </div>
                <button onClick={() => setIsCandidateModalOpen(false)} className="p-2 hover:bg-white rounded-lg text-gray-300 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Current Phone</label>
                    <input
                      type="text"
                      name="phone"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+81 00-0000-0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Job Locality / Country</label>
                    <input
                      type="text"
                      name="locality"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.locality || ''}
                      onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                      placeholder="Tokyo, Japan"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Job Role / Headline</label>
                    <input
                      type="text"
                      name="role"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Senior Fullstack Engineer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Current Organization</label>
                    <input
                      type="text"
                      name="currentOrganization"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.currentOrganization || ''}
                      onChange={(e) => setFormData({ ...formData, currentOrganization: e.target.value })}
                      placeholder="e.g. TCS"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Exp (Yrs)</label>
                    <input
                      type="number"
                      name="experience"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Postal Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.postalCode || ''}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Japanese Prof.</label>
                    <select
                      name="japaneseLanguageProficiency"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                      value={formData.japaneseLanguageProficiency || ''}
                      onChange={(e) => setFormData({ ...formData, japaneseLanguageProficiency: e.target.value })}
                    >
                      <option value="">None / N/A</option>
                      <option value="N1">N1 - Proficient</option>
                      <option value="N2">N2 - Advanced</option>
                      <option value="N3">N3 - Intermediate</option>
                      <option value="N4">N4 - Elementary</option>
                      <option value="N5">N5 - Basic</option>
                      <option value="Native">Native</option>
                      <option value="BJT">BJT (Business Japanese)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="New">New</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview">Interview</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Hired">Hired</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Languages</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={(formData.languageSkills || []).join(', ')}
                      onChange={(e) => setFormData({ ...formData, languageSkills: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                      placeholder="English, Japanese"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-50">
                   <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Cur. Salary</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.currentSalary || ''}
                      onChange={(e) => setFormData({ ...formData, currentSalary: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Exp. Salary</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.salaryExpectation || ''}
                      onChange={(e) => setFormData({ ...formData, salaryExpectation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Notice (Days)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      value={formData.noticePeriod || 0}
                      onChange={(e) => setFormData({ ...formData, noticePeriod: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Visa Type / Status</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-100 bg-slate-50 rounded-xl text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    value={formData.visaType || ''}
                    onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                    placeholder="e.g. Engineer/Humanities, Permanent Resident"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsCandidateModalOpen(false)} 
                  className="px-6 py-2.5 text-[11px] font-black tracking-widest text-slate-400 uppercase hover:text-slate-600 transition"
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
      </div>
    </div>
  </div>
  );
};

export default Candidates;
