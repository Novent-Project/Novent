export interface ChartRange {
	min: number;
	max: number;
	baseline?: number;
}

export interface ChartLine {
	line: string;
	area: string;
}

const EMPTY_LINE: ChartLine = { line: '', area: '' };

type Pt = { x: number; y: number };

function polylinePath(pts: Pt[]): string {
	let d = '';
	pts.forEach((p, i) => { d += `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)} `; });
	return d.trim();
}

function smoothPath(pts: Pt[]): string {
	const n = pts.length;
	if (n < 3) return polylinePath(pts);

	let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)} `;
	for (let i = 0; i < n - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[i + 2] ?? p2;

		const c1x = p1.x + (p2.x - p0.x) / 6;
		const c1y = p1.y + (p2.y - p0.y) / 6;
		const c2x = p2.x - (p3.x - p1.x) / 6;
		const c2y = p2.y - (p3.y - p1.y) / 6;

		d += `C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)} `;
	}
	return d.trim();
}

export function buildChartLine(
	time: number[],
	value: number[],
	lapTime: number,
	width: number,
	height: number,
	range: ChartRange,
	smooth = true
): ChartLine {
	const n = Math.min(time.length, value.length);
	if (n < 2 || lapTime <= 0 || width <= 0 || height <= 0) return EMPTY_LINE;

	const span   = Math.max(range.max - range.min, 1e-6);
	const toX    = (t: number) => Math.min(width, Math.max(0, (t / lapTime) * width));
	const pad    = Math.min(6, height * 0.1);
	const toY    = (v: number) => {
		const clamped = Math.min(range.max, Math.max(range.min, v));
		return pad + (height - 2 * pad) * (1 - (clamped - range.min) / span);
	};

	const stride = Math.max(1, Math.floor(n / Math.max(width, 1)));
	const pts: Pt[] = [];
	for (let i = 0; i < n; i += stride) pts.push({ x: toX(time[i]), y: toY(value[i]) });

	const last = n - 1;
	if (last % stride !== 0) pts.push({ x: toX(time[last]), y: toY(value[last]) });

	const line = smooth ? smoothPath(pts) : polylinePath(pts);

	let area = '';
	if (range.baseline !== undefined && pts.length > 0) {
		const baseY  = toY(range.baseline);
		const first  = pts[0];
		const lastPt = pts[pts.length - 1];
		area = `${line} L ${lastPt.x.toFixed(2)},${baseY.toFixed(2)} L ${first.x.toFixed(2)},${baseY.toFixed(2)} Z`;
	}

	return { line, area };
}

export function symmetricRange(...arrays: number[][]): ChartRange {
	let peak = 0;
	for (const arr of arrays) {
		for (const v of arr) {
			const a = Math.abs(v);
			if (a > peak) peak = a;
		}
	}
	if (peak === 0) peak = 1;
	const padded = peak * 1.15;
	return { min: -padded, max: padded };
}
