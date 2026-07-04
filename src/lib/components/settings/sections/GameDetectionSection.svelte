<script lang="ts">
	import { gameLabel } from '$lib/utils';
	import { saveConfig } from '$lib/api';

	interface Props {
		gamePaths: Record<string, string>;
	}

	let { gamePaths = $bindable() }: Props = $props();

	const PLACEHOLDERS: Record<string, string> = {
		AC:      'C:/Program Files (x86)/Steam/steamapps/common/assettocorsa/acs.exe',
		ACC:     'C:/Program Files (x86)/Steam/steamapps/common/Assetto Corsa Competizione/AC2.exe',
		LMU:     'C:/Program Files (x86)/Steam/steamapps/common/Le Mans Ultimate/Le Mans Ultimate.exe',
		iRacing: 'C:/Users/username/Documents/iRacing/iRacingSim64DX11.exe',
	};

	let saveStatus = $state<'saved' | 'error' | null>(null);

	async function save() {
		const ok = await saveConfig(gamePaths);
		saveStatus = ok ? 'saved' : 'error';
		setTimeout(() => saveStatus = null, 2000);
	}
</script>

<section class="section">
	<h2>Game detection</h2>
	<p>Point each entry to the game's executable so Novent can detect when it's running and capture telemetry automatically.</p>

	<div class="game-list">
		{#each Object.keys(gamePaths) as key}
			<div class="game-entry">
				<div class="game-entry-header">
					<span class="game-tag">{key}</span>
					<span class="game-name">{gameLabel(key)}</span>
					<span class="game-status" class:configured={!!gamePaths[key]}>
						{gamePaths[key] ? 'Configured' : 'Not set'}
					</span>
				</div>
				<div class="path-input-wrap">
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H7l2 2h3.5A1.5 1.5 0 0 1 14 6.5V12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12V4.5z"/>
					</svg>
					<input
						type="text"
						bind:value={gamePaths[key]}
						placeholder={PLACEHOLDERS[key] ?? 'Path to game executable (.exe)'}
					/>
				</div>
			</div>
		{/each}
	</div>

	<div class="save-row">
		<button class="save-btn" onclick={save}>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M3 3h8l2 2v8H3V3zM6 3v4h4V3M5 13v-4h6v4"/>
			</svg>
			Save changes
		</button>
		{#if saveStatus}
			<span class="save-status" class:ok={saveStatus === 'saved'} class:err={saveStatus === 'error'}>
				{saveStatus === 'saved' ? 'Saved' : 'Failed to save'}
			</span>
		{/if}
	</div>
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	h2 {
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: #fff;
		margin: 0;
	}

	p {
		font-size: 12px;
		color: rgba(255,255,255,0.4);
		line-height: 1.6;
		margin: 0;
		max-width: 56ch;
	}

	.game-list {
		display: flex;
		flex-direction: column;
		border-radius: 6px;
		background: rgba(255,255,255,0.02);
		box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
		overflow: hidden;
	}

	.game-entry {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px 16px;
		border-bottom: 1px solid rgba(255,255,255,0.04);
	}

	.game-entry:last-child {
		border-bottom: none;
	}

	.game-entry-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.game-tag {
		font-size: 10px;
		font-family: var(--font-mono);
		font-weight: 600;
		color: #6ee7b7;
		background: rgba(16,185,129,0.10);
		box-shadow: inset 0 0 0 1px rgba(16,185,129,0.20);
		border-radius: 3px;
		padding: 1px 6px;
	}

	.game-name {
		font-size: 12px;
		font-weight: 500;
		color: rgba(255,255,255,0.8);
	}

	.game-status {
		margin-left: auto;
		font-size: 9px;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.10em;
		color: rgba(255,255,255,0.2);
	}

	.game-status.configured {
		color: #10b981;
	}

	.path-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.path-input-wrap svg {
		position: absolute;
		left: 9px;
		width: 13px;
		height: 13px;
		color: rgba(255,255,255,0.2);
		pointer-events: none;
	}

	.path-input-wrap input {
		width: 100%;
		background: rgba(0,0,0,0.30);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 5px;
		padding: 7px 10px 7px 28px;
		font-size: 11px;
		font-family: var(--font-mono);
		color: rgba(255,255,255,0.75);
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.path-input-wrap input::placeholder {
		color: rgba(255,255,255,0.18);
	}

	.path-input-wrap input:focus {
		border-color: rgba(16,185,129,0.45);
		box-shadow: 0 0 0 3px rgba(16,185,129,0.10);
	}

	.save-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.save-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border-radius: 5px;
		background: #10b981;
		border: none;
		cursor: pointer;
		font-size: 11px;
		font-family: var(--font-mono);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #000;
		transition: background 0.15s, transform 0.1s;
	}

	.save-btn:hover  { background: #34d399; }
	.save-btn:active { transform: scale(0.98); }

	.save-btn svg {
		width: 13px;
		height: 13px;
	}

	.save-status {
		font-size: 11px;
		font-family: var(--font-mono);
	}

	.save-status.ok  { color: #10b981; }
	.save-status.err { color: #ef4444; }
</style>
