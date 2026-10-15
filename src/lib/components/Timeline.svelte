<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import { getLocale } from "#lib/paraglide/runtime.js";
    import type { TimelineEntry } from "#lib/types.ts";
    import SongCover from "./SongCover.svelte";

    let { entries }: { entries: TimelineEntry[] } = $props();

    const time = new Intl.DateTimeFormat(getLocale(), { hour: "2-digit", minute: "2-digit" });
</script>

{#if entries.length === 0}
    <p class="text-center text-lg opacity-70 py-16">{m.timeline_empty()}</p>
{:else}
    <ul class="list bg-base-100 rounded-box shadow-md mb-6">
        {#each entries as entry (entry.trackId)}
            <li class="list-row items-center">
                <time class="text-sm tabular-nums opacity-70" datetime={entry.playedAt}>{time.format(new Date(entry.playedAt))}</time>
                <div class="flex items-center gap-3 min-w-0">
                    <SongCover src={entry.image} />
                    <div class="min-w-0">
                        <div class="font-semibold truncate">{entry.name}</div>
                        <div class="text-sm opacity-70 truncate">{entry.artists}</div>
                        {#if entry.requesters?.length}
                            <div class="text-xs opacity-60 truncate">{m.timeline_requested_by({ names: entry.requesters.join(", ") })}</div>
                        {/if}
                    </div>
                </div>
            </li>
        {/each}
    </ul>
{/if}
