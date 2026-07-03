<script lang="ts">
	import { page } from '$app/state';

	const links = [
		{ label: 'Dashboard',     href: '/' },
		{ label: 'Setups',        href: '/setups' },
		{ label: 'Race Engineer', href: '/race-engineer' },
		{ label: 'Leaderboard',   href: '/leaderboard' },
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path.startsWith(href);
	}
</script>

<nav class="topnav">
	<a class="brand" href="/" aria-label="Novent home">
		<svg viewBox="0 0 64 64" aria-hidden="true">
			<rect width="64" height="64" rx="16" fill="#0a0c0f" />
			<path
				d="M14 8 H50 a6 6 0 0 1 6 6 V42 L42 56 H14 a6 6 0 0 1 -6 -6 V14 a6 6 0 0 1 6 -6 Z"
				fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-width="3" stroke-linejoin="round"
			/>
			<path
				transform="translate(16 23.2) scale(0.2)"
				d="M0,88 L30,88 L46,44 L64,44 L80,88 L110,88 L126,44 L144,44 L160,0 L130,0 L114,44 L96,44 L80,0 L50,0 L34,44 L16,44 Z"
				fill="#10b981"
			/>
		</svg>
		<span class="brand-name">Novent</span>
	</a>

	<div class="links">
		{#each links as link (link.href)}
			<a class="link" class:active={isActive(link.href)} href={link.href}>{link.label}</a>
		{/each}
	</div>

	<div class="actions">
		<button class="icon-btn" aria-label="Settings">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<circle cx="8" cy="8" r="2.5" />
				<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" />
			</svg>
		</button>
		<button class="icon-btn" aria-label="Notifications">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M8 2a4 4 0 0 0-4 4v2.5L2.5 11h11L12 8.5V6a4 4 0 0 0-4-4z" />
				<path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
			</svg>
		</button>
		<button class="icon-btn" aria-label="Info">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<circle cx="8" cy="8" r="6.5" />
				<path d="M8 7.2v3.3M8 5.2v.2" stroke-linecap="round" />
			</svg>
		</button>

		<button class="profile" aria-label="Account">
			<span class="avatar">OS</span>
			<span class="who">
				<span class="who-name">osqwety</span>
				<span class="who-tier">Customer</span>
			</span>
			<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
	</div>
</nav>

<style>
	.topnav {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 24px;
		height: 60px;
		padding: 0 20px;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
	}

	.brand svg {
		width: 30px;
		height: 30px;
	}

	.brand-name {
		font-size: 16px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: #fff;
	}

	.links {
		flex: 1;
		display: flex;
		justify-content: center;
		gap: 40px;
	}

	.link {
		position: relative;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-muted);
		text-decoration: none;
		padding: 4px 0;
		transition: color 0.15s ease;
	}

	.link:hover { color: var(--color-text); }

	.link.active { color: var(--color-accent); }

	.link.active::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -20px;
		height: 2px;
		background: var(--color-accent);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon-btn {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border);
		background: var(--card-bg);
		color: var(--color-muted);
		cursor: pointer;
		transition: color 0.12s ease, background 0.12s ease, border-color 0.12s ease;
	}

	.icon-btn:hover {
		color: var(--color-text);
		background: var(--card-bg-hover);
		border-color: var(--color-border-md);
	}

	.icon-btn svg { width: 16px; height: 16px; }

	.profile {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: 4px;
		padding: 4px 8px 4px 4px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border);
		background: var(--card-bg);
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.profile:hover {
		background: var(--card-bg-hover);
		border-color: var(--color-border-md);
	}

	.avatar {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--color-accent-dim);
		color: var(--color-accent);
		font-size: 11px;
		font-weight: 700;
	}

	.who {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
		text-align: left;
	}

	.who-name { font-size: 12px; font-weight: 600; color: var(--color-text); }
	.who-tier { font-size: 10px; color: var(--color-accent); }

	.chev { width: 14px; height: 14px; color: var(--color-muted); }
</style>
