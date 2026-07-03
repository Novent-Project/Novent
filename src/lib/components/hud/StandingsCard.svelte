<script lang="ts">
	interface Entry {
		pos: number;
		name: string;
		time: string;
		gap?: string;
		isPrimary?: boolean;
	}

	interface Props {
		entries: Entry[];
	}

	let { entries }: Props = $props();

	const rows = $derived(entries ?? []);
</script>

<div class="hud-card standings">
	{#if rows.length === 0}
		<div class="empty mono">No other drivers</div>
	{:else}
		{#each rows as entry, i (entry.pos)}
			<div class="row" class:primary={entry.isPrimary}>
				<span class="pos mono">{entry.pos}</span>
				<span class="avatar" aria-hidden="true"></span>
				<span class="name" class:strong={entry.isPrimary}>{entry.name}</span>
				<span class="spacer"></span>
				{#if entry.isPrimary || i === 0}
					<span class="value mono time">{entry.time}</span>
				{:else if entry.gap}
					<span class="value mono gap">{entry.gap}</span>
				{:else}
					<span class="value mono">{entry.time}</span>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	.standings {
		padding: 10px 14px;
		display: flex;
		flex-direction: column;
	}

	.empty {
		color: var(--color-muted);
		padding: 8px 0;
		font-size: 0.8125rem;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 0;
		border-bottom: 1px solid var(--color-border);
	}

	.row:last-child {
		border-bottom: none;
	}

	.row.primary {
		background: var(--card-bg);
		border-radius: var(--radius-sm);
		padding-left: 8px;
		padding-right: 8px;
		margin: 0 -8px;
	}

	.pos {
		width: 16px;
		flex-shrink: 0;
		color: var(--color-muted);
		font-size: 0.8125rem;
		text-align: right;
	}

	.avatar {
		width: 22px;
		height: 22px;
		flex-shrink: 0;
		border-radius: 50%;
		background: var(--card-bg);
		border: 1px solid var(--color-border);
	}

	.name {
		color: var(--color-text);
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.name.strong {
		color: #fff;
		font-weight: 600;
	}

	.spacer {
		flex: 1;
	}

	.value {
		flex-shrink: 0;
		font-size: 0.8125rem;
		color: var(--color-text);
	}

	.value.time {
		color: #fff;
	}

	.value.gap {
		color: var(--color-amber);
	}
</style>
