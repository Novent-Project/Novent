<script lang="ts">
	import { formatName, formatDateTime } from '$lib/utils';
	import Icon from '$lib/components/chrome/Icon.svelte';
	import type { Lap } from '$lib/api';

	interface Props {
		lap: Lap | null;
	}

	let { lap }: Props = $props();

	let car      = $derived(lap?.car ?? '');
	let track    = $derived(lap?.track ?? '');
	let game     = $derived(lap?.game ?? '');
	let dateTime = $derived(formatDateTime(lap?.date_time));
	let airTemp  = $derived(lap?.air_temp ? Math.round(lap.air_temp) : undefined);
	let roadTemp = $derived(lap?.road_temp ? Math.round(lap.road_temp) : undefined);
	let mode     = $derived(lap?.session_type || lap?.tyre_compound || undefined);
</script>

<div class="hud-card session-header">
	<div class="logo-slot"><Icon {game} size={22} /></div>

	<div class="body">
		<div class="top-row">
			<span class="car">{formatName(car)}</span>
		</div>

		<div class="meta-row">
			<span class="meta-item">{formatName(track)}</span>
			<span class="dot">•</span>
			<span class="meta-item">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<circle cx="8" cy="8" r="5.5" />
					<path d="M8 5v3l2 1.5" />
				</svg>
				<span class="mono">{dateTime}</span>
			</span>
			{#if airTemp}
				<span class="dot">•</span>
				<span class="meta-item">
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M6.5 9V3.5a1.5 1.5 0 0 1 3 0V9a2.5 2.5 0 1 1-3 0z" />
					</svg>
					<span class="mono">{airTemp}°C</span>
					<span class="temp-tag">Air</span>
				</span>
			{/if}
			{#if roadTemp}
				<span class="dot">•</span>
				<span class="meta-item">
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M6.5 9V3.5a1.5 1.5 0 0 1 3 0V9a2.5 2.5 0 1 1-3 0z" />
					</svg>
					<span class="mono">{roadTemp}°C</span>
					<span class="temp-tag">Road</span>
				</span>
			{/if}
			{#if mode}
				<span class="mode-pill">{mode}</span>
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

	.body {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
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