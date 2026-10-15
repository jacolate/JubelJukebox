<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import type { SearchResult } from "#lib/types.ts";
    import SongCover from "./SongCover.svelte";

    let { results, disabled = false, onselect }: { results: SearchResult[]; disabled?: boolean; onselect: (result: SearchResult) => void } = $props();

    const blockedLabels = {
        mine: m.search_state_mine,
        played: m.search_state_played,
        unavailable: m.search_state_unavailable,
    } as const;
</script>

<div class="mb-6">
    <div class="overflow-x-auto">
        <table class="table table-zebra w-full [&_td]:px-2 sm:[&_td]:px-4 [&_th]:px-2 sm:[&_th]:px-4">
            <thead>
                <tr>
                    <th class="w-0 px-2 sm:px-4"><span class="sr-only">{m.search_col_cover()}</span></th>
                    <th class="text-xs sm:text-sm md:text-base">{m.search_col_title()}</th>
                    <th class="hidden sm:table-cell text-xs sm:text-sm md:text-base">{m.search_col_artist()}</th>
                </tr>
            </thead>
            <tbody>
                {#each results as result (result.trackId)}
                    <tr>
                        <td class="px-2 sm:px-4"><SongCover src={result.image} /></td>
                        <td class="text-sm md:text-base break-words">
                            <!-- On phones the artist sits below the title instead of in its own column. -->
                            <span class="line-clamp-3 sm:line-clamp-none">{result.name}</span>
                            <span class="sm:hidden text-xs opacity-70 line-clamp-2">{result.artists}</span>
                        </td>
                        <td class="hidden sm:table-cell text-xs sm:text-sm md:text-base">{result.artists}</td>
                        <td class="text-right pl-0 sm:pl-4">
                            {#if result.state === "new" || result.state === "requested"}
                                <button
                                    class="btn btn-info btn-outline btn-sm text-xs sm:text-sm whitespace-nowrap"
                                    {disabled}
                                    title={result.state === "requested" ? m.search_votes_title({ count: result.votes }) : undefined}
                                    onclick={() => onselect(result)}>{result.state === "requested" ? m.search_vote() : m.search_request()}</button
                                >
                            {:else}
                                <button class="btn btn-sm text-xs sm:text-sm whitespace-nowrap" disabled>{blockedLabels[result.state]()}</button>
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
