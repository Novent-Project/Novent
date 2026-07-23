import { distBucket, type DownsampledTrace, type Trace } from './shared.js';
import type { TrackBoundaries } from '$lib/api';

interface CompLap {
	trace: Trace;
	ds:    DownsampledTrace;
	color: string;
	idx:   number;
}

export function isGarbage(x: number, z: number): boolean {
	return (x === 0 && z === 0) || Math.abs(x) > 50000 || Math.abs(z) > 50000;
}

export function smoothBoundary(pts: { x: number; z: number }[], window = 7): { x: number; z: number }[] {
	const n = pts.length;
	if (n < window || window < 3) return pts;
	const gx = (p: any) => p.x ?? p[0];
	const gz = (p: any) => p.z ?? p[1];
	const half = window >> 1;
	const out: { x: number; z: number }[] = [];
	for (let i = 0; i < n; i++) {
		let sx = 0, sz = 0;
		for (let k = -half; k <= half; k++) {
			const p = pts[((i + k) % n + n) % n];
			sx += gx(p);
			sz += gz(p);
		}
		out.push({ x: sx / window, z: sz / window });
	}
	return out;
}

export interface BoundaryFix {
	scale: number;
	dx:    number;
	dz:    number;
}

export function calibrateBoundary(trace: Trace, boundaries: TrackBoundaries | null): BoundaryFix | null {
	if (!boundaries?.outer?.length) return null;

	let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
	for (let i = 0; i < trace.worldX.length; i++) {
		const x = trace.worldX[i], z = trace.worldZ[i];
		if (isGarbage(x, z)) continue;
		if (x < minX) minX = x; if (x > maxX) maxX = x;
		if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
	}
	if (!isFinite(minX)) return null;

	let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity;
	for (const arr of [boundaries.outer, boundaries.inner]) {
		if (!arr) continue;
		for (const pt of arr) {
			const px = (pt as any).x ?? (pt as any)[0];
			const pz = (pt as any).z ?? (pt as any)[1];
			if (px === undefined || pz === undefined) continue;
			if (px < bMinX) bMinX = px; if (px > bMaxX) bMaxX = px;
			if (pz < bMinZ) bMinZ = pz; if (pz > bMaxZ) bMaxZ = pz;
		}
	}
	if (!isFinite(bMinX)) return null;

	const traceDiag = Math.hypot(maxX - minX, maxZ - minZ) || 1;
	const boundDiag = Math.hypot(bMaxX - bMinX, bMaxZ - bMinZ) || 1;
	const scale     = traceDiag / boundDiag;

	const traceCx = (minX + maxX) / 2, traceCz = (minZ + maxZ) / 2;
	const boundCx = (bMinX + bMaxX) / 2, boundCz = (bMinZ + bMaxZ) / 2;

	const centerDist = Math.hypot(boundCx - traceCx, boundCz - traceCz);
	if (scale > 0.7 && scale < 1.3 && centerDist < traceDiag * 0.1) return null;

	return {
		scale,
		dx: traceCx - boundCx * scale,
		dz: traceCz - boundCz * scale,
	};
}

export function fitMap(
	trace: Trace,
	w:     number,
	h:     number
): { scale: number; offsetX: number; offsetY: number } | null {
	let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
	for (let i = 0; i < trace.worldX.length; i++) {
		const x = trace.worldX[i], z = trace.worldZ[i];
		if (isGarbage(x, z)) continue;
		if (x < minX) minX = x; if (x > maxX) maxX = x;
		if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
	}
	if (!isFinite(minX)) return null;

	const traceW = maxX - minX || 1;
	const traceZ = maxZ - minZ || 1;
	const scale  = Math.min((w * 0.88) / traceW, (h * 0.88) / traceZ);

	return {
		scale,
		offsetX: w / 2 - ((minX + maxX) / 2) * scale,
		offsetY: h / 2 + ((minZ + maxZ) / 2) * scale,
	};
}

interface StaticLayer {
	canvas:      HTMLCanvasElement;
	w:           number;
	h:           number;
	dpr:         number;
	trace:       Trace | null;
	ds:          DownsampledTrace | null;
	scale:       number;
	offsetX:     number;
	offsetY:     number;
	boundaries:  TrackBoundaries | null;
	boundaryFix: BoundaryFix | null;
	compTraces:  Trace[];
	compColors:  string[];
	diagLen:     number;
	margin:      number;
}

const staticLayers = new WeakMap<HTMLCanvasElement, StaticLayer>();

function traceDiagonal(trace: Trace): number {
	let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
	for (let i = 0; i < trace.worldX.length; i++) {
		const x = trace.worldX[i], z = trace.worldZ[i];
		if (isGarbage(x, z)) continue;
		if (x < minX) minX = x; if (x > maxX) maxX = x;
		if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
	}
	return isFinite(minX) ? Math.sqrt((maxX - minX) ** 2 + (maxZ - minZ) ** 2) : 1;
}

