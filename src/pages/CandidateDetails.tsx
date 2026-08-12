import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { useIsManager } from '../roles';
import { Candidate, Job, JobApplication, Interview } from '../types';
import {
    X, Mail, Phone, MapPin, Calendar, Briefcase, CheckCircle2,
    Clock, XCircle, FileText, MessageSquare, Video, User, Download,
    ExternalLink, Plus, Loader2, Search, UserCheck, ChevronLeft,
    Linkedin, Github, Twitter, Globe, Upload, FolderPlus,
    MoreHorizontal, Maximize2, ChevronRight, Filter, ArrowRight,
    MessageCircle, AtSign, Link as LinkIcon, Edit2, Zap, Flame,
    Copy, Sparkles, Star, Trash2, FileUp,
    Bell, Share2, Edit3,
    Building2, ChevronDown, Send, RotateCcw, Archive, Menu, Ban
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatUserDisplayName, formatCandidateId } from '../utils';
import { useSearchHighlight } from '../hooks/useSearchHighlight';
import { useSearch } from '../contexts/SearchContext';
import { INTERVIEW_ROUNDS, roundOf, roundTitle, nextRound, isAdjacentRound, isSideBranchRound } from '../constants/interviewRounds';

// All six pipeline stages are selectable when scheduling. The ordered interview
// rounds obey the "can't skip stages" adjacency rule; Hold / Offer are side
// branches that can be chosen from any stage (see isSideBranchRound).
const MEETING_ROUNDS = INTERVIEW_ROUNDS;

const AttributeRow: React.FC<{ label: string; value: React.ReactNode; isLong?: boolean }> = ({ label, value, isLong }) => (
    <div className="flex items-start text-[10px] font-bold">
        <span className="w-16 text-slate-600 uppercase tracking-widest shrink-0">{label}</span>
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
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{label}</p>
            <div className="flex items-center gap-2">
                {icon && <div className="p-1 bg-gray-50 rounded text-gray-600">{icon}</div>}
                
                {isTags && Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1.5">
                        {value.slice(0, 2).map((v, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-black rounded uppercase">
                                {v}
                            </span>
                        ))}
                        {value.length > 2 && (
                            <span className="px-1.5 py-0.5 bg-gray-50 text-gray-600 text-[10px] font-bold rounded">
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
                        {showEdit && <Edit2 onClick={onEdit} size={12} className="text-gray-400 hover:text-blue-500 cursor-pointer" />}
                    </div>
                )}
            </div>
        </div>
    );
}

