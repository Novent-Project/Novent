<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import QuitPanel from './QuitPanel.svelte';

	let quitPanelOpen = $state(false);

	async function minimize() {
		try {
			await getCurrentWindow().minimize();
		} catch {
		}
	}

	async function toggleMaximize() {
		try {
			const win = getCurrentWindow();
			if (await win.isMaximized()) await win.unmaximize();
			else await win.maximize();
		} catch {
		}
	}

	function openQuitPanel() {
		quitPanelOpen = true;
	}

	function closeQuitPanel() {
		quitPanelOpen = false;
	}
</script>

<div class="window-controls">
	<div class="reveal">
		<button class="win-btn" onclick={minimize} aria-label="Minimize" title="Minimize">
			<svg viewBox="0 0 10 10" fill="none">
				<path d="M1.5 5H8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
			</svg>
		</button>
		<button class="win-btn" onclick={toggleMaximize} aria-label="Maximize" title="Maximize">
			<svg viewBox="0 0 10 10" fill="none">
				<rect x="1.75" y="1.75" width="6.5" height="6.5" rx="1" stroke="currentColor" stroke-width="1.3" />
			</svg>
		</button>
	</div>

	<button class="win-btn close" onclick={openQuitPanel} aria-label="Close" title="Close">
		<svg viewBox="0 0 10 10" fill="none">
			<path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
		</svg>
	</button>
</div>

{#if quitPanelOpen}
	<QuitPanel onClose={closeQuitPanel} />
{/if}

<style>
	.window-controls {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.reveal {
		display: flex;
		align-items: center;
		overflow: hidden;
		max-width: 0;
		opacity: 0;
		transform: translateX(6px);
		transition:
			max-width 0.2s cubic-bezier(0.4, 0, 0.2, 1),
			opacity 0.15s ease,
			transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.window-controls:hover .reveal,
	.window-controls:focus-within .reveal {
		max-width: 76px;
		opacity: 1;
		transform: translateX(0);
	}

	.win-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: background 0.12s ease, color 0.12s ease;
	}

	.win-btn svg {
		width: 10px;
		height: 10px;
	}

	.win-btn:hover {
		background: var(--card-bg-hover);
		color: var(--color-text);
	}

	.win-btn.close:hover {
		background: var(--color-red);
		color: #fff;
	}
</style>
