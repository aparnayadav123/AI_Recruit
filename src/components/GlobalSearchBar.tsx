import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, Users, Briefcase, Award, Calendar, ChevronRight } from 'lucide-react';
import api from '../api';
import {
  GlobalSearchHit,
  GlobalSearchResponse,
  SearchResultType,
  useSearch,
} from '../contexts/SearchContext';

const DEBOUNCE_MS = 300;
const PER_CATEGORY = 5;

const ICONS: Record<SearchResultType, React.ReactNode> = {
  candidate: <Users size={15} />,
  job:       <Briefcase size={15} />,
  skill:     <Award size={15} />,
  interview: <Calendar size={15} />,
};

// Per-category chip colour for the result-row icon badge.
const CHIP: Record<SearchResultType, string> = {
  candidate: 'bg-blue-50 text-blue-600',
  job:       'bg-violet-50 text-violet-600',
  skill:     'bg-amber-50 text-amber-600',
  interview: 'bg-emerald-50 text-emerald-600',
};

const SECTION_LABEL: Record<SearchResultType, string> = {
  candidate: 'Candidates',
  job:       'Jobs',
  skill:     'Skills Matrix',
  interview: 'Interviews',
};

/**
 * Global search bar with live, debounced dropdown. Replaces the inline
 * candidate-only Enter-to-search input that previously lived in Layout.
 */
