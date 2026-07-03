<script lang="ts">
	interface Day {
		label: string;
		value: number;
	}

	interface Props {
		days: Day[];
	}

	let { days }: Props = $props();

	let max = $derived(Math.max(1, ...days.map(d => d.value)));
</script>

<div class="card hud-card">
	<h3 class="heading">My Weekly Activity</h3>

	<div class="chart">
		{#each days as day (day.label)}
			<div class="col">
				<div class="track">
					<div class="fill" style="height: {(day.value / max) * 100}%"></div>
				</div>
				<span class="label">{day.label}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 18px 20px;
	}

	.heading {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		color: #fff;
	}

	.chart {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 12px;
		align-items: end;
		height: 150px;
	}

	.col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		height: 100%;
	}

	.track {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
		border-radius: var(--radius-sm);
		background: var(--card-bg);
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	.fill {
		width: 100%;
		min-height: 4px;
		border-radius: var(--radius-sm);
		background: linear-gradient(180deg, var(--color-accent), rgba(16, 185, 129, 0.35));
		transition: height 0.3s ease;
	}

	.label {
		font-size: 11px;
		color: var(--color-muted);
	}
</style>
