<script lang="ts">
	import { drawMap } from '$lib/utils/canvas/map';
	import type { AnalysisState, MapView } from '$lib/components/analysis/state';

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
		map.maybeFit(analysis.currentTrace, width, height, analysis.fitKey, analysis.boundaries);
		// Visible ghosts, each carrying its playhead index — computed once in
		// AnalysisState.compIndices rather than re-searched inside drawMap.
		const ghosts = analysis.compLaps
			.map((c, i) => ({ trace: c.trace, ds: c.ds, color: c.color, idx: analysis.compIndices[i] ?? -1, ghostVisible: c.ghostVisible }))
			.filter(c => c.ghostVisible);
		const interacting = map.isPanning || map.animating;
		drawMap(
			canvas, width, height,
			analysis.currentTrace, analysis.dsTrace,
			map.scale, map.offsetX, map.offsetY,
			analysis.playbackIdx, analysis.boundaries,
			ghosts,
			map.boundaryFix,
			interacting
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