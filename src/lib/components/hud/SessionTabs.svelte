<script lang="ts">
	interface Tab {
		id: string;
		label: string;
		active: boolean;
		closable: boolean;
	}

	interface Props {
		tabs: Tab[];
		onSelect: (id: string) => void;
		onNew: () => void;
		onClose: (id: string) => void;
	}

	let { tabs = [], onSelect, onNew, onClose }: Props = $props();
</script>

<div class="session-tabs" role="tablist">
	{#each tabs as tab (tab.id)}
		<div class="tab" class:active={tab.active} role="tab" aria-selected={tab.active}>
			<button type="button" class="label-btn" onclick={() => onSelect(tab.id)}>
				<span class="label">{tab.label}</span>
			</button>
			{#if tab.closable}
				<button type="button" class="close" aria-label="Close tab" onclick={() => onClose(tab.id)}>
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4 4 L12 12 M12 4 L4 12" stroke-linecap="round" />
					</svg>
				</button>
			{/if}
		</div>
	{/each}

	<button type="button" class="new" aria-label="New tab" onclick={() => onNew()}>
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M8 3.5 L8 12.5 M3.5 8 L12.5 8" stroke-linecap="round" />
		</svg>
	</button>
</div>

<style>
	.session-tabs {
		display: flex;
		align-items: center;
		gap: 2px;
		height: 40px;
		padding: 0 4px;
		background: transparent;
	}

	.tab {
		display: inline-flex;
		align-items: center;
		height: 28px;
		color: var(--color-muted);
		background: transparent;
		border: 1px solid transparent;
		border-bottom: none;
		border-top-left-radius: var(--radius-sm);
		border-top-right-radius: var(--radius-sm);
		transition: color 0.12s ease, background 0.12s ease;
	}

	.tab:hover { color: var(--color-text); }

	.tab.active {
		color: var(--color-text);
		background: var(--card-bg);
		border-color: var(--color-border);
	}

	.label-btn {
		display: inline-flex;
		align-items: center;
		height: 100%;
		padding: 0 8px 0 14px;
		background: none;
		border: none;
		color: inherit;
		font-family: var(--font-sans);
		font-size: 12px;
		line-height: 1;
		cursor: pointer;
	}

	.label {
		display: block;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		margin-right: 8px;
		padding: 0;
		color: var(--color-subtle);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.12s ease, color 0.12s ease, background 0.12s ease;
	}

	.tab:hover .close,
	.tab.active .close { opacity: 1; }

	.close:hover {
		color: var(--color-text);
		background: var(--color-panel);
	}

	.close svg { width: 10px; height: 10px; }

	.new {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		margin-bottom: 2px;
		margin-left: 2px;
		color: var(--color-muted);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: color 0.12s ease, background 0.12s ease;
	}

	.new:hover {
		color: var(--color-text);
		background: var(--card-bg);
	}

	.new svg { width: 14px; height: 14px; }
</style>