const GlobalSearchBar: React.FC = () => {
  const navigate = useNavigate();
  const { setKeyword, recent, pushRecent, clearRecent, setSelected,
          highlightKeyword, setHighlightKeyword, clearHighlightKeyword } = useSearch();
  const [value, setValue] = useState('');
  const [results, setResults] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch
  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await api.get<GlobalSearchResponse>('/global-search', {
          params: { q: trimmed, limit: PER_CATEGORY },
        });
        setResults(res.data);
      } catch (err) {
        console.error('Global search failed:', err);
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [value]);

  // Click outside closes the dropdown
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Flatten the result categories into a single navigable list (for keyboard nav)
  const flatHits: GlobalSearchHit[] = results
    ? [...results.candidates, ...results.jobs, ...results.skills, ...results.interviews]
    : [];

  const handleSelect = (hit: GlobalSearchHit) => {
    const term = value.trim();
    pushRecent(term);
    setKeyword(term);
    // Persist the keyword globally so every page (not just the destination)
    // highlights the matching text until the user clears or starts a new search.
    setHighlightKeyword(term);
    setSelected({
      type: hit.type,
      id: hit.parentId || hit.id,
      parentId: hit.parentId,
      keyword: term,
    });
    setOpen(false);
    // location.state still carries highlightId for legacy scroll/glow logic.
    navigate(hit.navigateTo, {
      state: { highlightId: hit.parentId || hit.id, keyword: term },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(flatHits.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && flatHits[focusedIndex]) {
        handleSelect(flatHits[focusedIndex]);
      } else if (flatHits[0]) {
        handleSelect(flatHits[0]);
      } else if (value.trim()) {
        // No results — still record the search and dismiss
        pushRecent(value.trim());
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const useRecent = (term: string) => {
    setValue(term);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const clearInput = () => {
    setValue('');
    setResults(null);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const sections: { key: SearchResultType; items: GlobalSearchHit[] }[] = results
    ? ([
        { key: 'candidate' as SearchResultType, items: results.candidates },
        { key: 'job' as SearchResultType,       items: results.jobs },
        { key: 'skill' as SearchResultType,     items: results.skills },
        { key: 'interview' as SearchResultType, items: results.interviews },
      ]).filter(s => s.items.length > 0)
    : [];

  let hitIdx = 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        className="flex items-center gap-2.5 h-10 bg-slate-50 rounded-xl pl-3.5 pr-2 w-[24rem] max-w-[44vw] border border-slate-200 cursor-text shadow-sm hover:border-slate-300 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 focus-within:bg-white transition-all"
      >
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search candidates, jobs, skills…"
          className="bg-transparent border-none outline-none text-[13px] w-full text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
          value={value}
          onChange={e => { setValue(e.target.value); setOpen(true); setFocusedIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {value ? (
          <button onClick={clearInput} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors shrink-0" title="Clear">
            <X size={14} />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-semibold text-slate-400 shrink-0">/</kbd>
        )}
      </div>

      {/* Sticky pill — visible whenever a highlight keyword is active globally.
          Clicking the × clears the highlight everywhere. */}
      {highlightKeyword && (
        <button
          onClick={clearHighlightKeyword}
          title="Clear active highlight"
          className="absolute left-0 top-full mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-colors"
        >
          <span>Highlighting: {highlightKeyword}</span>
          <X size={10} />
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[460px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl shadow-slate-300/40 border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-[64vh] overflow-y-auto">
            {/* Empty state — recent searches */}
            {!value && (
              <div className="p-3">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Recent searches</span>
                  {recent.length > 0 && (
                    <button onClick={clearRecent} className="text-[11px] font-semibold text-blue-600 hover:underline">Clear</button>
                  )}
                </div>
                {recent.length === 0 ? (
                  <div className="px-2 py-8 text-center">
                    <Search className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <div className="text-[13px] font-medium text-slate-500">Start typing to search</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">candidates · jobs · skills · interviews</div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {recent.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => useRecent(term)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <Clock size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{term}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loading */}
            {value && loading && (
              <div className="px-4 py-8 flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                <span className="ml-2">Searching…</span>
              </div>
            )}

            {/* No results */}
            {value && !loading && results && results.totalResults === 0 && (
              <div className="px-4 py-10 text-center">
                <div className="text-[14px] font-semibold text-slate-700">No matches for “{value}”</div>
                <div className="text-[12px] text-slate-400 mt-1">Try a different name, role, or skill</div>
              </div>
            )}

            {/* Results */}
            {value && !loading && results && results.totalResults > 0 && (
              <div className="py-2">
                {sections.map(section => (
                  <div key={section.key} className="px-2 pb-1">
                    <div className="px-2 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      <span>{SECTION_LABEL[section.key]}</span>
                      <span className="text-slate-300 font-normal normal-case">· {section.items.length}</span>
                    </div>
                    <div className="space-y-0.5">
                      {section.items.map(hit => {
                        const myIdx = hitIdx++;
                        const isFocused = myIdx === focusedIndex;
                        return (
                          <button
                            key={`${hit.type}-${hit.id}`}
                            onMouseEnter={() => setFocusedIndex(myIdx)}
                            onClick={() => handleSelect(hit)}
                            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left ${
                              isFocused ? 'bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${CHIP[hit.type]}`}>
                              {ICONS[hit.type]}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-semibold text-slate-800 truncate">
                                <HighlightMatch text={hit.title} term={value} />
                              </div>
                              {hit.subtitle && (
                                <div className="text-[12px] text-slate-500 truncate">
                                  <HighlightMatch text={hit.subtitle} term={value} />
                                </div>
                              )}
                            </div>
                            {hit.matched && hit.matched !== hit.title && (
                              <span className="hidden md:block text-[11px] text-slate-400 truncate max-w-[130px] shrink-0">{hit.matched}</span>
                            )}
                            <ChevronRight size={15} className={`shrink-0 ${isFocused ? 'text-blue-500' : 'text-slate-300'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer — keyboard hints */}
          {(!!value || recent.length > 0) && (
            <div className="flex items-center gap-3 px-3.5 py-2 border-t border-slate-100 bg-slate-50/70 text-[10px] font-medium text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-white text-slate-500">↑</kbd>
                <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-white text-slate-500">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-white text-slate-500">↵</kbd>
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-white text-slate-500">esc</kbd>
                close
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Render text with the matching term underlined/bolded. */
const HighlightMatch: React.FC<{ text: string; term: string }> = ({ text, term }) => {
  if (!term) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase()
          ? <mark key={i} className="bg-yellow-100 text-yellow-900 px-0.5 rounded-sm font-black">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
};

export default GlobalSearchBar;
