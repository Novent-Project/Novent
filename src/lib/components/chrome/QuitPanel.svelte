<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { invoke } from '@tauri-apps/api/core';
	import { loadRememberFlag, setRememberFlag, setRememberedQuitAction } from '$lib/utils/quitChoice';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

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
		onClose();
	}

	async function quitApp() {
		if (remember) setRememberedQuitAction('quit');
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
		<h2>Close Novent?</h2>
		<p>Choose how the app should exit.</p>

		<div class="quit-actions">
			<button class="quit-option" onclick={minimizeToTray}>
				<span class="option-title">Minimize to Tray</span>
				<span class="option-sub">Keep running in the background</span>
			</button>

			<button class="quit-option danger" onclick={quitApp}>
				<span class="option-title">Quit</span>
				<span class="option-sub">Stop Novent entirely</span>
			</button>
		</div>

		<div class="divider"></div>

		<button class="remember-row" onclick={toggleRemember}>
			<span class="toggle" class:on={remember} aria-hidden="true">
				<span class="knob"></span>
			</span>
			<span class="remember-label">Remember my choice</span>
		</button>
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
		background: rgba(0,0,0,0.55);
		backdrop-filter: blur(3px);
		animation: fade-in 0.15s ease;
	}

	.quit-panel {
		width: 320px;
		padding: 20px;
		border-radius: 14px;
		background: #101013;
		box-shadow:
			0 0 0 1px rgba(255,255,255,0.07),
			0 0 0 1px rgba(16,185,129,0.15) inset,
			0 0 40px -8px rgba(16,185,129,0.12),
			0 24px 60px -12px rgba(0,0,0,0.6);
		animation: rise-in 0.16s cubic-bezier(0.16, 1, 0.3, 1);
		font-family: var(--font-mono);
		position: relative;
		overflow: hidden;
	}

	.quit-panel::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, transparent, #6ee7b7, transparent);
		opacity: 0.7;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	@keyframes rise-in {
		from { opacity: 0; transform: translateY(6px) scale(0.98); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}

	h2 {
		margin: 0 0 4px;
		font-size: 16px;
		font-weight: 700;
		font-family: var(--font-mono);
		color: #fff;
	}

	p {
		margin: 0 0 16px;
		font-size: 12px;
		font-family: var(--font-mono);
		color: rgba(255,255,255,0.35);
	}

	.quit-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.quit-option {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid rgba(255,255,255,0.08);
		background: rgba(255,255,255,0.02);
		cursor: pointer;
		text-align: left;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.quit-option:hover {
		background: rgba(255,255,255,0.045);
		border-color: rgba(255,255,255,0.16);
	}

	.quit-option .option-title {
		font-size: 13px;
		font-weight: 600;
		font-family: var(--font-mono);
		color: #fff;
	}

	.quit-option .option-sub {
		font-size: 11px;
		font-family: var(--font-mono);
		color: rgba(255,255,255,0.35);
	}

	.quit-option.danger {
		border-color: rgba(239,68,68,0.35);
		background: rgba(239,68,68,0.05);
	}

	.quit-option.danger .option-title {
		color: #f0a3a3;
	}

	.quit-option.danger .option-sub {
		color: rgba(240,163,163,0.6);
	}

	.quit-option.danger:hover {
		border-color: rgba(239,68,68,0.55);
		background: rgba(239,68,68,0.09);
	}

	.divider {
		height: 1px;
		background: rgba(255,255,255,0.08);
		margin: 14px 0 12px;
	}

	.remember-row {
		display: flex;
		align-items: center;
		gap: 10px;
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
	}

	.toggle {
		position: relative;
		width: 32px;
		height: 18px;
		border-radius: 999px;
		background: rgba(255,255,255,0.12);
		transition: background 0.15s ease;
		flex-shrink: 0;
	}

	.toggle.on {
		background: var(--color-accent, #10b981);
	}

	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.15s ease;
	}

	.toggle.on .knob {
		transform: translateX(14px);
	}

	.remember-label {
		font-size: 12px;
		font-family: var(--font-mono);
		color: rgba(255,255,255,0.4);
	}
</style>