<script lang="ts">
	import { formatName } from '$lib/utils';

	interface Props {
		car?: string | null;
	}

	let { car = null }: Props = $props();
</script>

<div class="card hud-card">
	<h3 class="heading">Most Used Car</h3>

	<div class="body">
		<svg class="car-art" viewBox="0 0 120 60" fill="none" aria-hidden="true">
			<path
				d="M18 30 C18 20 30 12 60 12 C90 12 102 20 102 30 C102 40 90 48 60 48 C30 48 18 40 18 30 Z"
				stroke="var(--color-subtle)" stroke-width="2"
			/>
			<path d="M42 15 C50 12 70 12 78 15 L74 26 H46 Z" stroke="var(--color-subtle)" stroke-width="1.5" />
			<path d="M46 34 H74 L78 45 C70 48 50 48 42 45 Z" stroke="var(--color-subtle)" stroke-width="1.5" />
			<circle cx="34" cy="22" r="2" fill="var(--color-subtle)" />
			<circle cx="86" cy="22" r="2" fill="var(--color-subtle)" />
		</svg>

		{#if car}
			<span class="title">{formatName(car)}</span>
		{:else}
			<span class="title">No Cars Yet</span>
			<span class="sub">Head to the Race Engineer tab to start logging data</span>
		{/if}
	</div>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px;
	}

	.heading {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		color: #fff;
	}

	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		text-align: center;
		padding: 8px 0;
	}

	.car-art { width: 130px; height: 65px; opacity: 0.6; }

	.title { font-size: 18px; font-weight: 700; color: #fff; }

	.sub {
		font-size: 11px;
		color: var(--color-muted);
		max-width: 28ch;
		line-height: 1.5;
	}
</style>
