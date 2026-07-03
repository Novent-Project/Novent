<script lang="ts">
	import { getContext } from 'svelte';
	import type { DataState } from '$lib/state/data.svelte';
	import { formatDriveTime } from '$lib/utils';
	import StatCard from '$lib/components/dashboard/StatCard.svelte';
	import UnlockCard from '$lib/components/dashboard/UnlockCard.svelte';
	import LatestSessionCard from '$lib/components/dashboard/LatestSessionCard.svelte';
	import MostUsedCarCard from '$lib/components/dashboard/MostUsedCarCard.svelte';
	import WeeklyActivityCard from '$lib/components/dashboard/WeeklyActivityCard.svelte';

	const data = getContext<DataState>('data');

	let monthlyLaps = $derived(data.laps.length);
	let monthlyTime = $derived(formatDriveTime(data.laps.reduce((sum, l) => sum + (l.lap_time_ms ?? 0), 0)));

	let latest = $derived(
		data.laps[0]
			? {
					car:     data.laps[0].car,
					track:   data.laps[0].track,
					game:    data.laps[0].game,
					type:    data.laps[0].session_type,
					bestLap: data.laps[0].lap_time,
				}
			: null
	);

	let mostUsedCar = $derived.by(() => {
		if (!data.laps.length) return null;
		const counts = new Map<string, number>();
		for (const l of data.laps) counts.set(l.car, (counts.get(l.car) ?? 0) + 1);
		return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
	});

	const WEEKDAYS = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
	let weekly = $derived(WEEKDAYS.map(label => ({ label, value: 0 })));
</script>

<div class="dashboard">
	<section class="welcome">
		<span class="eyebrow">Welcome,</span>
		<span class="ready">Ready to go fast?</span>
	</section>

	<div class="c-laps"><StatCard icon="flag" label="Monthly Laps" value={String(monthlyLaps)} /></div>
	<div class="c-time"><StatCard icon="clock" label="Monthly Time Driven" value={monthlyTime} /></div>
	<div class="c-unlock"><UnlockCard title="Unlock Advanced Analysis Tools" /></div>

	<section class="hero">
		<h1>Performance Tools</h1>
		<p>Head to the <a href="/analysis">Analysis</a> tab to start logging data.</p>
		<a class="cta" href="/analysis">
			Open Analysis
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</a>
		<svg class="hero-art" viewBox="0 0 64 64" aria-hidden="true">
			<path
				d="M14 8 H50 a6 6 0 0 1 6 6 V42 L42 56 H14 a6 6 0 0 1 -6 -6 V14 a6 6 0 0 1 6 -6 Z"
				fill="none" stroke="#10b981" stroke-width="2" stroke-linejoin="round"
			/>
			<path
				transform="translate(16 23.2) scale(0.2)"
				d="M0,88 L30,88 L46,44 L64,44 L80,88 L110,88 L126,44 L144,44 L160,0 L130,0 L114,44 L96,44 L80,0 L50,0 L34,44 L16,44 Z"
				fill="#10b981"
			/>
		</svg>
	</section>

	<div class="c-latest"><LatestSessionCard session={latest} /></div>
	<div class="c-car"><MostUsedCarCard car={mostUsedCar} /></div>
	<div class="c-weekly"><WeeklyActivityCard days={weekly} /></div>
</div>

<style>
	.dashboard {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		grid-template-rows: auto auto auto;
		gap: 16px;
		padding: 24px;
		min-height: 100%;
	}

	.welcome  { grid-column: 1; grid-row: 1; align-self: center; display: flex; flex-direction: column; gap: 4px; }
	.c-laps   { grid-column: 2; grid-row: 1; }
	.c-time   { grid-column: 3; grid-row: 1; }
	.c-unlock { grid-column: 4; grid-row: 1; }
	.hero     { grid-column: 1 / 3; grid-row: 2 / 4; }
	.c-latest { grid-column: 3; grid-row: 2; }
	.c-car    { grid-column: 4; grid-row: 2; }
	.c-weekly { grid-column: 3 / 5; grid-row: 3; }

	.eyebrow { font-size: 14px; color: var(--color-muted); }
	.ready   { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }

	.hero {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 40px 8px 8px;
		overflow: hidden;
	}

	.hero h1 {
		margin: 0;
		font-size: 64px;
		font-weight: 800;
		line-height: 1.02;
		letter-spacing: -0.03em;
		color: #fff;
	}

	.hero p {
		margin: 0;
		font-size: 14px;
		color: var(--color-muted);
	}

	.hero p a { color: var(--color-accent); text-decoration: none; }
	.hero p a:hover { text-decoration: underline; }

	.cta {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
		padding: 10px 18px;
		border-radius: var(--radius-pill);
		background: var(--color-accent);
		color: #041a12;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.15s ease, transform 0.1s ease;
	}

	.cta:hover  { background: #34d399; }
	.cta:active { transform: scale(0.98); }
	.cta svg { width: 15px; height: 15px; }

	.hero-art {
		position: absolute;
		right: -4%;
		bottom: -6%;
		width: 62%;
		max-width: 460px;
		opacity: 0.06;
		pointer-events: none;
	}

	@media (max-width: 1200px) {
		.dashboard { grid-template-columns: 1fr 1fr; }

		.welcome, .c-laps, .c-time, .c-unlock, .hero, .c-latest, .c-car, .c-weekly {
			grid-column: auto;
			grid-row: auto;
		}

		.hero, .c-weekly { grid-column: 1 / -1; }
		.hero h1 { font-size: 48px; }
	}
</style>