function renderStaticLayer(
	layer:      StaticLayer,
	w:          number,
	h:          number,
	dpr:        number,
	trace:      Trace,
	ds:         DownsampledTrace | null,
	scale:      number,
	offsetX:    number,
	offsetY:    number,
	boundaries: TrackBoundaries | null,
	compLaps:   CompLap[],
	boundaryFix: BoundaryFix | null
) {
	const canvas = layer.canvas;
	const m     = layer.margin;
	const fullW = w + 2 * m;
	const fullH = h + 2 * m;
	if (canvas.width !== fullW * dpr || canvas.height !== fullH * dpr) {
		canvas.width  = fullW * dpr;
		canvas.height = fullH * dpr;
	}
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, fullW, fullH);

	const toScreen = (wx: number, wz: number) => ({
		sx: wx  *  scale + offsetX + m,
		sz: wz  * -scale + offsetY + m,
	});

	if (boundaries?.inner && boundaries?.outer) {
		ctx.lineWidth   = 3;
		ctx.lineCap     = 'round';
		ctx.lineJoin    = 'round';
		ctx.strokeStyle = 'rgba(255,255,255,0.18)';

		for (const arr of [boundaries.outer, boundaries.inner]) {
			if (!arr?.length) continue;
			const sp: { x: number; y: number }[] = [];
			for (const pt of arr) {
				const px = pt.x ?? (pt as any)[0];
				const pz = pt.z ?? (pt as any)[1];
				if (px === undefined || pz === undefined) continue;
				const fx = boundaryFix ? px * boundaryFix.scale + boundaryFix.dx : px;
				const fz = boundaryFix ? pz * boundaryFix.scale + boundaryFix.dz : pz;
				const { sx, sz } = toScreen(fx, fz);
				if (isNaN(sx) || isNaN(sz)) continue;
				sp.push({ x: sx, y: sz });
			}
			if (sp.length < 3) continue;
			const n = sp.length;
			ctx.beginPath();
			ctx.moveTo((sp[n - 1].x + sp[0].x) / 2, (sp[n - 1].y + sp[0].y) / 2);
			for (let i = 0; i < n; i++) {
				const cur = sp[i];
				const nxt = sp[(i + 1) % n];
				ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + nxt.x) / 2, (cur.y + nxt.y) / 2);
			}
			ctx.closePath();
			ctx.stroke();
		}
	}

	const total    = trace.worldX.length;
	const diagLen  = layer.diagLen;
	const lineStep = Math.max(1, Math.floor(total / (Math.max(diagLen, 1) * 2)));

	if (ds) {
		const dsTotal = ds.gas.length;
		ctx.lineWidth = Math.max(2, 3 * Math.min(scale / 3, 1.5));
		ctx.lineCap   = 'round';
		ctx.lineJoin  = 'round';

		for (let i = 0; i < total - lineStep; i += lineStep) {
			const wx = trace.worldX[i], wz = trace.worldZ[i];
			const nx = trace.worldX[i + lineStep], nz = trace.worldZ[i + lineStep];
			if (isGarbage(wx, wz) || isGarbage(nx, nz)) continue;

			const di = distBucket(trace.normPos[i] ?? 0, dsTotal);
			const g  = ds.gas[di]   ?? 0;
			const b  = ds.brake[di] ?? 0;

			ctx.beginPath();
			ctx.strokeStyle = b > 0.05
				? `rgba(239,68,68,${0.5 + b * 0.5})`
				: g > 0.05
					? `rgba(16,185,129,${0.5 + g * 0.5})`
					: 'rgba(255,255,255,0.35)';
			const { sx: x1, sz: z1 } = toScreen(wx, wz);
			const { sx: x2, sz: z2 } = toScreen(nx, nz);
			ctx.moveTo(x1, z1);
			ctx.lineTo(x2, z2);
			ctx.stroke();
		}
	} else {
		ctx.beginPath();
		ctx.strokeStyle = 'rgba(255,255,255,0.8)';
		ctx.lineWidth   = 3;
		ctx.lineCap     = 'round';
		ctx.lineJoin    = 'round';
		let first = true;
		for (let i = 0; i < total; i += lineStep) {
			const wx = trace.worldX[i], wz = trace.worldZ[i];
			if (isGarbage(wx, wz)) continue;
			const { sx, sz } = toScreen(wx, wz);
			first ? ctx.moveTo(sx, sz) : ctx.lineTo(sx, sz);
			first = false;
		}
		ctx.stroke();
	}

	const sf = toScreen(trace.worldX[0], trace.worldZ[0]);
	if (!isGarbage(trace.worldX[0], trace.worldZ[0])) {
		ctx.beginPath();
		ctx.fillStyle = '#ef4444';
		ctx.arc(sf.sx, sf.sz, 6, 0, Math.PI * 2);
		ctx.fill();
	}

	for (const comp of compLaps) {
		const ctrace = comp.trace;
		const ctotal = ctrace.worldX.length;
		if (!ctotal) continue;
		const cLineStep = Math.max(1, Math.floor(ctotal / (Math.max(diagLen, 1) * 2)));
		ctx.beginPath();
		ctx.strokeStyle = comp.color;
		ctx.globalAlpha = 0.55;
		ctx.lineWidth   = 2;
		ctx.lineCap     = 'round';
		ctx.lineJoin    = 'round';
		let first = true;
		for (let i = 0; i < ctotal; i += cLineStep) {
			const wx = ctrace.worldX[i], wz = ctrace.worldZ[i];
			if (isGarbage(wx, wz)) continue;
			const { sx, sz } = toScreen(wx, wz);
			first ? ctx.moveTo(sx, sz) : ctx.lineTo(sx, sz);
			first = false;
		}
		ctx.stroke();
		ctx.globalAlpha = 1;
	}
}

