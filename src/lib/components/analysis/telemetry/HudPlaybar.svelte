<script lang="ts">
	import { formatTime, traceIndexAtTime } from '$lib/utils';
	import { buildChartLine, symmetricRange } from '$lib/utils/chart';
	import Icon from '$lib/components/chrome/Icon.svelte';
	import { Play, Pause, ArrowsRightLeft } from '@steeze-ui/heroicons';
	import PlaybarChart from '$lib/components/analysis/telemetry/PlaybarChart.svelte';
	import type { AnalysisState } from '$lib/components/analysis/state';

	interface Props {
		analysis: AnalysisState;
		graphsOpen?: boolean;
		placement?: 'bottom' | 'side';
		onToggleGraphs?: () => void;
	}

	let { analysis, graphsOpen = false, placement = 'bottom', onToggleGraphs }: Props = $props();

	let playbarEl = $state<HTMLDivElement | null>(null);
	let pbW = $state(0);
	let pbH = $state(0);
	let radius = $state(0);

	// hud-card's border-radius isn't defined in this file, so read the real
	// computed value rather than guessing a px number that might drift out
	// of sync with the shared card style.
	$effect(() => {
		if (!playbarEl) return;
		const r = parseFloat(getComputedStyle(playbarEl).borderRadius);
		if (!Number.isNaN(r)) radius = r;
	});

	// Inset stroke by half its width so it sits crisply inside the card edge
	// rather than getting clipped by the card's own rounded corners.
	const STROKE = 2.25;
	let inset = $derived(STROKE / 2);
	let rectW = $derived(Math.max(pbW - STROKE, 0));
	let rectH = $derived(Math.max(pbH - STROKE, 0));
	let rectR = $derived(Math.max(radius - inset, 0));

	// Explicit "top cap" path — left corner arc, top straight, right corner
	// arc — rather than relying on where a plain <rect>'s path happens to
	// start/stop. This guarantees the progress stroke always ends mid-curve
	// cleanly instead of cutting off flat partway down a straight edge.
	let topPathD = $derived(
		rectW && rectH
			? `M ${inset},${inset + rectR} A ${rectR},${rectR} 0 0 1 ${inset + rectR},${inset} L ${inset + rectW - rectR},${inset} A ${rectR},${rectR} 0 0 1 ${inset + rectW},${inset + rectR}`
			: ''
	);

	let pct = $derived(analysis.resolvedLapTime > 0 ? (analysis.currentTime / analysis.resolvedLapTime) * 100 : 0);
	let pctClamped = $derived(Math.min(Math.max(pct, 0), 100));

	let progressPct = $derived(
		analysis.playMode === 'distance'
			? Math.min(Math.max(analysis.currentNorm * 100, 0), 100)
			: pctClamped
	);

	// Read the thumb's position straight off the path geometry (getPointAtLength)
	// instead of re-deriving corner trig by hand, so it's always pixel-exact
	// wherever the dash actually ends.
	let topPathEl = $state<SVGPathElement | null>(null);
	let topPathLen = $state(0);
	let thumb = $state({ x: 0, y: 0 });
	// Measure the path once per geometry change, not per playback frame —
	// getPointAtLength each frame is fine, but getTotalLength needn't be.
	$effect(() => {
		topPathD;
		topPathLen = topPathEl ? topPathEl.getTotalLength() : 0;
	});
	$effect(() => {
		if (!topPathEl || !topPathLen) return;
		const p = topPathEl.getPointAtLength(topPathLen * (progressPct / 100));
		thumb = { x: p.x, y: p.y };
	});

	let deltaText = $derived(`${analysis.liveDeltaValue >= 0 ? '+' : ''}${analysis.liveDeltaValue.toFixed(3)}`);
	let distanceText = $derived(`${analysis.distanceGap >= 0 ? '+' : ''}${Math.round(analysis.distanceGap)} m`);

	// ---------- expanded telemetry graphs ----------
	const ROW_H = 40;

	let expanded = $derived(graphsOpen && placement === 'bottom');

	let chartTrackEl = $state<HTMLDivElement | null>(null);
	let chartW = $state(0);
	let scrubbing = $state(false);

	let playheadX = $derived(chartW * (pctClamped / 100));

	// The primary trace's own display color, same value the map and
	// telemetry widgets use (AnalysisState.primaryDriver.color) — kept in
	// sync with those rather than a separate hardcoded CSS var.
	let primaryColor = $derived(analysis.primaryDriver.color);
	let primaryName  = $derived(analysis.driverName);

	let primaryDs = $derived(analysis.dsTrace);

	// Every comparison lap with its ghost currently toggled on — laps
	// hidden via toggleGhost() (map / telemetry widgets) drop out of the
	// chart rows and hover tooltip here too, not just the map. Label
	// mirrors AnalysisState.compEntries' fallback ("Reference N" numbered
	// by original position), computed before filtering so a toggled-off
	// lap in the middle doesn't renumber the ones after it.
	let visibleComps = $derived(
		analysis.compLaps
			.map((c, i) => ({ ...c, label: c.lap.player_name || `Reference ${i + 1}` }))
			.filter(c => c.ghostVisible)
	);

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

	// Steering has no fixed unit range (normalized vs. raw degrees depending
	// on source), so it's auto-scaled symmetrically around zero instead of
	// assuming 0..1 like throttle/brake, and rendered as a line only — a
	// filled area would need a zero baseline that a signed value shouldn't
	// implicitly get. The range now has to account for every visible
	// comparison lap's steering, not just one, so the scale doesn't clip
	// whichever lap happens not to be first.
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

	let tickStep = $derived(analysis.resolvedLapTime > 90 ? 10 : analysis.resolvedLapTime > 40 ? 5 : 1);
	let ticks = $derived.by(() => {
		const out: number[] = [];
		for (let t = tickStep; t < analysis.resolvedLapTime; t += tickStep) out.push(t);
		return out;
	});

	function seekFromClientX(clientX: number) {
		if (!chartTrackEl || analysis.resolvedLapTime <= 0 || chartW <= 0) return;
		const rect = chartTrackEl.getBoundingClientRect();
		const mouseX = Math.min(rect.width, Math.max(0, clientX - rect.left));
		// mouseX is a screen pixel within the (unzoomed) track box; convert it
		// back to a local chart-space x by undoing the current pan/zoom, same
		// as the hover math below, otherwise seeking while zoomed/panned would
		// land on whatever the *unzoomed* fraction pointed to instead of what's
		// actually under the cursor.
		const originX = panX + mouseX / zoom;
		const t = Math.min(analysis.resolvedLapTime, Math.max(0, (originX / chartW) * analysis.resolvedLapTime));
		analysis.seek(t);
	}

	// ---------- chart pan / zoom ----------
	// zoom/panX describe the visible window in the same local coordinate
	// space the chart paths are plotted in (0..chartW at zoom 1). Kept as a
	// view-only transform — never recomputes buildChartLine — so dragging
	// and wheeling stay cheap regardless of trace resolution.
	const ZOOM_MIN = 1;
	const ZOOM_MAX = 20;

	// Fixed row geometry, matching the CSS below (ruler height, row height,
	// row-gap, label column width, column-gap). Used to size/position the
	// single playhead/crosshair overlay that spans all three chart rows —
	// hardcoded the same way `.chart-panel.open`'s max-height already is.
	const RULER_H = 16;
	const ROW_GAP = 8;
	const LABEL_W = 112;
	const COL_GAP = 14;
	const OVERLAY_TOP = RULER_H + ROW_GAP;
	const OVERLAY_HEIGHT = ROW_H * 3 + ROW_GAP * 2;

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
		// Keep the point currently under the cursor fixed in place while the
		// zoom level changes, so wheeling in/out feels anchored to the mouse
		// rather than always zooming toward the left edge.
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

	// ---------- hover crosshair / tooltip ----------
	// The tooltip is now scoped to whichever row the cursor is actually
	// over (throttle/brake/steering), not all three channels at once — each
	// PlaybarChart row is tagged with a data-channel attribute so we can
	// tell them apart from the shared pointer handlers on .chart-grid.
	type Channel = 'throttle' | 'brake' | 'steer';
	const CHANNEL_LABEL: Record<Channel, string> = { throttle: 'Throttle', brake: 'Brake', steer: 'Steering' };

	let hoverTime = $state<number | null>(null);
	let hoverChannel = $state<Channel | null>(null);
	// Position relative to playbarEl's own box, not the viewport — a
	// position:fixed tooltip breaks if any ancestor (e.g. a glassy hud-card
	// with backdrop-filter) establishes its own containing block, and it'd
	// also get clipped by .chart-panel's `overflow:hidden`. Anchoring to
	// playbarEl (position:relative, no overflow clipping) with plain
	// position:absolute sidesteps both problems.
	let hoverPos = $state({ x: 0, y: 0 });

	function updateHover(e: PointerEvent) {
		if (!chartTrackEl || !playbarEl || chartW <= 0 || analysis.resolvedLapTime <= 0) return;
		const trackRect = chartTrackEl.getBoundingClientRect();
		const mouseX = Math.min(trackRect.width, Math.max(0, e.clientX - trackRect.left));
		const originX = panX + mouseX / zoom;
		hoverTime = Math.min(analysis.resolvedLapTime, Math.max(0, (originX / chartW) * analysis.resolvedLapTime));

		const rowEl = (e.target as HTMLElement).closest<HTMLElement>('.grid-track[data-channel]');
		hoverChannel = (rowEl?.dataset.channel as Channel | undefined) ?? null;

		const cardRect = playbarEl.getBoundingClientRect();
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
		ds: { time: number[]; gas: number[]; brake: number[]; steer: number[] } | null,
		channel: Channel | null
	): number | null {
		if (!ds || hoverTime === null || !channel) return null;
		const idx = traceIndexAtTime(ds.time, hoverTime);
		if (channel === 'throttle') return ds.gas[idx] ?? 0;
		if (channel === 'brake') return ds.brake[idx] ?? 0;
		return ds.steer[idx] ?? 0;
	}

	function formatChannelValue(channel: Channel, v: number): string {
		return channel === 'steer' ? v.toFixed(2) : `${Math.round(v * 100)}%`;
	}

	let hoverPrimaryValue = $derived(channelValueAt(primaryDs, hoverChannel));

	// One tooltip row per currently-visible comparison lap — hidden
	// (ghost-off) laps are already excluded from `visibleComps`, so they
	// fall out of the tooltip along with the chart line.
	let hoverCompRows = $derived.by(() => {
		if (!hoverChannel) return [];
		return visibleComps
			.map(c => ({ color: c.color, name: c.label, value: channelValueAt(c.ds, hoverChannel) }))
			.filter((r): r is { color: string; name: string; value: number } => r.value !== null);
	});

	// The ruler and chart rows are both seek surfaces at any zoom level —
	// scrubbing should never stop working just because you've zoomed in.
	// Panning is instead an explicit gesture (shift/alt-drag, or a
	// middle-click drag) so there's still a way to move the visible window
	// around without giving up the ability to scrub with a plain drag.
	function isRulerTarget(e: PointerEvent): boolean {
		return !!(e.target as HTMLElement).closest('.ruler-track');
	}

	function wantsPan(e: PointerEvent): boolean {
		return zoom > 1 && !isRulerTarget(e) && (e.shiftKey || e.altKey || e.button === 1);
	}

	function onGridPointerDown(e: PointerEvent) {
		if (wantsPan(e)) {
			panning = true;
			panStartClientX = e.clientX;
			panStartX = panX;
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
			return;
		}
		scrubbing = true;
		analysis.beginScrub();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		seekFromClientX(e.clientX);
	}

	function onGridPointerMove(e: PointerEvent) {
		updateHover(e);
		if (scrubbing) {
			seekFromClientX(e.clientX);
			return;
		}
		if (panning) {
			const dx = e.clientX - panStartClientX;
			panX = clampPan(panStartX - dx / zoom);
		}
	}

	function onGridPointerUp(e: PointerEvent) {
		if (scrubbing) analysis.endScrub();
		scrubbing = false;
		panning = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}
