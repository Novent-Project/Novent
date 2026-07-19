<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { invoke } from '@tauri-apps/api/core';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	async function minimizeToTray() {
		try {
			await getCurrentWindow().hide();
		} catch {
		}
		onClose();
	}

	async function quitApp() {
		try {
			await invoke('quit');
		} catch {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="quit-overlay" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
	<div class="quit-panel" role="dialog" aria-modal="true" aria-label="Quit Novent" tabindex="-1">
		<h2>Quit Novent?</h2>
		<p>You can keep it running quietly in the background, or close it completely.</p>

		<div class="quit-actions">
			<button class="quit-option" onclick={minimizeToTray}>
				<div class="option-icon">
					<svg viewBox="0 0 16 16" fill="none">
						<rect x="2" y="3" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3" />
						<path d="M5 13.5H11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
					</svg>
				</div>
				<div class="option-copy">
					<span class="option-title">Minimize to Tray</span>
					<span class="option-sub">Keep running in the background</span>
				</div>
			</button>

			<button class="quit-option danger" onclick={quitApp}>
				<div class="option-icon">
					<svg viewBox="0 0 16 16" fill="none">
						<path d="M3 3L13 13M13 3L3 13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
					</svg>
				</div>
				<div class="option-copy">
					<span class="option-title">Quit</span>
					<span class="option-sub">Close the app completely</span>
				</div>
			</button>
		</div>

		<button class="cancel" onclick={onClose}>Cancel</button>
	</div>
</div>

<style>
	.quit-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
	}

	.quit-panel {
		width: 340px;
		padding: 24px;
		border-radius: var(--radius-card);
		background: var(--color-panel);
		border: 1px solid var(--card-border);
		box-shadow: var(--card-shadow);
	}

	h2 {
		margin: 0 0 6px;
		font-size: 16px;
		font-weight: 700;
		color: #fff;
	}

	p {
		margin: 0 0 20px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.quit-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 14px;
	}

	.quit-option {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--card-border);
		background: var(--card-bg);
		cursor: pointer;
		text-align: left;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.quit-option:hover {
		background: var(--card-bg-hover);
		border-color: var(--color-accent-border);
	}

	.quit-option.danger:hover {
		border-color: rgba(239, 68, 68, 0.35);
		background: rgba(239, 68, 68, 0.08);
	}

	.option-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		border-radius: var(--radius-sm);
		background: var(--color-accent-dim);
		color: var(--color-accent);
	}

	.quit-option.danger .option-icon {
		background: rgba(239, 68, 68, 0.12);
		color: var(--color-red);
	}

	.option-icon svg {
		width: 15px;
		height: 15px;
	}

	.option-copy {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.option-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
	}

	.option-sub {
		font-size: 11px;
		color: var(--color-muted);
	}

	.cancel {
		width: 100%;
		padding: 10px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--color-muted);
		font-size: 13px;
		cursor: pointer;
		transition: color 0.12s ease, background 0.12s ease;
	}

	.cancel:hover {
		color: var(--color-text);
		background: var(--card-bg);
	}
</style>
