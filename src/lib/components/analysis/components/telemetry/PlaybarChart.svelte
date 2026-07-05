<script lang="ts">
	import type { Snippet } from 'svelte';

	interface CompLine {
		color: string;
		line: string;
	}

	interface Props {
		label: string;
		icon: Snippet;
		width: number;
		height: number;
		color: string;
		line: string;
		area?: string;
		/** One entry per currently-visible comparison lap — was a single
		 *  compColor/compLine pair, which meant only ever the first
		 *  comparison lap could be drawn no matter how many were added. */
		compLines?: CompLine[];
		/** Horizontal zoom factor applied to the plotted content (1 = fit). */
		zoom?: number;
		/** Left edge of the visible window, in local (unzoomed) chart units. */
		panX?: number;
		/** Identifies this row for the parent's per-row hover tooltip (see
		 *  data-channel below) — purely a hook for HudPlaybar, unused here. */
		channel?: string;
	}

	let {
		label,
		icon,
		width,
		height,
		color,
		line,
		area = '',
		compLines = [],
		zoom = 1,
		panX = 0,
		channel = undefined
	}: Props = $props();

	// All plotted content lives in one local coordinate space, 0..width,
	// matching buildChartLine's output. Panning and zooming are just a
	// transform on top of that — never a recompute of the path data — so
	// this stays cheap even while dragging.
	//
	// Note: the playhead and hover crosshair are NOT drawn here anymore.
	// Each row used to draw its own copy, which made a single vertical line
	// look "broken" across the row gaps — those now live in one continuous
	// overlay in the parent (HudPlaybar) that spans all three rows.
	let contentTransform = $derived(`translate(${(-panX * zoom).toFixed(2)} 0) scale(${zoom} 1)`);
</script>

<div class="grid-label">
	<span class="chart-icon">{@render icon()}</span>
	<span>{label}</span>
</div>

<div class="grid-track" style="height:{height}px" data-channel={channel}>
	{#if width > 0}
		<svg viewBox="0 0 {width} {height}" preserveAspectRatio="none">
			<g transform={contentTransform}>
				{#if area}<path d={area} class="area" style="fill:{color}" />{/if}
				{#each compLines as c (c.color)}
					{#if c.line}<path d={c.line} class="line comp" style="stroke:{c.color}" />{/if}
				{/each}
				{#if line}<path d={line} class="line" style="stroke:{color}" />{/if}
			</g>
		</svg>
	{/if}
</div>

<style>
	.grid-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
		color: var(--color-text);
		white-space: nowrap;
	}

	.chart-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		color: var(--color-muted);
	}

	.chart-icon :global(svg) {
		width: 14px;
		height: 14px;
	}

	.grid-track {
		position: relative;
		height: 100%;
		overflow: hidden;
	}

	svg {
		display: block;
		width: 100%;
		height: 100%;
		/* Zoomed/panned content can extend past the local 0..width box —
		   clip it instead of letting it bleed into neighboring rows. */
		overflow: hidden;
	}

	.area {
		opacity: 0.16;
	}

	.line {
		fill: none;
		stroke-width: 1.75;
		stroke-linejoin: round;
		stroke-linecap: round;
		/* Keeps stroke width visually constant under the group's horizontal
		   scale, so zoomed-in lines don't get thinner. */
		vector-effect: non-scaling-stroke;
	}

	.line.comp {
		stroke-width: 1.5;
		opacity: 0.85;
	}
</style>