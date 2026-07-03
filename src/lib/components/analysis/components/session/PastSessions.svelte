<script lang="ts">
	import { gameShort, formatName } from '$lib/utils';

	interface SessionRow {
		uuid: string;
		game: string;
		car: string;
		track: string;
		driver: string;
		date: string;
		lapTime: string;
		favorite: boolean;
	}

	interface Props {
		sessions: SessionRow[];
		onOpen: (uuid: string) => void;
		onToggleFavorite: (uuid: string) => void;
	}

	let { sessions = [], onOpen, onToggleFavorite }: Props = $props();

	function handleToggle(event: MouseEvent, uuid: string) {
		event.stopPropagation();
		onToggleFavorite(uuid);
	}

	function handleShare(event: MouseEvent) {
		event.stopPropagation();
	}
</script>

<div class="page">
	<h1 class="title">Past Sessions</h1>

	{#if sessions.length === 0}
		<div class="empty">No sessions recorded yet.</div>
	{:else}
		<div class="table">
			<div class="row header">
				<div class="col-main hud-eyebrow">Game / Car / Track</div>
				<div class="col hud-eyebrow">
					<span>Driver</span>
					<svg class="caret" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4 6l4 4 4-4" />
					</svg>
				</div>
				<div class="col hud-eyebrow">
					<span>Date</span>
					<svg class="caret" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4 6l4 4 4-4" />
					</svg>
				</div>
				<div class="col hud-eyebrow">
					<span>Laptime</span>
					<svg class="caret" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4 6l4 4 4-4" />
					</svg>
				</div>
				<div class="col-actions hud-eyebrow">Actions</div>
			</div>

			{#each sessions as session (session.uuid)}
				<div
					class="row session"
					role="button"
					tabindex="0"
					onclick={() => onOpen(session.uuid)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onOpen(session.uuid);
						}
					}}
				>
					<div class="col-main">
						<div class="badge mono">{gameShort(session.game)}</div>
						<div class="names">
							<span class="car">{formatName(session.car)}</span>
							<span class="track">{formatName(session.track)}</span>
						</div>
					</div>

					<div class="col driver">{session.driver || '—'}</div>

					<div class="col meta">
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
							<rect x="2.5" y="3" width="11" height="10.5" rx="1.5" />
							<path d="M2.5 6.5h11M5.5 1.5v2M10.5 1.5v2" />
						</svg>
						<span class="mono">{session.date || '—'}</span>
					</div>

					<div class="col meta">
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M4 1.5v13M4 2.5h8l-2 3 2 3H4" />
						</svg>
						<span class="mono">{session.lapTime || '—'}</span>
					</div>

					<div class="col-actions">
						<button class="icon-btn" type="button" aria-label="Share session" onclick={handleShare}>
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M8 10.5V2.5M8 2.5L5 5.5M8 2.5l3 3M3.5 9v3.5a1 1 0 001 1h7a1 1 0 001-1V9" />
							</svg>
						</button>
						<button
							class="icon-btn star"
							class:active={session.favorite}
							type="button"
							aria-label={session.favorite ? 'Remove favorite' : 'Add favorite'}
							onclick={(e) => handleToggle(e, session.uuid)}
						>
							{#if session.favorite}
								<svg viewBox="0 0 16 16" fill="currentColor" stroke="none">
									<path d="M8 1.5l1.9 3.85 4.25.62-3.07 3 .72 4.23L8 11.2 3.2 13.2l.72-4.23-3.07-3 4.25-.62z" />
								</svg>
							{:else}
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<path d="M8 1.5l1.9 3.85 4.25.62-3.07 3 .72 4.23L8 11.2 3.2 13.2l.72-4.23-3.07-3 4.25-.62z" />
								</svg>
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page {
		width: 100%;
		height: 100%;
		overflow-y: auto;
		background: var(--color-bg);
		color: var(--color-text);
		font-family: var(--font-sans);
	}

	.title {
		margin: 0;
		padding: 28px 32px 16px;
		font-size: 22px;
		font-weight: 700;
		color: #fff;
	}

	.empty {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 240px;
		color: var(--color-muted);
		font-size: 14px;
	}

	.table {
		padding: 0 32px 32px;
		overflow-x: auto;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(180px, 3fr) minmax(90px, 1.2fr) minmax(120px, 1.2fr) minmax(90px, 1fr) auto;
		align-items: center;
		gap: 16px;
		min-width: 560px;
	}

	.header {
		padding: 10px 8px;
		border-bottom: 1px solid var(--color-border);
	}

	.col {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.caret {
		width: 11px;
		height: 11px;
		color: var(--color-subtle);
	}

	.col-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
	}

	.session {
		padding: 12px 8px;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		transition: background 0.12s ease;
	}

	.session:hover {
		background: var(--card-bg-hover);
	}

	.session:focus-visible {
		outline: 1px solid var(--color-accent-border);
		outline-offset: -1px;
	}

	.col-main {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.badge {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-sm);
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		font-size: 10px;
		color: var(--color-muted);
	}

	.names {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.car {
		font-weight: 700;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track {
		font-size: 12px;
		color: var(--color-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.driver {
		color: var(--color-text);
	}

	.meta {
		color: var(--color-text);
		font-size: 13px;
	}

	.meta svg {
		width: 14px;
		height: 14px;
		color: var(--color-muted);
		flex: 0 0 auto;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-pill);
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		color: var(--color-muted);
		cursor: pointer;
		padding: 0;
		transition: color 0.12s ease, border-color 0.12s ease;
	}

	.icon-btn:hover {
		color: var(--color-text);
		border-color: var(--color-border-md);
	}

	.icon-btn svg {
		width: 15px;
		height: 15px;
	}

	.star.active {
		color: var(--color-accent);
		border-color: var(--color-accent-border);
	}

	.star.active:hover {
		color: var(--color-accent);
	}
</style>
