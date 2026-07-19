import { AnalysisState } from './analysis.svelte.js';
import { MapView } from './mapview.svelte.js';
import { formatName } from '$lib/utils';
import type { DataState } from '$lib/state/data.svelte.js';
import type { Lap } from '$lib/api';

export interface SessionTab {
	readonly id:       string;
	readonly label:    string;
	readonly loading:  boolean;
	readonly analysis: AnalysisState;
	readonly map:      MapView;
}

const STORAGE_KEY = 'analysis:tabs';

interface PersistedTabs {
	openIds:  string[];
	activeId: string | null;
}

function loadPersisted(): PersistedTabs {
	try {
		localStorage.removeItem(STORAGE_KEY);
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return { openIds: [], activeId: null };
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed.openIds)) return { openIds: [], activeId: null };
		return { openIds: parsed.openIds, activeId: parsed.activeId ?? null };
	} catch {
		return { openIds: [], activeId: null };
	}
}

export class TabsState {
	tabs     = $state<SessionTab[]>([]);
	activeId = $state<string | null>(null);

	constructor(private readonly data: DataState) {}

	get active(): SessionTab | null {
		return this.tabs.find(t => t.id === this.activeId) ?? null;
	}

	async restore() {
		const { openIds, activeId } = loadPersisted();
		for (const uuid of openIds) {
			const lap = this.data.lapById(uuid);
			if (!lap) continue;
			await this.#openInternal(lap, false);
		}
		this.activeId = (activeId && this.tabs.some(t => t.id === activeId))
			? activeId
			: (this.tabs[0]?.id ?? null);
		this.#persist();
	}

	async open(lap: Lap) {
		const existing = this.tabs.find(t => t.id === lap.uuid);
		if (existing) {
			this.activeId = existing.id;
			this.#persist();
			return;
		}
		await this.#openInternal(lap, true);
		this.#persist();
	}

	select(id: string) {
		if (!this.tabs.some(t => t.id === id)) return;
		this.activeId = id;
		this.#persist();
	}

	close(id: string) {
		const idx = this.tabs.findIndex(t => t.id === id);
		if (idx === -1) return;
		const removed = this.tabs[idx];
		this.tabs = this.tabs.filter(t => t.id !== id);
		removed.analysis.destroy();
		removed.map.destroy();

		if (this.activeId === id) {
			const fallback = this.tabs[idx] ?? this.tabs[idx - 1] ?? null;
			this.activeId  = fallback ? fallback.id : null;
		}
		this.#persist();
	}

	destroy() {
		this.tabs.forEach(t => {
			t.analysis.destroy();
			t.map.destroy();
		});
	}

	async #openInternal(lap: Lap, activate: boolean) {
		const analysis = new AnalysisState(this.data);
		const map      = new MapView();
		const id       = lap.uuid;
		const tab: SessionTab = {
			id,
			label:   `${formatName(lap.car)} | ${formatName(lap.track)}`,
			loading: true,
			analysis,
			map,
		};

		this.tabs = [...this.tabs, tab];
		if (activate) this.activeId = id;

		await analysis.selectLap(lap);

		this.tabs = this.tabs.map(t => (t.id === id ? { ...t, loading: false } : t));
	}

	#persist() {
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
				openIds:  this.tabs.map(t => t.id),
				activeId: this.activeId,
			}));
		} catch {
		}
	}
}