</script>

<div class="hud-card playbar" bind:this={playbarEl} bind:clientWidth={pbW} bind:clientHeight={pbH}>
	{#if pbW && pbH}
		<svg class="frame" viewBox="0 0 {pbW} {pbH}" aria-hidden="true">
			<rect class="frame-track" x={inset} y={inset} width={rectW} height={rectH} rx={rectR} ry={rectR} />
			<path
				bind:this={topPathEl}
				class="frame-progress"
				d={topPathD}
				pathLength="100"
				style="stroke-dasharray:{progressPct} 9999; opacity:{progressPct > 0.05 ? 1 : 0}"
			/>
			<circle class="frame-thumb" cx={thumb.x} cy={thumb.y} r="3" />
		</svg>
	{/if}

	<input
		class="scrubber"
		type="range"
		min="0"
		max={analysis.playMode === 'time' ? analysis.resolvedLapTime : 1}
		step={analysis.playMode === 'time' ? 0.01 : 0.0005}
		value={analysis.playMode === 'time' ? analysis.currentTime : analysis.currentNorm}
		aria-label="Seek"
		onpointerdown={() => analysis.beginScrub()}
		onpointerup={() => analysis.endScrub()}
		onpointercancel={() => analysis.endScrub()}
		oninput={(e) => {
			const v = +(e.currentTarget as HTMLInputElement).value;
			if (analysis.playMode === 'time') analysis.seek(v);
			else analysis.seekNorm(v);
		}}
	/>

	<div class="bar-row">
		<div class="cluster left">
			<button class="play" onclick={() => analysis.togglePlayback()} aria-label={analysis.isPlaying ? 'Pause' : 'Play'}>
				<Icon src={analysis.isPlaying ? Pause : Play} theme="solid" size={16} />
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
				<Icon src={ArrowsRightLeft} theme="outline" size={16} color="var(--color-muted)" />
				<span class="mono dist">{distanceText}</span>
			</span>
		</div>

		<div class="cluster right">
			<div class="segment">
				<button class:active={analysis.playMode === 'time'} onclick={() => analysis.setPlayMode('time')}>Time</button>
				<button class:active={analysis.playMode === 'distance'} onclick={() => analysis.setPlayMode('distance')}>Distance</button>
			</div>

			<button
				class="icon-btn"
				class:active={graphsOpen}
				onclick={onToggleGraphs}
				aria-expanded={graphsOpen}
				aria-label={graphsOpen ? 'Hide telemetry graphs' : 'Show telemetry graphs'}
				title={graphsOpen ? 'Hide telemetry graphs' : 'Show telemetry graphs'}
			>
				{#if graphsOpen}
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path
							d="M6 2v3a1 1 0 0 1-1 1H2M10 2v3a1 1 0 0 0 1 1h3M6 14v-3a1 1 0 0 0-1-1H2M10 14v-3a1 1 0 0 1 1-1h3"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{:else}
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path
							d="M2 6V3a1 1 0 0 1 1-1h3M11 2h3a1 1 0 0 1 1 1v3M14 10v3a1 1 0 0 1-1 1h-3M5 14H2a1 1 0 0 1-1-1v-3"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</div>

	{#if placement === 'bottom'}
	<div class="chart-panel" class:open={expanded}>
		<div class="chart-panel-inner">
			<div class="chart-panel-header">
				<span>Analytics during the lap time</span>
				{#if zoom > 1}
					<button class="zoom-badge" onclick={resetZoom} aria-label="Reset zoom">
						{zoom.toFixed(1)}× · reset
					</button>
				{:else}
					<span class="zoom-hint">Scroll to zoom · drag to scrub · shift+drag to pan</span>
				{/if}
			</div>

			<!-- svelte-ignore a11y_no_static_element_interactions -- pointer-only
			     scrub/pan/zoom enhancement; playback is keyboard-reachable via the
			     transport controls above. -->
			<div
				class="chart-grid"
				onpointerdown={onGridPointerDown}
				onpointermove={onGridPointerMove}
				onpointerup={onGridPointerUp}
				onpointerleave={clearHover}
				onwheel={onChartWheel}
				ondblclick={resetZoom}
			>
				<div class="grid-label ruler-label"></div>
				<div class="grid-track ruler-track" bind:this={chartTrackEl} bind:clientWidth={chartW}>
					{#each ticks as t (t)}
						<span
							class="tick"
							style="left:{((t / analysis.resolvedLapTime) * chartW - panX) * zoom}px"
						>{t}</span>
					{/each}
				</div>

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

				<PlaybarChart
					label="Steering"
					channel="steer"
					width={chartW}
					height={ROW_H}
					color={primaryColor}
					line={steerPrimary.line}
					compLines={steerComps}
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

				<!-- Single continuous playhead/crosshair spanning all three rows,
				     positioned above them (chart-grid is position:relative, this
				     is absolutely placed and out of grid flow entirely, so it
				     can't disturb the label/track column layout). Drawing one
				     line here instead of one per row is what keeps it from
				     visibly "breaking" across the row gaps. -->
				<div
					class="chart-overlay"
					style="left:{LABEL_W + COL_GAP}px; top:{OVERLAY_TOP}px; height:{OVERLAY_HEIGHT}px"
				>
					{#if chartW > 0}
						<svg viewBox="0 0 {chartW} {OVERLAY_HEIGHT}" preserveAspectRatio="none">
							<g transform="translate({(-panX * zoom).toFixed(2)} 0) scale({zoom} 1)">
								{#if hoverX !== null}
									<line x1={hoverX} x2={hoverX} y1="0" y2={OVERLAY_HEIGHT} class="crosshair" />
								{/if}
								<line x1={playheadX} x2={playheadX} y1="0" y2={OVERLAY_HEIGHT} class="playhead" />
							</g>
						</svg>
					{/if}
				</div>
			</div>
		</div>
	</div>
	{/if}

	{#if hoverChannel && hoverTime !== null && hoverPrimaryValue !== null}
		<div class="hover-tooltip" class:flip={hoverPos.x > pbW - 200} style="left:{hoverPos.x}px; top:{hoverPos.y}px">
			<div class="hover-header">
				<span class="hover-title">{CHANNEL_LABEL[hoverChannel]} at</span>
				<span class="hover-time mono">{formatTime(hoverTime)}</span>
			</div>
			<div class="hover-divider"></div>
			<div class="hover-row">
				<span class="hover-dot" style="background:{primaryColor}"></span>
				<span class="hover-name">{primaryName}</span>
				<span class="hover-value mono">{formatChannelValue(hoverChannel, hoverPrimaryValue)}</span>
			</div>
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
	.playbar {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 56px;
		margin: 12px 14px 14px;
		padding: 0 18px;
	}

	.bar-row {
		flex: none;
		display: flex;
		align-items: center;
		height: 56px;
	}

	.frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: visible;
	}

	.frame-track {
		fill: none;
		stroke: var(--color-border-md);
		stroke-width: 1.25;
		opacity: 0.55;
	}

	.frame-progress {
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 2.75;
		stroke-linecap: round;
		filter: drop-shadow(0 0 3px color-mix(in srgb, var(--color-accent) 55%, transparent));
	}

	.frame-thumb {
		fill: var(--color-accent);
		filter: drop-shadow(0 0 3px color-mix(in srgb, var(--color-accent) 70%, transparent));
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.playbar:hover .frame-thumb,
	.playbar:focus-within .frame-thumb {
		opacity: 1;
	}

	/* Purely a drag surface for the top edge — all visuals come from .frame.
	   Sits below the clusters in stacking order so it never steals clicks
	   from the buttons where the hit-zone happens to overlap them. */
	.scrubber {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 20px;
		margin: 0;
		padding: 0;
		appearance: none;
		-webkit-appearance: none;
		background: transparent;
		cursor: pointer;
		outline: none;
		z-index: 1;
	}

	.scrubber::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		background: transparent;
		border: none;
	}

	.scrubber::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background: transparent;
		border: none;
	}

	.scrubber::-moz-range-track {
		background: transparent;
	}

	.cluster {
		position: relative;
		z-index: 2;
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

	.icon-btn.active {
		color: var(--color-accent);
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

	/* ---------- expanded telemetry graphs ---------- */

	.chart-panel {
		position: relative;
		z-index: 2;
		flex: none;
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.22s ease;
	}

	.chart-panel.open {
		/* header (~26px) + ruler (~16px) + 3 rows (40px + 8px gap each) + panel padding */
		max-height: 260px;
	}

	.chart-panel-inner {
		padding: 2px 0 16px;
		opacity: 0;
		transition: opacity 0.16s ease 0.02s;
	}

	.chart-panel.open .chart-panel-inner {
		opacity: 1;
	}

	.chart-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		color: var(--color-muted);
		margin-bottom: 10px;
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

	.chart-grid {
		position: relative;
		display: grid;
		grid-template-columns: 112px 1fr;
		column-gap: 14px;
		row-gap: 8px;
		align-items: center;
		cursor: ew-resize;
		user-select: none;
		touch-action: none;
	}

	.ruler-track {
		position: relative;
		height: 16px;
		align-self: end;
		overflow: hidden;
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

	/* Single overlay spanning all three chart rows for the playhead and hover
	   crosshair — see the template comment for why this replaced drawing
	   them once per row. Absolutely positioned and thus entirely outside
	   grid layout, so it can freely sit on top (z-index) without touching
	   the label/track column sizing. */
	.chart-overlay {
		position: absolute;
		right: 0;
		z-index: 5;
		pointer-events: none;
	}

	.chart-overlay svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.chart-overlay .playhead {
		stroke: var(--color-text);
		stroke-width: 1.25;
		opacity: 0.6;
		vector-effect: non-scaling-stroke;
	}

	.chart-overlay .crosshair {
		stroke: var(--color-accent);
		stroke-width: 1;
		stroke-dasharray: 2 2;
		opacity: 0.7;
		vector-effect: non-scaling-stroke;
	}

	/* ---------- hover tooltip ---------- */

	.hover-tooltip {
		/* Anchored to .playbar (position:relative, no overflow clipping) using
		   coordinates computed from playbarEl's own bounding rect — see
		   updateHover(). A position:fixed tooltip here would silently break
		   (wrong position, or clipped away) if any ancestor establishes its
		   own containing block, e.g. a hud-card style using backdrop-filter. */
		position: absolute;
		z-index: 20;
		transform: translate(14px, -110%);
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

	.hover-tooltip.flip {
		transform: translate(calc(-100% - 14px), -110%);
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