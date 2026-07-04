<script lang="ts">
  import { setContext, onMount } from 'svelte';
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import './layout.css';
  import favicon from '$lib/assets/Novent.svg';
  import Splashscreen from '$lib/components/chrome/Splashscreen.svelte';
  import Sidebar from '$lib/components/chrome/Sidebar.svelte';
  import TopBar from '$lib/components/chrome/TopBar.svelte';
  import { DataState, APP_ZOOM_STEP, APP_ZOOM_DEFAULT } from '$lib/state/data.svelte';

  let { children } = $props();

  const data = new DataState();
  setContext('data', data);

  onMount(() => {
    data.start();
    return () => data.destroy();
  });

  // Drive the webview's real, native zoom instead of any CSS-based scaling
  // trick. `transform: scale()` only stretches an already-rasterized
  // texture (fast, but gets visibly softer the more you scale), and the
  // non-standard `zoom` CSS property doesn't reliably trigger a true
  // relayout across engines (WebKitGTK in particular). setZoom() calls
  // straight into the webview's built-in zoom (webkit_web_view_set_zoom_level
  // on Linux) — the exact same mechanism trackpad pinch-zoom already uses —
  // so it genuinely re-rasterizes text, strokes, and icons crisp at every
  // zoom level instead of magnifying a fixed-resolution bitmap.
  $effect(() => {
    getCurrentWebview().setZoom(data.appZoom);
  });

  // Global interface zoom shortcut — lives here (not per-route) since zoom now
  // applies to the whole shell, sidebar/topbar included.
  function handleKeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === '=' || e.key === '+') { e.preventDefault(); data.appZoom += APP_ZOOM_STEP; }
    else if (e.key === '-')             { e.preventDefault(); data.appZoom -= APP_ZOOM_STEP; }
    else if (e.key === '0')             { e.preventDefault(); data.appZoom = APP_ZOOM_DEFAULT; }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Splashscreen ready={data.loaded} />

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
  /* 
    FIX: Target true line-stroke icons. 
    Using 'geometricPrecision' instead of 'crispEdges' eliminates the pixel jaggedness 
    visible in image_af619a.png by forcing the engine to calculate clean fractional math 
    during webview native zoom scaling.
  */
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