<script lang="ts">
	import TopNav from '$lib/components/layout/TopNav.svelte';

	let { children } = $props();
</script>

<div class="shell">
	<TopNav />
	<main class="shell-main">
		{@render children()}
	</main>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
		background: var(--color-bg);
	}

	.shell-main {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>