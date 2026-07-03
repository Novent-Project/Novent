<script lang="ts">
	import TelemetryWidget from '$lib/components/analysis/components/telemetry/TelemetryWidget.svelte';
	import { formatName } from '$lib/utils';
	import type { Lap } from '$lib/api';
	import type { DriverTelemetry } from '$lib/components/analysis/state';

	interface Props {
		driver:     DriverTelemetry | null;
		candidates: Lap[];
		onPick:     (lap: Lap) => void;
		onRemove:   () => void;
	}

	let { driver, candidates, onPick, onRemove }: Props = $props();

	let menuOpen = $state(false);

	function pick(lap: Lap) {
		onPick(lap);
		menuOpen = false;
	}
</script>

{#if driver}
	<div class="comp-slot">
		<TelemetryWidget {driver} />
		<button class="comp-remove" onclick={onRemove} aria-label="Remove comparison">×</button>
	</div>
{:else}
	<div class="comp-empty hud-card">
		<button class="comp-add" onclick={() => (menuOpen = !menuOpen)}>
			+ Select comparison lap
		</button>
		{#if menuOpen}
			<div class="comp-menu hud-card">
				{#each candidates as l (l.uuid)}
					<button class="comp-opt" onclick={() => pick(l)}>
						<span>{formatName(l.car)}</span>
						<span class="mono">{l.lap_time || l.time}</span>
					</button>
				{:else}
					<div class="comp-none">No other laps on this track</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.comp-slot { position: relative; }

	.comp-remove {
		position: absolute;
		top: -6px;
		right: -6px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-panel);
		border: 1px solid var(--card-border);
		color: var(--color-muted);
		cursor: pointer;
		font-size: 13px;
		line-height: 1;
	}

	.comp-remove:hover { color: var(--color-red); }

	.comp-empty {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 64px;
		padding: 12px;
	}

	.comp-add {
		background: none;
		border: 1px dashed var(--card-border);
		border-radius: var(--radius-sm);
		color: var(--color-muted);
		padding: 8px 14px;
		cursor: pointer;
		font-size: 12px;
		font-family: var(--font-sans);
	}

	.comp-add:hover { color: var(--color-text); border-color: var(--color-border-md); }

	.comp-menu {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		z-index: 30;
		max-height: 260px;
		overflow-y: auto;
		padding: 4px;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.comp-opt {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 10px;
		border: none;
		background: none;
		border-radius: var(--radius-sm);
		color: var(--color-text);
		cursor: pointer;
		font-size: 12px;
		text-align: left;
	}

	.comp-opt:hover { background: var(--card-bg-hover); }
	.comp-opt .mono { color: var(--color-muted); font-size: 11px; }

	.comp-none {
		padding: 10px;
		text-align: center;
		color: var(--color-muted);
		font-size: 12px;
	}
</style>