<script lang="ts">
	import { open } from '@tauri-apps/plugin-shell';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { invoke } from '@tauri-apps/api/core';
	import { loadRememberedQuitChoice, loadRememberFlag, setRememberFlag, setRememberedQuitAction } from '$lib/utils/quitChoice';
	import type { DetectionState } from '$lib/api';
	import { Minus, Square, X } from 'phosphor-svelte';
	import discordSvg from '$lib/assets/logos/discord.svg?raw';
	import githubSvg from '$lib/assets/logos/github.svg?raw';

	interface Props {
		detection: DetectionState;
	}

	let { detection }: Props = $props();

	function openExternal(url: string) {
		open(url).catch((err) => console.error('Failed to open external URL:', err));
	}

	let connLabel = $derived(
		detection.status === 'idle'     ? 'No game detected' :
		detection.status === 'detected' ? `${detection.game} detected` :
		                      `${detection.game} — session active`
	);

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

	async function openQuitPanel(e: MouseEvent) {
		if (!e.shiftKey) {
			const remembered = loadRememberedQuitChoice();
			if (remembered === 'tray') {
				try {
					await getCurrentWindow().hide();
				} catch {
				}
				return;
			}
			if (remembered === 'quit') {
				try {
					await invoke('quit');
				} catch {
				}
				return;
			}
		}
		quitPanelOpen = true;
	}

	function closeQuitPanel() {
		quitPanelOpen = false;
	}

	let remember = $state(loadRememberFlag());

	function toggleRemember() {
		remember = !remember;
		setRememberFlag(remember);
	}

	async function minimizeToTray() {
		if (remember) setRememberedQuitAction('tray');
		try {
			await getCurrentWindow().hide();
		} catch {
		}
		closeQuitPanel();
	}

	async function quitApp() {
		if (remember) setRememberedQuitAction('quit');
		try {
			await invoke('quit');
		} catch {
			closeQuitPanel();
		}
	}

	function handleQuitPanelKeydown(e: KeyboardEvent) {
		if (quitPanelOpen && e.key === 'Escape') closeQuitPanel();
	}
</script>

<svelte:window onkeydown={handleQuitPanelKeydown} />

<header class="topbar" data-tauri-drag-region>
	<div class="search"><span class="search-soon">Search coming soon</span></div>

	<div class="spacer" data-tauri-drag-region></div>

	<div class="conn" class:detected={detection.status === 'detected'} class:active={detection.status === 'active'}>
		<span class="conn-dot"></span>
		<span class="conn-text">{connLabel}</span>
	</div>

	<div class="actions">
		<button type="button" class="icon-btn" onclick={() => openExternal('https://discord.gg/QhfZyrcfSE')} aria-label="Discord">
			{@html discordSvg}
		</button>
		<button type="button" class="icon-btn" onclick={() => openExternal('https://github.com/Novent-project/Novent')} aria-label="GitHub">
			{@html githubSvg}
		</button>
	</div>

	<div class="divider"></div>

	<div class="window-controls">
		<button class="win-btn" onclick={minimize} aria-label="Minimize" title="Minimize">
			<Minus size={10} weight="bold" />
		</button>
		<button class="win-btn" onclick={toggleMaximize} aria-label="Maximize" title="Maximize">
			<Square size={10} weight="bold" />
		</button>

		<button class="win-btn close" onclick={openQuitPanel} aria-label="Close" title="Close (Shift+Click to change your remembered choice)">
			<X size={10} weight="bold" />
		</button>
	</div>
</header>

