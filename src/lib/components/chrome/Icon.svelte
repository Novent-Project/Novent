<script lang="ts" module>
	export type CustomIconName = 'wheel' | 'pedals' | 'shifter' | 'controller' | 'car';
</script>

<script lang="ts">
	import { Icon as SteezeIcon } from '@steeze-ui/svelte-icon';
	import type { IconSource } from '@steeze-ui/svelte-icon/types';

	interface Props {
		/** A @steeze-ui icon source (e.g. from @steeze-ui/heroicons). */
		src?: IconSource;
		/** One of the custom, app-specific icons defined below (no heroicon equivalent). */
		name?: CustomIconName;
		size?: number;
		theme?: 'outline' | 'solid' | 'mini' | 'micro';
		class?: string;
		/** Explicit color override. Omit to inherit `color` from the parent (currentColor), same as before. */
		color?: string;
		/**
		 * Dim the whole icon by this amount (0–1). Use this instead of
		 * passing a semi-transparent `color` (e.g. an rgba/color-mix
		 * value) — a translucent color gets applied to every path
		 * individually, so anywhere two strokes/fills overlap (like the
		 * cart handle crossing the body, or wheel dots sitting on a
		 * stroke) that spot gets the alpha compositing applied twice and
		 * reads darker than the rest of the icon. `opacity` is applied
		 * once, to the fully-rendered icon as a whole, so overlaps stay
		 * visually flat and consistent.
		 */
		opacity?: number;
	}

	let { src, name, size = 18, theme = 'solid', class: className = '', color, opacity }: Props = $props();

	// The Safari stroke-scaling fix below pins stroke-width via `font-size`
	// in `em`. That font-size must scale with this icon's own `size`, or
	// every icon gets the exact same absolute stroke thickness regardless
	// of how big it's rendered — fine at ~18px, but a big placeholder icon
	// (e.g. 64px) ends up with hairline strokes next to normal-weight fills,
	// since fills DO scale with size/viewBox but a fixed font-size doesn't.
	// 0.0625 matches the stroke-width="1.5" used below on a 24 viewBox.
	const STROKE_RATIO = 0.0625;
	let fixStyle = $derived(
		`font-size: ${size * STROKE_RATIO}px;` +
			(color ? ` color: ${color};` : '') +
			(opacity !== undefined ? ` opacity: ${opacity};` : '')
	);
</script>

