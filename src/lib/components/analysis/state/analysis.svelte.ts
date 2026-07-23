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
	uuid?:      string;
	color?:     string;
}

export interface SectorRef {
	time:  string;
	delta: number;
	color: string;
}

export interface SectorRow {
	label: string;
	time:  string;
	refs:  SectorRef[];
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
	rpm:      number | string;
}

export interface CompEntry {
	uuid:         string;
	driver:       DriverTelemetry;
	ghostVisible: boolean;
}

const SEGMENTS    = 8;
const DRIVER_COLOR = '#10b981';

const COMP_COLORS = ['#e5e7eb', '#f59e0b', '#38bdf8', '#c084fc', '#fb7185', '#facc15'];
export const MAX_COMP_LAPS = COMP_COLORS.length;

function hasChannel(arr: number[]): boolean {
	return arr.some(v => v !== 0);
}

function buildDriverTelemetry(
	name: string, color: string, lapNum: number, lapTime: string, sample: Sample,
	hasGear: boolean, hasRpm: boolean,
): DriverTelemetry {
	return {
		name, color, stint: 1, lap: lapNum, lapTime,
		throttle: sample.throttle,
		brake:    sample.brake,
		speed:    sample.speed,
		gear:     hasGear ? gearLabel(sample.gear) : '—',
		rpm:      hasRpm ? sample.rpm : '—',
	};
}

export class AnalysisState {
	readonly segments = SEGMENTS;

	selectedLap     = $state<Lap | null>(null);
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
	playMode      = $state<PlayMode>('time');

	#exactIdx = 0;
	#rafId    = 0;
	#token    = 0;

	#compIdxHints = new Map<string, number>();
	#resumeOnActivate = false;
	#resumeAfterScrub = false;

	constructor(private readonly data: DataState) {}

	curNorm        = $derived(this.currentTrace.normPos[this.playbackIdx] ?? 0);
	lapLen         = $derived(lapLength(this.currentTrace));
	primarySample  = $derived(sampleAt(this.currentTrace, this.playbackIdx));
	driverName     = $derived(this.selectedLap?.player_name || 'You');
	currentSegment = $derived(segmentIndex(this.curNorm, SEGMENTS));

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

	primaryHasGear = $derived(hasChannel(this.currentTrace.gear));
	primaryHasRpm  = $derived(hasChannel(this.currentTrace.rpm));

	primaryDriver = $derived.by((): DriverTelemetry =>
		buildDriverTelemetry(
			this.driverName,
			DRIVER_COLOR,
			this.selectedLap?.completed_laps ?? 1,
			this.selectedLap?.lap_time ?? '—',
			this.primarySample,
			this.primaryHasGear,
			this.primaryHasRpm,
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
					hasChannel(c.trace.gear),
					hasChannel(c.trace.rpm),
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
		const durs = sectorDurations(this.dsTrace);
		const refs = this.compLaps.map(c => ({ durs: sectorDurations(c.ds), color: c.color }));
		return [0, 1, 2].map(i => ({
			label: `S${i + 1}`,
			time:  formatSector(durs[i]),
			refs:  refs.map(r => ({
				time:  formatSector(r.durs[i]),
				delta: r.durs[i] - durs[i],
				color: r.color,
			})),
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

	seek(t: number) {
		const clamped = Math.max(0, Math.min(this.resolvedLapTime, t));
		const idx     = traceIndexAtTime(this.currentTrace.time, clamped);
		this.playbackIdx = Math.max(0, idx);
		this.#exactIdx   = this.playbackIdx;
		this.currentTime = this.currentTrace.time[this.playbackIdx] ?? 0;
	}

	seekNorm(f: number) {
		const norm = this.currentTrace.normPos;
		if (!norm.length) return;
		const target = Math.max(0, Math.min(1, f));
		let lo = 0, hi = norm.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if ((norm[mid] ?? 0) >= target) hi = mid;
			else lo = mid + 1;
		}
		this.playbackIdx = lo;
		this.#exactIdx   = lo;
		this.currentTime = this.currentTrace.time[lo] ?? 0;
	}

	get currentNorm(): number {
		return this.currentTrace.normPos[this.playbackIdx] ?? 0;
	}

	beginScrub() {
		if (this.isPlaying) {
			this.#resumeAfterScrub = true;
			this.stopPlayback();
		}
	}

	endScrub() {
		if (this.#resumeAfterScrub) {
			this.#resumeAfterScrub = false;
			this.startPlayback();
		}
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
