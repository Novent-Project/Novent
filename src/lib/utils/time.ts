export function parseLapTime(t: string | number): number {
	if (!t) return 0;
	if (typeof t === 'number') return t > 3600 ? t / 1000 : t;
	const s = String(t).trim();
	if (/^\d+$/.test(s)) return parseInt(s, 10) / 1000;
	if (/^\d+\.\d+$/.test(s)) {
		const v = parseFloat(s);
		return v > 3600 ? v / 1000 : v;
	}
	const m = s.match(/^(\d+):(\d+)[.:](\d+)$/);
	if (m) return parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 1000;
	return parseFloat(s) || 0;
}

export function formatTime(s: number): string {
	const c = Math.max(0, s);
	const m = Math.floor(c / 60);
	return `${m}:${(c % 60).toFixed(2).padStart(5, '0')}`;
}

export function formatSector(s: number): string {
	return s > 0 ? formatTime(s) : ':--.--';
}

export function formatDelta(v: number, digits = 3): string {
	return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
}

export function formatDriveTime(ms: number): string {
	const minutes = Math.max(0, Math.floor(ms / 60000));
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M`;
}
