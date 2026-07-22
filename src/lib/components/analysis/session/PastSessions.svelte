<script lang="ts">
	import { slide } from 'svelte/transition';
	import { formatName } from '$lib/utils';
	import Icon from '$lib/components/chrome/Icon.svelte';

	interface LapRow {
		uuid: string;
		date: string;
		lapTime: string;
		favorite: boolean;
		label?: string;
	}

	interface SessionGroup {
		id: string;
		kind?: string;
		game: string;
		car: string;
		track: string;
		driver: string;
		date: string;
		bestLap: string;
		laps: LapRow[];
	}

	interface Props {
		sessions: SessionGroup[];
		onOpen: (uuid: string) => void;
		onToggleFavorite: (uuid: string) => void;
	}

	let { sessions = [], onOpen, onToggleFavorite }: Props = $props();

	let expanded = $state<string | null>(null);

	function toggleSession(id: string) {
		expanded = expanded === id ? null : id;
	}

	function handleToggle(event: MouseEvent, uuid: string) {
		event.stopPropagation();
		onToggleFavorite(uuid);
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
				<div class="col hud-eyebrow">Driver</div>
				<div class="col hud-eyebrow">Date</div>
				<div class="col hud-eyebrow">Best Lap</div>
				<div class="col-actions hud-eyebrow">Laps</div>
			</div>

			{#each sessions as session (session.id)}
				<div class="group" class:open={expanded === session.id}>
				<div
					class="row session"
					class:open={expanded === session.id}
					role="button"
					tabindex="0"
					aria-expanded={expanded === session.id}
					onclick={() => toggleSession(session.id)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							toggleSession(session.id);
						}
					}}
				>
					<div class="col-main">
						<div class="badge" class:fav-badge={session.kind === 'favorites'}>
							{#if session.kind === 'favorites'}
								<svg viewBox="0 0 16 16" fill="currentColor" stroke="none">
									<path d="M8 1.5l1.9 3.85 4.25.62-3.07 3 .72 4.23L8 11.2 3.2 13.2l.72-4.23-3.07-3 4.25-.62z" />
								</svg>
							{:else}
								<Icon game={session.game} size={20} />
							{/if}
						</div>
						<div class="names">
							<span class="car">{session.kind === 'favorites' ? session.car : formatName(session.car)}</span>
							<span class="track">{session.kind === 'favorites' ? session.track : formatName(session.track)}</span>
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
						<span class="mono">{session.bestLap}</span>
					</div>

					<div class="col-actions">
						<span class="lap-count mono">{session.laps.length}</span>
						<svg
							class="chevron"
							class:open={expanded === session.id}
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</div>
				</div>

				{#if expanded === session.id}
					<div class="laps" transition:slide={{ duration: 220 }}>
					{#each session.laps as lap, i (lap.uuid)}
						<div
							class="row lap"
							role="button"
							tabindex="0"
							onclick={() => onOpen(lap.uuid)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									onOpen(lap.uuid);
								}
							}}
						>
							<div class="col-main lap-main">
								<span class="lap-index mono">{session.laps.length - i}</span>
								<span class="lap-label">{lap.label ?? 'Lap'}</span>
							</div>

							<div class="col"></div>

							<div class="col meta">
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<rect x="2.5" y="3" width="11" height="10.5" rx="1.5" />
									<path d="M2.5 6.5h11M5.5 1.5v2M10.5 1.5v2" />
								</svg>
								<span class="mono">{lap.date}</span>
							</div>

							<div class="col meta" class:fastest={lap.lapTime === session.bestLap}>
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<path d="M4 1.5v13M4 2.5h8l-2 3 2 3H4" />
								</svg>
								<span class="mono">{lap.lapTime}</span>
							</div>

							<div class="col-actions">
								<button
									class="icon-btn star"
									class:active={lap.favorite}
									type="button"
									aria-label={lap.favorite ? 'Remove favorite' : 'Add favorite'}
									onclick={(e) => handleToggle(e, lap.uuid)}
								>
									{#if lap.favorite}
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
		grid-template-columns: minmax(180px, 3fr) minmax(90px, 1.2fr) minmax(120px, 1.2fr) minmax(90px, 1fr) 88px;
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

	.col-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
	}

	.group {
		border-bottom: 1px solid var(--color-border);
		transition: margin 0.22s ease;
	}

	.group.open {
		border: 1px solid var(--color-border-md);
		border-radius: var(--radius-md, 10px);
		background: color-mix(in srgb, var(--card-bg) 45%, transparent);
		margin: 10px 0;
		overflow: hidden;
	}

	.session {
		padding: 12px 8px;
		border-radius: var(--radius-md, 10px);
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

	.session.open {
		background: var(--card-bg);
		border-radius: var(--radius-md, 10px);
		border-bottom: 1px solid var(--color-border);
	}

	.lap-count {
		font-size: 12px;
		color: var(--color-muted);
	}

	.chevron {
		width: 13px;
		height: 13px;
		color: var(--color-subtle);
		transition: transform 0.15s ease;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.lap {
		padding: 9px 8px;
		border-radius: var(--radius-sm, 6px);
		border-bottom: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--card-bg) 55%, transparent);
		cursor: pointer;
		transition: background 0.12s ease;
	}

	.laps .lap:last-child {
		border-bottom: none;
	}

	.lap:hover {
		background: var(--card-bg-hover);
	}

	.lap:focus-visible {
		outline: 1px solid var(--color-accent-border);
		outline-offset: -1px;
	}

	.lap-main {
		padding-left: 14px;
	}

	.lap-index {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 4px;
		background: var(--card-bg);
		border: 1px solid var(--color-border);
		font-size: 11px;
		color: var(--color-muted);
	}

	.meta.fastest,
	.meta.fastest svg,
	.meta.fastest .mono {
		color: var(--color-accent);
	}

	.lap-label {
		font-size: 13px;
		color: var(--color-text);
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
	}

	.badge.fav-badge {
		color: var(--color-accent);
		background: var(--color-accent-dim);
		border-color: var(--color-accent-border);
	}

	.badge.fav-badge svg {
		width: 18px;
		height: 18px;
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