// ── Small, dull helpers the inbox reads with ────────────────────────────────────────────────────
// Kept out of the components so the panes stay about layout, and so the day grouping (the part a
// person notices immediately when it is wrong) can be reasoned about on its own.

export const initialOf = (name: string | null | undefined): string =>
  (name ?? '?').trim().charAt(0).toUpperCase() || '?';

export const timeOfDay = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/** "Today" / "Yesterday" / "Aug 19, 2026" — the same ladder the Mac inbox uses. */
export const dayLabel = (iso: string | null | undefined): string => {
  if (!iso) return 'Undated';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Undated';

  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(date)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const dayKey = (iso: string | null | undefined): string => {
  if (!iso) return 'undated';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'undated' : date.toISOString().slice(0, 10);
};

/**
 * Group rows into day buckets, newest day first, newest row first inside a day — which is how a
 * person scans an inbox, and the opposite of how a conversation reads.
 */
export const groupByDay = <T,>(rows: T[], stampOf: (row: T) => string | null | undefined) => {
  const buckets = new Map<string, { label: string; rows: T[] }>();
  for (const row of rows) {
    const key = dayKey(stampOf(row));
    if (!buckets.has(key)) buckets.set(key, { label: dayLabel(stampOf(row)), rows: [] });
    buckets.get(key)?.rows.push(row);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      rows: [...bucket.rows].sort((a, b) =>
        String(stampOf(b) ?? '').localeCompare(String(stampOf(a) ?? '')),
      ),
    }));
};

export const channelLabel = (channel: string | null | undefined): string => {
  switch ((channel ?? '').toUpperCase()) {
    case 'LINKEDIN':
      return 'LinkedIn';
    case 'WHATSAPP':
      return 'WhatsApp';
    default:
      return channel ?? '';
  }
};

/**
 * A file arrives here as the literal words "[attachment — not shared]", because the file itself
 * stays on the Mac that owns the account. That is a note about the conversation, not something a
 * person typed, so nothing may render it as their words. Both dashes are accepted: the mirror
 * writes an em dash and a keyboard produces a hyphen.
 */
export const isAttachmentPlaceholder = (body: string | null | undefined): boolean =>
  /^\[\s*attachment\s*[—–-]\s*not shared\s*\]$/i.test((body ?? '').trim());

/** One line of preview, collapsed onto a single row. */
export const previewOf = (body: string | null | undefined, max = 90): string => {
  if (isAttachmentPlaceholder(body)) return 'Attachment';
  const text = (body ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
