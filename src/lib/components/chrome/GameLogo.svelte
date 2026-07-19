<script lang="ts">
	import { gameShort } from '$lib/utils';
	import acLogo from '$lib/assets/Logos/ac-symbol-dark.svg';

	interface Props {
		game?: string;
		size?: number;
	}

	let { game = 'AC', size = 20 }: Props = $props();

	let id = $derived(gameShort(game));
</script>

{#if id === 'AC'}
	<img class="logo" src={acLogo} height={size} alt="Assetto Corsa" />
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
