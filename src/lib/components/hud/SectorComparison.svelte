<script lang="ts">
	interface Sector {
		label: string;
		time: string;
		ref?: string;
		delta?: number;
	}

	interface Props {
		sectors: Sector[];
		onExpand?: () => void;
	}

	let { sectors, onExpand }: Props = $props();

	function deltaColor(delta: number | undefined): string {
		if (typeof delta !== 'number') return 'var(--color-text)';
		if (delta < 0) return 'var(--color-accent)';
		if (delta > 0) return 'var(--color-red)';
		return 'var(--color-text)';
	}
</script>

<div class="hud-card sector-comparison">
	<div class="header">
		<span class="title">Sector Comparison</span>
		<button
			type="button"
			class="expand-btn"
			aria-label="Expand sector comparison"
			onclick={() => onExpand?.()}
		>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M5.5 10.5 10.5 5.5" />
				<path d="M6 5.5h4.5V10" />
			</svg>
		</button>
	</div>

	<div class="grid">
		<div class="col-head"></div>
		<div class="col-head glyph">
			<svg viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden="true">
				<path
					d="M3.2 9.1 4 6.4a1.6 1.6 0 0 1 1.5-1.1h5a1.6 1.6 0 0 1 1.5 1.1l.8 2.7a1.4 1.4 0 0 1 1 1.3v1.3a.6.6 0 0 1-.6.6H13v.4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-.4H5v.4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-.4h-.2a.6.6 0 0 1-.6-.6v-1.3a1.4 1.4 0 0 1 1-1.3Zm1.6-.1h6.4l-.5-1.9a.5.5 0 0 0-.5-.3H5.3a.5.5 0 0 0-.5.3ZM5 10.9a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4Zm6 0a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4Z"
				/>
			</svg>
		</div>
		<div class="col-head glyph">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
				<circle cx="8" cy="9" r="4.5" />
				<path d="M8 6.5V9l1.6 1" />
				<path d="M6.5 2.5h3" />
				<path d="M8 2.5v2" />
			</svg>
		</div>

		{#each sectors as sector (sector.label)}
			<div class="label mono">{sector.label}</div>
			<div class="mono time" style="color: {deltaColor(sector.delta)}">{sector.time}</div>
			<div class="mono ref">{sector.ref ?? ':--.--'}</div>
		{/each}
	</div>
</div>

<style>
	.sector-comparison {
		padding: 12px 14px;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.title {
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 700;
		color: var(--color-text);
	}

	.expand-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
	}

	.expand-btn:hover {
		color: var(--color-text);
		background: var(--card-bg-hover);
	}

	.expand-btn svg {
		width: 14px;
		height: 14px;
	}

	.grid {
		display: grid;
		grid-template-columns: auto 1fr 1fr;
		align-items: center;
		column-gap: 12px;
		row-gap: 4px;
		margin-top: 10px;
	}

	.col-head {
		display: flex;
		align-items: center;
	}

	.col-head.glyph {
		justify-content: flex-end;
		color: var(--color-subtle);
		padding-bottom: 2px;
	}

	.col-head.glyph svg {
		width: 14px;
		height: 14px;
	}

	.label {
		color: var(--color-muted);
		font-size: 12px;
	}

	.time {
		text-align: right;
		font-size: 12px;
		color: var(--color-text);
	}

	.ref {
		text-align: right;
		font-size: 12px;
		color: var(--color-muted);
	}
</style>
