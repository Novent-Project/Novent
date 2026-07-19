import * as THREE from 'three';
import type { Kn5, Kn5Material, Kn5Node } from './parser';
import { decodeTexture } from './textures';

export interface BuildResult {
	group: THREE.Group;
	triangles: number;
	meshCount: number;
	textureCount: number;
	materialCount: number;
	encrypted: boolean;
}

const HIDDEN = /^(CINTURE_ON|DAMAGE_GLASS)/;
const BLUR = /BLUR/i;

const DEBUG_UNLIT = false;

const STUB_TEXTURE_BYTES = 512;

function prop(m: Kn5Material, name: string): number | undefined {
	return m.props.find((p) => p.name === name)?.valueA;
}

function applyDetailMap(mat: THREE.MeshPhysicalMaterial, details: THREE.Texture, uvMult: number) {
	mat.onBeforeCompile = (shader) => {
		shader.uniforms.detailsMap = { value: details };
		shader.uniforms.detailsUvMultiplier = { value: uvMult };
		shader.fragmentShader = shader.fragmentShader
			.replace(
				'#include <map_pars_fragment>',
				'#include <map_pars_fragment>\nuniform sampler2D detailsMap;\nuniform float detailsUvMultiplier;'
			)
			.replace(
				'#include <map_fragment>',
				`#ifdef USE_MAP
					vec4 sampledDiffuseColor = texture2D( map, vMapUv );
					vec3 kn5Details = texture2D( detailsMap, vMapUv * detailsUvMultiplier ).rgb;
					sampledDiffuseColor.rgb *= mix( kn5Details, vec3( 1.0 ), sampledDiffuseColor.a );
					diffuseColor *= sampledDiffuseColor;
				#endif`
			);
	};
	mat.customProgramCacheKey = () => `kn5-details`;
}
function propVec3(m: Kn5Material, name: string): [number, number, number] | undefined {
	return m.props.find((p) => p.name === name)?.valueC;
}
function mapping(m: Kn5Material, name: string): string | undefined {
	return m.textures.find((t) => t.name === name)?.texture;
}
export async function buildModel(kn5: Kn5, maxAnisotropy: number): Promise<BuildResult> {
	const texCache = new Map<string, Promise<THREE.Texture | null>>();
	const usedTextures = new Set<string>();
	function getTexture(name: string, srgb: boolean): Promise<THREE.Texture | null> {
		const key = `${srgb ? 's' : 'l'}:${name}`;
		let pending = texCache.get(key);
		if (!pending) {
			const raw = kn5.textures.get(name);
			const bytes = raw && raw.byteLength >= STUB_TEXTURE_BYTES ? raw : undefined;
			pending = bytes
				? decodeTexture(bytes).then((t) => {
						if (t) {
							t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
							t.anisotropy = maxAnisotropy;
							usedTextures.add(name);
						}
						return t;
					})
				: Promise.resolve(null);
			texCache.set(key, pending);
		}
		return pending;
	}
	const materialCache = new Map<number, Promise<THREE.Material>>();
	function getMaterial(id: number): Promise<THREE.Material> {
		let pending = materialCache.get(id);
		if (!pending) {
			const m = kn5.materials[id];
			pending = m ? makeMaterial(m) : Promise.resolve(new THREE.MeshStandardMaterial({ color: 0x888888 }));
			materialCache.set(id, pending);
		}
		return pending;
	}
	async function makeMaterial(m: Kn5Material): Promise<THREE.Material> {
		const shader = m.shaderName ?? '';
		const label = `${m.name} ${shader}`.toLowerCase();
		const isBlend = m.blendMode === 1;
		const params: THREE.MeshPhysicalMaterialParameters = {};

		const txDiffuse = mapping(m, 'txDiffuse') ?? mapping(m, 'txDetail');
		if (txDiffuse) {
			const t = await getTexture(txDiffuse, true);
			if (t) params.map = t;
		}
		const txNormal = mapping(m, 'txNormal') ?? mapping(m, 'txNormalDetail');
		if (txNormal) {
			const t = await getTexture(txNormal, false);
			if (t) {
				params.normalMap = t;
				params.normalScale = new THREE.Vector2(0.6, 0.6);
			}
		}
		if (params.map) {
			params.color = new THREE.Color(0xffffff);
		} else {
			params.color = new THREE.Color(0x9a9ea4);
		}
		if (DEBUG_UNLIT) {
			const bm = new THREE.MeshBasicMaterial({
				map: params.map ?? null,
				color: params.color as THREE.Color,
				side: THREE.DoubleSide
			});
			if (m.alphaTested) bm.alphaTest = 0.45;
			if (isBlend) {
				bm.transparent = true;
				bm.opacity = 0.6;
				bm.depthWrite = false;
			}
			return bm;
		}
		const em = propVec3(m, 'ksEmissive');
		if (em && (em[0] || em[1] || em[2])) {
			params.emissive = new THREE.Color(em[0], em[1], em[2]);
			params.emissiveIntensity = 1;
		}

		const exp = prop(m, 'ksSpecularEXP') ?? 20;
		const isGlass = /windscreen|glass|window/.test(label) || (isBlend && /reflection|refl/.test(label));
		const isChrome = /chrome|mirror/.test(label);
		const isTyre = /tyre|tyres|tire/.test(label);
		const isPaint = /paint|carpaint|multimap/.test(label);
		params.metalness = 0;
		params.envMapIntensity = params.map ? 1.0 : 0.35;
		params.roughness = THREE.MathUtils.clamp(1 - Math.min(exp, 250) / 250, 0.35, 0.95);
		const mat = new THREE.MeshPhysicalMaterial(params);
		mat.side = THREE.FrontSide;
		const txDetail = mapping(m, 'txDetail');
		if (params.map && txDetail && txDetail !== txDiffuse && (prop(m, 'useDetail') ?? 0) > 0) {
			const dt = await getTexture(txDetail, true);
			if (dt) applyDetailMap(mat, dt, prop(m, 'detailUVMultiplier') || 1);
		}
		if (isTyre) {
			mat.roughness = 0.92;
			mat.envMapIntensity = 0.3;
		} else if (isChrome) {
			mat.metalness = 0.9;
			mat.roughness = 0.18;
			mat.envMapIntensity = 1.0;
			if (!params.map) mat.color.setScalar(0.85);
		} else if (isGlass) {
			mat.roughness = 0.06;
			mat.envMapIntensity = 1.0;
			mat.transparent = true;
			mat.depthWrite = false;
			mat.side = THREE.DoubleSide;
			const a = prop(m, 'alpha');
			mat.opacity = a != null && a > 0 && a < 1 ? a : 0.4;
		} else if (isPaint) {
			mat.roughness = THREE.MathUtils.clamp(mat.roughness, 0.32, 0.5);
			mat.clearcoat = 0.8;
			mat.clearcoatRoughness = 0.18;
			mat.envMapIntensity = params.map ? 0.7 : 0.45;
		}
		if (isBlend && !isGlass) {
			mat.transparent = true;
			mat.depthWrite = false;
			mat.side = THREE.DoubleSide;
			const a = prop(m, 'alpha');
			mat.opacity = a != null && a > 0 && a < 1 ? a : 0.85;
		}
		if (m.alphaTested) {
			mat.alphaTest = 0.45;
			mat.side = THREE.DoubleSide;
		}
		return mat;
	}
	const allTextures = [...kn5.textures.values()];
	const encrypted =
		allTextures.length > 4 &&
		allTextures.filter((b) => b.byteLength < STUB_TEXTURE_BYTES).length / allTextures.length > 0.8;

	let triangles = 0;
	let meshCount = 0;
	const root = new THREE.Group();
	root.name = kn5.root.name || 'root';
	async function walk(node: Kn5Node, parent: THREE.Object3D): Promise<void> {
		if (!node.active || HIDDEN.test(node.name)) return;
		if (node.nodeClass === 1) {
			const g = new THREE.Group();
			g.name = node.name;
			g.matrixAutoUpdate = false;
			if (node.transform) g.matrix.fromArray(node.transform);
			g.matrixWorldNeedsUpdate = true;
			parent.add(g);
			for (const child of node.children) await walk(child, g);
			return;
		}
		if (!node.isRenderable || !node.isVisible) return;
		if (BLUR.test(node.name)) return;
		if ((node.lodIn ?? 0) > 0) return;
		if (!node.positions || !node.indices || node.indices.length === 0) return;
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(node.positions, 3));
		if (node.normals && !encrypted) geo.setAttribute('normal', new THREE.BufferAttribute(node.normals, 3));
		if (node.uvs) {
			geo.setAttribute('uv', new THREE.BufferAttribute(node.uvs, 2));
		}
		if (node.tangents && !encrypted) {
			const t3 = node.tangents;
			const count = t3.length / 3;
			const t4 = new Float32Array(count * 4);
			for (let i = 0; i < count; i++) {
				t4[i * 4] = t3[i * 3];
				t4[i * 4 + 1] = t3[i * 3 + 1];
				t4[i * 4 + 2] = t3[i * 3 + 2];
				t4[i * 4 + 3] = 1;
			}
			geo.setAttribute('tangent', new THREE.BufferAttribute(t4, 4));
		}
		geo.setIndex(new THREE.BufferAttribute(node.indices, 1));
		if (!geo.getAttribute('normal')) geo.computeVertexNormals();
		const mesh = new THREE.Mesh(geo, await getMaterial(node.materialId ?? 0));
		mesh.name = node.name;
		mesh.castShadow = node.castShadows ?? true;
		mesh.receiveShadow = true;
		parent.add(mesh);
		triangles += node.indices.length / 3;
		meshCount++;
	}
	await walk(kn5.root, root);
	return {
		group: root,
		triangles,
		meshCount,
		textureCount: usedTextures.size,
		materialCount: materialCache.size,
		encrypted
	};
}
