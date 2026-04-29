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
    Info,
    AlertCircle,
    Search,
    Plus,
    HelpCircle,
    Mail,
    ChevronLeft,
    ChevronRight,
    MessageCircle
} from 'lucide-react';
import { formatUserDisplayName } from '../utils';
import InterviewAlert from './InterviewAlert';

const Layout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    useEffect(() => {
        // Initialize notification sound
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token) {
            navigate('/login');
        } else {
            // Sync existing token to Chrome Extension on every page load
            // This fixes "Authentication required" for already-logged-in users
            try {
                const chromeRuntime = (window as any).chrome?.runtime;
                if (chromeRuntime && chromeRuntime.sendMessage) {
                    chromeRuntime.sendMessage({ action: 'SYNC_TOKEN', token }, () => {
                        if (chromeRuntime.lastError) {
                            // Extension may not be installed — silently ignore
                            void chromeRuntime.lastError;
                        } else {
                            console.log('✅ Token re-synced to extension on page load');
                        }
                    });
                }
            } catch (e) {
                // Extension not installed — ignore
            }

            if (userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch (e) {
                    console.error("Failed to parse user data", e);
                    localStorage.removeItem('user'); // Clear corrupted data
                }
            }
        }
    }, [navigate]);

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
        return () => window.removeEventListener('storage', handleStorageChange);
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
        const formData = new FormData();
        formData.append('file', file);
        formData.append('email', user.email);

        try {
            const response = await api.put('/users/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

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

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/jobs', label: 'Job Management', icon: Briefcase },
        { path: '/candidates', label: 'Candidates', icon: Users },
        { path: '/resume-upload', label: 'Resume Upload', icon: UploadCloud },
        { path: '/skills-matrix', label: 'Skills Matrix', icon: BarChart },
        { path: '/shortlist-report', label: 'Shortlist Report', icon: FileText },
        { path: '/interview-pipeline', label: 'Interview Pipeline', icon: Users },
        { path: '/inbox', label: 'Inbox', icon: Mail },
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
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
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
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                }`
                            }
                        >
                            <item.icon size={18} className={`flex-shrink-0 ${isSidebarOpen ? 'mr-3' : 'mx-auto'} ${isSidebarOpen && 'text-blue-600/70 group-[.active]:text-blue-700'}`} />
                            {isSidebarOpen && <span className="font-semibold text-[12px] tracking-tight">{item.label}</span>}

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

                            {/* Global Search Bar */}
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 w-72 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-400 focus-within:bg-white transition-all">
                                <Search className="w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="bg-transparent border-none outline-none text-[11px] w-full font-medium"
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            const query = (e.target as HTMLInputElement).value.trim();
                                            if (query) {
                                                // Priority: Direct ID matching
                                                if (query.toUpperCase().startsWith('CAN-')) {
                                                    navigate(`/candidates/${query.toUpperCase()}`);
                                                    return;
                                                }

                                                try {
                                                    const res = await api.get('/candidates/search', { params: { search: query } });
                                                    const results = res.data.content || res.data;
                                                    if (results.length > 0) {
                                                        navigate(`/candidates/${results[0].id}`);
                                                    } else {
                                                        alert("No candidates found matching query");
                                                    }
                                                } catch (error) {
                                                    console.error("Search failed", error);
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Global Action Buttons */}
                            <button
                                onClick={() => navigate('/resume-upload')}
                                className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100 group"
                            >
                                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>

                            <button
                                onClick={() => setIsHelpModalOpen(true)}
                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all h-8 w-8 flex items-center justify-center">
                                <HelpCircle size={16} />
                            </button>

                            {/* Notification Bell */}
                            <div className="relative cursor-pointer group leading-none">
                                <span className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg block transition-all">
                                    <Bell size={18} />
                                </span>
                                {notifications.length > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                                )}

                                <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-2xl shadow-2xl border-2 border-blue-50 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 transform origin-top-right z-50 overflow-hidden">
                                    <div className="p-4 border-b border-blue-50 bg-blue-50/30">
                                        <h4 className="font-bold text-[10px] uppercase tracking-widest text-blue-900 text-center">System Alerts</h4>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400 text-sm font-medium">No new notifications</div>
                                        ) : (
                                            notifications.map((notif: any) => (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => navigate('/dashboard')}
                                                    className="p-4 border-b border-gray-50 hover:bg-slate-50 transition cursor-pointer"
                                                >
                                                    <p className="text-[13px] text-gray-800 font-semibold">{notif.message}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{new Date(notif.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="relative cursor-pointer group leading-none">
                                <span
                                    onClick={() => navigate('/inbox')}
                                    className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg block transition-all">
                                    <Mail size={18} />
                                </span>
                                <div className="absolute right-0 top-full mt-4 w-96 bg-white rounded-[2rem] shadow-2xl border-2 border-blue-50 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 transform origin-top-right z-50 overflow-hidden">
                                    <div className="p-6 bg-slate-50 border-b border-blue-50">
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
                                            <div className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex gap-4 items-center" onClick={() => navigate('/inbox', { state: { candidateId: 'CAN-1eaad78d' } })}>
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs">MK</div>
                                                <div className="flex-1">
                                                    <h5 className="text-[11px] font-black text-slate-800">M. Chinnikrishna</h5>
                                                    <p className="text-[10px] text-slate-500 font-medium truncate w-56">I'm definitely interested in discussing...</p>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-300">2 Mins</span>
                                            </div>
                                        ) : (
                                            recentMessages.map((msg: any) => (
                                                <div
                                                    key={msg.id}
                                                    onClick={() => navigate('/inbox', { state: { candidateId: msg.id } })}
                                                    className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex gap-4 items-center">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-xs">
                                                        {msg.name?.split(' ').map((n: any) => n[0]).join('') || 'CA'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h5 className="text-[11px] font-black text-slate-800">{msg.name}</h5>
                                                        <p className="text-[10px] text-slate-500 font-medium truncate w-56">Regarding the job role for {msg.role || 'Position'}...</p>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-300">Just now</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-blue-50 text-center">
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
                                className="p-2 text-gray-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <Settings size={18} />
                            </button>

                            <div className="h-6 w-px bg-gray-200 mx-1"></div>

                            <div className="flex items-center gap-2">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[11px] font-black text-gray-900 tracking-tight leading-none">{formatUserDisplayName(user)}</p>
                                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-0.5 leading-none">{user?.role || 'Hiring Manager'}</p>
                                </div>
                                <div
                                    onClick={handleProfilePictureClick}
                                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-blue-500 flex items-center justify-center text-white font-black shadow-lg border-2 border-white ring-2 ring-blue-50 transform hover:scale-105 transition-all cursor-pointer overflow-hidden group/avatar relative ${isUploading ? 'opacity-50' : ''}`}
                                >
                                    {isUploading ? (
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : user?.profilePicture ? (
                                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl">{user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'A'}</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                        <UploadCloud size={16} className="text-white" />
                                    </div>
                                </div>
                            </div>
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

            {/* Help & Support Modal */}
            {isHelpModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in duration-300">
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Support & Resources</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">How can we assist you today?</p>
                            </div>
                            <button onClick={() => setIsHelpModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-10 space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <HelpLink
                                    icon={<FileText className="text-blue-500" />}
                                    title="User Documentation"
                                    desc="Learn how to use Recruit Ai effectively"
                                    onClick={() => window.open('https://docs.recruitai.com', '_blank')}
                                />
                                <HelpLink
                                    icon={<MessageCircle className="text-emerald-500" />}
                                    title="Live Support"
                                    desc="Chat with our engineering team"
                                    onClick={() => alert('Live support chat is connecting...')}
                                />
                                <HelpLink
                                    icon={<HelpCircle className="text-orange-500" />}
                                    title="FAQs"
                                    desc="Commonly asked questions & setup"
                                    onClick={() => window.open('https://recruitai.com/faqs', '_blank')}
                                />
                                <a href="mailto:support@recruitai.com">
                                    <HelpLink
                                        icon={<Mail className="text-indigo-500" />}
                                        title="Email Support"
                                        desc="support@recruitai.com"
                                    />
                                </a>
                            </div>

                            <div className="pt-6 border-t border-slate-100 text-center">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Version v2.4.0 (Stable)</p>
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
        className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
    >
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-50 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <div>
            <h4 className="text-xs font-black text-slate-700 leading-none">{title}</h4>
            <p className="text-[10px] font-bold text-slate-400 mt-1">{desc}</p>
        </div>
    </div>
);

export default Layout;
