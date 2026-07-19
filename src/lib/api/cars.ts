import { tryRequestBinary } from './client.js';

export function fetchCarModel(game: string, car: string): Promise<ArrayBuffer | null> {
	const seg = [game, car].map(encodeURIComponent).join('/');
	return tryRequestBinary(`/cars/${seg}/model`);
}
