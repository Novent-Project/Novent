<script lang="ts">
	import { formatName, formatDateTime } from '$lib/utils';
	import GameLogo from '$lib/components/chrome/GameLogo.svelte';
	import { CaretUp, Clock, Thermometer } from 'phosphor-svelte';
	import type { Lap } from '$lib/api';

	interface Props {
		lap: Lap | null;
	}

	let { lap }: Props = $props();

	const EXPANDED_KEY = 'novent:session-header-expanded';

	function loadExpanded(): boolean {
		try {
			return localStorage.getItem(EXPANDED_KEY) !== '0';
		} catch {
			return true;
		}
	}

	let expanded = $state(loadExpanded());

	function toggle() {
		expanded = !expanded;
		try {
			localStorage.setItem(EXPANDED_KEY, expanded ? '1' : '0');
		} catch {
		}
	}

	let car      = $derived(lap?.car ?? '');
	let track    = $derived(lap?.track ?? '');
	let game     = $derived(lap?.game ?? '');
	let dateTime = $derived(formatDateTime(lap?.date_time));
	let airTemp  = $derived(lap?.air_temp ? Math.round(lap.air_temp) : undefined);
	let roadTemp = $derived(lap?.road_temp ? Math.round(lap.road_temp) : undefined);
	let mode     = $derived(lap?.session_type || lap?.tyre_compound || undefined);
</script>

<div class="hud-card session-header" class:compact={!expanded}>
	<div class="logo-slot"><GameLogo {game} size={22} /></div>

	<div class="body">
		<div class="top-row">
			<span class="car">{formatName(car)}</span>
			<button class="collapse-btn" onclick={toggle} aria-label={expanded ? 'Collapse session info' : 'Expand session info'} title={expanded ? 'Collapse' : 'Expand'}>
				<CaretUp class={!expanded ? 'flipped' : ''} size={14} weight="bold" />
			</button>
		</div>

		<div class="meta-row">
			<span class="meta-item">{formatName(track)}</span>
			{#if expanded}
				<span class="dot">•</span>
				<span class="meta-item">
					<Clock size={14} weight="regular" />
					<span class="mono">{dateTime}</span>
				</span>
				{#if airTemp}
					<span class="dot">•</span>
					<span class="meta-item">
						<Thermometer size={14} weight="regular" />
						<span class="mono">{airTemp}°C</span>
						<span class="temp-tag">Air</span>
					</span>
				{/if}
				{#if roadTemp}
					<span class="dot">•</span>
					<span class="meta-item">
						<Thermometer size={14} weight="regular" />
						<span class="mono">{roadTemp}°C</span>
						<span class="temp-tag">Road</span>
					</span>
				{/if}
				{#if mode}
					<span class="mode-pill">{mode}</span>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.session-header {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 14px;
		padding: 14px 18px;
	}

	.session-header.compact {
		padding: 10px 14px;
		gap: 10px;
	}

	.logo-slot {
		flex: 0 0 auto;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--card-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 11px;
		color: var(--color-text);
	}

	.compact .logo-slot {
		width: 32px;
		height: 32px;
	}

	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.compact .body {
		gap: 1px;
	}

	.top-row {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.car {
		font-size: 16px;
		font-weight: 700;
		color: #fff;
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.compact .car {
		font-size: 14px;
	}

	.collapse-btn {
		flex: 0 0 auto;
		width: 20px;
		height: 20px;
		display: grid;
		place-items: center;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-subtle);
		cursor: pointer;
		padding: 0;
	}

	.collapse-btn:hover {
		color: var(--color-text);
	}

	.collapse-btn svg {
		width: 14px;
		height: 14px;
		transition: transform 0.15s ease;
	}

	.collapse-btn svg.flipped {
		transform: rotate(180deg);
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--color-muted);
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.meta-item svg {
		width: 13px;
		height: 13px;
		color: var(--color-subtle);
	}

	.dot {
		color: var(--color-subtle);
	}

	.temp-tag {
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-subtle);
	}

	.mode-pill {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-text);
		background: var(--card-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
	}
</style>