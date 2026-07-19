<script lang="ts">
	import type { AnalysisState } from '$lib/components/analysis/state';

	interface Props {
		analysis: AnalysisState;
	}

	let { analysis }: Props = $props();

	let worldX         = $derived(analysis.currentTrace.worldX);
	let worldZ         = $derived(analysis.currentTrace.worldZ);
	let normPos        = $derived(analysis.currentTrace.normPos);
	let segments       = $derived(analysis.segments);
	let currentSegment = $derived(analysis.currentSegment);
	let delta          = $derived(analysis.segDelta);
	let label          = $derived(`Segment ${analysis.currentSegment + 1}`);

	let canvas = $state<HTMLCanvasElement | null>(null);
	let boxW   = $state(0);
	let boxH   = $state(0);

	const isGarbage = (x: number, z: number) =>
		(x === 0 && z === 0) || Math.abs(x) > 50000 || Math.abs(z) > 50000;

	function segIndexAt(target: number): number {
		for (let i = 0; i < normPos.length; i++) {
			if (normPos[i] >= target) return i;
		}
		return normPos.length - 1;
	}

	$effect(() => {
		if (!canvas || boxW === 0 || boxH === 0 || worldX.length === 0) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width  = boxW * dpr;
		canvas.height = boxH * dpr;
		const ctx = canvas.getContext('2d')!;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, boxW, boxH);

		let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
		for (let i = 0; i < worldX.length; i++) {
			const x = worldX[i], z = worldZ[i];
			if (isGarbage(x, z)) continue;
			if (x < minX) minX = x; if (x > maxX) maxX = x;
			if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
		}
		if (!isFinite(minX)) return;

		const pad   = 0.78;
		const scale = Math.min((boxW * pad) / (maxX - minX || 1), (boxH * pad) / (maxZ - minZ || 1));
		const offX  = boxW / 2 - ((minX + maxX) / 2) * scale;
		const offY  = boxH / 2 + ((minZ + maxZ) / 2) * scale;
		const sx = (x: number) => x * scale + offX;
		const sy = (z: number) => -z * scale + offY;

		ctx.beginPath();
		ctx.strokeStyle = 'rgba(255,255,255,0.28)';
		ctx.lineWidth   = 2;
		ctx.lineJoin    = 'round';
		ctx.lineCap     = 'round';
		let started = false;
		for (let i = 0; i < worldX.length; i++) {
			if (isGarbage(worldX[i], worldZ[i])) continue;
			const px = sx(worldX[i]), py = sy(worldZ[i]);
			started ? ctx.lineTo(px, py) : (ctx.moveTo(px, py), started = true);
		}
		ctx.stroke();

		for (let s = 0; s < segments; s++) {
			const j  = segIndexAt(s / segments);
			const wx = worldX[j], wz = worldZ[j];
			if (isGarbage(wx, wz)) continue;
			const px = sx(wx), py = sy(wz);
			const active = s === currentSegment;
			ctx.beginPath();
			ctx.arc(px, py, 9, 0, Math.PI * 2);
			ctx.fillStyle   = active ? '#10b981' : 'rgba(12,13,16,0.95)';
			ctx.fill();
			ctx.lineWidth   = 1.5;
			ctx.strokeStyle = active ? '#10b981' : 'rgba(255,255,255,0.22)';
			ctx.stroke();
			ctx.fillStyle = active ? '#06080a' : 'rgba(255,255,255,0.55)';
			ctx.font      = 'bold 10px ui-monospace, monospace';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(String(s + 1), px, py + 0.5);
		}
	});
</script>

<div class="segmap hud-card">
	<div class="canvas-wrap" bind:clientWidth={boxW} bind:clientHeight={boxH}>
		<canvas bind:this={canvas}></canvas>
	</div>
	<div class="footer">
		<span class="label">{label}</span>
		<span class="delta mono" class:pos={delta > 0} class:neg={delta < 0}>
			{delta > 0 ? '+' : ''}{delta.toFixed(3)}
		</span>
	</div>
</div>

<style>
	.segmap {
		display: flex;
		flex-direction: column;
		padding: 10px;
		height: 100%;
		min-height: 0;
	}

	.canvas-wrap {
		position: relative;
		flex: 1;
		min-height: 0;
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 4px 2px;
	}

	.label {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text);
	}

	.delta {
		font-size: 13px;
		color: var(--color-muted);
	}

	.delta.pos { color: var(--color-red); }
	.delta.neg { color: var(--color-accent); }
</style>
