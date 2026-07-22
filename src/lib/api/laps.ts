import { request, tryRequest } from './client.js';
import type { Lap, Telemetry, TrackBoundaries } from './types.js';

export function fetchLaps(): Promise<Lap[]> {
	return request<Lap[]>('/laps');
}

export function fetchTelemetry(uuid: string): Promise<Telemetry> {
	return request<Telemetry>(`/laps/${encodeURIComponent(uuid)}/telemetry`);
}

export function setLapFavorite(uuid: string, favorite: boolean): Promise<{ uuid: string; favorite: boolean }> {
	return request(`/laps/${encodeURIComponent(uuid)}/favorite`, { method: 'PATCH', body: { favorite } });
}

export function fetchBoundaries(simId: string, trackId: string, uuid: string, layout = ''): Promise<TrackBoundaries | null> {
	const seg = [simId, trackId, uuid].map(encodeURIComponent).join('/');
	const qs  = layout ? `?layout=${encodeURIComponent(layout)}` : '';
	return tryRequest<TrackBoundaries>(`/boundaries/${seg}${qs}`);
}
