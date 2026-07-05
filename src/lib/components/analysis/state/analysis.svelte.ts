import { fetchTelemetry, fetchBoundaries, type Lap, type TrackBoundaries } from '$lib/api';
import { downsample, type Trace, type DownsampledTrace } from '$lib/utils/canvas/shared';
import { smoothBoundary } from '$lib/utils/canvas/map';
import {
	EMPTY_TRACE, makeTrace, sampleAt, lapLength, traceIndexAtTime,
	sectorDurations, segmentIndex, segmentDelta, liveDelta,
	parseLapTime, formatTime, formatSector, gearLabel, type Sample,
} from '$lib/utils';
import type { DataState } from '$lib/state/data.svelte.js';

export interface CompLap {
	lap:          Lap;
	trace:        Trace;
	ds:           DownsampledTrace;
	color:        string;
	lapTime:      number;
	ghostVisible: boolean;
}

export type PlayMode = 'time' | 'distance';

export interface Standing {
	pos:        number;
	name:       string;
	time:       string;
	gap?:       string;
	isPrimary?: boolean;
	/** Comparison-lap uuid, present on non-primary rows so the leaderboard can remove them. */
	uuid?:      string;
	/** Ghost color for this row, mirrored on the map and telemetry widget. */
	color?:     string;
}

export interface SectorRow {
	label:  string;
	time:   string;
	ref?:   string;
	delta?: number;
}

export interface DriverTelemetry {
	name:     string;
	color:    string;
	stint:    number;
	lap:      number;
	lapTime:  string;
	throttle: number;
	brake:    number;
	speed:    number;
	gear:     number | string;
	rpm:      number;
}

/** A comparison lap's live telemetry, paired with the identity needed to
 *  toggle/remove it — what TelemetryView actually renders per widget. */
export interface CompEntry {
	uuid:         string;
	driver:       DriverTelemetry;
	ghostVisible: boolean;
}

const SEGMENTS    = 8;
const DRIVER_COLOR = '#10b981';

// One color per comparison slot, cycled if more comparisons are added than
// colors — distinguishes ghosts on the map and their telemetry widgets.
const COMP_COLORS = ['#e5e7eb', '#f59e0b', '#38bdf8', '#c084fc', '#fb7185', '#facc15'];
export const MAX_COMP_LAPS = COMP_COLORS.length;

function buildDriverTelemetry(
	name: string, color: string, lapNum: number, lapTime: string, sample: Sample,
): DriverTelemetry {
	return {
		name, color, stint: 1, lap: lapNum, lapTime,
		throttle: sample.throttle,
		brake:    sample.brake,
		speed:    sample.speed,
		gear:     gearLabel(sample.gear),
		rpm:      sample.rpm,
	};
}

export class AnalysisState {
	readonly segments = SEGMENTS;

	selectedLap     = $state<Lap | null>(null);
	// $state.raw: these hold large sample arrays that hot paths (canvas
	// drawing, per-frame index lookups) iterate — a deep proxy would put a
	// trap on every element read. All updates already replace the value
	// wholesale rather than mutating in place.
	compLaps        = $state.raw<CompLap[]>([]);
	currentTrace    = $state.raw<Trace>(EMPTY_TRACE);
	dsTrace         = $state.raw<DownsampledTrace | null>(null);
	boundaries      = $state.raw<TrackBoundaries | null>(null);
	resolvedLapTime = $state(0);
	fitKey          = $state(0);

	isPlaying     = $state(false);
	playbackSpeed = $state(1);
	currentTime   = $state(0);
	playbackIdx   = $state(0);
	playMode      = $state<PlayMode>('distance');

	#exactIdx = 0;
	#rafId    = 0;
	#token    = 0;

	/** Last known ghost index per comparison uuid — the `hint` that keeps
	 *  traceIndexAtTime amortized O(1) during playback. Correctness never
	 *  depends on it (a stale hint just means a binary-search fallback). */
	#compIdxHints = new Map<string, number>();
	#resumeOnActivate = false;

	constructor(private readonly data: DataState) {}

	// ---------- derived ----------
	curNorm        = $derived(this.currentTrace.normPos[this.playbackIdx] ?? 0);
	lapLen         = $derived(lapLength(this.currentTrace));
	primarySample  = $derived(sampleAt(this.currentTrace, this.playbackIdx));
	driverName     = $derived(this.selectedLap?.player_name || 'You');
	currentSegment = $derived(segmentIndex(this.curNorm, SEGMENTS));

