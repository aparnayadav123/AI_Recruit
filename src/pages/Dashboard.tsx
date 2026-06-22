import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  Calendar,
  UserCheck,
  ArrowUpRight,
  LayoutDashboard
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { formatRecentActivityTime } from '../utils';
import { useSearchHighlight } from '../hooks/useSearchHighlight';
import { useSearch } from '../contexts/SearchContext';
import { INTERVIEW_ROUNDS } from '../constants/interviewRounds';

interface DashboardStats {
  total: number;
  screening: number;
  shortlisted: number;
  interviews: number;
  offer: number;
  hired: number;
  rejected: number;
  upcomingInterviews: number;
  completedInterviews: number;
  cancelledInterviews: number;
  rescheduledInterviews: number;
  // Interview-round bucket counts, keyed by the shared INTERVIEW_ROUNDS ids and
  // sourced from `candidate.interviewRound` — the same field the Interview
  // Pipeline page uses — so the two views can never disagree.
  roundCounts: Record<string, number>;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { highlightKeyword } = useSearch();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    screening: 0,
    shortlisted: 0,
    interviews: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
    upcomingInterviews: 0,
    completedInterviews: 0,
    cancelledInterviews: 0,
    rescheduledInterviews: 0,
    roundCounts: {}
  });
  const [trends, setTrends] = useState<any[]>([]);
  const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
  const [jobCount, setJobCount] = useState(0);
  // Pie-chart slices grouped by role keyword (Developer / Tester / Admin / HR
  // / Cloud / Designer / Manager / Analyst / Data / Intern / Other). Color is
  // fixed per role so the legend and the donut stay in sync.
  const [roleDistribution, setRoleDistribution] = useState<Array<{ role: string; count: number; color: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [candStatsRes, interviewStatsRes, trendsRes, jobsRes, recentCandRes, allCandRes] = await Promise.all([
        api.get('/candidates/statistics'),
        api.get('/interviews/statistics').catch(() => ({ data: {} })),
        // Fetch 14 days so the current ISO week (Mon-Sun) is always fully
        // covered regardless of which day-of-week "today" happens to be.
        api.get('/candidates/trends-by-source?days=14'),
        api.get('/jobs?size=100'),
        api.get('/candidates?size=5&sort=createdAt,desc'),
        // Full candidate list, used only to compute interviewRound bucket counts
        // that mirror the dedicated Interview Pipeline page exactly.
        api.get('/candidates?size=500')
      ]);

      // Round buckets — same logic as InterviewPipeline.getCandidatesByRound,
      // keyed by the shared INTERVIEW_ROUNDS ids (unknown/empty -> first stage).
      const allCandidates: any[] = Array.isArray(allCandRes.data)
        ? allCandRes.data
        : (allCandRes.data?.content || []);
      // Count only candidates explicitly placed in a round — unassigned ones
      // are not force-bucketed (so the stages start at 0 and fill as candidates
      // are moved through the pipeline).
      const roundCounts: Record<string, number> = {};
      INTERVIEW_ROUNDS.forEach(r => { roundCounts[r.id] = 0; });
      for (const c of allCandidates) {
        if (c.interviewRound && roundCounts[c.interviewRound] !== undefined) {
          roundCounts[c.interviewRound] += 1;
        }
      }

      // 1. Statistics — candidate counts come from /candidates/statistics,
      //    interview counts come from /interviews/statistics (separate endpoint)
      const rawStats = candStatsRes.data || {};
      const interviewStats: Record<string, number> = interviewStatsRes.data || {};
      setStats({
        total: (rawStats.total || 0) as number,
        screening: (rawStats.screening || 0) as number,
        shortlisted: (rawStats.shortlisted || 0) as number,
        interviews: (rawStats.interview || 0) as number,
        offer: (rawStats.offer || 0) as number,
        hired: (rawStats.hired || 0) as number,
        rejected: (rawStats.rejected || 0) as number,
        upcomingInterviews:    Number(interviewStats.upcoming    ?? 0),
        completedInterviews:   Number(interviewStats.completed   ?? 0),
        cancelledInterviews:   Number(interviewStats.cancelled   ?? 0),
        rescheduledInterviews: Number(interviewStats.rescheduled ?? 0),
        roundCounts,
      });

      // 2. Active Jobs
      const jobsData = jobsRes.data?.content || jobsRes.data || [];
      const activeJobsCount = Array.isArray(jobsData)
        ? jobsData.filter((j: any) => ['open', 'active'].includes(String(j.status || '').toLowerCase())).length
        : 0;
      setJobCount(activeJobsCount);

      // 2a. Group jobs by role keyword from the title — replaces the old
      // static "Engineering / 100" placeholder. Keywords scanned in priority
      // order so "Senior Cloud Engineer" lands in Cloud, not Developer.
      const ROLE_BUCKETS: Array<{ role: string; color: string; keywords: string[] }> = [
        { role: 'Cloud',     color: '#06b6d4', keywords: ['cloud', 'devops', 'sre', 'aws', 'azure', 'gcp', 'kubernetes'] },
        { role: 'Data',      color: '#a855f7', keywords: ['data', 'scientist', 'analytics', 'ml ', 'machine learning', 'ai engineer'] },
        { role: 'Tester',    color: '#f59e0b', keywords: ['test', 'qa ', 'quality', 'sdet'] },
        { role: 'HR',        color: '#ec4899', keywords: ['hr ', 'human resource', 'recruit', 'talent', 'people ops'] },
        { role: 'Admin',     color: '#64748b', keywords: ['admin', 'administrator', 'sysadmin', 'support'] },
        { role: 'Designer',  color: '#f43f5e', keywords: ['design', 'ui/ux', 'ux', 'product design'] },
        { role: 'Manager',   color: '#0ea5e9', keywords: ['manager', 'lead', 'head of', 'director'] },
        { role: 'Analyst',   color: '#eab308', keywords: ['analyst'] },
        { role: 'Intern',    color: '#94a3b8', keywords: ['intern'] },
        { role: 'Developer', color: '#2563eb', keywords: ['developer', 'engineer', 'programmer', 'software', 'frontend', 'backend', 'fullstack', 'full stack', 'mobile'] },
      ];
      const counts: Record<string, number> = {};
      const colorByRole: Record<string, string> = {};
      ROLE_BUCKETS.forEach(b => { colorByRole[b.role] = b.color; });
      const OTHER_COLOR = '#cbd5e1';
      for (const job of (Array.isArray(jobsData) ? jobsData : [])) {
        const title = ((job as any)?.title || '').toString().toLowerCase() + ' ';
        const hit = ROLE_BUCKETS.find(b => b.keywords.some(k => title.includes(k)));
        const bucket = hit ? hit.role : 'Other';
        if (hit) colorByRole[bucket] = hit.color;
        counts[bucket] = (counts[bucket] || 0) + 1;
      }
      const distribution = Object.entries(counts)
        .map(([role, count]) => ({ role, count, color: colorByRole[role] || OTHER_COLOR }))
        .sort((a, b) => b.count - a.count);
      setRoleDistribution(distribution);

      // 2. Trends — render the current ISO week in fixed Mon→Sun order.
      // Future days (e.g. if today is Wed, then Thu-Sun) appear with zero
      // counts. Past dates are looked up by ISO string in the 14-day window.
      type TrendRow = {
        total?: number;
        Browser?: number;
        'Career Page'?: number;
        OryFolks?: number;
        Email?: number;
        LinkedIn?: number;
      };
      const trendsByDate = (trendsRes.data || {}) as Record<string, TrendRow>;

      // ISO-week Monday for today (Sunday is day 0 in JS — we want it to be 6).
      const today = new Date();
      const jsDay = today.getDay(); // 0 = Sun … 6 = Sat
      const daysSinceMonday = (jsDay + 6) % 7;
      const monday = new Date(today);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(today.getDate() - daysSinceMonday);

      const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const pad = (n: number) => String(n).padStart(2, '0');
      const trendData = weekLabels.map((label, idx) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + idx);
        const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const row = trendsByDate[iso] || {};
        return {
          name: label,
          fullDate: iso,
          candidates: Number(row.total ?? 0),
          Browser:        Number(row.Browser ?? 0),
          'Career Page':  Number(row['Career Page'] ?? 0),
          OryFolks:       Number(row.OryFolks ?? 0),
          Email:          Number(row.Email ?? 0),
          LinkedIn:       Number(row.LinkedIn ?? 0),
        };
      });

      setTrends(trendData);

      // 3. Recent Candidates
      const recentData = Array.isArray(recentCandRes.data) ? recentCandRes.data : (recentCandRes.data?.content || []);
      setRecentCandidates(recentData);

    } catch (error) {
      console.error("Dashboard Fetch Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Highlight the global search term in any text that ends up on the dashboard.
  useSearchHighlight(highlightKeyword, [recentCandidates, stats, roleDistribution]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-700">

      {/* Premium Header Container - Updated to Blue */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-300 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-100/50">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5 leading-none">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Analytics</span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">Welcome back, Manager</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate('/jobs')} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95 flex items-center gap-1.5">
            Create Job <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: 'Candidates', value: stats.total, icon: Users, color: 'text-blue-600', to: '/candidates' },
          { label: 'Active Jobs', value: jobCount, icon: Briefcase, color: 'text-emerald-600', to: '/jobs' },
          { label: 'Interviews', value: stats.interviews, icon: Clock, color: 'text-indigo-600', to: '/interview-pipeline' },
          { label: 'Hired', value: stats.hired, icon: TrendingUp, color: 'text-rose-600', to: '/candidates?status=Hired' }
        ].map((stat, i) => (
          <div
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => navigate(stat.to)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(stat.to); }}
            className="bg-white border border-slate-300 p-3 rounded-xl shadow-sm group hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${stat.color} flex items-center justify-center bg-slate-50 rounded-lg`}>
                <stat.icon size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest leading-none mb-0.5">{stat.label}</p>
                <h3 className="text-lg font-black text-gray-900 leading-none">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Multi-layer structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 px-1">

        {/* TOP ROW: Pipeline (8) & Overall Interview (4) */}
        <div className="lg:col-span-8">
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm h-full flex flex-col">
            <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Interview Pipeline</h3>
            {/* Buckets mirror the dedicated /interview-pipeline page exactly so
                the dashboard never disagrees with it. Click any card to jump
                straight to that round. */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/interview-pipeline')}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/interview-pipeline'); }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5 flex-1 cursor-pointer"
            >
              {INTERVIEW_ROUNDS.map((step) => (
                <div key={step.id} className={`${step.dashBg} p-2 rounded-lg flex flex-col items-center justify-center gap-0.5 border border-transparent hover:bg-white hover:border-blue-100 transition-all`}>
                  <div className="flex items-center gap-1">
                    <div className={`w-1 h-1 rounded-full ${step.dashDot}`}></div>
                    <span className={`text-[10px] font-black uppercase tracking-tight ${step.dashText}`}>{step.shortLabel}</span>
                  </div>
                  <span className="text-lg font-black text-gray-900 leading-none">{stats.roundCounts[step.id] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col h-full">
            <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Interviews</h3>
            <div className="space-y-1 flex-1">
              {[
                { label: 'Upcoming', value: stats.upcomingInterviews, color: 'text-blue-600', bg: 'bg-blue-50', icon: Calendar },
                { label: 'Completed', value: stats.completedInterviews, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: UserCheck },
                { label: 'Cancelled', value: stats.cancelledInterviews, color: 'text-red-500', bg: 'bg-red-50', icon: Calendar },
                { label: 'Rescheduled', value: stats.rescheduledInterviews, color: 'text-amber-500', bg: 'bg-amber-50', icon: Calendar }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-lg transition-all">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 ${item.bg} ${item.color} rounded`}>
                      <item.icon className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{item.label}</span>
                  </div>
                  <span className="text-base font-black text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECOND ROW: Candidate Trends (8) & Jobs by Department (4) */}
        <div className="lg:col-span-8">
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm relative overflow-hidden h-full flex flex-col">
            <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Candidate Trends</h3>
            <div className="h-[140px] w-full flex-1">
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }}
                      dy={10}
                      // interval={0} forces every label to render — the default
                      // "preserveEnd" was hiding the leftmost day (Friday in a
                      // 7-day window) when it didn't fit cleanly.
                      interval={0}
                      padding={{ left: 12, right: 12 }}
                    />
                    <Tooltip
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                      content={({ active, payload }) => {
                        // Custom tooltip — recharts' default only shows the
                        // dataKey we plotted ("candidates"). The full per-row
                        // payload from setTrends() also carries Browser / Career
                        // Page / OryFolks / Email / LinkedIn, so we render them
                        // explicitly with a row each.
                        if (!active || !payload || !payload.length) return null;
                        const row: any = payload[0]?.payload || {};
                        const sources = [
                          { label: 'Browser',     color: '#2563eb' },
                          { label: 'Career Page', color: '#10b981' },
                          { label: 'OryFolks',    color: '#a855f7' },
                          { label: 'Email',       color: '#f59e0b' },
                          { label: 'LinkedIn',    color: '#0a66c2' },
                        ];
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[180px]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-black text-slate-800">{row.name}</span>
                              <span className="text-[9px] font-bold text-slate-500">{row.fullDate}</span>
                            </div>
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                              Total Candidates: <span className="text-slate-900">{row.candidates ?? 0}</span>
                            </div>
                            <div className="border-t border-slate-100 pt-2 space-y-1">
                              {sources.map(s => (
                                <div key={s.label} className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                                    {s.label}
                                  </span>
                                  <span className="text-slate-900 font-black">{row[s.label] ?? 0}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="candidates"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCandidates)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 border-b border-slate-300 border-dashed pb-12">
                  <div className="w-full border-t border-slate-300 border-dashed mb-16"></div>
                  <div className="w-full border-t border-slate-300 border-dashed"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col h-full">
            <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Jobs by Role</h3>
            {/* Real donut sliced by role keyword instead of the old static
                Engineering placeholder. Total count rendered in the center. */}
            <div className="relative flex items-center justify-center" style={{ height: 140 }}>
              {roleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} jobs`, name]}
                      contentStyle={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}
                    />
                    <Pie
                      data={roleDistribution}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={2}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {roleDistribution.map((slice, i) => (
                        <Cell key={i} fill={slice.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-[10px] font-bold text-gray-400">No jobs</div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-gray-900 leading-none">{jobCount}</span>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-0.5">Jobs</p>
              </div>
            </div>
            {/* Legend — clickable to filter Jobs page by role */}
            <div className="w-full space-y-1 mt-3 overflow-y-auto max-h-[180px] pr-1">
              {roleDistribution.length > 0 ? roleDistribution.map(slice => (
                <div
                  key={slice.role}
                  onClick={() => navigate(`/jobs?role=${encodeURIComponent(slice.role)}`)}
                  className="flex items-center justify-between text-[10px] font-bold text-gray-700 bg-slate-50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    {slice.role}
                  </span>
                  <span className="text-gray-900 font-black">{slice.count}</span>
                </div>
              )) : (
                <div className="text-[10px] font-bold text-gray-400 text-center py-2">No roles to show</div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Recent Candidate Activity (12) - Extends horizontally */}
        <div className="lg:col-span-12">
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
            <div className="flex items-center justify-between mb-2 text-gray-900 px-1">
              <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Recent Activity</h3>
              <button
                onClick={() => navigate('/candidates')}
                className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black hover:bg-blue-100 transition-all uppercase tracking-widest border border-blue-100"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              {recentCandidates.length > 0 ? (
                recentCandidates.map((cand, i) => (
                  <div
                    key={i}
                    onClick={() => navigate(`/candidates/${cand.id}`)}
                    className="flex items-center justify-between group p-1 hover:bg-slate-50/50 rounded-lg transition-all cursor-pointer border-b border-slate-300 last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600 font-black text-sm border border-slate-300">
                        {(cand.name || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-gray-900 group-hover:text-blue-600 transition-colors truncate leading-tight">{cand.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-gray-600 uppercase">{cand.role || 'General'}</span>
                          <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{cand.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border
                        ${cand.status === 'Hired' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          cand.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                            cand.status === 'Interview' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {cand.status || 'Screening'}
                      </span>
                      <span
                        className="text-[10px] font-bold text-gray-600 tracking-tight min-w-[80px] text-right whitespace-nowrap"
                        title={cand.createdAt ? new Date(cand.createdAt).toString() : ''}
                      >
                        {formatRecentActivityTime(cand.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-slate-300 rounded-[3rem]">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-gray-200" />
                  </div>
                  <p className="text-lg font-bold text-gray-600">No recent candidate activity to display</p>
                  <p className="text-sm text-gray-400 mt-2">Activity will appear here as candidates progress through the pipeline.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
