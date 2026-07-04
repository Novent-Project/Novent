<script lang="ts">
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
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<circle cx="8" cy="8" r="6" />
				<path d="M8 4.5V8l2.5 1.5" stroke-linecap="round" />
			</svg>
		{:else}
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M4 2v12" stroke-linecap="round" />
				<path d="M4 3h7l-1.5 2.2L11 7.5H4" />
			</svg>
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
		padding: 14px 18px;
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
	}

	.value {
		font-size: 20px;
		font-weight: 700;
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
	}
</style>