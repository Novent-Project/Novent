<script lang="ts">
	import { page } from '$app/state';
	import { House, ChartBar, Gear } from 'phosphor-svelte';
	import { prefs } from '$lib/state/prefs.svelte';

	const links = [
		{ label: 'Dashboard', href: '/',         icon: House },
		{ label: 'Analysis',  href: '/analysis', icon: ChartBar },
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path.startsWith(href);
	}
</script>

<aside class="sidebar">
	<a class="logo" href="/" aria-label="Novent home">
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
	</a>

	<div class="rail-wrap">
		<nav class="rail">
			{#each links as link (link.href)}
				<a
					class="rail-slot"
					class:active={isActive(link.href)}
					href={link.href}
					aria-label={link.label}
					aria-current={isActive(link.href) ? 'page' : undefined}
				>
					<link.icon size={18} weight="regular" />
				</a>
			{/each}
		</nav>
	</div>

	<button class="rail-slot settings" type="button" aria-label="Settings" onclick={() => (prefs.settingsOpen = true)}>
		<Gear size={18} weight="regular" />
	</button>
</aside>

<style>
	.sidebar {
		box-sizing: border-box;
		flex-shrink: 0;
		width: var(--rail-w, 56px);
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 14px 0;
		background: var(--color-panel);
		border-right: 1px solid var(--color-border);
	}

	.logo {
		display: flex;
		flex-shrink: 0;
		width: 32px;
		height: 32px;
	}

	.logo svg {
		width: 100%;
		height: 100%;
	}

	.rail-wrap {
		flex: 1;
		min-height: 0;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.rail {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.rail-slot {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		padding: 0;
		border-radius: 8px;
		color: var(--color-muted);
		background: none;
		border: none;
		text-decoration: none;
		cursor: pointer;
		font: inherit;
		transition: color 0.12s ease, background 0.12s ease;
	}

	.rail-slot:hover {
		color: var(--color-text);
		background: var(--card-bg);
	}

	.rail-slot.active {
		color: var(--color-accent);
		background: var(--card-bg);
	}

	.rail-slot.active::before {
		content: "";
		position: absolute;
		left: -6px;
		top: 25%;
		bottom: 25%;
		width: 2.5px;
		border-radius: var(--radius-pill, 4px);
		background: var(--color-accent);
	}
</style>