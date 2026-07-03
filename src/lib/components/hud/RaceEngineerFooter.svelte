<script lang="ts">
	interface Props {
		status: string;
		active?: boolean;
	}

	let { status, active = false }: Props = $props();
</script>

<footer class="engineer-footer">
	<div class="row">
		<span class="title">Race Engineer</span>
		<span class="dot" class:active></span>
		<span class="status mono">{status || '—'}</span>
	</div>
</footer>

<style>
	.engineer-footer {
		width: 100%;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.title {
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 700;
		color: #fff;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-subtle);
	}

	.dot.active {
		background: var(--color-accent);
	}

	.status {
		font-size: 12px;
		color: var(--color-muted);
	}
</style>