	/** Each comparison lap's sample index at the current playback time (-1 if
	 *  it has no samples). Computed once per frame here and shared by every
	 *  consumer (compSample, compEntries, the map's ghost dots) instead of
	 *  each doing its own lookup. */
	compIndices = $derived.by(() =>
		this.compLaps.map(c => {
			if (!c.trace.time.length) return -1;
			const idx = traceIndexAtTime(c.trace.time, this.currentTime, this.#compIdxHints.get(c.lap.uuid) ?? 0);
			this.#compIdxHints.set(c.lap.uuid, idx);
			return idx;
		})
	);

	compIdxNow = $derived(this.compIndices[0] ?? -1);

	compSample = $derived.by((): Sample | null => {
		const c = this.compLaps[0];
		return c && this.compIdxNow >= 0 ? sampleAt(c.trace, this.compIdxNow) : null;
	});

	primaryDriver = $derived.by((): DriverTelemetry =>
		buildDriverTelemetry(
			this.driverName,
			DRIVER_COLOR,
			this.selectedLap?.completed_laps ?? 1,
			this.selectedLap?.lap_time ?? '—',
			this.primarySample,
		)
	);

	compEntries = $derived.by((): CompEntry[] =>
		this.compLaps.map((c, i) => {
			const idx = this.compIndices[i] ?? -1;
			const sample: Sample = idx >= 0
				? sampleAt(c.trace, idx)
				: { throttle: 0, brake: 0, speed: 0, gear: 0, rpm: 0 };
			return {
				uuid:         c.lap.uuid,
				ghostVisible: c.ghostVisible,
				driver: buildDriverTelemetry(
					c.lap.player_name || `Reference ${i + 1}`,
					c.color,
					c.lap.completed_laps ?? 1,
					c.lap.lap_time ?? '—',
					sample,
				),
			};
		})
	);

	segDelta = $derived.by(() => {
		const ref = this.compLaps[0]?.ds;
		return this.dsTrace && ref ? segmentDelta(this.dsTrace, ref, this.currentSegment, SEGMENTS) : 0;
	});

	liveDeltaValue = $derived.by(() => {
		const ref = this.compLaps[0]?.ds;
		return this.dsTrace && ref ? liveDelta(this.dsTrace, ref, this.curNorm) : 0;
	});

	distanceGap = $derived.by(() => {
		const c = this.compLaps[0];
		if (!c || this.compIdxNow < 0) return 0;
		const compNorm = c.trace.normPos[this.compIdxNow] ?? 0;
		return (this.curNorm - compNorm) * this.lapLen;
	});

	standings = $derived.by((): Standing[] => {
		const rows: Standing[] = [
			{ pos: 1, name: this.driverName, time: formatTime(this.resolvedLapTime), isPrimary: true },
		];
		this.compLaps.forEach((c, i) => {
			const showGap = c.lapTime > 0 && this.resolvedLapTime > 0;
			const gap     = c.lapTime - this.resolvedLapTime;
			rows.push({
				pos:  2 + i,
				name: `Reference ${i + 1}`,
				time: formatTime(c.lapTime),
				gap:  showGap ? `${gap >= 0 ? '+' : ''}${gap.toFixed(3)}` : undefined,
				uuid:  c.lap.uuid,
				color: c.color,
			});
		});
		return rows;
	});

	sectors = $derived.by((): SectorRow[] => {
		if (!this.dsTrace) return [];
		const durs    = sectorDurations(this.dsTrace);
		const ref     = this.compLaps[0]?.ds;
		const refDurs = ref ? sectorDurations(ref) : null;
		return [0, 1, 2].map(i => ({
			label: `S${i + 1}`,
			time:  formatSector(durs[i]),
			ref:   refDurs ? formatSector(refDurs[i]) : undefined,
			delta: refDurs ? durs[i] - refDurs[i] : undefined,
		}));
	});

	compCandidates = $derived.by(() =>
		this.data.laps.filter(l =>
			l.uuid !== this.selectedLap?.uuid &&
			!this.compLaps.some(c => c.lap.uuid === l.uuid) &&
			(!this.selectedLap || (
				l.track === this.selectedLap.track &&
				(l.layout ?? '') === (this.selectedLap.layout ?? '')
			))
		)
	);

	// ---------- lap selection ----------
	async selectLap(lap: Lap) {
		const token = ++this.#token;
		this.stopPlayback();
		this.selectedLap = lap;
		this.compLaps    = [];
		this.#compIdxHints.clear();
		this.fitKey++;

		const lapTimeSec = parseLapTime(lap.lap_time || lap.time || '');
		const data       = await fetchTelemetry(lap.uuid);
		if (token !== this.#token) return;

		const trace    = makeTrace(data);
		const fallback = trace.time.length ? (trace.time[trace.time.length - 1] ?? 0) : 0;
		this.currentTrace    = trace;
		this.dsTrace         = downsample(trace, lapTimeSec);
		this.resolvedLapTime = lapTimeSec > 0 ? lapTimeSec : fallback;
		this.playbackIdx     = 0;
		this.currentTime     = 0;
		this.#exactIdx       = 0;

		const fetched = await fetchBoundaries(lap.game || 'ACC', lap.track, lap.uuid, lap.layout ?? '');
		if (token !== this.#token) return;
		this.boundaries = fetched
			? { inner: smoothBoundary(fetched.inner), outer: smoothBoundary(fetched.outer) }
			: null;

		if (this.currentTrace.normPos.length > 0) this.startPlayback();
	}

	async addCompLap(lap: Lap) {
		if (this.compLaps.length >= MAX_COMP_LAPS || this.selectedLap?.uuid === lap.uuid) return;
		if (this.compLaps.some(c => c.lap.uuid === lap.uuid)) return;
		const trace      = makeTrace(await fetchTelemetry(lap.uuid));
		const lapTimeSec = parseLapTime(lap.lap_time || lap.time || '');
		const ds         = downsample(trace, lapTimeSec);
		if (!ds) return;
		const color = COMP_COLORS[this.compLaps.length % COMP_COLORS.length];
		this.compLaps = [...this.compLaps, { lap, trace, ds, color, lapTime: lapTimeSec, ghostVisible: true }];
	}

	removeCompLap(uuid: string) {
		this.compLaps = this.compLaps.filter(c => c.lap.uuid !== uuid);
		this.#compIdxHints.delete(uuid);
	}

	toggleGhost(uuid: string) {
		this.compLaps = this.compLaps.map(c =>
			c.lap.uuid === uuid ? { ...c, ghostVisible: !c.ghostVisible } : c
		);
	}

	clear() {
		this.stopPlayback();
		this.selectedLap = null;
		this.compLaps    = [];
		this.#compIdxHints.clear();
	}

	// ---------- tab visibility ----------
	/** Pause the playback loop while this state's tab is in the background —
	 *  nothing renders it, so the rAF loop would just burn frames. Remembers
	 *  whether playback was running so activate() can pick it back up. */
	deactivate() {
		if (this.isPlaying) this.#resumeOnActivate = true;
		this.stopPlayback();
	}

	activate() {
		if (this.#resumeOnActivate) {
			this.#resumeOnActivate = false;
			this.startPlayback();
		}
	}

	// ---------- playback ----------
	seek(t: number) {
		const clamped = Math.max(0, Math.min(this.resolvedLapTime, t));
		const idx     = traceIndexAtTime(this.currentTrace.time, clamped);
		this.playbackIdx = Math.max(0, idx);
		this.#exactIdx   = this.playbackIdx;
		this.currentTime = this.currentTrace.time[this.playbackIdx] ?? 0;
	}

	startPlayback() {
		if (this.isPlaying) this.stopPlayback();
		if (!this.currentTrace.gas.length || this.resolvedLapTime <= 0) return;
		this.isPlaying = true;
		this.#exactIdx = this.playbackIdx;

		const total = this.currentTrace.gas.length;
		const pps   = total / this.resolvedLapTime;
		let last: number | null = null;

		const tick = (ts: number) => {
			if (!this.isPlaying) return;
			if (last === null) { last = ts; this.#rafId = requestAnimationFrame(tick); return; }
			const dt = Math.min((ts - last) / 1000, 0.1);
			last = ts;
			this.#exactIdx = Math.min(this.#exactIdx + pps * dt * this.playbackSpeed, total - 1);
			if (this.#exactIdx >= total - 1) {
				this.#exactIdx   = total - 1;
				this.playbackIdx = total - 1;
				this.currentTime = this.currentTrace.time[total - 1] ?? this.resolvedLapTime;
				this.stopPlayback();
				return;
			}
			this.playbackIdx = Math.floor(this.#exactIdx);
			this.currentTime = this.currentTrace.time[this.playbackIdx] ?? 0;
			this.#rafId = requestAnimationFrame(tick);
		};
		this.#rafId = requestAnimationFrame(tick);
	}

	stopPlayback() {
		cancelAnimationFrame(this.#rafId);
		this.isPlaying = false;
	}

	togglePlayback() {
		this.isPlaying ? this.stopPlayback() : this.startPlayback();
	}

	setPlayMode(mode: PlayMode) {
		this.playMode = mode;
	}

	destroy() {
		this.stopPlayback();
	}
}