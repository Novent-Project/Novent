<script lang="ts">
  import { setContext, onMount } from 'svelte';
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import '@fontsource-variable/inter';
  import '@fontsource-variable/jetbrains-mono';
  import './layout.css';
  import favicon from '$lib/assets/Novent.svg';
  import Splashscreen from '$lib/components/chrome/Splashscreen.svelte';
  import Sidebar from '$lib/components/chrome/Sidebar.svelte';
  import TopBar from '$lib/components/chrome/TopBar.svelte';
  import Settings from '$lib/components/settings/Settings.svelte';
  import { DataState, APP_ZOOM_STEP } from '$lib/state/data.svelte';
  import { prefs } from '$lib/state/prefs.svelte';

  let { children } = $props();

  const data = new DataState();
  setContext('data', data);

  onMount(() => {
    data.start();

    let unsub: (() => void) | null = null;
    const watchDpr = () => {
      unsub?.();
      const current = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const onChange = () => { data.refreshMonitorZoom(); watchDpr(); };
      current.addEventListener('change', onChange);
      unsub = () => current.removeEventListener('change', onChange);
    };
    watchDpr();

    return () => { data.destroy(); unsub?.(); };
  });

  $effect(() => {
    getCurrentWebview().setZoom(data.appZoom);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === '=' || e.key === '+') { e.preventDefault(); data.appZoom += APP_ZOOM_STEP; }
    else if (e.key === '-')             { e.preventDefault(); data.appZoom -= APP_ZOOM_STEP; }
    else if (e.key === '0')             { e.preventDefault(); data.appZoomAuto = true; }
  }
</script>

<svelte:window onkeydown={handleKeydown} onresize={() => data.refreshMonitorZoom()} />

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Splashscreen ready={data.loaded} />

{#if prefs.settingsOpen}
  <Settings
    bind:gamePaths={data.gamePaths}
    bind:appZoom={data.appZoom}
    bind:appZoomAuto={data.appZoomAuto}
    bind:traceZoom={prefs.traceZoom}
    bind:graphPlacement={prefs.graphPlacement}
    onClose={() => (prefs.settingsOpen = false)}
  />
{/if}

<div class="frame">
  <div class="padding">
    <div class="shell">
      <Sidebar />
      <div class="shell-right">
        <TopBar detection={data.detection} />
        <main class="shell-main">
          {@render children()}
        </main>
      </div>
    </div>
  </div>
</div>

<style>
  :global(svg) {
    shape-rendering: geometricPrecision !important;
  }

  :global(svg path), :global(svg polyline), :global(svg line), :global(svg circle) {
    vector-effect: non-scaling-stroke !important;
  }

  .frame {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: #000;
  }

  .padding {
    display: flex;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 10px;
  }

  .shell {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
    border-radius: var(--radius-card);
    overflow: hidden;
    border: 1px solid var(--color-border-md);
    background: var(--color-bg);
  }

  .shell-right {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .shell-main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
</style>