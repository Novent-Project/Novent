import { fetchLaps, fetchStatus, fetchConfig, type Lap, type DetectionState } from '$lib/api';

const LAP_POLL_MS    = 3000;
const STATUS_POLL_MS = 2000;
const INIT_RETRIES   = 15;

export const APP_ZOOM_MIN     = 0.5;
export const APP_ZOOM_MAX     = 2.0;
export const APP_ZOOM_STEP    = 0.1;
export const APP_ZOOM_DEFAULT = 1;

const APP_ZOOM_STORAGE_KEY = 'novent:app-zoom';
const APP_ZOOM_AUTO_KEY    = 'novent:app-zoom-auto';

function computeMonitorZoom(): number {
	if (typeof window === 'undefined' || !window.screen?.width) return APP_ZOOM_DEFAULT;
	return clampAppZoom(Math.min(window.screen.width / 1920, window.screen.height / 1080));
}

function loadStoredAppZoom(): number {
	if (typeof localStorage === 'undefined') return APP_ZOOM_DEFAULT;
	try {
		const raw = localStorage.getItem(APP_ZOOM_STORAGE_KEY);
		const n = raw !== null ? parseFloat(raw) : NaN;
		return Number.isFinite(n) ? clampAppZoom(n) : APP_ZOOM_DEFAULT;
	} catch {
		return APP_ZOOM_DEFAULT;
	}
}

function loadStoredAppZoomAuto(): boolean {
	if (typeof localStorage === 'undefined') return true;
	try {
		const raw = localStorage.getItem(APP_ZOOM_AUTO_KEY);
		if (raw !== null) return raw === 'true';
		return localStorage.getItem(APP_ZOOM_STORAGE_KEY) === null;
	} catch {
		return true;
	}
}

function clampAppZoom(value: number): number {
	return Math.min(APP_ZOOM_MAX, Math.max(APP_ZOOM_MIN, Math.round(value * 10) / 10));
}

export class DataState {
	laps      = $state<Lap[]>([]);
	connected = $state(false);
	game      = $state<string | null>(null);
	session   = $state<string | null>(null);
	gamePaths = $state<Record<string, string>>({ AC: '', ACC: '', iRacing: '', LMU: '' });
	favorites = $state<Set<string>>(new Set());
	loaded    = $state(false);

	#appZoom     = $state(loadStoredAppZoom());
	#appZoomAuto = $state(loadStoredAppZoomAuto());
	#monitorZoom = $state(computeMonitorZoom());

	get appZoom(): number {
		return this.#appZoomAuto ? this.#monitorZoom : this.#appZoom;
	}

	set appZoom(value: number) {
		if (this.#appZoomAuto) this.appZoomAuto = false;
		this.#appZoom = clampAppZoom(value);
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(APP_ZOOM_STORAGE_KEY, String(this.#appZoom));
		} catch {
		}
	}

	get appZoomAuto(): boolean {
		return this.#appZoomAuto;
	}

	set appZoomAuto(value: boolean) {
		if (!value && this.#appZoomAuto) this.#appZoom = this.#monitorZoom;
		this.#appZoomAuto = value;
		if (value) this.#monitorZoom = computeMonitorZoom();
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(APP_ZOOM_AUTO_KEY, String(value));
			localStorage.setItem(APP_ZOOM_STORAGE_KEY, String(this.#appZoom));
		} catch {
		}
	}

	refreshMonitorZoom() {
		this.#monitorZoom = computeMonitorZoom();
	}

	detection: DetectionState = $derived(
		!this.connected || !this.game
			? { status: 'idle' }
			: this.session
				? { status: 'active', game: this.game, session: this.session }
				: { status: 'detected', game: this.game }
	);

	#lapTimer:    ReturnType<typeof setInterval> | null = null;
	#statusTimer: ReturnType<typeof setInterval> | null = null;

	lapById(uuid: string): Lap | undefined {
		return this.laps.find(l => l.uuid === uuid);
	}

	isFavorite(uuid: string): boolean {
		return this.favorites.has(uuid);
	}

	toggleFavorite(uuid: string) {
		const next = new Set(this.favorites);
		next.has(uuid) ? next.delete(uuid) : next.add(uuid);
		this.favorites = next;
	}

	async start() {
		this.#loadConfig();
		this.#pollStatus();
		this.#statusTimer = setInterval(() => this.#pollStatus(), STATUS_POLL_MS);

		for (let i = 0; i < INIT_RETRIES; i++) {
			if (await this.#pollLaps()) break;
			await new Promise<void>(resolve => setTimeout(resolve, 1000));
		}
		this.loaded = true;
		this.#lapTimer = setInterval(() => this.#pollLaps(), LAP_POLL_MS);
	}

	destroy() {
		if (this.#lapTimer)    clearInterval(this.#lapTimer);
		if (this.#statusTimer) clearInterval(this.#statusTimer);
	}

	async #pollLaps(): Promise<boolean> {
		try {
			this.laps = await fetchLaps();
			return true;
		} catch {
			return false;
		}
	}

	async #pollStatus() {
		try {
			const s = await fetchStatus();
			this.connected = s.connected;
			this.game      = s.game;
			this.session   = s.session ?? null;
		} catch {
			this.connected = false;
			this.game      = null;
			this.session   = null;
		}
	}

	async #loadConfig() {
		try {
			const cfg = await fetchConfig();
			this.gamePaths = cfg.games ?? this.gamePaths;
		} catch {
		}
	}
}
