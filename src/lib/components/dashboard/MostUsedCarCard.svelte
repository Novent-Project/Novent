<script lang="ts">
	import { formatName } from '$lib/utils';

	interface CarUsage {
		car:  string;
		laps: number;
	}

	interface Props {
		cars?: CarUsage[]; // expects up to 2 entries
	}

	let { cars = [] }: Props = $props();

	let maxLaps = $derived(Math.max(1, ...cars.map(c => c.laps)));
</script>

{#snippet carIcon()}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
		<path d="M6 6h15l-1.5 9h-12z" stroke-linejoin="round" />
		<path d="M6 6L4.5 3H2" stroke-linecap="round" stroke-linejoin="round" />
		<circle cx="9.5" cy="19" r="1.4" fill="currentColor" stroke="none" />
		<circle cx="17.5" cy="19" r="1.4" fill="currentColor" stroke="none" />
	</svg>
{/snippet}

<div class="card hud-card">
	{#if cars.length}
		<!-- Placeholder hero shot for the most-used car — swap for the real
		     render/photo once that's wired up. -->
		<div class="placeholder hero" aria-hidden="true">
			{@render carIcon()}
		</div>

		<ul class="list">
			{#each cars as c (c.car)}
				<li class="row">
					<!-- Placeholder per-car thumb — swap for the real render/photo
					     once that's wired up. -->
					<span class="placeholder thumb" aria-hidden="true">
						{@render carIcon()}
					</span>

					<div class="info">
						<span class="name">{formatName(c.car)}</span>
						<div class="bar-track">
							<div class="bar-fill" style="width: {(c.laps / maxLaps) * 100}%;"></div>
						</div>
					</div>

					<span class="laps mono">{c.laps} lap{c.laps === 1 ? '' : 's'}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty">
			<span class="placeholder thumb thumb--empty" aria-hidden="true">
				{@render carIcon()}
			</span>
			<span class="title">No Cars Yet</span>
			<span class="sub">Head to the Race Engineer tab to start logging data</span>
		</div>
	{/if}
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 18px 20px;
	}

	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		border: 1px dashed var(--color-border-md);
		color: var(--color-subtle);
	}

	.hero {
		width: 100%;
		height: 150px;
		margin-bottom: 12px;
	}

	.hero svg { width: 32px; height: 32px; }

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px;
		border-radius: var(--radius-sm);
		background: var(--card-bg);
		border: 1px solid var(--color-border);
	}

	.thumb {
		flex: 0 0 auto;
		width: 48px;
		height: 48px;
	}

	.thumb svg { width: 20px; height: 20px; }

	.info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar-track {
		height: 3px;
		border-radius: var(--radius-pill);
		background: var(--color-border);
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: var(--radius-pill);
		background: var(--color-accent);
	}

	.laps {
		flex: 0 0 auto;
		font-size: 11px;
		color: var(--color-muted);
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		text-align: center;
		padding: 8px 0;
	}

	.thumb--empty {
		width: 64px;
		height: 64px;
	}

	.thumb--empty svg { width: 26px; height: 26px; }

	.title { font-size: 16px; font-weight: 700; color: var(--color-text); }

	.sub {
		font-size: 11px;
		color: var(--color-muted);
		max-width: 28ch;
		line-height: 1.5;
	}
</style>