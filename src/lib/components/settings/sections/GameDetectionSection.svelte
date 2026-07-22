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

	const LOGO_MONO: Record<string, string> = {
		AC:      'AC',
		ACC:     'CC',
		LMU:     'LM',
		iRacing: 'iR',
	};

	function logoMono(key: string) {
		return LOGO_MONO[key] ?? key.slice(0, 2).toUpperCase();
	}

	let saveStatus = $state<'saved' | 'error' | null>(null);

	async function save() {
		const ok = await saveConfig(gamePaths);
		saveStatus = ok ? 'saved' : 'error';
		setTimeout(() => saveStatus = null, 2000);
	}
</script>

<div class="group">
	<span class="group-label">Games</span>
	<p class="group-desc">Point each entry to the game's executable to enable auto-detection.</p>

	<div class="box">
		{#each Object.keys(gamePaths) as key}
			<div class="game-row">
				<span class="logo">{logoMono(key)}</span>
				<div class="game-info">
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

<style>
	.group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.group-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.10em;
		color: var(--color-subtle);
		padding: 0 2px;
	}

	.group-desc {
		font-size: 11px;
		color: var(--color-muted);
		line-height: 1.5;
		margin: -2px 2px 2px;
	}

	.box {
		display: flex;
		flex-direction: column;
		border-radius: var(--radius-sm);
		background: var(--card-bg);
		box-shadow: inset 0 0 0 1px var(--color-border);
		overflow: hidden;
	}

	.game-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 18px;
		border-bottom: 1px solid var(--color-border);
	}

	.game-row:last-child {
		border-bottom: none;
	}

	.logo {
		flex: 0 0 auto;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	.game-info {
		flex: 0 0 105px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.game-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.game-status {
		font-size: 9px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-subtle);
	}

	.game-status.configured {
		color: var(--color-accent);
	}

	.path-input-wrap {
		position: relative;
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
	}

	.path-input-wrap svg {
		position: absolute;
		left: 10px;
		width: 11px;
		height: 11px;
		color: var(--color-subtle);
		pointer-events: none;
	}

	.path-input-wrap input {
		width: 100%;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 7px 11px 7px 27px;
		font-size: 11px;
		font-family: var(--font-mono);
		color: var(--color-text);
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
		box-sizing: border-box;
	}

	.path-input-wrap input::placeholder {
		color: var(--color-subtle);
	}

	.path-input-wrap input:focus {
		border-color: var(--color-accent-border);
		box-shadow: 0 0 0 3px var(--color-accent-dim);
	}

	.save-row {
		display: flex;
		align-items: center;
		gap: 11px;
	}

	.save-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border-radius: 6px;
		background: var(--color-accent);
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-bg);
		transition: filter 0.15s, transform 0.1s;
	}

	.save-btn:hover  { filter: brightness(1.12); }
	.save-btn:active { transform: scale(0.98); }

	.save-btn svg {
		width: 11px;
		height: 11px;
	}

	.save-status {
		font-size: 10px;
		font-family: inherit;
	}

	.save-status.ok  { color: var(--color-accent); }
	.save-status.err { color: var(--color-error, #ef4444); }
</style>