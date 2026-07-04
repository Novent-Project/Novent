<script lang="ts">
	import TrackMap from '$lib/components/analysis/components/map/TrackMap.svelte';
	import SessionHeaderCard from '$lib/components/analysis/components/session/SessionHeaderCard.svelte';
	import StandingsCard from '$lib/components/analysis/components/results/StandingsCard.svelte';
	import TelemetryWidget from '$lib/components/analysis/components/telemetry/TelemetryWidget.svelte';
	import ComparisonPicker from '$lib/components/analysis/components/session/ComparisonPicker.svelte';
	import SegmentMap from '$lib/components/analysis/components/map/SegmentMap.svelte';
	import SectorComparison from '$lib/components/analysis/components/results/SectorComparison.svelte';
	import ZoomControl from '$lib/components/analysis/components/map/ZoomControl.svelte';
	import HudPlaybar from '$lib/components/analysis/components/telemetry/HudPlaybar.svelte';
	import { ZOOM_UI_MIN, ZOOM_UI_MAX, type AnalysisState, type MapView, type UiState } from '$lib/components/analysis/state';

	interface Props {
		analysis: AnalysisState;
		map:      MapView;
		ui:       UiState;
	}

	let { analysis, map, ui }: Props = $props();

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
			<StandingsCard entries={analysis.standings} />
		</div>

		<div class="ov ov-topcenter">
			<div class="tel-slot">
				<TelemetryWidget driver={analysis.primaryDriver} />
			</div>
			<div class="tel-slot">
				<ComparisonPicker
					driver={analysis.compDriver}
					candidates={analysis.compCandidates}
					onPick={(lap) => analysis.addCompLap(lap)}
					onRemove={() => analysis.removeComp()}
				/>
			</div>
		</div>

		<div class="ov ov-topright">
			<SegmentMap {analysis} />
		</div>

		<div class="ov ov-bottomleft">
			<SectorComparison sectors={analysis.sectors} />
		</div>

		<div class="ov ov-bottomcenter">
			<ZoomControl value={map.zoomLevel} min={ZOOM_UI_MIN} max={ZOOM_UI_MAX} onChange={(v) => map.setZoom(v)} />
		</div>
	</div>

	<HudPlaybar {analysis} />
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

	.ov-topcenter {
		top: 14px;
		left: 328px;
		right: 328px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: flex-start;
	}

	.ov-topright {
		top: 14px;
		right: 14px;
		width: 300px;
		height: 244px;
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

	.tel-slot { flex: 1 1 320px; min-width: 320px; }
</style>