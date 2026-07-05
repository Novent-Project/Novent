<script lang="ts">
	import { formatTime } from '$lib/utils';
	import Icon from '$lib/components/chrome/Icon.svelte';
	import { Play, Pause, ArrowsRightLeft } from '@steeze-ui/heroicons';
	import type { AnalysisState } from '$lib/components/analysis/state';

	interface Props {
		analysis: AnalysisState;
	}

	let { analysis }: Props = $props();

	let playbarEl = $state<HTMLDivElement | null>(null);
	let pbW = $state(0);
	let pbH = $state(0);
	let radius = $state(0);

	// hud-card's border-radius isn't defined in this file, so read the real
	// computed value rather than guessing a px number that might drift out
	// of sync with the shared card style.
	$effect(() => {
		if (!playbarEl) return;
		const r = parseFloat(getComputedStyle(playbarEl).borderRadius);
		if (!Number.isNaN(r)) radius = r;
	});

	// Inset stroke by half its width so it sits crisply inside the card edge
	// rather than getting clipped by the card's own rounded corners.
	const STROKE = 2.25;
	let inset = $derived(STROKE / 2);
	let rectW = $derived(Math.max(pbW - STROKE, 0));
	let rectH = $derived(Math.max(pbH - STROKE, 0));
	let rectR = $derived(Math.max(radius - inset, 0));

	// Explicit "top cap" path — left corner arc, top straight, right corner
	// arc — rather than relying on where a plain <rect>'s path happens to
	// start/stop. This guarantees the progress stroke always ends mid-curve
	// cleanly instead of cutting off flat partway down a straight edge.
	let topPathD = $derived(
		rectW && rectH
			? `M ${inset},${inset + rectR} A ${rectR},${rectR} 0 0 1 ${inset + rectR},${inset} L ${inset + rectW - rectR},${inset} A ${rectR},${rectR} 0 0 1 ${inset + rectW},${inset + rectR}`
			: ''
	);

	let pct = $derived(analysis.resolvedLapTime > 0 ? (analysis.currentTime / analysis.resolvedLapTime) * 100 : 0);
	let pctClamped = $derived(Math.min(Math.max(pct, 0), 100));

	// Read the thumb's position straight off the path geometry (getPointAtLength)
	// instead of re-deriving corner trig by hand, so it's always pixel-exact
	// wherever the dash actually ends.
	let topPathEl = $state<SVGPathElement | null>(null);
	let thumb = $state({ x: 0, y: 0 });
	$effect(() => {
		if (!topPathEl) return;
		const len = topPathEl.getTotalLength();
		if (!len) return;
		const p = topPathEl.getPointAtLength(len * (pctClamped / 100));
		thumb = { x: p.x, y: p.y };
	});

	let deltaText = $derived(`${analysis.liveDeltaValue >= 0 ? '+' : ''}${analysis.liveDeltaValue.toFixed(3)}`);
	let distanceText = $derived(`${analysis.distanceGap >= 0 ? '+' : ''}${Math.round(analysis.distanceGap)} m`);
</script>

