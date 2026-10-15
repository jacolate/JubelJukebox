<script lang="ts">
    import { isSpotifyImageUrl } from "#lib/spotify.ts";
    import MusicNote from "./icons/MusicNote.svelte";

    let { src, size = 40 }: { src: string | null; size?: number } = $props();
</script>

<!-- The placeholder sits underneath the image: if the image fails to load, it simply stays visible
     (no onerror handler, which would be an inline handler blocked by the CSP during SSR). -->
<div class="relative rounded shrink-0 overflow-hidden bg-base-300" style:width="{size}px" style:height="{size}px">
    <MusicNote class="absolute inset-1/4 w-1/2 h-1/2 opacity-40" />
    {#if src && isSpotifyImageUrl(src)}
        <img {src} alt="" width={size} height={size} loading="lazy" referrerpolicy="no-referrer" class="absolute inset-0 w-full h-full object-cover" />
    {/if}
</div>
