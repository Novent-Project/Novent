<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
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

	// Sidebar's settings button links here as /analysis?settings=open since
	// Settings is scoped to this route's UiState, not a global overlay. Pick
	// it up on arrival, then strip the param so it doesn't reopen on refresh
	// or reappear if the user later closes and reopens via browser back/forward.
	$effect(() => {
		if (page.url.searchParams.get('settings') === 'open') {
			ui.openSettings();
			replaceState('/analysis', {});
		}
	});

	let tabs = $derived(
		analysis.selectedLap
			? [{
					id:       'lap',
					label:    `${formatName(analysis.selectedLap.car)} | ${formatName(analysis.selectedLap.track)}`,
					active:   ui.view === 'telemetry',
					closable: true,
				}]
			: [{ id: 'waiting', label: 'Waiting for session', active: true, closable: false, loading: true }]
	);

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
		// NOTE: ui.handleKeydown may still contain its own Ctrl +/-/0 zoom branch
		// from before appZoom moved to DataState/+layout.svelte. That logic is now
		// dead (nothing reads ui.appZoom anymore) and should be deleted from
		// ui.svelte.ts — left alone here since that file wasn't in scope.
		window.addEventListener('keydown', ui.handleKeydown);
		return () => {
			window.removeEventListener('keydown', ui.handleKeydown);
			analysis.destroy();
			map.destroy();
		};
	});
</script>

<div class="analysis">
	{#if ui.showSettings}
		<Settings
			bind:gamePaths={data.gamePaths}
			bind:appZoom={data.appZoom}
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