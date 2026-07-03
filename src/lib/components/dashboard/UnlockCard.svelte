<script lang="ts">
	interface Props {
		title:    string;
		href?:    string;
	}

	let { title, href = '/setups' }: Props = $props();
</script>

<a class="unlock" {href}>
	<span class="badge">
		<svg viewBox="0 0 16 16" fill="currentColor">
			<path d="M8 1l2 3.5L14 5l-2.5 3L14 11l-4-0.5L8 14l-2-3.5L2 11l2.5-3L2 5l4 0.5L8 1z" />
		</svg>
	</span>
	<span class="title">{title}</span>
</a>

<style>
	.unlock {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 18px;
		height: 100%;
		padding: 18px 20px;
		border-radius: var(--radius-card);
		text-decoration: none;
		color: #eafff6;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.06));
		border: 1px solid var(--color-accent-border);
		box-shadow: var(--card-shadow);
		transition: border-color 0.15s ease, transform 0.1s ease;
	}

	.unlock:hover {
		border-color: rgba(16, 185, 129, 0.5);
	}

	.unlock:active { transform: scale(0.99); }

	.badge {
		align-self: flex-end;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(16, 185, 129, 0.2);
		color: #6ee7b7;
	}

	.badge svg { width: 15px; height: 15px; }

	.title {
		font-size: 16px;
		font-weight: 700;
		line-height: 1.3;
	}
</style>
