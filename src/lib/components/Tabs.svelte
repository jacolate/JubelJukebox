<script lang="ts">
    import type { Snippet } from "svelte";
    import type { TabItem } from "#lib/types.ts";

    let { items, active, extra }: { items: TabItem[]; active: string; extra?: Snippet } = $props();
</script>

<div class="flex flex-wrap items-center justify-center gap-x-4 bg-base-100 shadow-sm">
    <div role="tablist" class="tabs tabs-border justify-center">
        {#each items as item (item.key)}
            <a
                role="tab"
                href={item.href}
                class="tab gap-2"
                class:tab-active={active === item.key}
                aria-selected={active === item.key}
                data-sveltekit-replacestate
                data-sveltekit-noscroll
            >
                {item.label}
                {#if item.count}<span class="badge badge-sm">{item.count}</span>{/if}
            </a>
        {/each}
    </div>
    {@render extra?.()}
</div>
