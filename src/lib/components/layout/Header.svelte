<script lang="ts">
	import SessionTabs from '$lib/components/hud/SessionTabs.svelte';
	import ConnectionStatus from './ConnectionStatus.svelte';

	interface Tab {
		id:       string;
		label:    string;
		active:   boolean;
		closable: boolean;
	}

	interface Props {
		tabs:      Tab[];
		connected: boolean;
		game:      string | null;
		onSelect:  (id: string) => void;
		onNew:     () => void;
		onClose:   (id: string) => void;
	}

	let { tabs, connected, game, onSelect, onNew, onClose }: Props = $props();
</script>

<header class="app-header">
	<a class="home" href="/" aria-label="Back to dashboard">
		<svg viewBox="0 0 64 64" aria-hidden="true">
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
	</a>
	<div class="header-tabs">
		<SessionTabs {tabs} {onSelect} {onNew} {onClose} />
	</div>
	<ConnectionStatus {connected} {game} />
</header>

<style>
	.app-header {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 10px 12px 0;
		padding: 4px 14px 4px 6px;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		border-radius: var(--radius-pill);
		box-shadow: var(--card-shadow);
		backdrop-filter: blur(8px);
	}

	.home {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		transition: background 0.12s ease;
	}

	.home:hover { background: var(--card-bg-hover); }
	.home svg { width: 24px; height: 24px; }

	.header-tabs {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}
</style>
