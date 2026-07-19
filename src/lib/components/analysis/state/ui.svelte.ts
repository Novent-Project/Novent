export type View = 'sessions' | 'telemetry';
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

export class UiState {
	view         = $state<View>('sessions');
	traceZoom    = $state(2);
	showSettings = $state(false);

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

	showSessions() {
		this.view = 'sessions';
	}

	showTelemetry() {
		this.view = 'telemetry';
	}

	openSettings() {
		this.showSettings = true;
	}

	closeSettings() {
		this.showSettings = false;
	}
}
