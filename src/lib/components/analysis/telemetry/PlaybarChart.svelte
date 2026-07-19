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
		compLines?: CompLine[];
		zoom?: number;
		panX?: number;
		channel?: string;
		midline?: boolean;
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
		channel = undefined,
		midline = false
	}: Props = $props();

	let contentTransform = $derived(`translate(${(-panX * zoom).toFixed(2)} 0) scale(${zoom} 1)`);
</script>

<div class="grid-label">
	<span class="chart-icon">{@render icon()}</span>
	<span>{label}</span>
</div>

<div class="grid-track" style="height:{height}px" data-channel={channel}>
	{#if width > 0}
		<svg viewBox="0 0 {width} {height}" preserveAspectRatio="none">
			{#if midline}<line class="midline" x1="0" x2={width} y1={height / 2} y2={height / 2} />{/if}
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
		vector-effect: non-scaling-stroke;
	}

	.line.comp {
		stroke-width: 1.5;
		opacity: 0.85;
	}

	.midline {
		stroke: var(--color-border-md);
		stroke-width: 1;
		stroke-dasharray: 4 4;
	}
</style>
