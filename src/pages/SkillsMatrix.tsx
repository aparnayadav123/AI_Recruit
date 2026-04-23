import React, { useState, useEffect } from 'react';
import { Download, Sliders, X, Award, Cpu } from 'lucide-react';
import api from '../api';

const SkillsMatrix: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [skillMatrices, setSkillMatrices] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-50 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100/50">
            <Award size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5 leading-none">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Competency Analysis</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">Skills Matrix</h2>
            <p className="text-[10px] text-gray-500 font-medium leading-none mt-1">Dynamic proficiency analysis based on resume content.</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-blue-50 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-blue-50">
              <tr>
                <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Extracted Proficiency Matrix</th>
                <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Core Strength</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {isLoading && candidates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">Detecting skills...</td>
                </tr>
              ) : (
                candidates.map((candidate) => {
                  const matrix = skillMatrices[candidate.id];
                  const metrics = matrix?.skillMetrics || [];
                  const topMetric = metrics.length > 0 ? metrics[0] : null;

                  return (
                    <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900 text-[11px] uppercase truncate">{candidate.name}</div>
                        <div className="text-[9px] font-bold text-blue-500 uppercase tracking-wide mt-0.5">{candidate.role || 'Candidate'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {metrics.length > 0 ? (
                            metrics.slice(0, 8).map((m: any, idx: number) => (
                              <div
                                key={idx}
                                className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase flex items-center gap-1 transition-all
                                  ${m.percentage >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    m.percentage >= 50 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    'bg-slate-50 text-slate-400 border-slate-100'
                                  }`}
                              >
                                <span>{m.skill}</span>
                                <span className="opacity-40">{m.percentage}%</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-300 italic text-[9px] font-bold">Analysis pending...</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {topMetric ? (
                            <>
                              <div className="text-lg font-black text-slate-900 leading-none">{topMetric.percentage}%</div>
                              <div>
                                <div className="text-[7px] text-slate-300 uppercase font-black tracking-widest leading-none mb-1">Top Skill</div>
                                <div className="font-black text-slate-700 text-[9px] uppercase leading-none">{topMetric.skill}</div>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-200 text-[9px] font-black uppercase">N/A</span>
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
