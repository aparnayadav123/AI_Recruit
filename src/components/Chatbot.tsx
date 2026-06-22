import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, X, Sparkles, MessageCircle } from 'lucide-react';
import api from '../api';

// ============================================================================
// Recruit AI Assistant â€” purely additive, talks to existing /api endpoints.
// No external AI dependency, no calls to other components, no side effects on
// the rest of the app. Recruiter-facing helper for common CRM queries.
// ============================================================================

type Role = 'user' | 'bot';

interface CandidatePreview {
  id: string;
  name: string;
  email: string;
  role?: string;
  status?: string;
  fitScore?: number;
}

interface JobPreview {
  id: string;
  title: string;
  department?: string;
  status?: string;
}

interface BotAction { label: string; to: string; }

interface ChatMessage {
  id: number;
  role: Role;
  text?: string;
  candidates?: CandidatePreview[];
  jobs?: JobPreview[];
  stats?: Record<string, number>;
  actions?: BotAction[];
}

const greeting = (): ChatMessage => ({
  id: Date.now(),
  role: 'bot',
  text:
    "Hi! I'm your Recruit AI assistant. I can help you find candidates, look up jobs, " +
    "and pull stats â€” try one of the chips below, or ask in your own words.",
});

const QUICK_CHIPS = [
  'Recent candidates',
  'Top candidates',
  'Open jobs',
  'Pipeline stats',
];

const fmtScore = (s?: number) => (s == null ? 'â€”' : `${s}%`);