export function drawMap(
	canvas:     HTMLCanvasElement | null,
	w:          number,
	h:          number,
	trace:      Trace,
	ds:         DownsampledTrace | null,
	scale:      number,
	offsetX:    number,
	offsetY:    number,
	idx:        number,
	boundaries: TrackBoundaries | null,
	compLaps:   CompLap[],
	boundaryFix: BoundaryFix | null = null,
	interacting: boolean = false
) {
	if (!canvas || !trace.worldX.length) return;

	const dpr = window.devicePixelRatio || 1;
	if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
		canvas.width  = w * dpr;
		canvas.height = h * dpr;
	}
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, w, h);

	let layer = staticLayers.get(canvas);
	if (!layer) {
		layer = {
			canvas: document.createElement('canvas'),
			w: 0, h: 0, dpr: 0,
			trace: null, ds: null,
			scale: 0, offsetX: NaN, offsetY: NaN,
			boundaries: null, boundaryFix: null,
			compTraces: [], compColors: [],
			diagLen: 1,
			margin: 0,
		};
		staticLayers.set(canvas, layer);
	}

	const compsChanged =
		layer.compTraces.length !== compLaps.length ||
		compLaps.some((c, i) => layer.compTraces[i] !== c.trace || layer.compColors[i] !== c.color);

	const geometryDirty = layer.w !== w || layer.h !== h || layer.dpr !== dpr ||
		layer.trace !== trace || layer.ds !== ds ||
		layer.boundaries !== boundaries || layer.boundaryFix !== boundaryFix || compsChanged;
	const transformDirty = layer.scale !== scale || layer.offsetX !== offsetX || layer.offsetY !== offsetY;

	let k  = scale / layer.scale;
	let tx = offsetX - k * layer.offsetX;
	let ty = offsetY - k * layer.offsetY;

	const covered =
		tx - k * layer.margin <= 0 &&
		ty - k * layer.margin <= 0 &&
		tx - k * layer.margin + (w + 2 * layer.margin) * k >= w &&
		ty - k * layer.margin + (h + 2 * layer.margin) * k >= h;

	const scaleDirty = layer.scale !== scale;

	if (geometryDirty || (transformDirty && (!interacting || !covered || scaleDirty)))
	{
		if (layer.trace !== trace) layer.diagLen = traceDiagonal(trace);
		layer.w = w; layer.h = h; layer.dpr = dpr;
		layer.trace = trace; layer.ds = ds;
		layer.scale = scale; layer.offsetX = offsetX; layer.offsetY = offsetY;
		layer.boundaries = boundaries; layer.boundaryFix = boundaryFix;
		layer.compTraces = compLaps.map(c => c.trace);
		layer.compColors = compLaps.map(c => c.color);
		layer.margin = Math.round(Math.min(w, h) / 3);
		renderStaticLayer(layer, w, h, dpr, trace, ds, scale, offsetX, offsetY, boundaries, compLaps, boundaryFix);
		k = 1; tx = 0; ty = 0;
	}

	const m = layer.margin;
	ctx.drawImage(layer.canvas, tx - k * m, ty - k * m, (w + 2 * m) * k, (h + 2 * m) * k);

	const toScreen = (wx: number, wz: number) => ({
		sx: wx  *  scale + offsetX,
		sz: wz  * -scale + offsetY,
	});

	for (const comp of compLaps) {
		if (comp.idx < 0) continue;
		const wx = comp.trace.worldX[comp.idx];
		const wz = comp.trace.worldZ[comp.idx];
		if (isGarbage(wx, wz)) continue;
		const { sx, sz } = toScreen(wx, wz);
		ctx.beginPath();
		ctx.fillStyle   = comp.color;
		ctx.shadowColor = comp.color;
		ctx.shadowBlur  = 10;
		ctx.arc(sx, sz, 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;
	}

	const carWX = trace.worldX[idx];
	const carWZ = trace.worldZ[idx];
	if (!isGarbage(carWX, carWZ)) {
		const { sx, sz } = toScreen(carWX, carWZ);
		ctx.beginPath();
		ctx.fillStyle   = 'white';
		ctx.shadowColor = 'rgba(255,255,255,0.9)';
		ctx.shadowBlur  = 12;
		ctx.arc(sx, sz, 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;
	}
}