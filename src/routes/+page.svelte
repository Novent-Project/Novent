<script lang="ts">
	import { getContext } from 'svelte';
	import type { DataState } from '$lib/state/data.svelte';
	import { fetchTelemetry } from '$lib/api';
	import type { Trace } from '$lib/canvas';
	import StatCard from '$lib/components/dashboard/StatCard.svelte';
	import PeripheralsCard from '$lib/components/dashboard/PeripheralsCard.svelte';
	import LatestSessionCard from '$lib/components/dashboard/LatestSessionCard.svelte';
	import MostUsedCarCard from '$lib/components/dashboard/MostUsedCarCard.svelte';
	import ActivityHeatmap from '$lib/components/dashboard/ActivityHeatmap.svelte';

	const data = getContext<DataState>('data');

	// `monthlyLaps` previously just counted every lap in `data.laps` — it
	// wasn't filtered to the month at all despite the label. Scope it to the
	// current calendar month using `date_time`.
	let monthlyLaps = $derived.by(() => {
		const now = new Date();
		return data.laps.filter(l => {
			if (!l.date_time) return false;
			const d = new Date(l.date_time);
			return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
		}).length;
	});

	// Laps aren't guaranteed to arrive newest-first from the API, so sort
	// explicitly rather than assuming array order.
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

	// Keyed on the uuid value (not `sortedLaps`/`latest` directly) so this only
	// refetches when the latest lap actually changes, not on every unrelated
	// `data.laps` update.
	let latestUuid = $derived(sortedLaps[0]?.uuid ?? null);
	let latestTrace = $state<Trace | null>(null);

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
				};
			})
			.catch(() => {
				if (!cancelled) latestTrace = null;
			});
		return () => { cancelled = true; };
	});

	let topCars = $derived.by(() => {
		if (!data.laps.length) return [];
		const counts = new Map<string, number>();
		for (const l of data.laps) counts.set(l.car, (counts.get(l.car) ?? 0) + 1);
		return [...counts.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 2)
			.map(([car, laps]) => ({ car, laps }));
	});

	// `Lap.date_time` is the ISO timestamp field from the API (there is no
	// `date` field on `Lap` — see api/types.ts).
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
	<!-- Renderer placeholder — swap for the real 3D/car view once it's built.
	     Kept deliberately generic (no copy, no CTA) so it doesn't ship as a
	     fake "final" hero by accident. -->
	<section class="hero hud-card hero--placeholder">
		<span class="hero-label">Renderer</span>
		<span class="hero-mark" aria-hidden="true">G</span>
	</section>

	<div class="c-laps"><StatCard icon="flag" label="Monthly Laps" value={String(monthlyLaps)} /></div>
	<div class="c-peripherals"><PeripheralsCard /></div>

	<div class="c-latest"><LatestSessionCard session={latest} trace={latestTrace} /></div>
	<div class="c-car"><MostUsedCarCard cars={topCars} /></div>
	<div class="c-activity"><ActivityHeatmap entries={heatmapEntries} /></div>
</div>

<style>
	.dashboard {
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

	/* Left: hero renderer, spans all three rows across the first three columns */
	.hero {
		grid-column: 1 / 4;
		grid-row: 1 / 4;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Right: stat pill + peripherals on top, then the two metric cards, then activity */
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

	.hero--placeholder {
		border-style: dashed;
	}

	.hero-label {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		font-weight: 600;
	}

	.hero-mark {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 120px;
		font-weight: 900;
		line-height: 1;
		color: var(--color-text);
		opacity: 0.03;
		user-select: none;
		pointer-events: none;
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

		.hero { min-height: 260px; }
		.c-activity { grid-column: 1 / -1; }
	}
</style>