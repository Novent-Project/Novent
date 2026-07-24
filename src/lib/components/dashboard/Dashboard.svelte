<script lang="ts">
	import { getContext } from 'svelte';
	import type { DataState } from '$lib/state/data.svelte';
	import { fetchTelemetry } from '$lib/api';
	import { parseLapTime } from '$lib/utils';
	import type { Trace } from '$lib/utils/canvas/shared';
	import StatCard from '$lib/components/dashboard/widgets/StatCard.svelte';
	import PeripheralsCard from '$lib/components/dashboard/widgets/PeripheralsCard.svelte';
	import LatestSessionCard from '$lib/components/dashboard/widgets/LatestSessionCard.svelte';
	import MostUsedCarCard from '$lib/components/dashboard/widgets/MostUsedCarCard.svelte';
	import ActivityHeatmap from '$lib/components/dashboard/widgets/ActivityHeatmap.svelte';
	import CarShowroomCard from '$lib/components/dashboard/widgets/CarShowroomCard.svelte';

	const data = getContext<DataState>('data');

	let monthlyLaps = $derived.by(() => {
		const now = new Date();
		return data.laps.filter(l => {
			if (!l.date_time) return false;
			const d = new Date(l.date_time);
			return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
		}).length;
	});

	let sortedLaps = $derived(
		[...data.laps].sort((a, b) => (b.date_time ?? '').localeCompare(a.date_time ?? ''))
	);

	let latest = $derived(
		sortedLaps[0]
			? {
					car:     sortedLaps[0].car,
					track:   sortedLaps[0].track,
					game:    sortedLaps[0].game,
					type:    sortedLaps[0].session_type,
					bestLap: sortedLaps[0].lap_time,
				}
			: null
	);

	let latestUuid = $derived(sortedLaps[0]?.uuid ?? null);
	let latestTrace = $state<Trace | null>(null);
	let heroShot = $state<string | null>(null);
	let rearShot = $state<string | null>(null);

	$effect(() => {
		const uuid = latestUuid;
		if (!uuid) {
			latestTrace = null;
			return;
		}
		let cancelled = false;
		fetchTelemetry(uuid)
			.then(t => {
				if (cancelled) return;
				latestTrace = {
					gas:     t.gas,
					brake:   t.brake,
					steer:   t.steering,
					normPos: t.normalizedCarPosition,
					worldX:  t.worldX,
					worldZ:  t.worldZ,
					time:    t.time,
					speed:   t.speedKmh,
					gear:    t.gear,
					rpm:     t.rpms,
					accLat:  t.accLat ?? [],
					accLon:  t.accLon ?? [],
				};
			})
			.catch(() => {
				if (!cancelled) latestTrace = null;
			});
		return () => { cancelled = true; };
	});

	function formatRelative(ms: number): string {
		const days = Math.floor((Date.now() - ms) / 86_400_000);
		if (days <= 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days}d ago`;
		if (days < 30) return `${Math.floor(days / 7)}w ago`;
		return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	let topCar = $derived.by(() => {
		if (!data.laps.length) return null;
		const byCar = new Map<string, {
			laps: number; game: string; tracks: Map<string, number>;
			bestSec: number; bestLap: string; lastMs: number;
		}>();
		for (const l of data.laps) {
			let e = byCar.get(l.car);
			if (!e) {
				e = { laps: 0, game: l.game, tracks: new Map(), bestSec: Infinity, bestLap: '', lastMs: -Infinity };
				byCar.set(l.car, e);
			}
			e.laps += 1;
			e.tracks.set(l.track, (e.tracks.get(l.track) ?? 0) + 1);
			const t = parseLapTime(l.lap_time);
			if (t > 0 && t < e.bestSec) {
				e.bestSec  = t;
				e.bestLap  = l.lap_time;
			}
			const ms = l.date_time ? new Date(l.date_time).getTime() : NaN;
			if (!isNaN(ms) && ms > e.lastMs) e.lastMs = ms;
		}
		const top = [...byCar.entries()].sort((a, b) => b[1].laps - a[1].laps)[0];
		if (!top) return null;
		const [car, v] = top;
		const track = [...v.tracks.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
		return {
			car,
			game:       v.game,
			laps:       v.laps,
			bestLap:    v.bestLap || '—',
			track,
			lastDriven: isFinite(v.lastMs) ? formatRelative(v.lastMs) : '—',
		};
	});

	let activityStats = $derived.by(() => {
		if (!data.laps.length) return null;
		const byGame = new Map<string, number>();
		const byTrack = new Map<string, number>();
		let best = '';
		let bestSec = Infinity;
		for (const l of data.laps) {
			byGame.set(l.game, (byGame.get(l.game) ?? 0) + 1);
			byTrack.set(l.track, (byTrack.get(l.track) ?? 0) + 1);
			const t = parseLapTime(l.lap_time);
			if (t > 0 && t < bestSec) {
				bestSec = t;
				best = l.lap_time;
			}
		}
		const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
		return {
			game:      top(byGame),
			track:     top(byTrack),
			totalLaps: data.laps.length,
			bestLap:   best || '—',
		};
	});

	let heatmapEntries = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const l of data.laps) {
			const key = l.date_time?.slice(0, 10);
			if (!key) continue;
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		return [...counts.entries()].map(([date, value]) => ({ date, value }));
	});
</script>

<div class="dashboard">
	<section class="hero hud-card">
		<CarShowroomCard
			car={sortedLaps[0]?.car ?? null}
			game={sortedLaps[0]?.game ?? 'AC'}
			locked={data.rendererLocked}
			onToggleLock={() => (data.rendererLocked = !data.rendererLocked)}
			onSnapshot={(shots) => {
				heroShot = shots.side;
				rearShot = shots.rear;
			}}
		/>
	</section>

	<div class="c-laps"><StatCard icon="flag" label="Monthly Laps" value={String(monthlyLaps)} /></div>
	<div class="c-peripherals"><PeripheralsCard /></div>

	<div class="c-latest"><LatestSessionCard session={latest} trace={latestTrace} /></div>
	<div class="c-car">
		<MostUsedCarCard
			car={topCar}
			heroImage={topCar && topCar.car === sortedLaps[0]?.car ? heroShot : null}
			rearImage={topCar && topCar.car === sortedLaps[0]?.car ? rearShot : null}
		/>
	</div>
	<div class="c-activity"><ActivityHeatmap entries={heatmapEntries} stats={activityStats} /></div>
</div>

<style>
	.dashboard {
		--card-padding: 20px;

		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		grid-template-rows: auto minmax(0, 1.4fr) minmax(0, 1fr);
		gap: var(--hud-gap);
		padding: 24px;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		box-sizing: border-box;
		background: var(--color-bg);
	}

	.dashboard > * {
		min-height: 0;
		min-width: 0;
	}

	.hero {
		grid-column: 1 / 4;
		grid-row: 1 / 4;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.c-laps        { grid-column: 4; grid-row: 1; display: flex; }
	.c-peripherals { grid-column: 5; grid-row: 1; }
	.c-latest      { grid-column: 4; grid-row: 2; }
	.c-car         { grid-column: 5; grid-row: 2; }
	.c-activity    { grid-column: 4 / 6; grid-row: 3; }

	.c-laps :global(.stat) {
		width: 100%;
		height: 100%;
	}

	.c-peripherals :global(.card),
	.c-latest :global(.card),
	.c-car :global(.card),
	.c-activity :global(.card) {
		height: 100%;
	}

	@media (max-width: 1200px) {
		.dashboard {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: none;
			height: auto;
			overflow: visible;
		}

		.hero, .c-laps, .c-peripherals, .c-latest, .c-car, .c-activity {
			grid-column: auto;
			grid-row: auto;
		}

		.hero { min-height: 260px; grid-column: 1 / -1; }
		.c-laps { grid-column: 1 / -1; }
		.c-peripherals { grid-column: 1 / -1; }
		.c-activity { grid-column: 1 / -1; }
	}
</style>