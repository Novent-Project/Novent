<script lang="ts">
	import { Flag, Clock } from 'phosphor-svelte';

	interface Props {
		label: string;
		value: string;
		icon?: 'flag' | 'clock';
	}

	let { label, value, icon = 'flag' }: Props = $props();
</script>

<div class="stat hud-card">
	<span class="orb">
		{#if icon === 'clock'}
			<Clock size={16} weight="fill" />
		{:else}
			<Flag size={16} weight="fill" />
		{/if}
	</span>
	<div class="body">
		<span class="label">{label}</span>
		<span class="value">{value}</span>
	</div>
</div>

<style>
	.stat {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		height: 100%;
		padding: var(--card-padding, 20px);
		box-sizing: border-box;
		overflow: hidden;
	}

	.orb {
		flex: 0 0 auto;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--color-accent-dim);
		border: 1px solid var(--color-accent-border);
		color: var(--color-accent);
	}

	.orb svg { width: 16px; height: 16px; }

	.body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.label {
		font-size: 12px;
		color: var(--color-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.value {
		font-size: 20px;
		font-weight: 700;
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>