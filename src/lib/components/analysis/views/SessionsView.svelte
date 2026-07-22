<script lang="ts">
	import PastSessions from '$lib/components/analysis/session/PastSessions.svelte';
	import { formatDateTime, formatName, parseLapTime } from '$lib/utils';
	import type { DataState } from '$lib/state/data.svelte';

	interface Props {
		data:             DataState;
		onOpen:           (uuid: string) => void;
		onToggleFavorite: (uuid: string) => void;
	}

	let { data, onOpen, onToggleFavorite }: Props = $props();

	let sessions = $derived.by(() => {
		const groups = new Map<string, {
			id: string;
			game: string;
			car: string;
			track: string;
			driver: string;
			bestSec: number;
			bestLap: string;
			laps: { uuid: string; date: string; lapTime: string; favorite: boolean; ms: number }[];
		}>();

		for (const l of data.laps) {
			const id = l.session_id || l.uuid;
			let g = groups.get(id);
			if (!g) {
				g = {
					id,
					game:    l.game,
					car:     l.car,
					track:   l.track,
					driver:  l.player_name || 'You',
					bestSec: Infinity,
					bestLap: '',
					laps:    [],
				};
				groups.set(id, g);
			}
			const ms = l.date_time ? new Date(l.date_time).getTime() : 0;
			const sec = parseLapTime(l.lap_time || l.time || '');
			if (sec > 0 && sec < g.bestSec) {
				g.bestSec = sec;
				g.bestLap = l.lap_time || l.time || '';
			}
			g.laps.push({
				uuid:     l.uuid,
				date:     formatDateTime(l.date_time),
				lapTime:  l.lap_time || l.time || '—',
				favorite: data.isFavorite(l.uuid),
				ms,
			});
		}

		const list = [...groups.values()]
			.map(g => {
				const laps = [...g.laps].sort((a, b) => b.ms - a.ms);
				return {
					id:      g.id,
					game:    g.game,
					car:     g.car,
					track:   g.track,
					driver:  g.driver,
					date:    laps[0]?.date ?? '—',
					bestLap: g.bestLap || '—',
					laps,
				};
			})
			.sort((a, b) => (b.laps[0]?.ms ?? 0) - (a.laps[0]?.ms ?? 0));

		const favLaps = data.laps
			.filter(l => data.isFavorite(l.uuid))
			.map(l => ({
				uuid:     l.uuid,
				date:     formatDateTime(l.date_time),
				lapTime:  l.lap_time || l.time || '—',
				favorite: true,
				ms:       l.date_time ? new Date(l.date_time).getTime() : 0,
				label:    `${formatName(l.car)} · ${formatName(l.track)}`,
			}))
			.sort((a, b) => b.ms - a.ms);

		if (!favLaps.length) return list;

		let bestSec = Infinity;
		let bestLap = '—';
		for (const l of favLaps) {
			const sec = parseLapTime(l.lapTime);
			if (sec > 0 && sec < bestSec) {
				bestSec = sec;
				bestLap = l.lapTime;
			}
		}

		return [
			{
				id:      '__favorites__',
				kind:    'favorites' as const,
				game:    '',
				car:     'Favorites',
				track:   favLaps.length === 1 ? '1 lap across all sessions' : `${favLaps.length} laps across all sessions`,
				driver:  'You',
				date:    favLaps[0].date,
				bestLap,
				laps:    favLaps,
			},
			...list,
		];
	});
</script>

<div class="sessions-page">
	<PastSessions {sessions} {onOpen} {onToggleFavorite} />
</div>

<style>
	.sessions-page {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>
