import React, { useEffect, useState } from 'react';
import api from '../api';

type Job = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  description?: string;
  employmentType?: string;
};

const CareersPublic: React.FC = () => {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/jobs/public')
      .then((res) => {
        if (!mounted) return;
        setJobs(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load public jobs', err);
        if (mounted) setError(err.message || 'Failed to load');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-6">Loading careers...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Careers</h1>
      {jobs && jobs.length > 0 ? (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{job.title}</h2>
                  <div className="text-sm text-slate-600">{job.company || 'OryFolks'}</div>
                </div>
                <div className="text-sm text-slate-500">{job.location}</div>
              </div>
              {job.description && <p className="mt-2 text-sm text-slate-700">{job.description}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <div>No open public jobs at the moment.</div>
      )}
    </div>
  );
};

export default CareersPublic;
