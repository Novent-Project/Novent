<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/state';
	import { Gear } from 'phosphor-svelte';
	import ConnectionStatus from './ConnectionStatus.svelte';
	import type { DataState } from '$lib/state/data.svelte';

	const data = getContext<DataState>('data');

	const links = [
		{ label: 'Dashboard', href: '/' },
		{ label: 'Analysis',  href: '/analysis' },
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path.startsWith(href);
	}
</script>

<div class="topnav-wrap">
	<nav class="topnav">
		<a class="brand" href="/" aria-label="Novent home">
			<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
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
			<span class="brand-name">Novent</span>
		</a>

		<div class="links">
			{#each links as link (link.href)}
				<a class="link" class:active={isActive(link.href)} href={link.href}>{link.label}</a>
			{/each}
		</div>

		<ConnectionStatus connected={data.connected} game={data.game} />

		<div class="divider"></div>

		<a class="icon-btn" href="/analysis" aria-label="Settings">
			<Gear weight="bold" size={16} />
		</a>
	</nav>
</div>

<style>
	.topnav-wrap {
		position: sticky;
		top: 0;
		z-index: 20;
		flex-shrink: 0;
		padding: 16px 20px 0;
	}

	.topnav {
		display: flex;
		align-items: center;
		gap: 20px;
		height: 56px;
		padding: 0 12px 0 18px;
		border-radius: 18px;
		border: 1px solid var(--color-border);
		background: rgba(12, 13, 16, 0.82);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		text-decoration: none;
	}

	.brand-mark {
		width: 24px;
		height: 24px;
	}

	.brand-name {
		font-size: 14px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: #fff;
	}

	.links {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
	}

	.link {
		display: inline-flex;
		align-items: center;
		height: 32px;
		padding: 0 16px;
		border-radius: var(--radius-pill);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.link:hover {
		color: var(--color-text);
		background: var(--card-bg-hover);
	}

	.link.active {
		color: var(--color-accent);
		background: var(--color-accent-dim);
	}

	.divider {
		width: 1px;
		height: 20px;
		flex-shrink: 0;
		background: var(--color-border);
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		border-radius: 50%;
		color: var(--color-muted);
		transition: color 0.15s ease, background 0.15s ease;
	}

	.icon-btn:hover {
		color: var(--color-text);
		background: var(--card-bg-hover);
	}
</style>