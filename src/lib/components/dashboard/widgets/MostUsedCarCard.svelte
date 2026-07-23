<script lang="ts">
	import { formatName } from '$lib/utils';
	import Icon from '$lib/components/chrome/Icon.svelte';

	interface CarSpotlight {
		car:         string;
		laps:        number;
		game?:       string;
		bestLap?:    string;
		track?:      string;
		lastDriven?: string;
	}

	interface Props {
		car?:        CarSpotlight | null;
		heroImage?:  string | null;
		rearImage?:  string | null;
		heroScale?:  number;
		rearScale?:  number;
	}

	let { car = null, heroImage = null, rearImage = null, heroScale = 1, rearScale = 1 }: Props = $props();
</script>

<div class="card hud-card">
	{#if car}
		{#if heroImage}
			<div class="hero frame">
				<img class="hero-img" style:transform="scale({heroScale})" src={heroImage} alt="Side profile of {formatName(car.car)}" />
			</div>
		{:else}
			<div class="placeholder hero" aria-hidden="true">
				<Icon name="car" size={32} />
			</div>
		{/if}

		{#if rearImage}
			<div class="rear frame">
				<img class="hero-img" style:transform="scale({rearScale})" src={rearImage} alt="Rear three-quarter view of {formatName(car.car)}" />
			</div>
		{/if}

		<div class="identity">
			<span class="logo"><Icon game={car.game ?? 'AC'} size={20} /></span>
			<div class="titles">
				<span class="name">{formatName(car.car)}</span>
				<span class="tag">Most driven car</span>
			</div>
		</div>

		<dl class="stats">
			<div class="stat">
				<dt>Laps</dt>
				<dd class="mono">{car.laps}</dd>
			</div>
			<div class="stat">
				<dt>Best Lap</dt>
				<dd class="mono">{car.bestLap ?? '—'}</dd>
			</div>
			<div class="stat">
				<dt>Top Track</dt>
				<dd>{car.track ? formatName(car.track) : '—'}</dd>
			</div>
			<div class="stat">
				<dt>Last Driven</dt>
				<dd>{car.lastDriven ?? '—'}</dd>
			</div>
		</dl>
	{:else}
		<div class="empty">
			<span class="placeholder thumb thumb--empty" aria-hidden="true">
				<Icon name="car" size={26} />
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
		gap: 12px;
		width: 100%;
		height: 100%;
		padding: var(--card-padding, 20px);
		box-sizing: border-box;
		overflow-x: hidden;
		overflow-y: auto;
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
		flex: 1 1 100px;
		min-height: 0;
		max-height: 140px;
	}

	.rear {
		width: 100%;
		flex: 1.6 1 130px;
		min-height: 0;
		max-height: 180px;
	}

	.frame {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--card-bg);
		padding: 6px 10px;
		box-sizing: border-box;
	}

	.hero-img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		transform-origin: center;
	}

	.identity {
		flex: 0 0 auto;
		margin-top: auto;
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.logo {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
	}

	.titles {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.name {
		font-size: 14px;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.3;
		overflow-wrap: break-word;
	}

	.tag {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.stats {
		margin: 0;
		flex: 0 0 auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		background: var(--card-bg);
		border: 1px solid var(--color-border);
		min-width: 0;
	}

	.stat dt {
		margin: 0;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.stat dd {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	.title { font-size: 16px; font-weight: 700; color: var(--color-text); }

	.sub {
		font-size: 11px;
		color: var(--color-muted);
		max-width: 28ch;
		line-height: 1.5;
	}
</style>