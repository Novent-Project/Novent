export type GraphPlacement = 'bottom' | 'side';

const GRAPH_PLACEMENT_KEY = 'novent:graph-placement';

function loadGraphPlacement(): GraphPlacement {
	if (typeof localStorage === 'undefined') return 'bottom';
	try {
		return localStorage.getItem(GRAPH_PLACEMENT_KEY) === 'side' ? 'side' : 'bottom';
	} catch {
		return 'bottom';
	}
}

class PrefsState {
	settingsOpen = $state(false);
	traceZoom    = $state(2);

	#graphPlacement = $state<GraphPlacement>(loadGraphPlacement());

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
}

export const prefs = new PrefsState();
