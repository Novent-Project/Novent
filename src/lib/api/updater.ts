import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface ReleaseInfo {
	tag_name: string;
	name: string;
	body: string;
	published_at: string;
	html_url: string;
}

export interface UpdateProgress {
	downloaded: number;
	total: number | null;
}

export function listReleases(): Promise<ReleaseInfo[]> {
	return invoke<ReleaseInfo[]>('list_releases');
}

export function downloadAndInstallUpdate(tag: string): Promise<void> {
	return invoke('download_and_install_update', { tag });
}

export function restartApp(): Promise<void> {
	return invoke('restart_app');
}

export function onUpdateProgress(cb: (p: UpdateProgress) => void): Promise<UnlistenFn> {
	return listen<UpdateProgress>('update-progress', e => cb(e.payload));
}

export function onUpdateLaunching(cb: () => void): Promise<UnlistenFn> {
	return listen('update-launching', () => cb());
}