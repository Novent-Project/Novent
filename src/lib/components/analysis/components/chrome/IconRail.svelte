<script lang="ts">
	interface Item {
		key: string;
		label: string;
		active: boolean;
	}

	interface Props {
		items: Item[];
		onSelect: (key: string) => void;
	}

	let { items, onSelect }: Props = $props();
</script>

<nav class="rail">
	{#each items as item (item.key)}
		<button
			type="button"
			class="rail-btn"
			class:active={item.active}
			title={item.label}
			aria-label={item.label}
			aria-pressed={item.active}
			onclick={() => onSelect(item.key)}
		>
			{#if item.key === 'flag'}
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M3.5 14V2" stroke-linecap="round" />
					<path
						d="M3.5 2.6C5 1.7 6.3 1.7 7.8 2.6C9.3 3.5 10.6 3.5 12.1 2.6V8.6C10.6 9.5 9.3 9.5 7.8 8.6C6.3 7.7 5 7.7 3.5 8.6V2.6Z"
						stroke-linejoin="round"
					/>
					<path
						d="M3.5 2.6C5 1.7 6.3 1.7 7.8 2.6V5.6C6.3 4.7 5 4.7 3.5 5.6V2.6Z M7.8 5.6C9.3 6.5 10.6 6.5 12.1 5.6V2.6C10.6 3.5 9.3 3.5 7.8 2.6V5.6Z"
						fill="currentColor"
						stroke="none"
					/>
				</svg>
			{:else if item.key === 'setup'}
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M2 4H14" stroke-linecap="round" />
					<path d="M2 8H14" stroke-linecap="round" />
					<path d="M2 12H14" stroke-linecap="round" />
					<circle cx="5.5" cy="4" r="1.6" fill="var(--color-bg)" />
					<circle cx="10.5" cy="8" r="1.6" fill="var(--color-bg)" />
					<circle cx="6.5" cy="12" r="1.6" fill="var(--color-bg)" />
				</svg>
			{:else if item.key === 'fuel'}
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M3 14V4A1.5 1.5 0 0 1 4.5 2.5H8A1.5 1.5 0 0 1 9.5 4V14" stroke-linejoin="round" />
					<path d="M2 14H10.5" stroke-linecap="round" />
					<path d="M3 7H9.5" stroke-linecap="round" />
					<path
						d="M9.5 6L11.8 8.3A1.5 1.5 0 0 1 12.25 9.36V12A1.25 1.25 0 0 0 14 12V6L12.2 4.2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{:else if item.key === 'telemetry'}
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path
						d="M1.5 9L4 9L5.5 4L7.5 12L9.5 6.5L11 9L14.5 9"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{:else}
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
				</svg>
			{/if}
		</button>
	{/each}
</nav>

<style>
	.rail {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		width: 48px;
	}

	.rail-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		transition:
			background 0.12s ease,
			color 0.12s ease,
			border-color 0.12s ease;
	}

	.rail-btn svg {
		width: 20px;
		height: 20px;
	}

	.rail-btn:hover {
		background: var(--card-bg);
		color: var(--color-text);
	}

	.rail-btn.active {
		background: var(--color-accent-dim);
		border-color: var(--color-accent-border);
		color: var(--color-accent);
	}
</style>
