<script lang="ts">
	import { setContext, onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Splashscreen from '$lib/components/layout/Splashscreen.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import { DataState } from '$lib/state/data.svelte';

	let { children } = $props();

	const data = new DataState();
	setContext('data', data);

	onMount(() => {
		data.start();
		return () => data.destroy();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Splashscreen ready={data.loaded} />

<div class="frame">
	<div class="padding">
		<div class="shell">
			<Sidebar />
			<div class="shell-right">
				<TopBar connected={data.connected} game={data.game} />
				<main class="shell-main">
					{@render children()}
				</main>
			</div>
		</div>
	</div>
</div>

<style>
	.frame {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #000;
	}

	.padding {
		display: flex;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		padding: 10px;
	}

	.shell {
		display: flex;
		flex: 1;
		min-width: 0;
		min-height: 0;
		border-radius: var(--radius-card);
		overflow: hidden;
		border: 1px solid var(--color-border-md);
		background: var(--color-bg);
	}

	.shell-right {
		flex: 1;
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.shell-main {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>