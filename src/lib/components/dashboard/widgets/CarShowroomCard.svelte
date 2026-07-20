<script lang="ts">
	import Kn5Viewer from '$lib/kn5/Kn5Viewer.svelte';
	import { fetchCarModel } from '$lib/api';
	import { formatName } from '$lib/utils';

	let { car, game, onSnapshot }: {
		car: string | null;
		game: string;
		onSnapshot?: (dataUrl: string) => void;
	} = $props();

	let supported = $derived(game.trim().toUpperCase() === 'AC');

	let viewer   = $state<Kn5Viewer | null>(null);
	let fetching = $state(false);
	let failed   = $state(false);
	let loadedCar: string | null = null;
	let loadedInto: Kn5Viewer | null = null;

	let placeholder = $derived(
		fetching ? 'Fetching car model…'
		: failed ? `No 3D model available for ${car ? formatName(car) : 'this car'}`
		: 'Drive a lap to fill the showroom'
	);

	$effect(() => {
		const target = car;
		const v      = viewer;
		if (!supported || !target || !v) return;
		if (target === loadedCar && v === loadedInto) return;

		let cancelled = false;
		fetching = true;
		failed   = false;
		fetchCarModel(game, target).then(async (data) => {
			if (cancelled) return;
			fetching = false;
			if (!data) {
				failed = true;
				return;
			}
			loadedCar  = target;
			loadedInto = v;
			await v.load({ name: formatName(target), data });
			if (cancelled) return;
			const shot = v.snapshotSide();
			if (shot) onSnapshot?.(shot);
		});
		return () => { cancelled = true; };
	});
</script>

<div class="showroom">
	{#if supported}
		<Kn5Viewer bind:this={viewer} brand={false} background="#0c0d10" {placeholder} />
	{:else}
		<div class="soon">
			<div class="soon-card">
				{#if car}<div class="car">{formatName(car)}</div>{/if}
				<div class="big">{game.trim().toUpperCase()} showroom</div>
				<div class="hint">Coming soon</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.showroom {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.soon {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.soon-card {
		text-align: center;
		padding: 40px 56px;
		border: 1.5px dashed var(--color-border-md);
		border-radius: 16px;
		background: var(--color-panel);
	}

	.car {
		font-size: 13px;
		color: var(--color-muted);
		margin-bottom: 6px;
	}

	.big {
		font-size: 22px;
		font-weight: 600;
		color: var(--color-text);
	}

	.hint {
		margin-top: 18px;
		font-size: 12px;
		color: var(--color-accent);
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
</style>