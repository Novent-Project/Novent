<script lang="ts">
	import { gameShort, formatName, formatDateTime } from '$lib/utils';
	import type { Lap } from '$lib/api';

	interface Props {
		lap: Lap | null;
		onPlay?: () => void;
		onSetup?: () => void;
	}

	let { lap, onPlay, onSetup }: Props = $props();

	let car      = $derived(lap?.car ?? '');
	let track    = $derived(lap?.track ?? '');
	let game     = $derived(lap?.game ?? '');
	let dateTime = $derived(formatDateTime(lap?.date_time));
	let airTemp  = $derived(lap?.air_temp);
	let roadTemp = $derived(lap?.road_temp);
	let mode     = $derived(lap?.session_type || lap?.tyre_compound || undefined);
</script>

<div class="hud-card session-header">
	<div class="logo-slot mono">{gameShort(game)}</div>

	<div class="body">
		<div class="top-row">
			<span class="car">{formatName(car)}</span>
			<div class="actions">
				{#if onPlay}
					<button class="icon-btn" type="button" aria-label="Play" onclick={() => onPlay?.()}>
						<svg viewBox="0 0 16 16" fill="currentColor" stroke="none">
							<path d="M5 3.5v9l7-4.5-7-4.5z" />
						</svg>
					</button>
				{/if}
				{#if onSetup}
					<button class="icon-btn" type="button" aria-label="Setup" onclick={() => onSetup?.()}>
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
							<path
								d="M10.5 3.5a2 2 0 0 1 2.83 2.83l-6.3 6.3-3.03.71.71-3.03 6.3-6.3z"
							/>
							<path d="M9.2 4.8l2 2" />
						</svg>
					</button>
				{/if}
			</div>
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
			<span class="dot">•</span>
			<span class="meta-item">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M6.5 9V3.5a1.5 1.5 0 0 1 3 0V9a2.5 2.5 0 1 1-3 0z" />
				</svg>
				<span class="mono">{airTemp ?? '—'}°C</span>
			</span>
			<span class="meta-item">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M6.5 9V3.5a1.5 1.5 0 0 1 3 0V9a2.5 2.5 0 1 1-3 0z" />
				</svg>
				<span class="mono">{roadTemp ?? '—'}°C</span>
			</span>
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

	.actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.icon-btn {
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border);
		background: var(--card-bg);
		color: var(--color-muted);
		cursor: pointer;
		transition: color 0.12s ease, background 0.12s ease, border-color 0.12s ease;
	}

	.icon-btn:hover {
		color: var(--color-text);
		background: var(--card-bg-hover);
		border-color: var(--color-border-md);
	}

	.icon-btn svg {
		width: 14px;
		height: 14px;
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