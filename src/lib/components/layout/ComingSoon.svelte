<script lang="ts">
	interface Props {
		title: string;
		note?: string;
	}

	let { title, note = 'This section is coming soon.' }: Props = $props();
</script>

<div class="coming">
	<span class="badge">Coming soon</span>
	<h1>{title}</h1>
	<p>{note}</p>
</div>

<style>
	.coming {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		text-align: center;
		padding: 40px;
	}

	.badge {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-accent);
		background: var(--color-accent-dim);
		border: 1px solid var(--color-accent-border);
		border-radius: var(--radius-pill);
		padding: 4px 12px;
	}

	h1 {
		margin: 0;
		font-size: 32px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: #fff;
	}

	p {
		margin: 0;
		font-size: 13px;
		color: var(--color-muted);
		max-width: 40ch;
	}
</style>
