import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Global search state — keyword, recent searches (localStorage backed),
 * and the most recent click target so individual pages can highlight a row
 * after navigation.
 *
 * Wrap the root tree in <SearchProvider>; consume with useSearch().
 */

export type SearchResultType = 'candidate' | 'job' | 'skill' | 'interview';

export interface GlobalSearchHit {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  matched?: string;
  navigateTo: string;
  parentId?: string;
}

export interface GlobalSearchResponse {
  query: string;
  totalResults: number;
  candidates: GlobalSearchHit[];
  jobs: GlobalSearchHit[];
  skills: GlobalSearchHit[];
  interviews: GlobalSearchHit[];
}

interface SelectedResult {
  type: SearchResultType;
  id: string;          // e.g., "CAN-..." for candidate, "JOB-..." for job
  parentId?: string;   // candidate id when the hit was a skill/interview row
  keyword: string;     // the search term that led here
}

interface SearchContextValue {
  keyword: string;
  setKeyword: (v: string) => void;
  recent: string[];
  pushRecent: (term: string) => void;
  clearRecent: () => void;
  selected: SelectedResult | null;
  setSelected: (r: SelectedResult | null) => void;
  /**
   * The term that should be highlighted on every page until the user clears or
   * picks a different result. Survives navigation and tab refreshes
   * (localStorage-backed). Separate from {@code keyword} (the live typed query)
   * so that typing in the search bar doesn't constantly re-highlight the page.
   */
  highlightKeyword: string;
  setHighlightKeyword: (v: string) => void;
  clearHighlightKeyword: () => void;
}

const RECENT_KEY = 'recruitai.recentSearches';
const RECENT_LIMIT = 5;
const HIGHLIGHT_KEY = 'recruitai.activeHighlight';

const SearchContext = createContext<SearchContextValue | null>(null);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<SelectedResult | null>(null);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw).slice(0, RECENT_LIMIT) : [];
    } catch {
      return [];
    }
  });
  // Persisted highlight keyword — read from localStorage so it survives a hard
  // refresh in the middle of a long search/explore session.
  const [highlightKeyword, setHighlightKeywordState] = useState<string>(() => {
    try { return localStorage.getItem(HIGHLIGHT_KEY) || ''; } catch { return ''; }
  });

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
      /* localStorage may be unavailable in some browsers — silently ignore */
    }
  }, [recent]);

  useEffect(() => {
    try {
      if (highlightKeyword) localStorage.setItem(HIGHLIGHT_KEY, highlightKeyword);
      else localStorage.removeItem(HIGHLIGHT_KEY);
    } catch { /* ignore */ }
  }, [highlightKeyword]);

  const pushRecent = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecent(prev => {
      const filtered = prev.filter(x => x.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, RECENT_LIMIT);
    });
  }, []);

  const clearRecent = useCallback(() => setRecent([]), []);

  const setHighlightKeyword = useCallback((v: string) => {
    setHighlightKeywordState(v.trim());
  }, []);
  const clearHighlightKeyword = useCallback(() => setHighlightKeywordState(''), []);

  const value = useMemo<SearchContextValue>(() => ({
    keyword, setKeyword, recent, pushRecent, clearRecent, selected, setSelected,
    highlightKeyword, setHighlightKeyword, clearHighlightKeyword,
  }), [keyword, recent, selected, pushRecent, clearRecent, highlightKeyword, setHighlightKeyword, clearHighlightKeyword]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

export const useSearch = (): SearchContextValue => {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used inside <SearchProvider>');
  return ctx;
};
