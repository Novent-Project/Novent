<script lang="ts">
	import { onMount } from 'svelte';

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

	// Best-effort classification of connected gamepads by device name.
	// Many direct-drive wheelbases report wheel + pedals as a single HID
	// device, so anything unmatched defaults to the wheelbase rather than
	// a handheld controller.
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
					{#if p.id === 'wheel'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<circle cx="12" cy="12" r="8" />
							<circle cx="12" cy="12" r="2.25" />
							<path d="M12 4v3.6M5.3 16.4l3-1.7M18.7 16.4l-3-1.7" stroke-linecap="round" />
						</svg>
					{:else if p.id === 'pedals'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<rect x="6" y="7" width="3.6" height="13" rx="1.4" transform="rotate(-8 7.8 13.5)" />
							<rect x="13.8" y="4.5" width="3.6" height="15.5" rx="1.4" transform="rotate(-4 15.6 12)" />
						</svg>
					{:else if p.id === 'shifter'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M6 6v12M12 6v12M18 6v12M6 12h12" stroke-linecap="round" stroke-linejoin="round" />
							<circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" />
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M6.5 6.5h11a3 3 0 0 1 3 3v3.6a2.6 2.6 0 0 1-2.6 2.6c-.85 0-1.35-.4-1.85-.95l-.85-.9H8.8l-.85.9c-.5.55-1 .95-1.85.95a2.6 2.6 0 0 1-2.6-2.6V9.5a3 3 0 0 1 3-3Z" />
							<path d="M7.3 10.3v2.4M6.1 11.5h2.4" stroke-linecap="round" />
							<circle cx="16" cy="10" r="0.9" fill="currentColor" stroke="none" />
							<circle cx="18" cy="12" r="0.9" fill="currentColor" stroke="none" />
						</svg>
					{/if}
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
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}

	.item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.orb {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--card-bg);
		border: 1px solid var(--color-border);
		color: var(--color-subtle);
		transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
	}

	.orb svg { width: 18px; height: 18px; }

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
	}

	.item.connected .label {
		color: var(--color-text);
	}
</style>