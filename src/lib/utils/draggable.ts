import type { Action } from 'svelte/action';

const STORAGE_PREFIX = 'hud-pos.v2:';

if (typeof localStorage !== 'undefined') {
	try {
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const k = localStorage.key(i);
			if (k?.startsWith('hud-pos:')) localStorage.removeItem(k);
		}
	} catch {
	}
}
const DRAG_THRESHOLD = 4;
const SNAP = 10;
const SNAP_RELEASE = 16;
const EDGE_PAD = 14;
const GAP = 12;
const INTERACTIVE =
	'a, button, input, select, textarea, label, [role="button"], [role="slider"], [contenteditable="true"], .no-drag';

const IDLE_TRANSITION = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';

interface Point {
	x: number;
	y: number;
}

interface Base {
	left: number;
	top: number;
	w: number;
	h: number;
}

const widgets = new Set<HTMLElement>();

const settlers = new Set<() => boolean>();
export function settleWidgets() {
	for (let round = 0; round < 4; round++) {
		let moved = false;
		for (const settle of settlers) {
			if (settle()) moved = true;
		}
		if (!moved) break;
	}
}

type DragParams = string | {
	key: string;
	persist?: boolean;
	spawnBelow?: string;
};

function normalizeParams(p: DragParams): { key: string; persist: boolean; spawnBelow: string | null } {
	return typeof p === 'string'
		? { key: p, persist: true, spawnBelow: null }
		: { key: p.key, persist: p.persist ?? true, spawnBelow: p.spawnBelow ?? null };
}

function loadOffset(key: string): Point | null {
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + key);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return Number.isFinite(parsed.x) && Number.isFinite(parsed.y) ? { x: parsed.x, y: parsed.y } : null;
	} catch {
		return null;
	}
}

function saveOffset(key: string, offset: Point) {
	try {
		if (offset.x === 0 && offset.y === 0) localStorage.removeItem(STORAGE_PREFIX + key);
		else localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(offset));
	} catch {
	}
}

function snapAxis(start: number, size: number, edges: { flush: number[]; beside: number[] }): number | null {
	let best: number | null = null;
	let bestDist = SNAP;
	const consider = (target: number) => {
		const d = Math.abs(target - start);
		if (d < bestDist) {
			bestDist = d;
			best = target;
		}
	};
	for (const e of edges.flush) {
		consider(e);
		consider(e - size);
	}
	for (const e of edges.beside) {
		consider(e + GAP);
		consider(e - GAP - size);
	}
	return best;
}

