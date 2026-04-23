import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { Candidate, Job, JobApplication, Interview } from '../types';
import {
    X, Mail, Phone, MapPin, Calendar, Briefcase, CheckCircle2,
    Clock, XCircle, FileText, MessageSquare, Video, User, Download,
    ExternalLink, Plus, Loader2, Search, UserCheck, ChevronLeft,
    Linkedin, Github, Twitter, Globe, Upload, FolderPlus,
    MoreHorizontal, Maximize2, ChevronRight, Filter, ArrowRight,
    MessageCircle, AtSign, Link as LinkIcon, Edit2, Zap, Flame,
    Copy, Sparkles, Star, Trash2, FileUp, MoreVertical, Layout,
    CheckSquare, Bell, Share2, Edit3,
    Building2, ChevronDown, Send, RotateCcw, Archive, Menu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatUserDisplayName } from '../utils';

const AttributeRow: React.FC<{ label: string; value: React.ReactNode; isLong?: boolean }> = ({ label, value, isLong }) => (
    <div className="flex items-start text-[8px] font-bold">
        <span className="w-16 text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
        <div className={`text-slate-700 ${isLong ? 'truncate max-w-[120px]' : ''}`}>{value}</div>
    </div>
);

const DetailItem: React.FC<{ 
    label: string, 
    value: any, 
    icon?: React.ReactNode, 
    isLink?: boolean, 
    isTags?: boolean, 
    showEdit?: boolean,
    tag?: string,
    onClick?: () => void,
    onEdit?: () => void
}> = ({ label, value, icon, isLink, isTags, showEdit, tag, onClick, onEdit }) => {
    return (
        <div className="space-y-1.5 min-h-[40px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</p>
            <div className="flex items-center gap-2">
                {icon && <div className="p-1 bg-gray-50 rounded text-gray-400">{icon}</div>}
                
                {isTags && Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1.5">
                        {value.slice(0, 2).map((v, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-black rounded uppercase">
                                {v}
                            </span>
                        ))}
                        {value.length > 2 && (
                            <span className="px-1.5 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-bold rounded">
                                +{value.length - 2}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span 
                            onClick={isLink ? onClick : undefined}
                            className={`text-[13px] font-black tracking-tight ${isLink ? 'text-blue-600 cursor-pointer hover:underline' : 'text-slate-800'}`}>
                            {value || 'Not available'}
                        </span>
                        {tag && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase">
                                {tag}
                            </span>
                        )}
                        {showEdit && <Edit2 onClick={onEdit} size={12} className="text-gray-300 hover:text-blue-500 cursor-pointer" />}
                    </div>
                )}
            </div>
        </div>
    );
}

const SocialBtn: React.FC<{ icon: React.ReactNode; url: string }> = ({ icon, url }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white border border-gray-100 rounded-md shadow-sm hover:bg-gray-50 transition-all text-slate-500 flex items-center justify-center">
        {icon}
    </a>
)

const ActionBtn: React.FC<{ icon: React.ReactNode; onClick: () => void }> = ({ icon, onClick }) => (
    <button onClick={onClick} className="w-8 h-8 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-all">
        {icon}
    </button>
)

const DropdownItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; color?: string }> = ({ icon, label, onClick, color = "text-slate-600" }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest ${color} hover:bg-slate-50 rounded-md transition-all`}>
        {icon}
        <span>{label}</span>
    </button>
)

const NoteCard: React.FC<{ 
    content: React.ReactNode; 
    createdDate: string; 
    createdBy: string;
    type: 'Note' | 'Call' | 'Task' | 'Meeting';
    onEdit?: () => void;
}> = ({ content, createdDate, createdBy, type, onEdit }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-3 group hover:border-blue-100 transition-all">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${type === 'Note' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        {type === 'Note' ? <FileText size={14} /> : <Phone size={14} />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{type}</span>
                    {type === 'Call' && <span className="bg-gray-100 text-gray-500 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-tighter">Call</span>}
                </div>
                <button onClick={onEdit} className="text-gray-300 hover:text-blue-500 transition-colors">
                    <Edit3 size={14} />
                </button>
            </div>
            
            <div className={`text-[11px] font-medium text-slate-600 space-y-2 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                {content}
            </div>

            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
            >
                {isExpanded ? 'View Less' : 'View More'}
            </button>

            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5">
                    <Clock size={10} />
                    <span>Created By <span className="text-slate-700">{createdBy}</span> On {createdDate}</span>
                </div>
            </div>
            
            <div className="flex items-center justify-between pt-1">
                <span className="text-blue-600 text-[9px] font-black uppercase tracking-widest cursor-pointer hover:underline">1 Association(s)</span>
                <button 
                    onClick={() => alert('Feature coming soon!')}
                    className="text-blue-600 text-[9px] font-black uppercase tracking-widest hover:underline"
                >
                    Add Collaborator
                </button>
            </div>
        </div>
    );
};

const FileUploadArea: React.FC<{ onUpload: (file: File) => void; isUploading?: boolean }> = ({ onUpload, isUploading }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpload(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            onUpload(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div 
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`p-8 border-2 border-dashed rounded-2xl transition-all group flex flex-col items-center justify-center text-center cursor-pointer ${isUploading ? 'bg-blue-50/50 border-blue-200 cursor-wait' : 'border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200'}`}
        >
            <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 transition-all border border-gray-50 ${isUploading ? 'animate-pulse' : 'group-hover:scale-110'}`}>
                {isUploading ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin" /> : <Upload className="w-8 h-8 text-blue-400" />}
            </div>
            <p className="text-xs font-black text-slate-800 tracking-tight">
                {isUploading ? 'Processing Resume...' : <><span className="text-blue-600 hover:underline">Upload File</span> or drag and drop here</>}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">
                {isUploading ? 'Analyzing candidate details using AI...' : <>File type: PDF, PNG, JPG, GIF etc. <span className="text-blue-600 border-b border-blue-200">Learn More</span></>}
            </p>
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleChange}
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg,.gif"
            />
        </div>
    );
};

const CircleAction: React.FC<{ icon: React.ReactNode; color: string; onClick?: () => void }> = ({ icon, color, onClick }) => (
    <div onClick={onClick} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all ${color}`}>{icon}</div>
);

