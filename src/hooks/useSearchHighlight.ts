import { useEffect } from 'react';

const HIGHLIGHT_CLASS = 'search-highlight';
const SCROLL_TARGET_CLASS = 'search-highlight-first';

/**
 * Walks the page DOM and wraps every occurrence of {@code keyword} in a
 * <mark class="search-highlight"> tag, then scrolls the first match into view.
 *
 * Use this from any page reachable from the global search dropdown so the
 * searched term lights up at the destination.
 *
 * @param keyword            term to find (case-insensitive). Pass null/'' to clear.
 * @param waitForDeps        re-run the highlight whenever these dependencies change
 *                            (typically the loaded list/details so we don't run
 *                            before the page has rendered).
 * @param options.rootSelector  optional CSS selector to scope the walk
 *                            (default: 'main' if present, else document.body).
 */
export function useSearchHighlight(
  keyword: string | null | undefined,
  waitForDeps: unknown[] = [],
  options: { rootSelector?: string } = {}
) {
  useEffect(() => {
    // Always start from a clean slate so previous searches don't linger.
    clearHighlights();
    const term = (keyword || '').trim();
    if (term.length < 2) return;

    // Wait one frame so async-loaded content (candidates, jobs, etc.) is in the
    // DOM before we walk it. A 250ms grace period is enough for the typical
    // fetch+render path the dashboard uses.
    const timer = window.setTimeout(() => {
      const root = (options.rootSelector
        ? document.querySelector(options.rootSelector)
        : document.querySelector('main')) as HTMLElement | null;
      applyHighlights(root || document.body, term);
    }, 250);

    return () => {
      window.clearTimeout(timer);
      clearHighlights();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, ...waitForDeps]);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyHighlights(root: HTMLElement, term: string) {
  const re = new RegExp(escapeRegex(term), 'gi');

  // Skip text living inside form controls, code blocks, scripts, styles, and —
  // critically — anything already inside a highlight (so re-running the hook
  // doesn't compound wrappers).
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'IFRAME', 'SVG', 'PATH', 'MARK']);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue;
      if (!text || !text.trim()) return NodeFilter.FILTER_REJECT;
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('.' + HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
      re.lastIndex = 0;
      return re.test(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  // Collect first, then mutate — mutating during traversal invalidates the walker.
  const targets: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    targets.push(current as Text);
  }

  let firstMark: HTMLElement | null = null;
  for (const textNode of targets) {
    const value = textNode.nodeValue || '';
    const frag = document.createDocumentFragment();
    let cursor = 0;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(value)) !== null) {
      if (m.index > cursor) {
        frag.appendChild(document.createTextNode(value.slice(cursor, m.index)));
      }
      const mark = document.createElement('mark');
      mark.className = HIGHLIGHT_CLASS;
      mark.textContent = m[0];
      if (!firstMark) {
        mark.classList.add(SCROLL_TARGET_CLASS);
        firstMark = mark;
      }
      frag.appendChild(mark);
      cursor = m.index + m[0].length;
      // Guard against zero-length match infinite loop (shouldn't happen given
      // we check term.length >= 2, but cheap to be safe).
      if (m[0].length === 0) re.lastIndex++;
    }
    if (cursor < value.length) {
      frag.appendChild(document.createTextNode(value.slice(cursor)));
    }
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  if (firstMark) {
    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function clearHighlights() {
  document.querySelectorAll('mark.' + HIGHLIGHT_CLASS).forEach(el => {
    const parent = el.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(el.textContent || ''), el);
    parent.normalize();
  });
}
