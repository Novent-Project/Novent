<script lang="ts">
	import type { DetectionState } from '$lib/api';

	interface Props {
		detection: DetectionState;
	}

	let { detection }: Props = $props();

	let label = $derived(
		detection.status === 'idle'     ? 'No game detected' :
		detection.status === 'detected' ? `${detection.game} detected` :
		                      `${detection.game} — session active`
	);
</script>

<div class="conn" class:detected={detection.status === 'detected'} class:active={detection.status === 'active'}>
	<span class="conn-dot"></span>
	<span class="conn-text">{label}</span>
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

	.conn.detected .conn-dot {
		background: var(--color-muted);
	}

	.conn.active .conn-dot {
		background: var(--color-accent);
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
	}

	.conn.active .conn-text {
		color: var(--color-text);
	}
</style>
