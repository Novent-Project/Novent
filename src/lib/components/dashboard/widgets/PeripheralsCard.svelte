<script lang="ts">
	import { onMount } from 'svelte';
	import { SteeringWheel, GameController } from 'phosphor-svelte';

	type PeripheralId = 'wheel' | 'pedals' | 'shifter' | 'controller';

	interface Peripheral {
		id:        PeripheralId;
		label:     string;
		connected: boolean;
	}

	let peripherals = $state<Peripheral[]>([
		{ id: 'wheel',      label: 'Wheel',      connected: false },
		{ id: 'pedals',     label: 'Pedals',     connected: false },
		{ id: 'shifter',    label: 'Shifter',    connected: false },
		{ id: 'controller', label: 'Controller', connected: false }
	]);

	function classify(id: string): PeripheralId {
		const s = id.toLowerCase();
		if (/shift|handbrake/.test(s)) return 'shifter';
		if (/pedal/.test(s)) return 'pedals';
		if (/xbox|dualshock|dualsense|playstation|nintendo|joy-con|gamepad|controller/.test(s)) return 'controller';
		return 'wheel';
	}

	function scan() {
		const pads = navigator.getGamepads?.() ?? [];
		const found = new Set<PeripheralId>();
		for (const pad of pads) {
			if (!pad) continue;
			const kind = classify(pad.id);
			found.add(kind);
			if (kind === 'wheel' && pad.axes.length >= 3) found.add('pedals');
		}
		for (const p of peripherals) {
			p.connected = found.has(p.id);
		}
	}

	onMount(() => {
		scan();
		window.addEventListener('gamepadconnected', scan);
		window.addEventListener('gamepaddisconnected', scan);
		const interval = setInterval(scan, 1500);

		return () => {
			window.removeEventListener('gamepadconnected', scan);
			window.removeEventListener('gamepaddisconnected', scan);
			clearInterval(interval);
		};
	});
</script>

{#snippet peripheralIcon(id: PeripheralId)}
	{#if id === 'wheel'}
		<SteeringWheel size={18} weight="regular" />
	{:else if id === 'controller'}
		<GameController size={18} weight="regular" />
	{:else if id === 'pedals'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
			<rect x="6" y="7" width="3.6" height="13" rx="1.4" transform="rotate(-8 7.8 13.5)" vector-effect="non-scaling-stroke" />
			<rect x="13.8" y="4.5" width="3.6" height="15.5" rx="1.4" transform="rotate(-4 15.6 12)" vector-effect="non-scaling-stroke" />
		</svg>
	{:else if id === 'shifter'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
			<path d="M6 6v12M12 6v12M18 6v12M6 12h12" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
			<circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" />
		</svg>
	{/if}
{/snippet}

<div class="card hud-card">
	<div class="grid">
		{#each peripherals as p (p.id)}
			<div class="item" class:connected={p.connected}>
				<span class="orb">
					{@render peripheralIcon(p.id)}
				</span>
				<span class="label">{p.label}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		justify-content: center;
		width: 100%;
		height: 100%;
		padding: var(--card-padding, 20px);
		box-sizing: border-box;
		overflow: hidden;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}

	.item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.orb {
		width: 100%;
		max-width: 40px;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--card-bg);
		border: 1px solid var(--color-border);
		color: var(--color-subtle);
		transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
	}

	.orb :global(svg) {
		display: block;
		width: 18px;
		height: 18px;
	}

	.item.connected .orb {
		color: var(--color-accent);
		background: var(--color-accent-dim);
		border-color: var(--color-accent-border);
		box-shadow: 0 0 12px rgba(16, 185, 129, 0.45);
	}

	.label {
		font-size: 11px;
		color: var(--color-muted);
		transition: color 0.2s ease;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item.connected .label {
		color: var(--color-text);
	}
</style>