import { invoke } from '@tauri-apps/api/core';

export interface OsInfo {
	platform: string;
	is_windows: boolean;
}

export function getOsInfo(): Promise<OsInfo> {
	return invoke<OsInfo>('get_os_info');
}

export function quitApp(): Promise<void> {
	return invoke('quit');
}