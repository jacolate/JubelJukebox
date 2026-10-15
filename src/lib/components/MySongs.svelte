<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import type { GuestSongDTO } from "#lib/types.ts";
    import SongCover from "./SongCover.svelte";
    import StatusBadge from "./StatusBadge.svelte";

    let { songs }: { songs: GuestSongDTO[] } = $props();
</script>

{#if songs.length === 0}
    <p class="text-center text-lg opacity-70 py-16">{m.mine_empty()}</p>
{:else}
    <ul class="list bg-base-100 rounded-box shadow-md mb-6">
        {#each songs as song (song.trackId)}
            <li class="list-row items-center">
                <SongCover src={song.image} />
                <div class="min-w-0">
                    <div class="font-semibold truncate">{song.name}</div>
                    <div class="text-sm opacity-70 truncate">{song.artists}</div>
                    {#if song.votes > 1}
                        <div class="text-xs opacity-60">{song.votes === 2 ? m.mine_more_one() : m.mine_more_other({ count: song.votes - 1 })}</div>
                    {/if}
                </div>
                <StatusBadge status={song.status} />
            </li>
        {/each}
    </ul>
{/if}
