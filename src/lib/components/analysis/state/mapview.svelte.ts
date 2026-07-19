import { fitMap, calibrateBoundary, type BoundaryFix } from '$lib/utils/canvas/map';
import type { Trace } from '$lib/utils/canvas/shared';
import type { TrackBoundaries } from '$lib/api';

export const ZOOM_UI_MIN = 0.5;
export const ZOOM_UI_MAX = 8;

const LERP        = 0.14;
const SETTLE_MOVE = 0.04;
const SETTLE_ZOOM = 0.00008;

export class MapView {
	animating = $state(false);
	scale     = $state(1);
	offsetX   = $state(0);
	offsetY   = $state(0);
	fitScale    = $state(1);
	zoomLevel   = $state(1);
	isPanning   = $state(false);
	boundaryFix = $state<BoundaryFix | null>(null);

	#targetScale   = 1;
	#targetOffsetX = 0;
	#targetOffsetY = 0;
	#rafId         = -1;
	#running       = false;
	#panStart      = { x: 0, y: 0, ox: 0, oy: 0 };
	#fittedFor: number | null = null;
	#fixedFor: TrackBoundaries | null | undefined = undefined;

	maybeFit(trace: Trace, w: number, h: number, key: number, boundaries: TrackBoundaries | null = null) {
		if (key !== this.#fittedFor) {
			const fit = fitMap(trace, w, h);
			if (!fit) return;
			this.fitScale       = fit.scale;
			this.#targetScale   = fit.scale;
			this.#targetOffsetX = fit.offsetX;
			this.#targetOffsetY = fit.offsetY;
			this.scale     = fit.scale * 0.4;
			this.offsetX   = w / 2;
			this.offsetY   = h / 2;
			this.zoomLevel = 1;
			this.#fittedFor = key;
			this.#fixedFor  = undefined;
			this.#nudge();
		}

		if (boundaries !== this.#fixedFor) {
			this.boundaryFix = calibrateBoundary(trace, boundaries);
			this.#fixedFor   = boundaries;
		}
	}

	setZoom(v: number) {
		this.zoomLevel     = v;
		this.#targetScale  = this.fitScale * v;
		this.#nudge();
	}

	onWheel(e: WheelEvent) {
		e.preventDefault();
		const rect   = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		const delta  = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
		const factor = Math.pow(0.999, delta);
		const lo     = this.fitScale > 0 ? this.fitScale * ZOOM_UI_MIN : 0.2;
		const hi     = this.fitScale > 0 ? this.fitScale * ZOOM_UI_MAX : 80;
		const next   = Math.max(lo, Math.min(this.#targetScale * factor, hi));
		this.#targetOffsetX = mouseX - (mouseX - this.#targetOffsetX) * (next / this.#targetScale);
		this.#targetOffsetY = mouseY - (mouseY - this.#targetOffsetY) * (next / this.#targetScale);
		this.#targetScale   = next;
		this.zoomLevel      = this.fitScale > 0 ? next / this.fitScale : 1;
		this.#nudge();
	}

	onPointerDown(e: PointerEvent) {
		this.isPanning = true;
		this.#panStart = { x: e.clientX, y: e.clientY, ox: this.#targetOffsetX, oy: this.#targetOffsetY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	onPointerMove(e: PointerEvent) {
		if (!this.isPanning) return;
		this.#targetOffsetX = this.#panStart.ox + (e.clientX - this.#panStart.x);
		this.#targetOffsetY = this.#panStart.oy + (e.clientY - this.#panStart.y);
		this.offsetX = this.#targetOffsetX;
		this.offsetY = this.#targetOffsetY;
	}

	onPointerUp(e: PointerEvent) {
		this.isPanning = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	destroy() {
		if (this.#rafId >= 0) cancelAnimationFrame(this.#rafId);
	}

	#nudge() {
		if (this.#running) return;
		this.#running = true;
		this.animating = true;
		this.#rafId   = requestAnimationFrame(this.#tick);
	}

	#tick = () => {
		const dx = this.#targetOffsetX - this.offsetX;
		const dy = this.#targetOffsetY - this.offsetY;
		const ds = this.#targetScale - this.scale;
		if (Math.abs(dx) < SETTLE_MOVE && Math.abs(dy) < SETTLE_MOVE && Math.abs(ds) < SETTLE_ZOOM) {
			this.offsetX  = this.#targetOffsetX;
			this.offsetY  = this.#targetOffsetY;
			this.scale    = this.#targetScale;
			this.#running = false;
			this.animating = false;
			return;
		}
		this.offsetX += dx * LERP;
		this.offsetY += dy * LERP;
		this.scale   += ds * LERP;
		this.#rafId = requestAnimationFrame(this.#tick);
	};
}
