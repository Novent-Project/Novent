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
const EDGE_PAD = 14;
const GAP = 12;
const INTERACTIVE =
	'a, button, input, select, textarea, label, [role="button"], [role="slider"], [contenteditable="true"], .no-drag';

const IDLE_TRANSITION = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease';
const MUTED_CLASS = 'hud-widget-muted';

interface Point {
	x: number;
	y: number;
}

interface Instance {
	node:       HTMLElement;
	reapply:    () => void;
	reset:      () => void;
	isDragging: () => boolean;
}

const instances = new Set<Instance>();

const popovers = new Set<Element>();

function updateMuted() {
	const rects: { r: DOMRect; owner: Element | null }[] = [];
	for (const el of popovers) {
		if (!el.isConnected) continue;
		rects.push({ r: el.getBoundingClientRect(), owner: el.closest('[data-drag-key]') });
	}
	for (const inst of instances) {
		const node = inst.node;
		let mute = false;
		if (node.isConnected && !inst.isDragging()) {
			const nr = node.getBoundingClientRect();
			for (const { r, owner } of rects) {
				if (owner === node) continue;
				if (nr.left < r.right && nr.right > r.left && nr.top < r.bottom && nr.bottom > r.top) {
					mute = true;
					break;
				}
			}
		}
		node.classList.toggle(MUTED_CLASS, mute);
	}
}

const popoverObserver = typeof ResizeObserver !== 'undefined'
	? new ResizeObserver(updateMuted)
	: null;

export const popoverMute: import('svelte/action').Action<HTMLElement> = (node) => {
	popovers.add(node);
	popoverObserver?.observe(node);
	updateMuted();
	return {
		destroy() {
			popovers.delete(node);
			popoverObserver?.unobserve(node);
			updateMuted();
		},
	};
};

export function resetWidget(key: string) {
	try {
		localStorage.removeItem(STORAGE_PREFIX + key);
	} catch {
	}
	for (const inst of instances) {
		if (inst.node.dataset.dragKey === key) inst.reset();
	}
}

export function resetAllWidgets() {
	try {
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const k = localStorage.key(i);
			if (k?.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k);
		}
	} catch {
	}
	for (const inst of instances) inst.reset();
}

const resizeObserver = typeof ResizeObserver !== 'undefined'
	? new ResizeObserver(() => {
		for (const inst of instances) inst.reapply();
		updateMuted();
	})
	: null;

type DragParams = string | {
	key: string;
	persist?: boolean;
};

