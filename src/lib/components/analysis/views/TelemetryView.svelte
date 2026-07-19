<script lang="ts">
	import TrackMap from '$lib/components/analysis/map/TrackMap.svelte';
	import SessionHeaderCard from '$lib/components/analysis/session/SessionHeaderCard.svelte';
	import StandingsCard from '$lib/components/analysis/results/StandingsCard.svelte';
	import TelemetryWidget from '$lib/components/analysis/telemetry/TelemetryWidget.svelte';
	import SegmentMap from '$lib/components/analysis/map/SegmentMap.svelte';
	import SectorComparison from '$lib/components/analysis/results/SectorComparison.svelte';
	import ZoomControl from '$lib/components/analysis/map/ZoomControl.svelte';
	import HudPlaybar from '$lib/components/analysis/telemetry/HudPlaybar.svelte';
	import GraphSidebar from '$lib/components/analysis/telemetry/GraphSidebar.svelte';
	import GForceWidget from '$lib/components/analysis/telemetry/GForceWidget.svelte';
	import { fly } from 'svelte/transition';
	import { ZOOM_UI_MIN, ZOOM_UI_MAX, MAX_COMP_LAPS, type AnalysisState, type MapView, type UiState } from '$lib/components/analysis/state';
	import { draggable } from '$lib/utils';

	interface Props {
		analysis: AnalysisState;
		map:      MapView;
		ui:       UiState;
	}

	let { analysis, map, ui }: Props = $props();

	let graphsOpen = $state(false);

</script>

<div class="hud">
	<div class="hud-main" data-drag-bounds>
		<TrackMap {analysis} {map} />

		<div class="ov ov-topleft">
			<div use:draggable={'session-header'}>
				<SessionHeaderCard
					lap={analysis.selectedLap}
					onPlay={() => analysis.togglePlayback()}
					onSetup={() => ui.openSettings()}
				/>
			</div>
			<div use:draggable={'standings'}>
				<StandingsCard
					entries={analysis.standings}
					candidates={analysis.compCandidates}
					onAddComparison={(lap) => analysis.addCompLap(lap)}
					onRemoveComparison={(uuid) => analysis.removeCompLap(uuid)}
					maxReached={analysis.compLaps.length >= MAX_COMP_LAPS}
				/>
			</div>
			<div class="segment-slot" use:draggable={'segment-map'}>
				<SegmentMap {analysis} />
			</div>
		</div>

		<div class="ov ov-telemetry">
			{#if analysis.selectedLap}
				<div class="tel-slot" use:draggable={'telemetry-primary'}>
					<TelemetryWidget driver={analysis.primaryDriver} />
				</div>
			{/if}
			{#each analysis.compEntries as entry, i (entry.uuid)}
				<div class="tel-slot" use:draggable={{ key: `telemetry-comp-${i}`, persist: false }}>
					<TelemetryWidget
						driver={entry.driver}
						ghostVisible={entry.ghostVisible}
						onToggleGhost={() => analysis.toggleGhost(entry.uuid)}
					/>
				</div>
			{/each}
		</div>

		<div class="ov ov-bottomleft">
			<div use:draggable={'g-force'}>
				<GForceWidget {analysis} />
			</div>
			<div use:draggable={'sector-comparison'}>
				<SectorComparison sectors={analysis.sectors} />
			</div>
		</div>

		<div class="ov ov-bottomcenter">
			<div use:draggable={'zoom-control'}>
				<ZoomControl value={map.zoomLevel} min={ZOOM_UI_MIN} max={ZOOM_UI_MAX} onChange={(v) => map.setZoom(v)} />
			</div>
		</div>

		{#if graphsOpen && ui.graphPlacement === 'side'}
			<div class="ov ov-right" transition:fly={{ x: 380, duration: 260 }}>
				<GraphSidebar {analysis} {map} onClose={() => (graphsOpen = false)} />
			</div>
		{/if}
	</div>

	<HudPlaybar
		{analysis}
		{graphsOpen}
		placement={ui.graphPlacement}
		onToggleGraphs={() => (graphsOpen = !graphsOpen)}
	/>
</div>

<style>
	.hud {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.hud-main {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.ov { position: absolute; z-index: 5; pointer-events: none; }
	.ov > :global(*) { pointer-events: auto; }

	.ov-topleft {
		top: 14px;
		left: 14px;
		width: 300px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.ov-telemetry {
		top: 14px;
		left: 328px;
		width: 280px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.ov-bottomleft {
		left: 14px;
		bottom: 14px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.ov-bottomleft :global(.sector-comparison) {
		width: 258px;
	}

	.ov-bottomcenter {
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
	}

	.ov-right {
		top: 14px;
		right: 14px;
		bottom: 14px;
		z-index: 6;
		width: 340px;
	}

	.ov-right > :global(.graph-sidebar) {
		height: 100%;
	}

	.tel-slot {
		flex: 0 0 auto;
		width: 280px;
	}

	.segment-slot {
		flex: 0 0 auto;
		width: 300px;
		height: 244px;
	}
</style>
