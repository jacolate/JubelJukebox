<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import BrandTitle from "#lib/components/BrandTitle.svelte";
    import SongCover from "#lib/components/SongCover.svelte";

    let { data } = $props();
    const { recap } = $derived(data);
</script>

<svelte:head>
    <title>{m.meta_recap_title()}</title>
</svelte:head>

<!-- Phones: print button on its own row, the three secondary actions below -->
<div class="print:hidden grid grid-cols-3 sm:flex sm:flex-wrap sm:justify-center gap-2 p-3 sm:p-4 bg-base-200 shadow-md">
    <a href="/dashboard" class="btn btn-ghost">{m.common_back()}</a>
    <button class="btn btn-primary col-span-3 order-first sm:order-none" onclick={() => window.print()}>{m.recap_print()}</button>
    <a href="/dashboard/export.csv" class="btn" download>CSV</a>
    <a href="/dashboard/export.json" class="btn" download>JSON</a>
</div>

<article class="recap mx-auto w-11/12 max-w-3xl py-10 space-y-10">
    <header class="flex flex-col items-center gap-3 text-center">
        <BrandTitle />
        <h2 class="text-2xl font-bold">{m.recap_title()}</h2>
        {#if data.period}
            <p class="opacity-70">{data.period}</p>
        {/if}
    </header>

    <div class="stats max-sm:grid-flow-row max-sm:grid-cols-2 shadow w-full">
        <div class="stat place-items-center">
            <div class="stat-title">{m.recap_requests()}</div>
            <div class="stat-value">{recap.votes}</div>
        </div>
        <div class="stat place-items-center">
            <div class="stat-title">{m.recap_songs()}</div>
            <div class="stat-value">{recap.songs}</div>
        </div>
        <div class="stat place-items-center">
            <div class="stat-title">{m.recap_played()}</div>
            <div class="stat-value">{recap.played}</div>
        </div>
        <div class="stat place-items-center">
            <div class="stat-title">{m.recap_guests()}</div>
            <div class="stat-value">{recap.guests}</div>
        </div>
    </div>

    <div class="grid gap-6 sm:grid-cols-3">
        <section>
            <h3 class="font-bold mb-2">{m.recap_top_artists()}</h3>
            <ol class="list-decimal list-inside space-y-1">
                {#each recap.topArtists as artist}
                    <li>{artist.name} <span class="opacity-60">({artist.count})</span></li>
                {:else}
                    <li class="list-none opacity-60">–</li>
                {/each}
            </ol>
        </section>
        <section>
            <h3 class="font-bold mb-2">{m.recap_top_songs()}</h3>
            <ol class="list-decimal list-inside space-y-1">
                {#each recap.topSongs as song}
                    <li>{song.name} <span class="opacity-60">({song.votes}×)</span></li>
                {:else}
                    <li class="list-none opacity-60">–</li>
                {/each}
            </ol>
        </section>
        <section>
            <h3 class="font-bold mb-2">{m.recap_top_guests()}</h3>
            <ol class="list-decimal list-inside space-y-1">
                {#each recap.topGuests as guest}
                    <li>{guest.name} <span class="opacity-60">({guest.count})</span></li>
                {:else}
                    <li class="list-none opacity-60">–</li>
                {/each}
            </ol>
        </section>
    </div>

    <section>
        <h3 class="font-bold mb-3">{m.recap_timeline()}</h3>
        {#if data.timeline.length === 0}
            <p class="opacity-60">{m.recap_nothing_played()}</p>
        {:else}
            <table class="table [&_td]:max-sm:px-2">
                <tbody>
                    {#each data.timeline as song (song.trackId)}
                        <tr>
                            <td class="w-0 tabular-nums opacity-70">{song.time}</td>
                            <td class="w-0 px-0"><SongCover src={song.image} /></td>
                            <td class="break-words">
                                <div class="font-semibold">{song.name}</div>
                                <div class="text-sm opacity-70">{song.artists}</div>
                                <div class="sm:hidden text-xs opacity-60 mt-1">{song.requesters.join(", ")}</div>
                            </td>
                            <td class="hidden sm:table-cell text-sm opacity-70 text-right">{song.requesters.join(", ")}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </section>
</article>

<style>
    @media print {
        :global(html, body) {
            background: white !important;
            color: black !important;
        }
        .recap {
            width: 100%;
            max-width: none;
            padding-top: 0;
        }
        .recap :global(tr) {
            break-inside: avoid;
        }
    }
</style>
