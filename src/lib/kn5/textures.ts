import * as THREE from 'three';
import { DDSLoader } from 'three/addons/loaders/DDSLoader.js';

const ddsLoader = new DDSLoader();

function isDds(data: ArrayBuffer): boolean {
	if (data.byteLength < 4) return false;
	const h = new Uint8Array(data, 0, 4);
	return h[0] === 0x44 && h[1] === 0x44 && h[2] === 0x53 && h[3] === 0x20;
}

function decodeUncompressedDds(data: ArrayBuffer): THREE.DataTexture | null {
	const dv = new DataView(data);
	const pfFlags = dv.getUint32(80, true);
	if (pfFlags & 0x4) return null;
	const height = dv.getUint32(12, true);
	const width = dv.getUint32(16, true);
	const bitCount = dv.getUint32(88, true);
	const bytesPP = bitCount >> 3;
	if (!width || !height || bytesPP < 1 || bytesPP > 4) return null;
	if (data.byteLength < 128 + width * height * bytesPP) return null;
	const chan = [92, 96, 100, 104].map((o) => {
		const mask = dv.getUint32(o, true);
		if (!mask) return null;
		let shift = 0;
		while (!((mask >>> shift) & 1)) shift++;
		let bits = 0;
		while ((mask >>> (shift + bits)) & 1) bits++;
		return { shift, max: (1 << bits) - 1 };
	});
	const src = new Uint8Array(data, 128, width * height * bytesPP);
	const out = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		let px = 0;
		for (let b = 0; b < bytesPP; b++) px |= src[i * bytesPP + b] << (8 * b);
		const read = (c: { shift: number; max: number } | null, fallback: number) =>
			c ? Math.round((((px >>> c.shift) & c.max) * 255) / c.max) : fallback;
		const r = read(chan[0], 0);
		out[i * 4] = r;
		out[i * 4 + 1] = read(chan[1], r);
		out[i * 4 + 2] = read(chan[2], r);
		out[i * 4 + 3] = read(chan[3], 255);
	}
	const tex = new THREE.DataTexture(out, width, height, THREE.RGBAFormat);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.generateMipmaps = true;
	tex.minFilter = THREE.LinearMipmapLinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.needsUpdate = true;
	return tex;
}
export async function decodeTexture(data: ArrayBuffer): Promise<THREE.Texture | null> {
	if (isDds(data)) {
		const plain = decodeUncompressedDds(data);
		if (plain) return plain;
		try {
			const parsed = ddsLoader.parse(data, true);
			if (!parsed || parsed.format === undefined || !parsed.mipmaps?.length) return null;
			const tex = new THREE.CompressedTexture(
				parsed.mipmaps as unknown as THREE.CompressedTextureMipmap[],
				parsed.width,
				parsed.height,
				parsed.format as THREE.CompressedPixelFormat
			);
			tex.minFilter = parsed.mipmapCount > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
			tex.magFilter = THREE.LinearFilter;
			tex.wrapS = THREE.RepeatWrapping;
			tex.wrapT = THREE.RepeatWrapping;
			tex.needsUpdate = true;
			return tex;
		} catch {
			return null;
		}
	}
	try {
		const bmp = await createImageBitmap(new Blob([data]));
		const tex = new THREE.Texture(bmp);
		tex.wrapS = THREE.RepeatWrapping;
		tex.wrapT = THREE.RepeatWrapping;
		tex.flipY = false;
		tex.generateMipmaps = true;
		tex.minFilter = THREE.LinearMipmapLinearFilter;
		tex.needsUpdate = true;
		return tex;
	} catch {
		return null;
	}
}
