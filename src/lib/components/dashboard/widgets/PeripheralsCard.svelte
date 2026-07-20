<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/chrome/Icon.svelte';

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
			if (pad) found.add(classify(pad.id));
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

<div class="card hud-card">
	<div class="grid">
		{#each peripherals as p (p.id)}
			<div class="item" class:connected={p.connected}>
				<span class="orb">
					<Icon name={p.id} size={18} />
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
		padding: 14px 20px;
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