const Chatbot: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([greeting()]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Allow other components (e.g. the Help modal's "Live Support" button) to
  // open the chatbot programmatically â€” `window.dispatchEvent(new Event('open-chatbot'))`.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-chatbot', handler);
    return () => window.removeEventListener('open-chatbot', handler);
  }, []);

  const push = (msg: Omit<ChatMessage, 'id'>) =>
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }]);

  const handleSend = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    push({ role: 'user', text });
    setBusy(true);
    try {
      await respond(text);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      push({ role: 'bot', text: 'Sorry â€” I ran into an error fetching that. Try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  // ----- intent dispatch ---------------------------------------------------

  const respond = async (raw: string) => {
    const q = raw.toLowerCase().trim();

    if (/^(help|what can you do|commands?|\?)$/.test(q)) {
      push({
        role: 'bot',
        text:
          "Here's what I can do:\n" +
          "â€¢ \"recent candidates\" â€” last 5 applications\n" +
          "â€¢ \"top candidates\" â€” highest fit scores\n" +
          "â€¢ \"open jobs\" â€” current job openings\n" +
          "â€¢ \"pipeline stats\" â€” counts by status\n" +
          "â€¢ \"find Aparna\" â€” search by name or email\n" +
          "â€¢ \"interviews\" â€” upcoming interviews",
      });
      return;
    }

    if (/(recent|latest|new) candidates?|who(?:'s| is) new/.test(q)) return await showRecentCandidates();
    if (/(top|best|highest) (fit|score|candidates?|matches?)/.test(q) || /^top$/.test(q)) return await showTopCandidates();
    if (/(open jobs?|active jobs?|all jobs?|list jobs?|jobs$)/.test(q)) return await showJobs();
    if (/(stats|statistics|pipeline|summary|how many|counts?)/.test(q)) return await showStats();
    if (/(interview|upcoming)/.test(q)) return await showInterviews();

    const findMatch = q.match(/^(?:find|search|look up|show)\s+(.+)$/);
    if (findMatch) return await searchCandidates(findMatch[1]);

    // Last-resort: if it's a single word, treat as a candidate search
    if (/^[a-z0-9._@-]{2,}$/i.test(raw.trim())) return await searchCandidates(raw.trim());

    push({
      role: 'bot',
      text:
        "I didn't catch that. Try \"recent candidates\", \"top candidates\", \"open jobs\", " +
        "\"pipeline stats\", or \"find <name>\". Type \"help\" for the full list.",
    });
  };

  // ----- intent handlers ---------------------------------------------------

  const showRecentCandidates = async () => {
    const r = await api.get('/candidates?size=5&sort=createdAt,desc');
    const list = Array.isArray(r.data) ? r.data : (r.data?.content ?? []);
    if (!list.length) return push({ role: 'bot', text: "No candidates yet." });
    push({
      role: 'bot',
      text: `Here are the ${list.length} most recent candidate(s):`,
      candidates: list.map((c: any) => ({
        id: c.id, name: c.name, email: c.email,
        role: c.role, status: c.status, fitScore: c.fitScore,
      })),
      actions: [{ label: 'View all candidates', to: '/candidates' }],
    });
  };

  const showTopCandidates = async () => {
    // We don't have a server-side "top by fit score" endpoint, so fetch a page
    // and sort client-side. Fine for typical recruiter scale.
    const r = await api.get('/candidates?size=50');
    const list = Array.isArray(r.data) ? r.data : (r.data?.content ?? []);
    const top = [...list]
      .sort((a: any, b: any) => (b.fitScore ?? 0) - (a.fitScore ?? 0))
      .slice(0, 5);
    if (!top.length) return push({ role: 'bot', text: "No candidates to rank." });
    push({
      role: 'bot',
      text: 'Top 5 candidates by ATS fit score:',
      candidates: top.map((c: any) => ({
        id: c.id, name: c.name, email: c.email,
        role: c.role, status: c.status, fitScore: c.fitScore,
      })),
      actions: [{ label: 'Open candidates page', to: '/candidates' }],
    });
  };

  const showJobs = async () => {
    const r = await api.get('/jobs?size=20');
    const list = r.data?.content ?? [];
    const open = list.filter((j: any) =>
      ['Open', 'Active'].includes(j.status));
    if (!open.length) return push({ role: 'bot', text: "No open jobs right now." });
    push({
      role: 'bot',
      text: `${open.length} job${open.length === 1 ? '' : 's'} currently open:`,
      jobs: open.slice(0, 8).map((j: any) => ({
        id: j.id, title: j.title, department: j.department, status: j.status,
      })),
      actions: [{ label: 'Open jobs page', to: '/jobs' }],
    });
  };

  const showStats = async () => {
    const r = await api.get('/candidates/statistics');
    const s = r.data ?? {};
    push({
      role: 'bot',
      text: 'Current candidate pipeline:',
      stats: {
        Total:       Number(s.total ?? 0),
        Screening:   Number(s.screening ?? 0),
        Shortlisted: Number(s.shortlisted ?? 0),
        Interview:   Number(s.interview ?? 0),
        Offer:       Number(s.offer ?? 0),
        Hired:       Number(s.hired ?? 0),
        Rejected:    Number(s.rejected ?? 0),
      },
      actions: [{ label: 'Go to dashboard', to: '/dashboard' }],
    });
  };

  const showInterviews = async () => {
    try {
      const r = await api.get('/candidates/statistics');
      const upcoming = Number(r.data?.upcomingInterviews ?? 0);
      push({
        role: 'bot',
        text: upcoming > 0
          ? `You have ${upcoming} upcoming interview${upcoming === 1 ? '' : 's'} in the pipeline.`
          : 'No interviews are currently scheduled.',
        actions: [{ label: 'Interview Pipeline', to: '/interview-pipeline' }],
      });
    } catch {
      push({ role: 'bot', text: 'Could not load interview data.' });
    }
  };

  const searchCandidates = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const r = await api.get(`/candidates/search?search=${encodeURIComponent(trimmed)}&size=10`);
    const list = r.data?.content ?? [];
    if (!list.length) {
      push({ role: 'bot', text: `No candidates matched "${trimmed}".` });
      return;
    }
    push({
      role: 'bot',
      text: `${list.length} match${list.length === 1 ? '' : 'es'} for "${trimmed}":`,
      candidates: list.slice(0, 6).map((c: any) => ({
        id: c.id, name: c.name, email: c.email,
        role: c.role, status: c.status, fitScore: c.fitScore,
      })),
    });
  };

  // ----- render ------------------------------------------------------------

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Recruit AI Assistant"
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-xl shadow-blue-200 transition-all active:scale-95 group"
      >
        <Bot size={20} />
        <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">Ask AI</span>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-white animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl border border-slate-300 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-300 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black tracking-tight leading-tight">Recruit AI Assistant</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">Online</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-slate-300 bg-slate-50/60">
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => handleSend(chip)}
            disabled={busy}
            className="px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-white border border-blue-100 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-40"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-white">
        {messages.map(m => (
          <MessageBubble key={m.id} msg={m} onAction={(to) => { setOpen(false); navigate(to); }} onCandidateClick={(id) => { setOpen(false); navigate(`/candidates/${id}`); }} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '120ms' }} />
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-300 bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type 'help' or ask anything..."
          disabled={busy}
          className="flex-1 px-3 py-2 text-[11px] font-bold text-gray-700 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-blue-300 transition-colors placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

const MessageBubble: React.FC<{
  msg: ChatMessage;
  onAction: (to: string) => void;
  onCandidateClick: (id: string) => void;
}> = ({ msg, onAction, onCandidateClick }) => {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] px-3 py-2 bg-blue-600 text-white rounded-2xl rounded-br-md text-[11px] font-bold whitespace-pre-wrap">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
        <MessageCircle size={13} />
      </div>
      <div className="flex-1 max-w-[85%] space-y-1.5">
        {msg.text && (
          <div className="px-3 py-2 bg-slate-50 text-gray-700 rounded-2xl rounded-bl-md text-[11px] font-bold whitespace-pre-wrap border border-slate-300">
            {msg.text}
          </div>
        )}

        {msg.candidates && msg.candidates.length > 0 && (
          <div className="space-y-1">
            {msg.candidates.map(c => (
              <button
                key={c.id}
                onClick={() => onCandidateClick(c.id)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-white border border-slate-300 rounded-lg hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-[11px] shrink-0">
                    {c.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-gray-900 truncate">{c.name}</div>
                    <div className="text-[10px] font-medium text-gray-600 truncate">{c.role || c.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.status && (
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider">
                      {c.status}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-black tabular-nums">
                    {fmtScore(c.fitScore)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {msg.jobs && msg.jobs.length > 0 && (
          <div className="space-y-1">
            {msg.jobs.map(j => (
              <button
                key={j.id}
                onClick={() => onAction(`/jobs`)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-white border border-slate-300 rounded-lg hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-gray-900 truncate">{j.title}</div>
                  <div className="text-[10px] font-medium text-gray-600 truncate">{j.department || 'â€”'}</div>
                </div>
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                  {j.status || 'Open'}
                </span>
              </button>
            ))}
          </div>
        )}

        {msg.stats && (
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(msg.stats).map(([label, value]) => (
              <div
                key={label}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
              >
                <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{label}</div>
                <div className="text-base font-black text-gray-900 tabular-nums mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        )}

        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {msg.actions.map((a, i) => (
              <button
                key={i}
                onClick={() => onAction(a.to)}
                className="px-2.5 py-1 text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 rounded-full hover:bg-blue-100 transition-colors uppercase tracking-wider"
              >
                {a.label} â†’
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chatbot;
