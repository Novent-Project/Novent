import { prefs, type GraphPlacement } from '$lib/state/prefs.svelte';

export type View = 'sessions' | 'telemetry';
export type { GraphPlacement };

export class UiState {
	view = $state<View>('sessions');

	get traceZoom(): number {
		return prefs.traceZoom;
	}

	set traceZoom(value: number) {
		prefs.traceZoom = value;
	}

	get graphPlacement(): GraphPlacement {
		return prefs.graphPlacement;
	}

	set graphPlacement(value: GraphPlacement) {
		prefs.graphPlacement = value;
	}

	showSessions() {
		this.view = 'sessions';
	}

	showTelemetry() {
		this.view = 'telemetry';
	}
}
