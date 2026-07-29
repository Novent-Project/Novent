<script lang="ts">
	import { resetWidget } from '$lib/utils';
	import type { UiState } from '$lib/components/analysis/state';

	interface Props {
		ui:     UiState;
		align?: 'left' | 'right';
	}

	let { ui, align = 'right' }: Props = $props();

	let open = $state(false);

	const WIDGETS: { key: string; label: string; dragKeys: string[] }[] = [
		{ key: 'session-header',    label: 'Session info',  dragKeys: ['session-header'] },
		{ key: 'standings',         label: 'Standings',     dragKeys: ['standings'] },
		{ key: 'segment-map',       label: 'Segment map',   dragKeys: ['segment-map'] },
		{ key: 'telemetry',         label: 'Driver info',   dragKeys: ['telemetry-primary'] },
		{ key: 'g-force',           label: 'G-Force',       dragKeys: ['g-force'] },
		{ key: 'sector-comparison', label: 'Sectors',       dragKeys: ['sector-comparison'] },
		{ key: 'zoom-control',      label: 'Zoom control',  dragKeys: ['zoom-control'] },
	];

	function resetPosition(dragKeys: string[]) {
		for (const k of dragKeys) resetWidget(k);
	}
</script>

<div class="widget-manager" class:align-left={align === 'left'}>
	<button
		class="toggle-btn"
		class:active={open}
		onclick={() => (open = !open)}
		aria-label="Manage widgets"
		title="Widgets"
	>
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
			<rect x="2" y="2" width="5" height="5" rx="1" />
			<rect x="9" y="2" width="5" height="5" rx="1" />
			<rect x="2" y="9" width="5" height="5" rx="1" />
			<rect x="9" y="9" width="5" height="5" rx="1" />
		</svg>
	</button>

	{#if open}
		<div class="panel hud-card">
			<div class="panel-title">Widgets</div>
			{#each WIDGETS as w (w.key)}
				<div class="row">
					<span class="label">{w.label}</span>
					<button
						class="icon-btn"
						onclick={() => resetPosition(w.dragKeys)}
						aria-label="Reset {w.label} position"
						title="Reset position"
					>
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
							<path d="M3 8a5 5 0 1 1 1.5 3.6M3 8V4.5M3 8h3.5" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
					<button
						class="switch"
						class:on={ui.widgetVisible(w.key)}
						role="switch"
						aria-checked={ui.widgetVisible(w.key)}
						aria-label="Show {w.label}"
						onclick={() => ui.setWidgetVisible(w.key, !ui.widgetVisible(w.key))}
					>
						<span class="knob"></span>
					</button>
				</div>
			{/each}
			<button class="reset-all" onclick={() => ui.resetLayout()}>Reset layout</button>
		</div>
	{/if}
</div>

<style>
	.widget-manager {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.widget-manager.align-left {
		align-items: flex-start;
	}

	.widget-manager.align-left .panel {
		right: auto;
		left: 0;
	}

	.toggle-btn {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		border-radius: var(--radius-sm);
		color: var(--color-muted);
		cursor: pointer;
		padding: 0;
	}

	.toggle-btn svg {
		width: 16px;
		height: 16px;
	}

	.toggle-btn:hover,
	.toggle-btn.active {
		color: var(--color-text);
		border-color: var(--color-border-md);
	}

	.panel {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 30;
		width: 224px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.panel-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-muted);
		padding-bottom: 6px;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 4px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
	}

	.label {
		flex: 1;
		font-size: 0.8125rem;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.icon-btn {
		width: 22px;
		height: 22px;
		display: grid;
		place-items: center;
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		color: var(--color-muted);
		cursor: pointer;
		padding: 0;
	}

	.icon-btn svg {
		width: 13px;
		height: 13px;
	}

	.icon-btn:hover {
		color: var(--color-text);
		border-color: var(--card-border);
	}

	.switch {
		width: 30px;
		height: 17px;
		flex-shrink: 0;
		border-radius: 999px;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		cursor: pointer;
		padding: 0;
		position: relative;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.switch .knob {
		position: absolute;
		top: 1.5px;
		left: 2px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-muted);
		transition: transform 0.15s ease, background 0.15s ease;
	}

	.switch.on {
		background: var(--color-accent-dim, rgba(16, 185, 129, 0.25));
		border-color: var(--color-accent, #10b981);
	}

	.switch.on .knob {
		transform: translateX(12px);
		background: var(--color-accent, #10b981);
	}

	.reset-all {
		margin-top: 8px;
		width: 100%;
		background: none;
		border: 1px dashed var(--card-border);
		border-radius: var(--radius-sm);
		color: var(--color-muted);
		padding: 7px 12px;
		cursor: pointer;
		font-size: 12px;
		font-family: var(--font-sans);
	}

	.reset-all:hover {
		color: var(--color-text);
		border-color: var(--color-border-md);
	}
</style>
