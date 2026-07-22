<script lang="ts">
	import { APP_ZOOM_MIN, APP_ZOOM_MAX, APP_ZOOM_STEP, APP_ZOOM_DEFAULT } from '$lib/state/data.svelte';
	import {
		loadRememberedQuitChoice,
		loadRememberFlag,
		setRememberFlag,
		setRememberedQuitAction
	} from '$lib/utils/quitChoice';
	import type { QuitAction } from '$lib/utils/quitChoice';

	interface Props {
		appZoom:   number;
		traceZoom: number;
		graphPlacement: 'bottom' | 'side';
	}

	let { appZoom = $bindable(), traceZoom = $bindable(), graphPlacement = $bindable() }: Props = $props();

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

	type QuitBehavior = 'ask' | QuitAction;

	function currentBehavior(): QuitBehavior {
		if (!loadRememberFlag()) return 'ask';
		return loadRememberedQuitChoice() ?? 'ask';
	}

	let quitBehavior = $state<QuitBehavior>(currentBehavior());

	function setQuitBehavior(value: QuitBehavior) {
		quitBehavior = value;
		if (value === 'ask') {
			setRememberFlag(false);
		} else {
			setRememberFlag(true);
			setRememberedQuitAction(value);
		}
	}
</script>

<div class="group">
	<span class="group-label">Interface scale</span>
	<div class="box">
		<div class="row">
			<div class="row-label">
				<span>App zoom</span>
				<span class="row-sub">Ctrl + / Ctrl − to adjust, Ctrl 0 to reset</span>
			</div>
			<div class="row-controls">
				<div class="stepper">
					<button onclick={() => adjustZoom(-APP_ZOOM_STEP)}>−</button>
					<span>{Math.round(appZoom * 100)}%</span>
					<button onclick={() => adjustZoom(APP_ZOOM_STEP)}>+</button>
				</div>
				<button class="reset-btn" onclick={() => appZoom = APP_ZOOM_DEFAULT}>Reset</button>
			</div>
		</div>

		<div class="row">
			<div class="row-label">
				<span>Trace proportionality</span>
				<span class="row-sub">≈{Math.round(traceZoom * 16)}% of lap shown</span>
			</div>
			<div class="row-controls">
				<div class="stepper">
					<button onclick={() => adjustTraceZoom(-TRACE_ZOOM_STEP)}>−</button>
					<span>{traceZoom.toFixed(2)}×</span>
					<button onclick={() => adjustTraceZoom(TRACE_ZOOM_STEP)}>+</button>
				</div>
				<button class="reset-btn" onclick={() => traceZoom = TRACE_ZOOM_DEFAULT}>Reset</button>
			</div>
		</div>
	</div>
</div>

<div class="group">
	<span class="group-label">Graphs</span>
	<div class="box">
		<div class="row">
			<div class="row-label">
				<span>Telemetry graph placement</span>
				<span class="row-sub">Where the playbar's graph button opens them</span>
			</div>
			<div class="seg">
				<button class="seg-btn" class:active={graphPlacement === 'bottom'} onclick={() => graphPlacement = 'bottom'}>Bottom</button>
				<button class="seg-btn" class:active={graphPlacement === 'side'} onclick={() => graphPlacement = 'side'}>Side</button>
			</div>
		</div>
	</div>
</div>

<div class="group">
	<span class="group-label">Quit behavior</span>
	<div class="box">
		<div class="row">
			<div class="row-label">
				<span>When closing the window</span>
				<span class="row-sub">What happens when you close Novent</span>
			</div>
			<div class="seg">
				<button class="seg-btn" class:active={quitBehavior === 'ask'} onclick={() => setQuitBehavior('ask')}>Ask</button>
				<button class="seg-btn" class:active={quitBehavior === 'tray'} onclick={() => setQuitBehavior('tray')}>Tray</button>
				<button class="seg-btn" class:active={quitBehavior === 'quit'} onclick={() => setQuitBehavior('quit')}>Quit</button>
			</div>
		</div>
	</div>
</div>

<style>
	.group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.group-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.10em;
		color: var(--color-subtle);
		padding: 0 2px;
	}

	.box {
		display: flex;
		flex-direction: column;
		border-radius: var(--radius-sm);
		background: var(--card-bg);
		box-shadow: inset 0 0 0 1px var(--color-border);
		overflow: hidden;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		padding: 15px 18px;
		border-bottom: 1px solid var(--color-border);
	}

	.row:last-child {
		border-bottom: none;
	}

	.row-label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.row-label span:first-child {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text);
	}

	.row-sub {
		font-size: 11px;
		font-family: var(--font-mono);
		color: var(--color-muted);
	}

	.row-controls {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.stepper {
		display: flex;
		align-items: center;
		gap: 2px;
		background: var(--color-panel);
		box-shadow: inset 0 0 0 1px var(--color-border);
		border-radius: 6px;
		padding: 3px;
	}

	.stepper button {
		width: 23px;
		height: 23px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 12px;
		color: var(--color-muted);
		transition: color 0.12s, background 0.12s;
	}

	.stepper button:hover {
		color: var(--color-text);
		background: var(--card-bg);
	}

	.stepper span {
		font-size: 11px;
		font-family: var(--font-mono);
		color: var(--color-text);
		width: 36px;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.reset-btn {
		padding: 0 11px;
		height: 23px;
		border-radius: 5px;
		background: none;
		border: 1px solid var(--color-border);
		cursor: pointer;
		font-family: inherit;
		font-size: 10px;
		font-weight: 500;
		color: var(--color-muted);
		transition: color 0.12s, border-color 0.12s;
	}

	.reset-btn:hover {
		color: var(--color-text);
		border-color: var(--color-border-md, var(--color-border));
	}

	.seg {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		background: var(--color-panel);
		box-shadow: inset 0 0 0 1px var(--color-border);
		border-radius: 6px;
		padding: 3px;
	}

	.seg-btn {
		padding: 5px 12px;
		border-radius: 4px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 11px;
		font-weight: 500;
		white-space: nowrap;
		color: var(--color-muted);
		transition: color 0.12s, background 0.12s;
	}

	.seg-btn:hover {
		color: var(--color-text);
	}

	.seg-btn.active {
		color: var(--color-text);
		background: var(--color-border);
	}
</style>