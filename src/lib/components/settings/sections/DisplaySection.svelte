<script lang="ts">
	import { APP_ZOOM_MIN, APP_ZOOM_MAX, APP_ZOOM_STEP, APP_ZOOM_DEFAULT } from '$lib/state/data.svelte';

	interface Props {
		appZoom:   number;
		traceZoom: number;
	}

	let { appZoom = $bindable(), traceZoom = $bindable() }: Props = $props();

	const TRACE_ZOOM_MIN     = 0.5;
	const TRACE_ZOOM_MAX     = 4;
	const TRACE_ZOOM_STEP    = 0.25;
	const TRACE_ZOOM_DEFAULT = 2;

	function adjustZoom(delta: number) {
		appZoom = Math.min(APP_ZOOM_MAX, Math.max(APP_ZOOM_MIN, Math.round((appZoom + delta) * 10) / 10));
	}

	function adjustTraceZoom(delta: number) {
		traceZoom = Math.min(TRACE_ZOOM_MAX, Math.max(TRACE_ZOOM_MIN, Math.round((traceZoom + delta) * 100) / 100));
	}
</script>

<section class="section">
	<h2>Display</h2>
	<p>Scale the interface (Ctrl&nbsp;+ / Ctrl&nbsp;− while focused, Ctrl&nbsp;0 to reset), and set how much of the lap the trace graphs span relative to the map zoom. Trace changes apply when you close this panel.</p>

	<div class="zoom-row">
		<div class="zoom-label">
			<span>Interface zoom</span>
			<span class="zoom-pct">{Math.round(appZoom * 100)}% scale</span>
		</div>
		<div class="zoom-controls">
			<button onclick={() => adjustZoom(-APP_ZOOM_STEP)}>−</button>
			<span>{Math.round(appZoom * 100)}%</span>
			<button onclick={() => adjustZoom(APP_ZOOM_STEP)}>+</button>
			<button class="reset-btn" onclick={() => appZoom = APP_ZOOM_DEFAULT}>Reset</button>
		</div>
	</div>

	<div class="zoom-row">
		<div class="zoom-label">
			<span>Trace proportionality</span>
			<span class="zoom-pct">≈{Math.round(traceZoom * 16)}% of lap shown</span>
		</div>
		<div class="zoom-controls">
			<button onclick={() => adjustTraceZoom(-TRACE_ZOOM_STEP)}>−</button>
			<span>{traceZoom.toFixed(2)}×</span>
			<button onclick={() => adjustTraceZoom(TRACE_ZOOM_STEP)}>+</button>
			<button class="reset-btn" onclick={() => traceZoom = TRACE_ZOOM_DEFAULT}>Reset</button>
		</div>
	</div>
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	h2 {
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: #fff;
		margin: 0;
	}

	p {
		font-size: 12px;
		color: rgba(255,255,255,0.4);
		line-height: 1.6;
		margin: 0;
		max-width: 56ch;
	}

	.zoom-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 16px;
		border-radius: 6px;
		background: rgba(255,255,255,0.02);
		box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
	}

	.zoom-label {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.zoom-label span:first-child {
		font-size: 12px;
		font-weight: 500;
		color: rgba(255,255,255,0.8);
	}

	.zoom-pct {
		font-size: 9px;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.10em;
		color: rgba(255,255,255,0.25);
	}

	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 2px;
		background: rgba(255,255,255,0.03);
		box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
		border-radius: 5px;
		padding: 3px;
	}

	.zoom-controls button {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 14px;
		color: rgba(255,255,255,0.4);
		transition: color 0.12s, background 0.12s;
	}

	.zoom-controls button:hover {
		color: #fff;
		background: rgba(255,255,255,0.06);
	}

	.zoom-controls span {
		font-size: 11px;
		font-family: var(--font-mono);
		color: rgba(255,255,255,0.6);
		width: 40px;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.reset-btn {
		margin-left: 4px;
		padding: 0 8px !important;
		width: auto !important;
		font-size: 10px !important;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
</style>