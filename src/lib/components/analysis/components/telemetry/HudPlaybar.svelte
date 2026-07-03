<script lang="ts">
	import { formatTime } from '$lib/utils';
	import type { AnalysisState } from '$lib/components/analysis/state';

	interface Props {
		analysis: AnalysisState;
	}

	let { analysis }: Props = $props();

	let pct = $derived(analysis.resolvedLapTime > 0 ? (analysis.currentTime / analysis.resolvedLapTime) * 100 : 0);
	let deltaText = $derived(`${analysis.liveDeltaValue >= 0 ? '+' : ''}${analysis.liveDeltaValue.toFixed(3)}`);
	let distanceText = $derived(`${analysis.distanceGap >= 0 ? '+' : ''}${Math.round(analysis.distanceGap)} m`);
</script>

<div class="playbar">
	<input
		class="scrubber"
		type="range"
		min="0"
		max={analysis.resolvedLapTime}
		step="0.01"
		value={analysis.currentTime}
		style="--pct:{pct}%"
		oninput={(e) => analysis.seek(+(e.currentTarget as HTMLInputElement).value)}
	/>

	<div class="cluster left">
		<button class="play" onclick={() => analysis.togglePlayback()} aria-label={analysis.isPlaying ? 'Pause' : 'Play'}>
			{#if analysis.isPlaying}
				<svg viewBox="0 0 16 16" fill="currentColor">
					<rect x="4" y="3" width="3" height="10" rx="1" />
					<rect x="9" y="3" width="3" height="10" rx="1" />
				</svg>
			{:else}
				<svg viewBox="0 0 16 16" fill="currentColor">
					<path d="M5 3.5v9l7-4.5-7-4.5z" />
				</svg>
			{/if}
		</button>

		<button class="icon-btn" onclick={() => analysis.seek(analysis.currentTime - 1)} aria-label="Step back">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M11 4l-5 4 5 4" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M5 4v8" stroke-linecap="round" />
			</svg>
		</button>

		<button class="icon-btn" onclick={() => analysis.seek(analysis.currentTime + 1)} aria-label="Step forward">
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M5 4l5 4-5 4" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M11 4v8" stroke-linecap="round" />
			</svg>
		</button>

		<span class="time mono">{formatTime(analysis.currentTime)}</span>
	</div>

	<div class="cluster center">
		<span class="stat">
			<span class="label">Delta:</span>
			<span class="mono" style="color:{analysis.liveDeltaValue > 0 ? 'var(--color-red)' : 'var(--color-accent)'}"
				>{deltaText}</span
			>
		</span>
		<span class="stat">
			<svg
				class="dist-icon"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path d="M4 5L2 8l2 3" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M12 5l2 3-2 3" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M2 8h12" stroke-linecap="round" />
			</svg>
			<span class="mono dist">{distanceText}</span>
		</span>
	</div>

	<div class="cluster right">
		<button
			class="toggle"
			class:on={analysis.showGhost}
			onclick={() => analysis.toggleGhost()}
			role="switch"
			aria-checked={analysis.showGhost}
			aria-label="Toggle ghost"
		>
			<span class="knob"></span>
		</button>

		<div class="segment">
			<button class:active={analysis.playMode === 'time'} onclick={() => analysis.setPlayMode('time')}>Time</button>
			<button class:active={analysis.playMode === 'distance'} onclick={() => analysis.setPlayMode('distance')}>Distance</button>
		</div>
	</div>
</div>

<style>
	.playbar {
		position: relative;
		display: flex;
		align-items: center;
		height: 56px;
		padding: 0 18px;
		width: 100%;
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
	}

	.scrubber {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 3px;
		margin: 0;
		padding: 0;
		appearance: none;
		-webkit-appearance: none;
		background: linear-gradient(
			to right,
			var(--color-accent) 0%,
			var(--color-accent) var(--pct),
			var(--color-border-md) var(--pct),
			var(--color-border-md) 100%
		);
		cursor: pointer;
		outline: none;
	}

	.scrubber::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-accent);
		border: none;
		margin-top: -1px;
	}

	.scrubber::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-accent);
		border: none;
	}

	.cluster {
		display: flex;
		align-items: center;
	}

	.left {
		gap: 10px;
	}

	.center {
		flex: 1;
		justify-content: center;
		gap: 18px;
	}

	.right {
		gap: 12px;
	}

	.play {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: none;
		background: var(--color-accent);
		color: var(--color-bg);
		cursor: pointer;
		padding: 0;
	}

	.play svg {
		width: 16px;
		height: 16px;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		padding: 0;
	}

	.icon-btn:hover {
		color: var(--color-text);
		background: var(--card-bg);
	}

	.icon-btn svg {
		width: 16px;
		height: 16px;
	}

	.time {
		font-size: 15px;
		color: var(--color-text);
		margin-left: 2px;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.label {
		font-size: 12px;
		color: var(--color-muted);
	}

	.stat .mono {
		font-size: 13px;
	}

	.dist {
		color: var(--color-muted);
	}

	.dist-icon {
		width: 16px;
		height: 16px;
		color: var(--color-muted);
	}

	.toggle {
		position: relative;
		width: 34px;
		height: 18px;
		border-radius: var(--radius-pill);
		border: none;
		background: var(--card-bg);
		cursor: pointer;
		padding: 0;
		transition: background 0.15s ease;
	}

	.toggle.on {
		background: var(--color-accent);
	}

	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-text);
		transition: transform 0.15s ease;
	}

	.toggle.on .knob {
		transform: translateX(16px);
		background: var(--color-bg);
	}

	.segment {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.segment button {
		border: none;
		background: transparent;
		color: var(--color-muted);
		font-size: 12px;
		font-family: var(--font-sans);
		padding: 5px 12px;
		cursor: pointer;
	}

	.segment button.active {
		background: var(--card-bg);
		color: var(--color-text);
	}
</style>