<script lang="ts">
	interface Props {
		value: number;
		min: number;
		max: number;
		step?: number;
		onChange: (v: number) => void;
	}

	let { value, min, max, step, onChange }: Props = $props();

	let effectiveStep = $derived(step ?? (max - min) / 20);

	let fillPct = $derived(max > min ? ((clamp(value) - min) / (max - min)) * 100 : 0);

	function clamp(v: number): number {
		return Math.min(max, Math.max(min, v));
	}

	function decrement() {
		onChange(clamp(value - effectiveStep));
	}

	function increment() {
		onChange(clamp(value + effectiveStep));
	}
</script>

<div class="zoom-control">
	<button type="button" class="step-btn" onclick={decrement} aria-label="Zoom out">
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M3 8h10" stroke-linecap="round" />
		</svg>
	</button>
	<input
		class="slider mono"
		type="range"
		min={min}
		max={max}
		step={step ?? 0.01}
		value={value}
		style="--fill: {fillPct}%"
		oninput={(e) => onChange(+(e.currentTarget as HTMLInputElement).value)}
	/>
	<button type="button" class="step-btn" onclick={increment} aria-label="Zoom in">
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M8 3v10M3 8h10" stroke-linecap="round" />
		</svg>
	</button>
</div>

<style>
	.zoom-control {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 8px;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		border-radius: var(--radius-pill);
	}

	.step-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition:
			color 0.12s ease,
			background 0.12s ease;
	}

	.step-btn:hover {
		color: var(--color-text);
		background: var(--card-bg-hover);
	}

	.step-btn svg {
		width: 14px;
		height: 14px;
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 120px;
		height: 3px;
		border-radius: var(--radius-pill);
		background: linear-gradient(
			to right,
			var(--color-accent) 0%,
			var(--color-accent) var(--fill, 50%),
			var(--color-border-md) var(--fill, 50%),
			var(--color-border-md) 100%
		);
		cursor: pointer;
		outline: none;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-accent);
		border: none;
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-accent);
		border: none;
		cursor: pointer;
	}

	.slider::-moz-range-track {
		height: 3px;
		border-radius: var(--radius-pill);
		background: var(--color-border-md);
	}

	.slider::-moz-range-progress {
		height: 3px;
		border-radius: var(--radius-pill);
		background: var(--color-accent);
	}
</style>
