import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Award } from 'lucide-react';
import api from '../api';
import { useSearchHighlight } from '../hooks/useSearchHighlight';
import { useSearch } from '../contexts/SearchContext';

const SkillsMatrix: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const highlightCandidateId = searchParams.get('highlight');
  void location;
  const { highlightKeyword } = useSearch();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [skillMatrices, setSkillMatrices] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scroll the matched candidate's row into view + highlight the keyword.
  useEffect(() => {
    if (!highlightCandidateId || candidates.length === 0) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`skills-row-${highlightCandidateId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => window.clearTimeout(t);
  }, [highlightCandidateId, candidates.length]);
  useSearchHighlight(highlightKeyword, [candidates.length, isLoading]);

  const fetchData = async () => {
    setError(null);
    try {
      const candidatesRes = await api.get('/candidates');
      const candidatesData = candidatesRes.data.content || [];
      setCandidates(candidatesData);

      // Fetch skill matrix for each candidate
      const matrices: { [key: string]: any } = {};
      await Promise.all(candidatesData.map(async (c: any) => {
        try {
          const res = await api.get(`/skill-matrix/candidate/${c.id}`);
          if (res.data && res.data.length > 0) {
            matrices[c.id] = res.data[0]; // Get the latest matrix
          }
        } catch (e) {
          console.error(`Failed to load matrix for ${c.name}`, e);
        }
      }));
      setSkillMatrices(matrices);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load skills matrix.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-300 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100/50">
            <Award size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5 leading-none">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Competency Analysis</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">Skills Matrix</h2>
            <p className="text-[10px] text-gray-600 font-medium leading-none mt-1">Dynamic proficiency analysis based on resume content.</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-300 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 border-b-2 border-slate-300">
              <tr>
                <th className="px-4 py-3 text-[9px] font-black text-slate-600 uppercase tracking-widest border-r border-slate-300 w-1/4">Candidate</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-600 uppercase tracking-widest border-r border-slate-300">Extracted Proficiency Matrix</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-600 uppercase tracking-widest w-56">Core Strength</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && candidates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">Detecting skills...</td>
                </tr>
              ) : !isLoading && error && candidates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-3">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => {
                  const matrix = skillMatrices[candidate.id];
                  const metrics = matrix?.skillMetrics || [];
                  const topMetric = metrics.length > 0 ? metrics[0] : null;

                  return (
                    <tr key={candidate.id} id={`skills-row-${candidate.id}`} className={`hover:bg-slate-50 transition-colors border-b border-slate-300 last:border-b-0 ${highlightCandidateId === candidate.id ? 'bg-blue-50 ring-2 ring-blue-500/40 ring-inset' : ''}`}>
                      <td className="px-4 py-3.5 border-r border-slate-300 align-top">
                        <div className="font-black text-slate-900 text-[11px] uppercase truncate">{candidate.name}</div>
                        <div className="text-[9px] font-bold text-blue-500 uppercase tracking-wide mt-0.5">{candidate.role || 'Candidate'}</div>
                      </td>
                      <td className="px-4 py-3.5 border-r border-slate-300 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {metrics.length > 0 ? (
                            metrics.slice(0, 8).map((m: any, idx: number) => (
                              <div
                                key={idx}
                                className={`px-1.5 py-0.5 rounded border text-[10px] font-black uppercase flex items-center gap-1 transition-all
                                  ${m.percentage >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    m.percentage >= 50 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-slate-50 text-slate-600 border-slate-300'
                                  }`}
                              >
                                <span>{m.skill}</span>
                                <span className="opacity-50">{m.percentage}%</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[9px] font-bold">Analysis pending...</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center gap-3">
                          {topMetric ? (
                            <>
                              <div className="text-lg font-black text-slate-900 leading-none">{topMetric.percentage}%</div>
                              <div>
                                <div className="text-[10px] text-slate-600 uppercase font-black tracking-widest leading-none mb-1">Top Skill</div>
                                <div className="font-black text-slate-700 text-[9px] uppercase leading-none">{topMetric.skill}</div>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[9px] font-black uppercase">N/A</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SkillsMatrix;
