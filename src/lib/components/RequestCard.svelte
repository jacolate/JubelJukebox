<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import { trackUrl } from "#lib/spotify.ts";
    import type { SongDTO } from "#lib/types.ts";
    import Check from "./icons/Check.svelte";
    import Clock from "./icons/Clock.svelte";
    import Spotify from "./icons/Spotify.svelte";
    import Trash from "./icons/Trash.svelte";
    import SongCover from "./SongCover.svelte";
    import StatusBadge from "./StatusBadge.svelte";

    let {
        song,
        onplay,
        onstash,
        ondelete
    }: {
        song: SongDTO;
        onplay: () => void;
        onstash: () => void;
        ondelete: () => void;
    } = $props();

    const others = $derived(song.requesters.length - 1);

    function openSong() {
        // The link is built from the validated track id, never taken from user input.
        const url = trackUrl(song.trackId);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
</script>

<div class="card flex shadow-xl my-4 sm:m-5 mx-auto w-11/12 sm:w-3/4"
    class:bg-base-200={song.status === "STASHED"}
    class:bg-base-300={song.status === "PLAYED"}>
    <div class="card-body max-sm:[--card-p:1.25rem] flex-col sm:flex-row justify-between items-start sm:items-center m-1 gap-3">
        <div class="flex items-start sm:items-center gap-4 min-w-0">
            <SongCover src={song.image} size={56} />
            <div class="min-w-0">
                <p class="overflow-hidden break-words"><strong>{m.card_song()}</strong> {song.name}</p>
                <p class="overflow-hidden break-words"><strong>{m.card_artist()}</strong> {song.artists}</p>
                <p title={song.requesters.join(", ")}>
                    <strong>{m.card_requested_by()}</strong>
                    {song.requesters[0] ?? ""}{#if others > 0}{" "}<span class="opacity-70">{others === 1 ? m.card_others_one() : m.card_others_other({ count: others })}</span>{/if}
                </p>
            </div>
        </div>
        <div class="flex flex-row flex-wrap justify-start sm:justify-center items-center gap-2">
            <!-- On small screens the badges get their own line, so the four actions fit in one row. -->
            <div class="w-full sm:w-auto flex gap-2">
                <StatusBadge status={song.status} />
                {#if song.votes > 1}
                    <div class="badge badge-ghost whitespace-nowrap" title={m.card_votes()}>{song.votes} ×</div>
                {/if}
            </div>

            <button class="touch-manipulation" aria-label={m.card_open_spotify()} onclick={openSong}>
                <Spotify class="action p-1" width="50" height="50" />
            </button>
            <button aria-label={m.card_mark_played()} onclick={onplay}>
                <Check class="action text-black bg-success dark:text-success dark:bg-transparent p-1" width="50" height="50" />
            </button>
            <button aria-label={m.card_stash()} onclick={onstash}>
                <Clock class="action bg-warning dark:text-warning dark:bg-transparent p-1" width="50" height="50" />
            </button>
            <button aria-label={m.card_delete()} onclick={ondelete}>
                <Trash class="action text-black bg-error dark:text-error dark:bg-transparent p-1" width="50" height="50" />
            </button>
        </div>
    </div>
</div>

<style>
    /* The icon class lives in child components, hence :global. */
    :global(svg.action) {
        cursor: pointer;
        transition: background-color 0.3s;
        border-radius: 50%;
    }

    :global(svg.action:hover) {
        background-color: gainsboro;
    }
</style>
