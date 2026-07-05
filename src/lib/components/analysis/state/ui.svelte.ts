export type View = 'sessions' | 'telemetry';

export class UiState {
	view         = $state<View>('sessions');
	traceZoom    = $state(2);
	showSettings = $state(false);

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
