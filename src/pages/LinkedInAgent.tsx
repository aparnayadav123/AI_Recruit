import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search,
    Zap,
    ShieldCheck,
    Globe,
    User,
    Mail,
    Phone,
    Briefcase,
    GraduationCap,
    Code,
    Layers,
    MousePointer2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    Info
} from 'lucide-react';

const LinkedInAgent: React.FC = () => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [sessionCookie, setSessionCookie] = useState(localStorage.getItem('li_at') || '');

    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            // Trigger Interactive Login for Scraper Cookies
            await axios.post('http://localhost:8090/agent/login');
            // Poll for success will pick it up
            setIsConnected(true);
        } catch (err) {
            alert('Login window closed or failed. Please try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    // Check status on mount
    useEffect(() => {
        apiCheckStatus();
        const interval = setInterval(apiCheckStatus, 5000); // Poll status
        return () => clearInterval(interval);
    }, []);

    const apiCheckStatus = async () => {
        try {
            const res = await axios.get('http://localhost:8090/agent/status');
            setIsConnected(res.data.connected);
        } catch (e) { }
    };

    const handleFetch = async () => {
        if (!url) return;
        // Allow both Personal Profiles (/in/) AND Company Pages (/company/)
        if (!url.includes('/in/') && !url.includes('/company/')) {
            alert('Please enter a valid LinkedIn Profile (/in/) or Company (/company/) URL');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axios.post('http://localhost:8090/agent/fetch', { url });
            setResult(response.data);
        } catch (err: any) {
            // Specific handling for auth error
            const msg = err.response?.data?.error || '';
            if (msg.includes('hit LinkedIn login wall') || msg.includes('Connect LinkedIn')) {
                setIsConnected(false); // Force re-login UI
                setError('Session expired or login required. Please click "Connect LinkedIn" to re-authenticate.');
            } else {
                setError(msg || 'Failed to connect to the LinkedIn Agent.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Premium Header Container - Updated to Blue */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-50 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100/50">
              <Zap size={14} />
            </div>
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Autonomous Agent</span>
          </div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">LinkedIn Recruiter Agent</h2>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={handleConnect}
            disabled={isConnecting || isConnected}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm
                           ${isConnected
                ? 'bg-green-50 text-green-700 border-green-100 cursor-default'
                : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
              }`}
          >
            {isConnecting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : <ShieldCheck size={12} />}
            {isConnecting ? 'Opening...' : isConnected ? 'Authenticated' : 'Connect'}
          </button>
          {!isConnected && !isConnecting && (
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Automated login</p>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-50 relative overflow-hidden">
          <div className="relative z-10">
            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <MousePointer2 size={10} className="text-blue-600" />
              LinkedIn Profile URL
            </label>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Globe size={14} />
                </div>
                <input
                  type="text"
                  placeholder="https://www.linkedin.com/in/username"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all text-[11px] font-bold placeholder:text-gray-300"
                />
              </div>
              <button
                onClick={handleFetch}
                disabled={isLoading || !url}
                className={`px-5 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md
                                ${isLoading || !url ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Zap size={14} className="fill-white" />
                )}
                {isLoading ? 'Working...' : 'Launch Agent'}
              </button>
            </div>
          </div>
        </div>

                {error && (
                    <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[32px] flex items-center gap-4 text-red-600 animate-in zoom-in duration-300">
                        <div className="bg-red-100 p-3 rounded-2xl">
                            <AlertCircle size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-lg">Agent Interrupted</p>
                            <p className="text-sm font-medium opacity-80">{error}</p>
                        </div>
                    </div>
                )}

                {/* Result Section */}
                {result && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                        <div className="bg-green-50 border border-green-100 p-3 rounded-xl flex items-center gap-3 text-green-700">
                            <CheckCircle2 size={18} />
                            <div>
                                <p className="font-black text-xs uppercase leading-none">Mission Accomplished</p>
                                <p className="text-[10px] font-bold opacity-80 mt-1 leading-none">Data extracted and synced.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Personal Info Card */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-50 relative overflow-hidden group">
                                <h3 className="text-xs font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                    <User size={14} className="text-blue-600" />
                                    Identity Profile
                                </h3>
                                <div className="space-y-3 relative z-10">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</p>
                                        <p className="text-base font-black text-gray-900 leading-none">{result.analysis?.name || 'N/A'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</p>
                                            <p className="text-[10px] font-bold text-gray-700 truncate">{result.analysis?.email || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                                            <p className="text-[10px] font-bold text-gray-700">{result.analysis?.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Role</p>
                                        <p className="text-sm font-black text-blue-600 leading-tight">{result.analysis?.role || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Professional Context Card - Updated to Blue */}
                            {/* Professional Context Card */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-50 relative overflow-hidden group">
                                <h3 className="text-xs font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                    <Briefcase size={14} className="text-blue-600" />
                                    Context
                                </h3>
                                <div className="space-y-3 relative z-10">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Experience</div>
                                            <div className="text-lg font-black text-gray-900 leading-none">{result.analysis?.experience || 0}y</div>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Notice</div>
                                            <div className="text-lg font-black text-gray-900 leading-none">{result.analysis?.noticePeriod || 0}d</div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Org</span>
                                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[100px]">{result.analysis?.currentOrganization || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Locality</span>
                                            <span className="text-[10px] font-bold text-slate-700">{result.analysis?.locality || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Japanese</span>
                                            <span className="text-[10px] font-bold text-indigo-600 font-black">{result.analysis?.japaneseLanguageProficiency || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Visa</span>
                                            <span className="text-[10px] font-bold text-slate-700">{result.analysis?.visaType || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Reason</span>
                                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[100px]">{result.analysis?.reasonForChange || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Skill Segregation Card - Updated to Blue */}
                            {/* Skill Segregation Card */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-50 relative overflow-hidden group">
                                <h3 className="text-xs font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                    <Layers size={14} className="text-blue-600" />
                                    Skill Segregation
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    {[
                                        { label: 'Languages', items: result.analysis?.technical_segregation?.languages || [], color: 'bg-blue-50/50 text-blue-700 border-blue-100' },
                                        { label: 'Frameworks', items: result.analysis?.technical_segregation?.frameworks || [], color: 'bg-green-50/50 text-green-700 border-green-100' },
                                        { label: 'Tools', items: result.analysis?.technical_segregation?.tools || [], color: 'bg-orange-50/50 text-orange-700 border-orange-100' }
                                    ].map((cat, i) => (
                                        <div key={i}>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 leading-none">{cat.label}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {cat.items.map((skill: string, idx: number) => (
                                                    <span key={idx} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border ${cat.color} leading-none`}>
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Full Analysis Card */}
                        {/* Full Analysis Card */}
                        <div className="bg-slate-900 p-4 rounded-xl shadow-lg relative overflow-hidden">
                            <h3 className="text-xs font-black text-white mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <Zap size={14} className="text-blue-400" />
                                Agent Insights
                            </h3>
                            <div className="flex flex-wrap gap-2 relative z-10">
                                {result.analysis?.skills?.map((skill: string, idx: number) => (
                                    <span key={idx} className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white/90 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LinkedInAgent;
