<script lang="ts">
    import type { Snippet } from "svelte";
    import MusicNote from "./icons/MusicNote.svelte";
    import LocaleSwitch from "./LocaleSwitch.svelte";

    let { actions, showLocaleSwitch = true }: { actions?: Snippet; showLocaleSwitch?: boolean } = $props();
</script>

<!-- Very small phones (< 360px) get a slightly smaller logo, so the actions still fit. -->
<div class="flex items-center p-4 max-[359px]:px-3 gap-3 bg-base-200 shadow-md justify-between">
    <div class="flex items-center gap-3 max-[359px]:gap-2">
        <MusicNote class="w-10 h-10 max-[359px]:w-8 max-[359px]:h-8 text-orange-600" />
        <h1 class="text-4xl max-[359px]:text-3xl uppercase font-bold">Jukebox</h1>
    </div>
    <div class="flex items-center gap-3">
        {@render actions?.()}
        {#if showLocaleSwitch}<LocaleSwitch />{/if}
    </div>
</div>
