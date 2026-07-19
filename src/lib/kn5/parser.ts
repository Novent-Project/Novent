const decoder = new TextDecoder('utf-8');

export interface ShaderProperty {
	name: string;
	valueA: number;
	valueB: [number, number];
	valueC: [number, number, number];
	valueD: [number, number, number, number];
}

export interface TextureMapping {
	name: string;
	slot: number;
	texture: string;
}

export interface Kn5Material {
	name: string;
	shaderName: string;
	blendMode: number;
	alphaTested: boolean;
	depthMode: number;
	props: ShaderProperty[];
	textures: TextureMapping[];
}

export type NodeClass = 1 | 2 | 3;

export interface Kn5Node {
	nodeClass: NodeClass;
	name: string;
	active: boolean;
	children: Kn5Node[];

	transform?: number[];

	castShadows?: boolean;
	isVisible?: boolean;
	isTransparent?: boolean;
	isRenderable?: boolean;
	materialId?: number;
	layer?: number;
	lodIn?: number;
	lodOut?: number;
	positions?: Float32Array;
	normals?: Float32Array;
	uvs?: Float32Array;
	tangents?: Float32Array;
	indices?: Uint16Array;
}

export interface Kn5 {
	version: number;
	extra: number;
	textures: Map<string, ArrayBuffer>;
	materials: Kn5Material[];
	root: Kn5Node;
}

class Reader {
	private dv: DataView;
	private buf: ArrayBuffer;
	off = 0;

	constructor(buffer: ArrayBuffer) {
		this.buf = buffer;
		this.dv = new DataView(buffer);
	}

	get length() {
		return this.dv.byteLength;
	}

	private ensure(n: number) {
		if (this.off + n > this.dv.byteLength) throw new RangeError('Unexpected end of KN5 stream');
	}

	u8(): number {
		this.ensure(1);
		return this.dv.getUint8(this.off++);
	}
	bool(): boolean {
		return this.u8() !== 0;
	}
	i32(): number {
		this.ensure(4);
		const v = this.dv.getInt32(this.off, true);
		this.off += 4;
		return v;
	}
	u32(): number {
		this.ensure(4);
		const v = this.dv.getUint32(this.off, true);
		this.off += 4;
		return v;
	}
	f32(): number {
		this.ensure(4);
		const v = this.dv.getFloat32(this.off, true);
		this.off += 4;
		return v;
	}
	u16(): number {
		this.ensure(2);
		const v = this.dv.getUint16(this.off, true);
		this.off += 2;
		return v;
	}
	skip(n: number) {
		this.ensure(n);
		this.off += n;
	}
	str(): string {
		const n = this.i32();
		this.ensure(n);
		const s = decoder.decode(new Uint8Array(this.buf, this.off, n));
		this.off += n;
		return s;
	}
	slice(n: number): ArrayBuffer {
		this.ensure(n);
		const s = this.buf.slice(this.off, this.off + n);
		this.off += n;
		return s;
	}
	mat(): number[] {
		const m = new Array<number>(16);
		for (let i = 0; i < 16; i++) m[i] = this.f32();
		return m;
	}
	magic(): string {
		this.ensure(6);
		const s = decoder.decode(new Uint8Array(this.buf, this.off, 6));
		this.off += 6;
		return s;
	}
}

function readTextures(r: Reader): Map<string, ArrayBuffer> {
	const count = r.i32();
	const map = new Map<string, ArrayBuffer>();
	for (let i = 0; i < count; i++) {
		r.i32();
		const name = r.str();
		const len = r.u32();
		if (len > 0) {
			map.set(name, r.slice(len));
		}
	}
	return map;
}

function readMaterials(r: Reader): Kn5Material[] {
	const count = r.i32();
	const materials: Kn5Material[] = [];
	for (let i = 0; i < count; i++) {
		const name = r.str();
		const shaderName = r.str();
		const blendMode = r.u8();
		const alphaTested = r.bool();
		const depthMode = r.i32();

		const propCount = r.i32();
		const props: ShaderProperty[] = [];
		for (let p = 0; p < propCount; p++) {
			props.push({
				name: r.str(),
				valueA: r.f32(),
				valueB: [r.f32(), r.f32()],
				valueC: [r.f32(), r.f32(), r.f32()],
				valueD: [r.f32(), r.f32(), r.f32(), r.f32()]
			});
		}

		const mapCount = r.i32();
		const textures: TextureMapping[] = [];
		for (let m = 0; m < mapCount; m++) {
			textures.push({ name: r.str(), slot: r.i32(), texture: r.str() });
		}

		materials.push({ name, shaderName, blendMode, alphaTested, depthMode, props, textures });
	}
	return materials;
}

function readNode(r: Reader): Kn5Node {
	const nodeClass = r.i32() as NodeClass;
	const name = r.str();
	const childCount = r.i32();
	const active = r.bool();

	const node: Kn5Node = { nodeClass, name, active, children: [] };

	if (nodeClass === 1) {
		node.transform = r.mat();
	} else {
		node.castShadows = r.bool();
		node.isVisible = r.bool();
		node.isTransparent = r.bool();

		if (nodeClass === 3) {
			const boneCount = r.u32();
			for (let b = 0; b < boneCount; b++) {
				r.str();
				r.skip(64);
			}
		}

		const vertexCount = r.u32();
		const positions = new Float32Array(vertexCount * 3);
		const normals = new Float32Array(vertexCount * 3);
		const uvs = new Float32Array(vertexCount * 2);
		const tangents = new Float32Array(vertexCount * 3);
		for (let v = 0; v < vertexCount; v++) {
			positions[v * 3] = r.f32();
			positions[v * 3 + 1] = r.f32();
			positions[v * 3 + 2] = r.f32();
			normals[v * 3] = r.f32();
			normals[v * 3 + 1] = r.f32();
			normals[v * 3 + 2] = r.f32();
			uvs[v * 2] = r.f32();
			uvs[v * 2 + 1] = r.f32();
			tangents[v * 3] = r.f32();
			tangents[v * 3 + 1] = r.f32();
			tangents[v * 3 + 2] = r.f32();
			if (nodeClass === 3) r.skip(32);
		}

		const indexCount = r.u32();
		const indices = new Uint16Array(indexCount);
		for (let i = 0; i < indexCount; i++) indices[i] = r.u16();

		node.materialId = r.u32();
		node.layer = r.u32();
		node.lodIn = r.f32();
		node.lodOut = r.f32();

		if (nodeClass === 2) {
			r.skip(12);
			r.f32();
			node.isRenderable = r.bool();
		} else {
			node.isRenderable = true;
		}

		node.positions = positions;
		node.normals = normals;
		node.uvs = uvs;
		node.tangents = tangents;
		node.indices = indices;
	}

	for (let c = 0; c < childCount; c++) {
		try {
			node.children.push(readNode(r));
		} catch (e) {
			if (e instanceof RangeError) break;
			throw e;
		}
	}

	return node;
}

export function parseKn5(buffer: ArrayBuffer): Kn5 {
	const r = new Reader(buffer);
	if (r.magic() !== 'sc6969') {
		throw new Error('Not a valid KN5 file (bad magic).');
	}
	const version = r.i32();
	const extra = version > 5 ? r.i32() : 0;
	const textures = readTextures(r);
	const materials = readMaterials(r);
	const root = readNode(r);
	return { version, extra, textures, materials, root };
}
