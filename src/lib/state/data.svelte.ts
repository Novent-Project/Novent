import { fetchLaps, fetchStatus, fetchConfig, type Lap, type DetectionState } from '$lib/api';

const LAP_POLL_MS    = 3000;
const STATUS_POLL_MS = 2000;
const INIT_RETRIES   = 15;

export class DataState {
	laps      = $state<Lap[]>([]);
	connected = $state(false);
	game      = $state<string | null>(null);
	// Not populated by the backend yet — see BackendStatus.session in api/types.ts.
	session   = $state<string | null>(null);
	gamePaths = $state<Record<string, string>>({ AC: '', ACC: '', iRacing: '', LMU: '' });
	favorites = $state<Set<string>>(new Set());
	loaded    = $state(false);

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
			/* keep defaults offline */
		}
	}
}