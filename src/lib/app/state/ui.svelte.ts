export type View = 'sessions' | 'telemetry';

const ZOOM_STEP = 0.1;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 2;

export class UiState {
	view         = $state<View>('sessions');
	appZoom      = $state(1);
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

	zoomBy(delta: number) {
		this.appZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((this.appZoom + delta) * 10) / 10));
	}

	resetZoom() {
		this.appZoom = 1;
	}

	handleKeydown = (e: KeyboardEvent) => {
		if (!e.ctrlKey && !e.metaKey) return;
		if (e.key === '=' || e.key === '+') { e.preventDefault(); this.zoomBy(ZOOM_STEP); }
		else if (e.key === '-')             { e.preventDefault(); this.zoomBy(-ZOOM_STEP); }
		else if (e.key === '0')             { e.preventDefault(); this.resetZoom(); }
	};
}
