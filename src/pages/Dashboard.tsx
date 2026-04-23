import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  Calendar,
  UserCheck,
  Search,
  Filter,
  MoreVertical,
  Bell,
  ArrowUpRight,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import api from '../api';
import { useNavigate } from 'react-router-dom';

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
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
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
    rescheduledInterviews: 0
  });
  const [trends, setTrends] = useState<any[]>([]);
  const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
  const [jobCount, setJobCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [candStatsRes, trendsRes, jobsRes, recentCandRes] = await Promise.all([
        api.get('/candidates/statistics'),
        api.get('/candidates/trends?days=7'),
        api.get('/jobs?size=100'),
        api.get('/candidates?size=5&sort=createdAt,desc')
      ]);

      // 1. Statistics
      const rawStats = candStatsRes.data || {};
      setStats({
        total: (rawStats.total || 0) as number,
        screening: (rawStats.screening || 0) as number,
        shortlisted: (rawStats.shortlisted || 0) as number,
        interviews: (rawStats.interview || 0) as number,
        offer: (rawStats.offer || 0) as number,
        hired: (rawStats.hired || 0) as number,
        rejected: (rawStats.rejected || 0) as number,
        upcomingInterviews: (rawStats.upcomingInterviews || 0) as number,
        completedInterviews: (rawStats.completedInterviews || 0) as number,
        cancelledInterviews: (rawStats.cancelledInterviews || 0) as number,
        rescheduledInterviews: (rawStats.rescheduledInterviews || 0) as number,
      });

      // 2. Active Jobs
      const jobsData = jobsRes.data?.content || jobsRes.data || [];
      const activeJobsCount = Array.isArray(jobsData) ? jobsData.length : 0;
      setJobCount(activeJobsCount);

      // 2. Trends
      const trendData = Object.entries((trendsRes.data || {}) as Record<string, number>)
        .map(([date, count]) => ({
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: date,
          candidates: count
        }))
        .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-700">

      {/* Premium Header Container - Updated to Blue */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-blue-50 shadow-sm transition-all duration-300">
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
          { label: 'Candidates', value: stats.total, icon: Users, color: 'text-blue-600' },
          { label: 'Active Jobs', value: jobCount, icon: Briefcase, color: 'text-emerald-600' },
          { label: 'Interviews', value: stats.interviews, icon: Clock, color: 'text-indigo-600' },
          { label: 'Hired', value: stats.hired, icon: TrendingUp, color: 'text-rose-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-blue-50 p-3 rounded-xl shadow-sm group hover:border-blue-200 transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${stat.color} flex items-center justify-center bg-slate-50 rounded-lg`}>
                <stat.icon size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">{stat.label}</p>
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
          <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm h-full flex flex-col">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Pipeline</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 flex-1">
              {[
                { label: 'Screening', value: stats.screening, color: 'text-amber-500', dot: 'bg-amber-400', bg: 'bg-amber-50/20' },
                { label: 'Interview', value: stats.interviews, color: 'text-blue-600', dot: 'bg-blue-500', bg: 'bg-blue-50/20' },
                { label: 'Offer', value: stats.offer, color: 'text-purple-600', dot: 'bg-purple-500', bg: 'bg-purple-50/20' },
                { label: 'Hired', value: stats.hired, color: 'text-emerald-600', dot: 'bg-emerald-500', bg: 'bg-emerald-50/20' },
                { label: 'Rejected', value: stats.rejected, color: 'text-red-600', dot: 'bg-red-500', bg: 'bg-red-50/20' }
              ].map((step, i) => (
                <div key={i} className={`${step.bg} p-2 rounded-lg flex flex-col items-center justify-center gap-0.5 border border-transparent hover:bg-white hover:border-blue-100 transition-all`}>
                  <div className="flex items-center gap-1">
                    <div className={`w-1 h-1 rounded-full ${step.dot}`}></div>
                    <span className={`text-[8px] font-black uppercase tracking-tight ${step.color}`}>{step.label}</span>
                  </div>
                  <span className="text-lg font-black text-gray-900 leading-none">{step.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm flex flex-col h-full">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Interviews</h3>
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
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{item.label}</span>
                  </div>
                  <span className="text-base font-black text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECOND ROW: Candidate Trends (8) & Jobs by Department (4) */}
        <div className="lg:col-span-8">
          <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm relative overflow-hidden h-full flex flex-col">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Candidate Trends</h3>
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
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                      dy={10}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
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
                <div className="h-full flex flex-col items-center justify-center text-gray-300 border-b border-gray-100 border-dashed pb-12">
                  <div className="w-full border-t border-gray-100 border-dashed mb-16"></div>
                  <div className="w-full border-t border-gray-100 border-dashed"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm flex flex-col items-center h-full">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest self-start mb-2 px-1">Departments</h3>
            <div className="relative w-24 h-24 flex items-center justify-center mb-2">
              <div className="absolute inset-0 rounded-full border-[0.6rem] border-gray-50"></div>
              <div className="absolute inset-0 rounded-full border-[0.6rem] border-blue-600 border-t-transparent border-r-transparent border-l-transparent rotate-45 opacity-20"></div>
              <div className="text-center z-10">
                <span className="text-xl font-black text-gray-900">{jobCount}</span>
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">Jobs</p>
              </div>
            </div>
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                <span>Engineering</span>
                <span className="text-gray-900">{jobCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Recent Candidate Activity (12) - Extends horizontally */}
        <div className="lg:col-span-12">
          <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm">
            <div className="flex items-center justify-between mb-2 text-gray-900 px-1">
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recent Activity</h3>
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
                    className="flex items-center justify-between group p-1 hover:bg-slate-50/50 rounded-lg transition-all cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600 font-black text-sm border border-slate-100">
                        {cand.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-gray-900 group-hover:text-blue-600 transition-colors truncate leading-tight">{cand.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{cand.role || 'General'}</span>
                          <span className="text-[8px] text-gray-300 truncate max-w-[150px]">{cand.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border
                        ${cand.status === 'Hired' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          cand.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                            cand.status === 'Interview' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {cand.status || 'Screening'}
                      </span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter min-w-[50px] text-right">Just Now</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem]">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-gray-200" />
                  </div>
                  <p className="text-lg font-bold text-gray-400">No recent candidate activity to display</p>
                  <p className="text-sm text-gray-300 mt-2">Activity will appear here as candidates progress through the pipeline.</p>
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
