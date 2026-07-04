<script lang="ts">
	import { gameShort, formatName } from '$lib/utils';
	import { isGarbage, type Trace } from '$lib/utils/canvas';

	interface Session {
		car:      string;
		track:    string;
		game:     string;
		type?:    string;
		bestLap?: string;
	}

	interface Props {
		session?: Session | null;
		trace?:   Trace | null;
	}

	let { session = null, trace = null }: Props = $props();

	const VB_W = 200;
	const VB_H = 90;
	const PAD  = 8;
	const MAX_POINTS = 220;
	const FALLBACK_PATH =
		'M20 60 C10 40 30 22 55 26 C78 30 70 52 92 54 C120 57 118 30 140 28 C168 26 182 44 172 60 C164 73 140 74 120 68 C96 61 60 78 40 72 C26 68 24 66 20 60 Z';

	function buildOutlinePath(t: Trace | null): string | null {
		if (!t || !t.worldX?.length) return null;

		let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
		const pts: { x: number; z: number }[] = [];
		for (let i = 0; i < t.worldX.length; i++) {
			const x = t.worldX[i], z = t.worldZ[i];
			if (isGarbage(x, z)) continue;
			pts.push({ x, z });
			if (x < minX) minX = x; if (x > maxX) maxX = x;
			if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
		}
		if (pts.length < 10 || !isFinite(minX)) return null;

		const spanX = maxX - minX || 1;
		const spanZ = maxZ - minZ || 1;
		const scale = Math.min((VB_W - PAD * 2) / spanX, (VB_H - PAD * 2) / spanZ);
		const offsetX = VB_W / 2 - ((minX + maxX) / 2) * scale;
		const offsetY = VB_H / 2 + ((minZ + maxZ) / 2) * scale;

		const step = Math.max(1, Math.floor(pts.length / MAX_POINTS));
		let d = '';
		for (let i = 0; i < pts.length; i += step) {
			const sx = (pts[i].x * scale + offsetX).toFixed(1);
			const sy = (pts[i].z * -scale + offsetY).toFixed(1);
			d += i === 0 ? `M${sx} ${sy}` : ` L${sx} ${sy}`;
		}
		return d + ' Z';
	}

	let outlinePath = $derived(buildOutlinePath(trace) ?? FALLBACK_PATH);
</script>

<div class="card hud-card">
	{#if session}
		<div class="game-row">
			<span class="logo mono">{gameShort(session.game)}</span>
			<div class="names">
				<span class="car">{formatName(session.car)}</span>
				<span class="track">{formatName(session.track)}</span>
			</div>
		</div>

		<svg class="trace" viewBox="0 0 {VB_W} {VB_H}" fill="none" aria-hidden="true">
			<path d={outlinePath} stroke="var(--color-subtle)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
		</svg>

		<dl class="stats">
			<div><dt>Type</dt><dd>{session.type ?? '—'}</dd></div>
			<div><dt>Best Lap</dt><dd class="mono">{session.bestLap ?? 'N/A'}</dd></div>
			<div><dt>Leaderboard Position</dt><dd class="mono">N/A</dd></div>
		</dl>
	{:else}
		<div class="empty">
			<svg viewBox="0 0 {VB_W} {VB_H}" fill="none" aria-hidden="true">
				<path d={FALLBACK_PATH} stroke="var(--color-subtle)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
			</svg>
			<span class="empty-title">No sessions yet</span>
			<span class="empty-sub">Head to the Race Engineer tab to start logging data</span>
		</div>
	{/if}
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px;
	}

	.game-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--card-bg);
		border: 1px solid var(--color-border);
	}

	.logo {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		font-size: 10px;
		color: var(--color-text);
	}

	.names { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
	.car   { font-size: 14px; font-weight: 600; color: var(--color-text); }
	.track { font-size: 12px; color: var(--color-muted); }

	.trace {
		flex: 1;
		min-height: 60px;
		width: 100%;
	}

	.stats {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
	}

	.stats div {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.stats dt { font-size: 12px; color: var(--color-muted); }
	.stats dd { margin: 0; font-size: 12px; font-weight: 600; color: var(--color-text); }

	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 0 4px;
		text-align: center;
	}

	.empty svg { width: 150px; height: 68px; opacity: 0.5; }
	.empty-title { font-size: 14px; font-weight: 600; color: var(--color-text); }
	.empty-sub { font-size: 11px; color: var(--color-muted); max-width: 30ch; }
</style>