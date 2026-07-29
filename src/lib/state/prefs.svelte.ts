export type GraphPlacement = 'bottom' | 'side';

const GRAPH_PLACEMENT_KEY = 'novent:graph-placement';
const HIDDEN_WIDGETS_KEY  = 'novent:hidden-widgets';
const FLIP_SIDE_KEY       = 'novent:flip-side';

function loadGraphPlacement(): GraphPlacement {
	if (typeof localStorage === 'undefined') return 'bottom';
	try {
		return localStorage.getItem(GRAPH_PLACEMENT_KEY) === 'side' ? 'side' : 'bottom';
	} catch {
		return 'bottom';
	}
}

function loadFlipSide(): boolean {
	if (typeof localStorage === 'undefined') return false;
	try {
		return localStorage.getItem(FLIP_SIDE_KEY) === '1';
	} catch {
		return false;
	}
}

function loadHiddenWidgets(): string[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const parsed = JSON.parse(localStorage.getItem(HIDDEN_WIDGETS_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
	} catch {
		return [];
	}
}

class PrefsState {
	settingsOpen = $state(false);
	traceZoom    = $state(2);

	#graphPlacement = $state<GraphPlacement>(loadGraphPlacement());
	#hiddenWidgets  = $state<string[]>(loadHiddenWidgets());
	#flipSide       = $state<boolean>(loadFlipSide());

	get flipSide(): boolean {
		return this.#flipSide;
	}

	set flipSide(value: boolean) {
		this.#flipSide = value;
		try {
			localStorage.setItem(FLIP_SIDE_KEY, value ? '1' : '0');
		} catch {
		}
	}

	get graphPlacement(): GraphPlacement {
		return this.#graphPlacement;
	}

	set graphPlacement(value: GraphPlacement) {
		this.#graphPlacement = value;
		try {
			localStorage.setItem(GRAPH_PLACEMENT_KEY, value);
		} catch {
		}
	}

	widgetVisible(key: string): boolean {
		return !this.#hiddenWidgets.includes(key);
	}

	setWidgetVisible(key: string, visible: boolean) {
		this.#hiddenWidgets = visible
			? this.#hiddenWidgets.filter((k) => k !== key)
			: [...new Set([...this.#hiddenWidgets, key])];
		try {
			localStorage.setItem(HIDDEN_WIDGETS_KEY, JSON.stringify(this.#hiddenWidgets));
		} catch {
		}
	}

	showAllWidgets() {
		this.#hiddenWidgets = [];
		try {
			localStorage.removeItem(HIDDEN_WIDGETS_KEY);
		} catch {
		}
	}
}

export const prefs = new PrefsState();
