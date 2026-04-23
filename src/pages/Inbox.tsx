import React, { useState, useEffect, useRef } from 'react';
import { 
    Search, 
    MoreHorizontal, 
    Send, 
    User, 
    Mail, 
    Phone, 
    Calendar, 
    Video, 
    Sparkles, 
    X,
    MessageSquare,
    CheckCheck,
    Clock,
    Filter,
    ArrowLeft,
    UserCheck,
    RotateCcw,
    Archive
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

interface ChatMessage {
    id: string;
    text: string;
    sender: 'me' | 'them';
    timestamp: string;
}

interface Conversation {
    id: string;
    candidateName: string;
    candidateRole: string;
    candidateAvatar?: string;
    lastMessage: string;
    time: string;
    unread: boolean;
    online: boolean;
    candidateId: string;
}

const Inbox: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [conversations, setConversations] = useState<Conversation[]>([
        {
            id: '1',
            candidateName: 'M. Chinnikrishna',
            candidateRole: 'Manual Tester',
            lastMessage: "I'm definitely interested in discussing opportunities. Let's schedule a brief chat!",
            time: '2 Mins',
            unread: true,
            online: true,
            candidateId: 'CAN-1eaad78d'
        },
        {
            id: '2',
            candidateName: 'Ankita Sharma',
            candidateRole: 'Full Stack Developer',
            lastMessage: 'Thank you for the offer letter! I will review it and get back to you by tomorrow.',
            time: '1 Hour',
            unread: true,
            online: false,
            candidateId: 'CAN-2'
        },
        {
            id: '3',
            candidateName: 'John Doe',
            candidateRole: 'Principal Architect',
            lastMessage: 'Regarding the technical interview, can we reschedule to Wednesday?',
            time: 'Yesterday',
            unread: false,
            online: true,
            candidateId: 'CAN-3'
        },
        {
            id: '4',
            candidateName: 'Priya Patel',
            candidateRole: 'UX Designer',
            lastMessage: 'The portfolio link I sent earlier has the latest case studies.',
            time: '2 Days',
            unread: false,
            online: false,
            candidateId: 'CAN-4'
        }
    ]);

    const [selectedId, setSelectedId] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const activeChat = conversations.find(c => c.id === selectedId);

    useEffect(() => {
        const fetchRecentCandidates = async () => {
            try {
                // Fetch recent candidates with status that might be in inbox (Interview OR Screening)
                const res = await api.get('/candidates?size=10&sort=updatedAt,desc');
                const candData = res.data.content || res.data || [];
                
                // Fallback conversations (the ones in the dropdown)
                const fallbacks: Conversation[] = [
                    { id: 'CAN-1eaad78d', candidateName: 'M. Chinnikrishna', candidateRole: 'Manual Tester', lastMessage: "I'm definitely interested in discussing opportunities. Let's schedule a brief chat!", time: '2 Mins', unread: true, online: true, candidateId: 'CAN-1eaad78d' },
                    { id: 'CAN-2', candidateName: 'Ankita Sharma', candidateRole: 'Full Stack Developer', lastMessage: 'Thank you for the offer letter! I will review it and get back to you by tomorrow.', time: '1 Hour', unread: true, online: false, candidateId: 'CAN-2' },
                    { id: 'CAN-3', candidateName: 'John Doe', candidateRole: 'Principal Architect', lastMessage: 'Regarding the technical interview, can we reschedule to Wednesday?', time: 'Yesterday', unread: false, online: true, candidateId: 'CAN-3' }
                ];

                let finalConv: Conversation[] = [];
                if (candData.length > 0) {
                    const mapped: Conversation[] = candData.map((cand: any, idx: number) => ({
                        id: cand.id,
                        candidateName: cand.name,
                        candidateRole: cand.role || 'General',
                        lastMessage: "I'm definitely interested in discussing opportunities. Let's schedule a brief chat!",
                        time: 'Just now',
                        unread: idx < 2, // fake some unread
                        online: Math.random() > 0.5,
                        candidateId: cand.id
                    }));
                    finalConv = mapped;
                } else {
                    finalConv = fallbacks;
                }

                setConversations(finalConv);
                
                // Determine which one to select
                const stateCandId = (location as any).state?.candidateId;
                const toSelect = stateCandId || finalConv[0]?.id;
                
                if (toSelect) {
                    setSelectedId(toSelect);
                    const selConv = finalConv.find(c => c.id === toSelect) || finalConv[0];
                    setMessages([
                        { id: '1', text: `Hi ${selConv.candidateName}, I'm impressed by your experience as a ${selConv.candidateRole}. We're building a team 🚀 and your skills seem like a perfect fit! Open to chat?`, sender: 'me', timestamp: '10:30 AM' },
                        { id: '2', text: "Hi Aparna, thanks for your message! I'm definitely interested in discussing opportunities. Let's schedule a brief chat!", sender: 'them', timestamp: '10:32 AM' }
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch inbox data", error);
            }
        };

        fetchRecentCandidates();
    }, [(location as any).state]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        const sentText = inputValue.trim();
        const newMsg: ChatMessage = {
            id: Date.now().toString(),
            text: sentText,
            sender: 'me',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([...messages, newMsg]);
        setInputValue('');

        // Update list preview
        setConversations(prev => prev.map(c => 
            c.id === selectedId ? { ...c, lastMessage: sentText, time: 'Just now', unread: false } : c
        ));

        // AI Reply Simulation
        setTimeout(() => setIsThinking(true), 1000);
        setTimeout(async () => {
            try {
                let reply = "I appreciate the update! Looking forward to our next steps.";
                
                if (activeChat?.candidateId && !activeChat.candidateId.startsWith('CAN-')) {
                    const { data } = await api.post(`/candidates/${activeChat.candidateId}/generate-linkedin-reply`, {
                        message: sentText
                    });
                    reply = data.reply;
                }

                setIsThinking(false);
                const aiMsg: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    text: reply,
                    sender: 'them',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setMessages(prev => [...prev, aiMsg]);
                setConversations(prev => prev.map(c => 
                    c.id === selectedId ? { ...c, lastMessage: reply, time: 'Just now' } : c
                ));
            } catch (error) {
                console.error("AI Reply failed in Inbox", error);
                setIsThinking(false);
            }
        }, 2500 + Math.random() * 2000);
    };

    const [isOutreaching, setIsOutreaching] = useState(false);
    const handleOutreach = async () => {
        if (!activeChat) return;
        setIsOutreaching(true);
        try {
            await api.post(`/candidates/${activeChat.candidateId}/request-update`);
            alert(`Outreach email sent to ${activeChat.candidateName}! They have been requested to update their profile.`);
        } catch (error) {
            console.error("Outreach failed", error);
            alert("Failed to send outreach. Please check if the candidate has a valid email.");
        } finally {
            setIsOutreaching(false);
        }
    };

    const handleArchive = async () => {
        if (!selectedId) return;
        try {
            const candId = activeChat?.candidateId;
            if (candId && !candId.startsWith('CAN-')) {
                // Fetch full candidate first to avoid overwriting fields if your backend expects full object
                const res = await api.get(`/candidates/${candId}`);
                await api.put(`/candidates/${candId}`, { ...res.data, status: 'Archived' });
            }
            setConversations(prev => prev.filter(c => c.id !== selectedId));
            setSelectedId('');
            alert('Conversation archived successfully!');
        } catch (e) {
            console.error("Archive failed", e);
            alert('Failed to archive conversation.');
        }
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        if (!confirm(`Are you sure you want to delete the record for ${activeChat?.candidateName}?`)) return;
        try {
            const candId = activeChat?.candidateId;
            if (candId && !candId.startsWith('CAN-')) {
                await api.delete(`/candidates/${candId}`);
            }
            setConversations(prev => prev.filter(c => c.id !== selectedId));
            setSelectedId('');
            alert('Candidate record deleted.');
        } catch (e) {
            console.error("Delete failed", e);
            alert('Deletion failed.');
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-xl border border-blue-50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Conversations Sidebar */}
        <div className="w-60 border-r border-blue-50 flex flex-col bg-slate-50/20">
            <div className="p-2.5 border-b border-blue-50 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                    <h2 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">Inbox</h2>
                    <Filter size={11} className="text-slate-400" />
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 w-3 h-3" />
                    <input 
                        type="text" 
                        placeholder="Find chat..." 
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold text-slate-600 focus:bg-white outline-none"
                    />
                </div>
            </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.map(conv => (
                        <div 
                            key={conv.id}
                            onClick={() => setSelectedId(conv.id)}
                            className={`p-3 border-b border-blue-50/30 cursor-pointer transition-all relative ${selectedId === conv.id ? 'bg-white' : 'hover:bg-slate-50'}`}
                        >
                            {selectedId === conv.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600" />}
                            <div className="flex gap-2">
                                <div className="relative shrink-0">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] border border-white">
                                        {conv.candidateName.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    {conv.online && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-[10px] font-black text-slate-800 truncate">{conv.candidateName}</h4>
                                        <span className="text-[7px] font-bold text-slate-300 uppercase shrink-0">{conv.time}</span>
                                    </div>
                                    <p className={`text-[9px] truncate leading-tight ${conv.unread ? 'font-black text-blue-600' : 'text-slate-400'}`}>
                                        {conv.lastMessage}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
                {activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-2 border-b border-blue-50 flex items-center justify-between bg-white z-20">
                            <div className="flex items-center gap-2.5">
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px]">
                                        {activeChat.candidateName.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    {activeChat.online && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full" />}
                                </div>
                                <div className="leading-none">
                                    <h3 className="text-[10px] font-black text-slate-800 leading-none">{activeChat.candidateName}</h3>
                                    <div className="flex items-center gap-1 mt-1 leading-none">
                                        <div className={`w-1 h-1 rounded-full ${activeChat.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                            {activeChat.online ? 'Active' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => navigate(`/candidates/${activeChat.candidateId}`)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-all font-black text-[9px] flex items-center gap-1 uppercase" title="View Profile"><User size={12} /> Profile</button>
                                <button onClick={() => navigate(`/candidates/${activeChat.candidateId}`, { state: { openMeeting: true } })} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-all font-black text-[9px] flex items-center gap-1 uppercase" title="Schedule"><Calendar size={12} /> Schedule</button>
                                <button onClick={handleArchive} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-400 transition-all font-black text-[9px] flex items-center gap-1 uppercase" title="Archive"><Archive size={12} /> Archive</button>
                                <button onClick={handleDelete} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-400 transition-all font-black text-[9px] flex items-center gap-1 uppercase" title="Delete"><X size={12} /> Delete</button>
                                <div className="w-px h-4 bg-slate-100 mx-1" />
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/5">
                            {messages.map((m) => (
                                <div key={m.id} className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-1 duration-300`}>
                                    <div className={`max-w-[80%] p-2.5 rounded-xl text-[11px] font-bold leading-tight ${
                                        m.sender === 'me' 
                                            ? 'bg-blue-600 text-white rounded-tr-none' 
                                            : 'bg-white text-slate-600 border border-blue-50 shadow-sm rounded-tl-none'
                                    }`}>
                                        {m.text}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1 px-1 opacity-40">
                                        <span className="text-[7px] font-black uppercase tracking-widest">{m.timestamp}</span>
                                        {m.sender === 'me' && <CheckCheck size={8} />}
                                    </div>
                                </div>
                            ))}

                            {isThinking && (
                                <div className="flex items-start">
                                    <div className="p-2 bg-white rounded-lg rounded-tl-none shadow-sm flex items-center gap-2 border border-blue-50">
                                        <div className="flex gap-1">
                                            <span className="w-0.5 h-0.5 bg-blue-400 rounded-full animate-bounce" />
                                            <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce delay-150" />
                                            <span className="w-0.5 h-0.5 bg-blue-600 rounded-full animate-bounce delay-300" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-blue-50 relative">
                            <div className="flex items-center gap-2 p-1.5 rounded-xl border border-blue-50 bg-slate-50 focus-within:bg-white focus-within:border-blue-200 transition-all">
                                    <textarea 
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Type message..."
                                    className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 py-1 px-2 resize-none max-h-24 placeholder:text-slate-300"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <div className="flex items-center gap-1 pr-1">
                                    <button onClick={handleSend} disabled={!inputValue.trim()} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${inputValue.trim() ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-400'}`}>
                                        <Send size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <MessageSquare size={28} className="text-blue-300 stroke-[1.5]" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1">Select a Conversation</h3>
                        <p className="text-[11px] font-bold text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                            Click on a candidate from the left panel to view message history and start chatting.
                        </p>
                    </div>
                )}
            </div>

            {/* Candidate Quick Detail Sidebar */}
            {activeChat && (
                <div className="w-56 border-l border-blue-50 flex flex-col bg-white hidden lg:flex">
                    <div className="p-4 flex flex-col items-center text-center border-b border-blue-50">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-base mb-3 border border-blue-50 shadow-sm">
                            {activeChat.candidateName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <h4 className="text-[11px] font-black text-slate-800 leading-tight uppercase">{activeChat.candidateName}</h4>
                        <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1 mb-3">{activeChat.candidateRole}</p>
                        
                        <div className="flex gap-1.5">
                            <div className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all border border-blue-50"><Mail size={12} /></div>
                            <div className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all border border-blue-50"><Phone size={12} /></div>
                        </div>
                    </div>

                    <div className="p-3 space-y-3">
                        <button 
                            onClick={handleOutreach}
                            disabled={isOutreaching}
                            className={`w-full py-2 px-3 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-50`}
                        >
                            {isOutreaching ? 'Sending...' : 'Outreach'}
                        </button>
                        <div className="space-y-1.5">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Snapshot</p>
                            <div className="p-2.5 bg-slate-50 rounded-lg border border-blue-50">
                                <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Exp</p>
                                <p className="text-[10px] font-bold text-slate-700">6.5 Years</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inbox;
