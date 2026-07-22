import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class Viewer {
	readonly renderer: THREE.WebGLRenderer;
	readonly scene: THREE.Scene;
	readonly camera: THREE.PerspectiveCamera;
	readonly controls: OrbitControls;

	private composer: EffectComposer;
	private gtao: GTAOPass;
	private keyLight: THREE.DirectionalLight;
	private ground: THREE.Mesh;
	private model: THREE.Object3D | null = null;
	private envTexture: THREE.Texture;

	private resetPos = new THREE.Vector3(4, 2, 5);
	private resetTarget = new THREE.Vector3(0, 0.6, 0);
	private modelSize = new THREE.Vector3(1, 1, 1);
	private modelMaxDim = 1;

	private frameId = 0;
	private resizeObserver: ResizeObserver;

	constructor(canvas: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.15;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x14161b);

		const pmrem = new THREE.PMREMGenerator(this.renderer);
		this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
		this.scene.environment = this.envTexture;

		this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 1000);
		this.camera.position.copy(this.resetPos);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.08;
		this.controls.minDistance = 0.4;
		this.controls.maxDistance = 200;
		this.controls.maxPolarAngle = Math.PI * 0.5;
		this.controls.autoRotateSpeed = 1.1;
		this.controls.target.copy(this.resetTarget);

		this.scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x20222a, 0.35));

		this.keyLight = new THREE.DirectionalLight(0xfff6ec, 2.4);
		this.keyLight.position.set(5, 9, 6);
		this.keyLight.castShadow = true;
		this.keyLight.shadow.mapSize.set(4096, 4096);
		this.keyLight.shadow.bias = -0.00025;
		this.keyLight.shadow.normalBias = 0.02;
		this.keyLight.shadow.radius = 4;
		this.scene.add(this.keyLight, this.keyLight.target);

		const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6);
		fill.position.set(-7, 4, -3);
		this.scene.add(fill);

		const rim = new THREE.DirectionalLight(0xffffff, 0.9);
		rim.position.set(-3, 5, -8);
		this.scene.add(rim);

		this.ground = new THREE.Mesh(
			new THREE.CircleGeometry(60, 96),
			new THREE.ShadowMaterial({ opacity: 0.5 })
		);
		this.ground.rotation.x = -Math.PI / 2;
		this.ground.receiveShadow = true;
		this.scene.add(this.ground);

		const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
		this.composer = new EffectComposer(this.renderer, rt);
		this.composer.addPass(new RenderPass(this.scene, this.camera));
		this.gtao = new GTAOPass(this.scene, this.camera, 1, 1);
		this.gtao.output = GTAOPass.OUTPUT.Default;
		this.gtao.updateGtaoMaterial({ radius: 0.4, distanceExponent: 1, thickness: 1, scale: 1.1, samples: 16 });
		this.composer.addPass(this.gtao);
		this.composer.addPass(new OutputPass());

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(canvas);
		this.resize();

		const loop = () => {
			this.frameId = requestAnimationFrame(loop);
			this.controls.update();
			this.composer.render();
		};
		loop();
	}

	private resize() {
		const canvas = this.renderer.domElement;
		const w = canvas.clientWidth || 1;
		const h = canvas.clientHeight || 1;
		const pr = Math.min(window.devicePixelRatio, 2);
		this.renderer.setPixelRatio(pr);
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.composer.setPixelRatio(pr);
		this.composer.setSize(w, h);
	}

	setModel(obj: THREE.Object3D) {
		if (this.model) {
			this.scene.remove(this.model);
			disposeObject(this.model);
		}
		this.model = obj;

		obj.updateWorldMatrix(true, true);
		const box = new THREE.Box3().setFromObject(obj);
		const size = box.getSize(new THREE.Vector3());
		const center = box.getCenter(new THREE.Vector3());
		obj.position.x -= center.x;
		obj.position.z -= center.z;
		obj.position.y -= box.min.y;
		this.scene.add(obj);

		const maxDim = Math.max(size.x, size.y, size.z) || 1;
		this.modelSize.copy(size);
		this.modelMaxDim = maxDim;

		const target = new THREE.Vector3(0, size.y * 0.42, 0);
		const dist = maxDim * 1.5 + 0.5;
		this.camera.near = maxDim / 200;
		this.camera.far = maxDim * 40 + 100;
		this.camera.updateProjectionMatrix();
		this.camera.position.set(dist * 0.72, size.y * 0.8 + maxDim * 0.18, dist);
		this.controls.target.copy(target);
		this.controls.update();
		this.resetPos.copy(this.camera.position);
		this.resetTarget.copy(target);

		this.gtao.updateGtaoMaterial({ radius: Math.max(0.15, maxDim * 0.09) });

		const s = maxDim * 0.8;
		const cam = this.keyLight.shadow.camera;
		cam.left = -s;
		cam.right = s;
		cam.top = s;
		cam.bottom = -s;
		cam.near = 0.05;
		cam.far = maxDim * 8 + 10;
		cam.updateProjectionMatrix();
		this.keyLight.position.set(s * 0.9, maxDim * 1.7 + 2, s * 0.7);
		this.keyLight.target.position.set(0, size.y * 0.4, 0);
		this.keyLight.target.updateMatrixWorld();
	}

	resetView() {
		this.camera.position.copy(this.resetPos);
		this.controls.target.copy(this.resetTarget);
		this.controls.update();
	}

	snapshotSide(width = 1280, height = 448): string | null {
		return this.snapshotView(1, 0, width, height, 0.45);
	}

	snapshotRearQuarter(width = 1280, height = 560): string | null {
		return this.snapshotView(0.707, -0.707, width, height, 0.55);
	}

	private snapshotView(dirX: number, dirZ: number, width: number, height: number, eyeH: number): string | null {
		if (!this.model) return null;
		const prevPr = this.renderer.getPixelRatio();
		const prevAspect = this.camera.aspect;
		const prevPos = this.camera.position.clone();
		const prevTarget = this.controls.target.clone();
		const prevBg = this.scene.background;

		const prevFov = this.camera.fov;
		this.scene.background = null;
		this.renderer.setPixelRatio(1);
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.fov = 14;
		const tanY = Math.tan((this.camera.fov * Math.PI) / 360);
		const tanX = tanY * this.camera.aspect;
		const ax = Math.abs(dirX);
		const az = Math.abs(dirZ);
		const extent = ax * this.modelSize.z + az * this.modelSize.x;
		const standoff = (ax * this.modelSize.x + az * this.modelSize.z) * 0.5;
		const y = this.modelSize.y * eyeH;
		const dist = Math.max(
			(extent * 0.5 * 1.12) / tanX,
			(this.modelSize.y * 0.5 * 1.3) / tanY
		) + standoff;
		this.camera.position.set(dirX * dist, y, dirZ * dist);
		this.camera.lookAt(0, y, 0);
		this.camera.updateProjectionMatrix();
		this.renderer.render(this.scene, this.camera);
		const url = this.renderer.domElement.toDataURL('image/png');

		this.scene.background = prevBg;
		this.renderer.setPixelRatio(prevPr);
		this.camera.fov = prevFov;
		this.camera.aspect = prevAspect;
		this.camera.updateProjectionMatrix();
		this.camera.position.copy(prevPos);
		this.controls.target.copy(prevTarget);
		this.controls.update();
		this.resize();
		this.composer.render();
		return url;
	}

	setAutoRotate(v: boolean) {
		this.controls.autoRotate = v;
	}
	setWireframe(v: boolean) {
		this.model?.traverse((o) => {
			const mesh = o as THREE.Mesh;
			if (mesh.isMesh) {
				const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				for (const m of mats) (m as THREE.MeshStandardMaterial).wireframe = v;
			}
		});
	}
	setGroundVisible(v: boolean) {
		this.ground.visible = v;
	}
	setExposure(v: number) {
		this.renderer.toneMappingExposure = v;
	}
	setBackground(hex: number) {
		(this.scene.background as THREE.Color).setHex(hex);
	}

	dispose() {
		cancelAnimationFrame(this.frameId);
		this.resizeObserver.disconnect();
		this.controls.dispose();
		if (this.model) disposeObject(this.model);
		this.envTexture.dispose();
		this.composer.dispose();
		this.renderer.dispose();
	}
}

function disposeObject(obj: THREE.Object3D) {
	obj.traverse((o) => {
		const mesh = o as THREE.Mesh;
		if (mesh.isMesh) {
			mesh.geometry?.dispose();
			const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
			for (const m of mats) {
				const mat = m as THREE.MeshStandardMaterial;
				mat.map?.dispose();
				mat.normalMap?.dispose();
				mat.dispose();
			}
		}
	});
}
