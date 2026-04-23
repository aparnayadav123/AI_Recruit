import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, X, Globe, Mail, Link as LinkIcon, Smartphone, FileUp } from 'lucide-react';
import api from '../api';
import { formatUserDisplayName } from '../utils';

interface SourceStatus {
  name: string;
  connected: boolean;
  status: 'connected' | 'syncing' | 'disconnected';
  icon: React.ElementType;
  color: string;
}

interface ResumeUploadProps {
  searchQuery?: string;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ searchQuery = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<{ name: string, status: 'processing' | 'completed' | 'error', progress: number, error?: string }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<SourceStatus[]>([
    { name: 'ATS System', connected: true, status: 'connected', icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Email Inbox', connected: true, status: 'syncing', icon: Mail, color: 'text-blue-600 bg-blue-50' },
    { name: 'LinkedIn Agent', connected: true, status: 'connected', icon: Globe, color: 'text-blue-600 bg-blue-50' },
  ]);

  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((file: File) => ({
      name: file.name,
      file,
      status: 'processing' as const,
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);

    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr) : null;
    const uploaderName = formatUserDisplayName(userObj);

    newFiles.forEach((fileObj) => {
      const formData = new FormData();
      formData.append('file', fileObj.file);
      formData.append('source', 'Local System');
      formData.append('assignedBy', uploaderName);

      api.post('/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000, // 2 minute timeout
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));

          // When upload reaches 100%, show "parsing" status
          if (percent >= 100) {
            setFiles(prev => prev.map(f =>
              f.name === fileObj.name ? { ...f, status: 'processing', progress: 100 } : f
            ));
          } else {
            setFiles(prev => prev.map(f =>
              f.name === fileObj.name ? { ...f, progress: percent } : f
            ));
          }
        }
      })
        .then(response => {
          console.log("Upload success:", response.data);
          const candidateName = response.data.name;
          setFiles(prev => prev.map(f =>
            f.name === fileObj.name ? { ...f, name: candidateName || f.name, status: 'completed', progress: 100 } : f
          ));

          // Auto-remove completed files after 3 seconds
          setTimeout(() => {
            setFiles(prev => prev.filter(f => f.name !== fileObj.name));
          }, 3000);
        })
        .catch(err => {
          console.error("Upload failed:", err);
          // Handle both object with message property and raw string response
          const errorResponse = err.response?.data;
          const errorMsg = (typeof errorResponse === 'string' ? errorResponse : errorResponse?.message) || err.message || 'Upload failed';
          console.error("Error details:", errorMsg);
          setFiles(prev => prev.map(f =>
            f.name === fileObj.name ? { ...f, status: 'error', error: errorMsg } : f
          ));
        });
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleSelectFilesClick = () => {
    fileInputRef.current?.click();
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    );
  };

  const filteredFiles = files.filter(file => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return file.name.toLowerCase().includes(query);
  });

  const filteredSources = sources.filter(source => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return source.name.toLowerCase().includes(query);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-50 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100/50">
            <UploadCloud size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5 leading-none">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Ingestion Engine</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">Upload Resumes</h2>
            <p className="text-[10px] text-gray-500 font-medium leading-none mt-1">Automatic parsing, skill extraction, and candidate matching.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-4">
          <div
            className={`relative group border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${isDragging
              ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
              : 'border-blue-50 bg-white hover:border-blue-300 hover:bg-slate-50/50 hover:shadow-sm'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="relative z-10 p-4 bg-white rounded-xl shadow-sm border border-blue-50 mb-4 group-hover:scale-110 transition-transform duration-300">
              <UploadCloud className="w-8 h-8 text-blue-600 relative z-10" />
            </div>

            <h3 className="text-base font-black text-slate-900 mb-1">Drag & drop resumes here</h3>
            <p className="text-[10px] text-slate-500 mb-6 max-w-md mx-auto font-medium">
              Our AI engine supports <span className="font-black text-slate-700">PDF, DOCX, TXT</span> formats up to 10MB per file.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs relative z-10">
              <button
                onClick={handleSelectFilesClick}
                className="w-full bg-slate-900 text-white px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <FileUp className="w-4 h-4" />
                Browse Files
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Processing Queue */}
          <div className="bg-white border border-blue-50 rounded-xl shadow-sm overflow-hidden min-h-[300px]">
            <div className="px-5 py-3 border-b border-blue-50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Loader2 className={`w-3 h-3 ${files.some(f => f.status === 'processing') ? 'animate-spin text-blue-500' : 'text-slate-400'}`} />
                Processing Queue
              </h3>
              <span className="text-[9px] font-black bg-white border border-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {filteredFiles.length}
              </span>
            </div>

            <ul className="divide-y divide-blue-50">
              {files.length === 0 ? (
                <li className="px-8 py-12 text-center flex flex-col items-center justify-center text-slate-400">
                  <FileText className="w-10 h-10 mb-3 text-slate-100" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">No files in queue</p>
                </li>
              ) : filteredFiles.length === 0 && searchQuery ? (
                <li className="px-8 py-8 text-center text-slate-500 font-bold text-xs uppercase tracking-widest">No matches</li>
              ) : (
                filteredFiles.map((file, idx) => (
                  <li key={idx} className="px-5 py-3 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg border border-blue-50 shadow-sm transition-all">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-none mb-1">{highlightText(file.name)}</p>
                        <div className="flex items-center gap-2 leading-none">
                          {file.status === 'processing' && (
                            <span className="text-[9px] font-black text-blue-600 flex items-center gap-1.5 leading-none">
                              Analyzing... {file.progress}%
                            </span>
                          )}
                          {file.status === 'completed' && (
                            <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1.5 leading-none">
                              <CheckCircle className="w-2.5 h-2.5" />
                              Synced
                            </span>
                          )}
                          {file.status === 'error' && (
                            <span className="text-[9px] font-black text-rose-500 flex items-center gap-1.5 leading-none" title={file.error}>
                              <AlertCircle className="w-2.5 h-2.5" />
                              {file.error || 'Error'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {file.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : file.status === 'error' ? (
                        <X className="w-4 h-4 text-rose-500" />
                      ) : (
                        <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-blue-50 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <LinkIcon className="w-3 h-3 text-slate-400" />
              Integrations
            </h3>
            <div className="space-y-2">
              {filteredSources.length === 0 && searchQuery ? (
                <div className="text-center text-slate-400 text-[10px] py-4 font-black uppercase tracking-widest leading-none">No matches</div>
              ) : (
                filteredSources.map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-blue-50/50 hover:border-blue-200 hover:bg-white hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${source.color} border border-white`}>
                        <source.icon size={14} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-700 uppercase leading-none block">{highlightText(source.name)}</span>
                        <div className="flex items-center gap-1.5 mt-1 leading-none">
                          <div className={`w-1 h-1 rounded-full ${source.status === 'connected' ? 'bg-emerald-500' :
                            source.status === 'syncing' ? 'bg-blue-500 animate-pulse' :
                              'bg-slate-300'
                            }`} />
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            {source.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {source.connected ? (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to disconnect ${source.name}?`)) {
                            setSources(prev => prev.map((s, i) =>
                              i === index
                                ? { ...s, connected: false, status: 'disconnected' }
                                : s
                            ));
                          }
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (source.name === 'LinkedIn Agent') {
                            navigate('/linkedin-agent');
                          } else {
                            alert(`Connecting to ${source.name}...`);
                            setSources(prev => prev.map((s, i) =>
                              i === index
                                ? { ...s, connected: true, status: source.name === 'Email Inbox' ? 'syncing' : 'connected' }
                                : s
                            ));
                          }
                        }}
                        className="px-2.5 py-1.5 bg-white border border-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-lg hover:border-blue-300 transition-colors shadow-sm"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                )
                  )
              )}
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900 p-5 rounded-xl text-white shadow-sm">
            <div className="relative z-10">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest mb-2 leading-none">Mobile Sync</h4>
              <p className="text-slate-400 text-[10px] leading-relaxed mb-4 font-bold opacity-90">
                Sync resumes directly from mobile or email. AI handles the rest.
              </p>
              <button className="w-full py-2 bg-white text-slate-900 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition active:scale-95">
                Download App
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;