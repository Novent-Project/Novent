<script lang="ts">
	import { slide } from 'svelte/transition';
	import { formatName, formatDateTime } from '$lib/utils';
	import type { Lap } from '$lib/api';

	interface Props {
		candidates: Lap[];
		onPick:     (lap: Lap) => void;
		disabled?:  boolean;
	}

	let { candidates, onPick, disabled = false }: Props = $props();

	let menuOpen = $state(false);

	function pick(lap: Lap) {
		onPick(lap);
		menuOpen = false;
	}
</script>

<div class="comp-picker">
	<button
		class="comp-add"
		onclick={() => (menuOpen = !menuOpen)}
		{disabled}
		aria-label={disabled ? 'Comparison limit reached' : 'Add comparison lap'}
	>
		+ Compare lap
	</button>
	{#if menuOpen}
		<div class="comp-menu hud-card" transition:slide={{ duration: 200 }}>
			{#each candidates as l (l.uuid)}
				<button class="comp-opt" onclick={() => pick(l)}>
					<span class="comp-opt-info">
						<span class="comp-opt-car">{formatName(l.car)}</span>
						<span class="comp-opt-date mono">{formatDateTime(l.date_time)}</span>
					</span>
					<span class="mono">{l.lap_time || l.time}</span>
				</button>
			{:else}
				<div class="comp-none">No other laps on this track</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.comp-picker {
		position: relative;
	}

	.comp-add {
		width: 100%;
		background: none;
		border: 1px dashed var(--card-border);
		border-radius: var(--radius-sm);
		color: var(--color-muted);
		padding: 8px 14px;
		cursor: pointer;
		font-size: 12px;
		font-family: var(--font-sans);
	}

	.comp-add:hover:not(:disabled) {
		color: var(--color-text);
		border-color: var(--color-border-md);
	}

	.comp-add:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.comp-menu {
		margin-top: 6px;
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

	.comp-opt-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.comp-opt-car {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.comp-opt-date {
		font-size: 10px;
		color: var(--color-subtle);
	}

	.comp-none {
		padding: 10px;
		text-align: center;
		color: var(--color-muted);
		font-size: 12px;
	}
</style>
