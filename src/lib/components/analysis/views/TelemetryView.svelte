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

	const HUD_INSETS = 44;
	const HUD_MIN_W = 622;
	const CHROME_H = 160;
	const CHROME_W = 60;

	let graphsOpen = $state(false);
	let hudW = $state(0);
	let hudH = $state(0);
	let topStackH = $state(0);
	let bottomStackH = $state(0);
	let hudRequiredH = $derived(topStackH + bottomStackH + HUD_INSETS);
	let hudScaleTarget = $derived(
		Math.min(
			1,
			hudH > 0 && hudRequiredH > HUD_INSETS ? (hudH + CHROME_H) / (hudRequiredH + CHROME_H) : 1,
			hudW > 0 ? (hudW + CHROME_W) / (HUD_MIN_W + CHROME_W) : 1
		)
	);
	let hudScale = $state(1);
	$effect(() => {
		const t = hudScaleTarget;
		if (t === 1 || Math.abs(t - hudScale) > 0.01) hudScale = t;
	});

</script>

<div class="hud">
	<div class="hud-main" data-drag-bounds bind:clientWidth={hudW} bind:clientHeight={hudH}>
		<TrackMap {analysis} {map} />

		<div class="ov ov-topleft" style:zoom={hudScale} bind:clientHeight={topStackH}>
			<div use:draggable={'session-header'}>
				<SessionHeaderCard lap={analysis.selectedLap} />
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

		<div class="ov ov-telemetry" style:zoom={hudScale}>
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

		<div class="ov ov-bottomleft" style:zoom={hudScale} bind:clientHeight={bottomStackH}>
			<div use:draggable={'g-force'}>
				<GForceWidget {analysis} />
			</div>
			<div use:draggable={'sector-comparison'}>
				<SectorComparison sectors={analysis.sectors} />
			</div>
		</div>

		<div class="ov ov-bottomcenter" style:zoom={hudScale}>
			<div use:draggable={'zoom-control'}>
				<ZoomControl value={map.zoomLevel} min={ZOOM_UI_MIN} max={ZOOM_UI_MAX} onChange={(v) => map.setZoom(v)} />
			</div>
		</div>

		{#if graphsOpen && ui.graphPlacement === 'side'}
			<div class="ov ov-right" style:zoom={hudScale} transition:fly={{ x: 380, duration: 260 }}>
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
		min-width: 258px;
		width: max-content;
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