const CandidateDetails: React.FC = () => {
    const formatDate = (dateInput: string | number[] | null) => {
        if (!dateInput) return 'N/A';
        // Handle array format [2026, 3, 3, ...] from Jackson
        if (Array.isArray(dateInput)) {
            const [year, month, day] = dateInput;
            return `${day}/${month}/${year}`;
        }
        const date = new Date(dateInput);
        return date.toString() !== 'Invalid Date' ? date.toLocaleDateString() : 'N/A';
    };

    const convertTo24Hour = (timeStr: string) => {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
        return `${hours.padStart(2, '0')}:${minutes}`;
    };

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUploadingSidebar, setIsUploadingSidebar] = useState(false);
    const [history, setHistory] = useState<Candidate[]>([]);
    const [activeTab, setActiveTab] = useState('LinkedIn Messages');
    const [activeSidebarTab, setActiveSidebarTab] = useState('All');
    const [isScheduling, setIsScheduling] = useState(false);
    const [resume, setResume] = useState<any>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [isCvModalOpen, setIsCvModalOpen] = useState(false);
    const [formattedCv, setFormattedCv] = useState<string>('');
    const [isFormatting, setIsFormatting] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [isUpdatingStage, setIsUpdatingStage] = useState(false);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [isAddingMeeting, setIsAddingMeeting] = useState(false);
    const [isConnectingZoom, setIsConnectingZoom] = useState(false);

    const [assignedJobs, setAssignedJobs] = useState<JobApplication[]>([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [allJobs, setAllJobs] = useState<Job[]>([]);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [isHotlistModalOpen, setIsHotlistModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
    const [isAllDetailsExpanded, setIsAllDetailsExpanded] = useState(false);
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [isSavingInline, setIsSavingInline] = useState(false);
    const [inlineFormData, setInlineFormData] = useState<any>({});
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setCurrentUser(JSON.parse(userStr));
            } catch (e) {}
        }
    }, []);

    const handleLinkedInSearch = () => {
        if (candidate?.name) {
            window.open(`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(candidate.name)}`, '_blank');
        }
    };

    const getDisplayUser = (val?: string) => {
        if (val && val !== 'Shaik Yashu' && val !== 'System' && val !== 'Manager') return val;
        return formatUserDisplayName(currentUser);
    };

    const handleFileUpload = async (file: File) => {
        if (!candidate) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', 'UPLOAD');

        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userObj = JSON.parse(userStr);
                const assignedBy = userObj.name || userObj.email || 'System';
                formData.append('assignedBy', assignedBy);
            } catch (e) {
                formData.append('assignedBy', 'System');
            }
        } else {
            formData.append('assignedBy', 'System');
        }

        try {
            setIsUploadingSidebar(true);
            const response = await api.post('/resumes/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Resume uploaded successfully! Candidate details have been parsed.");
            
            // Refresh data
            const refreshed = await fetchCandidate();
            if (refreshed && refreshed.resumeId) {
                await fetchResume(refreshed.resumeId);
            }
            await fetchAssignedJobs(candidate.id);
            await fetchInterviews();
        } catch (error: any) {
            console.error("Upload failed", error);
            const errorMsg = error.response?.data || "Failed to upload resume. It might already exist in the system.";
            alert(errorMsg);
        } finally {
            setIsUploadingSidebar(false);
        }
    };

    const fetchResume = async (resumeId: string) => {
        try {
            const res = await api.get(`/resumes/${resumeId}`);
            setResume(res.data);
        } catch (error) {
            console.error("Failed to fetch resume details", error);
        }
    };


    const fetchAssignedJobs = async (candidateId: string) => {
        try {
            const response = await api.get(`/applications/candidate/${candidateId}`);
            const apps: JobApplication[] = response.data;

            // Fetch job details for each application
            const appsWithJobs = await Promise.all(apps.map(async (app) => {
                try {
                    const jobRes = await api.get(`/jobs/${app.jobId}`);
                    return { ...app, job: jobRes.data };
                } catch (e) {
                    return app;
                }
            }));

            setAssignedJobs(appsWithJobs);
        } catch (error) {
            console.error("Failed to fetch assigned jobs", error);
        }
    };

    const handleDownloadResume = async () => {
        if (!candidate || !candidate.resumeId) {
            alert("No resume available for this candidate.");
            return;
        }

        try {
            const response = await api.get(`/resumes/${candidate.resumeId}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', resume?.fileName || `resume_${candidate.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to download resume.");
        }
    };

    const handleGenerateFormattedCv = async () => {
        if (!candidate || !candidate.resumeId) {
            alert("No resume available to format.");
            return;
        }
        
        setIsFormatting(true);
        setIsCvModalOpen(true);
        try {
            const res = await api.get(`/resumes/${candidate.resumeId}/formatted`);
            setFormattedCv(res.data);
        } catch (error) {
            console.error("Formatting failed", error);
            setFormattedCv("Failed to generate CV. Please try again later.");
        } finally {
            setIsFormatting(false);
        }
    };

    const fetchCandidate = async () => {
        try {
            const res = await api.get(`/candidates/${id}`);
            setCandidate(res.data);
            return res.data;
        } catch (error) {
            console.error("Failed to fetch candidate", error);
            return null;
        }
    };

    const fetchInterviews = async () => {
        if (!id) return;
        try {
            const res = await api.get(`/interviews/candidate/${id}`);
            setInterviews(res.data || []);
        } catch (error) {
            console.error("Failed to fetch interviews", error);
        }
    };

    useEffect(() => {
        if (activeTab === 'Assigned Jobs' && candidate) {
            fetchAssignedJobs(candidate.id);
        }
    }, [activeTab]);

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            const data = await fetchCandidate();
            if (data) {
                setInlineFormData({
                    currentSalary: data.currentSalary || '',
                    salaryExpectation: data.salaryExpectation || '',
                    noticePeriod: data.noticePeriod || 0,
                    experience: data.experience || 0,
                    relevantExperience: data.relevantExperience || 0,
                    currentOrganization: data.currentOrganization || '',
                    postalCode: data.postalCode || '',
                    locality: data.locality || '',
                    japaneseLanguageProficiency: data.japaneseLanguageProficiency || '',
                    visaType: data.visaType || '',
                    visaValidity: data.visaValidity || '',
                    summary: data.summary || '',
                    interviewNotes: data.interviewNotes || '',
                    recentlyAppliedCompanies: data.recentlyAppliedCompanies || '',
                    reasonForChange: data.reasonForChange || '',
                    salaryType: data.salaryType || 'Monthly',
                    availableFrom: data.availableFrom || 'Immediately',
                    currentEmploymentStatus: data.currentEmploymentStatus || 'Full-time',
                    country: data.country || '',
                });
                if (data.resumeId) {
                    await fetchResume(data.resumeId);
                }
                await fetchAssignedJobs(data.id);
                try {
                    const historyRes = await api.get('/candidates/history', { params: { email: data.email } });
                    setHistory(historyRes.data);
                } catch (e) {
                    console.error("Failed to fetch history", e);
                }
                await fetchInterviews();

                // Open meeting modal if redirected from inbox with state
                if ((location.state as any)?.openMeeting) {
                    setIsMeetingModalOpen(true);
                }
            }
            setLoading(false);
        };
        loadAllData();
    }, [id]);


    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(text);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleAssignJob = async (jobId: string) => {
        if (!candidate) return;
        const job = allJobs.find(j => j.id === jobId);
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

        try {
            // 1. Create Application
            await api.post('/applications', {
                candidateId: candidate.id,
                jobId: jobId,
                status: 'PENDING'
            });

            // 2. Update Primary Role on Candidate Entity (for the table view)
            await api.patch(`/candidates/${candidate.id}/assign-job`, null, { 
                params: { 
                    jobId: jobId, 
                    role: job.title,
                    jobAssignedBy: assignerName
                } 
            });

            await fetchAssignedJobs(candidate.id);
            await fetchCandidate(); // Refresh candidate to see 'jobAssignedBy'
            setIsAssignModalOpen(false);
            setActiveTab('Assigned Jobs');
            alert("Candidate assigned successfully!");
        } catch (error: any) {
            console.error("Failed to assign job", error);
            alert(error.response?.data?.message || "Failed to assign job");
        }
    };

    const handleUpdateStage = async (status: string, stage: string, remarks: string, stageDate: string) => {
        if (!selectedApplication) return;
        setIsUpdatingStage(true);
        try {
            await api.put(`/applications/${selectedApplication.id}`, {
                ...selectedApplication,
                status: status,
                stage: stage,
                remarks: remarks,
                stageDate: stageDate
            });
            // Sync with candidate's interviewRound for the pipeline
            let interviewRound = '';
            if (stage === 'Screening') interviewRound = 'Screening';
            else if (stage === 'Technical Interview') interviewRound = 'Technical';
            else if (stage === 'Managerial Interview') interviewRound = 'Managerial';
            else if (stage === 'HR Round') interviewRound = 'HR';

            if (interviewRound && candidate) {
                await api.put(`/candidates/${candidate.id}`, {
                    ...candidate,
                    interviewRound,
                    status: status === 'HIRED' ? 'Hired' : (status === 'REJECTED' ? 'Rejected' : 'Interview')
                });
            }

            await fetchAssignedJobs(candidate!.id);
            await fetchCandidate(); // Refresh candidate state
            setIsStageModalOpen(false);
            alert("Hiring stage updated successfully!");
        } catch (error) {
            console.error("Failed to update stage", error);
            alert("Failed to update stage.");
        } finally {
            setIsUpdatingStage(false);
        }
    };

    const handleScheduleMeeting = async (meeting: any) => {
        if (!candidate) return;
        setIsAddingMeeting(true);
        try {
            // Convert simple form date/time strings to LocalDateTime ISO format for backend
            const [hours, modifier] = meeting.startTime.split(' ');
            let [h, m] = hours.split(':');
            if (modifier === 'PM' && h !== '12') h = (parseInt(h) + 12).toString();
            if (modifier === 'AM' && h === '12') h = '00';
            
            const startDateTime = `${meeting.startDate}T${h.padStart(2, '0')}:${m}:00`;
            
            // Just add 30 mins for end time if not provided
            const endDateTime = new Date(new Date(startDateTime).getTime() + 30 * 60000).toISOString().split('.')[0];

            const interviewData = {
                candidateId: candidate.id,
                candidateName: candidate.name,
                startTime: startDateTime,
                endTime: endDateTime,
                type: 'Video',
                meetingLink: meeting.location,
                interviewer: currentUser?.name || 'Aparna Boligerla',
                notes: meeting.title,
                status: 'Scheduled'
            };

            await api.post('/interviews', interviewData);
            alert("Interview scheduled successfully!");
            setIsMeetingModalOpen(false);
            // Refresh interviews list if needed
            fetchInterviews();
        } catch (error) {
            console.error("Failed to schedule meeting", error);
            alert("Failed to schedule interview. Please check the date and time format.");
        } finally {
            setIsAddingMeeting(false);
        }
    };

    const handleInlineSave = async () => {
        if (!candidate) return;
        setIsSavingInline(true);
        try {
            const updated = { ...candidate, ...inlineFormData };
            await api.put(`/candidates/${candidate.id}`, updated);
            setCandidate(updated);
            setIsInlineEditing(false);
            alert("Changes saved in-place!");
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save changes.");
        } finally {
            setIsSavingInline(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-white">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
    );

    if (!candidate) return <div className="p-10 text-center font-bold">Candidate not found.</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-700">
            <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 overflow-y-auto bg-white flex flex-col border-r border-gray-100 relative min-h-0">
                    {/* Main Content Area */}
                    {/* Header bar / Breadcrumb */}
                    <div className="px-6 py-3 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-50">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/candidates')}>Candidate</span>
                                <ChevronRight size={14} className="text-slate-300" />
                                <span className="text-blue-700 font-extrabold">Details</span>
                            </div>
                            <div className="h-4 w-[1px] bg-gray-200 mx-2" />
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full text-[11px] font-bold text-slate-600 shadow-sm">
                                <span className="text-slate-400">ID -</span> {(candidate.sequenceId || 1).toString().padStart(2, '0')}
                                <Copy size={12} className="text-slate-300 hover:text-blue-500 cursor-pointer ml-1" onClick={() => handleCopy(candidate.id)} />
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <SocialBtn icon={<Linkedin size={14} className="text-[#0077b5]" />} url={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(candidate.name)}`} />
                                <button className="p-1 text-slate-300 hover:text-blue-500 transition-colors">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => alert('Link to Contact feature coming soon!')}
                                className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <Layout size={14} className="text-blue-600" />
                                Link To Contact
                            </button>
                        </div>
                    </div>
                    {/* Profile Hero Section (Light Green) */}
                    <div className="px-8 py-6 bg-[#F1FAF3] border-b border-[#E8F5E9]">
                        <div className="flex items-start justify-between">
                            <div className="flex gap-5">
                                <div className="relative group">
                                    <div className="w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden bg-white">
                                        {candidate.avatar ? (
                                            <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <User size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white shadow-sm">
                                        <CheckCircle2 size={12} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">{candidate.name}</h1>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                            <Briefcase size={14} className="text-slate-400" />
                                            {candidate.role || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                        <MapPin size={14} className="text-slate-400" />
                                        {candidate.locality || candidate.country || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right space-y-3">
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-blue-600 rounded text-white shadow-sm">
                                            <Linkedin size={16} />
                                        </div>
                                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
                                            {candidate.currentOrganization || 'N/A'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                         Current Company
                                    </span>
                                </div>
                                <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-600">
                                    <MapPin size={14} className="text-slate-400" />
                                    {candidate.country || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Bar (White) */}
                    <div className="px-8 py-3 bg-white border-b border-gray-100 flex items-center justify-between text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 group">
                                <Phone size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <span className="text-blue-600 cursor-pointer">{candidate.phone || 'N/A'}</span>
                                <div className="flex items-center gap-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ExternalLink size={12} className="text-slate-300 hover:text-blue-500 cursor-pointer" />
                                    <MessageCircle size={12} className="text-emerald-500 hover:text-emerald-600 cursor-pointer" />
                                    <Copy size={12} className="text-slate-300 hover:text-blue-500 cursor-pointer" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 group">
                                <Mail size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <span className="text-blue-600 cursor-pointer">{candidate.email}</span>
                                <Copy size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-blue-500 cursor-pointer" />
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-slate-400" />
                                <span className="text-slate-700">{getDisplayUser(candidate.uploadedBy || candidate.assignedBy).split(' ')[0]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <RotateCcw size={16} className="text-slate-400" />
                                <span className="text-slate-700">{formatDate(candidate.createdAt || candidate.appliedDate)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="mt-1 border-b border-blue-50 bg-slate-50 flex px-2 overflow-x-auto no-scrollbar">
                        {['LinkedIn Messages', 'All Details', 'Assigned Jobs', 'Related Emails', 'Candidate History', 'Hotlists'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 leading-none ${activeTab === tab ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 p-4 bg-white relative">
                        {activeTab === 'LinkedIn Messages' && (
                            <div className="h-[500px] border border-blue-50 rounded-xl overflow-hidden shadow-sm">
                                <LinkedInMessaging candidate={candidate} />
                            </div>
                        )}
                        {activeTab === 'Assigned Jobs' && (
                            <div className="flex-1 flex flex-col h-full">
                                {/* Action Buttons Header */}
                                <div className="flex justify-end gap-2 mb-4">
                                    <button
                                        onClick={async () => {
                                            const res = await api.get('/jobs');
                                            setAllJobs(res.data.content || res.data || []);
                                            setIsAssignModalOpen(true);
                                        }}
                                        className="h-8 px-4 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-all shadow-sm">
                                        Assign Job
                                    </button>
                                </div>

                                {/* Assigned Jobs List */}
                                <div className="flex-1 space-y-2 overflow-y-auto">
                                    {assignedJobs.length > 0 ? assignedJobs.map((app) => (
                                        <div key={app.id} className="p-2 border border-blue-50 rounded-lg hover:border-blue-200 transition-all flex items-center justify-between bg-white group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center text-blue-600 border border-blue-100">
                                                    <Building2 size={16} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <h4 className="text-[11px] font-black text-gray-900 leading-none">{app.job?.title || 'Unknown Role'}</h4>
                                                    <p className="text-[9px] font-bold text-blue-500 leading-none uppercase">{app.job?.company || 'Unknown Company'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="flex flex-col items-center">
                                                    <div
                                                        onClick={() => {
                                                            setSelectedApplication(app);
                                                            setIsStageModalOpen(true);
                                                        }}
                                                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border cursor-pointer hover:shadow-sm transition-all ${app.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            app.status === 'HIRED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                app.status === 'SHORTLISTED' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    'bg-blue-50 text-blue-600 border-blue-100'
                                                            }`}>
                                                        {app.status === 'PENDING' ? 'Assigned' : app.status.replace('_', ' ')}
                                                    </div>
                                                    <span className="text-[7px] font-black text-slate-400 mt-0.5 uppercase tracking-tighter">
                                                        {app.stage || 'Screening'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <div onClick={(e) => { e.stopPropagation(); setIsMeetingModalOpen(true); }} className="p-1.5 bg-slate-50 rounded-md text-slate-400 hover:text-amber-600 cursor-pointer transition-colors"><Calendar size={12} /></div>
                                                    <div onClick={(e) => { e.stopPropagation(); if (app.jobId) navigate(`/jobs/details/${app.jobId}`); }} className="p-1.5 bg-slate-50 rounded-md text-slate-400 hover:text-blue-600 cursor-pointer transition-colors"><Briefcase size={12} /></div>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex-1 flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No jobs assigned</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'All Details' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Information Overview Header */}
                                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div 
                                            onClick={() => setIsAllDetailsExpanded(!isAllDetailsExpanded)}
                                            className="p-1.5 bg-gray-50 rounded-lg border border-gray-100 shadow-sm cursor-pointer hover:bg-slate-100 transition-all"
                                        >
                                            <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${isAllDetailsExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <h2 
                                                onClick={() => setIsAllDetailsExpanded(!isAllDetailsExpanded)}
                                                className="text-[13px] font-black text-slate-800 uppercase tracking-tight cursor-pointer hover:text-blue-600"
                                            >
                                                Information Overview
                                            </h2>
                                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">18</span>
                                            <button 
                                                onClick={() => setIsInlineEditing(!isInlineEditing)}
                                                className={`ml-4 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${isInlineEditing ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'}`}
                                            >
                                                {isInlineEditing ? 'Cancel Edit' : 'Edit Details'}
                                            </button>
                                            {isInlineEditing && (
                                                <button 
                                                    onClick={handleInlineSave}
                                                    disabled={isSavingInline}
                                                    className="ml-2 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {isSavingInline ? 'Saving...' : 'Save All'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="relative group">
                                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                            <input 
                                                type="text" 
                                                placeholder="Search Field" 
                                                className="pl-10 pr-6 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 w-56 transition-all"
                                            />
                                        </div>
                                        <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-500 shadow-sm">
                                            <Filter size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Information Grid (3 columns) */}
                                <div className={`grid grid-cols-3 gap-x-16 gap-y-10 px-2 transition-all duration-500 overflow-hidden ${!isAllDetailsExpanded ? 'max-h-[300px]' : 'max-h-[2000px]'}`}>
                                    {/* Column 1 */}
                                    <div className="space-y-8">
                                        <DetailItem 
                                            label="Current Organization" 
                                            value={isInlineEditing ? <input name="currentOrganization" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.currentOrganization} onChange={e => setInlineFormData({...inlineFormData, currentOrganization: e.target.value})} /> : candidate.currentOrganization} 
                                            icon={<Building2 size={16} className="text-blue-500" />} 
                                        />
                                        <DetailItem 
                                            label="Salary Expectation" 
                                            value={isInlineEditing ? <input name="salaryExpectation" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.salaryExpectation} onChange={e => setInlineFormData({...inlineFormData, salaryExpectation: e.target.value})} /> : (candidate.salaryExpectation || 'N/A')} 
                                        />
                                        <DetailItem 
                                            label="Total Experience" 
                                            value={isInlineEditing ? <div className="flex items-center gap-1"><input name="experience" type="number" className="w-20 bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.experience} onChange={e => setInlineFormData({...inlineFormData, experience: parseInt(e.target.value) || 0})} /><span>Years</span></div> : (candidate.experience ? `${candidate.experience} Years` : 'N/A')} 
                                        />
                                        <DetailItem label="Currency" value={candidate.salaryType?.includes('¥') || candidate.locality?.includes('Japan') || (candidate.country && candidate.country.toLowerCase() === 'japan') ? '¥' : (candidate.currentSalary?.includes('$') ? '$' : (candidate.locality?.includes('India') || candidate.country?.includes('India') ? '₹' : 'N/A'))} />
                                        <DetailItem 
                                            label="Country" 
                                            value={isInlineEditing ? <input name="country" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.country} onChange={e => setInlineFormData({...inlineFormData, country: e.target.value})} /> : (candidate.country || 'N/A')} 
                                        />
                                        <DetailItem 
                                            label="Job Locality" 
                                            value={isInlineEditing ? <input name="locality" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.locality} onChange={e => setInlineFormData({...inlineFormData, locality: e.target.value})} /> : (candidate.locality || 'Not specified')} 
                                        />
                                        <DetailItem label="Language" value={candidate.languageSkills && candidate.languageSkills.length > 0 ? candidate.languageSkills.join(', ') : 'Not specified'} />
                                    </div>
                                    {/* Column 2 */}
                                    <div className="space-y-8">
                                        <DetailItem 
                                            label="Current Salary" 
                                            value={isInlineEditing ? <input name="currentSalary" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.currentSalary} onChange={e => setInlineFormData({...inlineFormData, currentSalary: e.target.value})} /> : (candidate.currentSalary || 'N/A')} 
                                        />
                                        <DetailItem onClick={handleDownloadResume} label="Resume" value="Resume" icon={<FileText size={16} className="text-blue-500" />} isLink />
                                        <DetailItem 
                                            label="Relevant Experience" 
                                            value={isInlineEditing ? <div className="flex items-center gap-1"><input name="relevantExperience" type="number" className="w-20 bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.relevantExperience} onChange={e => setInlineFormData({...inlineFormData, relevantExperience: parseInt(e.target.value) || 0})} /><span>Years</span></div> : (candidate.relevantExperience ? `${candidate.relevantExperience} Years` : '0 Years')} 
                                        />
                                        <DetailItem 
                                            label="Notice Period (days)" 
                                            value={isInlineEditing ? <input name="noticePeriod" type="number" className="w-24 bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.noticePeriod} onChange={e => setInlineFormData({...inlineFormData, noticePeriod: parseInt(e.target.value) || 0})} /> : (candidate.noticePeriod ? `${candidate.noticePeriod} Days` : 'Not available')} 
                                        />
                                        <DetailItem 
                                            label="Employment Status" 
                                            value={isInlineEditing ? <input name="currentEmploymentStatus" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.currentEmploymentStatus} onChange={e => setInlineFormData({...inlineFormData, currentEmploymentStatus: e.target.value})} /> : (candidate.currentEmploymentStatus || 'Full-time')} 
                                        />
                                        <DetailItem onClick={handleGenerateFormattedCv} label="Formatted CV" value="CF" icon={<FileUp size={16} className="text-orange-500" />} isLink />
                                    </div>
                                    {/* Column 3 */}
                                    <div className="space-y-8">
                                        <DetailItem label="Skills" value={candidate.skills || ['React', 'Node.js']} isTags />
                                        <DetailItem label="Source" value={`${candidate.source || 'LinkedIn'} (Added by ${getDisplayUser(candidate.uploadedBy)})`} />
                                        <DetailItem 
                                            label="Salary Type" 
                                            value={isInlineEditing ? <input name="salaryType" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.salaryType} onChange={e => setInlineFormData({...inlineFormData, salaryType: e.target.value})} /> : (candidate.salaryType || 'Monthly')} 
                                        />
                                        <DetailItem 
                                            label="Salary Expectation" 
                                            value={isInlineEditing ? <input name="salaryExpectation" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.salaryExpectation} onChange={e => setInlineFormData({...inlineFormData, salaryExpectation: e.target.value})} /> : (candidate.salaryExpectation || 'N/A')} 
                                        />
                                        <DetailItem 
                                            label="Visa Type" 
                                            value={isInlineEditing ? <input name="visaType" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.visaType} onChange={e => setInlineFormData({...inlineFormData, visaType: e.target.value})} /> : (candidate.visaType || 'N/A')} 
                                        />
                                        <DetailItem 
                                            label="Postal Code" 
                                            value={isInlineEditing ? <input name="postalCode" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.postalCode} onChange={e => setInlineFormData({...inlineFormData, postalCode: e.target.value})} /> : (candidate.postalCode || 'N/A')} 
                                        />
                                        <DetailItem 
                                            label="Available From" 
                                            value={isInlineEditing ? <input name="availableFrom" className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold" value={inlineFormData.availableFrom} onChange={e => setInlineFormData({...inlineFormData, availableFrom: e.target.value})} /> : (candidate.availableFrom || 'Immediately')} 
                                        />
                                        <DetailItem 
                                            label="Japanese language proficiency" 
                                            value={isInlineEditing ? (
                                                <select 
                                                    name="japaneseLanguageProficiency" 
                                                    className="w-full bg-slate-50 border-none outline-none p-1 rounded font-bold appearance-none cursor-pointer" 
                                                    value={inlineFormData.japaneseLanguageProficiency} 
                                                    onChange={e => setInlineFormData({...inlineFormData, japaneseLanguageProficiency: e.target.value})}
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
                                            ) : (candidate.japaneseLanguageProficiency || 'N/A')} 
                                            tag="CF" 
                                        />
                                    </div>
                                </div>

                                <div className="pt-12 flex justify-center border-t border-gray-50">
                                    <button 
                                        onClick={() => setIsAllDetailsExpanded(!isAllDetailsExpanded)}
                                        className="px-6 py-2 text-[11px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-full transition-all"
                                    >
                                        {isAllDetailsExpanded ? 'Show Less' : 'Show More'}
                                    </button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'Hotlists' && (
                            <div className="flex-1 flex flex-col pt-4">
                                {candidate.hotlist ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-end mb-6">
                                            <button
                                                onClick={() => setIsHotlistModalOpen(true)}
                                                className="px-6 py-2 bg-[#52C41A] text-white font-bold rounded text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                                                <Flame className="w-4 h-4" /> Add To Another Hotlist
                                            </button>
                                        </div>

                                        <div className="p-3 border border-slate-50 rounded-xl bg-white flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                                                    <Flame className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800 tracking-tight leading-none">{candidate.hotlist}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-none">Talent Pool</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                                    Active
                                                </div>
                                                <button 
                                                    onClick={async () => {
                                                        if(confirm('Remove?')) {
                                                            const updated = { ...candidate, hotlist: '' };
                                                            await api.put(`/candidates/${candidate.id}`, updated);
                                                            setCandidate(updated as any);
                                                        }
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-rose-500 transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-8 text-center bg-slate-50/50 py-4 rounded-2xl border border-slate-100/50">
                                            <p className="text-xs font-bold text-slate-400 italic">This candidate is part of your premium talent pool! 🚀</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
                                        <div className="relative mb-8">
                                            <div className="w-24 h-24 bg-[#52C41A] rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
                                                <Flame className="w-12 h-12 text-white fill-white/10" />
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-9 h-9 bg-white rounded-full shadow-md border-4 border-emerald-50 flex items-center justify-center text-emerald-600">
                                                <Plus size={20} strokeWidth={3} />
                                            </div>
                                        </div>
                                        <p className="text-slate-400 font-bold text-center max-w-sm px-8 mb-8">
                                            You will see all Assigned Hotlists for <span className="text-slate-900">{candidate.name}</span> here.
                                        </p>
                                        <button
                                            onClick={() => setIsHotlistModalOpen(true)}
                                            className="px-8 py-3.5 bg-[#52C41A] text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-[0_15px_30px_-10px_rgba(82,196,26,0.3)] flex items-center gap-3 active:scale-95">
                                            <Plus size={16} strokeWidth={3} /> Add To Hotlist
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'Candidate History' && (
                            <div className="flex-1 flex flex-col space-y-4">
                                {history.length > 0 ? history.map((h, idx) => (
                                    <div key={h.id || idx} className="p-3 border border-slate-50 rounded-xl bg-white flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black text-slate-800 tracking-tight leading-none">{h.role || 'Record'}</h4>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1 leading-none">{h.status} • {formatDate(h.appliedDate)}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => navigate(`/candidates/${h.id}`)}
                                            className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                )) : (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-300">
                                        <Archive className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="text-sm font-bold italic">No historical records found for this candidate.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {['Related Emails', 'Candidate Questions', 'Related Deals', 'Contact(s) Pitched'].includes(activeTab) && (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-20">
                                <Search className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm font-bold italic">No records found for {activeTab}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-[380px] bg-slate-50 flex flex-col overflow-y-auto border-l border-gray-100 shadow-[inset_1px_0_0_0_rgba(0,0,0,0.02)] min-h-0 relative">
                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
                         <div className="flex gap-2">
                             <CircleAction onClick={() => setIsEditModalOpen(true)} icon={<Edit3 size={14} />} color="bg-slate-100 text-slate-500" />
                             <CircleAction onClick={() => alert('Call feature coming soon!')} icon={<Phone size={14} />} color="bg-slate-100 text-slate-500" />
                             <CircleAction onClick={() => alert('Task creation coming soon!')} icon={<CheckSquare size={14} />} color="bg-slate-100 text-slate-500" />
                             <CircleAction onClick={() => setIsMeetingModalOpen(true)} icon={<Calendar size={14} />} color="bg-slate-100 text-slate-500" />
                         </div>
                    </div>

                    <div className="flex px-4 border-b border-gray-100 bg-white sticky top-[61px] z-10">
                        {['All', 'Notes & Calls', 'Tasks', 'Meetings'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveSidebarTab(tab)}
                                className={`px-3 py-3 text-[10px] font-black uppercase tracking-widest leading-none border-b-2 transition-all ${activeSidebarTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab} {tab === 'All' ? '1' : tab === 'Notes & Calls' ? '1' : '0'}
                            </button>
                        ))}
                        <div className="flex-1" />
                        <button className="p-3 text-slate-300 hover:text-slate-600">
                            <MoreVertical size={16} />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="relative group">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                            <input 
                                type="text" 
                                placeholder="Search in notes, call logs, tasks, meetings" 
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all shadow-sm"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                                <Menu size={14} className="text-gray-300" />
                                <Filter size={14} className="text-gray-300" />
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-3 pt-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Resume Uploadation</h3>
                            <FileUploadArea 
                                onUpload={handleFileUpload} 
                                isUploading={isUploadingSidebar} 
                            />
                        </div>

                        {/* Notes List */}
                        <div className="space-y-4 pt-4">
                             <NoteCard 
                                type="Note"
                                createdBy={getDisplayUser(candidate.uploadedBy)}
                                createdDate={candidate.createdAt ? new Date(candidate.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Mar 25, 2026, 2:32 PM'}
                                onEdit={() => setIsInlineEditing(!isInlineEditing)}
                                content={
                                    isInlineEditing ? (
                                        <div className="space-y-3 p-1">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-0.5">Cur. Salary</label>
                                                    <input 
                                                        type="text" value={inlineFormData.currentSalary}
                                                        onChange={e => setInlineFormData({...inlineFormData, currentSalary: e.target.value})}
                                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700 focus:border-blue-500/30 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-0.5">Exp. Salary</label>
                                                    <input 
                                                        type="text" value={inlineFormData.salaryExpectation}
                                                        onChange={e => setInlineFormData({...inlineFormData, salaryExpectation: e.target.value})}
                                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700 focus:border-blue-500/30 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-0.5">Visa Type</label>
                                                    <input 
                                                        type="text" value={inlineFormData.visaType}
                                                        onChange={e => setInlineFormData({...inlineFormData, visaType: e.target.value})}
                                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700 focus:border-blue-500/30 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-0.5">Notice Days</label>
                                                    <input 
                                                        type="number" value={inlineFormData.noticePeriod}
                                                        onChange={e => setInlineFormData({...inlineFormData, noticePeriod: parseInt(e.target.value) || 0})}
                                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700 focus:border-blue-500/30 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-0.5">Professional Summary</label>
                                                <textarea 
                                                    value={inlineFormData.summary}
                                                    onChange={e => setInlineFormData({...inlineFormData, summary: e.target.value})}
                                                    rows={3}
                                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700 focus:border-blue-500/30 outline-none resize-none"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-0.5">Recently Applied / Reason for Change</label>
                                                <input 
                                                    type="text" value={inlineFormData.recentlyAppliedCompanies}
                                                    onChange={e => setInlineFormData({...inlineFormData, recentlyAppliedCompanies: e.target.value})}
                                                    placeholder="Applied Companies..."
                                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700 focus:border-blue-500/30 outline-none mb-1"
                                                />
                                                <input 
                                                    type="text" value={inlineFormData.reasonForChange}
                                                    onChange={e => setInlineFormData({...inlineFormData, reasonForChange: e.target.value})}
                                                    placeholder="Reason for Change..."
                                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700 focus:border-blue-500/30 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-0.5">Interview Notes</label>
                                                <textarea 
                                                    value={inlineFormData.interviewNotes}
                                                    onChange={e => setInlineFormData({...inlineFormData, interviewNotes: e.target.value})}
                                                    rows={3}
                                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700 focus:border-blue-500/30 outline-none resize-none"
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-1 border-t border-slate-50">
                                                <button 
                                                    onClick={() => setIsInlineEditing(false)}
                                                    className="flex-1 py-1 px-2 border border-slate-100 rounded text-[8px] font-black uppercase text-slate-400 hover:bg-slate-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleInlineSave}
                                                    disabled={isSavingInline}
                                                    className="flex-1 py-1 px-2 bg-blue-600 text-white rounded text-[8px] font-black uppercase hover:bg-blue-700 shadow-sm shadow-blue-50 disabled:opacity-50"
                                                >
                                                    {isSavingInline ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p>Current Salary: {candidate.currentSalary || '₹ 0'}</p>
                                            <p>Expected Salary: {candidate.salaryExpectation || '₹ 0'}</p>
                                            <p>Notice Period: {candidate.noticePeriod ? `${candidate.noticePeriod} days` : 'Not specified'}</p>
                                            <p>Visa type: {candidate.visaType || 'Not specified'}</p>
                                            <p>Visa Validity: {candidate.visaValidity || 'Not specified'}</p>
                                            {candidate.reasonForChange && <p className="pt-2 italic text-slate-400">Reason for Change: {candidate.reasonForChange}</p>}
                                            <p className="pt-2 text-slate-600 leading-relaxed"><span className="font-black text-slate-800">Summary:</span> {candidate.summary || 'No summary available.'}</p>
                                            {candidate.interviewNotes && <p className="pt-2 text-slate-600 leading-relaxed"><span className="font-black text-slate-800">Interview Notes:</span> {candidate.interviewNotes}</p>}
                                            <p className="pt-2">Recently applied Companies: {candidate.recentlyAppliedCompanies || 'No'}</p>
                                        </div>
                                    )
                                }
                             />

                             <div className="pt-8 pb-12 flex flex-col items-center justify-center text-center opacity-40">
                                 <p className="text-[10px] font-bold text-slate-500">Thats all the notes, call logs, tasks & meetings, messages 😊</p>
                             </div>
                        </div>
                    </div>
                    
                    {/* Chat Bubble Icon at bottom right of sidebar */}
                    <div className="sticky bottom-6 right-6 self-end mr-6 mb-6">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all">
                            <MessageSquare size={20} />
                        </div>
                    </div>
                </div>

            </div>

            {/* Meeting Scheduler Modal */}
            {isMeetingModalOpen && candidate && (
                <MeetingSchedulerModal
                    candidate={candidate}
                    onClose={() => setIsMeetingModalOpen(false)}
                    onSubmit={async (meetingData) => {
                        setIsAddingMeeting(true);
                        try {
                            const interviewRequest: Interview = {
                                candidateId: candidate.id,
                                candidateName: candidate.name,
                                startTime: `${meetingData.startDate}T${convertTo24Hour(meetingData.startTime)}:00`,
                                endTime: `${meetingData.startDate}T${convertTo24Hour(meetingData.endTime)}:00`,
                                type: meetingData.associationType || 'Video Call',
                                interviewer: getDisplayUser(),
                                notes: meetingData.title,
                                status: 'Scheduled',
                                meetingLink: meetingData.location // This is where the Zoom link is stored
                            };
                            await api.post('/interviews', interviewRequest);
                            alert("Meeting Scheduled Successfully!");
                            fetchInterviews();
                            setIsMeetingModalOpen(false);
                        } catch (error) {
                            console.error("Failed to schedule meeting", error);
                            alert("Failed to schedule meeting. Please try again.");
                        } finally {
                            setIsAddingMeeting(false);
                        }
                    }}
                    isSubmitting={isAddingMeeting}
                />
            )}

            {/* Assign Job Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] border border-blue-50">
                        <div className="p-4 border-b border-blue-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Assign Job</h3>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {allJobs.length > 0 ? allJobs.map(job => (
                                <div key={job.id} className="p-2.5 border border-blue-50 rounded-lg hover:border-blue-200 transition-all flex items-center justify-between bg-white group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Briefcase size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-gray-900 leading-none">{job.title}</h4>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{job.department} • {job.company}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAssignJob(job.id)}
                                        className="px-3 py-1.5 bg-blue-600 text-white font-black rounded text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                                        Assign
                                    </button>
                                </div>
                            )) : <p className="text-center text-slate-400 text-[10px] uppercase font-black py-8">No active jobs</p>}
                        </div>
                    </div>
                </div>
            )}

            {isCvModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-blue-50">
                        <div className="px-5 py-3.5 border-b border-blue-50 flex items-center justify-between bg-white relative z-10">
                            <div className="flex items-center gap-3">
                                <Sparkles size={18} className="text-blue-600" />
                                <div>
                                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">AI Formatted CV</h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const blob = new Blob([formattedCv], { type: 'text/markdown' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a'); a.href = url; a.download = 'CV.md'; a.click();
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                                    <Download size={14} /> MD
                                </button>
                                <button onClick={() => setIsCvModalOpen(false)} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 transition"><X size={16} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-white shadow-inner">
                            {isFormatting ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formatting...</p>
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-slate max-w-none text-slate-700">
                                    <ReactMarkdown>{formattedCv}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isStageModalOpen && selectedApplication && (
                <UpdateStageModal
                    application={selectedApplication}
                    onClose={() => setIsStageModalOpen(false)}
                    onSubmit={handleUpdateStage}
                    isSubmitting={isUpdatingStage}
                />
            )}

            {/* Add To Hotlist Modal */}
            {isHotlistModalOpen && candidate && (
                <AddToHotlistModal 
                    onClose={() => setIsHotlistModalOpen(false)}
                    onSubmit={async (data) => {
                        const hotlistName = data.newHotlist || data.hotlist;
                        if (!hotlistName) {
                            alert("Please select or enter a hotlist name.");
                            return;
                        }
                        try {
                            const updated = { ...candidate, hotlist: hotlistName };
                            await api.put(`/candidates/${candidate.id}`, updated);
                            setCandidate(updated as any);
                            setIsHotlistModalOpen(false);
                            setActiveTab('Hotlists');
                            alert(`Success! Candidate added to ${hotlistName}`);
                        } catch (error) {
                            console.error("Failed to update candidate hotlist", error);
                            alert("Failed to save to hotlist.");
                        }
                    }}
                />
            )}

            {/* Edit Candidate Modal */}
            {isEditModalOpen && candidate && (
                <EditCandidateModal
                    candidate={candidate}
                    onClose={() => setIsEditModalOpen(false)}
                    onUpdate={(updatedData) => {
                        setCandidate({ ...candidate, ...updatedData });
                        setIsEditModalOpen(false);
                        alert("Candidate profile updated successfully!");
                    }}
                />
            )}
        </div>
    );
};


/* --- Add To Hotlist Modal --- */
const AddToHotlistModal: React.FC<{
    onClose: () => void;
    onSubmit: (data: any) => void;
}> = ({ onClose, onSubmit }) => {
    const [hotlist, setHotlist] = useState('');
    const [newHotlist, setNewHotlist] = useState('');
    const [shareWithTeammates, setShareWithTeammates] = useState(true);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Add To Hotlist</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Add to Existing */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Add To Existing Hotlist</label>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-3.5 h-3.5" />
                            <select
                                value={hotlist}
                                onChange={(e) => setHotlist(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-600 appearance-none focus:border-blue-500 outline-none"
                            >
                                <option value="" disabled>Select from hotlists</option>
                                {[
                                    'AI/ML', 'Architects', 'BA (Business Analyst)', 'Backend Developers', 
                                    'Cloud/AI', 'Cybersecurity', 'Data Science', 'DevOps Engineering',
                                    'Engineering', 'ERP/SAP', 'Frontend Developers', 'Fullstack Developers',
                                    'Help Desk', 'Mobile Development', 'Networking', 'Project Management',
                                    'QA/Testing', 'Salesforce', 'UI/UX Design'
                                ].sort().flatMap(role => [
                                    `${role} - Bilingual`,
                                    `${role} - English`,
                                    `${role} - Japanese`
                                ]).map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                        </div>
                    </div>

                    {/* Create New & Share */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Create New Hotlist</label>
                            <input
                                type="text"
                                value={newHotlist}
                                onChange={(e) => setNewHotlist(e.target.value)}
                                placeholder="eg. My Hotlist"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-600 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Share</label>
                            <div className="flex items-center h-[36px]">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={shareWithTeammates} onChange={() => setShareWithTeammates(!shareWithTeammates)} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#52C41A]"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 pt-2">
                        <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all">Close</button>
                        <button onClick={() => onSubmit({ hotlist, newHotlist, shareWithTeammates })} className="flex-[2] px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Add to List</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --- Update Hiring Stage Modal --- */
const UpdateStageModal: React.FC<{
    application: JobApplication;
    onClose: () => void;
    onSubmit: (status: string, stage: string, remarks: string, stageDate: string) => void;
    isSubmitting: boolean;
}> = ({ application, onClose, onSubmit, isSubmitting }) => {
    const [status, setStatus] = useState(application.status as string);
    const [stage, setStage] = useState(application.stage || 'Technical Interview');
    const [remarks, setRemarks] = useState(application.remarks || '');
    const [stageDate, setStageDate] = useState(application.stageDate ? application.stageDate.split('T')[0] : new Date().toISOString().split('T')[0]);

    const stages = [
        'Screening',
        'Technical Interview',
        'Managerial Interview',
        'HR Round',
        'Offer Phase',
        'Rejected',
        'Hired'
    ];

    const statuses = [
        'PENDING',
        'UNDER_REVIEW',
        'SHORTLISTED',
        'REJECTED',
        'HIRED'
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Update Hiring Stage</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hiring Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
                                >
                                    {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Interview Stage</label>
                                <select
                                    value={stage}
                                    onChange={(e) => setStage(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
                                >
                                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remark/Feedback</label>
                            <textarea
                                rows={3}
                                placeholder="Add technical feedback..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all">Close</button>
                        <button disabled={isSubmitting} onClick={() => onSubmit(status, stage, remarks, stageDate)} className="flex-[2] px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* Sub-components */


const MeetingSchedulerModal: React.FC<{
    candidate: Candidate;
    onClose: () => void;
    onSubmit: (meeting: any) => void;
    isSubmitting: boolean;
}> = ({ candidate, onClose, onSubmit, isSubmitting }) => {
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState("04:00 PM");
    const [endTime, setEndTime] = useState("04:30 PM");
    const [reminder, setReminder] = useState("30 Min Before");
    const [attendees] = useState<string[]>([candidate.name]);
    const [isConnectingZoom, setIsConnectingZoom] = useState(false);

    const handleConnectZoom = async () => {
        setIsConnectingZoom(true);
        try {
            const response = await api.post(`/interviews/generate-link?candidateName=${encodeURIComponent(candidate.name)}`);
            if (response.data && response.data.link) {
                setLocation(response.data.link);
            } else {
                alert("Failed to generate Zoom link. Please check backend configuration.");
            }
        } catch (error) {
            console.error("Zoom connection failed", error);
            alert("Error connecting to Zoom API.");
        } finally {
            setIsConnectingZoom(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex overflow-hidden border border-slate-200">
                {/* Left Side: Candidate Preview (Simulated as Metadata Grid) */}
                <div className="w-[40%] bg-slate-50 border-r border-slate-100 flex flex-col overflow-y-auto p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-slate-50 to-slate-50">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <User className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">{candidate.name}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{candidate.summary || 'Senior Professional'}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <div className="flex items-center gap-4 text-[10px] font-bold text-blue-600 pb-2 border-b border-slate-50">
                                <Mail className="w-3.5 h-3.5" /> <span>{candidate.email}</span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                                <Phone className="w-3.5 h-3.5 text-blue-500" /> <span>{candidate.phone || 'Not available'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-y-4 px-2">
                            <div className="flex justify-between items-center py-3 border-b border-slate-100/50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Organization</span>
                                <span className="text-[11px] font-bold text-slate-700">{candidate.currentOrganization || 'Not available'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-100/50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Experience</span>
                                <span className="text-[11px] font-bold text-slate-700">{candidate.experience || '0'} Years</span>
                            </div>
                            <div className="flex justify-between items-start py-3 border-b border-slate-100/50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Skills</span>
                                <span className="text-[11px] font-bold text-slate-700 text-right leading-loose">{candidate.skills?.slice(0, 4).join(', ') || 'Not available'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-100/50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notice Period</span>
                                <span className="text-[11px] font-bold text-slate-700">{candidate.noticePeriod || '0'} Days</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Meeting Form */}
                <div className="flex-1 flex flex-col p-6 bg-white overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">Add Meeting</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Schedule interview</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 transition-all border border-slate-100 shadow-sm">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-5 flex-1">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Title</label>
                            <input
                                type="text"
                                placeholder="Interview discussion"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Connect</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleConnectZoom}
                                    disabled={isConnectingZoom}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-100 rounded-lg text-[9px] font-black text-sky-600">
                                    {isConnectingZoom ? <Loader2 size={12} className="animate-spin" /> : <Video size={12} />}
                                    {isConnectingZoom ? 'Wait...' : 'Connect Zoom'}
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Meeting Link/Location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</label>
                                <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 outline-none"><option value="04:00 PM">04:00 PM</option></select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 pt-4 border-t border-slate-50">
                        <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all">Close</button>
                        <button disabled={isSubmitting} onClick={() => onSubmit({ title, location, startDate, startTime, endTime })} className="flex-[2] px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus size={14} /> Add Meeting</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};





/* --- LinkedIn Messaging Simulator --- */
const LinkedInMessaging: React.FC<{ candidate: Candidate }> = ({ candidate }) => {
    const [messages, setMessages] = useState<{ text: string; sender: 'me' | 'them'; timestamp: string }[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const chatEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const generateCandidateReply = async (recruiterMsg: string) => {
        setIsThinking(true);
        try {
            const { data } = await api.post(`/candidates/${candidate.id}/generate-linkedin-reply`, {
                message: recruiterMsg
            });
            
            // Simulate realistic typing delay
            setTimeout(() => {
                setIsThinking(false);
                setMessages(prev => [...prev, { 
                    text: data.reply, 
                    sender: 'them' as const, 
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                }]);
            }, 1500 + Math.random() * 1500);
        } catch (error) {
            console.error("AI Reply failed", error);
            setIsThinking(false);
        }
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;
        const sentText = inputValue.trim();
        const newMsg = { text: sentText, sender: 'me' as const, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages([...messages, newMsg]);
        setInputValue('');
        
        // AUTOMATIC REPLY - No more manual button needed
        setTimeout(() => {
            generateCandidateReply(sentText);
        }, 1000);
    };


    return (
        <div className="flex flex-col h-full bg-slate-50/50 relative pt-4">
            {/* AI Assistant Overlay Removed */}
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 min-h-0 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-slate-50">
                            <MessageSquare size={32} className="text-slate-200 stroke-[1.5]" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">LinkedIn Chat History</p>
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-500`}>
                            <div className={`max-w-[85%] p-5 rounded-3xl text-[11.5px] font-bold leading-relaxed shadow-sm ${m.sender === 'me' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-600 border border-slate-100 rounded-tl-none'}`}>
                                {m.text}
                            </div>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2 px-2">{m.timestamp}</span>
                        </div>
                    ))
                )}
                {isThinking && (
                    <div className="flex items-center gap-3 px-6 py-4 bg-white/60 rounded-full w-fit animate-pulse border border-slate-50">
                        <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce delay-0" />
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150" />
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-300" />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Candidate is typing...</span>
                    </div>
                )}
            {/* Automated AI Reply Triggered via handleSend */}
            <div ref={chatEndRef} />
        </div>

            <div className="p-6 bg-white border-t border-slate-100 relative shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.03)]">
                {isGenerating && (
                    <div className="absolute inset-x-0 -top-1 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 bg-[length:200%_100%] animate-shimmer" />
                )}
                <div className={`flex items-end gap-3 rounded-3xl p-3 border-2 transition-all ${isGenerating ? 'bg-blue-50 border-blue-100 shadow-lg shadow-blue-50' : 'bg-slate-50 border-slate-100 focus-within:border-blue-500/30 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                    <textarea 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isGenerating ? "AI is crafting your message..." : "Write a professional outreach message..."}
                        className="flex-1 bg-transparent border-none outline-none text-[12px] font-bold text-slate-700 py-3 px-4 resize-none max-h-32 placeholder:text-slate-300"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-lg ${inputValue.trim() ? 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
                        <Send size={18} strokeWidth={3} />
                    </button>
                </div>

            </div>
        </div>
    );
};

/* --- Edit Candidate Modal --- */
const EditCandidateModal: React.FC<{ candidate: Candidate; onClose: () => void; onUpdate: (data: any) => void }> = ({ candidate, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        name: candidate.name,
        role: candidate.role,
        email: candidate.email,
        experience: candidate.experience,
        status: candidate.status,
        uploadedBy: candidate.uploadedBy || 'System',
        assignedBy: candidate.assignedBy || '—',
        visaType: candidate.visaType || '',
        visaValidity: candidate.visaValidity || '',
        reasonForChange: candidate.reasonForChange || '',
        recentlyAppliedCompanies: candidate.recentlyAppliedCompanies || '',
        currentSalary: candidate.currentSalary || '',
        salaryExpectation: candidate.salaryExpectation || '',
        noticePeriod: candidate.noticePeriod || 0,
        summary: candidate.summary || '',
        japaneseLanguageProficiency: candidate.japaneseLanguageProficiency || '',
        languageSkills: candidate.languageSkills || [],
        locality: candidate.locality || '',
        country: candidate.country || '',
        postalCode: candidate.postalCode || '',
        currentOrganization: candidate.currentOrganization || '',
        relevantExperience: candidate.relevantExperience || 0,
        interviewNotes: candidate.interviewNotes || ''
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.put(`/candidates/${candidate.id}`, { ...candidate, ...formData });
            onUpdate(formData);
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update candidate profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in duration-300">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Edit Profile</h2>
                    <X size={18} onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-600 transition" />
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                            <input 
                                type="text" value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Role</label>
                                <input 
                                    type="text" value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Organization</label>
                                <input 
                                    type="text" value={formData.currentOrganization}
                                    onChange={e => setFormData({...formData, currentOrganization: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Exp. (Yrs)</label>
                                <input 
                                    type="number" value={formData.experience}
                                    onChange={e => setFormData({...formData, experience: parseInt(e.target.value) || 0})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Relevant Exp. (Yrs)</label>
                                <input 
                                    type="number" value={formData.relevantExperience}
                                    onChange={e => setFormData({...formData, relevantExperience: parseInt(e.target.value) || 0})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email</label>
                                <input 
                                    type="email" value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                                <select 
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                >
                                    {['New', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'Rejected', 'Hired'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Locality</label>
                                <input 
                                    type="text" value={formData.locality}
                                    onChange={e => setFormData({...formData, locality: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Postal Code</label>
                                <input 
                                    type="text" value={formData.postalCode}
                                    onChange={e => setFormData({...formData, postalCode: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cur. Salary</label>
                                <input 
                                    type="text" value={formData.currentSalary}
                                    onChange={e => setFormData({...formData, currentSalary: e.target.value})}
                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Exp. Salary</label>
                                <input 
                                    type="text" value={formData.salaryExpectation}
                                    onChange={e => setFormData({...formData, salaryExpectation: e.target.value})}
                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Notice (Days)</label>
                                <input 
                                    type="number" value={formData.noticePeriod}
                                    onChange={e => setFormData({...formData, noticePeriod: parseInt(e.target.value) || 0})}
                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Visa Status</label>
                                <input 
                                    type="text" value={formData.visaType}
                                    onChange={e => setFormData({...formData, visaType: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Japanese Prof.</label>
                                <select 
                                    value={formData.japaneseLanguageProficiency}
                                    onChange={e => setFormData({...formData, japaneseLanguageProficiency: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                >
                                    <option value="">None / N/A</option>
                                    <option value="N1">N1 - Proficient</option>
                                    <option value="N2">N2 - Advanced</option>
                                    <option value="N3">N3 - Intermediate</option>
                                    <option value="N4">N4 - Elementary</option>
                                    <option value="N5">N5 - Basic</option>
                                    <option value="Native">Native</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Professional Summary</label>
                            <textarea 
                                value={formData.summary}
                                onChange={e => setFormData({...formData, summary: e.target.value})}
                                rows={2}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none resize-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Interview Notes</label>
                            <textarea 
                                value={formData.interviewNotes}
                                onChange={e => setFormData({...formData, interviewNotes: e.target.value})}
                                rows={3}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" onClick={onClose}
                            className="flex-1 py-3 px-4 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" disabled={isSaving}
                            className="flex-[2] py-3 px-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Profile Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CandidateDetails;
