<script lang="ts">
	import { getVersion } from '@tauri-apps/api/app';
	import { open } from '@tauri-apps/plugin-shell';
	import {
		listReleases, downloadAndInstallUpdate, restartApp,
		onUpdateProgress, onUpdateLaunching,
		type ReleaseInfo
	} from '$lib/api/updater';
	import { getBackendInfo, type BackendInfo } from '$lib/api/backend';

	type UpdatePhase = 'idle' | 'downloading' | 'launching' | 'ready' | 'error';

	let appVersion  = $state('…');
	let backendInfo = $state<BackendInfo | null>(null);

	let releases        = $state<ReleaseInfo[]>([]);
	let releasesLoading = $state(false);
	let releasesError   = $state<string | null>(null);
	let expandedTag     = $state<string | null>(null);
	let loaded          = false;

	let updatePhase = $state<UpdatePhase>('idle');
	let updateError = $state<string | null>(null);
	let dlBytes      = $state(0);
	let dlTotal      = $state<number | null>(null);
	let targetTag    = $state<string | null>(null);

	$effect(() => {
		getVersion().then(v => appVersion = v).catch(() => appVersion = 'unknown');
		getBackendInfo().then(b => backendInfo = b);
		if (!loaded) { loaded = true; loadReleases(); }
	});

	$effect(() => {
		let unlisten: (() => void) | undefined;
		onUpdateProgress(p => { dlBytes = p.downloaded; dlTotal = p.total; }).then(fn => unlisten = fn);
		return () => unlisten?.();
	});

	$effect(() => {
		let unlisten: (() => void) | undefined;
		onUpdateLaunching(() => { updatePhase = 'launching'; }).then(fn => unlisten = fn);
		return () => unlisten?.();
	});

	async function loadReleases() {
		releasesLoading = true; releasesError = null;
		try {
			releases = await listReleases();
		} catch (e) {
			releasesError = e instanceof Error ? e.message : String(e);
		} finally {
			releasesLoading = false;
		}
	}

	async function installUpdate(release: ReleaseInfo) {
		if (updatePhase === 'downloading') return;
		targetTag = release.tag_name; updatePhase = 'downloading'; updateError = null;
		dlBytes = 0; dlTotal = null;
		try {
			await downloadAndInstallUpdate(release.tag_name);
			updatePhase = 'ready';
		} catch (e) {
			updateError = e instanceof Error ? e.message : String(e);
			updatePhase = 'error';
		}
	}

	function cancelUpdate() {
		updatePhase = 'idle'; updateError = null; targetTag = null; dlBytes = 0; dlTotal = null;
	}

	function stripV(v: string) { return v.replace(/^v/, ''); }
	function isCurrentVersion(tag: string) { return stripV(tag) === appVersion; }

	function parseSemver(v: string) { return stripV(v).split('.').map(Number); }
	function compareSemver(a: string, b: string) {
		const pa = parseSemver(a), pb = parseSemver(b);
		for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
		return 0;
	}

	const onLatestVersion = $derived((() => {
		if (releasesLoading || releases.length === 0 || !appVersion || appVersion === '…') return false;
		const sorted = releases.slice().sort((a, b) => compareSemver(a.tag_name, b.tag_name));
		return compareSemver(appVersion, sorted[0].tag_name) >= 0;
	})());

	function fmtDate(iso: string) {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function fmtBytes(bytes: number) {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(i >= 2 ? 1 : 0)} ${units[i]}`;
	}

	function fmtProgress() {
		return dlTotal
			? `${fmtBytes(dlBytes)} / ${fmtBytes(dlTotal)} (${Math.round((dlBytes / dlTotal) * 100)}%)`
			: fmtBytes(dlBytes);
	}
</script>

<div class="group">
	<span class="group-label">Novent</span>
	<div class="box">
		<div class="row" style="flex-direction:column;align-items:flex-start;gap:4px">
			<span style="font-size:13px;font-weight:500;color:var(--color-text)">A telemetry & analysis tool for Assetto Corsa.</span>
			<span class="row-sub">Built with Tauri + Svelte.</span>
		</div>
	</div>
</div>

<div class="group">
	<span class="group-label">Version</span>
	<div class="box">
		<div class="row">
			<div class="row-label">
				<span>Installed</span>
				<span class="row-sub">v{appVersion}</span>
			</div>
			<button class="reset-btn" onclick={() => { releasesError = null; loadReleases(); }} disabled={releasesLoading}>
				{releasesLoading ? 'Loading…' : 'Refresh'}
			</button>
		</div>

		{#if onLatestVersion}
			<div class="row">
				<span class="row-sub" style="color:var(--color-accent)">✓ You're on the latest version.</span>
			</div>
		{/if}

		{#if updatePhase === 'downloading'}
			<div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
				<div class="progress-bar"><div class="progress-fill" style="width:{dlTotal ? Math.round((dlBytes / dlTotal) * 100) : 0}%"></div></div>
				<div style="display:flex;justify-content:space-between">
					<span class="row-sub">Downloading {targetTag}…</span>
					<span class="row-sub">{fmtProgress()}</span>
				</div>
			</div>
		{/if}

		{#if updatePhase === 'launching'}
			<div class="row"><span class="row-sub">Launching installer for {targetTag}…</span></div>
		{/if}

		{#if updatePhase === 'ready'}
			<div class="row">
				<span class="row-sub">{targetTag} downloaded — restart to finish installing.</span>
				<div style="display:flex;gap:6px">
					<button class="reset-btn accent" onclick={restartApp}>Restart now</button>
					<button class="reset-btn" onclick={cancelUpdate}>✕</button>
				</div>
			</div>
		{/if}

		{#if updatePhase === 'error'}
			<div class="row">
				<span class="row-sub" style="color:var(--color-error, #e5484d)">{updateError}</span>
				<button class="reset-btn" onclick={cancelUpdate}>Dismiss</button>
			</div>
		{/if}
	</div>
</div>

<div class="group">
	<span class="group-label">Backend</span>
	<div class="box">
		{#if backendInfo}
			<div class="row">
				<div class="row-label">
					<span>Version</span>
					<span class="row-sub">{backendInfo.version}{backendInfo.buildType ? ` (${backendInfo.buildType})` : ''}</span>
				</div>
			</div>
		{:else}
			<div class="row">
				<span class="row-sub">Not available yet — backend doesn't report version info.</span>
			</div>
		{/if}
	</div>
</div>

<div class="group">
	<span class="group-label">Releases</span>
	<div class="box" style="max-height:220px;overflow-y:auto">
		{#if releasesError}
			<div class="row"><span class="row-sub" style="color:var(--color-error, #e5484d)">{releasesError}</span></div>
		{:else if releasesLoading}
			<div class="row"><span class="row-sub">Fetching releases…</span></div>
		{:else if releases.length === 0}
			<div class="row"><span class="row-sub">No releases found.</span></div>
		{:else}
			{#each releases as release}
				{@const isCurrent    = isCurrentVersion(release.tag_name)}
				{@const isExpanded   = expandedTag === release.tag_name}
				{@const isTarget     = targetTag === release.tag_name}
				{@const isInstalling = isTarget && updatePhase === 'downloading'}
				<div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
					<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
						<div class="row-label" style="flex-direction:row;align-items:center;gap:8px">
							<span style="font-size:13px;font-weight:500;color:var(--color-text)">{release.tag_name}</span>
							{#if isCurrent}<span class="row-sub" style="color:var(--color-accent)">installed</span>{/if}
							{#if release.published_at}<span class="row-sub">{fmtDate(release.published_at)}</span>{/if}
						</div>
						<div style="display:flex;gap:6px">
							{#if release.body.trim()}
								<button class="reset-btn" onclick={() => expandedTag = isExpanded ? null : release.tag_name}>
									{isExpanded ? 'Hide' : 'Changelog'}
								</button>
							{/if}
							{#if !isCurrent}
								<button
									class="reset-btn"
									class:accent={!isInstalling}
									disabled={updatePhase === 'downloading'}
									onclick={() => installUpdate(release)}
								>
									{isInstalling ? 'Downloading…' : 'Install'}
								</button>
							{/if}
						</div>
					</div>
					{#if isExpanded && release.body.trim()}
						<pre style="font-family:var(--font-mono);font-size:11px;color:var(--color-muted);white-space:pre-wrap;margin:0">{release.body.trim()}</pre>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<div class="group">
	<span class="group-label">Links</span>
	<div class="box">
		<div class="row" style="flex-direction:column;align-items:flex-start;gap:8px">
			<button class="link-btn" onclick={() => open('https://github.com/Novent-Project/Novent')}>GitHub →</button>
		</div>
	</div>
</div>

<style>
	.group { display: flex; flex-direction: column; gap: 8px; }
	.group-label {
		font-size: 10px; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.10em; color: var(--color-subtle); padding: 0 2px;
	}
	.box {
		display: flex; flex-direction: column; border-radius: var(--radius-sm);
		background: var(--card-bg); box-shadow: inset 0 0 0 1px var(--color-border);
		overflow: hidden;
	}
	.row {
		display: flex; align-items: center; justify-content: space-between;
		gap: 18px; padding: 15px 18px; border-bottom: 1px solid var(--color-border);
	}
	.row:last-child { border-bottom: none; }
	.row-label { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
	.row-label span:first-child { font-size: 13px; font-weight: 500; color: var(--color-text); }
	.row-sub { font-size: 11px; font-family: var(--font-mono); color: var(--color-muted); }
	.reset-btn {
		padding: 0 11px; height: 23px; border-radius: 5px; background: none;
		border: 1px solid var(--color-border); cursor: pointer; font-family: inherit;
		font-size: 10px; font-weight: 500; color: var(--color-muted);
		transition: color 0.12s, border-color 0.12s; flex-shrink: 0;
	}
	.reset-btn:hover { color: var(--color-text); border-color: var(--color-border-md, var(--color-border)); }
	.reset-btn:disabled { opacity: 0.5; cursor: default; }
	.reset-btn.accent { color: var(--color-accent); border-color: var(--color-accent); }
	.link-btn {
		background: none; border: none; padding: 0; cursor: pointer;
		font-family: inherit; font-size: 13px; color: var(--color-accent); text-decoration: none;
	}
	.link-btn:hover { text-decoration: underline; }
	.progress-bar {
		width: 100%; height: 5px; border-radius: 3px; background: var(--color-panel);
		box-shadow: inset 0 0 0 1px var(--color-border); overflow: hidden;
	}
	.progress-fill { height: 100%; background: var(--color-accent); transition: width 0.15s ease; }
</style>