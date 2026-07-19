<script lang="ts">
	import { untrack } from 'svelte';
	import { formatTime, traceIndexAtTime } from '$lib/utils';
	import { buildChartLine, symmetricRange } from '$lib/utils/chart';
	import PlaybarChart from '$lib/components/analysis/telemetry/PlaybarChart.svelte';
	import type { AnalysisState, MapView } from '$lib/components/analysis/state';

	interface Props {
		analysis: AnalysisState;
		map?: MapView;
		onClose?: () => void;
	}

	let { analysis, map, onClose }: Props = $props();

	const ROW_H = 128;

	let sidebarEl = $state<HTMLDivElement | null>(null);
	let chartTrackEl = $state<HTMLDivElement | null>(null);
	let chartW = $state(0);
	let scrubbing = $state(false);

	let pct = $derived(analysis.resolvedLapTime > 0 ? (analysis.currentTime / analysis.resolvedLapTime) * 100 : 0);
	let pctClamped = $derived(Math.min(Math.max(pct, 0), 100));
	let playheadX = $derived(chartW * (pctClamped / 100));

	let primaryColor = $derived(analysis.primaryDriver.color);
	let primaryName = $derived(analysis.driverName);
	let primaryDs = $derived(analysis.dsTrace);

	let visibleComps = $derived(
		analysis.compLaps
			.map((c, i) => ({ ...c, label: c.lap.player_name || `Reference ${i + 1}` }))
			.filter(c => c.ghostVisible)
	);

	let deltaByComp = $derived.by(() => {
		const ds = primaryDs;
		if (!ds) return [];
		return visibleComps.map(c => {
			const n = Math.min(ds.time.length, c.ds.time.length);
			const values = new Array<number>(n);
			for (let b = 0; b < n; b++) values[b] = ds.time[b] - c.ds.time[b];
			return { color: c.color, label: c.label, values };
		});
	});

	let deltaRange = $derived.by(() => {
		const mags: number[] = [];
		for (const d of deltaByComp) for (const v of d.values) mags.push(Math.abs(v));
		if (!mags.length) return { min: -0.25, max: 0.25 };
		mags.sort((a, b) => a - b);
		const median = mags[mags.length >> 1];
		const peak = mags[mags.length - 1];
		const scale = Math.max(0.25, Math.min(median * 2.5, peak) * 1.15);
		return { min: -scale, max: scale };
	});

	let deltaComps = $derived.by(() => {
		const ds = primaryDs;
		if (!ds) return [];
		return deltaByComp.map(d => ({
			color: d.color,
			label: d.label,
			...buildChartLine(ds.time, d.values, analysis.resolvedLapTime, chartW, ROW_H, deltaRange)
		}));
	});

	let throttlePrimary = $derived(
		primaryDs
			? buildChartLine(primaryDs.time, primaryDs.gas, analysis.resolvedLapTime, chartW, ROW_H, { min: 0, max: 1, baseline: 0 })
			: { line: '', area: '' }
	);
	let throttleComps = $derived(
		visibleComps.map(c => ({
			color: c.color,
			label: c.label,
			...buildChartLine(c.ds.time, c.ds.gas, analysis.resolvedLapTime, chartW, ROW_H, { min: 0, max: 1 })
		}))
	);

	let brakePrimary = $derived(
		primaryDs
			? buildChartLine(primaryDs.time, primaryDs.brake, analysis.resolvedLapTime, chartW, ROW_H, { min: 0, max: 1, baseline: 0 })
			: { line: '', area: '' }
	);
	let brakeComps = $derived(
		visibleComps.map(c => ({
			color: c.color,
			label: c.label,
			...buildChartLine(c.ds.time, c.ds.brake, analysis.resolvedLapTime, chartW, ROW_H, { min: 0, max: 1 })
		}))
	);

	let speedRange = $derived.by(() => {
		let peak = 0;
		for (const arr of [primaryDs?.speed ?? [], ...visibleComps.map(c => c.ds.speed)]) {
			for (const v of arr) if (v > peak) peak = v;
		}
		return { min: 0, max: Math.max(50, Math.ceil(peak / 25) * 25), baseline: 0 };
	});
	let speedPrimary = $derived(
		primaryDs
			? buildChartLine(primaryDs.time, primaryDs.speed, analysis.resolvedLapTime, chartW, ROW_H, speedRange)
			: { line: '', area: '' }
	);
	let speedComps = $derived(
		visibleComps.map(c => ({
			color: c.color,
			label: c.label,
			...buildChartLine(c.ds.time, c.ds.speed, analysis.resolvedLapTime, chartW, ROW_H, { min: speedRange.min, max: speedRange.max })
		}))
	);

	let steerRange = $derived(symmetricRange(primaryDs?.steer ?? [], ...visibleComps.map(c => c.ds.steer)));
	let steerPrimary = $derived(
		primaryDs
			? buildChartLine(primaryDs.time, primaryDs.steer, analysis.resolvedLapTime, chartW, ROW_H, steerRange)
			: { line: '', area: '' }
	);
	let steerComps = $derived(
		visibleComps.map(c => ({
			color: c.color,
			label: c.label,
			...buildChartLine(c.ds.time, c.ds.steer, analysis.resolvedLapTime, chartW, ROW_H, steerRange)
		}))
	);

	let tickStep = $derived.by(() => {
		if (analysis.resolvedLapTime <= 0 || chartW <= 0) return 10;
		const pxPerSec = (chartW * zoom) / analysis.resolvedLapTime;
		return [1, 2, 5, 10, 15, 30, 60, 120].find(s => s * pxPerSec >= 44) ?? 240;
	});
	let ticks = $derived.by(() => {
		const out: number[] = [];
		for (let t = tickStep; t < analysis.resolvedLapTime; t += tickStep) out.push(t);
		return out;
	});

	function seekFromClientX(clientX: number, unzoomed = false) {
		if (!chartTrackEl || analysis.resolvedLapTime <= 0 || chartW <= 0) return;
		const rect = chartTrackEl.getBoundingClientRect();
		const mouseX = Math.min(rect.width, Math.max(0, clientX - rect.left));
		const originX = unzoomed ? mouseX : panX + mouseX / zoom;
		const t = Math.min(analysis.resolvedLapTime, Math.max(0, (originX / chartW) * analysis.resolvedLapTime));
		analysis.seek(t);
	}

	function isDeltaRow(e: PointerEvent): boolean {
		return (e.target as HTMLElement).closest<HTMLElement>('.grid-track[data-channel]')?.dataset.channel === 'delta';
	}

	const ZOOM_MIN = 1;
	const ZOOM_MAX = 20;

	let zoom = $state(1);
	let panX = $state(0);
	let panning = $state(false);
	let panStartClientX = 0;
	let panStartX = 0;

	let maxPanX = $derived(chartW > 0 ? Math.max(0, chartW - chartW / zoom) : 0);

	function clampPan(p: number): number {
		return Math.min(maxPanX, Math.max(0, p));
	}

	function zoomAt(clientX: number, factor: number) {
		if (!chartTrackEl || chartW <= 0) return;
		const rect = chartTrackEl.getBoundingClientRect();
		const mouseX = Math.min(rect.width, Math.max(0, clientX - rect.left));
		const originX = panX + mouseX / zoom;
		const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
		zoom = newZoom;
		panX = clampPan(originX - mouseX / newZoom);
	}

	function onChartWheel(e: WheelEvent) {
		e.preventDefault();
		const factor = Math.exp(-e.deltaY * 0.0015);
		zoomAt(e.clientX, factor);
	}

	function resetZoom() {
		zoom = 1;
		panX = 0;
	}

	$effect(() => {
		if (!map) return;
		const target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, map.zoomLevel));
		untrack(() => {
			if (zoom === target) return;
			zoom = target;
			panX = clampPan(chartW * (pctClamped / 100) - chartW / (2 * target));
		});
	});

	$effect(() => {
		const progress = pctClamped;
		if (zoom <= 1 || scrubbing || panning) return;
		untrack(() => {
			const playhead = chartW * (progress / 100);
			const winWidth = chartW / zoom;
			if (!analysis.isPlaying) {
				const margin = winWidth * 0.05;
				const inView = playhead >= panX + margin && playhead <= panX + winWidth - margin;
				if (inView) return;
			}
			panX = clampPan(playhead - winWidth / 2);
		});
	});

	type Channel = 'throttle' | 'brake' | 'steer' | 'speed' | 'delta';
	const CHANNEL_LABEL: Record<Channel, string> = { throttle: 'Throttle', brake: 'Brake', steer: 'Steering', speed: 'Speed', delta: 'Delta' };

	let hoverTime = $state<number | null>(null);
	let hoverChannel = $state<Channel | null>(null);
	let hoverPos = $state({ x: 0, y: 0 });

	function updateHover(e: PointerEvent) {
		if (!chartTrackEl || !sidebarEl || chartW <= 0 || analysis.resolvedLapTime <= 0) return;
		const rowEl = (e.target as HTMLElement).closest<HTMLElement>('.grid-track[data-channel]');
		hoverChannel = (rowEl?.dataset.channel as Channel | undefined) ?? null;

		const trackRect = chartTrackEl.getBoundingClientRect();
		const mouseX = Math.min(trackRect.width, Math.max(0, e.clientX - trackRect.left));
		const originX = hoverChannel === 'delta' ? mouseX : panX + mouseX / zoom;
		hoverTime = Math.min(analysis.resolvedLapTime, Math.max(0, (originX / chartW) * analysis.resolvedLapTime));

		const cardRect = sidebarEl.getBoundingClientRect();
		hoverPos = { x: e.clientX - cardRect.left, y: e.clientY - cardRect.top };
	}

	function clearHover() {
		hoverTime = null;
		hoverChannel = null;
	}

	let hoverX = $derived(
		hoverTime !== null && analysis.resolvedLapTime > 0 ? (hoverTime / analysis.resolvedLapTime) * chartW : null
	);

	function channelValueAt(
		ds: { time: number[]; gas: number[]; brake: number[]; steer: number[]; speed: number[] } | null,
		channel: Channel | null
	): number | null {
		if (!ds || hoverTime === null || !channel) return null;
		const idx = traceIndexAtTime(ds.time, hoverTime);
		if (channel === 'throttle') return ds.gas[idx] ?? 0;
		if (channel === 'brake') return ds.brake[idx] ?? 0;
		if (channel === 'speed') return ds.speed[idx] ?? 0;
		return ds.steer[idx] ?? 0;
	}

	function formatChannelValue(channel: Channel, v: number): string {
		if (channel === 'steer') return v.toFixed(2);
		if (channel === 'speed') return `${Math.round(v)} km/h`;
		if (channel === 'delta') return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}s`;
		return `${Math.round(v * 100)}%`;
	}

	let hoverPrimaryValue = $derived(channelValueAt(primaryDs, hoverChannel));
	let hoverCompRows = $derived.by(() => {
		if (!hoverChannel) return [];
		if (hoverChannel === 'delta') {
			const ds = primaryDs;
			if (hoverTime === null || !ds) return [];
			const b = traceIndexAtTime(ds.time, hoverTime);
			return deltaByComp.map(d => ({ color: d.color, name: d.label, value: d.values[b] ?? 0 }));
		}
		return visibleComps
			.map(c => ({ color: c.color, name: c.label, value: channelValueAt(c.ds, hoverChannel) }))
			.filter((r): r is { color: string; name: string; value: number } => r.value !== null);
	});

	function isRulerTarget(e: PointerEvent): boolean {
		return !!(e.target as HTMLElement).closest('.ruler-track');
	}

	function wantsPan(e: PointerEvent): boolean {
		return zoom > 1 && !isRulerTarget(e) && (e.shiftKey || e.altKey || e.button === 1);
	}

	let scrubUnzoomed = false;

	function onStackPointerDown(e: PointerEvent) {
		if (wantsPan(e)) {
			panning = true;
			panStartClientX = e.clientX;
			panStartX = panX;
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
			return;
		}
		scrubbing = true;
		scrubUnzoomed = isDeltaRow(e);
		analysis.beginScrub();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		seekFromClientX(e.clientX, scrubUnzoomed);
	}

	function onStackPointerMove(e: PointerEvent) {
		updateHover(e);
		if (scrubbing) {
			seekFromClientX(e.clientX, scrubUnzoomed);
			return;
		}
		if (panning) {
			const dx = e.clientX - panStartClientX;
			panX = clampPan(panStartX - dx / zoom);
		}
	}

	function onStackPointerUp(e: PointerEvent) {
		if (scrubbing) analysis.endScrub();
		scrubbing = false;
		panning = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}
</script>

<div class="hud-card graph-sidebar" bind:this={sidebarEl}>
	<div class="sidebar-header">
		<span class="sidebar-title">Telemetry</span>
		{#if zoom > 1}
			<button class="zoom-badge" onclick={resetZoom} aria-label="Reset zoom">{zoom.toFixed(1)}× · reset</button>
		{:else}
			<span class="zoom-hint">Scroll to zoom · shift+drag to pan</span>
		{/if}
		{#if onClose}
			<button class="icon-btn" onclick={onClose} aria-label="Close graph sidebar">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
				</svg>
			</button>
		{/if}
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -- pointer-only
	     scrub/pan/zoom enhancement; playback is keyboard-reachable via the
	     playbar's transport controls. -->
	<div
		class="chart-stack"
		onpointerdown={onStackPointerDown}
		onpointermove={onStackPointerMove}
		onpointerup={onStackPointerUp}
		onpointerleave={clearHover}
		onwheel={onChartWheel}
		ondblclick={resetZoom}
	>
		<div class="ruler-track" bind:this={chartTrackEl} bind:clientWidth={chartW}>
			{#each ticks as t (t)}
				<span class="tick" style="left:{((t / analysis.resolvedLapTime) * chartW - panX) * zoom}px">{t}</span>
			{/each}
			{#if chartW > 0}
				<svg class="ruler-overlay" viewBox="0 0 {chartW} 16" preserveAspectRatio="none">
					<g transform="translate({(-panX * zoom).toFixed(2)} 0) scale({zoom} 1)">
						{#if hoverX !== null}<line x1={hoverX} x2={hoverX} y1="0" y2="16" class="crosshair" />{/if}
						<line x1={playheadX} x2={playheadX} y1="0" y2="16" class="playhead" />
					</g>
				</svg>
			{/if}
		</div>

		{#if deltaComps.length}
			<div class="channel-block">
				<PlaybarChart
					label="Delta"
					channel="delta"
					width={chartW}
					height={ROW_H}
					color={primaryColor}
					line=""
					compLines={deltaComps}
					midline
					zoom={1}
					panX={0}
				>
					{#snippet icon()}
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M8 3.2 13 12.5H3Z" stroke-linejoin="round" />
						</svg>
					{/snippet}
				</PlaybarChart>
				{#if chartW > 0}
					<svg class="channel-overlay" style="height:{ROW_H}px" viewBox="0 0 {chartW} {ROW_H}" preserveAspectRatio="none">
						{#if zoom > 1}
							<rect class="zoom-window" x={panX} y="0" width={chartW / zoom} height={ROW_H} />
						{/if}
						{#if hoverX !== null}<line x1={hoverX} x2={hoverX} y1="0" y2={ROW_H} class="crosshair" />{/if}
						<line x1={playheadX} x2={playheadX} y1="0" y2={ROW_H} class="playhead" />
					</svg>
				{/if}
			</div>
		{/if}

		<div class="channel-block">
			<PlaybarChart
				label="Throttle"
				channel="throttle"
				width={chartW}
				height={ROW_H}
				color={primaryColor}
				line={throttlePrimary.line}
				area={throttlePrimary.area}
				compLines={throttleComps}
				{zoom}
				{panX}
			>
				{#snippet icon()}
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M2 12a6 6 0 0 1 12 0" stroke-linecap="round" />
						<path d="M8 12L11 7" stroke-linecap="round" />
						<circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
					</svg>
				{/snippet}
			</PlaybarChart>
			{#if chartW > 0}
				<svg class="channel-overlay" style="height:{ROW_H}px" viewBox="0 0 {chartW} {ROW_H}" preserveAspectRatio="none">
					<g transform="translate({(-panX * zoom).toFixed(2)} 0) scale({zoom} 1)">
						{#if hoverX !== null}<line x1={hoverX} x2={hoverX} y1="0" y2={ROW_H} class="crosshair" />{/if}
						<line x1={playheadX} x2={playheadX} y1="0" y2={ROW_H} class="playhead" />
					</g>
				</svg>
			{/if}
		</div>

		<div class="channel-block">
			<PlaybarChart
				label="Brakes"
				channel="brake"
				width={chartW}
				height={ROW_H}
				color="var(--color-red)"
				line={brakePrimary.line}
				area={brakePrimary.area}
				compLines={brakeComps}
				{zoom}
				{panX}
			>
				{#snippet icon()}
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<circle cx="8" cy="8" r="5.5" />
						<circle cx="8" cy="8" r="2" />
					</svg>
				{/snippet}
			</PlaybarChart>
			{#if chartW > 0}
				<svg class="channel-overlay" style="height:{ROW_H}px" viewBox="0 0 {chartW} {ROW_H}" preserveAspectRatio="none">
					<g transform="translate({(-panX * zoom).toFixed(2)} 0) scale({zoom} 1)">
						{#if hoverX !== null}<line x1={hoverX} x2={hoverX} y1="0" y2={ROW_H} class="crosshair" />{/if}
						<line x1={playheadX} x2={playheadX} y1="0" y2={ROW_H} class="playhead" />
					</g>
				</svg>
			{/if}
		</div>

		<div class="channel-block">
			<PlaybarChart
				label="Steering"
				channel="steer"
				width={chartW}
				height={ROW_H}
				color={primaryColor}
				line={steerPrimary.line}
				compLines={steerComps}
				midline
				{zoom}
				{panX}
			>
				{#snippet icon()}
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<circle cx="8" cy="8" r="6" />
						<circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
						<path d="M8 2v3.2M3.4 10.8l2.8-1.6M12.6 10.8l-2.8-1.6" stroke-linecap="round" />
					</svg>
				{/snippet}
			</PlaybarChart>
			{#if chartW > 0}
				<svg class="channel-overlay" style="height:{ROW_H}px" viewBox="0 0 {chartW} {ROW_H}" preserveAspectRatio="none">
					<g transform="translate({(-panX * zoom).toFixed(2)} 0) scale({zoom} 1)">
						{#if hoverX !== null}<line x1={hoverX} x2={hoverX} y1="0" y2={ROW_H} class="crosshair" />{/if}
						<line x1={playheadX} x2={playheadX} y1="0" y2={ROW_H} class="playhead" />
					</g>
				</svg>
			{/if}
		</div>

		<div class="channel-block">
			<PlaybarChart
				label="Speed"
				channel="speed"
				width={chartW}
				height={ROW_H}
				color={primaryColor}
				line={speedPrimary.line}
				area={speedPrimary.area}
				compLines={speedComps}
				{zoom}
				{panX}
			>
				{#snippet icon()}
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M2.5 11.5a6 6 0 0 1 11 0" stroke-linecap="round" />
						<path d="M8 11.5l2.6-3.8" stroke-linecap="round" />
						<circle cx="8" cy="11.5" r="1" fill="currentColor" stroke="none" />
					</svg>
				{/snippet}
			</PlaybarChart>
			{#if chartW > 0}
				<svg class="channel-overlay" style="height:{ROW_H}px" viewBox="0 0 {chartW} {ROW_H}" preserveAspectRatio="none">
					<g transform="translate({(-panX * zoom).toFixed(2)} 0) scale({zoom} 1)">
						{#if hoverX !== null}<line x1={hoverX} x2={hoverX} y1="0" y2={ROW_H} class="crosshair" />{/if}
						<line x1={playheadX} x2={playheadX} y1="0" y2={ROW_H} class="playhead" />
					</g>
				</svg>
			{/if}
		</div>
	</div>

	{#if hoverChannel && hoverTime !== null && (hoverChannel === 'delta' ? hoverCompRows.length > 0 : hoverPrimaryValue !== null)}
		<div class="hover-tooltip" class:flip={hoverPos.x < 200} style="left:{hoverPos.x}px; top:{hoverPos.y}px">
			<div class="hover-header">
				<span class="hover-title">{CHANNEL_LABEL[hoverChannel]} at</span>
				<span class="hover-time mono">{formatTime(hoverTime)}</span>
			</div>
			<div class="hover-divider"></div>
			{#if hoverChannel !== 'delta' && hoverPrimaryValue !== null}
				<div class="hover-row">
					<span class="hover-dot" style="background:{primaryColor}"></span>
					<span class="hover-name">{primaryName}</span>
					<span class="hover-value mono">{formatChannelValue(hoverChannel, hoverPrimaryValue)}</span>
				</div>
			{/if}
			{#each hoverCompRows as row (row.color)}
				<div class="hover-row">
					<span class="hover-dot" style="background:{row.color}"></span>
					<span class="hover-name">{row.name}</span>
					<span class="hover-value mono">{formatChannelValue(hoverChannel, row.value)}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.graph-sidebar {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 16px 18px;
		gap: 14px;
		overflow-y: auto;
	}

	.sidebar-header {
		flex: none;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.sidebar-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		margin-right: auto;
	}

	.zoom-hint {
		font-size: 10.5px;
		color: var(--color-muted);
		opacity: 0.65;
	}

	.zoom-badge {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-accent);
		font-size: 10.5px;
		font-family: var(--font-mono);
		padding: 2px 8px;
		cursor: pointer;
	}

	.zoom-badge:hover {
		background: var(--card-bg);
		color: var(--color-text);
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 24px;
		height: 24px;
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
		width: 14px;
		height: 14px;
	}

	.chart-stack {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16px;
		cursor: ew-resize;
		user-select: none;
		touch-action: none;
	}

	.ruler-track {
		position: relative;
		flex: none;
		height: 16px;
		overflow: hidden;
	}

	.ruler-overlay {
		position: absolute;
		inset: 0;
		overflow: visible;
	}

	.tick {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		font-size: 10px;
		font-family: var(--font-mono);
		color: var(--color-muted);
		white-space: nowrap;
	}

	.channel-block {
		position: relative;
		flex: none;
	}

	.channel-overlay,
	.ruler-overlay {
		pointer-events: none;
	}

	.channel-overlay {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		overflow: visible;
	}

	.channel-overlay .playhead,
	.ruler-overlay .playhead {
		stroke: var(--color-text);
		stroke-width: 1.25;
		opacity: 0.6;
		vector-effect: non-scaling-stroke;
	}

	.channel-overlay .crosshair,
	.ruler-overlay .crosshair {
		stroke: var(--color-accent);
		stroke-width: 1;
		stroke-dasharray: 2 2;
		opacity: 0.7;
		vector-effect: non-scaling-stroke;
	}

	.channel-overlay .zoom-window {
		fill: var(--color-accent-dim);
		stroke: var(--color-accent-border);
		stroke-width: 1;
	}

	.hover-tooltip {
		position: absolute;
		z-index: 20;
		transform: translate(-100%, -8px);
	}

	.hover-tooltip.flip {
		transform: translate(14px, -8px);
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 168px;
		padding: 10px 12px;
		border-radius: var(--radius-md, 10px);
		border: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-bg) 92%, transparent);
		backdrop-filter: blur(4px);
		box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.5);
		pointer-events: none;
		white-space: nowrap;
	}

	.hover-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-text);
	}

	.hover-time {
		font-size: 12px;
		color: var(--color-muted);
	}

	.hover-divider {
		height: 1px;
		margin: -2px 0;
		background: var(--color-border);
		opacity: 0.7;
	}

	.hover-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
	}

	.hover-dot {
		flex: none;
		width: 2.5px;
		align-self: stretch;
		border-radius: var(--radius-pill);
	}

	.hover-name {
		flex: 1 1 auto;
		min-width: 46px;
		color: var(--color-text);
	}

	.hover-value {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text);
		text-align: right;
	}
</style>
