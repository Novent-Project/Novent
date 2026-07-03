<script lang="ts">
	import type { DriverTelemetry } from '$lib/components/analysis/state';

	interface Props {
		driver: DriverTelemetry;
	}

	let { driver }: Props = $props();

	let throttlePct = $derived(Math.round((driver.throttle ?? 0) * 100));
	let brakePct = $derived(Math.round((driver.brake ?? 0) * 100));
</script>

<div class="hud-card widget">
	<div class="left">
		<div class="avatar" style="border-color: {driver.color};">
			<svg viewBox="0 0 16 16" fill="none" stroke={driver.color} stroke-width="1.5" style="color: {driver.color};">
				<path d="M6 2h4l1.2 3.5H4.8L6 2Z" fill={driver.color} stroke="none" />
				<rect x="3.5" y="5" width="9" height="8" rx="2" fill={driver.color} stroke="none" />
				<rect x="2" y="6.5" width="1.6" height="3" rx="0.6" fill={driver.color} stroke="none" />
				<rect x="12.4" y="6.5" width="1.6" height="3" rx="0.6" fill={driver.color} stroke="none" />
			</svg>
		</div>
		<div class="who">
			<div class="name" style="color: {driver.color};">{driver.name}</div>
			<div class="sub">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<circle cx="8" cy="8" r="6" />
					<path d="M8 5v3l2 1.5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				<span>Stint {driver.stint}</span>
				<span>Lap {driver.lap}</span>
			</div>
		</div>
		<div class="lap-time mono">{driver.lapTime}</div>
	</div>

	<div class="right">
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
			<span class="value mono">{Math.round(driver.speed)}</span>
			<span class="unit">km/h</span>
		</div>

		<div class="stat">
			<span class="value mono gear-value">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="gear-icon">
					<path d="M3 3v10" stroke-linecap="round" />
					<path d="M3 8h8" stroke-linecap="round" />
					<path d="M9 5.5 11.5 8 9 10.5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
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

<style>
	.widget {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		padding: 12px 16px;
	}

	.left {
		display: flex;
		flex-direction: row;
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
	}

	.avatar svg {
		width: 18px;
		height: 18px;
	}

	.who {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.name {
		font-family: var(--font-sans);
		font-weight: 700;
		font-size: 14px;
		line-height: 1.1;
	}

	.sub {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--color-muted);
	}

	.sub svg {
		width: 11px;
		height: 11px;
		flex: none;
	}

	.lap-time {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-red);
		margin-left: 4px;
	}

	.right {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 16px;
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
		width: 72px;
		height: 5px;
		border-radius: var(--radius-pill);
		background: var(--card-bg);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: var(--radius-pill);
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
		font-size: 15px;
		color: var(--color-text);
		line-height: 1.1;
	}

	.gear-value {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}

	.gear-icon {
		width: 12px;
		height: 12px;
		color: var(--color-muted);
	}

	.unit {
		font-size: 10px;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
</style>