{#if src}
	<SteezeIcon {src} {theme} size="{size}px" class={`app-icon ${className}`} style={fixStyle} />
{:else if name}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		width={size}
		height={size}
		class={`app-icon ${className}`}
		style={fixStyle}
		aria-hidden="true"
	>
		{#if name === 'wheel'}
			<circle cx="12" cy="12" r="8" vector-effect="non-scaling-stroke" />
			<circle cx="12" cy="12" r="2.25" vector-effect="non-scaling-stroke" />
			<path d="M12 4v3.6M5.3 16.4l3-1.7M18.7 16.4l-3-1.7" stroke-linecap="round" vector-effect="non-scaling-stroke" />
		{:else if name === 'pedals'}
			<rect x="6" y="7" width="3.6" height="13" rx="1.4" transform="rotate(-8 7.8 13.5)" vector-effect="non-scaling-stroke" />
			<rect x="13.8" y="4.5" width="3.6" height="15.5" rx="1.4" transform="rotate(-4 15.6 12)" vector-effect="non-scaling-stroke" />
		{:else if name === 'shifter'}
			<path d="M6 6v12M12 6v12M18 6v12M6 12h12" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
			<circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" />
		{:else if name === 'controller'}
			<path d="M8 8.5C8 7.94772 7.55228 7.5 7 7.5C6.44772 7.5 6 7.94772 6 8.5V9H5.5C4.94772 9 4.5 9.44771 4.5 10C4.5 10.5523 4.94772 11 5.5 11H6V11.5C6 12.0523 6.44772 12.5 7 12.5C7.55228 12.5 8 12.0523 8 11.5V11H8.5C9.05228 11 9.5 10.5523 9.5 10C9.5 9.44771 9.05228 9 8.5 9H8V8.5Z" fill="currentColor" stroke="none" />
			<path d="M18 8C18 8.55229 17.5523 9 17 9C16.4477 9 16 8.55229 16 8C16 7.44772 16.4477 7 17 7C17.5523 7 18 7.44772 18 8Z" fill="currentColor" stroke="none" />
			<path d="M17 13C17.5523 13 18 12.5523 18 12C18 11.4477 17.5523 11 17 11C16.4477 11 16 11.4477 16 12C16 12.5523 16.4477 13 17 13Z" fill="currentColor" stroke="none" />
			<path d="M16 10C16 10.5523 15.5523 11 15 11C14.4477 11 14 10.5523 14 10C14 9.44771 14.4477 9 15 9C15.5523 9 16 9.44771 16 10Z" fill="currentColor" stroke="none" />
			<path d="M19 11C19.5523 11 20 10.5523 20 10C20 9.44771 19.5523 9 19 9C18.4477 9 18 9.44771 18 10C18 10.5523 18.4477 11 19 11Z" fill="currentColor" stroke="none" />
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M12 3C10.1879 3 7.96237 3.25817 6.21782 3.5093C3.94305 3.83676 2.09096 5.51696 1.60993 7.7883C1.34074 9.05935 1.07694 10.5622 1.01649 11.8204C0.973146 12.7225 0.877981 13.9831 0.777155 15.1923C0.672256 16.4504 1.09148 17.7464 1.86079 18.6681C2.64583 19.6087 3.88915 20.2427 5.32365 19.8413C6.24214 19.5842 6.97608 18.9387 7.5205 18.3026C8.07701 17.6525 8.51992 16.9124 8.83535 16.3103C9.07821 15.8467 9.50933 15.5855 9.91539 15.5855H14.0846C14.4906 15.5855 14.9218 15.8467 15.1646 16.3103C15.4801 16.9124 15.923 17.6525 16.4795 18.3026C17.0239 18.9387 17.7578 19.5842 18.6763 19.8413C20.1108 20.2427 21.3541 19.6087 22.1392 18.6681C22.9085 17.7464 23.3277 16.4504 23.2228 15.1923C23.122 13.9831 23.0268 12.7225 22.9835 11.8204C22.923 10.5622 22.6592 9.05935 22.39 7.7883C21.909 5.51696 20.0569 3.83676 17.7821 3.5093C16.0376 3.25817 13.8121 3 12 3ZM6.50279 5.48889C8.22744 5.24063 10.3368 5 12 5C13.6632 5 15.7725 5.24063 17.4972 5.4889C18.965 5.70019 20.1311 6.77489 20.4334 8.20267C20.6967 9.44565 20.9332 10.8223 20.9858 11.9164C21.0309 12.856 21.1287 14.1463 21.2297 15.3585C21.2912 16.0956 21.0342 16.8708 20.6037 17.3866C20.1889 17.8836 19.7089 18.0534 19.2153 17.9153C18.8497 17.8129 18.4327 17.509 17.9989 17.0021C17.5771 16.5094 17.2144 15.9131 16.9362 15.3822C16.4043 14.3667 15.3482 13.5855 14.0846 13.5855H9.91539C8.65178 13.5855 7.59571 14.3667 7.06374 15.3822C6.78558 15.9131 6.42285 16.5094 6.00109 17.0021C5.56723 17.509 5.15027 17.8129 4.78463 17.9153C4.29109 18.0534 3.81102 17.8836 3.39625 17.3866C2.96576 16.8708 2.70878 16.0956 2.77024 15.3585C2.87131 14.1463 2.96904 12.856 3.01418 11.9164C3.06675 10.8223 3.30329 9.44565 3.56653 8.20267C3.86891 6.77489 5.03497 5.70019 6.50279 5.48889Z"
				fill="currentColor"
				stroke="none"
			/>
		{:else if name === 'car'}
			<path d="M6 6h15l-1.5 9h-12z" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
			<path d="M6 6L4.5 3H2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
			<circle cx="9.5" cy="19" r="1.4" fill="currentColor" stroke="none" />
			<circle cx="17.5" cy="19" r="1.4" fill="currentColor" stroke="none" />
		{/if}
	</svg>
{/if}

<style>
	:global(.app-icon) {
		stroke-width: 1em;
	}
</style>