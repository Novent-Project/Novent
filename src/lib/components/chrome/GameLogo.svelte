<script lang="ts">
	import { gameShort } from '$lib/utils';
	import acMark from '$lib/assets/Logos/ac-mark.png';

	interface Props {
		game?: string;
		size?: number;
	}

	let { game = 'AC', size = 20 }: Props = $props();

	let id = $derived(gameShort(game));
</script>

{#if id === 'AC'}
	<img class="logo" src={acMark} width={size} height={size} alt="Assetto Corsa" />
{:else}
	<span class="chip" style="font-size: {Math.max(9, Math.round(size * 0.5))}px">{id}</span>
{/if}

<style>
	.logo {
		display: block;
		width: auto;
	}

	.chip {
		font-family: var(--font-mono);
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--color-text);
	}
</style>
