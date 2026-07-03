<script lang="ts">
	import { onMount } from 'svelte';
	import Splashscreen from '$lib/components/layout/Splashscreen.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Settings from '$lib/components/settings/Settings.svelte';
	import SessionsView from './views/SessionsView.svelte';
	import TelemetryView from './views/TelemetryView.svelte';
	import { UiState, DataState, AnalysisState, MapView } from './state';
	import { formatName } from '$lib/utils';

	const ui       = new UiState();
	const data     = new DataState();
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
		data.start();
		return () => {
			window.removeEventListener('keydown', ui.handleKeydown);
			data.destroy();
			analysis.destroy();
			map.destroy();
		};
	});
</script>

<Splashscreen ready={data.loaded} />

<div
	class="app"
	style="transform: scale({ui.appZoom}); transform-origin: 0 0; width: {100 / ui.appZoom}%; height: {100 / ui.appZoom}vh;"
>
	{#if ui.showSettings}
		<Settings
			bind:gamePaths={data.gamePaths}
			bind:appZoom={ui.appZoom}
			bind:traceZoom={ui.traceZoom}
			onClose={() => ui.closeSettings()}
		/>
	{/if}

	<Header
		{tabs}
		connected={data.connected}
		game={data.game}
		onSelect={selectTab}
		onNew={() => ui.showSessions()}
		onClose={closeTab}
	/>

	{#if ui.view === 'sessions'}
		<SessionsView {data} onOpen={openSession} onToggleFavorite={(uuid) => data.toggleFavorite(uuid)} />
	{:else}
		<TelemetryView {analysis} {map} {ui} />
	{/if}
</div>

<style>
	.app {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
		background: var(--color-bg);
	}
</style>
