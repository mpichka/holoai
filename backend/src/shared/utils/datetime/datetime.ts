import { DateTime } from 'luxon';

const toEpochSeconds = (n: number): number | null => {
    if (!Number.isFinite(n)) return null;
    // Values above 1e11 are treated as milliseconds, otherwise seconds
    return Math.floor(Math.abs(n) > 1e11 ? n / 1000 : n);
};

export const toScopeEpoch = (value: unknown, isEnd: boolean): number | null => {
    if (typeof value === 'number') return toEpochSeconds(value);
    if (typeof value !== 'string') return null;

    const raw = value.trim();
    if (!raw) return null;

    // Numeric epoch passed as a string (10+ digits, so "20240101" stays a date)
    if (/^\d{10,}$/.test(raw)) return toEpochSeconds(Number(raw));

    // Date-only: expand to start/end of the local day
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const day = DateTime.fromFormat(raw, 'yyyy-MM-dd');
        if (!day.isValid) return null;
        return Math.floor((isEnd ? day.endOf('day') : day.startOf('day')).toSeconds());
    }

    const parsed = DateTime.fromISO(raw);
    if (parsed.isValid) return Math.floor(parsed.toSeconds());

    const fallback = DateTime.fromSQL(raw);
    return fallback.isValid ? Math.floor(fallback.toSeconds()) : null;
};

export const formatDuration = (seconds: number): string => {
    const totalMinutes = Math.ceil(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

export const toLocalTime = (seconds: number): string =>
    DateTime.fromSeconds(seconds, { zone: 'Europe/Kyiv' }).toFormat('yyyy-MM-dd HH:mm');

export const nowEpoch = (): number => Math.floor(Date.now() / 1000);
