import { tryRequest } from './client';

export interface BackendInfo {
	version: string;
	buildType?: string;
	buildTime?: number;
}

/**
 * TODO: backend doesn't expose a /status or /about endpoint yet.
 * Silently returns null until that lands.
 */
export async function getBackendInfo(): Promise<BackendInfo | null> {
	return tryRequest<BackendInfo>('/status');
}