<div class="hud-card playbar" bind:this={playbarEl} bind:clientWidth={pbW} bind:clientHeight={pbH}>
	{#if pbW && pbH}
		<svg class="frame" viewBox="0 0 {pbW} {pbH}" aria-hidden="true">
			<rect class="frame-track" x={inset} y={inset} width={rectW} height={rectH} rx={rectR} ry={rectR} />
			<path
				bind:this={topPathEl}
				class="frame-progress"
				d={topPathD}
				pathLength="100"
				style="stroke-dasharray:{pctClamped} 9999; opacity:{pctClamped > 0.05 ? 1 : 0}"
			/>
			<circle class="frame-thumb" cx={thumb.x} cy={thumb.y} r="3" />
		</svg>
	{/if}

	<input
		class="scrubber"
		type="range"
		min="0"
		max={analysis.resolvedLapTime}
		step="0.01"
		value={analysis.currentTime}
		aria-label="Seek"
		oninput={(e) => analysis.seek(+(e.currentTarget as HTMLInputElement).value)}
	/>

	<div class="cluster left">
		<button class="play" onclick={() => analysis.togglePlayback()} aria-label={analysis.isPlaying ? 'Pause' : 'Play'}>
			<Icon src={analysis.isPlaying ? Pause : Play} theme="solid" size={16} />
		</button>

		<button class="icon-btn" onclick={() => analysis.seek(analysis.currentTime - 1)} aria-label="Step back">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M11 4l-5 4 5 4" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M5 4v8" stroke-linecap="round" />
			</svg>
		</button>

		<button class="icon-btn" onclick={() => analysis.seek(analysis.currentTime + 1)} aria-label="Step forward">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M5 4l5 4-5 4" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M11 4v8" stroke-linecap="round" />
			</svg>
		</button>

		<span class="time mono">{formatTime(analysis.currentTime)}</span>
	</div>

	<div class="cluster center">
		<span class="stat">
			<span class="label">Delta:</span>
			<span class="mono" style="color:{analysis.liveDeltaValue > 0 ? 'var(--color-red)' : 'var(--color-accent)'}"
				>{deltaText}</span
			>
		</span>
		<span class="stat">
			<Icon src={ArrowsRightLeft} theme="outline" size={16} color="var(--color-muted)" />
			<span class="mono dist">{distanceText}</span>
		</span>
	</div>

	<div class="cluster right">
		<div class="segment">
			<button class:active={analysis.playMode === 'time'} onclick={() => analysis.setPlayMode('time')}>Time</button>
			<button class:active={analysis.playMode === 'distance'} onclick={() => analysis.setPlayMode('distance')}>Distance</button>
		</div>
	</div>
</div>

<style>
	.playbar {
		position: relative;
		display: flex;
		align-items: center;
		height: 56px;
		margin: 12px 14px 14px;
		padding: 0 18px;
	}

	.frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: visible;
	}

	.frame-track {
		fill: none;
		stroke: var(--color-border-md);
		stroke-width: 1.25;
		opacity: 0.55;
	}

	.frame-progress {
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 2.75;
		stroke-linecap: round;
		filter: drop-shadow(0 0 3px color-mix(in srgb, var(--color-accent) 55%, transparent));
	}

	.frame-thumb {
		fill: var(--color-accent);
		filter: drop-shadow(0 0 3px color-mix(in srgb, var(--color-accent) 70%, transparent));
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.playbar:hover .frame-thumb,
	.playbar:focus-within .frame-thumb {
		opacity: 1;
	}

	/* Purely a drag surface for the top edge — all visuals come from .frame.
	   Sits below the clusters in stacking order so it never steals clicks
	   from the buttons where the hit-zone happens to overlap them. */
	.scrubber {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 20px;
		margin: 0;
		padding: 0;
		appearance: none;
		-webkit-appearance: none;
		background: transparent;
		cursor: pointer;
		outline: none;
		z-index: 1;
	}

	.scrubber::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		background: transparent;
		border: none;
	}

	.scrubber::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background: transparent;
		border: none;
	}

	.scrubber::-moz-range-track {
		background: transparent;
	}

	.cluster {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
	}

	.left {
		gap: 10px;
	}

	.center {
		flex: 1;
		justify-content: center;
		gap: 18px;
	}

	.right {
		gap: 12px;
	}

	.play {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: none;
		background: var(--color-accent);
		color: var(--color-bg);
		cursor: pointer;
		padding: 0;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		padding: 0;
	}

	.icon-btn:hover {
		color: var(--color-text);
		background: var(--card-bg);
	}

	.icon-btn svg {
		width: 16px;
		height: 16px;
	}

	.time {
		font-size: 15px;
		color: var(--color-text);
		margin-left: 2px;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.label {
		font-size: 12px;
		color: var(--color-muted);
	}

	.stat .mono {
		font-size: 13px;
	}

	.dist {
		color: var(--color-muted);
	}

	.segment {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.segment button {
		border: none;
		background: transparent;
		color: var(--color-muted);
		font-size: 12px;
		font-family: var(--font-sans);
		padding: 5px 12px;
		cursor: pointer;
	}

	.segment button.active {
		background: var(--card-bg);
		color: var(--color-text);
	}
</style>