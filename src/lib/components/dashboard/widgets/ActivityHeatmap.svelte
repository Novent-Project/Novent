<script lang="ts">
	interface Entry {
		date:  string;
		value: number;
	}

	interface Stats {
		totalLaps: number;
		bestLap:   string;
	}

	interface Props {
		entries?: Entry[];
		weeks?:   number;
		stats?:   Stats | null;
	}

	let { entries = [], weeks = 18, stats = null }: Props = $props();

	const GAP = 3;
	const MIN_CELL = 6;
	const MAX_CELL = 22;
	const MIN_WEEKS = 20;
	const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

	function toKey(d: Date) {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	let gridW = $state(0);
	let gridH = $state(0);

	// Cell size is driven by the available height (7 rows) so the grid fills
	// the card instead of leaving dead space above the footer. It's only
	// capped by width when that would push the week count below a readable
	// minimum — otherwise more weeks are simply added to use the full width.
	let cellSize = $derived.by(() => {
		if (gridH <= 0) return 0;
		const byHeight = Math.min(MAX_CELL, (gridH - GAP * 6) / 7);
		if (gridW <= 0) return Math.max(MIN_CELL, byHeight);
		const byWidth = gridW / MIN_WEEKS - GAP;
		return Math.max(MIN_CELL, Math.min(byHeight, byWidth));
	});

	let effectiveWeeks = $derived(
		cellSize > 0 && gridW > 0
			? Math.max(1, Math.floor((gridW + GAP) / (cellSize + GAP)))
			: weeks
	);

	function levelFor(value: number): number {
		if (value <= 0) return 0;
		if (value === 1) return 1;
		if (value <= 3) return 2;
		if (value <= 6) return 3;
		return 4;
	}

	let grid = $derived.by(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const end = new Date(today);
		end.setDate(end.getDate() + (6 - end.getDay()));

		const start = new Date(end);
		start.setDate(start.getDate() - (effectiveWeeks * 7 - 1));

		const byDate = new Map(entries.map(e => [e.date, e.value]));

		const cols: { date: Date; key: string; value: number; level: number; future: boolean }[][] = [];
		let cursor = new Date(start);

		for (let w = 0; w < effectiveWeeks; w++) {
			const col: (typeof cols)[number] = [];
			for (let d = 0; d < 7; d++) {
				const key = toKey(cursor);
				const value = byDate.get(key) ?? 0;
				const future = cursor.getTime() > today.getTime();
				const level = future ? -1 : levelFor(value);
				col.push({ date: new Date(cursor), key, value, level, future });
				cursor = new Date(cursor);
				cursor.setDate(cursor.getDate() + 1);
			}
			cols.push(col);
		}

		return cols;
	});

	let monthLabels = $derived.by(() =>
		grid.map(col => {
			const first = col.find(d => d.date.getDate() === 1 && !d.future);
			return first ? MONTH_LABELS[first.date.getMonth()] : '';
		})
	);

	let hasActivity = $derived(entries.some(e => e.value > 0));

	let colTemplate = $derived(
		cellSize > 0 ? `repeat(${effectiveWeeks}, ${cellSize}px)` : `repeat(${weeks}, 1fr)`
	);
</script>

<div class="card hud-card">
	<div class="heatmap" class:empty={!hasActivity}>
		<div class="months" style="grid-template-columns: {colTemplate};">
			{#each monthLabels as label, i (i)}
				<span class="month">{label}</span>
			{/each}
		</div>

		<div class="grid" style="grid-template-columns: {colTemplate};" bind:clientWidth={gridW} bind:clientHeight={gridH}>
			{#each grid as col, i (i)}
				<div class="col" style="grid-template-rows: repeat(7, {cellSize > 0 ? `${cellSize}px` : '1fr'});">
					{#each col as day (day.key)}
						<div
							class="cell"
							class:future={day.future}
							data-level={day.future ? '' : day.level}
							title={day.future ? '' : `${day.value} lap${day.value === 1 ? '' : 's'} on ${day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
						></div>
					{/each}
				</div>
			{/each}
		</div>

		<div class="footer">
			{#if stats}
				<div class="stats">
					<div class="stat">
						<span class="stat-label">Total Laps</span>
						<span class="stat-value mono">{stats.totalLaps}</span>
					</div>
					<div class="stat">
						<span class="stat-label">Best Lap</span>
						<span class="stat-value mono">{stats.bestLap}</span>
					</div>
				</div>
			{:else}
				<span></span>
			{/if}

			<div class="legend">
				<span>Less</span>
				<div class="cell" data-level="0"></div>
				<div class="cell" data-level="1"></div>
				<div class="cell" data-level="2"></div>
				<div class="cell" data-level="3"></div>
				<div class="cell" data-level="4"></div>
				<span>More</span>
			</div>
		</div>
	</div>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		padding: 16px 20px;
		width: 100%;
		height: 100%;
		min-height: 0;
		min-width: 0;
		box-sizing: border-box;
		overflow: hidden;
	}

	.heatmap {
		flex: 1;
		min-height: 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		overflow: hidden;
	}

	.months {
		display: grid;
		gap: 3px;
		flex: 0 0 auto;
		justify-content: start;
	}

	.month {
		font-size: 10px;
		color: var(--color-muted);
		white-space: nowrap;
		min-width: 0;
	}

	.grid {
		flex: 1;
		min-height: 0;
		min-width: 0;
		max-width: 100%;
		display: grid;
		gap: 3px;
		justify-content: start;
		align-content: start;
		overflow: hidden;
	}

	.col {
		display: grid;
		gap: 3px;
	}

	.cell {
		width: 100%;
		height: 100%;
		border-radius: 2px;
		background: var(--card-bg);
		border: 1px solid var(--color-border);
	}

	.cell.future {
		background: transparent;
		border-color: transparent;
	}

	.cell[data-level="0"] { background: var(--card-bg); }
	.cell[data-level="1"] { background: var(--color-accent-border); border-color: var(--color-accent-border); }
	.cell[data-level="2"] { background: color-mix(in srgb, var(--color-accent) 45%, transparent); border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); }
	.cell[data-level="3"] { background: color-mix(in srgb, var(--color-accent) 70%, transparent); border-color: color-mix(in srgb, var(--color-accent) 70%, transparent); }
	.cell[data-level="4"] { background: var(--color-accent);      border-color: var(--color-accent); }

	.heatmap.empty .grid .cell[data-level] { background: var(--card-bg); border-color: var(--color-border); }

	.footer {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		flex: 0 0 auto;
	}

	.stats {
		display: flex;
		gap: 28px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-subtle);
	}

	.stat-value {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 0 0 auto;
	}

	.legend span {
		font-size: 10px;
		color: var(--color-muted);
	}

	.legend .cell {
		width: 10px;
		height: 10px;
	}
</style>