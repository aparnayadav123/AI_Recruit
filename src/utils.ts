import { format, isToday, isYesterday } from 'date-fns';

/**
 * Format a candidate's submission timestamp for the Recent Activity feed.
 * Always shows the *exact* clock time — never vague phrases like "Just now".
 *   today      → "12:01 PM"
 *   yesterday  → "Yesterday 04:20 PM"
 *   older      → "12 May 2026, 03:15 PM"
 *
 * Falls back to "—" if the input is missing or unparseable, so the UI never
 * shows "Invalid Date" or "NaN".
 */
/**
 * Helper to reliably parse server timestamps.
 * Handles Date objects, timestamps, array representations, and ISO strings.
 * If the string is an ISO date-time without timezone offset/Z, it is treated as UTC
 * (since backend and cloud servers store and emit UTC timestamps).
 */
export const parseServerDate = (input?: any): Date | null => {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  if (typeof input === 'number') {
    const d = new Date(input < 1e11 ? input * 1000 : input);
    return isNaN(d.getTime()) ? null : d;
  }

  if (Array.isArray(input) && input.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = input;
    const ms = Math.floor(nano / 1e6);
    const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'object' && input.year && input.monthValue) {
    const d = new Date(Date.UTC(
      input.year,
      input.monthValue - 1,
      input.dayOfMonth || 1,
      input.hour || 0,
      input.minute || 0,
      input.second || 0,
      input.nano ? Math.floor(input.nano / 1e6) : 0
    ));
    return isNaN(d.getTime()) ? null : d;
  }

  let str = String(input).trim();
  if (!str) return null;

  // If ISO string without timezone indicator (no Z, no +/- offset), append 'Z' for UTC
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str) && !/[Zz]|[+-]\d{2}(:?\d{2})?$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }

  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
};

export const formatRecentActivityTime = (
  createdAt: string | Date | null | undefined
): string => {
  const uploadTime = parseServerDate(createdAt);
  if (!uploadTime) return '—';

  if (isToday(uploadTime))     return format(uploadTime, 'hh:mm a');
  if (isYesterday(uploadTime)) return `Yesterday ${format(uploadTime, 'hh:mm a')}`;

  return format(uploadTime, 'dd MMM yyyy, hh:mm a');
};

/**
 * Display the candidate's stable sequence number as `CAN0001`, `CAN0042`,
 * `CAN1234`, etc. The numeric part comes from MongoDB's monotonic
 * `sequence_id`; deletions never reclaim a slot, so a candidate's ID is fixed
 * for life once assigned.
 */
/**
 * Compact relative-time string used by the notification center.
 *   < 1 min      → "Just now"
 *   < 60 min     → "5 min ago"
 *   today        → "2 hours ago"
 *   yesterday    → "Yesterday"
 *   < 7 days     → "3 days ago"
 *   older        → "12 May"
 */
export const formatRelativeTime = (input?: any): string => {
  const date = parseServerDate(input);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  // If created recently (or slight clock skew between client and server)
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);

  // Yesterday check based on calendar date, not just hours
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (sameDay) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (isYesterday) return 'Yesterday';
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

/**
 * Bucket a notification by createdAt into "Today", "Yesterday", or "Older".
 */
export const notificationDayBucket = (input?: any): 'Today' | 'Yesterday' | 'Older' => {
  const date = parseServerDate(input);
  if (!date) return 'Older';

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Older';
};

/** A real hotlist name — not blank and not boolean-coerced junk ("true"/"false"). */
export const isRealHotlistName = (h?: string | null): boolean => {
  const t = (h || '').trim().toLowerCase();
  return t !== '' && t !== 'true' && t !== 'false';
};

/**
 * The full set of hotlists a candidate belongs to (FR-204). Merges the multi-value
 * `hotlists` list with the legacy single `hotlist` field, de-duped case-insensitively
 * and filtered to real names, so a candidate can be shown in many hotlists at once.
 */
export const getCandidateHotlists = (
  c?: { hotlists?: string[] | null; hotlist?: string | null } | null
): string[] => {
  if (!c) return [];
  const seen = new Map<string, string>();
  (c.hotlists || []).forEach(h => {
    if (isRealHotlistName(h)) seen.set(h.trim().toLowerCase(), h.trim());
  });
  if (isRealHotlistName(c.hotlist)) {
    const t = (c.hotlist as string).trim();
    seen.set(t.toLowerCase(), t);
  }
  return Array.from(seen.values());
};

export const formatCandidateId = (sequenceId?: number | null): string => {
  const n = typeof sequenceId === 'number' && sequenceId > 0 ? sequenceId : 1;
  return `CAN${String(n).padStart(3, '0')}`;
};

export const formatUserDisplayName = (user: { name?: string; email?: string } | null): string => {
  if (!user) return 'Aparna Boligerla';
  
  if (user.name && user.name !== 'System' && user.name !== 'Shaik Yashu' && user.name !== 'Manager') {
    return user.name;
  }
  
  if (user.email) {
    const email = user.email.toLowerCase();
    const part = email.split('@')[0];
    
    if (part === 'aparnaboligerla') return 'Aparna Boligerla';
    
    // Format "firstname.lastname" or "firstname_lastname" to "Firstname Lastname"
    return part.split(/[._]/)
      .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }
  
  return 'Aparna Boligerla';
};
