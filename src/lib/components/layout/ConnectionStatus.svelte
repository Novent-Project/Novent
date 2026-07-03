<script lang="ts">
	interface Props {
		connected?: boolean;
		game?:      string | null;
	}

	let { connected = false, game = null }: Props = $props();
</script>

<div class="conn">
	<span class="conn-dot" class:on={connected}></span>
	<span class="conn-text">{connected ? (game ?? 'Live') : 'Offline'}</span>
</div>

<style>
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

	.conn-dot.on {
		background: var(--color-accent);
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
	}
</style>
