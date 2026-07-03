<script lang="ts">
	import { drawMap } from '$lib/canvas/map';
	import type { AnalysisState, MapView } from '$lib/analysis/state';

	interface Props {
		analysis: AnalysisState;
		map:      MapView;
	}

	let { analysis, map }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let width  = $state(0);
	let height = $state(0);

	$effect(() => {
		if (!canvas || width === 0 || height === 0 || !analysis.currentTrace.worldX.length) return;
		map.maybeFit(analysis.currentTrace, width, height, analysis.fitKey);
		drawMap(
			canvas, width, height,
			analysis.currentTrace, analysis.dsTrace,
			map.scale, map.offsetX, map.offsetY,
			analysis.playbackIdx, analysis.boundaries, analysis.compLaps,
		);
	});
</script>

<div
	class="track-view"
	class:panning={map.isPanning}
	role="application"
	aria-label="Track map"
	bind:clientWidth={width}
	bind:clientHeight={height}
	onwheel={(e) => map.onWheel(e)}
	onpointerdown={(e) => map.onPointerDown(e)}
	onpointermove={(e) => map.onPointerMove(e)}
	onpointerup={(e) => map.onPointerUp(e)}
>
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.track-view {
		position: absolute;
		inset: 0;
		cursor: grab;
		touch-action: none;
	}

	.track-view.panning { cursor: grabbing; }

	.track-view canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
</style>
