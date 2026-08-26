import React, { useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import {
    LayoutDashboard,
    Briefcase,
    Users,
    UploadCloud,
    BarChart,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    CheckCircle,
    AlertCircle,
    Plus,
    HelpCircle,
    Mail,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    Trash2,
    Calendar as CalendarIcon,
    CalendarCheck,
    Sparkles,
    UserX,
    ClipboardList,
    BarChart3,
    UserPlus,
    Briefcase as BriefcaseIcon,
    Server,
    ShieldCheck,
    Inbox,
    Edit2,
    Check as CheckIcon,
    User as UserIcon,
} from 'lucide-react';
import { formatUserDisplayName, formatRelativeTime, notificationDayBucket } from '../utils';
import { startActivityTracking } from '../session';
import InterviewAlert from './InterviewAlert';
import Chatbot from './Chatbot';
import GlobalSearchBar from './GlobalSearchBar';

const Layout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isFaqOpen, setIsFaqOpen] = useState(false);
    const [pendingDeletionCount, setPendingDeletionCount] = useState(0);

    useEffect(() => {
        // Initialize notification sound
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    }, []);

    // EXC-006 / NFRS01 — track real user activity so the session can idle-expire.
    // The api interceptor blocks requests once idle exceeds the configured timeout
    // and redirects to /login for re-authentication (see src/session.ts).
    useEffect(() => {
        const stopTracking = startActivityTracking();
        return stopTracking;
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token) {
            navigate('/login');
        } else if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                console.error("Failed to parse user data", e);
                localStorage.removeItem('user'); // Clear corrupted data
            }
        }
    }, [navigate]);

    // Push the JWT to the LinkedIn Chrome extension whenever we have a token.
    // The extension declares `externally_connectable` for localhost:3000 and a
    // SYNC_TOKEN handler in background.js — without this nothing in the web app
    // ever called it, so the extension would always report "Authentication
    // required" even after the user signed in here.
    //
    // The extension id is the unpacked id Chrome assigns when the user loads
    // the extension via "Load unpacked". The constant below matches the id
    // visible at chrome://extensions for this dev box; if you reinstall the
    // extension and it gets a new id, paste it under
    // `localStorage.setItem('linkedinExtensionId', '<new-id>')` to override
    // without editing source.
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const win = window as any;
        if (!win.chrome || !win.chrome.runtime || !win.chrome.runtime.sendMessage) return;
        const DEFAULT_EXTENSION_ID = 'mpmemkohdoojdibhagcdfooopooalfld';
        const extensionId = localStorage.getItem('linkedinExtensionId') || DEFAULT_EXTENSION_ID;
        try {
            win.chrome.runtime.sendMessage(
                extensionId,
                { action: 'SYNC_TOKEN', token },
                (response: any) => {
                    if (win.chrome.runtime.lastError) {
                        // Most common reason: the extension isn't installed on
                        // this browser, or the id above is different from the
                        // installed copy. Either is fine — silently skip.
                        return;
                    }
                    if (response && response.status === 'success') {
                        console.info('🔑 LinkedIn extension token synced.');
                    }
                }
            );
        } catch (_) { /* extension not reachable — ignore */ }
    }, [user]);

    // Poll the pending deletion-request count so the sidebar badge stays
    // current. Only Manager/Admin sees the link, so HR users skip the call.
    useEffect(() => {
        const role = (user?.role || '').toString().toUpperCase();
        if (role !== 'MANAGER' && role !== 'ADMIN') {
            setPendingDeletionCount(0);
            return;
        }
        let cancelled = false;
        const refresh = async () => {
            try {
                const res = await api.get('/deletion-requests?status=PENDING');
                if (!cancelled) {
                    setPendingDeletionCount(Array.isArray(res.data) ? res.data.length : 0);
                }
            } catch (_e) {
                if (!cancelled) setPendingDeletionCount(0);
            }
        };
        refresh();
        const id = setInterval(refresh, 60000);
        return () => { cancelled = true; clearInterval(id); };
    }, [user, location.pathname]);

    // Listen for storage changes to sync user data (e.g., from Settings page)
    useEffect(() => {
        const handleStorageChange = () => {
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch (e) {
                    console.error("Failed to parse user data from storage event", e);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('user-updated', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('user-updated', handleStorageChange);
        };
    }, []);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [recentToast, setRecentToast] = useState<{ message: string, type: 'SUCCESS' | 'INFO' | 'ERROR' } | null>(null);
    const lastNotifId = useRef<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await api.get('/notifications?unreadOnly=true');
                const newNotifs = response.data;
                setNotifications(newNotifs);

                // Show toast for the newest notification if it's new
                if (newNotifs.length > 0) {
                    const newest = newNotifs[0];
                    if (newest.id !== lastNotifId.current) {
                        lastNotifId.current = newest.id;
                        setRecentToast({ message: newest.message, type: newest.type || 'INFO' });

                        // Play sound (Loop for 5 seconds as requested)
                        if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.loop = true;
                            audioRef.current.play().catch(e => console.log("Audio play deferred until user interaction."));

                            setTimeout(() => {
                                if (audioRef.current) {
                                    audioRef.current.pause();
                                    audioRef.current.loop = false;
                                }
                            }, 5000);
                        }

                        setTimeout(() => setRecentToast(null), 5000);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };

        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleProfilePictureClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.email) return;

        // basic validation
        if (file.size > 2 * 1024 * 1024) {
            alert('File size too large. Please select an image under 2MB.');
            return;
        }

        setIsUploading(true);

        // All accounts (including the demo Admin/HR/Manager) now have a backing DB row,
        // so the upload persists server-side and the avatar survives a re-login.
        const formData = new FormData();
        formData.append('file', file);
        formData.append('email', user.email);

        try {
            // Don't set Content-Type — the browser must add the multipart boundary itself.
            // A hard-coded "multipart/form-data" (no boundary) makes the upload unparseable.
            const response = await api.put('/users/profile-picture', formData);

            if (response.data) {
                // Update local storage and state
                const updatedUser = { ...user, profilePicture: response.data.profilePicture };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                alert('Profile picture updated successfully!');
            }
        } catch (error) {
            console.error('Failed to upload profile picture', error);
            alert('Failed to update profile picture. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const [recentMessages, setRecentMessages] = useState<any[]>([]);

    useEffect(() => {
        const fetchRecentMessages = async () => {
            try {
                const response = await api.get('/candidates?size=3&sort=updatedAt,desc');
                setRecentMessages(response.data.content || response.data || []);
            } catch (error) {
                console.error("Failed to fetch recent messages", error);
            }
        };
        fetchRecentMessages();
    }, []);

    const userRole = (user?.role || '').toString().toUpperCase();
    const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';

    const navItems: Array<{
        path: string;
        label: string;
        icon: any;
        badge?: number;
    }> = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/jobs', label: 'Job Management', icon: Briefcase },
        { path: '/candidates', label: 'Candidates', icon: Users },
        { path: '/application-tracker', label: 'Application Tracker', icon: ClipboardList },
        { path: '/resume-upload', label: 'Resume Upload', icon: UploadCloud },
        { path: '/skills-matrix', label: 'Skills Matrix', icon: BarChart },
        { path: '/shortlist-report', label: 'Shortlist Report', icon: FileText },
        { path: '/interview-pipeline', label: 'Interview Pipeline', icon: CalendarCheck },
        { path: '/suggested-candidates', label: 'Suggested Candidates', icon: Sparkles },
        { path: '/rejected-candidates', label: 'Rejected Candidates', icon: UserX },
        { path: '/reports', label: 'Reports', icon: BarChart3 },
        { path: '/inbox', label: 'Inbox', icon: Mail },
        ...(isManager
            ? [{ path: '/deletion-requests', label: 'Deletion Requests', icon: Trash2, badge: pendingDeletionCount }]
            : []),
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar with Enhanced Border */}
            <aside
                className={`bg-white border-r-2 border-blue-100/60 transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'w-52' : 'w-20'} fixed md:relative z-30 h-full shadow-sm`}
            >
                <div className="h-14 flex items-center justify-between px-6 border-b-2 border-blue-100/40 relative">
                    {isSidebarOpen ? (
                        <div className="flex flex-col animate-in fade-in slide-in-from-left-2">
                            <span className="text-xl font-black text-blue-800 tracking-tight">
                                Recruit Ai
                            </span>
                        </div>
                    ) : (
                        <span className="text-xl font-black text-blue-800 mx-auto">RA</span>
                    )}

                    {/* Desktop Toggle Button */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="absolute -right-3 top-4 w-6 h-6 bg-white border-2 border-blue-100 rounded-full hidden md:flex items-center justify-center text-blue-600 shadow-sm hover:bg-blue-50 hover:scale-110 transition-all z-40"
                        title={isSidebarOpen ? "Collapse" : "Extend"}
                    >
                        {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {isSidebarOpen && (
                        <div className="mb-4 px-4">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                                MAIN MENU
                            </p>
                        </div>
                    )}

                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center px-4 py-2 rounded-xl transition-all duration-200 group relative
                ${isActive
                                    ? 'bg-blue-50/80 text-blue-700 border border-blue-200/50 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                }`
                            }
                        >
                            <item.icon size={18} className={`flex-shrink-0 ${isSidebarOpen ? 'mr-3' : 'mx-auto'} ${isSidebarOpen && 'text-blue-600/70 group-[.active]:text-blue-700'}`} />
                            {isSidebarOpen && <span className="font-semibold text-[12px] tracking-tight">{item.label}</span>}
                            {isSidebarOpen && item.badge ? (
                                <span className="ml-auto bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {item.badge}
                                </span>
                            ) : null}
                            {!isSidebarOpen && item.badge ? (
                                <span className="absolute top-1 right-1 bg-rose-600 text-white text-[8px] font-black px-1 rounded-full min-w-[14px] text-center leading-tight">
                                    {item.badge > 9 ? '9+' : item.badge}
                                </span>
                            ) : null}

                            {!isSidebarOpen && (
                                <div className="absolute left-16 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap font-bold uppercase tracking-wider">
                                    {item.label}
                                </div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-6 border-t-2 border-blue-100/40">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200 group border border-transparent hover:border-red-100
              ${isSidebarOpen ? '' : 'justify-center'}`}
                    >
                        <LogOut size={20} className={isSidebarOpen ? 'mr-4' : ''} />
                        {isSidebarOpen && <span className="font-bold text-[13px] tracking-tight">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto w-full bg-slate-50/40">
                <div className="p-3">
                    {/* Premium Top Bar with Blue Border */}
                    <div className="flex justify-between mb-4 p-2 bg-white rounded-2xl border-2 border-blue-200/80 shadow-sm items-center">
                        <div className="flex items-center gap-4">
                            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg font-black text-[9px] uppercase tracking-widest hidden md:block leading-none">
                                System Active
                            </span>

                            {/* Global Search Bar â€” debounced live dropdown across candidates / jobs / skills / interviews */}
                            <GlobalSearchBar />
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Quick Add */}
                            <button
                                onClick={() => navigate('/jobs')}
                                title="Create Job"
                                aria-label="Create Job"
                                className="w-8 h-8 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 hover:border-blue-400 active:scale-95 transition-all shadow-sm shadow-blue-100/50 group"
                            >
                                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>

                            <button
                                onClick={() => setIsHelpModalOpen(true)}
                                className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all h-8 w-8 flex items-center justify-center">
                                <HelpCircle size={16} />
                            </button>

                            {/* Notification Bell */}
                            {/* Notification Center */}
                            <NotificationCenter notifications={notifications} setNotifications={setNotifications} navigate={navigate} />


                            <div className="relative cursor-pointer group leading-none">
                                <span 
                                    onClick={() => navigate('/inbox')}
                                    className="p-1.5 text-gray-600 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg block transition-all">
                                    <Mail size={18} />
                                </span>
                                <div className="absolute right-0 top-full mt-4 w-96 bg-white rounded-[2rem] shadow-2xl border-2 border-slate-300 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 transform origin-top-right z-50 overflow-hidden">
                                    <div className="p-6 bg-slate-50 border-b border-slate-300">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-black text-[10px] uppercase tracking-widest text-blue-900 leading-none">Message Center</h4>
                                            <div className="flex gap-2">
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-tighter">2 New</span>
                                                <button className="text-[10px] font-bold text-blue-600 hover:underline">Mark as Read</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {recentMessages.length === 0 ? (
                                            <div className="p-4 border-b border-slate-300 hover:bg-slate-50 cursor-pointer flex gap-4 items-center" onClick={() => navigate('/inbox', { state: { candidateId: 'CAN-1eaad78d' } })}>
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs">MK</div>
                                                <div className="flex-1">
                                                    <h5 className="text-[11px] font-black text-slate-800">M. Chinnikrishna</h5>
                                                    <p className="text-[10px] text-slate-600 font-medium truncate w-56">I'm definitely interested in discussing...</p>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400">2 Mins</span>
                                            </div>
                                        ) : (
                                            recentMessages.map((msg: any) => (
                                                <div 
                                                    key={msg.id}
                                                    onClick={() => navigate('/inbox', { state: { candidateId: msg.id } })}
                                                    className="p-4 border-b border-slate-300 hover:bg-slate-50 cursor-pointer flex gap-4 items-center">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-xs">
                                                        {msg.name?.split(' ').map((n:any) => n[0]).join('') || 'CA'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h5 className="text-[11px] font-black text-slate-800">{msg.name}</h5>
                                                        <p className="text-[10px] text-slate-600 font-medium truncate w-56">Regarding the job role for {msg.role || 'Position'}...</p>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400">Just now</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-slate-300 text-center">
                                        <button 
                                            onClick={() => navigate('/inbox')}
                                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
                                            Go To Full Inbox
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/settings')}
                                className="p-2 text-gray-600 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                    <Settings size={18} />
                            </button>

                            <div className="h-6 w-px bg-gray-200 mx-1"></div>

                            {/* Hidden file input for profile-picture upload (avatar click triggers it). */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <UserPill
                                user={user}
                                setUser={setUser}
                                isUploading={isUploading}
                                onAvatarClick={handleProfilePictureClick}
                                onSignOut={handleLogout}
                            />
                        </div>
                    </div>

                    {/* Main Content Wrapper with Border Shadow */}
                    <div className="bg-transparent rounded-[2.5rem] min-h-[calc(100vh-200px)]">
                        <Outlet />
                    </div>
                </div>
            </main>
            {recentToast && (
                <div className={`fixed bottom-12 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] animate-in slide-in-from-bottom-5 duration-300 flex items-center gap-4 font-bold text-white border-2 border-white/20 backdrop-blur-md ${recentToast.type === 'SUCCESS' ? 'bg-green-600/95' :
                    recentToast.type === 'ERROR' ? 'bg-red-600/95' : 'bg-indigo-600/95'
                    }`}>
                    <div className="p-2 bg-white/20 rounded-full">
                        {recentToast.type === 'SUCCESS' ? <CheckCircle className="w-6 h-6" /> :
                            recentToast.type === 'ERROR' ? <AlertCircle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs uppercase opacity-80 tracking-widest mb-0.5">Notification</span>
                        <span className="text-lg">{recentToast.message}</span>
                    </div>
                </div>
            )}
            <InterviewAlert />
            <Chatbot />

            {/* User Documentation Modal */}
            {isDocsOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-300 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-300 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg text-white"><FileText size={16} /></div>
                                <div>
                                    <h2 className="text-base font-black text-slate-800 tracking-tight leading-none">User Documentation</h2>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Recruit AI â€” How to use</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDocsOpen(false)} className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors"><X size={16} /></button>
                        </div>
                        <div className="px-6 py-5 overflow-y-auto space-y-5 text-[11px] font-bold text-slate-600 leading-relaxed">
                            <DocSection title="Dashboard">
                                Overview of pipeline metrics, candidate trends, departmental distribution, and the recent-activity feed showing every applicant with their exact upload timestamp.
                            </DocSection>
                            <DocSection title="Job Management">
                                Create, edit, and publish jobs. Use the kebab menu on each card to <span className="text-blue-600">Publish to Careers</span> â€” that's the approval gate before a job appears on www.oryfolks.com/careers. Edit a job's required skills and every assigned candidate's fit score automatically recalculates.
                            </DocSection>
                            <DocSection title="Candidates">
                                Sortable table of every candidate. Inline status dropdown for quick updates, inline job assignment, and per-row Edit / Download Resume / Delete actions. The sidebar offers Views (All / My / Website / Not in Hotlist) and Hotlists. CSV export from the header.
                            </DocSection>
                            <DocSection title="ATS Fit Score">
                                Computed automatically from <span className="text-blue-600">75% skill match</span> + <span className="text-blue-600">25% experience match</span>. Recalculates on candidate create, candidate update, job assignment, and job edit. Use <code className="bg-slate-100 px-1 rounded text-[10px]">POST /api/candidates/rescore-all</code> or <code className="bg-slate-100 px-1 rounded text-[10px]">/deep-rematch</code> to recalculate everyone manually.
                            </DocSection>
                            <DocSection title="Skills Matrix">
                                Evidence-weighted skill proficiency: experience (50%) + internship/foundation (25%) + certification (10%) + project mentions (10%) + keyword frequency (5%). Regenerates on every resume upload and candidate edit.
                            </DocSection>
                            <DocSection title="Resume Upload">
                                Drag a PDF into the upload area. The parser extracts name, email, phone, skills, and experience, then auto-matches the candidate to the best-fitting open job. Duplicate emails are rejected at the API level.
                            </DocSection>
                            <DocSection title="Inbox">
                                Real candidates loaded from /api/candidates. The <span className="text-blue-600">Email</span> button opens your mail client with the candidate's address and a pre-filled subject; <span className="text-blue-600">Call</span> opens your phone dialer. Profile / Schedule / Archive / Delete also live in the header.
                            </DocSection>
                            <DocSection title="Interview Pipeline">
                                Kanban view by stage (Screening â†’ Technical â†’ Managerial â†’ HR). Drag a candidate between columns to update their round status.
                            </DocSection>
                            <DocSection title="Careers Page (Public)">
                                Jobs flagged <span className="text-blue-600">Publish to Careers</span> are served via <code className="bg-slate-100 px-1 rounded text-[10px]">/api/jobs/public</code>. The OryFolks site proxies that endpoint. Applications submitted on the public site land back as candidates with <code className="bg-slate-100 px-1 rounded text-[10px]">source=ORYFOLKS_CAREERS</code>.
                            </DocSection>
                            <DocSection title="AI Assistant">
                                The floating <span className="text-blue-600">Ask AI</span> button (bottom-right) gives recruiters fast access to common queries â€” "top candidates", "recent candidates", "pipeline stats", "find {`<name>`}", "open jobs". No external AI required.
                            </DocSection>
                        </div>
                        <div className="px-6 py-3 border-t border-slate-300 bg-slate-50/50 flex justify-end">
                            <button onClick={() => setIsDocsOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-md shadow-blue-100">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* FAQ Modal */}
            {isFaqOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-300 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-300 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500 rounded-lg text-white"><HelpCircle size={16} /></div>
                                <div>
                                    <h2 className="text-base font-black text-slate-800 tracking-tight leading-none">Frequently Asked Questions</h2>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Common questions & setup</p>
                                </div>
                            </div>
                            <button onClick={() => setIsFaqOpen(false)} className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors"><X size={16} /></button>
                        </div>
                        <div className="px-6 py-5 overflow-y-auto space-y-3">
                            <FaqItem q="Why does a candidate show 0% fit score?">
                                The candidate has no jobId yet, or the assigned job's required skills don't overlap with the candidate's skills at all. Use the <span className="text-blue-600 font-black">Assign Job</span> dropdown on the Candidates page, or hit <code className="bg-slate-100 px-1 rounded text-[10px]">POST /api/candidates/deep-rematch</code> to auto-place everyone on the best-fit open job.
                            </FaqItem>
                            <FaqItem q="Why does the resume upload sometimes take a long time?">
                                The Gemini AI parser uses the Google API. On the free tier, after ~60 requests/day you hit a quota that triggers automatic retries with backoff (up to ~70s). The candidate still gets created with the form data once it falls back. Upgrade the API key in Google AI Studio to remove the delay.
                            </FaqItem>
                            <FaqItem q="How do I publish a job to www.oryfolks.com/careers?">
                                On the Jobs page, open any job's kebab menu (â‹®) and click <span className="text-blue-600 font-black">Publish to Careers</span>. Confirm the payload preview. The job will be served by <code className="bg-slate-100 px-1 rounded text-[10px]">/api/jobs/public</code> immediately. The live careers page reflects it on its next reload.
                            </FaqItem>
                            <FaqItem q="A candidate already exists when I try to upload their resume.">
                                Recruit AI enforces email uniqueness. If the parser extracts an email that already exists in the candidates collection, the API returns 400. The careers form treats this as a friendly success ("You've already applied"). To re-import, delete the existing record first.
                            </FaqItem>
                            <FaqItem q="The fit scores all cluster at the same number â€” why?">
                                Most likely the candidate's skills don't intersect with the job's required skills (yielding 0 on the skill component) while their experience clears the requirement (yielding the full 25 experience points). Same number, different reasons. Use Deep Rematch to find each candidate's truly best job, or update the job's required-skills list to use concrete tech names.
                            </FaqItem>
                            <FaqItem q="How do I update the Skills Matrix manually?">
                                Edit any field on the candidate via the pencil icon â€” that triggers a recompute on save. Or call <code className="bg-slate-100 px-1 rounded text-[10px]">POST /api/skill-matrix/calculate?candidateId=X&jobId=Y</code>.
                            </FaqItem>
                            <FaqItem q="Where are the backend logs?">
                                The Spring Boot backend writes to <code className="bg-slate-100 px-1 rounded text-[10px]">c:\recruitai-backend\backend.log</code>. Look for ERROR/WARN lines for parser, fit-score, or migration issues.
                            </FaqItem>
                            <FaqItem q="Can I roll back a migration?">
                                Yes â€” delete the marker doc from MongoDB: <code className="bg-slate-100 px-1 rounded text-[10px]">db.system_meta.deleteOne({`{ _id: "<migration_id>" }`})</code>. The migration will re-run on the next backend boot.
                            </FaqItem>
                        </div>
                        <div className="px-6 py-3 border-t border-slate-300 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Still stuck? Email support@recruitai.com</span>
                            <button onClick={() => setIsFaqOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-md shadow-blue-100">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Help & Support Modal */}
            {isHelpModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-300 animate-in zoom-in duration-300">
                        <div className="px-10 py-8 border-b border-slate-300 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Support & Resources</h2>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">How can we assist you today?</p>
                            </div>
                            <button onClick={() => setIsHelpModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-10 space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <HelpLink
                                    icon={<FileText className="text-blue-500" />}
                                    title="User Documentation"
                                    desc="Learn how to use Recruit Ai effectively"
                                    onClick={() => { setIsHelpModalOpen(false); setIsDocsOpen(true); }}
                                />
                                <HelpLink
                                    icon={<MessageCircle className="text-emerald-500" />}
                                    title="Live Support"
                                    desc="Chat with our engineering team"
                                    onClick={() => {
                                        setIsHelpModalOpen(false);
                                        // Tell the global Chatbot widget to open
                                        window.dispatchEvent(new Event('open-chatbot'));
                                    }}
                                />
                                <HelpLink
                                    icon={<HelpCircle className="text-orange-500" />}
                                    title="FAQs"
                                    desc="Commonly asked questions & setup"
                                    onClick={() => { setIsHelpModalOpen(false); setIsFaqOpen(true); }}
                                />
                                <a href="mailto:support@recruitai.com">
                                    <HelpLink 
                                        icon={<Mail className="text-indigo-500" />} 
                                        title="Email Support" 
                                        desc="support@recruitai.com" 
                                    />
                                </a>
                            </div>

                            <div className="pt-6 border-t border-slate-300 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Version v2.4.0 (Stable)</p>
                            </div>

                            <button
                                onClick={() => setIsHelpModalOpen(false)}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const HelpLink: React.FC<{ icon: React.ReactNode; title: string; desc: string; onClick?: () => void }> = ({ icon, title, desc, onClick }) => (
    <div
        onClick={onClick}
        className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-300 transition-all cursor-pointer group"
    >
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-300 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <div>
            <h4 className="text-xs font-black text-slate-700 leading-none">{title}</h4>
            <p className="text-[10px] font-bold text-slate-600 mt-1">{desc}</p>
        </div>
    </div>
);

const DocSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">{title}</h3>
        <p className="text-[11px] font-bold text-slate-600 leading-relaxed">{children}</p>
    </div>
);

const FaqItem: React.FC<{ q: string; children: React.ReactNode }> = ({ q, children }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-slate-300 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
            >
                <span className="text-[11px] font-black text-slate-800">{q}</span>
                <ChevronRight
                    size={14}
                    className={`text-slate-600 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
                />
            </button>
            {open && (
                <div className="px-4 pb-4 pt-1 text-[11px] font-bold text-slate-600 leading-relaxed bg-slate-50/40 border-t border-slate-300">
                    {children}
                </div>
            )}
        </div>
    );
};

/**
 * Profile pill at the top right. Click anywhere on it (name area or avatar)
 * to open a dropdown with the user's email, role, and inline-editable name.
 * Clicking the avatar still triggers the existing avatar-upload flow via
 * onAvatarClick (separate file input lives in the parent component).
 */
const UserPill: React.FC<{
    user: any;
    setUser: React.Dispatch<React.SetStateAction<any>>;
    isUploading: boolean;
    onAvatarClick: () => void;
    onSignOut: () => void;
}> = ({ user, setUser, isUploading, onAvatarClick, onSignOut }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [draftName, setDraftName] = useState<string>(formatUserDisplayName(user));
    const [saving, setSaving] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Keep the draft name in sync with the live user when not editing —
        // otherwise typing in the input would get clobbered by a render.
        if (!editingName) setDraftName(formatUserDisplayName(user));
    }, [user, editingName]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) {
                setOpen(false);
                setEditingName(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    // Bypass/demo accounts have no DB row, so their profile edits are saved locally only.
    const DEMO_EMAILS = ['demo@recruitai.com', 'hr@recruitai.com', 'manager@recruitai.com'];
    const isDemo = DEMO_EMAILS.includes((user?.email || '').toLowerCase());

    const saveName = async () => {
        const trimmed = draftName.trim();
        if (!trimmed || trimmed === (user?.name || '')) {
            setEditingName(false);
            return;
        }
        setSaving(true);
        try {
            if (isDemo) {
                // The demo bypass account has no DB row — update local display only.
                const next = { ...user, name: trimmed };
                setUser(next);
                localStorage.setItem('user', JSON.stringify(next));
            } else {
                const res = await api.put('/users/profile', { email: user.email, name: trimmed });
                const next = { ...user, ...(res.data || {}), name: trimmed };
                setUser(next);
                localStorage.setItem('user', JSON.stringify(next));
            }
            setEditingName(false);
        } catch (err: any) {
            alert(`Couldn't update name: ${err?.response?.data || err?.message || 'unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setOpen(o => !o)}
                    title="Profile"
                    className="text-right hidden sm:block px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <p className="text-[11px] font-black text-gray-900 tracking-tight leading-none">
                        {formatUserDisplayName(user)}
                    </p>
                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-0.5 leading-none">
                        {user?.role || 'Hiring Manager'}
                    </p>
                </button>
                <div
                    onClick={onAvatarClick}
                    className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center text-white font-black shadow-lg border-2 border-white ring-2 ring-blue-50 transform hover:scale-105 transition-all cursor-pointer overflow-hidden group/avatar relative ${isUploading ? 'opacity-50' : ''}`}
                >
                    {isUploading ? (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : user?.profilePicture ? (
                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <img src="/oryfolks-icon.png" alt="OryFolks" className="w-full h-full object-contain p-1" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                        <UploadCloud size={16} className="text-white" />
                    </div>
                </div>
            </div>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-br from-blue-50/60 to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
                                {user?.profilePicture
                                    ? <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                                    : (user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A')}
                            </div>
                            <div className="flex-1 min-w-0">
                                {editingName ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            autoFocus
                                            value={draftName}
                                            onChange={e => setDraftName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') saveName();
                                                if (e.key === 'Escape') { setEditingName(false); setDraftName(formatUserDisplayName(user)); }
                                            }}
                                            disabled={saving}
                                            className="w-full px-2 py-1 text-[12px] font-black text-slate-900 bg-white border border-blue-400 rounded outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={saveName}
                                            disabled={saving}
                                            title="Save"
                                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-50"
                                        >
                                            <CheckIcon size={12} />
                                        </button>
                                        <button
                                            onClick={() => { setEditingName(false); setDraftName(formatUserDisplayName(user)); }}
                                            title="Cancel"
                                            className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <h4 className="text-[13px] font-black text-slate-900 truncate">{formatUserDisplayName(user)}</h4>
                                        <button
                                            onClick={() => setEditingName(true)}
                                            title="Edit name"
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        >
                                            <Edit2 size={11} />
                                        </button>
                                    </div>
                                )}
                                <p className="text-[10px] font-bold text-slate-600 truncate">{user?.email}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                                    {user?.role || 'Member'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-1.5">
                        <button
                            onClick={() => { setOpen(false); onAvatarClick(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                        >
                            <UploadCloud size={14} className="text-slate-500" />
                            Change profile picture
                        </button>
                        <button
                            onClick={() => { setOpen(false); navigate('/settings'); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                        >
                            <Settings size={14} className="text-slate-500" />
                            Account settings
                        </button>
                        <button
                            onClick={() => { setOpen(false); navigate('/inbox'); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                        >
                            <UserIcon size={14} className="text-slate-500" />
                            Inbox
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                            onClick={() => { setOpen(false); onSignOut(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-black text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
                        >
                            <LogOut size={14} />
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Notification dropdown that powers the bell icon — grouped by Today /
 * Yesterday / Older, bold titles, relative timestamps, blue dot for unread,
 * category icons. Clicking a row marks it read and navigates to the related
 * entity when one is set.
 */
const NotificationCenter: React.FC<{
    notifications: any[];
    setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
    navigate: (path: string) => void;
}> = ({ notifications, setNotifications, navigate }) => {
    const unreadCount = notifications.filter(n => !n.read).length;

    const categoryIcon = (cat?: string) => {
        switch ((cat || '').toUpperCase()) {
            case 'INTERVIEW': return { Icon: CalendarIcon,  bg: 'bg-blue-100',    text: 'text-blue-600' };
            case 'CANDIDATE': return { Icon: UserPlus,      bg: 'bg-emerald-100', text: 'text-emerald-600' };
            case 'JOB':       return { Icon: BriefcaseIcon, bg: 'bg-indigo-100',  text: 'text-indigo-600' };
            case 'APPROVAL':  return { Icon: ShieldCheck,   bg: 'bg-amber-100',   text: 'text-amber-600' };
            case 'SYSTEM':    return { Icon: Server,        bg: 'bg-slate-100',   text: 'text-slate-600' };
            // Legacy category strings still in the DB from before the rename
            case 'JOB_APP':          return { Icon: UserPlus,    bg: 'bg-emerald-100', text: 'text-emerald-600' };
            case 'DELETION_REQUEST': return { Icon: ShieldCheck, bg: 'bg-amber-100',   text: 'text-amber-600' };
            default:          return { Icon: Inbox,         bg: 'bg-slate-100',   text: 'text-slate-600' };
        }
    };

    const navigateForNotification = (n: any) => {
        const cat = (n.category || '').toUpperCase();
        if (cat === 'INTERVIEW' && n.relatedEntityId) return `/candidates/${n.relatedEntityId}`;
        if (cat === 'CANDIDATE' && n.relatedEntityId) return `/candidates/${n.relatedEntityId}`;
        if (cat === 'JOB_APP'   && n.relatedEntityId) return `/candidates/${n.relatedEntityId}`;
        if (cat === 'JOB'       && n.relatedEntityId) return `/jobs?highlight=${n.relatedEntityId}`;
        if (cat === 'APPROVAL' || cat === 'DELETION_REQUEST') return '/deletion-requests';
        return '/dashboard';
    };

    const handleRowClick = async (n: any) => {
        if (!n.read) {
            try { await api.put(`/notifications/${n.id}/read`); } catch { /* ignore */ }
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        }
        navigate(navigateForNotification(n));
    };

    const handleMarkAllRead = async () => {
        const unread = notifications.filter(n => !n.read);
        // Optimistic UI — flip everything to read locally.
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        await Promise.allSettled(unread.map(n => api.put(`/notifications/${n.id}/read`)));
    };

    // Group by Today / Yesterday / Older while preserving server order (desc).
    const groups: Record<'Today' | 'Yesterday' | 'Older', any[]> = { Today: [], Yesterday: [], Older: [] };
    for (const n of notifications) groups[notificationDayBucket(n.createdAt)].push(n);

    // Bold the entity name inside the message so the candidate/job name pops.
    const renderMessage = (n: any) => {
        const name = (n.entityName || '').trim();
        const msg = n.message || '';
        if (!name || !msg.toLowerCase().includes(name.toLowerCase())) {
            return <span className="text-[12px] text-slate-700 leading-snug">{msg}</span>;
        }
        const i = msg.toLowerCase().indexOf(name.toLowerCase());
        return (
            <span className="text-[12px] text-slate-700 leading-snug">
                {msg.slice(0, i)}
                <span className="font-black text-slate-900">{msg.slice(i, i + name.length)}</span>
                {msg.slice(i + name.length)}
            </span>
        );
    };

    return (
        <div className="relative cursor-pointer group leading-none">
            <span className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg block transition-all">
                <Bell size={18} />
            </span>
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white rounded-full border-2 border-white text-[9px] font-black flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}

            <div className="absolute right-0 top-full mt-3 w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 transform origin-top-right z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">Notifications</h4>
                        {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full uppercase tracking-widest">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            Mark all read
                        </button>
                    )}
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <p className="text-[12px] font-bold text-slate-500">You're all caught up.</p>
                        </div>
                    ) : (
                        (['Today', 'Yesterday', 'Older'] as const).map(bucket => {
                            const rows = groups[bucket];
                            if (rows.length === 0) return null;
                            return (
                                <div key={bucket}>
                                    <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 sticky top-0">
                                        {bucket}
                                    </div>
                                    {rows.map((n: any) => {
                                        const { Icon, bg, text } = categoryIcon(n.category);
                                        return (
                                            <div
                                                key={n.id}
                                                onClick={() => handleRowClick(n)}
                                                className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer flex gap-3 ${n.read ? '' : 'bg-blue-50/40'}`}
                                            >
                                                <div className={`shrink-0 w-9 h-9 ${bg} ${text} rounded-lg flex items-center justify-center`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h5 className="text-[12px] font-black text-slate-900 truncate">
                                                            {n.title || 'Notification'}
                                                        </h5>
                                                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Unread" />}
                                                    </div>
                                                    <div className="mb-0.5">{renderMessage(n)}</div>
                                                    <p className="text-[10px] font-bold text-slate-500">
                                                        {formatRelativeTime(n.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default Layout;
