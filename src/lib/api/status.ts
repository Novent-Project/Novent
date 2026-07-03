import { request } from './client.js';
import type { BackendStatus } from './types.js';

export function fetchStatus(): Promise<BackendStatus> {
	return request<BackendStatus>('/status');
}
