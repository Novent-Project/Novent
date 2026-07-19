<script lang="ts">
	import GameDetectionSection from './sections/GameDetectionSection.svelte';
	import DisplaySection from './sections/DisplaySection.svelte';

	interface Props {
		gamePaths:   Record<string, string>;
		appZoom:     number;
		appZoomAuto: boolean;
		traceZoom:   number;
		graphPlacement: 'bottom' | 'side';
		onClose:     () => void;
	}

	let { gamePaths = $bindable(), appZoom = $bindable(), appZoomAuto = $bindable(), traceZoom = $bindable(), graphPlacement = $bindable(), onClose }: Props = $props();

	const NAV = [
		{ id: 'game',    label: 'Game Detection' },
		{ id: 'display', label: 'Display' },
	] as const;

	type SectionId = (typeof NAV)[number]['id'];

	let activeSection = $state<SectionId>('game');

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="backdrop" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
	<div class="dialog" role="dialog" aria-modal="true" aria-label="Settings" tabindex="-1">
		<header class="dialog-header">
			<div class="dialog-title">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<circle cx="8" cy="8" r="2.5"/>
					<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/>
				</svg>
				Settings
			</div>
			<button class="close-btn" onclick={onClose} aria-label="Close settings">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M4 4l8 8M12 4l-8 8"/>
				</svg>
			</button>
		</header>

		<div class="dialog-body">
			<nav class="rail">
				{#each NAV as item (item.id)}
					<button
						type="button"
						class="rail-item"
						class:active={activeSection === item.id}
						onclick={() => activeSection = item.id}
					>
						{item.label}
					</button>
				{/each}
			</nav>

			<div class="content">
				{#if activeSection === 'game'}
					<GameDetectionSection bind:gamePaths />
				{:else if activeSection === 'display'}
					<DisplaySection bind:appZoom bind:appZoomAuto bind:traceZoom bind:graphPlacement />
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0,0,0,0.55);
		backdrop-filter: blur(3px);
		animation: fade-in 0.15s ease;
	}

	.dialog {
		display: flex;
		flex-direction: column;
		width: min(760px, 92vw);
		height: min(560px, 84vh);
		border-radius: 12px;
		background: #0b0c0f;
		box-shadow:
			0 0 0 1px rgba(255,255,255,0.07),
			0 24px 60px -12px rgba(0,0,0,0.6);
		overflow: hidden;
		animation: rise-in 0.16s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	@keyframes rise-in {
		from { opacity: 0; transform: translateY(6px) scale(0.98); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 44px;
		padding: 0 16px;
		border-bottom: 1px solid rgba(255,255,255,0.06);
		flex-shrink: 0;
	}

	.dialog-title {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 11px;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255,255,255,0.5);
	}

	.dialog-title svg {
		width: 14px;
		height: 14px;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 4px;
		background: none;
		border: none;
		cursor: pointer;
		color: rgba(255,255,255,0.35);
		transition: color 0.15s, background 0.15s;
	}

	.close-btn:hover {
		color: #fff;
		background: rgba(255,255,255,0.06);
	}

	.close-btn svg {
		width: 14px;
		height: 14px;
	}

	.dialog-body {
		flex: 1;
		min-height: 0;
		display: flex;
	}

	.rail {
		width: 168px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px;
		border-right: 1px solid rgba(255,255,255,0.06);
		overflow-y: auto;
	}

	.rail-item {
		display: flex;
		align-items: center;
		text-align: left;
		padding: 8px 10px;
		border-radius: 6px;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 12px;
		font-weight: 500;
		color: rgba(255,255,255,0.5);
		transition: background 0.12s ease, color 0.12s ease;
	}

	.rail-item:hover {
		background: rgba(255,255,255,0.04);
		color: rgba(255,255,255,0.8);
	}

	.rail-item.active {
		background: rgba(16,185,129,0.10);
		box-shadow: inset 0 0 0 1px rgba(16,185,129,0.20);
		color: #6ee7b7;
	}

	.content {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		padding: 28px 28px 32px;
	}
</style>
