<script lang="ts">
	import ConnectionStatus from './ConnectionStatus.svelte';
	import WindowControls from './WindowControls.svelte';
	import type { DetectionState } from '$lib/api';

	interface Props {
		detection: DetectionState;
	}

	let { detection }: Props = $props();
</script>

<header class="topbar" data-tauri-drag-region>
	<div class="search"></div>

	<div class="spacer" data-tauri-drag-region></div>

	<ConnectionStatus {detection} />

	<div class="actions">
		<div class="icon-slot"></div>
		<div class="icon-slot"></div>
	</div>

	<div class="divider"></div>

	<div class="profile">
		<div class="avatar"></div>
	</div>

	<WindowControls />
</header>

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
		width: 280px;
		max-width: 40%;
		height: 30px;
		border-radius: var(--radius-pill);
		background: var(--card-bg);
		border: 1px solid var(--card-border);
	}

	.spacer {
		flex: 1;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon-slot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
	}

	.divider {
		width: 1px;
		height: 22px;
		background: var(--color-border);
	}

	.profile {
		display: flex;
		align-items: center;
	}

	:global(.window-controls) {
		margin-left: 4px;
	}

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
	}
</style>
