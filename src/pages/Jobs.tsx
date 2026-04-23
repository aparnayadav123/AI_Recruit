import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Users, User, Clock, MoreVertical, Briefcase, X, DollarSign, Calendar, GraduationCap, Building2, Search, CheckCircle, XCircle, FileText } from 'lucide-react';
import api from '../api';

// API base URL - configured in vite.config.ts proxy
const API_URL = '/jobs';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  department: string;
  type: string;
  employmentType: string;
  salary: string;
  experienceLevel: string;
  skills: { name: string; weight: number }[];
  education: string[];
  industry: string;
  benefits: string[];
  remote: boolean;
  deadline: string;
  status: 'Open' | 'Hold' | 'Closed' | 'Active' | 'Draft';
  postedDate: string;
  applicants: number;
  description: string;
  createdAt: string;
  requirements?: string[];
  responsibilities?: string[];
}

interface JobFormData {
  title: string;
  description: string;
  company: string;
  department: string;
  location: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Temporary';
  remote: boolean;
  salary: string;
  experienceLevel: 'Entry Level' | 'Mid Level' | 'Senior Level' | 'Lead' | 'Manager';
  skills: string[];
  education: string[];
  industry: string;
  benefits: string[];
  deadline: string;
  status: 'Open' | 'Hold';
}

interface JobsProps {
  searchQuery?: string;
}

