<script lang="ts">
	import GeneralSection from './sections/GeneralSection.svelte';
	import GameDetectionSection from './sections/GameDetectionSection.svelte';

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
		{ id: 'general', label: 'General',        icon: 'general' },
		{ id: 'game',    label: 'Game Detection', icon: 'controller' },
	] as const;

	type SectionId = (typeof NAV)[number]['id'];

	let activeSection = $state<SectionId>('general');
	let activeItem = $derived(NAV.find(n => n.id === activeSection)!);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

{#snippet navIcon(id: string)}
	{#if id === 'controller'}
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M4 6.25h2M5 5.25v2M9.6 6.5h.01M11 5.4h.01"/>
			<path d="M3.6 6h8.8a2 2 0 0 1 1.94 2.5l-.55 2.15a1.6 1.6 0 0 1-2.9.4L10.2 10H5.8l-.7 1.05a1.6 1.6 0 0 1-2.9-.4l-.55-2.15A2 2 0 0 1 3.6 6z"/>
		</svg>
	{:else}
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z"/>
			<path d="M8 1.6v1.3M8 13.1v1.3M14.4 8h-1.3M2.9 8H1.6M12.4 3.6l-.9.9M4.5 11.5l-.9.9M12.4 12.4l-.9-.9M4.5 4.5l-.9-.9"/>
		</svg>
	{/if}
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div class="backdrop" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
	<div class="dialog" role="dialog" aria-modal="true" aria-label="Settings" tabindex="-1">
		<nav class="rail">
			<span class="rail-label">Settings</span>
			{#each NAV as item (item.id)}
				<button
					type="button"
					class="rail-item"
					class:active={activeSection === item.id}
					onclick={() => activeSection = item.id}
				>
					<span class="rail-icon">{@render navIcon(item.icon)}</span>
					{item.label}
				</button>
			{/each}
		</nav>

		<div class="content-col">
			<header class="content-header">
				<div class="content-title">
					<span class="title-icon">{@render navIcon(activeItem.icon)}</span>
					{activeItem.label}
				</div>
				<button class="close-btn" onclick={onClose} aria-label="Close settings">
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4 4l8 8M12 4l-8 8"/>
					</svg>
				</button>
			</header>

			<div class="content">
				{#if activeSection === 'general'}
					<GeneralSection bind:appZoom bind:traceZoom bind:graphPlacement />
				{:else if activeSection === 'game'}
					<GameDetectionSection bind:gamePaths />
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
		width: min(690px, 92vw);
		height: min(570px, 88vh);
		border-radius: var(--radius-card, var(--radius-md, 12px));
		background: var(--color-panel);
		font-family: inherit;
		box-shadow:
			0 0 0 1px var(--color-border),
			0 24px 60px -12px rgba(0,0,0,0.6);
		overflow: hidden;
		animation: rise-in 0.16s cubic-bezier(0.16, 1, 0.3, 1);
		position: relative;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	@keyframes rise-in {
		from { opacity: 0; transform: translateY(6px) scale(0.98); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}

	.rail {
		width: 162px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 18px 10px;
		border-right: 1px solid var(--color-border);
		overflow-y: auto;
	}

	.rail-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.10em;
		color: var(--color-subtle);
		padding: 0 8px 10px;
	}

	.rail-item {
		display: flex;
		align-items: center;
		gap: 8px;
		text-align: left;
		padding: 8px 9px;
		border-radius: 6px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-muted);
		transition: background 0.12s ease, color 0.12s ease;
	}

	.rail-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		color: var(--color-subtle);
		transition: color 0.12s ease;
	}

	.rail-icon svg {
		width: 13px;
		height: 13px;
	}

	.rail-item:hover {
		background: var(--card-bg);
		color: var(--color-text);
	}

	.rail-item:hover .rail-icon {
		color: var(--color-text);
	}

	.rail-item.active {
		background: var(--color-accent-dim);
		color: var(--color-accent);
	}

	.rail-item.active .rail-icon {
		color: var(--color-accent);
	}

	.content-col {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.content-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
		height: 57px;
		padding: 0 24px;
		border-bottom: 1px solid var(--color-border);
	}

	.content-title {
		display: flex;
		align-items: center;
		gap: 9px;
		font-family: inherit;
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text);
	}

	.title-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-muted);
	}

	.title-icon svg {
		width: 15px;
		height: 15px;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 5px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-subtle);
		transition: color 0.15s, background 0.15s;
	}

	.close-btn:hover {
		color: var(--color-text);
		background: var(--card-bg);
	}

	.close-btn svg {
		width: 11px;
		height: 11px;
	}

	.content {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 21px 24px 27px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
</style>