import { API_BASE, tryRequestBinary } from './client.js';

export function fetchCarModel(game: string, car: string): Promise<ArrayBuffer | null> {
	const seg = [game, car].map(encodeURIComponent).join('/');
	return tryRequestBinary(`/cars/${seg}/model`);
}

export function carPreviewUrl(game: string, car: string): string {
	const seg = [game, car].map(encodeURIComponent).join('/');
	return `${API_BASE}/cars/${seg}/preview`;
}