const JobDetailsModal = ({ job: initialJob, onClose }: { job: Job; onClose: () => void }) => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Use real data only
  const job = initialJob;

  useEffect(() => {
    if (job?.id) {
      setLoadingCandidates(true);
      api.get(`/candidates/job/${job.id}`)
        .then(res => setCandidates(res.data))
        .catch(err => {
          console.error("Failed to load candidates", err);
          setCandidates([]);
        })
        .finally(() => setLoadingCandidates(false));
    }
  }, [job]);

  const filteredCandidates = candidates.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: candidates.length,
    interview: candidates.filter(c => c.status === 'Interview').length,
    offer: candidates.filter(c => c.status === 'Offer').length,
    rejected: candidates.filter(c => c.status === 'Rejected').length
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4 flex flex-col max-h-[90vh] border border-blue-50">

        {/* Header Section with Blue Divider */}
        <div className="p-4 border-b border-blue-50 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
            <X size={14} />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600">
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 leading-none mb-1.5">{job.title}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <Building2 size={12} className="text-blue-300" />
                  <span>{job.department}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-300" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-blue-300" />
                  <span>{job.employmentType}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-blue-50 border-b border-blue-50 bg-slate-50/30">
          <div className="p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total</span>
            <span className="text-base font-black text-gray-900">{stats.total}</span>
          </div>
          <div className="p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Interviews</span>
            <span className="text-base font-black text-blue-700">{stats.interview}</span>
          </div>
          <div className="p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Offered</span>
            <span className="text-base font-black text-emerald-700">{stats.offer}</span>
          </div>
          <div className="p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Rejected</span>
            <span className="text-base font-black text-rose-600">{stats.rejected}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Job Details (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Requirements */}
            <section>
              <h3 className="flex items-center gap-2 text-md font-bold text-gray-900 mb-4">
                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                Requirements
              </h3>
              <ul className="space-y-3 pl-2">
                {job.requirements?.map((req, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-gray-600">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                    {req}
                  </li>
                ))}
              </ul>
            </section>

            {/* Responsibilities */}
            <section>
              <h3 className="flex items-center gap-2 text-md font-bold text-gray-900 mb-4">
                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                Responsibilities
              </h3>
              <ul className="space-y-3 pl-2">
                {job.responsibilities?.map((res, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-gray-600">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                    {res}
                  </li>
                ))}
              </ul>
            </section>

            {/* Benefits */}
            <section>
              <h3 className="flex items-center gap-2 text-md font-bold text-gray-900 mb-4">
                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                Benefits & Perks
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {job.benefits?.map((ben, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    {ben}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Skills & Candidates (1/3 width) */}
          <div className="space-y-8">

            {/* Skills */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills?.length ? job.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100">
                    {skill.name}
                  </span>
                )) : <p className="text-sm text-gray-500 italic">No specific skills listed.</p>}
              </div>
            </div>

            {/* Candidates */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-[400px]">
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Applicants</h3>
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">{filteredCandidates.length}</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingCandidates ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : filteredCandidates.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {filteredCandidates.map((c, i) => (
                      <div key={i} onClick={() => navigate(`/candidates/${c.id}`)} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer" title="View Candidate">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold ring-2 ring-white shadow-sm">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{c.name}</div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${c.status === 'Offer' ? 'bg-green-50 text-green-700 border-green-100' :
                            c.status === 'Interview' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              c.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                            {c.status}
                          </span>
                          {c.assignedBy && (
                            <div className="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase tracking-tighter">
                              <User size={8} />
                              BY {c.assignedBy.split(' ')[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                    <Users className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium text-gray-500">No applicants yet</p>
                    <p className="text-xs text-gray-400 mt-1">Candidates applied to this job will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-50 bg-slate-50/50 rounded-b-xl flex justify-between items-center">
          <button className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition">
            Delete Requisition
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Jobs: React.FC<JobsProps> = ({ searchQuery = '' }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<Job | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Hold'>('all');
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentEducation, setCurrentEducation] = useState('');
  const [currentBenefit, setCurrentBenefit] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    company: '',
    department: '',
    location: '',
    employmentType: 'Full-time',
    remote: false,
    salary: '',
    experienceLevel: 'Mid Level',
    skills: [],
    education: [],
    industry: '',
    benefits: [],
    deadline: '',
    status: 'Hold',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});

  // ... (rest of the component stays mostly the same, except for the view details integration)

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_URL);
      console.log('Fetched jobs:', response.data);
      if (response.data.content) {
        setJobs(response.data.content);
      } else if (Array.isArray(response.data)) {
        setJobs(response.data);
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const [currentWeight, setCurrentWeight] = useState(50);

  const addSkill = () => {
    // ... (keep existing implementation)
    if (currentSkill.trim() && !formData.skills.some(s => s.split(':')[0] === currentSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, `${currentSkill.trim()}:${currentWeight}`]
      }));
      setCurrentSkill('');
      setCurrentWeight(50);
    }
  };

  const removeSkill = (skillPair: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillPair)
    }));
  };

  const addEducation = () => {
    if (currentEducation.trim() && !formData.education.includes(currentEducation.trim())) {
      setFormData(prev => ({
        ...prev,
        education: [...prev.education, currentEducation.trim()]
      }));
      setCurrentEducation('');
    }
  };

  const removeEducation = (edu: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter(e => e !== edu)
    }));
  };

  const addBenefit = () => {
    if (currentBenefit.trim() && !formData.benefits.includes(currentBenefit.trim())) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, currentBenefit.trim()]
      }));
      setCurrentBenefit('');
    }
  };

  const removeBenefit = (benefit: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter(b => b !== benefit)
    }));
  };

  const validateForm = (): boolean => {
    // ... (keep existing implementation)
    const newErrors: Partial<Record<keyof JobFormData, string>> = {};

    if (!formData.title.trim()) newErrors.title = 'Job title is required';
    if (!formData.description.trim()) newErrors.description = 'Job description is required';
    if (!formData.company.trim()) newErrors.company = 'Company name is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.salary.trim()) newErrors.salary = 'Salary is required';
    if (formData.skills.length === 0) newErrors.skills = 'At least one skill is required';
    if (!formData.industry.trim()) newErrors.industry = 'Industry is required';
    if (!formData.deadline) newErrors.deadline = 'Application deadline is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditJob = (job: Job) => {
    setEditJobId(job.id);
    let mappedStatus: 'Open' | 'Hold' = 'Hold';
    if (job.status === 'Active' || job.status === 'Open') mappedStatus = 'Open';
    else if (job.status === 'Draft' || job.status === 'Hold') mappedStatus = 'Hold';

    setFormData({
      title: job.title,
      description: job.description,
      company: job.company,
      department: job.department,
      location: job.location,
      employmentType: (job.employmentType as any) || 'Full-time',
      remote: job.remote || false,
      salary: job.salary || '',
      experienceLevel: (job.experienceLevel as any) || 'Mid Level',
      skills: job.skills.map(s => `${s.name}:${s.weight}`),
      education: job.education || [],
      industry: job.industry || '',
      benefits: job.benefits || [],
      deadline: job.deadline || '',
      status: mappedStatus,
    });
    setMenuOpenId(null);
    setIsModalOpen(true);
  };

  const handleDeleteJob = async (jobId: string) => {
    // ... (keep existing implementation)
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await api.delete(`${API_URL}/${jobId}`);
        fetchJobs();
        setMenuOpenId(null);
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // ... (keep existing implementation)
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const payload = {
        ...formData,
        skills: formData.skills.map(s => {
          const [name, weight] = s.split(':');
          return { name, weight: parseInt(weight) };
        }),
        type: formData.employmentType,
      };

      console.log('Sending job data:', payload);
      if (editJobId) {
        await api.put(`${API_URL}/${editJobId}`, payload);
      } else {
        await api.post(API_URL, payload);
      }

      fetchJobs();

      setFormData({
        title: '',
        description: '',
        company: '',
        department: '',
        location: '',
        employmentType: 'Full-time',
        remote: false,
        salary: '',
        experienceLevel: 'Mid Level',
        skills: [],
        education: [],
        industry: '',
        benefits: [],
        deadline: '',
        status: 'Hold',
      });

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving job:', error);
      const message = error.response?.data?.message || error.message || 'Unknown error';
      alert(`Failed to save job: ${message}`);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditJobId(null);
    setErrors({});
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-50 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100/50">
            <Briefcase size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5 leading-none">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Management</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">Job Requisitions</h2>
          </div>
        </div>
        <button
          onClick={() => {
            setEditJobId(null);
            setFormData({
              title: '', description: '', company: '', department: '', location: '',
              employmentType: 'Full-time', remote: false, salary: '',
              experienceLevel: 'Mid Level', skills: [], education: [], industry: '',
              benefits: [], deadline: '', status: 'Hold',
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-lg shadow-md shadow-blue-100/50 text-[11px] font-black text-white hover:bg-blue-700 transition active:scale-95 uppercase tracking-widest leading-none"
        >
          <Plus size={14} /> Create Job
        </button>
      </div>

      {/* Filter Section with Premium Blue Border */}
      <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm flex items-center gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-lg">
          {[
            { id: 'all', label: 'All', color: 'blue' },
            { id: 'Open', label: 'Active', color: 'emerald' },
            { id: 'Hold', label: 'Hold', color: 'amber' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id as any)}
              className={`px-5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all
                ${statusFilter === btn.id
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Fetching Requisitions...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs
            .filter(job => {
              let normalizedStatus = job.status;
              if (normalizedStatus === 'Active') normalizedStatus = 'Open';
              if (normalizedStatus === 'Draft') normalizedStatus = 'Hold';
              return statusFilter === 'all' || normalizedStatus === statusFilter;
            })
            .filter(job => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              return (
                job.title.toLowerCase().includes(query) ||
                job.department.toLowerCase().includes(query) ||
                job.location.toLowerCase().includes(query) ||
                job.id.toLowerCase().includes(query)
              );
            })
            .map((job) => {
              const highlightText = (text: string) => {
                if (!searchQuery) return text;
                const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
                return parts.map((part, i) =>
                  part.toLowerCase() === searchQuery.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
                  ) : part
                );
              };

              return (
                <div key={job.id} onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  setSelectedJobForDetails(job);
                }} className="bg-white rounded-xl shadow-sm border border-blue-50 p-3 hover:border-blue-200 transition-all group cursor-pointer relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Briefcase size={14} />
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === job.id ? null : job.id); }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {menuOpenId === job.id && (
                        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 transition-all">
                          <div className="py-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditJob(job); }}
                              className="flex items-center px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              Edit Job
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                              className="flex items-center px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 w-full text-left"
                            >
                              Delete Job
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-[11px] font-black text-gray-900 mb-0.5 leading-tight uppercase">{highlightText(job.title)}</h3>
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2.5">{highlightText(job.department)}</p>

                  <div className="space-y-1 mb-3">
                    <div className="flex items-center text-[10px] font-bold text-gray-600">
                      <MapPin size={11} className="mr-1.5 text-blue-300" />
                      {job.location}
                    </div>
                    <div className="flex items-center text-[10px] font-bold text-gray-600">
                      <Clock size={11} className="mr-1.5 text-blue-300" />
                      {job.employmentType}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center text-[10px] font-black text-gray-900">
                      <Users size={11} className="mr-1.5 text-blue-300" />
                      {job.applicants} Applicants
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${['Active', 'Open'].includes(job.status) ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {job.status === 'Active' ? 'Open' : (job.status === 'Draft' ? 'Hold' : job.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2 pt-3 border-t border-slate-50">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedJobForDetails(job); }}
                      className="flex-1 bg-white border border-slate-200 text-slate-500 py-1.5 rounded-lg text-[9px] font-black hover:bg-slate-50 transition uppercase tracking-widest"
                    >
                      Details
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/candidates'); }}
                      className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-[9px] font-black hover:bg-blue-700 transition uppercase tracking-widest shadow-md shadow-blue-100"
                    >
                      Sourcing
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {selectedJobForDetails && (
        <JobDetailsModal
          job={selectedJobForDetails}
          onClose={() => setSelectedJobForDetails(null)}
        />
      )}

      {/* Create Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-blue-50">
            <div className="sticky top-0 bg-white border-b border-blue-50 px-5 py-4 flex items-center justify-between z-20">
              <h3 className="text-lg font-black text-gray-900 leading-none uppercase tracking-tight">{editJobId ? 'Edit Job' : 'Create Job'}</h3>
              <button onClick={handleCloseModal} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Briefcase size={14} />
                  Basic Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="e.g., Senior Software Engineer"
                    />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.company ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Company name"
                    />
                    {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.department ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="e.g., Engineering, Marketing"
                    />
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.industry ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="e.g., Technology, Healthcare"
                    />
                    {errors.industry && <p className="text-red-500 text-xs mt-1">{errors.industry}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Describe the role, responsibilities, and requirements..."
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>
              </div>

              {/* Location & Type */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Location & Employment Type
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      disabled={formData.remote}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.location ? 'border-red-500' : 'border-gray-300'
                        } ${formData.remote ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="e.g., San Francisco, CA"
                    />
                    {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => handleInputChange('employmentType', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Experience Level
                    </label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Entry Level">Entry Level</option>
                      <option value="Mid Level">Mid Level</option>
                      <option value="Senior Level">Senior Level</option>
                      <option value="Lead">Lead</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salary Range <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.salary}
                        onChange={(e) => handleInputChange('salary', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.salary ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="e.g., $80,000 - $120,000"
                      />
                    </div>
                    {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary}</p>}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remote"
                    checked={formData.remote}
                    onChange={(e) => handleInputChange('remote', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="remote" className="ml-2 text-sm text-gray-700">
                    This is a remote position
                  </label>
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Requirements
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Skills <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-3 mb-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentSkill}
                        onChange={(e) => setCurrentSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Skill (e.g. React)"
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition lg:whitespace-nowrap"
                      >
                        Add Skill
                      </button>
                    </div>
                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Weight:</span>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={currentWeight}
                        onChange={(e) => setCurrentWeight(parseInt(e.target.value))}
                        className="flex-1 accent-indigo-600"
                      />
                      <span className="text-sm font-bold text-indigo-700 w-8">{currentWeight}%</span>
                    </div>
                  </div>
                  {errors.skills && <p className="text-red-500 text-xs mb-2">{errors.skills}</p>}
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skillPair) => {
                      const [name, weight] = skillPair.split(':');
                      return (
                        <span
                          key={skillPair}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium border border-indigo-200"
                        >
                          {name} <span className="text-indigo-500 text-xs">({weight}%)</span>
                          <button
                            type="button"
                            onClick={() => removeSkill(skillPair)}
                            className="hover:text-red-600 transition-colors ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Education Requirements
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentEducation}
                      onChange={(e) => setCurrentEducation(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEducation())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Bachelor's in Computer Science"
                    />
                    <button
                      type="button"
                      onClick={addEducation}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.education.map((edu) => (
                      <span
                        key={edu}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {edu}
                        <button
                          type="button"
                          onClick={() => removeEducation(edu)}
                          className="hover:text-blue-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Additional Information
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Benefits
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentBenefit}
                      onChange={(e) => setCurrentBenefit(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Health Insurance, 401k"
                    />
                    <button
                      type="button"
                      onClick={addBenefit}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.benefits.map((benefit) => (
                      <span
                        key={benefit}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {benefit}
                        <button
                          type="button"
                          onClick={() => removeBenefit(benefit)}
                          className="hover:text-green-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Application Deadline <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => handleInputChange('deadline', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.deadline ? 'border-red-500' : 'border-gray-300'
                          }`}
                      />
                    </div>
                    {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value as 'Open' | 'Hold')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Hold">Hold</option>
                      <option value="Open">Open</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  {editJobId ? 'Save Changes' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;
