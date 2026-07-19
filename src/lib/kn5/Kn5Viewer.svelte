<script lang="ts" module>
	export interface LoadedFile {
		name: string;
		data: ArrayBuffer;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Viewer } from './Viewer';
	import { parseKn5 } from './parser';
	import { buildModel } from './build';

	let {
		openFile,
		brand = true,
		placeholder,
		background = '#14161b',
	}: {
		openFile?:    () => Promise<LoadedFile | null>;
		brand?:       boolean;
		placeholder?: string;
		background?:  string;
	} = $props();

	let canvas: HTMLCanvasElement;
	let viewer: Viewer | undefined;

	let loading = $state(false);
	let error = $state<string | null>(null);
	let fileName = $state<string | null>(null);
	let encrypted = $state(false);

	type Stats = { version: number; meshes: number; triangles: number; textures: number; materials: number };
	let stats = $state<Stats | null>(null);

	let autoRotate = $state(false);
	let wireframe = $state(false);
	let ground = $state(true);
	let exposure = $state(1.05);
	// svelte-ignore state_referenced_locally -- seed only; swatches own it after mount
	let bg = $state(background);

	const backgrounds = $derived([
		{ label: 'Host', value: background },
		{ label: 'Slate', value: '#252a33' },
		{ label: 'White', value: '#e9ebef' },
		{ label: 'Black', value: '#000000' }
	]);

	onMount(() => {
		viewer = new Viewer(canvas);
		return () => viewer?.dispose();
	});

	export async function load(file: LoadedFile) {
		if (!viewer) return;
		loading = true;
		error = null;
		await new Promise((r) => setTimeout(r, 16));
		try {
			const kn5 = parseKn5(file.data);
			const built = await buildModel(kn5, viewer.renderer.capabilities.getMaxAnisotropy());
			if (built.meshCount === 0) throw new Error('No renderable meshes found in this KN5.');
			viewer.setModel(built.group);
			viewer.setWireframe(wireframe);
			fileName = file.name;
			encrypted = built.encrypted;
			stats = {
				version: kn5.version,
				meshes: built.meshCount,
				triangles: Math.round(built.triangles),
				textures: built.textureCount,
				materials: built.materialCount
			};
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function openClicked() {
		const f = await openFile?.();
		if (f) await load(f);
	}

	async function onDrop(ev: DragEvent) {
		ev.preventDefault();
		const file = ev.dataTransfer?.files?.[0];
		if (file && file.name.toLowerCase().endsWith('.kn5')) {
			await load({ name: file.name, data: await file.arrayBuffer() });
		}
	}

	$effect(() => viewer?.setAutoRotate(autoRotate));
	$effect(() => viewer?.setWireframe(wireframe));
	$effect(() => viewer?.setGroundVisible(ground));
	$effect(() => viewer?.setExposure(exposure));
	$effect(() => viewer?.setBackground(parseInt(bg.slice(1), 16)));

	const fmt = (n: number) => n.toLocaleString('en-US');
</script>

<div class="kn5" ondragover={(e) => e.preventDefault()} ondrop={onDrop} role="application">
	<canvas bind:this={canvas}></canvas>

	<header class="topbar">
		{#if brand}<div class="brand"><span class="logo">KN5</span><span class="title">Viewer</span></div>{/if}
		{#if openFile}<button class="open" onclick={openClicked}>Open model…</button>{/if}
		{#if fileName}<span class="filename" title={fileName}>{fileName}</span>{/if}
	</header>

	{#if encrypted && fileName}
		<div class="banner" role="status">
			<span class="dot"></span>
			<div>
				<b>CSP-encrypted car — geometry only</b>
				<span>Textures and some vertex data are stripped from this KN5 and only decrypt inside Assetto Corsa + CSP.</span>
			</div>
		</div>
	{/if}

	{#if !fileName && !loading}
		<div class="empty">
			<div class="empty-card">
				{#if placeholder}
					<div class="big">{placeholder}</div>
				{:else}
					<div class="big">Drop a <code>.kn5</code> here</div>
				{/if}
				{#if openFile}<div class="sub">or <button class="link" onclick={openClicked}>Open model…</button></div>{/if}
				<div class="hint">Assetto Corsa car &amp; track models</div>
			</div>
		</div>
	{/if}

	{#if fileName}
		<aside class="panel">
			<section class="stats">
				{#if stats}
					<div><span>Meshes</span><b>{fmt(stats.meshes)}</b></div>
					<div><span>Triangles</span><b>{fmt(stats.triangles)}</b></div>
					<div><span>Materials</span><b>{fmt(stats.materials)}</b></div>
					<div><span>Textures</span><b>{fmt(stats.textures)}</b></div>
					<div><span>KN5 ver.</span><b>{stats.version}</b></div>
				{/if}
			</section>
			<section class="controls">
				<label class="row"><input type="checkbox" bind:checked={autoRotate} /> Auto-rotate</label>
				<label class="row"><input type="checkbox" bind:checked={ground} /> Ground &amp; shadow</label>
				<label class="row"><input type="checkbox" bind:checked={wireframe} /> Wireframe</label>
				<label class="slider">
					<span>Exposure <b>{exposure.toFixed(2)}</b></span>
					<input type="range" min="0.3" max="2.5" step="0.05" bind:value={exposure} />
				</label>
				<div class="swatches">
					{#each backgrounds as b}
						<button class="swatch" class:active={bg === b.value} style="background:{b.value}"
							title={b.label} aria-label={b.label} onclick={() => (bg = b.value)}></button>
					{/each}
				</div>
				<button class="reset" onclick={() => viewer?.resetView()}>Reset view</button>
			</section>
		</aside>
	{/if}

	{#if loading}<div class="overlay"><div class="spinner"></div><span>Loading model…</span></div>{/if}
	{#if error}
		<div class="toast" role="alert">
			<b>Couldn’t load model</b><span>{error}</span>
			<button onclick={() => (error = null)} aria-label="Dismiss">×</button>
		</div>
	{/if}
</div>

<style>
	.kn5 { position: absolute; inset: 0; overflow: hidden; color: var(--color-text, #e6ebf0);
		font-family: inherit;
		--kn5-accent:    var(--color-accent, #e0a948);
		--kn5-warn:      var(--color-amber, #e0a948);
		--kn5-muted:     var(--color-muted, #8a95a2);
		--kn5-panel:     var(--color-panel, #12151b);
		--kn5-border:    var(--color-border, rgba(255, 255, 255, 0.08));
		--kn5-border-md: var(--color-border-md, rgba(255, 255, 255, 0.14));
		--kn5-radius:    var(--radius-card, 12px);
		--kn5-radius-sm: var(--radius-sm, 7px);
		--kn5-mono:      var(--font-mono, ui-monospace, Consolas, monospace); }
	canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
	.topbar { position: absolute; top: 0; left: 0; right: 0; height: 48px; display: flex;
		align-items: center; gap: 16px; padding: 0 18px; z-index: 10; pointer-events: none; }
	.topbar > * { pointer-events: auto; }
	.brand { display: flex; align-items: baseline; gap: 8px; }
	.logo { font-weight: 800; letter-spacing: 0.06em; color: #0b0d10; background: var(--kn5-accent);
		padding: 3px 7px; border-radius: 5px; font-size: 13px; }
	.title { font-weight: 600; color: var(--kn5-muted); }
	button.open { background: var(--kn5-accent); color: #0b0d10; border: none; padding: 7px 14px;
		border-radius: var(--kn5-radius-sm); font-weight: 650; cursor: pointer; font-size: 13px; }
	button.open:hover { filter: brightness(1.12); }
	.filename { color: var(--kn5-muted); font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
		text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 45%; }
	.banner { position: absolute; top: 52px; left: 18px; max-width: 380px; display: flex; gap: 10px;
		align-items: flex-start; background: rgba(42, 33, 18, 0.92); border: 1px solid #7a5a20;
		border-left: 3px solid var(--kn5-warn); border-radius: var(--kn5-radius-sm); padding: 11px 14px; z-index: 12; }
	.banner .dot { width: 8px; height: 8px; margin-top: 5px; border-radius: 50%; background: var(--kn5-warn); flex: none; }
	.banner b { display: block; color: #f0c268; font-size: 13px; margin-bottom: 2px; }
	.banner span { color: #cdb48c; font-size: 12px; line-height: 1.45; }
	.empty { position: absolute; inset: 0; display: grid; place-items: center; z-index: 5; pointer-events: none; }
	.empty-card { text-align: center; padding: 40px 56px; border: 1.5px dashed var(--kn5-border-md);
		border-radius: var(--kn5-radius); background: var(--kn5-panel); pointer-events: auto; }
	.empty .big { font-size: 22px; font-weight: 600; }
	.empty code { background: rgba(255, 255, 255, 0.06); padding: 1px 7px; border-radius: 5px; font-size: 0.9em; }
	.empty .sub { margin-top: 8px; color: var(--kn5-muted); }
	.empty .hint { margin-top: 18px; font-size: 12px; color: var(--kn5-muted); letter-spacing: 0.14em; text-transform: uppercase; }
	button.link { background: none; border: none; color: var(--kn5-accent); cursor: pointer; font: inherit; padding: 0; text-decoration: underline; }

	.panel { position: absolute; top: 16px; right: 16px; width: 200px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), var(--kn5-panel) 60%);
		backdrop-filter: blur(10px) saturate(160%); -webkit-backdrop-filter: blur(10px) saturate(160%);
		border: 1px solid var(--kn5-border); border-radius: var(--kn5-radius); padding: 14px;
		z-index: 10; display: flex; flex-direction: column; gap: 12px; font-size: 12px; }
	.stats { display: grid; gap: 5px; }
	.stats div { display: flex; justify-content: space-between; }
	.stats span { color: var(--kn5-muted); }
	.stats b { font-variant-numeric: tabular-nums; font-family: var(--kn5-mono); font-weight: 600; }
	.controls { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--kn5-border); padding-top: 12px; }
	.row { display: flex; align-items: center; gap: 8px; cursor: pointer; }
	.row input, .slider input { accent-color: var(--kn5-accent); }
	.slider { display: flex; flex-direction: column; gap: 5px; }
	.slider span { color: var(--kn5-muted); display: flex; justify-content: space-between; }
	.slider b { color: var(--color-text, #cdd5de); font-family: var(--kn5-mono); }
	.slider input { width: 100%; }
	.swatches { display: flex; gap: 7px; }
	.swatch { width: 22px; height: 22px; border-radius: var(--kn5-radius-sm); border: 1px solid var(--kn5-border-md); cursor: pointer; padding: 0; }
	.swatch.active { border-color: var(--kn5-accent); }
	button.reset { background: transparent; color: var(--kn5-muted); border: 1px solid var(--kn5-border-md);
		padding: 7px; border-radius: var(--kn5-radius-sm); cursor: pointer; font: inherit; font-size: 12px;
		transition: color 0.15s ease, border-color 0.15s ease; }
	button.reset:hover { color: var(--kn5-accent); border-color: var(--kn5-accent); }
	.overlay { position: absolute; inset: 0; display: grid; place-items: center; align-content: center;
		gap: 14px; background: rgba(8, 9, 11, 0.55); z-index: 20; color: var(--kn5-muted); }
	.spinner { width: 38px; height: 38px; border: 3px solid var(--kn5-border-md); border-top-color: var(--kn5-accent);
		border-radius: 50%; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2s; } }
	.toast { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
		background: #2a1615; border: 1px solid var(--color-red, #e0685f); border-radius: var(--kn5-radius-sm);
		padding: 12px 40px 12px 16px; z-index: 30; max-width: 70%; display: flex; flex-direction: column; gap: 2px; }
	.toast b { color: #ff9c93; }
	.toast span { color: #d9c3c1; font-size: 13px; }
	.toast button { position: absolute; top: 6px; right: 10px; background: none; border: none; color: #d9c3c1; font-size: 18px; cursor: pointer; }
</style>
