<script lang="ts">
	import { setContext, onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Splashscreen from '$lib/components/layout/Splashscreen.svelte';
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
{@render children()}