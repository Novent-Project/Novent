<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import SessionsView from '$lib/components/analysis/SessionsView.svelte';
	import TelemetryView from '$lib/components/analysis/TelemetryView.svelte';
	import SessionTabs from '$lib/components/analysis/components/session/SessionTabs.svelte';
	import Settings from '$lib/components/settings/Settings.svelte';
	import { UiState, AnalysisState, MapView } from '$lib/components/analysis/state';
	import type { DataState } from '$lib/state/data.svelte';
	import { formatName } from '$lib/utils';

	const data = getContext<DataState>('data');
	const ui       = new UiState();
	const analysis = new AnalysisState(data);
	const map      = new MapView();

	let tabs = $derived([
		{ id: 'waiting', label: 'Waiting for session', active: false, closable: false },
		...(analysis.selectedLap
			? [{
					id:       'lap',
					label:    `${formatName(analysis.selectedLap.car)} | ${formatName(analysis.selectedLap.track)}`,
					active:   ui.view === 'telemetry',
					closable: true,
				}]
			: []),
	]);

	function openSession(uuid: string) {
		const lap = data.lapById(uuid);
		if (!lap) return;
		ui.showTelemetry();
		analysis.selectLap(lap);
	}

	function selectTab(id: string) {
		if (id === 'lap' && analysis.selectedLap) ui.showTelemetry();
	}

	function closeTab(id: string) {
		if (id !== 'lap') return;
		analysis.clear();
		ui.showSessions();
	}

	onMount(() => {
		window.addEventListener('keydown', ui.handleKeydown);
		return () => {
			window.removeEventListener('keydown', ui.handleKeydown);
			analysis.destroy();
			map.destroy();
		};
	});
</script>

<div
	class="analysis"
	style="transform: scale({ui.appZoom}); transform-origin: 0 0; width: {100 / ui.appZoom}%; height: {100 / ui.appZoom}%;"
>
	{#if ui.showSettings}
		<Settings
			bind:gamePaths={data.gamePaths}
			bind:appZoom={ui.appZoom}
			bind:traceZoom={ui.traceZoom}
			onClose={() => ui.closeSettings()}
		/>
	{/if}

	<SessionTabs {tabs} onSelect={selectTab} onNew={() => ui.showSessions()} onClose={closeTab} />

	{#if ui.view === 'sessions'}
		<SessionsView {data} onOpen={openSession} onToggleFavorite={(uuid) => data.toggleFavorite(uuid)} />
	{:else}
		<TelemetryView {analysis} {map} {ui} />
	{/if}
</div>

<style>
	.analysis {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}
</style>