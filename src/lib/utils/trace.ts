import type { Trace, DownsampledTrace } from '$lib/utils/canvas/shared';
import type { Telemetry } from '$lib/api';

export interface Sample {
	throttle: number;
	brake:    number;
	speed:    number;
	gear:     number;
	rpm:      number;
}

export const EMPTY_TRACE: Trace = {
	gas: [], brake: [], steer: [], normPos: [], worldX: [], worldZ: [], time: [], speed: [], gear: [], rpm: [],
	accLat: [], accLon: [],
};

export function gearLabel(g: number): string {
	if (g <= 0) return 'R';
	if (g === 1) return 'N';
	return String(g - 1);
}

export function sampleAt(trace: Trace, i: number): Sample {
	return {
		throttle: trace.gas[i]   ?? 0,
		brake:    trace.brake[i] ?? 0,
		speed:    trace.speed[i] ?? 0,
		gear:     trace.gear[i]  ?? 0,
		rpm:      Math.round(trace.rpm[i] ?? 0),
	};
}

function truncateAtLapEnd(normPos: number[]): number {
	const n = normPos.length;
	for (let i = 1; i < n; i++) {
		if (normPos[i - 1] > 0.5 && normPos[i] < normPos[i - 1] - 0.5) return i;
	}
	return n;
}

export function trimTrace(t: Trace): Trace {
	const end = truncateAtLapEnd(t.normPos);
	if (end === t.normPos.length) return t;
	return {
		gas:     t.gas.slice(0, end),
		brake:   t.brake.slice(0, end),
		steer:   t.steer.slice(0, end),
		normPos: t.normPos.slice(0, end),
		worldX:  t.worldX.slice(0, end),
		worldZ:  t.worldZ.slice(0, end),
		time:    t.time.slice(0, end),
		speed:   t.speed.slice(0, end),
		gear:    t.gear.slice(0, end),
		rpm:     t.rpm.slice(0, end),
		accLat:  t.accLat.slice(0, end),
		accLon:  t.accLon.slice(0, end),
	};
}

export function makeTrace(d: Telemetry): Trace {
	return trimTrace({
		gas:     d.gas                   ?? [],
		brake:   d.brake                 ?? [],
		steer:   d.steering              ?? [],
		normPos: d.normalizedCarPosition ?? [],
		worldX:  d.worldX                ?? [],
		worldZ:  d.worldZ                ?? [],
		time:    d.time                  ?? [],
		speed:   d.speedKmh              ?? [],
		gear:    d.gear                  ?? [],
		rpm:     d.rpms                  ?? [],
		accLat:  d.accLat                ?? [],
		accLon:  d.accLon                ?? [],
	});
}

export function lapLength(trace: Trace): number {
	const { worldX, worldZ } = trace;
	let length = 0;
	for (let i = 1; i < worldX.length; i++) {
		const dx = worldX[i] - worldX[i - 1];
		const dz = worldZ[i] - worldZ[i - 1];
		if (Math.abs(dx) < 1000 && Math.abs(dz) < 1000) length += Math.hypot(dx, dz);
	}
	return length;
}

/**
 * First index whose time is >= t (`time` must be non-decreasing), or the last
 * index if t is past the end; -1 only for an empty array.
 *
 * `hint` is an optional starting guess — pass last frame's result during
 * playback. The playhead only advances a few samples per frame, so checking a
 * short window ahead of the hint resolves nearly every call in O(1); anything
 * the window misses (seeks, rewinds, big jumps) falls back to binary search
 * on the remaining range.
 */
export function traceIndexAtTime(time: number[], t: number, hint = 0): number {
	const n = time.length;
	if (n === 0) return -1;
	if (time[n - 1] < t) return n - 1;

	let lo = 0, hi = n - 1; // invariant: the answer is within [lo, hi]
	if (hint > 0 && hint < n) {
		if (time[hint - 1] < t) {
			const end = Math.min(n - 1, hint + 8);
			for (let i = hint; i <= end; i++) if (time[i] >= t) return i;
			lo = end + 1;
		} else {
			hi = hint - 1;
		}
	}
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (time[mid] >= t) hi = mid;
		else lo = mid + 1;
	}
	return lo;
}

export function sectorDurations(ds: DownsampledTrace): number[] {
	const n     = ds.time.length;
	const b1    = Math.floor(n / 3);
	const b2    = Math.floor((2 * n) / 3);
	const total = ds.time[n - 1] ?? 0;
	return [ds.time[b1] ?? 0, (ds.time[b2] ?? 0) - (ds.time[b1] ?? 0), total - (ds.time[b2] ?? 0)];
}

export function segmentIndex(norm: number, segments: number): number {
	return Math.min(segments - 1, Math.max(0, Math.floor(norm * segments)));
}

export function segmentDelta(ds: DownsampledTrace, ref: DownsampledTrace, segment: number, segments: number): number {
	const n  = Math.min(ds.time.length, ref.time.length);
	const bs = Math.min(n - 1, Math.floor((segment / segments) * n));
	const be = Math.min(n - 1, Math.floor(((segment + 1) / segments) * n));
	return (ds.time[be] - ref.time[be]) - (ds.time[bs] - ref.time[bs]);
}

export function liveDelta(ds: DownsampledTrace, ref: DownsampledTrace, norm: number): number {
	const n = Math.min(ds.time.length, ref.time.length);
	const b = Math.min(n - 1, Math.max(0, Math.floor(norm * n)));
	return ds.time[b] - ref.time[b];
}
