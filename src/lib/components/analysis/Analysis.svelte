<script lang="ts">
	import { getContext, onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import SessionsView from '$lib/components/analysis/views/SessionsView.svelte';
	import TelemetryView from '$lib/components/analysis/views/TelemetryView.svelte';
	import SessionTabs from '$lib/components/analysis/session/SessionTabs.svelte';
	import Settings from '$lib/components/settings/Settings.svelte';
	import { UiState, TabsState } from '$lib/components/analysis/state';
	import type { DataState } from '$lib/state/data.svelte';

	const data       = getContext<DataState>('data');
	const ui         = new UiState();
	const tabsState  = new TabsState(data);

	$effect(() => {
		if (page.url.searchParams.get('settings') === 'open') {
			ui.openSettings();
			replaceState('/analysis', {});
		}
	});

	let tabs = $derived(
		tabsState.tabs.length
			? tabsState.tabs.map(t => ({
					id:       t.id,
					label:    t.label,
					active:   t.id === tabsState.activeId && ui.view === 'telemetry',
					closable: true,
					loading:  t.loading,
				}))
			: [{ id: 'waiting', label: 'Waiting for session', active: true, closable: false, loading: true }]
	);

	function openSession(uuid: string) {
		const lap = data.lapById(uuid);
		if (!lap) return;
		ui.showTelemetry();
		tabsState.open(lap);
	}

	function selectTab(id: string) {
		tabsState.select(id);
		if (tabsState.active) ui.showTelemetry();
	}

	function closeTab(id: string) {
		tabsState.close(id);
		if (!tabsState.tabs.length) ui.showSessions();
	}

	$effect(() => {
		const visible = ui.view === 'telemetry' ? tabsState.active : null;
		const tabs    = tabsState.tabs;
		untrack(() => {
			for (const t of tabs) {
				if (t === visible) t.analysis.activate();
				else t.analysis.deactivate();
			}
		});
	});

	onMount(() => {
		tabsState.restore().then(() => {
			if (tabsState.active) ui.showTelemetry();
		});

		return () => tabsState.destroy();
	});
</script>

<div class="analysis">
	{#if ui.showSettings}
		<Settings
			bind:gamePaths={data.gamePaths}
			bind:appZoom={data.appZoom}
			bind:appZoomAuto={data.appZoomAuto}
			bind:traceZoom={ui.traceZoom}
			bind:graphPlacement={ui.graphPlacement}
			onClose={() => ui.closeSettings()}
		/>
	{/if}

	<SessionTabs {tabs} onSelect={selectTab} onNew={() => ui.showSessions()} onClose={closeTab} />

	{#if ui.view === 'sessions' || !tabsState.active}
		<SessionsView {data} onOpen={openSession} onToggleFavorite={(uuid) => data.toggleFavorite(uuid)} />
	{:else}
		<TelemetryView analysis={tabsState.active.analysis} map={tabsState.active.map} {ui} />
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
