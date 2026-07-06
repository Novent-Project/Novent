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
			<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd"/>
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path fill-rule="evenodd" d="M3 2.25a.75.75 0 0 1 .75.75v.54l1.838-.46a9.75 9.75 0 0 1 6.725.738l.108.054A8.25 8.25 0 0 0 18 4.524l3.11-.732a.75.75 0 0 1 .917.81 47.784 47.784 0 0 0 .005 10.337.75.75 0 0 1-.574.812l-3.114.733a9.75 9.75 0 0 1-6.594-.77l-.108-.054a8.25 8.25 0 0 0-5.69-.625l-2.202.55V21a.75.75 0 0 1-1.5 0V3A.75.75 0 0 1 3 2.25Z" clip-rule="evenodd"/>
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