// Compact label/value table used by the Information Overview sections. Packs two
// label/value pairs per row to keep the page tight; `wide` rows (e.g. Skills) span
// the full width so long values stay readable. Values are nodes, so inline-edit
// inputs, tag lists and clickable links all render unchanged.
const DetailTable: React.FC<{ rows: { label: string; value: React.ReactNode; wide?: boolean }[] }> = ({ rows }) => {
    const lines: { label: string; value: React.ReactNode; wide?: boolean }[][] = [];
    let buf: { label: string; value: React.ReactNode }[] = [];
    rows.forEach(r => {
        if (r.wide) {
            if (buf.length) { lines.push(buf); buf = []; }
            lines.push([r]);
        } else {
            buf.push(r);
            if (buf.length === 2) { lines.push(buf); buf = []; }
        }
    });
    if (buf.length) lines.push(buf);

    const labelCls = 'py-2 pr-4 align-middle text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap';
    const valueCls = 'py-2 pr-6 pl-2 align-middle text-[12px] font-bold text-slate-800';

    return (
        <table className="w-full border-collapse table-fixed">
            <colgroup>
                <col className="w-[180px]" /><col /><col className="w-[180px]" /><col />
            </colgroup>
            <tbody>
                {lines.map((line, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-b-0">
                        {(line[0] as any).wide ? (
                            <>
                                <td className={labelCls}>{line[0].label}</td>
                                <td className={valueCls} colSpan={3}>{line[0].value}</td>
                            </>
                        ) : (
                            <>
                                <td className={labelCls}>{line[0].label}</td>
                                <td className={valueCls}>{line[0].value}</td>
                                <td className={labelCls}>{line[1]?.label || ''}</td>
                                <td className={valueCls}>{line[1] ? line[1].value : ''}</td>
                            </>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const SocialBtn: React.FC<{ icon: React.ReactNode; url: string }> = ({ icon, url }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-gray-50 transition-all text-slate-600 flex items-center justify-center">
        {icon}
    </a>
)

const ActionBtn: React.FC<{ icon: React.ReactNode; onClick: () => void }> = ({ icon, onClick }) => (
    <button onClick={onClick} className="w-8 h-8 rounded-lg bg-white border border-slate-300 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-all">
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
        <div className="p-4 bg-white border border-slate-300 rounded-xl shadow-sm space-y-3 group hover:border-blue-100 transition-all">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${type === 'Note' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        {type === 'Note' ? <FileText size={14} /> : <Phone size={14} />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{type}</span>
                    {type === 'Call' && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-tighter">Call</span>}
                </div>
                <button onClick={onEdit} className="text-gray-400 hover:text-blue-500 transition-colors">
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

            <div className="pt-3 border-t border-slate-300 flex items-center justify-between text-[9px] font-bold text-slate-600">
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

const FileUploadArea: React.FC<{ onUpload: (file: File) => void; isUploading?: boolean; compact?: boolean }> = ({ onUpload, isUploading, compact }) => {
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
            className={`${compact ? 'p-4 rounded-xl' : 'p-8 rounded-2xl'} border-2 border-dashed transition-all group flex ${compact ? 'flex-row items-center gap-3 text-left' : 'flex-col items-center text-center'} justify-center cursor-pointer ${isUploading ? 'bg-blue-50/50 border-blue-200 cursor-wait' : 'border-slate-300 bg-gray-50/50 hover:bg-white hover:border-blue-200'}`}
        >
            <div className={`${compact ? 'w-9 h-9 mb-0' : 'w-16 h-16 mb-4'} bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 transition-all border border-slate-300 ${isUploading ? 'animate-pulse' : 'group-hover:scale-110'}`}>
                {isUploading
                    ? <Loader2 className={`${compact ? 'w-4 h-4' : 'w-8 h-8'} text-blue-500 animate-spin`} />
                    : <Upload className={`${compact ? 'w-4 h-4' : 'w-8 h-8'} text-blue-400`} />}
            </div>
            <div className={compact ? 'flex-1 min-w-0' : ''}>
                <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-black text-slate-800 tracking-tight`}>
                    {isUploading ? 'Processing Resume...' : <><span className="text-blue-600 hover:underline">Upload File</span> or drag &amp; drop</>}
                </p>
                <p className={`${compact ? 'text-[9px] mt-0.5' : 'text-[10px] mt-2'} font-bold text-slate-600`}>
                    {isUploading ? 'Analyzing with AI…' : 'PDF · DOCX · PNG · JPG'}
                </p>
            </div>
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

const CircleAction: React.FC<{ icon: React.ReactNode; color: string; onClick?: () => void; title?: string }> = ({ icon, color, onClick, title }) => (
    <div onClick={onClick} title={title} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all ${color}`}>{icon}</div>
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
    const { highlightKeyword } = useSearch();
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUploadingSidebar, setIsUploadingSidebar] = useState(false);
    const [history, setHistory] = useState<JobApplication[]>([]);
    // Default to "All Details" so opening a candidate shows their profile
    // overview, not the LinkedIn chat panel (which was opening empty and
    // scrolled past the candidate header).
    const [activeTab, setActiveTab] = useState('All Details');
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
    // Which interview row the modal is currently focused on. Pinned when the
    // modal opens so the status banner doesn't jump to a different (older)
    // interview after the user marks the current one Completed/Cancelled.
    const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);

    // When the modal opens, pick the most recent active interview (Scheduled
    // or Rescheduled) and lock the banner onto it. If none are active, fall
    // back to the most recently created interview so the user still sees the
    // last action they took. When the modal closes, release the pin.
    useEffect(() => {
        if (!isMeetingModalOpen) { setActiveInterviewId(null); return; }
        if (!interviews || interviews.length === 0) { setActiveInterviewId(null); return; }
        // Mongo ObjectIds are time-sortable — newest id == newest created interview.
        const sorted = [...interviews].sort((a, b) =>
            (b.id || '').localeCompare(a.id || '')
        );
        const active = sorted.find(i => i.status === 'Scheduled' || i.status === 'Rescheduled' || !i.status);
        setActiveInterviewId((active || sorted[0])?.id || null);
        // Intentionally only re-run when the modal toggles open — the chosen
        // interview should remain fixed across status changes while open.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMeetingModalOpen]);

    const [assignedJobs, setAssignedJobs] = useState<JobApplication[]>([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [allJobs, setAllJobs] = useState<Job[]>([]);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [isHotlistModalOpen, setIsHotlistModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('Experience Less');
    const [isRejecting, setIsRejecting] = useState(false);
    const [isHiring, setIsHiring] = useState(false);
    // Candidate notes (Call Discussion / Face-to-Face Meeting)
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [notes, setNotes] = useState<any[]>([]);
    const [noteType, setNoteType] = useState('Call Discussion');
    const [noteMessage, setNoteMessage] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [isSavingInline, setIsSavingInline] = useState(false);
    const [inlineFormData, setInlineFormData] = useState<any>({});
    const [currentUser, setCurrentUser] = useState<any>(null);
    // Hire is an HR Manager-only action (FR-901, BR-09). Recruiters don't see it.
    const isManager = useIsManager();

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setCurrentUser(JSON.parse(userStr));
            } catch (e) {}
        }
    }, []);

    const linkedInHref = candidate?.linkedinUrl
        ? candidate.linkedinUrl
        : (candidate?.name
            ? `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(candidate.name)}`
            : '');

    const handleLinkedInSearch = () => {
        if (linkedInHref) {
            window.open(linkedInHref, '_blank', 'noopener,noreferrer');
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
            // Attach to THIS candidate (preserves identity/CANxxx) and re-score the
            // skill matrix from the resume — rather than creating a new candidate by email.
            const response = await api.post(`/resumes/upload-for/${candidate.id}`, formData, {
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

    // Structured rejection (Phase 2): capture a reason + who, persisted on the application.
    const REJECTION_REASONS = [
        'Experience Less', 'Skill Mismatch', 'Technical Round Failed', 'Manager Round Failed',
        'Communication Issue', 'Salary Expectation High', 'Position Closed',
        'Candidate Not Interested', 'Other',
    ];
    const handleReject = async () => {
        if (!id) return;
        setIsRejecting(true);
        try {
            let by = 'HR';
            try { const u = JSON.parse(localStorage.getItem('user') || '{}'); by = u?.name || u?.email || 'HR'; } catch { /* ignore */ }
            await api.post(`/candidates/${id}/reject`, { reason: rejectReason, rejectedBy: by });
            await fetchCandidate();
            setIsRejectModalOpen(false);
        } catch (e: any) {
            alert('Reject failed: ' + (e?.response?.data?.message || e?.message || 'error'));
        } finally {
            setIsRejecting(false);
        }
    };

    // Hire the candidate — sets status to Hired (reflects in Dashboard "Hired" + the
    // /candidates?status=Hired list, and marks the application HIRED).
    const handleHire = async () => {
        if (!id || !candidate) return;
        if (!isManager) return; // HR Manager-only (FR-901, BR-09)
        if (!window.confirm(`Mark ${candidate.name} as Hired?`)) return;
        setIsHiring(true);
        try {
            await api.put(`/candidates/${id}`, { ...candidate, status: 'Hired' });
            await fetchCandidate();
        } catch (e: any) {
            alert('Hire failed: ' + (e?.response?.data?.message || e?.message || 'error'));
        } finally {
            setIsHiring(false);
        }
    };

    // ---- Candidate Notes ----
    const fetchNotes = async () => {
        if (!id) return;
        try {
            const res = await api.get(`/candidates/${id}/notes`);
            setNotes(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Failed to fetch notes', e);
        }
    };
    const openNotes = () => { setIsNotesOpen(true); fetchNotes(); };
    const addNote = async () => {
        if (!id || !noteMessage.trim()) return;
        setSavingNote(true);
        try {
            let by = 'HR';
            try { const u = JSON.parse(localStorage.getItem('user') || '{}'); by = u?.name || u?.email || 'HR'; } catch { /* ignore */ }
            await api.post(`/candidates/${id}/notes`, { type: noteType, message: noteMessage.trim(), author: by });
            setNoteMessage('');
            await fetchNotes();
        } catch (e: any) {
            alert('Failed to save note: ' + (e?.response?.data?.message || e?.message || 'error'));
        } finally {
            setSavingNote(false);
        }
    };

    // Load notes when the candidate opens. If any exist, keep the notes panel open by
    // default so saved notes are always visible (even after a page refresh).
    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const res = await api.get(`/candidates/${id}/notes`);
                const data = Array.isArray(res.data) ? res.data : [];
                setNotes(data);
                if (data.length > 0) setIsNotesOpen(true);
            } catch (e) {
                console.error('Failed to load notes', e);
            }
        })();
    }, [id]);

    // ---- Block / Unblock (fake or inappropriate candidates) ----
    const currentActor = (): string => {
        try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u?.name || u?.email || 'HR'; } catch { return 'HR'; }
    };
    const handleBlock = async () => {
        if (!id || !candidate) return;
        const reason = window.prompt(`Block ${candidate.name}? This permanently excludes them from shortlisting & suggestions.\n\nReason:`, 'Fake / inappropriate');
        if (reason === null) return; // cancelled
        setIsBlocking(true);
        try {
            await api.post(`/candidates/${id}/block`, { reason, by: currentActor() });
            await fetchCandidate();
        } catch (e: any) {
            alert('Block failed: ' + (e?.response?.data?.message || e?.message || 'error'));
        } finally {
            setIsBlocking(false);
        }
    };
    const handleUnblock = async () => {
        if (!id || !candidate) return;
        if (!window.confirm(`Unblock ${candidate.name}? They will be considered again.`)) return;
        setIsBlocking(true);
        try {
            await api.post(`/candidates/${id}/unblock`, { by: currentActor() });
            await fetchCandidate();
        } catch (e: any) {
            alert('Unblock failed: ' + (e?.response?.data?.message || e?.message || 'error'));
        } finally {
            setIsBlocking(false);
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
                    // Phase 1: real per-candidate application history (all jobs over time).
                    const historyRes = await api.get(`/candidates/${data.id}/history`);
                    setHistory(historyRes.data?.applications || []);
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
        // Always start at the top of the page when a candidate opens, so the
        // user lands on the candidate header instead of mid-page on whichever
        // tab content was scrolled into view previously.
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [id]);

    // Global search keyword highlight — applies after candidate data loads,
    // re-runs when the tab changes since the rendered text differs.
    useSearchHighlight(highlightKeyword, [candidate, activeTab]);


    // Robust copy: use the async Clipboard API when available, otherwise fall back to a
    // hidden-textarea + execCommand so it works in every context (the bare writeText call
    // failed silently when the page wasn't focused / clipboard permission was blocked).
    const legacyCopy = (text: string): boolean => {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch {
            return false;
        }
    };
    const handleCopy = async (text: string) => {
        let ok = false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                ok = true;
            } else {
                ok = legacyCopy(text);
            }
        } catch {
            ok = legacyCopy(text);
        }
        if (ok) {
            setCopyStatus(text);
            setTimeout(() => setCopyStatus(null), 2000);
        } else {
            window.prompt('Copy this ID:', text);
        }
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
                <div className="flex-1 overflow-y-auto bg-white flex flex-col border-r border-slate-300 relative min-h-0">
                    {/* Main Content Area */}
                    {/* Header bar / Breadcrumb */}
                    <div className="px-6 py-3 flex items-center justify-between border-b border-slate-300 bg-white sticky top-0 z-50">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/candidates')}>Candidate</span>
                                <ChevronRight size={14} className="text-slate-400" />
                                <span className="text-blue-700 font-extrabold">Details</span>
                            </div>
                            <div className="h-4 w-[1px] bg-slate-200" />
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-700 shadow-sm">
                                <span className="text-slate-800">{formatCandidateId(candidate.sequenceId)}</span>
                                <Copy
                                    size={12}
                                    className="text-slate-400 hover:text-blue-500 cursor-pointer ml-0.5"
                                    onClick={() => handleCopy(formatCandidateId(candidate.sequenceId))}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {(() => {
                                const joinLink = interviews.find(i => (i.status === 'Scheduled' || i.status === 'Rescheduled') && i.meetingLink)?.meetingLink
                                    || candidate.interviewMeetingLink;
                                return joinLink ? (
                                    <a
                                        href={joinLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Join the scheduled interview"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white border border-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition-all shadow-sm"
                                    >
                                        <Video size={14} />
                                        Join Meeting
                                    </a>
                                ) : null;
                            })()}
                            {candidate.blocked && (
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 border border-red-300 rounded-lg text-[11px] font-black text-red-700 uppercase tracking-wider" title={candidate.blockReason ? `Blocked: ${candidate.blockReason}` : 'Blocked'}>
                                    <Ban size={13} /> Blocked
                                </span>
                            )}
                            {candidate.blocked ? (
                                <button
                                    onClick={handleUnblock}
                                    disabled={isBlocking}
                                    title="Unblock this candidate"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm disabled:opacity-50"
                                >
                                    {isBlocking ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} className="text-emerald-600" />}
                                    Unblock
                                </button>
                            ) : (
                                <button
                                    onClick={handleBlock}
                                    disabled={isBlocking}
                                    title="Block a fake / inappropriate candidate"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-[11px] font-bold text-red-700 hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
                                >
                                    {isBlocking ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} className="text-red-600" />}
                                    Block
                                </button>
                            )}
                            {candidate.status !== 'Hired' && isManager && (
                                <button
                                    onClick={handleHire}
                                    disabled={isHiring}
                                    title="Mark this candidate as Hired"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm disabled:opacity-50"
                                >
                                    {isHiring ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
                                    Hire
                                </button>
                            )}
                            {candidate.status !== 'Rejected' && (
                                <button
                                    onClick={() => setIsRejectModalOpen(true)}
                                    title="Reject this candidate with a reason"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-all shadow-sm"
                                >
                                    <XCircle size={14} className="text-rose-500" />
                                    Reject
                                </button>
                            )}
                            <a
                                href={linkedInHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={candidate.linkedinUrl ? 'Open LinkedIn profile' : 'Search LinkedIn'}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
                            >
                                <Linkedin size={14} className="text-[#0077b5]" />
                                LinkedIn
                            </a>
                        </div>
                    </div>

                    {/* Profile Hero Section */}
                    <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/70 to-white border-b border-slate-200">
                        <div className="flex items-start justify-between gap-6">
                            {/* Identity */}
                            <div className="flex gap-4 min-w-0">
                                <div className="relative shrink-0">
                                    <div className="w-14 h-14 rounded-full border-2 border-white shadow-md overflow-hidden bg-white">
                                        {candidate.avatar ? (
                                            <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <User size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white shadow-sm">
                                        <CheckCircle2 size={12} />
                                    </div>
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <h1 className="text-xl font-black text-slate-800 tracking-tight truncate">{candidate.name}</h1>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-600">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Briefcase size={14} className="text-slate-500" />
                                            {candidate.role || 'Not Matched'}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin size={14} className="text-slate-500" />
                                            {candidate.locality || candidate.country || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Current Company */}
                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Current Company
                                </span>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                                    <span className="p-1 bg-[#0A66C2] rounded text-white">
                                        <Linkedin size={14} />
                                    </span>
                                    <span className="text-sm font-black text-slate-800 tracking-tight">
                                        {candidate.currentOrganization || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Bar */}
                    <div className="px-6 py-2.5 bg-white border-b border-slate-300 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <div className="flex items-center gap-2 group">
                                <Phone size={15} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                                <span className="text-blue-600 cursor-pointer">{candidate.phone || 'N/A'}</span>
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ExternalLink size={12} className="text-slate-400 hover:text-blue-500 cursor-pointer" />
                                    <MessageCircle size={12} className="text-emerald-500 hover:text-emerald-600 cursor-pointer" />
                                    <Copy size={12} onClick={(e) => { e.stopPropagation(); handleCopy(candidate.phone || ''); }} className="text-slate-400 hover:text-blue-500 cursor-pointer" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 group">
                                <Mail size={15} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                                <span className="text-blue-600 cursor-pointer truncate max-w-[260px]">{candidate.email}</span>
                                <Copy size={12} onClick={(e) => { e.stopPropagation(); handleCopy(candidate.email || ''); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-500 cursor-pointer" />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Owner</span>
                                <User size={14} className="text-slate-500" />
                                <span className="text-slate-700">{getDisplayUser(candidate.uploadedBy || candidate.assignedBy).split(' ')[0]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Added</span>
                                <RotateCcw size={14} className="text-slate-500" />
                                <span className="text-slate-700">{formatDate(candidate.createdAt || candidate.appliedDate)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="mt-1 border-b border-slate-300 bg-slate-50 flex px-2 overflow-x-auto no-scrollbar">
                        {['All Details', 'Candidate History', 'Hotlists'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 leading-none ${activeTab === tab ? 'border-slate-300 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-600'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 p-4 bg-white relative">
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
                                        <div key={app.id} className="p-2 border border-slate-300 rounded-lg hover:border-blue-200 transition-all flex items-center justify-between bg-white group">
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
                                                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border cursor-pointer hover:shadow-sm transition-all ${app.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            app.status === 'HIRED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                app.status === 'SHORTLISTED' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    'bg-blue-50 text-blue-600 border-blue-100'
                                                            }`}>
                                                        {app.status === 'PENDING' ? 'Assigned' : app.status.replace('_', ' ')}
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-600 mt-0.5 uppercase tracking-tighter">
                                                        {app.stage || 'Screening'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <div onClick={(e) => { e.stopPropagation(); setIsMeetingModalOpen(true); }} className="p-1.5 bg-slate-50 rounded-md text-slate-600 hover:text-amber-600 cursor-pointer transition-colors"><Calendar size={12} /></div>
                                                    <div onClick={(e) => { e.stopPropagation(); if (app.jobId) navigate(`/jobs/details/${app.jobId}`); }} className="p-1.5 bg-slate-50 rounded-md text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"><Briefcase size={12} /></div>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex-1 flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No jobs assigned</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'All Details' && (() => {
                            // Currency inferred from country/locality/raw salary string —
                            // previously hard-coded with mojibake'd Yen/Rupee glyphs.
                            const ctxLower = `${candidate.locality || ''} ${candidate.country || ''}`.toLowerCase();
                            const currencyLabel = ctxLower.includes('japan')
                                ? '¥ (JPY)'
                                : ctxLower.includes('india')
                                    ? '₹ (INR)'
                                    : candidate.currentSalary?.includes('$')
                                        ? '$ (USD)'
                                        : 'N/A';
                            const editInput = (name: keyof typeof inlineFormData, type: string = 'text', width: string = 'w-full') => (
                                <input
                                    name={name as string}
                                    type={type}
                                    className={`${width} bg-white border border-slate-300 rounded-md px-2 py-1 text-[12px] font-bold text-slate-800 outline-none focus:border-blue-400`}
                                    value={(inlineFormData as any)[name] ?? ''}
                                    onChange={e => setInlineFormData({
                                        ...inlineFormData,
                                        [name]: type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value,
                                    } as any)}
                                />
                            );
                            return (
                            <div className="space-y-3 animate-in fade-in duration-300">
                                {/* Header — clean, compact toolbar without the non-functional search/filter widgets */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Information Overview</h2>
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">17</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isInlineEditing && (
                                            <button
                                                onClick={handleInlineSave}
                                                disabled={isSavingInline}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm disabled:opacity-50"
                                            >
                                                {isSavingInline ? 'Saving…' : 'Save All'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsInlineEditing(!isInlineEditing)}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all ${isInlineEditing ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'}`}
                                        >
                                            {isInlineEditing ? 'Cancel' : 'Edit Details'}
                                        </button>
                                    </div>
                                </div>

                                {/* Section: Compensation */}
                                <section className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Compensation</h3>
                                    <DetailTable rows={[
                                        { label: 'Current Salary', value: isInlineEditing ? editInput('currentSalary') : (candidate.currentSalary || 'N/A') },
                                        { label: 'Salary Expectation', value: isInlineEditing ? editInput('salaryExpectation') : (candidate.salaryExpectation || 'N/A') },
                                        { label: 'Salary Type', value: isInlineEditing ? editInput('salaryType') : (candidate.salaryType || 'Monthly') },
                                        { label: 'Currency', value: currencyLabel },
                                    ]} />
                                </section>

                                {/* Section: Experience & Role */}
                                <section className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Experience &amp; Role</h3>
                                    <DetailTable rows={[
                                        { label: 'Current Organization', value: isInlineEditing ? editInput('currentOrganization') : (candidate.currentOrganization || 'Not available') },
                                        { label: 'Total Experience', value: isInlineEditing ? <div className="flex items-center gap-1">{editInput('experience', 'number', 'w-16')}<span className="text-[11px] font-bold text-slate-600">Years</span></div> : (candidate.experience ? `${candidate.experience} Years` : 'N/A') },
                                        { label: 'Relevant Experience', value: isInlineEditing ? <div className="flex items-center gap-1">{editInput('relevantExperience', 'number', 'w-16')}<span className="text-[11px] font-bold text-slate-600">Years</span></div> : (candidate.relevantExperience ? `${candidate.relevantExperience} Years` : '0 Years') },
                                        { label: 'Employment Status', value: isInlineEditing ? editInput('currentEmploymentStatus') : (candidate.currentEmploymentStatus || 'Full-time') },
                                        { label: 'Notice Period', value: isInlineEditing ? <div className="flex items-center gap-1">{editInput('noticePeriod', 'number', 'w-16')}<span className="text-[11px] font-bold text-slate-600">Days</span></div> : (candidate.noticePeriod ? `${candidate.noticePeriod} Days` : 'Not available') },
                                        { label: 'Available From', value: isInlineEditing ? editInput('availableFrom') : (candidate.availableFrom || 'Immediately') },
                                        { label: 'Source', value: `${candidate.source || 'Direct'} · ${getDisplayUser(candidate.uploadedBy)}` },
                                        { label: 'Skills', wide: true, value: (
                                            <div className="flex flex-wrap gap-1">
                                                {(candidate.skills || []).map((s, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">{s}</span>
                                                ))}
                                                {(!candidate.skills || candidate.skills.length === 0) && <span className="text-slate-400">—</span>}
                                            </div>
                                        ) },
                                    ]} />
                                </section>

                                {/* Section: Location */}
                                <section className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Location</h3>
                                    <DetailTable rows={[
                                        { label: 'Country', value: isInlineEditing ? editInput('country') : (candidate.country || 'N/A') },
                                        { label: 'Locality', value: isInlineEditing ? editInput('locality') : (candidate.locality || 'Not specified') },
                                        { label: 'Postal Code', value: isInlineEditing ? editInput('postalCode') : (candidate.postalCode || 'N/A') },
                                        { label: 'Language', value: candidate.languageSkills && candidate.languageSkills.length > 0 ? candidate.languageSkills.join(', ') : 'Not specified' },
                                    ]} />
                                </section>

                                {/* Section: Visa & Documents */}
                                <section className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Visa &amp; Documents</h3>
                                    <DetailTable rows={[
                                        { label: 'Visa Type', value: isInlineEditing ? editInput('visaType') : (candidate.visaType || 'N/A') },
                                        { label: 'Japanese Proficiency', value: isInlineEditing ? (
                                            <select
                                                name="japaneseLanguageProficiency"
                                                className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-[12px] font-bold text-slate-800 outline-none focus:border-blue-400 cursor-pointer"
                                                value={inlineFormData.japaneseLanguageProficiency}
                                                onChange={e => setInlineFormData({ ...inlineFormData, japaneseLanguageProficiency: e.target.value })}
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
                                        ) : (candidate.japaneseLanguageProficiency || 'N/A') },
                                        { label: 'Resume', value: (
                                            <button onClick={handleDownloadResume} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"><FileText size={14} className="text-blue-500" />Download</button>
                                        ) },
                                        { label: 'Formatted CV', value: (
                                            <button onClick={handleGenerateFormattedCv} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"><FileUp size={14} className="text-orange-500" />Generate</button>
                                        ) },
                                    ]} />
                                </section>
                            </div>
                            );
                        })()}
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

                                        <div className="p-3 border border-slate-300 rounded-xl bg-white flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                                                    <Flame className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800 tracking-tight leading-none">{candidate.hotlist}</h4>
                                                    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 leading-none">Talent Pool</p>
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
                                                    className="p-2 text-slate-400 hover:text-rose-500 transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-8 text-center bg-slate-50/50 py-4 rounded-2xl border border-slate-300/50">
                                            <p className="text-xs font-bold text-slate-600 italic">This candidate is part of your premium talent pool! ðŸš€</p>
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
                                        <p className="text-slate-600 font-bold text-center max-w-sm px-8 mb-8">
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
                                {history.length > 0 && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            {history.length} application{history.length > 1 ? 's' : ''} across jobs
                                        </p>
                                        <button
                                            onClick={() => navigate(`/candidates/${candidate.id}/history`)}
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                                            Full history <ExternalLink size={11} />
                                        </button>
                                    </div>
                                )}
                                {history.length > 0 ? history.map((h, idx) => {
                                    const stages = h.stages || [];
                                    const done = stages.filter(s => s.outcome && s.outcome !== 'PENDING').length;
                                    const badge: Record<string, string> = {
                                        PENDING: 'bg-slate-100 text-slate-600', UNDER_REVIEW: 'bg-blue-100 text-blue-700',
                                        SHORTLISTED: 'bg-amber-100 text-amber-700', HIRED: 'bg-emerald-100 text-emerald-700',
                                        REJECTED: 'bg-rose-100 text-rose-700', WITHDRAWN: 'bg-slate-100 text-slate-500',
                                        NOT_ELIGIBLE: 'bg-slate-100 text-slate-500',
                                    };
                                    return (
                                    <div key={h.id || idx} className="p-3 border border-slate-300 rounded-xl bg-white flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600">
                                                <Briefcase className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black text-slate-800 tracking-tight leading-none">{h.jobTitle || h.jobId || 'Application'}</h4>
                                                <p className="text-[9px] font-bold text-slate-600 mt-1 leading-none">
                                                    Applied {formatDate(h.appliedDate)}
                                                    {typeof h.matchScore === 'number' ? ` • ${h.matchScore}% match` : ''}
                                                    {stages.length ? ` • ${done}/${stages.length} stages` : ''}
                                                    {h.status === 'REJECTED' && h.rejectionReason ? ` • ${h.rejectionReason}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-[9px] font-black ${badge[h.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {h.status?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    );
                                }) : (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                                        <Archive className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="text-sm font-bold italic">No applications recorded yet for this candidate.</p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-[380px] bg-slate-50 flex flex-col overflow-y-auto border-l border-slate-300 shadow-[inset_1px_0_0_0_rgba(0,0,0,0.02)] min-h-0 relative">
                    {/* Quick action bar — Schedule Meeting + Notes */}
                    <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
                        <button onClick={() => setIsMeetingModalOpen(true)} className="w-full px-4 py-2.5 flex items-center gap-2 text-left transition-colors hover:bg-slate-50">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600"><Calendar size={14} /></div>
                            <span className="text-[11px] font-bold text-slate-500">Schedule Meeting</span>
                        </button>
                        <button onClick={() => { if (isNotesOpen) { setIsNotesOpen(false); } else { openNotes(); } }} className={`w-full px-4 py-2.5 flex items-center gap-2 text-left transition-colors border-t border-slate-100 ${isNotesOpen ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 text-amber-600"><FileText size={14} /></div>
                            <span className="text-[11px] font-bold text-slate-500">Notes</span>
                            <ChevronRight size={14} className={`ml-auto text-slate-400 transition-transform ${isNotesOpen ? 'rotate-90' : ''}`} />
                        </button>
                    </div>

                    <div className="p-3 space-y-3">
                        {/* Inline Notes panel — opens on the right (not a centered modal) */}
                        {isNotesOpen && (
                            <div className="space-y-3">
                                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                                    <select value={noteType} onChange={e => setNoteType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                        <option>Call Discussion</option>
                                        <option>Face-to-Face Meeting</option>
                                    </select>
                                    <textarea value={noteMessage} onChange={e => setNoteMessage(e.target.value)} rows={3} placeholder="Write your note here…"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                                    <div className="flex justify-end">
                                        <button onClick={addNote} disabled={savingNote || !noteMessage.trim()}
                                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                                            {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save Note
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {notes.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-slate-400">No notes yet. Add the first one above.</p>
                                    ) : (
                                        notes.map((n: any) => (
                                            <div key={n.id} className="rounded-lg border border-slate-200 bg-white p-3">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{n.type}</span>
                                                    <span className="text-[10px] text-slate-400">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                                                </div>
                                                <p className="whitespace-pre-wrap text-sm text-slate-700">{n.message}</p>
                                                <p className="mt-1 text-[10px] text-slate-400">— {n.author || 'HR'}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}


                        {/* Notes List — removed; replaced by the Notes button/modal in the header */}
                        <div className="space-y-4 pt-4 hidden">
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
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-0.5">Cur. Salary</label>
                                                    <input 
                                                        type="text" value={inlineFormData.currentSalary}
                                                        onChange={e => setInlineFormData({...inlineFormData, currentSalary: e.target.value})}
                                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[10px] font-bold text-slate-700 focus:border-slate-300/30 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-0.5">Exp. Salary</label>
                                                    <input 
                                                        type="text" value={inlineFormData.salaryExpectation}
                                                        onChange={e => setInlineFormData({...inlineFormData, salaryExpectation: e.target.value})}
                                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[10px] font-bold text-slate-700 focus:border-slate-300/30 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-0.5">Visa Type</label>
                                                    <input 
                                                        type="text" value={inlineFormData.visaType}
                                                        onChange={e => setInlineFormData({...inlineFormData, visaType: e.target.value})}
                                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[10px] font-bold text-slate-700 focus:border-slate-300/30 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-0.5">Notice Days</label>
                                                    <input 
                                                        type="number" value={inlineFormData.noticePeriod}
                                                        onChange={e => setInlineFormData({...inlineFormData, noticePeriod: parseInt(e.target.value) || 0})}
                                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[10px] font-bold text-slate-700 focus:border-slate-300/30 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-0.5">Professional Summary</label>
                                                <textarea 
                                                    value={inlineFormData.summary}
                                                    onChange={e => setInlineFormData({...inlineFormData, summary: e.target.value})}
                                                    rows={3}
                                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[10px] font-bold text-slate-700 focus:border-slate-300/30 outline-none resize-none"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-0.5">Recently Applied / Reason for Change</label>
                                                <input 
                                                    type="text" value={inlineFormData.recentlyAppliedCompanies}
                                                    onChange={e => setInlineFormData({...inlineFormData, recentlyAppliedCompanies: e.target.value})}
                                                    placeholder="Applied Companies..."
                                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[10px] font-bold text-slate-700 focus:border-slate-300/30 outline-none mb-1"
                                                />
                                                <input 
                                                    type="text" value={inlineFormData.reasonForChange}
                                                    onChange={e => setInlineFormData({...inlineFormData, reasonForChange: e.target.value})}
                                                    placeholder="Reason for Change..."
                                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[10px] font-bold text-slate-700 focus:border-slate-300/30 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-0.5">Interview Notes</label>
                                                <textarea 
                                                    value={inlineFormData.interviewNotes}
                                                    onChange={e => setInlineFormData({...inlineFormData, interviewNotes: e.target.value})}
                                                    rows={3}
                                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[10px] font-bold text-slate-700 focus:border-slate-300/30 outline-none resize-none"
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-1 border-t border-slate-300">
                                                <button 
                                                    onClick={() => setIsInlineEditing(false)}
                                                    className="flex-1 py-1 px-2 border border-slate-300 rounded text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleInlineSave}
                                                    disabled={isSavingInline}
                                                    className="flex-1 py-1 px-2 bg-blue-600 text-white rounded text-[10px] font-black uppercase hover:bg-blue-700 shadow-sm shadow-blue-50 disabled:opacity-50"
                                                >
                                                    {isSavingInline ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p>Current Salary: {candidate.currentSalary || 'Not specified'}</p>
                                            <p>Expected Salary: {candidate.salaryExpectation || 'Not specified'}</p>
                                            <p>Notice Period: {candidate.noticePeriod ? `${candidate.noticePeriod} days` : 'Not specified'}</p>
                                            <p>Visa type: {candidate.visaType || 'Not specified'}</p>
                                            <p>Visa Validity: {candidate.visaValidity || 'Not specified'}</p>
                                            {candidate.reasonForChange && <p className="pt-2 italic text-slate-600">Reason for Change: {candidate.reasonForChange}</p>}
                                            <p className="pt-2 text-slate-600 leading-relaxed"><span className="font-black text-slate-800">Summary:</span> {candidate.summary || 'No summary available.'}</p>
                                            {candidate.interviewNotes && <p className="pt-2 text-slate-600 leading-relaxed"><span className="font-black text-slate-800">Interview Notes:</span> {candidate.interviewNotes}</p>}
                                            <p className="pt-2">Recently applied Companies: {candidate.recentlyAppliedCompanies || 'No'}</p>
                                        </div>
                                    )
                                }
                             />

                             <div className="pt-6 pb-8 flex flex-col items-center justify-center text-center opacity-40">
                                 <p className="text-[10px] font-bold text-slate-600">That's all the notes, calls, tasks &amp; meetings for now.</p>
                             </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Notes now render inline in the right sidebar (see Notes action). */}

            {/* Reject-with-reason Modal */}
            {isRejectModalOpen && candidate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => !isRejecting && setIsRejectModalOpen(false)}>
                    <div className="w-[420px] rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><XCircle size={20} /></div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Reject {candidate.name}</h3>
                                <p className="text-[12px] text-slate-500">Recorded in the candidate's history &amp; audit trail.</p>
                            </div>
                        </div>
                        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Rejection reason</label>
                        <select
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            className="mt-1 mb-5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        >
                            {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsRejectModalOpen(false)} disabled={isRejecting}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                            <button onClick={handleReject} disabled={isRejecting}
                                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                                {isRejecting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Meeting Scheduler Modal */}
            {isMeetingModalOpen && candidate && (
                <MeetingSchedulerModal
                    candidate={candidate}
                    onClose={() => setIsMeetingModalOpen(false)}
                    // Stick to the interview the modal was opened on. After a status
                    // PATCH refreshes the list, we re-find THIS row by id so the pill
                    // flips Scheduled → Completed in place instead of jumping to a
                    // different (older) row that happened to have a later startTime.
                    existingInterview={
                        activeInterviewId
                            ? (interviews.find(i => i.id === activeInterviewId) || null)
                            : null
                    }
                    onStatusChange={async (interviewId, status) => {
                        try {
                            await api.patch(`/interviews/${interviewId}/status?status=${status}`);
                            await fetchInterviews();
                            // Re-fetch candidate so other surfaces (status pill, etc.) refresh.
                            // Dashboard counts come from /interviews/statistics so they'll update
                            // on the next dashboard visit / refresh.
                            await fetchCandidate();
                            alert(`Interview marked as ${status}.`);
                        } catch (e) {
                            console.error('Status update failed', e);
                            alert(`Could not update status. Please try again.`);
                        }
                    }}
                    onSubmit={async (meetingData) => {
                        // Blocked candidates are not eligible for interviews.
                        if (candidate.blocked) {
                            alert(`${candidate.name} is BLOCKED — this candidate is not eligible for interview.${candidate.blockReason ? `\n\nReason: ${candidate.blockReason}` : ''}`);
                            return;
                        }
                        // FSM rule (FR-401 / BR-05): stages cannot be skipped. Scheduling a
                        // non-adjacent round (e.g. Technical Round 1 → Manager Round) is blocked.
                        const targetRound = MEETING_ROUNDS.find(r => r.id === meetingData.title);
                        if (targetRound && !isSideBranchRound(targetRound.id) && !isAdjacentRound(candidate.interviewRound, targetRound.id)) {
                            const next = nextRound(candidate.interviewRound);
                            alert(
                                `Interview stages can't be skipped.\n\n` +
                                `${candidate.name} is at "${roundTitle(candidate.interviewRound)}". ` +
                                `The next allowed stage is "${next ? next.title : roundTitle(candidate.interviewRound)}" — ` +
                                `you can't jump straight to "${targetRound.title}".`
                            );
                            return;
                        }
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

                            // If the title is one of the interview rounds, place the candidate
                            // into that round (and Interview status) so the Dashboard pipeline
                            // and Interview Pipeline page reflect it immediately.
                            const chosenRound = MEETING_ROUNDS.find(r => r.id === meetingData.title);
                            if (chosenRound) {
                                try {
                                    await api.put(`/candidates/${candidate.id}`, {
                                        ...candidate,
                                        interviewRound: chosenRound.id,
                                        status: 'Interview',
                                    });
                                    await fetchCandidate();
                                } catch (e) {
                                    console.error('Could not set interview round', e);
                                }
                            }

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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] border border-slate-300">
                        <div className="p-4 border-b border-slate-300 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Assign Job</h3>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {allJobs.length > 0 ? allJobs.map(job => (
                                <div key={job.id} className="p-2.5 border border-slate-300 rounded-lg hover:border-blue-200 transition-all flex items-center justify-between bg-white group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Briefcase size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-gray-900 leading-none">{job.title}</h4>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tight mt-0.5">{job.department} â€¢ {job.company}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAssignJob(job.id)}
                                        className="px-3 py-1.5 bg-blue-600 text-white font-black rounded text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                                        Assign
                                    </button>
                                </div>
                            )) : <p className="text-center text-slate-600 text-[10px] uppercase font-black py-8">No active jobs</p>}
                        </div>
                    </div>
                </div>
            )}

            {isCvModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
                        <div className="px-5 py-3.5 border-b border-slate-300 flex items-center justify-between bg-white relative z-10">
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
                                <button onClick={() => setIsCvModalOpen(false)} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition"><X size={16} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-white shadow-inner">
                            {isFormatting ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Formatting...</p>
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
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 animate-in fade-in zoom-in duration-300">
                <div className="px-6 py-4 border-b border-slate-300 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Add To Hotlist</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Add to Existing */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Add To Existing Hotlist</label>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                            <select
                                value={hotlist}
                                onChange={(e) => setHotlist(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 appearance-none focus:border-slate-300 outline-none"
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
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 w-3.5 h-3.5 pointer-events-none" />
                        </div>
                    </div>

                    {/* Create New & Share */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Create New Hotlist</label>
                            <input
                                type="text"
                                value={newHotlist}
                                onChange={(e) => setNewHotlist(e.target.value)}
                                placeholder="eg. My Hotlist"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 focus:border-slate-300 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Share</label>
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
                        <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all">Close</button>
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
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
                <div className="px-6 py-4 border-b border-slate-300 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Update Hiring Stage</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Hiring Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
                                >
                                    {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Interview Stage</label>
                                <select
                                    value={stage}
                                    onChange={(e) => setStage(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
                                >
                                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Remark/Feedback</label>
                            <textarea
                                rows={3}
                                placeholder="Add technical feedback..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all">Close</button>
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


// 09:00 AM – 07:30 PM in 30-minute steps. Built once at module load instead of
// every render. Matches the "HH:MM AM/PM" format the existing convertTo24Hour
// helper expects.
const TIME_SLOTS: string[] = (() => {
    const out: string[] = [];
    for (let h = 9; h <= 19; h++) {
        for (const m of [0, 30]) {
            const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            const period = h >= 12 ? 'PM' : 'AM';
            out.push(`${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`);
        }
    }
    return out;
})();

const MeetingSchedulerModal: React.FC<{
    candidate: Candidate;
    onClose: () => void;
    onSubmit: (meeting: any) => void;
    isSubmitting: boolean;
    // Most recent active interview for this candidate, if one exists. Drives
    // the status banner + lifecycle action buttons at the top of the form.
    existingInterview?: Interview | null;
    onStatusChange?: (interviewId: string, status: 'Completed' | 'Cancelled' | 'Rescheduled') => Promise<void>;
}> = ({ candidate, onClose, onSubmit, isSubmitting, existingInterview, onStatusChange }) => {
    const [statusBusy, setStatusBusy] = useState<string | null>(null);

    const handleStatusUpdate = async (status: 'Completed' | 'Cancelled' | 'Rescheduled') => {
        if (!existingInterview?.id || !onStatusChange) return;
        const confirmText = status === 'Cancelled'
            ? `Cancel the scheduled interview with ${candidate.name}?`
            : status === 'Completed'
                ? `Mark the interview with ${candidate.name} as completed?`
                : `Mark this interview as rescheduled? You can then book a new slot below.`;
        if (!window.confirm(confirmText)) return;
        setStatusBusy(status);
        try {
            await onStatusChange(existingInterview.id, status);
        } finally {
            setStatusBusy(null);
        }
    };

    // Default to the next available half-hour slot from now (e.g. 10:14 → 10:30,
    // 10:35 → 11:00). Falls back to the first slot if "now" is outside business hours.
    const defaultSlot = (() => {
        const now = new Date();
        const minutes = now.getMinutes();
        const rounded = new Date(now);
        rounded.setMinutes(minutes < 30 ? 30 : 60, 0, 0);
        const h = rounded.getHours();
        const m = rounded.getMinutes();
        if (h < 9 || h > 19) return TIME_SLOTS[0];
        const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const period = h >= 12 ? 'PM' : 'AM';
        const slot = `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
        return TIME_SLOTS.includes(slot) ? slot : TIME_SLOTS[0];
    })();
    const defaultEndIdx = Math.min(TIME_SLOTS.indexOf(defaultSlot) + 1, TIME_SLOTS.length - 1);

    // Start on the candidate's CURRENT stage — the FSM (BR-05) only permits scheduling
    // the current or the immediately next round; skipping ahead is disabled below.
    const [title, setTitle] = useState(roundOf(candidate.interviewRound));
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState(defaultSlot);
    const [endTime, setEndTime] = useState(TIME_SLOTS[defaultEndIdx]);
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
                alert("Could not generate a meeting link. Please try again.");
            }
        } catch (error) {
            console.error("Meeting link generation failed", error);
            alert("Could not generate a meeting link. Please try again.");
        } finally {
            setIsConnectingZoom(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex overflow-hidden border border-slate-300">
                {/* Left Side: Candidate Preview (Simulated as Metadata Grid) */}
                <div className="w-[40%] bg-slate-50 border-r border-slate-300 flex flex-col overflow-y-auto p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-slate-50 to-slate-50">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <User className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">{candidate.name}</h2>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">{candidate.summary || 'Senior Professional'}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-300 shadow-sm space-y-2">
                            <div className="flex items-center gap-4 text-[10px] font-bold text-blue-600 pb-2 border-b border-slate-300">
                                <Mail className="w-3.5 h-3.5" /> <span>{candidate.email}</span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-blue-500" /> <span>{candidate.phone || 'Not available'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-y-4 px-2">
                            <div className="flex justify-between items-center py-3 border-b border-slate-300/50">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Current Organization</span>
                                <span className="text-[11px] font-bold text-slate-700">{candidate.currentOrganization || 'Not available'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-300/50">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Experience</span>
                                <span className="text-[11px] font-bold text-slate-700">{candidate.experience || '0'} Years</span>
                            </div>
                            <div className="flex justify-between items-start py-3 border-b border-slate-300/50">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest shrink-0">Skills</span>
                                <span className="text-[11px] font-bold text-slate-700 text-right leading-loose">{candidate.skills?.slice(0, 4).join(', ') || 'Not available'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-300/50">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Notice Period</span>
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
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Schedule interview</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition-all border border-slate-300 shadow-sm">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-5 flex-1">
                        {existingInterview && (
                            <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Current Status</span>
                                        {(() => {
                                            const s = existingInterview.status || 'Scheduled';
                                            const pill: Record<string, string> = {
                                                'Scheduled':   'bg-blue-100 text-blue-700 border-blue-200',
                                                'Completed':   'bg-emerald-100 text-emerald-700 border-emerald-200',
                                                'Cancelled':   'bg-rose-100 text-rose-700 border-rose-200',
                                                'Rescheduled': 'bg-amber-100 text-amber-700 border-amber-200',
                                            };
                                            return (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${pill[s] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                    {s}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    {existingInterview.startTime && (
                                        <span className="text-[10px] text-slate-500 font-bold">
                                            {new Date(existingInterview.startTime).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                                {/* Lifecycle actions — only available while the interview is still
                                    in an active state (Scheduled or Rescheduled). Once Completed or
                                    Cancelled, the row is closed and the banner becomes read-only. */}
                                {(existingInterview.status === 'Scheduled' || existingInterview.status === 'Rescheduled' || !existingInterview.status) ? (
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            onClick={() => handleStatusUpdate('Completed')}
                                            disabled={!!statusBusy}
                                            className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                        >
                                            <CheckCircle2 size={12} />
                                            {statusBusy === 'Completed' ? 'Saving…' : 'Mark Completed'}
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate('Cancelled')}
                                            disabled={!!statusBusy}
                                            className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                        >
                                            <X size={12} />
                                            {statusBusy === 'Cancelled' ? 'Saving…' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate('Rescheduled')}
                                            disabled={!!statusBusy}
                                            className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                        >
                                            <Clock size={12} />
                                            {statusBusy === 'Rescheduled' ? 'Saving…' : 'Reschedule'}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-slate-500 font-medium italic">
                                        This interview is closed. Use the form below to schedule a fresh one.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Title (Interview Round)</label>
                            <select
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
                            >
                                {/* FSM (BR-05): only the current and adjacent rounds are selectable —
                                    non-adjacent stages are locked so a stage can't be skipped. Hold /
                                    Offer are side branches and stay selectable from any stage. */}
                                {MEETING_ROUNDS.map(r => {
                                    const locked = !isSideBranchRound(r.id) && !isAdjacentRound(candidate.interviewRound, r.id);
                                    return (
                                        <option key={r.id} value={r.id} disabled={locked}>
                                            {r.title}{locked ? ' — locked (finish previous rounds first)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            <p className="text-[9px] font-bold text-slate-400">
                                Current stage: <span className="text-slate-600">{roundTitle(candidate.interviewRound)}</span>
                                {nextRound(candidate.interviewRound) ? <> · Next: <span className="text-slate-600">{nextRound(candidate.interviewRound)!.title}</span></> : <> · Final stage</>}
                                . Stages can't be skipped.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Connect</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleConnectZoom}
                                    disabled={isConnectingZoom}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-100 rounded-lg text-[9px] font-black text-sky-600">
                                    {isConnectingZoom ? <Loader2 size={12} className="animate-spin" /> : <Video size={12} />}
                                    {isConnectingZoom ? 'Generating…' : 'Generate Meeting Link'}
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Meeting Link/Location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Time</label>
                                <select
                                    value={startTime}
                                    onChange={(e) => {
                                        const newStart = e.target.value;
                                        setStartTime(newStart);
                                        // Auto-advance the end time by 30 min so the user doesn't have
                                        // to set it manually — the backend stores both.
                                        const idx = TIME_SLOTS.indexOf(newStart);
                                        if (idx >= 0 && idx + 1 < TIME_SLOTS.length) {
                                            setEndTime(TIME_SLOTS[idx + 1]);
                                        }
                                    }}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                                >
                                    {TIME_SLOTS.map(slot => (
                                        <option key={slot} value={slot}>{slot}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 pt-4 border-t border-slate-300">
                        <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all">Close</button>
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
                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-slate-300">
                            <MessageSquare size={32} className="text-slate-200 stroke-[1.5]" />
                        </div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">LinkedIn Chat History</p>
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-500`}>
                            <div className={`max-w-[85%] p-5 rounded-3xl text-[11.5px] font-bold leading-relaxed shadow-sm ${m.sender === 'me' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-600 border border-slate-300 rounded-tl-none'}`}>
                                {m.text}
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 px-2">{m.timestamp}</span>
                        </div>
                    ))
                )}
                {isThinking && (
                    <div className="flex items-center gap-3 px-6 py-4 bg-white/60 rounded-full w-fit animate-pulse border border-slate-300">
                        <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce delay-0" />
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150" />
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-300" />
                        </div>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Candidate is typing...</span>
                    </div>
                )}
            {/* Automated AI Reply Triggered via handleSend */}
            <div ref={chatEndRef} />
        </div>

            <div className="p-6 bg-white border-t border-slate-300 relative shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.03)]">
                {isGenerating && (
                    <div className="absolute inset-x-0 -top-1 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 bg-[length:200%_100%] animate-shimmer" />
                )}
                <div className={`flex items-end gap-3 rounded-3xl p-3 border-2 transition-all ${isGenerating ? 'bg-blue-50 border-blue-100 shadow-lg shadow-blue-50' : 'bg-slate-50 border-slate-300 focus-within:border-slate-300/30 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                    <textarea 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isGenerating ? "AI is crafting your message..." : "Write a professional outreach message..."}
                        className="flex-1 bg-transparent border-none outline-none text-[12px] font-bold text-slate-700 py-3 px-4 resize-none max-h-32 placeholder:text-slate-400"
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
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-lg ${inputValue.trim() ? 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700' : 'bg-slate-200 text-slate-600 cursor-not-allowed shadow-none'}`}>
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
        assignedBy: candidate.assignedBy || 'â€”',
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
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-300 animate-in zoom-in duration-300">
                <div className="px-6 py-4 border-b border-slate-300 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Edit Profile</h2>
                    <X size={18} onClick={onClose} className="cursor-pointer text-slate-600 hover:text-slate-600 transition" />
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Full Name</label>
                            <input 
                                type="text" value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Current Role</label>
                                <input 
                                    type="text" value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Current Organization</label>
                                <input 
                                    type="text" value={formData.currentOrganization}
                                    onChange={e => setFormData({...formData, currentOrganization: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Total Exp. (Yrs)</label>
                                <input 
                                    type="number" value={formData.experience}
                                    onChange={e => setFormData({...formData, experience: parseInt(e.target.value) || 0})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Relevant Exp. (Yrs)</label>
                                <input 
                                    type="number" value={formData.relevantExperience}
                                    onChange={e => setFormData({...formData, relevantExperience: parseInt(e.target.value) || 0})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Email</label>
                                <input 
                                    type="email" value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Status</label>
                                <select 
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                >
                                    {['New', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'Rejected', 'Hired'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Locality</label>
                                <input 
                                    type="text" value={formData.locality}
                                    onChange={e => setFormData({...formData, locality: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Postal Code</label>
                                <input 
                                    type="text" value={formData.postalCode}
                                    onChange={e => setFormData({...formData, postalCode: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-300">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Cur. Salary</label>
                                <input 
                                    type="text" value={formData.currentSalary}
                                    onChange={e => setFormData({...formData, currentSalary: e.target.value})}
                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Exp. Salary</label>
                                <input 
                                    type="text" value={formData.salaryExpectation}
                                    onChange={e => setFormData({...formData, salaryExpectation: e.target.value})}
                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Notice (Days)</label>
                                <input 
                                    type="number" value={formData.noticePeriod}
                                    onChange={e => setFormData({...formData, noticePeriod: parseInt(e.target.value) || 0})}
                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Visa Status</label>
                                <input 
                                    type="text" value={formData.visaType}
                                    onChange={e => setFormData({...formData, visaType: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Japanese Prof.</label>
                                <select 
                                    value={formData.japaneseLanguageProficiency}
                                    onChange={e => setFormData({...formData, japaneseLanguageProficiency: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
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
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Professional Summary</label>
                            <textarea 
                                value={formData.summary}
                                onChange={e => setFormData({...formData, summary: e.target.value})}
                                rows={2}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none resize-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Interview Notes</label>
                            <textarea 
                                value={formData.interviewNotes}
                                onChange={e => setFormData({...formData, interviewNotes: e.target.value})}
                                rows={3}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" onClick={onClose}
                            className="flex-1 py-3 px-4 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
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
