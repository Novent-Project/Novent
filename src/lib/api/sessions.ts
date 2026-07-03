import { request } from './client.js';
import type { Lap, Session } from './types.js';

export function fetchSessions(params: Record<string, string | number> = {}): Promise<Session[]> {
	return request<Session[]>('/v1/sessions', { query: params });
}

export function fetchSessionLaps(sessionId: string): Promise<Lap[]> {
	return request<Lap[]>(`/v1/sessions/${encodeURIComponent(sessionId)}/laps`);
}