export const draggable: Action<HTMLElement, DragParams> = (node, params) => {
	let { key, persist, spawnBelow } = normalizeParams(params);
	node.dataset.dragKey = key;
	let offset: Point = { x: 0, y: 0 };
	const stored = persist ? loadOffset(key) : null;

	const zf = () => {
		const w = node.offsetWidth;
		if (!w) return 1;
		return node.getBoundingClientRect().width / w || 1;
	};

	const apply = () => {
		if (!offset.x && !offset.y) {
			node.style.transform = '';
			return;
		}
		const s = zf();
		node.style.transform = `translate(${offset.x / s}px, ${offset.y / s}px)`;
	};

	const persistOffset = () => {
		if (!persist) return;
		const s = zf();
		saveOffset(key, { x: Math.round(offset.x / s), y: Math.round(offset.y / s) });
	};

	const measureBase = (): Base => {
		const rect = node.getBoundingClientRect();
		return { left: rect.left - offset.x, top: rect.top - offset.y, w: rect.width, h: rect.height };
	};

	const clamp = (candidate: Point, base: Base): Point => {
		const bounds = node.closest('[data-drag-bounds]')?.getBoundingClientRect();
		if (!bounds) return candidate;
		return {
			x: Math.round(Math.min(Math.max(candidate.x, bounds.left - base.left), bounds.right - base.w - base.left)),
			y: Math.round(Math.min(Math.max(candidate.y, bounds.top - base.top), bounds.bottom - base.h - base.top)),
		};
	};

	const siblingRects = (): DOMRect[] => {
		const container = node.closest('[data-drag-bounds]');
		const out: DOMRect[] = [];
		for (const other of widgets) {
			if (other === node || !other.isConnected) continue;
			if (container && other.closest('[data-drag-bounds]') !== container) continue;
			out.push(other.getBoundingClientRect());
		}
		return out;
	};

	let heldSnapX: number | null = null;
	let heldSnapY: number | null = null;

	const snap = (candidate: Point, base: Base): Point => {
		const xEdges = { flush: [] as number[], beside: [] as number[] };
		const yEdges = { flush: [] as number[], beside: [] as number[] };
		xEdges.flush.push(base.left);
		yEdges.flush.push(base.top);
		const bounds = node.closest('[data-drag-bounds]')?.getBoundingClientRect();
		if (bounds) {
			xEdges.flush.push(bounds.left + EDGE_PAD, bounds.right - EDGE_PAD);
			yEdges.flush.push(bounds.top + EDGE_PAD, bounds.bottom - EDGE_PAD);
		}
		for (const r of siblingRects()) {
			xEdges.flush.push(r.left, r.right);
			xEdges.beside.push(r.left, r.right);
			yEdges.flush.push(r.top, r.bottom);
			yEdges.beside.push(r.top, r.bottom);
		}

		const px = base.left + candidate.x;
		const py = base.top + candidate.y;

		let sx: number | null;
		if (heldSnapX !== null && Math.abs(px - heldSnapX) < SNAP_RELEASE) sx = heldSnapX;
		else sx = snapAxis(px, base.w, xEdges);
		heldSnapX = sx;

		let sy: number | null;
		if (heldSnapY !== null && Math.abs(py - heldSnapY) < SNAP_RELEASE) sy = heldSnapY;
		else sy = snapAxis(py, base.h, yEdges);
		heldSnapY = sy;

		return {
			x: Math.round(sx !== null ? sx - base.left : candidate.x),
			y: Math.round(sy !== null ? sy - base.top : candidate.y),
		};
	};

	const firstHit = (cur: Point, base: Base, rects: DOMRect[]): DOMRect | null => {
		const L = base.left + cur.x;
		const T = base.top + cur.y;
		for (const r of rects) {
			if (L < r.right && L + base.w > r.left && T < r.bottom && T + base.h > r.top) return r;
		}
		return null;
	};

	const resolveCollisions = (candidate: Point, base: Base): Point | null => {
		const rects = siblingRects();
		let cur = { ...candidate };
		for (let pass = 0; pass < 4; pass++) {
			const hit = firstHit(cur, base, rects);
			if (!hit) return cur;
			const L = base.left + cur.x;
			const T = base.top + cur.y;
			const ox = Math.min(L + base.w, hit.right) - Math.max(L, hit.left) + 1;
			const oy = Math.min(T + base.h, hit.bottom) - Math.max(T, hit.top) + 1;
			if (ox < oy) cur.x += L + base.w / 2 < hit.left + hit.width / 2 ? -ox : ox;
			else cur.y += T + base.h / 2 < hit.top + hit.height / 2 ? -oy : oy;
			cur = clamp(cur, base);
		}

		const hit = firstHit(candidate, base, rects);
		if (!hit) return candidate;
		const options: Point[] = [
			{ x: candidate.x, y: hit.top - GAP - base.h - base.top },
			{ x: candidate.x, y: hit.bottom + GAP - base.top },
			{ x: hit.left - GAP - base.w - base.left, y: candidate.y },
			{ x: hit.right + GAP - base.left, y: candidate.y },
		];
		let best: Point | null = null;
		let bestDist = Infinity;
		for (const opt of options) {
			const c = clamp(opt, base);
			if (firstHit(c, base, rects)) continue;
			const d = Math.hypot(c.x - candidate.x, c.y - candidate.y);
			if (d < bestDist) {
				bestDist = d;
				best = c;
			}
		}
		return best;
	};

	function settle(): boolean {
		if (dragging) return false;
		if (!offset.x && !offset.y) return false;
		const base = measureBase();
		const rects = siblingRects();
		let cur = clamp(offset, base);
		for (let pass = 0; pass < 4; pass++) {
			const hit = firstHit(cur, base, rects);
			if (!hit) break;
			const L = base.left + cur.x;
			const T = base.top + cur.y;
			const ox = Math.min(L + base.w, hit.right) - Math.max(L, hit.left) + 1;
			const oy = Math.min(T + base.h, hit.bottom) - Math.max(T, hit.top) + 1;
			if (ox < oy) cur = clamp({ x: cur.x + (L + base.w / 2 < hit.left + hit.width / 2 ? -ox : ox), y: cur.y }, base);
			else cur = clamp({ x: cur.x, y: cur.y + (T + base.h / 2 < hit.top + hit.height / 2 ? -oy : oy) }, base);
		}
		if (firstHit(cur, base, rects)) return false;
		if (cur.x === offset.x && cur.y === offset.y) return false;
		offset = cur;
		apply();
		persistOffset();
		return true;
	}

	node.style.cursor = 'grab';
	node.style.transition = IDLE_TRANSITION;
	const raf = requestAnimationFrame(() => {
		if (stored && (stored.x || stored.y)) {
			const s = zf();
			offset = { x: stored.x * s, y: stored.y * s };
			const base = measureBase();
			offset = resolveCollisions(clamp(offset, base), base) ?? { x: 0, y: 0 };
			apply();
			persistOffset();
		} else if (spawnBelow) {
			const target = node
				.closest('[data-drag-bounds]')
				?.querySelector(`[data-drag-key="${spawnBelow}"]`);
			if (target && target !== node) {
				const base = measureBase();
				const r = target.getBoundingClientRect();
				offset = clamp(
					{ x: Math.round(r.left - base.left), y: Math.round(r.bottom + GAP - base.top) },
					base
				);
				apply();
			}
		}
	});

	let startX = 0, startY = 0;
	let startOffset: Point = offset;
	let dragBase: Base = { left: 0, top: 0, w: 0, h: 0 };
	let dragging = false;

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		if ((e.target as Element).closest(INTERACTIVE)) return;
		startX = e.clientX;
		startY = e.clientY;
		startOffset = offset;
		dragBase = measureBase();
		dragging = false;
		node.addEventListener('pointermove', onPointerMove);
		node.addEventListener('pointerup', onPointerUp);
		node.addEventListener('pointercancel', onPointerUp);
		node.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if (!dragging) {
			if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
			dragging = true;
			heldSnapX = null;
			heldSnapY = null;
			node.style.pointerEvents = 'none';
			node.style.zIndex = '50';
			node.style.transition = 'none';
			document.body.style.userSelect = 'none';
			document.body.style.cursor = 'grabbing';
		}
		dragBase = measureBase();
		let candidate: Point = { x: startOffset.x + dx, y: startOffset.y + dy };
		if (!e.altKey) candidate = snap(candidate, dragBase);
		offset = clamp(candidate, dragBase);
		apply();
	}

	function onPointerUp(e: PointerEvent) {
		node.removeEventListener('pointermove', onPointerMove);
		node.removeEventListener('pointerup', onPointerUp);
		node.removeEventListener('pointercancel', onPointerUp);
		if (!dragging) return;
		dragging = false;
		node.style.pointerEvents = '';
		node.style.zIndex = '';
		node.style.transition = IDLE_TRANSITION;
		document.body.style.userSelect = '';
		document.body.style.cursor = '';

		if (!e.altKey) {
			const dropBase = measureBase();
			offset = resolveCollisions(offset, dropBase) ?? clamp(startOffset, dropBase);
			apply();
		}
		persistOffset();

		const suppress = (ce: MouseEvent) => ce.stopPropagation();
		window.addEventListener('click', suppress, { capture: true, once: true });
		setTimeout(() => window.removeEventListener('click', suppress, { capture: true }), 0);
	}

	function onDblClick(e: MouseEvent) {
		if ((e.target as Element).closest(INTERACTIVE)) return;
		offset = { x: 0, y: 0 };
		apply();
		persistOffset();
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('dblclick', onDblClick);
	widgets.add(node);
	settlers.add(settle);

	return {
		update(newParams: DragParams) {
			const next = normalizeParams(newParams);
			if (next.key === key && next.persist === persist && next.spawnBelow === spawnBelow) return;
			key = next.key;
			persist = next.persist;
			spawnBelow = next.spawnBelow;
			node.dataset.dragKey = key;
			const s = zf();
			const reloaded = persist ? loadOffset(key) : null;
			offset = reloaded ? { x: reloaded.x * s, y: reloaded.y * s } : { x: 0, y: 0 };
			apply();
		},
		destroy() {
			widgets.delete(node);
			settlers.delete(settle);
			cancelAnimationFrame(raf);
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('dblclick', onDblClick);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', onPointerUp);
			node.removeEventListener('pointercancel', onPointerUp);
			if (dragging) {
				document.body.style.userSelect = '';
				document.body.style.cursor = '';
			}
		},
	};
};
