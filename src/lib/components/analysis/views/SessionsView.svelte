<script lang="ts">
	import PastSessions from '$lib/components/analysis/session/PastSessions.svelte';
	import { formatDateTime } from '$lib/utils';
	import type { DataState } from '$lib/state/data.svelte';

	interface Props {
		data:             DataState;
		onOpen:           (uuid: string) => void;
		onToggleFavorite: (uuid: string) => void;
	}

	let { data, onOpen, onToggleFavorite }: Props = $props();

	let rows = $derived(
		data.laps.map(l => ({
			uuid:     l.uuid,
			game:     l.game,
			car:      l.car,
			track:    l.track,
			driver:   l.player_name || 'You',
			date:     formatDateTime(l.date_time),
			lapTime:  l.lap_time || l.time || '—',
			favorite: data.isFavorite(l.uuid),
		}))
	);
</script>

<div class="sessions-page">
	<PastSessions sessions={rows} {onOpen} {onToggleFavorite} />
</div>

<style>
	.sessions-page {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>