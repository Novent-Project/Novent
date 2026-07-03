<script lang="ts">
	import TrackMap from '$lib/analysis/components/TrackMap.svelte';
	import SessionHeaderCard from '$lib/analysis/components/SessionHeaderCard.svelte';
	import StandingsCard from '$lib/analysis/components/StandingsCard.svelte';
	import TelemetryWidget from '$lib/analysis/components/TelemetryWidget.svelte';
	import ComparisonPicker from '$lib/analysis/components/ComparisonPicker.svelte';
	import SegmentMap from '$lib/analysis/components/SegmentMap.svelte';
	import SectorComparison from '$lib/analysis/components/SectorComparison.svelte';
	import IconRail from '$lib/analysis/components/IconRail.svelte';
	import ZoomControl from '$lib/analysis/components/ZoomControl.svelte';
	import HudPlaybar from '$lib/analysis/components/HudPlaybar.svelte';
	import { gearLabel, formatDateTime } from '$lib/utils';
	import { ZOOM_UI_MIN, ZOOM_UI_MAX, type AnalysisState, type MapView, type UiState } from '$lib/analysis/state';

	interface Props {
		analysis: AnalysisState;
		map:      MapView;
		ui:       UiState;
	}

	let { analysis, map, ui }: Props = $props();

	let railItems = $derived([
		{ key: 'flag',      label: 'Sessions',    active: ui.view === 'sessions' },
		{ key: 'telemetry', label: 'Telemetry',   active: ui.view === 'telemetry' },
		{ key: 'setup',     label: 'Settings',    active: ui.showSettings },
		{ key: 'fuel',      label: 'Fuel (soon)', active: false },
	]);

	function railSelect(key: string) {
		if (key === 'flag') ui.showSessions();
		else if (key === 'telemetry') { if (analysis.selectedLap) ui.showTelemetry(); }
		else if (key === 'setup') ui.openSettings();
	}
</script>

<div class="hud">
	<div class="hud-main">
		<TrackMap {analysis} {map} />

		<div class="ov ov-topleft">
			<SessionHeaderCard
				car={analysis.selectedLap?.car ?? ''}
				track={analysis.selectedLap?.track ?? ''}
				game={analysis.selectedLap?.game ?? ''}
				dateTime={formatDateTime(analysis.selectedLap?.date_time)}
				airTemp={analysis.selectedLap?.air_temp}
				roadTemp={analysis.selectedLap?.road_temp}
				mode={analysis.selectedLap?.session_type || analysis.selectedLap?.tyre_compound || undefined}
				onPlay={() => analysis.togglePlayback()}
				onSetup={() => ui.openSettings()}
			/>
			<StandingsCard entries={analysis.standings} />
		</div>

		<div class="ov ov-topcenter">
			<div class="tel-slot">
				<TelemetryWidget
					name={analysis.driverName}
					color="#10b981"
					stint={1}
					lap={analysis.selectedLap?.completed_laps ?? 1}
					lapTime={analysis.selectedLap?.lap_time ?? '—'}
					throttle={analysis.primarySample.throttle}
					brake={analysis.primarySample.brake}
					speed={analysis.primarySample.speed}
					gear={gearLabel(analysis.primarySample.gear)}
					rpm={analysis.primarySample.rpm}
				/>
			</div>
			<div class="tel-slot">
				<ComparisonPicker
					comp={analysis.compLaps[0] ?? null}
					sample={analysis.compSample}
					candidates={analysis.compCandidates}
					onPick={(lap) => analysis.addCompLap(lap)}
					onRemove={() => analysis.removeComp()}
				/>
			</div>
		</div>

		<div class="ov ov-topright">
			<SegmentMap
				worldX={analysis.currentTrace.worldX}
				worldZ={analysis.currentTrace.worldZ}
				normPos={analysis.currentTrace.normPos}
				segments={analysis.segments}
				currentSegment={analysis.currentSegment}
				label={`Segment ${analysis.currentSegment + 1}`}
				delta={analysis.segDelta}
			/>
		</div>

		<div class="ov ov-leftrail">
			<IconRail items={railItems} onSelect={railSelect} />
		</div>

		<div class="ov ov-bottomleft">
			<SectorComparison sectors={analysis.sectors} />
		</div>

		<div class="ov ov-bottomcenter">
			<ZoomControl value={map.zoomLevel} min={ZOOM_UI_MIN} max={ZOOM_UI_MAX} onChange={(v) => map.setZoom(v)} />
		</div>
	</div>

	<HudPlaybar
		playing={analysis.isPlaying}
		time={analysis.currentTime}
		total={analysis.resolvedLapTime}
		delta={analysis.liveDeltaValue}
		distance={analysis.distanceGap}
		mode={analysis.playMode}
		showGhost={analysis.showGhost}
		onPlay={() => analysis.togglePlayback()}
		onStepBack={() => analysis.seek(analysis.currentTime - 1)}
		onStepFwd={() => analysis.seek(analysis.currentTime + 1)}
		onSeek={(t) => analysis.seek(t)}
		onMode={(m) => analysis.setPlayMode(m)}
		onToggleGhost={() => analysis.toggleGhost()}
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

	.ov-leftrail {
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
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