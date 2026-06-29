export interface Trace {
	gas:     number[];
	brake:   number[];
	steer:   number[];
	normPos: number[];
	worldX:  number[];
	worldZ:  number[];
	time:    number[];
}

export interface DownsampledTrace {
	gas:   number[];
	brake: number[];
	steer: number[];
	time:  number[];
}

export interface ChartWindow {
	windowSize: number;
	step:       number;
}

export const TRACE_RESOLUTION = 2000;

export const LAP_COLORS = ['#ffffff', '#f59e0b', '#3b82f6'] as const;

export function distBucket(normPos: number, n: number): number {
	let b = Math.floor((normPos >= 0 && normPos <= 1 ? normPos : 0) * n);
	if (b < 0) b = 0;
	else if (b >= n) b = n - 1;
	return b;
}

function fillGaps(arr: number[], cnt: number[]): void {
	const N = arr.length;
	let first = 0;
	while (first < N && cnt[first] === 0) first++;
	if (first === N) return;
	for (let b = 0; b < first; b++) arr[b] = arr[first];
	let last = arr[first];
	for (let b = first + 1; b < N; b++) {
		if (cnt[b] > 0) last = arr[b];
		else arr[b] = last;
	}
}

export function downsample(src: Trace, _lapTimeSec: number): DownsampledTrace | null {
	const n = src.gas.length;
	if (!n) return null;

	let end = n;
	for (let i = 1; i < n; i++) {
		if (src.normPos[i - 1] > 0.5 && src.normPos[i] < src.normPos[i - 1] - 0.5) {
			end = i;
			break;
		}
	}

	const N     = TRACE_RESOLUTION;
	const gas   = new Array<number>(N).fill(0);
	const brake = new Array<number>(N).fill(0);
	const steer = new Array<number>(N).fill(0);
	const time  = new Array<number>(N).fill(0);
	const cnt   = new Array<number>(N).fill(0);

	for (let i = 0; i < end; i++) {
		const b = distBucket(src.normPos[i], N);
		if (src.gas[i]   > gas[b])   gas[b]   = src.gas[i];
		if (src.brake[i] > brake[b]) brake[b] = src.brake[i];
		steer[b] += src.steer[i];
		const t = src.time[i];
		if (cnt[b] === 0 || t < time[b]) time[b] = t;
		cnt[b]++;
	}

	for (let b = 0; b < N; b++) if (cnt[b] > 0) steer[b] /= cnt[b];

	fillGaps(gas, cnt);
	fillGaps(brake, cnt);
	fillGaps(steer, cnt);
	fillGaps(time, cnt);
	for (let b = 1; b < N; b++) if (time[b] < time[b - 1]) time[b] = time[b - 1];

	return { gas, brake, steer, time };
}

export function chartWindowFor(_ds: DownsampledTrace, _lapTimeSec: number): ChartWindow {
	const windowSize = Math.max(40, Math.round(TRACE_RESOLUTION * 0.08));
	return { windowSize, step: 1 };
}

export function setupCanvas(canvas: HTMLCanvasElement): {
	ctx: CanvasRenderingContext2D;
	w: number;
	h: number;
	dpr: number;
} {
	const dpr = window.devicePixelRatio || 1;
	const w   = canvas.offsetWidth;
	const h   = canvas.offsetHeight;
	if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
		canvas.width  = w * dpr;
		canvas.height = h * dpr;
	}
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, w, h);
	return { ctx, w, h, dpr };
}

export function buildSlots(windowSize: number): number[] {
	const slots: number[] = [];
	for (let o = -windowSize; o <= windowSize; o++) slots.push(o);
	return slots;
}

export function compIndexAt(
	comp: { trace: Trace; ds: DownsampledTrace },
	primaryTime: number
): number {
	const rawIdx = comp.trace.time.findIndex(pt => pt >= primaryTime);
	const raw    = rawIdx === -1 ? comp.trace.time.length - 1 : rawIdx;
	return Math.round(Math.max(0, raw) * (comp.ds.gas.length / comp.trace.gas.length));
}