{#if quitPanelOpen}
	<div class="quit-overlay" onclick={(e) => { if (e.target === e.currentTarget) closeQuitPanel(); }} role="presentation">
		<div class="quit-panel" role="dialog" aria-modal="true" aria-label="Quit Novent" tabindex="-1">
			<div class="quit-mark">
				<svg viewBox="0 0 64 64" aria-hidden="true">
					<path
						d="M14 8 H50 a6 6 0 0 1 6 6 V42 L42 56 H14 a6 6 0 0 1 -6 -6 V14 a6 6 0 0 1 6 -6 Z"
						fill="var(--color-accent)" fill-opacity="0.16" stroke="var(--color-accent)" stroke-width="3" stroke-linejoin="round"
					/>
					<path
						transform="translate(16 23.2) scale(0.2)"
						d="M0,88 L30,88 L46,44 L64,44 L80,88 L110,88 L126,44 L144,44 L160,0 L130,0 L114,44 L96,44 L80,0 L50,0 L34,44 L16,44 Z"
						fill="var(--color-accent)"
					/>
				</svg>
			</div>

			<h2>Close Novent?</h2>
			<p class="quit-sub">Choose how you'd like to exit.</p>

			<button class="remember-row" onclick={toggleRemember}>
				<span class="toggle" class:on={remember} aria-hidden="true">
					<span class="knob"></span>
				</span>
				<span class="remember-label">Remember my choice</span>
			</button>

			<div class="quit-actions">
				<button class="quit-btn outline" onclick={quitApp}>Quit</button>
				<button class="quit-btn primary" onclick={minimizeToTray}>Minimize to Tray</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.topbar {
		flex-shrink: 0;
		height: var(--topbar-h, 48px);
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 0 16px;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.search {
		display: flex;
		align-items: center;
		width: 280px;
		max-width: 40%;
		height: 30px;
		padding: 0 14px;
		box-sizing: border-box;
		border-radius: var(--radius-pill);
		background: var(--card-bg);
		border: 1px solid var(--card-border);
	}

	.search-soon {
		font-size: 11px;
		color: var(--color-subtle);
		letter-spacing: 0.02em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.spacer {
		flex: 1;
	}

	.conn {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--color-muted);
		white-space: nowrap;
	}

	.conn-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-subtle);
		transition: background 0.2s ease, box-shadow 0.2s ease;
	}

	.conn.detected .conn-dot {
		background: var(--color-muted);
	}

	.conn.active .conn-dot {
		background: var(--color-accent);
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
	}

	.conn.active .conn-text {
		color: var(--color-text);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border-radius: var(--radius-sm, 6px);
		background: none;
		border: none;
		color: var(--color-muted);
		font-family: inherit;
		line-height: 0;
		cursor: pointer;
		transition: color 0.12s ease, background 0.12s ease;
	}

	.icon-btn:hover {
		color: var(--color-text);
		background: var(--card-bg);
	}

	.icon-btn :global(svg) {
		display: block;
		width: 16px;
		height: 16px;
	}

	.divider {
		width: 1px;
		height: 22px;
		background: var(--color-border);
	}

	.window-controls {
		display: flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
		margin-left: 4px;
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

	.quit-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0,0,0,0.55);
		backdrop-filter: blur(3px);
		animation: fade-in 0.15s ease;
	}

	.quit-panel {
		width: 400px;
		padding: 36px 32px 28px;
		border-radius: calc(var(--radius-card, var(--radius-md, 12px)) + 4px);
		background: var(--color-panel);
		font-family: inherit;
		box-shadow:
			0 0 0 1px var(--color-border),
			0 24px 60px -12px rgba(0,0,0,0.6);
		animation: rise-in 0.16s cubic-bezier(0.16, 1, 0.3, 1);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	@keyframes rise-in {
		from { opacity: 0; transform: translateY(6px) scale(0.98); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}

	.quit-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: 16px;
		background: radial-gradient(circle at 35% 30%, var(--color-accent-dim), var(--card-bg) 70%);
		box-shadow: 0 0 0 1px var(--color-accent-border), 0 0 24px -4px var(--color-accent);
		margin-bottom: 18px;
	}

	.quit-mark svg {
		width: 28px;
		height: 28px;
	}

	.quit-panel h2 {
		margin: 0 0 8px;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text);
	}

	.quit-sub {
		margin: 0 0 22px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-muted);
		max-width: 30ch;
	}

	.remember-row {
		display: flex;
		align-items: center;
		gap: 10px;
		border: none;
		background: none;
		padding: 0;
		margin-bottom: 24px;
		cursor: pointer;
	}

	.toggle {
		position: relative;
		width: 34px;
		height: 20px;
		border-radius: 999px;
		background: var(--card-bg);
		transition: background 0.15s ease;
		flex-shrink: 0;
	}

	.toggle.on {
		background: var(--color-accent);
	}

	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.15s ease;
	}

	.toggle.on .knob {
		transform: translateX(14px);
	}

	.remember-label {
		font-size: 12px;
		color: var(--color-muted);
	}

	.quit-actions {
		display: flex;
		width: 100%;
		gap: 10px;
	}

	.quit-btn {
		flex: 1;
		padding: 12px 16px;
		border-radius: 12px;
		font-size: 13px;
		font-weight: 600;
		font-family: inherit;
		letter-spacing: 0;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
	}

	.quit-btn.outline {
		background: none;
		border: 1px solid var(--card-border);
		color: var(--color-muted);
	}

	.quit-btn.outline:hover {
		border-color: var(--color-border-md, var(--card-border));
		color: var(--color-text);
		background: var(--card-bg);
	}

	.quit-btn.primary {
		background: var(--color-accent);
		border: 1px solid var(--color-accent);
		color: #0a0a0a;
	}

	.quit-btn.primary:hover {
		filter: brightness(1.08);
	}
</style>