<script lang="ts">
  import Icon from '$lib/components/chrome/Icon.svelte';

  interface Tab {
    id: string;
    label: string;
    active: boolean;
    closable: boolean;
    loading?: boolean;
  }

  interface Props {
    tabs: Tab[];
    onSelect: (id: string) => void;
    onNew: () => void;
    onClose: (id: string) => void;
  }

  let { tabs = [], onSelect, onNew, onClose }: Props = $props();
</script>

<div class="session-tabs" role="tablist">
  {#each tabs as tab (tab.id)}
    <div class="tab" class:active={tab.active} role="tab" aria-selected={tab.active}>
      <button type="button" class="label-btn" onclick={() => onSelect(tab.id)}>
        {#if tab.loading}
          <span class="spinner" aria-hidden="true"></span>
          <span class="label loading">Waiting for session…</span>
        {:else}
          <span class="label">{tab.label}</span>
        {/if}
      </button>
      {#if tab.closable}
        <button type="button" class="close" aria-label="Close tab" onclick={() => onClose(tab.id)}>
          <Icon name="close" size={10} />
        </button>
      {/if}
    </div>
  {/each}

  <button type="button" class="new" aria-label="New tab" onclick={() => onNew()}>
    <Icon name="plus" size={14} />
  </button>
</div>

<style>
  .session-tabs {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 40px;
    padding: 0 4px;
    background: transparent;
  }

  .session-tabs::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--color-border);
  }

  .tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    height: 28px;
    color: var(--color-muted);
    background: transparent;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    transition: color 0.12s ease, background 0.12s ease;
  }

  .tab:hover {
    color: var(--color-text);
    border-color: var(--color-border-md);
  }

  .tab.active,
  .tab.loading {
    z-index: 1;
    margin-bottom: -1px;
    color: var(--color-text);
    background: var(--color-bg);
    border-color: var(--color-border);
    border-bottom: 1px solid var(--color-bg);
  }

  .tab.active::before,
  .tab.active::after,
  .tab.loading::before,
  .tab.loading::after {
    content: '';
    position: absolute;
    bottom: 0;
    width: 8px;
    height: 8px;
    pointer-events: none;
  }

  .tab.active::before,
  .tab.loading::before {
    left: -8px;
    background:
      radial-gradient(circle at 0 0, transparent 7px, var(--color-border) 7px, var(--color-border) 8px, transparent 8px),
      radial-gradient(circle at 0 0, var(--color-bg) 7px, transparent 7px);
  }

  .tab.active::after,
  .tab.loading::after {
    right: -8px;
    background:
      radial-gradient(circle at 100% 0, transparent 7px, var(--color-border) 7px, var(--color-border) 8px, transparent 8px),
      radial-gradient(circle at 100% 0, var(--color-bg) 7px, transparent 7px);
  }

  .label-btn {
    display: inline-flex;
    align-items: center;
    height: 100%;
    padding: 0 8px 3px 14px;
    background: none;
    border: none;
    color: inherit;
    font-family: var(--font-sans);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
  }

  .label {
    display: block;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .label.loading {
    color: var(--color-subtle);
    font-style: italic;
  }

  .spinner {
    flex: 0 0 auto;
    width: 10px;
    height: 10px;
    margin-right: 6px;
    border-radius: 50%;
    border: 1.5px solid var(--color-border-md);
    border-top-color: var(--color-accent);
    animation: tab-spin 0.7s linear infinite;
  }

  @keyframes tab-spin {
    to { transform: rotate(360deg); }
  }

  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-right: 8px;
    padding: 0;
    color: var(--color-subtle);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.12s ease, color 0.12s ease, background 0.12s ease;
  }

  .tab:hover .close,
  .tab.active .close { opacity: 1; }

  .close:hover {
    color: var(--color-text);
    background: var(--color-panel);
  }

  .new {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-bottom: 2px;
    margin-left: 2px;
    color: var(--color-muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color 0.12s ease, background 0.12s ease;
  }

  .new:hover {
    color: var(--color-text);
    background: var(--card-bg);
  }
</style>