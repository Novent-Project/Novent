<script lang="ts">
	import Kn5Viewer from '$lib/kn5/Kn5Viewer.svelte';
	import { carPreviewUrl, fetchCarModel } from '$lib/api';
	import { formatName } from '$lib/utils';
	import { Lock, LockOpen } from 'phosphor-svelte';

	let { car, game, locked = false, onToggleLock, onSnapshot }: {
		car: string | null;
		game: string;
		locked?: boolean;
		onToggleLock?: () => void;
		onSnapshot?: (shots: { side: string | null; rear: string | null }) => void;
	} = $props();

	let supported = $derived(game.trim().toUpperCase() === 'AC');

	let viewer   = $state<Kn5Viewer | null>(null);
	let fetching = $state(false);
	let failed   = $state(false);
	let loadedCar: string | null = null;
	let loadedInto: Kn5Viewer | null = null;

	let stillShot = $state<string | null>(null);
	let stillCar  = $state<string | null>(null);
	let preview   = $state<string | null>(null);
	let previewFailed: string | null = null;

	$effect.pre(() => {
		if (locked && viewer && stillCar === car) {
			const fresh = viewer.snapshotCurrent();
			if (fresh) stillShot = fresh;
		}
	});

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
		preview  = null;
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
			if (v.isEncrypted()) {
				const url = carPreviewUrl(game, target);
				if (url !== previewFailed) preview = url;
				onSnapshot?.({ side: null, rear: null });
				return;
			}
			const side = v.snapshotSide();
			const rear = v.snapshotRearQuarter();
			if (side || rear) onSnapshot?.({ side, rear });
			let stableW = 0;
			for (let i = 0; i < 60; i++) {
				await new Promise(requestAnimationFrame);
				if (cancelled) return;
				const w = v.canvasWidth();
				if (i >= 5 && w > 200 && w === stableW) break;
				stableW = w;
			}
			const still = v.snapshotCurrent();
			if (still) {
				stillShot = still;
				stillCar  = target;
			}
		});
		return () => { cancelled = true; };
	});
</script>

<div class="showroom">
	{#if supported}
		{#if preview}
			<div class="preview-wrap">
				<img
					class="preview"
					src={preview}
					alt={car ? formatName(car) : 'Car preview'}
					onerror={() => {
						previewFailed = preview;
						preview = null;
					}}
				/>
			</div>
		{:else if locked && stillShot && stillCar === car}
			<img class="still" src={stillShot} alt={car ? formatName(car) : 'Car showroom'} />
		{:else}
			<Kn5Viewer bind:this={viewer} brand={false} background="#0c0d10" {placeholder} />
		{/if}
		{#if !preview}
		<button
			class="lock-btn"
			class:locked
			type="button"
			aria-label={locked ? 'Unlock 3D renderer' : 'Lock renderer to a snapshot'}
			title={locked ? 'Unlock 3D renderer' : 'Lock renderer (snapshot, zero GPU)'}
			onclick={() => onToggleLock?.()}
		>
			{#if locked}
				<Lock size={16} weight="regular" />
			{:else}
				<LockOpen size={16} weight="regular" />
			{/if}
		</button>
		{/if}
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

	.still {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		background: #0c0d10;
	}

	.preview-wrap {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #0c0d10;
	}

	.preview {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.lock-btn {
		position: absolute;
		bottom: 12px;
		right: 12px;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border-radius: var(--radius-sm);
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		color: var(--color-muted);
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
	}

	.lock-btn:hover {
		color: var(--color-text);
		background: var(--card-bg-hover);
	}

	.lock-btn.locked {
		color: var(--color-accent);
		background: var(--color-accent-dim);
		border-color: var(--color-accent-border);
	}

	.lock-btn svg {
		width: 15px;
		height: 15px;
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