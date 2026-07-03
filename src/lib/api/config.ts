import { request, requestOk } from './client.js';
import type { GameConfig } from './types.js';

export function fetchConfig(): Promise<GameConfig> {
	return request<GameConfig>('/config');
}

export function saveConfig(games: Record<string, string>): Promise<boolean> {
	return requestOk('/config/games', { method: 'POST', body: { games } });
}
