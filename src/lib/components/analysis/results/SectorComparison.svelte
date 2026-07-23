<script lang="ts">
	interface SectorRef {
		time: string;
		delta: number;
		color: string;
	}

	interface Sector {
		label: string;
		time: string;
		refs: SectorRef[];
	}

	interface Props {
		sectors: Sector[];
		onExpand?: () => void;
	}

	let { sectors, onExpand }: Props = $props();

	let refColors = $derived(sectors[0]?.refs.map(r => r.color) ?? []);
	let gridCols = $derived(`auto minmax(72px, 1fr)${' minmax(72px, auto)'.repeat(refColors.length)}`);

	function deltaColor(delta: number): string {
		if (delta < -0.0005) return 'var(--color-accent)';
		if (delta > 0.0005) return 'var(--color-red)';
		return 'var(--color-text)';
	}
</script>

<div class="hud-card sector-comparison">
	<div class="header">
		<span class="title">Sectors</span>
		<button
			type="button"
			class="expand-btn"
			aria-label="Expand sectors"
			onclick={() => onExpand?.()}
		>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M5.5 10.5 10.5 5.5" />
				<path d="M6 5.5h4.5V10" />
			</svg>
		</button>
	</div>

	<div class="grid" style:grid-template-columns={gridCols}>
		{#if refColors.length}
			<div class="col-head"></div>
			<div class="col-head dot-head"><span class="dot you"></span></div>
			{#each refColors as color, i (i)}
				<div class="col-head dot-head"><span class="dot" style="background: {color}"></span></div>
			{/each}
		{/if}

		{#each sectors as sector (sector.label)}
			<div class="label mono">{sector.label}</div>
			<div class="mono time">{sector.time}</div>
			{#each sector.refs as ref, i (i)}
				<div class="mono time" style="color: {deltaColor(ref.delta)}">{ref.time}</div>
			{/each}
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
		align-items: center;
		column-gap: 12px;
		row-gap: 4px;
		margin-top: 10px;
	}

	.col-head {
		display: flex;
		align-items: center;
	}

	.col-head.dot-head {
		justify-content: flex-end;
		padding-bottom: 2px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.dot.you {
		background: var(--color-accent);
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
</style>