function normalizeParams(p: DragParams): { key: string; persist: boolean } {
	return typeof p === 'string'
		? { key: p, persist: true }
		: { key: p.key, persist: p.persist ?? true };
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

export const draggable: Action<HTMLElement, DragParams> = (node, params) => {
	let { key, persist } = normalizeParams(params);
	node.dataset.dragKey = key;

	let intent: Point = (persist ? loadOffset(key) : null) ?? { x: 0, y: 0 };
	let applied: Point = { x: 0, y: 0 };
	let dragging = false;

	const zf = () => {
		const w = node.offsetWidth;
		if (!w) return 1;
		return node.getBoundingClientRect().width / w || 1;
	};

	const boundsEl = node.closest('[data-drag-bounds]');

	const natural = () => {
		const s = zf();
		const r = node.getBoundingClientRect();
		return { left: r.left - applied.x * s, top: r.top - applied.y * s, w: r.width, h: r.height, s };
	};

	const apply = () => {
		const { left, top, w, h, s } = natural();
		let x = intent.x, y = intent.y;
		const b = boundsEl?.getBoundingClientRect();
		if (b && w && h && s) {
			x = Math.max(Math.min(x, (b.right - w - left) / s), (b.left - left) / s);
			y = Math.max(Math.min(y, (b.bottom - h - top) / s), (b.top - top) / s);
		}
		applied = { x: Math.round(x), y: Math.round(y) };
		node.style.transform = applied.x || applied.y ? `translate(${applied.x}px, ${applied.y}px)` : '';
	};

	const snap = (cand: Point): Point => {
		const { left, top, w, h, s } = natural();
		const px = left + cand.x * s;
		const py = top + cand.y * s;
		const xE: number[] = [left];
		const yE: number[] = [top];
		const b = boundsEl?.getBoundingClientRect();
		if (b) {
			xE.push(b.left + EDGE_PAD, b.right - EDGE_PAD - w);
			yE.push(b.top + EDGE_PAD, b.bottom - EDGE_PAD - h);
		}
		for (const inst of instances) {
			const other = inst.node;
			if (other === node || !other.isConnected) continue;
			if (other.closest('[data-drag-bounds]') !== boundsEl) continue;
			const r = other.getBoundingClientRect();
			xE.push(r.left, r.right - w, r.left - GAP - w, r.right + GAP);
			yE.push(r.top, r.bottom - h, r.top - GAP - h, r.bottom + GAP);
		}
		let bx = px, by = py, bdx = SNAP, bdy = SNAP;
		for (const e of xE) {
			const d = Math.abs(e - px);
			if (d < bdx) { bdx = d; bx = e; }
		}
		for (const e of yE) {
			const d = Math.abs(e - py);
			if (d < bdy) { bdy = d; by = e; }
		}
		return { x: (bx - left) / s, y: (by - top) / s };
	};

	node.style.cursor = 'grab';
	node.style.transition = IDLE_TRANSITION;
	const raf = requestAnimationFrame(apply);

	let startX = 0, startY = 0;
	let startIntent: Point = intent;
	let dragScale = 1;
	let pointerId = -1;

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0 || pointerId !== -1) return;
		if ((e.target as Element).closest(INTERACTIVE)) return;
		pointerId = e.pointerId;
		startX = e.clientX;
		startY = e.clientY;
		startIntent = { ...applied };
		dragScale = zf();
		dragging = false;
		window.addEventListener('pointermove', onPointerMove, true);
		window.addEventListener('pointerup', onPointerUp, true);
		window.addEventListener('pointercancel', onPointerUp, true);
		window.addEventListener('blur', endDrag);
	}

	function onPointerMove(e: PointerEvent) {
		if (e.pointerId !== pointerId) return;
		if (e.buttons === 0) {
			endDrag();
			return;
		}
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if (!dragging) {
			if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
			dragging = true;
			node.style.zIndex = '50';
			node.style.transition = 'none';
			document.body.style.userSelect = 'none';
			document.body.style.cursor = 'grabbing';
		}
		let cand: Point = { x: startIntent.x + dx / dragScale, y: startIntent.y + dy / dragScale };
		if (!e.altKey) cand = snap(cand);
		intent = cand;
		apply();
		if (popovers.size) updateMuted();
	}

	function onPointerUp(e: PointerEvent) {
		if (e.pointerId !== pointerId) return;
		endDrag();
	}

	function endDrag() {
		pointerId = -1;
		window.removeEventListener('pointermove', onPointerMove, true);
		window.removeEventListener('pointerup', onPointerUp, true);
		window.removeEventListener('pointercancel', onPointerUp, true);
		window.removeEventListener('blur', endDrag);
		if (!dragging) return;
		dragging = false;
		node.style.zIndex = '';
		node.style.transition = IDLE_TRANSITION;
		document.body.style.userSelect = '';
		document.body.style.cursor = '';

		intent = { ...applied };
		if (persist) saveOffset(key, intent);
		if (popovers.size) updateMuted();

		const suppress = (ce: MouseEvent) => ce.stopPropagation();
		window.addEventListener('click', suppress, { capture: true, once: true });
		setTimeout(() => window.removeEventListener('click', suppress, { capture: true }), 0);
	}

	const instance: Instance = {
		node,
		reapply() {
			if (!dragging && node.isConnected) apply();
		},
		reset() {
			intent = { x: 0, y: 0 };
			if (persist) saveOffset(key, intent);
			if (node.isConnected) apply();
		},
		isDragging: () => dragging,
	};

	node.addEventListener('pointerdown', onPointerDown);
	instances.add(instance);
	resizeObserver?.observe(node);
	if (boundsEl) resizeObserver?.observe(boundsEl);

	return {
		update(newParams: DragParams) {
			const next = normalizeParams(newParams);
			if (next.key === key && next.persist === persist) return;
			key = next.key;
			persist = next.persist;
			node.dataset.dragKey = key;
			intent = (persist ? loadOffset(key) : null) ?? { x: 0, y: 0 };
			apply();
		},
		destroy() {
			if (pointerId !== -1) endDrag();
			instances.delete(instance);
			resizeObserver?.unobserve(node);
			cancelAnimationFrame(raf);
			node.removeEventListener('pointerdown', onPointerDown);
		},
	};
};
