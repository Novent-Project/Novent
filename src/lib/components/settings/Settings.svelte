<script lang="ts">
	import GeneralSection from './sections/GeneralSection.svelte';
	import GameDetectionSection from './sections/GameDetectionSection.svelte';
	import AboutSection from './sections/AboutSection.svelte';
	import { Sliders, Info, X, GameController } from 'phosphor-svelte';

	interface Props {
		gamePaths:   Record<string, string>;
		appZoom:     number;
		appZoomAuto: boolean;
		traceZoom:   number;
		graphPlacement: 'bottom' | 'side';
		flipSide:    boolean;
		onClose:     () => void;
	}

	let { gamePaths = $bindable(), appZoom = $bindable(), appZoomAuto = $bindable(), traceZoom = $bindable(), graphPlacement = $bindable(), flipSide = $bindable(), onClose }: Props = $props();

	const NAV_GROUPS = [
		{
			label: 'App',
			items: [
				{ id: 'general', label: 'General',        desc: 'Interface scale, graphs, and quit behavior.' },
				{ id: 'game',    label: 'Game Detection', desc: 'Where Novent looks for your installed titles.' },
			]
		},
		{
			label: 'About',
			items: [
				{ id: 'about', label: 'About', desc: 'Version, updates, and links.' },
			]
		}
	] as const;

	const NAV = NAV_GROUPS.flatMap(g => g.items);

	type SectionId = (typeof NAV)[number]['id'];

	let activeSection = $state<SectionId>('general');
	let activeItem = $derived(NAV.find(n => n.id === activeSection)!);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

{#snippet navIcon(id: SectionId, size: number)}
	{#if id === 'general'}
		<Sliders {size} weight="regular" />
	{:else if id === 'game'}
		<GameController {size} weight="regular" />
	{:else if id === 'about'}
		<Info {size} weight="regular" />
	{/if}
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div class="backdrop" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
	<div class="dialog" role="dialog" aria-modal="true" aria-label="Settings" tabindex="-1">
		<nav class="rail">
			<span class="rail-title">Settings</span>

			{#each NAV_GROUPS as group}
				<div class="rail-group">
					<span class="rail-group-label">{group.label}</span>
					{#each group.items as item (item.id)}
						<button
							type="button"
							class="rail-item"
							class:active={activeSection === item.id}
							onclick={() => activeSection = item.id}
						>
							<span class="rail-accent"></span>
							<span class="rail-icon">{@render navIcon(item.id, 15)}</span>
							{item.label}
						</button>
					{/each}
				</div>
			{/each}
		</nav>

		<div class="content-col">
			<header class="content-header">
				<div class="content-title-block">
					<div class="content-title">{activeItem.label}</div>
					<span class="content-desc">{activeItem.desc}</span>
				</div>
				<button class="close-btn" onclick={onClose} aria-label="Close settings">
					<X size={15} weight="regular" />
				</button>
			</header>

			<div class="content">
				{#if activeSection === 'general'}
					<GeneralSection bind:appZoom bind:traceZoom bind:graphPlacement bind:flipSide />
				{:else if activeSection === 'game'}
					<GameDetectionSection bind:gamePaths />
				{:else if activeSection === 'about'}
					<AboutSection />
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
		width: min(760px, 92vw);
		height: min(600px, 88vh);
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
		width: 190px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 22px 14px;
		border-right: 1px solid var(--color-border);
		overflow-y: auto;
	}

	.rail-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text);
		padding: 0 8px;
	}

	.rail-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.rail-group-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.10em;
		color: var(--color-subtle);
		padding: 0 8px 6px;
	}

	.rail-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 9px;
		text-align: left;
		padding: 8px 9px 8px 12px;
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

	.rail-accent {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 2.5px;
		height: 0;
		border-radius: var(--radius-pill, 4px);
		background: var(--color-accent);
		transition: height 0.14s ease;
	}

	.rail-item.active .rail-accent {
		height: 16px;
	}

	.rail-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		color: var(--color-subtle);
		transition: color 0.12s ease;
	}

	.rail-item:hover {
		background: var(--card-bg);
		color: var(--color-text);
	}

	.rail-item:hover .rail-icon {
		color: var(--color-text);
	}

	.rail-item.active {
		background: var(--card-bg);
		color: var(--color-text);
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
		align-items: flex-start;
		justify-content: space-between;
		flex-shrink: 0;
		gap: 16px;
		padding: 22px 26px 18px;
		border-bottom: 1px dashed var(--color-border);
	}

	.content-title-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.content-title {
		font-family: inherit;
		font-size: 17px;
		font-weight: 700;
		color: var(--color-text);
	}

	.content-desc {
		font-size: 12px;
		color: var(--color-muted);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 6px;
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

	.content {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 22px 26px 28px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
</style>