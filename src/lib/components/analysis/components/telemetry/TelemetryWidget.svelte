<script lang="ts">
	import Icon from '$lib/components/chrome/Icon.svelte';
	import { Clock } from '@steeze-ui/heroicons';
	import type { DriverTelemetry } from '$lib/components/analysis/state';

	interface Props {
		driver: DriverTelemetry;
		/** Whether the ghost overlay for this driver's lap is currently shown on the map. */
		ghostVisible?: boolean;
		/** If provided, the avatar becomes a click target that toggles the ghost overlay.
		 *  Omit for driver cards that shouldn't be toggleable (e.g. the primary driver). */
		onToggleGhost?: () => void;
	}

	let { driver, ghostVisible = true, onToggleGhost }: Props = $props();

	let throttlePct = $derived(Math.round((driver.throttle ?? 0) * 100));
	let brakePct = $derived(Math.round((driver.brake ?? 0) * 100));
</script>

<div
	class="hud-card widget"
	class:ghost-off={onToggleGhost && !ghostVisible}
	style="--driver-color: {driver.color};"
>
	<div class="accent"></div>

	<div class="row-main">
		<svelte:element
			this={onToggleGhost ? 'button' : 'div'}
			class="avatar"
			style="border-color: {driver.color};"
			type={onToggleGhost ? 'button' : undefined}
			onclick={onToggleGhost}
			aria-pressed={onToggleGhost ? ghostVisible : undefined}
			aria-label={onToggleGhost ? (ghostVisible ? 'Hide ghost overlay' : 'Show ghost overlay') : undefined}
		>
			<Icon name="wheel" size={18} color={driver.color} />
		</svelte:element>
		<div class="name" style="color: {driver.color};">{driver.name}</div>
		<div class="lap-time mono">{driver.lapTime}</div>
		<div class="speed">
			<span class="value mono">{Math.round(driver.speed)}</span>
			<span class="unit">km/h</span>
		</div>
	</div>

	<div class="row-extra">
		<div class="row-extra-inner">
			<div class="sub">
				<Icon src={Clock} theme="outline" size={11} />
				<span>Stint {driver.stint} · Lap {driver.lap}</span>
			</div>

			<div class="mini">
				<span class="mini-pct mono">{throttlePct}%</span>
				<div class="bar">
					<div class="fill throttle" style="width: {throttlePct}%;"></div>
				</div>
			</div>

			<div class="mini">
				<span class="mini-pct mono">{brakePct}%</span>
				<div class="bar">
					<div class="fill brake" style="width: {brakePct}%;"></div>
				</div>
			</div>

			<div class="stat">
				<span class="value mono gear-value">
					<Icon name="shifter" size={12} color="var(--color-muted)" />
					{driver.gear}
				</span>
				<span class="unit">GEAR</span>
			</div>

			<div class="stat">
				<span class="value mono">{driver.rpm}</span>
				<span class="unit">RPM</span>
			</div>
		</div>
	</div>
</div>

<style>
	.widget {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 10px 16px 10px 18px;
		border: 1px solid transparent;
		transition:
			border-color 0.18s ease,
			box-shadow 0.18s ease,
			transform 0.18s ease;
	}

	.widget:hover {
		border-color: color-mix(in srgb, var(--driver-color) 30%, transparent);
		box-shadow: 0 10px 24px -12px color-mix(in srgb, var(--driver-color) 45%, transparent);
		transform: translateY(-1px);
	}

	/* Ghost overlay hidden for this driver: grey out the whole card so it
	   reads as "off" at a glance, while staying clickable to bring it back. */
	.widget.ghost-off {
		opacity: 0.45;
		filter: grayscale(0.6);
	}

	.widget.ghost-off:hover {
		opacity: 0.7;
		filter: grayscale(0.35);
	}

	.accent {
		position: absolute;
		left: 6px;
		top: 10px;
		bottom: 10px;
		width: 2.5px;
		border-radius: var(--radius-pill);
		background: var(--driver-color);
		opacity: 0.4;
		transition: opacity 0.18s ease;
	}

	.widget:hover .accent {
		opacity: 1;
	}

	/* Row 1 — always visible, deliberately minimal so it fits inside
	   narrow slots (e.g. the comparison picker) without any of these
	   pieces needing to shrink or wrap. */
	.row-main {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.avatar {
		flex: none;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--card-bg);
		border: 2px solid;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		font: inherit;
		cursor: default;
		transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
	}

	/* Only rendered as a <button> when it's an actual toggle (onToggleGhost
	   is set) — everything below only matters in that case. */
	.avatar[type='button'] {
		cursor: pointer;
	}

	.avatar[type='button']:hover {
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--driver-color) 25%, transparent);
	}

	.avatar[type='button']:active {
		transform: scale(0.94);
	}

	.widget:hover .avatar {
		transform: scale(1.06);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--driver-color) 18%, transparent);
	}

	.name {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-sans);
		font-weight: 700;
		font-size: 14px;
	}

	.lap-time {
		flex: none;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-red);
	}

	.speed {
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		margin-left: 2px;
	}

	/* Row 2 — hidden by default, revealed on hover. A plain max-height
	   collapse rather than a grid-fr trick: it's a couple lines longer
	   but it can't silently fail to collapse the way fr-tracks can when
	   nowrap content is involved, and it grows/shrinks in height (which
	   this card has room for) rather than width (which the comparison
	   picker's fixed-width slots don't). */
	.row-extra {
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.22s ease;
	}

	.widget:hover .row-extra {
		max-height: 56px;
	}

	.row-extra-inner {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
		padding-top: 10px;
		opacity: 0;
		transition: opacity 0.16s ease 0.02s;
	}

	.widget:hover .row-extra-inner {
		opacity: 1;
	}

	.sub {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--color-muted);
		white-space: nowrap;
	}

	.mini {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}

	.mini-pct {
		font-size: 10px;
		color: var(--color-muted);
		line-height: 1;
	}

	.bar {
		width: 56px;
		height: 5px;
		border-radius: var(--radius-pill);
		background: var(--card-bg);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: var(--radius-pill);
		transition: width 0.15s ease;
	}

	.fill.throttle {
		background: var(--color-accent);
	}

	.fill.brake {
		background: var(--color-red);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.value {
		font-size: 14px;
		color: var(--color-text);
		line-height: 1.1;
		white-space: nowrap;
	}

	.gear-value {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}

	.unit {
		font-size: 10px;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
</style>