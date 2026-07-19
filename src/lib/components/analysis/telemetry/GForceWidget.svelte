<script lang="ts">
	import { isGarbage } from '$lib/utils/canvas/map';
	import type { AnalysisState } from '$lib/components/analysis/state';

	interface Props {
		analysis: AnalysisState;
	}

	let { analysis }: Props = $props();

	const SIZE = 168;
	const C = SIZE / 2;
	const PAD = 16;
	const MAX_G = 2.5;
	const GRAV = 9.81;
	const W = 4;

	function derivedAt(t: typeof analysis.currentTrace, i: number): { lat: number; lon: number } {
		const n = t.time.length;
		if (n < 2 * W + 1) return { lat: 0, lon: 0 };
		const j0 = Math.max(0, i - W);
		const j1 = Math.min(n - 1, i + W);
		const dt = (t.time[j1] ?? 0) - (t.time[j0] ?? 0);
		if (dt <= 1e-3) return { lat: 0, lon: 0 };

		const lon = ((t.speed[j1] ?? 0) - (t.speed[j0] ?? 0)) / 3.6 / dt / GRAV;

		const v = (t.speed[i] ?? 0) / 3.6;
		let lat = 0;
		if (
			v > 3 &&
			!isGarbage(t.worldX[j0], t.worldZ[j0]) &&
			!isGarbage(t.worldX[i], t.worldZ[i]) &&
			!isGarbage(t.worldX[j1], t.worldZ[j1])
		) {
			const h1 = Math.atan2(t.worldZ[i] - t.worldZ[j0], t.worldX[i] - t.worldX[j0]);
			const h2 = Math.atan2(t.worldZ[j1] - t.worldZ[i], t.worldX[j1] - t.worldX[i]);
			let dh = h2 - h1;
			if (dh > Math.PI) dh -= 2 * Math.PI;
			else if (dh < -Math.PI) dh += 2 * Math.PI;
			lat = (v * (dh / dt)) / GRAV;
		}
		return { lat, lon };
	}

	let recorded = $derived.by(() => {
		const t = analysis.currentTrace;
		const n = t.accLat.length;
		if (!n || n !== t.time.length) return null;
		let peak = 0;
		for (let i = 0; i < n; i += 20) {
			peak = Math.max(peak, Math.abs(t.accLat[i] ?? 0), Math.abs(t.accLon[i] ?? 0));
		}
		if (peak < 0.05) return null;

		let latDot = 0;
		let lonDot = 0;
		const stride = Math.max(1, Math.floor(n / 250));
		for (let i = W; i < n - W; i += stride) {
			const d = derivedAt(t, i);
			latDot += d.lat * (t.accLat[i] ?? 0);
			lonDot += d.lon * (t.accLon[i] ?? 0);
		}
		return { latSign: latDot >= 0 ? 1 : -1, lonSign: lonDot >= 0 ? 1 : -1 };
	});

	let g = $derived.by(() => {
		const t = analysis.currentTrace;
		const i = analysis.playbackIdx;
		const r = recorded;
		if (!r) return derivedAt(t, i);
		const j0 = Math.max(0, i - 1);
		const j1 = Math.min(t.accLat.length - 1, i + 1);
		let lat = 0, lon = 0;
		for (let j = j0; j <= j1; j++) {
			lat += t.accLat[j] ?? 0;
			lon += t.accLon[j] ?? 0;
		}
		const c = j1 - j0 + 1;
		return { lat: (lat / c) * r.latSign, lon: (lon / c) * r.lonSign };
	});

	const clampG = (v: number) => Math.max(-MAX_G, Math.min(MAX_G, v));
	const R = (gv: number) => ((C - PAD) * gv) / MAX_G;

	let dotX = $derived(C + R(clampG(g.lat)));
	let dotY = $derived(C - R(clampG(g.lon)));
	let total = $derived(Math.hypot(g.lat, g.lon));
</script>

<div class="hud-card gforce">
	<div class="header">
		<span class="title">G-Force</span>
		<span class="total mono">{total.toFixed(2)} g</span>
	</div>

	<svg viewBox="0 0 {SIZE} {SIZE}" class="circle" aria-hidden="true">
		<line x1={PAD} x2={SIZE - PAD} y1={C} y2={C} class="axis" />
		<line x1={C} x2={C} y1={PAD} y2={SIZE - PAD} class="axis" />
		{#each [1, 2] as ring (ring)}
			<circle cx={C} cy={C} r={R(ring)} class="ring" />
			<text x={C + 3} y={C - R(ring) - 3} class="ring-label">{ring}g</text>
		{/each}
		<circle cx={C} cy={C} r={C - PAD} class="ring outer" />
		<circle cx={dotX} cy={dotY} r="5" class="dot" />
	</svg>

	<div class="readouts">
		<div class="readout">
			<span class="label">Lat</span>
			<span class="value mono">{g.lat >= 0 ? '+' : ''}{g.lat.toFixed(2)}</span>
		</div>
		<div class="readout">
			<span class="label">Lon</span>
			<span class="value mono">{g.lon >= 0 ? '+' : ''}{g.lon.toFixed(2)}</span>
		</div>
	</div>
</div>

<style>
	.gforce {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px;
		width: 216px;
	}

	.header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
	}

	.total {
		font-size: 12px;
		color: var(--color-accent);
	}

	.circle {
		width: 100%;
		aspect-ratio: 1;
	}

	.axis {
		stroke: var(--color-border-md);
		stroke-width: 1;
	}

	.ring {
		fill: none;
		stroke: var(--color-border-md);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	.ring.outer {
		stroke: var(--color-border);
		stroke-dasharray: none;
	}

	.ring-label {
		fill: var(--color-subtle);
		font-size: 8.5px;
		font-family: var(--font-mono);
	}

	.dot {
		fill: var(--color-accent);
		filter: drop-shadow(0 0 6px var(--color-accent));
	}

	.readouts {
		display: flex;
		gap: 10px;
	}

	.readout {
		flex: 1;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 5px 9px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	.readout .label {
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-muted);
	}

	.readout .value {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-text);
	}
</style>
