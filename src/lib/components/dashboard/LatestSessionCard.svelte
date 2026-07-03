<script lang="ts">
	import { gameShort, formatName } from '$lib/utils';

	interface Session {
		car:      string;
		track:    string;
		game:     string;
		type?:    string;
		bestLap?: string;
	}

	interface Props {
		session?: Session | null;
	}

	let { session = null }: Props = $props();
</script>

<div class="card hud-card">
	<h3 class="heading">Latest Session</h3>

	{#if session}
		<div class="game-row">
			<span class="logo mono">{gameShort(session.game)}</span>
			<div class="names">
				<span class="car">{formatName(session.car)}</span>
				<span class="track">{formatName(session.track)}</span>
			</div>
		</div>

		<svg class="trace" viewBox="0 0 200 90" fill="none" aria-hidden="true">
			<path
				d="M20 60 C10 40 30 22 55 26 C78 30 70 52 92 54 C120 57 118 30 140 28 C168 26 182 44 172 60 C164 73 140 74 120 68 C96 61 60 78 40 72 C26 68 24 66 20 60 Z"
				stroke="var(--color-subtle)" stroke-width="2" stroke-linejoin="round"
			/>
		</svg>

		<dl class="stats">
			<div><dt>Type</dt><dd>{session.type ?? '—'}</dd></div>
			<div><dt>Best Lap</dt><dd class="mono">{session.bestLap ?? 'N/A'}</dd></div>
			<div><dt>Leaderboard Position</dt><dd class="mono">N/A</dd></div>
		</dl>
	{:else}
		<div class="empty">
			<svg viewBox="0 0 200 90" fill="none" aria-hidden="true">
				<path
					d="M20 60 C10 40 30 22 55 26 C78 30 70 52 92 54 C120 57 118 30 140 28 C168 26 182 44 172 60 C164 73 140 74 120 68 C96 61 60 78 40 72 C26 68 24 66 20 60 Z"
					stroke="var(--color-subtle)" stroke-width="2" stroke-linejoin="round"
				/>
			</svg>
			<span class="empty-title">No sessions yet</span>
			<span class="empty-sub">Head to the Race Engineer tab to start logging data</span>
		</div>
	{/if}
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px;
	}

	.heading {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		color: #fff;
	}

	.game-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--card-bg);
		border: 1px solid var(--color-border);
	}

	.logo {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		font-size: 10px;
		color: var(--color-text);
	}

	.names { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
	.car   { font-size: 14px; font-weight: 600; color: #fff; }
	.track { font-size: 12px; color: var(--color-muted); }

	.trace {
		width: 100%;
		height: 84px;
		align-self: center;
	}

	.stats {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
	}

	.stats div {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.stats dt { font-size: 12px; color: var(--color-muted); }
	.stats dd { margin: 0; font-size: 12px; font-weight: 600; color: var(--color-text); }

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 12px 0 4px;
		text-align: center;
	}

	.empty svg { width: 150px; height: 68px; opacity: 0.5; }
	.empty-title { font-size: 14px; font-weight: 600; color: var(--color-text); }
	.empty-sub { font-size: 11px; color: var(--color-muted); max-width: 30ch; }
</style>
