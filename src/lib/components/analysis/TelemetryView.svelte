<script lang="ts">
	import TrackMap from '$lib/components/analysis/components/map/TrackMap.svelte';
	import SessionHeaderCard from '$lib/components/analysis/components/session/SessionHeaderCard.svelte';
	import StandingsCard from '$lib/components/analysis/components/results/StandingsCard.svelte';
	import TelemetryWidget from '$lib/components/analysis/components/telemetry/TelemetryWidget.svelte';
	import SegmentMap from '$lib/components/analysis/components/map/SegmentMap.svelte';
	import SectorComparison from '$lib/components/analysis/components/results/SectorComparison.svelte';
	import ZoomControl from '$lib/components/analysis/components/map/ZoomControl.svelte';
	import HudPlaybar from '$lib/components/analysis/components/telemetry/HudPlaybar.svelte';
	import GraphSidebar from '$lib/components/analysis/components/telemetry/GraphSidebar.svelte';
	import { ZOOM_UI_MIN, ZOOM_UI_MAX, MAX_COMP_LAPS, type AnalysisState, type MapView, type UiState } from '$lib/components/analysis/state';

	interface Props {
		analysis: AnalysisState;
		map:      MapView;
		ui:       UiState;
	}

	let { analysis, map, ui }: Props = $props();

	// Two competing designs for where the telemetry graphs live — inline
	// under the playbar, or docked as a sidebar — toggled from the button
	// on HudPlaybar. Owned here (rather than in HudPlaybar) since it's
	// this component that decides whether GraphSidebar renders at all.
	let graphMode = $state<'playbar' | 'sidebar'>('playbar');

	// TODO(nav): IconRail removed along with chrome/. Sessions/Telemetry/Settings still
	// work — closing the lap tab in SessionTabs (see +page.svelte) returns to Sessions,
	// and Settings opens via SessionHeaderCard's onSetup below — but there's no longer a
	// persistent, always-visible way to switch modes. That should live in a proper tab
	// bar once SessionTabs grows Sessions/Settings tabs of its own.
</script>

<div class="hud">
	<div class="hud-main">
		<TrackMap {analysis} {map} />

		<div class="ov ov-topleft">
			<SessionHeaderCard
				lap={analysis.selectedLap}
				onPlay={() => analysis.togglePlayback()}
				onSetup={() => ui.openSettings()}
			/>
			<StandingsCard
				entries={analysis.standings}
				candidates={analysis.compCandidates}
				onAddComparison={(lap) => analysis.addCompLap(lap)}
				onRemoveComparison={(uuid) => analysis.removeCompLap(uuid)}
				maxReached={analysis.compLaps.length >= MAX_COMP_LAPS}
			/>
		</div>

		<div class="ov ov-topright">
			{#if analysis.selectedLap}
				<div class="tel-slot">
					<TelemetryWidget driver={analysis.primaryDriver} />
				</div>
			{/if}
			{#each analysis.compEntries as entry (entry.uuid)}
				<div class="tel-slot">
					<TelemetryWidget
						driver={entry.driver}
						ghostVisible={entry.ghostVisible}
						onToggleGhost={() => analysis.toggleGhost(entry.uuid)}
					/>
				</div>
			{/each}
			<div class="segment-slot">
				<SegmentMap {analysis} />
			</div>
		</div>

		<div class="ov ov-bottomleft">
			<SectorComparison sectors={analysis.sectors} />
		</div>

		<div class="ov ov-bottomcenter">
			<ZoomControl value={map.zoomLevel} min={ZOOM_UI_MIN} max={ZOOM_UI_MAX} onChange={(v) => map.setZoom(v)} />
		</div>

		{#if graphMode === 'sidebar'}
			<div class="ov ov-right">
				<GraphSidebar {analysis} onClose={() => (graphMode = 'playbar')} />
			</div>
		{/if}
	</div>

	<HudPlaybar {analysis} {graphMode} onToggleGraphMode={() => (graphMode = graphMode === 'playbar' ? 'sidebar' : 'playbar')} />
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

	/* Right-anchored row: telemetry widgets pack against the right edge,
	   sized to their own content, with the segment map as the last
	   (rightmost) item. Wraps to a second line if enough comparisons
	   are added that it can't all fit on one. */
	.ov-topright {
		top: 14px;
		left: 328px;
		right: 14px;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: flex-start;
		gap: 12px;
	}

	.ov-bottomleft {
		left: 14px;
		bottom: 14px;
		width: 258px;
	}

	.ov-bottomcenter {
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
	}

	/* Docked graph sidebar — the "other" of the two competing designs.
	   Sits above ov-topright/ov-bottomleft when open; this is a first pass
	   for comparing the two modes, not final layout arbitration between
	   them. */
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

	/* Content-sized, not stretched — each widget takes only the width it
	   needs rather than growing to fill the row. */
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