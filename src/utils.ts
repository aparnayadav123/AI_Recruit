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
export const formatRecentActivityTime = (
  createdAt: string | Date | null | undefined
): string => {
  if (!createdAt) return '—';

  const uploadTime = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (isNaN(uploadTime.getTime())) return '—';

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
export const formatRelativeTime = (input?: string | Date | null): string => {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.round(diffMin / 60);
  // Yesterday check based on calendar date, not just hours, so 23h ago at 2am
  // still reads "Yesterday" instead of "23 hours ago".
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (sameDay) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (isYesterday) return 'Yesterday';
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

/**
 * Bucket a notification by createdAt into "Today", "Yesterday", or "Older".
 */
export const notificationDayBucket = (input?: string | Date | null): 'Today' | 'Yesterday' | 'Older' => {
  if (!input) return 'Older';
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return 'Older';
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Older';
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
