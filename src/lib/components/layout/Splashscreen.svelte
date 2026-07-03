<script lang="ts">
	interface Props {
		ready?: boolean;
	}

	let { ready = false }: Props = $props();

	const MIN_MS  = 4000;
	const FADE_MS = 650;
	const SKIP_MS = 5000;

	let hiding   = $state(false);
	let gone     = $state(false);
	let showSkip = $state(false);

	$effect(() => {
		if (!ready || hiding) return;
		const delay = Math.max(0, MIN_MS - performance.now());
		const timer = setTimeout(() => (hiding = true), delay);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (hiding) return;
		const timer = setTimeout(() => (showSkip = true), SKIP_MS);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (!hiding) return;
		const timer = setTimeout(() => (gone = true), FADE_MS);
		return () => clearTimeout(timer);
	});

	function skip() {
		hiding = true;
	}
</script>

{#if !gone}
	<div class="splash" class:hide={hiding} aria-hidden={hiding}>
		<div class="road-scene"><div class="road"></div></div>
		<div class="brand">
			<div class="row">
				<svg width="42" height="42" viewBox="0 0 64 64" fill="none" style="color:#10b981">
					<path
						d="M14 8 H50 a6 6 0 0 1 6 6 V42 L42 56 H14 a6 6 0 0 1 -6 -6 V14 a6 6 0 0 1 6 -6 Z"
						fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="3" stroke-linejoin="round"
					/>
					<path
						transform="translate(16 23.2) scale(0.2)"
						d="M0,88 L30,88 L46,44 L64,44 L80,88 L110,88 L126,44 L144,44 L160,0 L130,0 L114,44 L96,44 L80,0 L50,0 L34,44 L16,44 Z"
						fill="currentColor"
					/>
				</svg>
				<span class="name">Novent</span>
			</div>
			<span class="tag">{showSkip ? 'Still reaching the backend…' : 'Starting telemetry engine'}</span>
			<div class="bar"></div>
			{#if showSkip}
				<button class="skip-btn" onclick={skip}>Continue without backend</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.splash {
		position: fixed;
		inset: 0;
		z-index: 2147483647;
		overflow: hidden;
		background: #070809;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		transition: opacity 600ms ease;
	}

	.splash.hide {
		opacity: 0;
		pointer-events: none;
	}

	.road-scene {
		position: absolute;
		inset: 0;
		overflow: hidden;
		perspective: 300px;
		perspective-origin: 50% 34%;
	}

	.road {
		position: absolute;
		left: 50%;
		bottom: 0;
		width: 360%;
		height: 170%;
		transform: translateX(-50%) rotateX(82deg);
		transform-origin: 50% 100%;
		background-color: #14171b;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.42)),
			linear-gradient(rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.42)),
			repeating-linear-gradient(to bottom, #34d399 0 36px, transparent 36px 94px);
		background-repeat: no-repeat, no-repeat, repeat-y;
		background-position: 41% 0, 59% 0, 50% 0;
		background-size: 6px 100%, 6px 100%, 9px 94px;
		animation: road 0.6s linear infinite;
	}

	.road-scene::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to top, transparent 0%, transparent 24%, #070809 70%),
			radial-gradient(120% 80% at 50% 100%, transparent 40%, rgba(7, 8, 9, 0.65) 100%);
	}

	.brand {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		transform: translateY(-4%);
		animation: rise 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) 0.2s both;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 13px;
	}

	.name {
		font-size: 32px;
		font-weight: 800;
		letter-spacing: -0.025em;
		color: #fff;
	}

	.tag {
		font-size: 10px;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.32);
		font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
	}

	.bar {
		width: 170px;
		height: 2px;
		margin-top: 2px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.bar::before {
		content: '';
		display: block;
		width: 38%;
		height: 100%;
		border-radius: 2px;
		background: #34d399;
		animation: sweep 1.15s ease-in-out infinite;
	}

	.skip-btn {
		margin-top: 6px;
		padding: 7px 16px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.55);
		font-size: 11px;
		font-family: inherit;
		cursor: pointer;
		transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
		animation: rise 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}

	.skip-btn:hover {
		color: #fff;
		border-color: rgba(255, 255, 255, 0.24);
		background: rgba(255, 255, 255, 0.08);
	}

	@keyframes road {
		to { background-position: 41% 0, 59% 0, 50% 94px; }
	}

	@keyframes rise {
		from { opacity: 0; transform: translateY(14px); }
		to   { opacity: 1; transform: translateY(-4%); }
	}

	@keyframes sweep {
		0%   { transform: translateX(-110%); }
		100% { transform: translateX(380%); }
	}

	@media (prefers-reduced-motion: reduce) {
		.road { animation: none; }
		.brand { animation: none; }
		.bar::before { animation: none; width: 100%; }
		.skip-btn { animation: none; }
	}
</style>