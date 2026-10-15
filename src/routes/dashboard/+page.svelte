<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { api, ApiError } from "#lib/api.ts";
    import AppHeader from "#lib/components/AppHeader.svelte";
    import Cog from "#lib/components/icons/Cog.svelte";
    import RequestCard from "#lib/components/RequestCard.svelte";
    import SettingsDialog from "#lib/components/SettingsDialog.svelte";
    import Tabs from "#lib/components/Tabs.svelte";
    import Toast from "#lib/components/Toast.svelte";
    import UndoToast from "#lib/components/UndoToast.svelte";
    import { connectLive } from "#lib/live.svelte.ts";
    import { showToast } from "#lib/toast.svelte.ts";
    import type { EventSettings, SongDTO, Status, TabItem } from "#lib/types.ts";

    let { data } = $props();

    let songs = $state<SongDTO[]>([]);
    // Starts with the server-rendered settings, then follows the live updates.
    // svelte-ignore state_referenced_locally
    let settings = $state<EventSettings>(data.settings);
    let settingsDialog: SettingsDialog;

    // --- tabs & sorting, kept in the URL ---
    type DashboardTab = "open" | "stashed" | "played";
    type Sort = "oldest" | "newest" | "votes";
    const tabStatus: Record<DashboardTab, Status> = { open: "PENDING", stashed: "STASHED", played: "PLAYED" };

    const tab = $derived.by((): DashboardTab => {
        const value = page.url.searchParams.get("tab");
        return value === "stashed" || value === "played" ? value : "open";
    });
    const sort = $derived.by((): Sort => {
        const value = page.url.searchParams.get("sort");
        return value === "newest" || value === "votes" ? value : "oldest";
    });

    function hrefFor(next: { tab?: DashboardTab; sort?: Sort }) {
        const params = new URLSearchParams({ tab: next.tab ?? tab, sort: next.sort ?? sort });
        return `?${params}`;
    }

    const counts = $derived({
        open: songs.filter((s) => s.status === "PENDING").length,
        stashed: songs.filter((s) => s.status === "STASHED").length,
        played: songs.filter((s) => s.status === "PLAYED").length,
    });
    const tabs = $derived<TabItem[]>([
        { key: "open", label: m.dashboard_tab_open(), href: hrefFor({ tab: "open" }), count: counts.open },
        { key: "stashed", label: m.dashboard_tab_stashed(), href: hrefFor({ tab: "stashed" }), count: counts.stashed },
        { key: "played", label: m.dashboard_tab_played(), href: hrefFor({ tab: "played" }), count: counts.played },
    ]);

    const visible = $derived.by(() => {
        const list = songs.filter((s) => s.status === tabStatus[tab]);
        // In "played", oldest/newest refer to when the song was played.
        const time = (s: SongDTO) => Date.parse(tab === "played" ? (s.playedAt ?? s.createdAt) : s.createdAt);
        if (sort === "votes") return list.sort((a, b) => b.votes - a.votes || time(a) - time(b));
        if (sort === "newest") return list.sort((a, b) => time(b) - time(a));
        return list.sort((a, b) => time(a) - time(b));
    });

    // --- live updates ---
    function upsert(song: SongDTO) {
        const index = songs.findIndex((s) => s.trackId === song.trackId);
        if (index === -1) songs.push(song);
        else songs[index] = song;
    }

    function remove(trackId: string) {
        songs = songs.filter((s) => s.trackId !== trackId);
    }

    onMount(() => {
        const live = connectLive(
            {
                init: (init) => {
                    songs = init.songs;
                    settings = init.settings;
                },
                song: ({ song }) => upsert(song),
                removed: ({ trackId }) => remove(trackId),
                settings: (update) => (settings = update.settings),
            },
            { onClosed: () => (window.location.href = "/admin") },
        );
        return live.close;
    });

    // --- actions with undo ---
    let undo = $state<{ message: string; run: () => Promise<unknown> } | null>(null);
    let undoTimer: ReturnType<typeof setTimeout> | undefined;

    function offerUndo(message: string, run: () => Promise<unknown>) {
        clearTimeout(undoTimer);
        undo = { message, run };
        undoTimer = setTimeout(() => (undo = null), 6000);
    }

    async function runUndo() {
        const action = undo;
        undo = null;
        clearTimeout(undoTimer);
        try {
            await action?.run();
        } catch (error) {
            console.error("Error:", error);
            showToast("alert-error", m.dashboard_undo_failed());
        }
    }

    const statusMessages: Record<Status, (params: { name: string }) => string> = {
        PLAYED: m.dashboard_marked_played,
        STASHED: m.dashboard_marked_stashed,
        PENDING: m.dashboard_marked_pending,
    };

    /** Long titles would make the undo toast cover half the screen on phones. */
    const short = (name: string) => (name.length > 40 ? `${name.slice(0, 38).trimEnd()}…` : name);

    async function changeStatus(song: SongDTO, status: Status) {
        if (song.status === status) return;
        try {
            const { previous } = await api.setStatus(song.trackId, status);
            offerUndo(statusMessages[status]({ name: short(song.name) }), () => api.setStatus(song.trackId, previous));
        } catch (error) {
            console.error("Error:", error);
            showToast("alert-error", m.dashboard_status_failed());
        }
    }

    async function deleteSong(song: SongDTO) {
        try {
            await api.deleteSong(song.trackId);
            remove(song.trackId);
            offerUndo(m.dashboard_deleted({ name: short(song.name) }), () => api.restoreSong(song.trackId));
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) remove(song.trackId);
            else {
                console.error("Error:", error);
                showToast("alert-error", m.dashboard_delete_failed());
            }
        }
    }

    const emptyMessages: Record<DashboardTab, () => string> = {
        open: m.dashboard_empty_open,
        stashed: m.dashboard_empty_stashed,
        played: m.dashboard_empty_played,
    };
</script>

<svelte:head>
    <title>{m.meta_dashboard_title()}</title>
    <meta name="description" content={m.meta_dashboard_description()} />
</svelte:head>

<section class="flex flex-col min-h-dvh">
    <Toast />

    <!-- On the dashboard the language switch lives in the settings dialog, so the header fits on phones. -->
    <AppHeader showLocaleSwitch={false}>
        {#snippet actions()}
            <div class="flex gap-2 sm:mt-4">
                <a class="btn btn-ghost hidden sm:inline-flex" href="/dashboard/recap">{m.dashboard_recap()}</a>
                <!-- Phones: icon only, so the header fits next to the title -->
                <button class="btn btn-primary max-sm:btn-square" aria-label={m.dashboard_settings()} onclick={() => settingsDialog.open()}>
                    <Cog class="w-6 h-6 sm:hidden" />
                    <span class="hidden sm:inline">{m.dashboard_settings()}</span>
                </button>
            </div>
        {/snippet}
    </AppHeader>

    <Tabs items={tabs} active={tab}>
        {#snippet extra()}
            <div class="flex items-center gap-2 py-1">
                {#if !settings.requestsOpen}
                    <span class="badge badge-warning">{m.dashboard_paused()}</span>
                {/if}
                <select
                    class="select select-sm w-auto my-1"
                    aria-label={m.dashboard_sort()}
                    value={sort}
                    onchange={(e) => (window.location.search = hrefFor({ sort: e.currentTarget.value as Sort }))}
                >
                    <option value="oldest">{m.dashboard_sort_oldest()}</option>
                    <option value="newest">{m.dashboard_sort_newest()}</option>
                    <option value="votes">{m.dashboard_sort_votes()}</option>
                </select>
            </div>
        {/snippet}
    </Tabs>

    <div class="flex flex-col justify-center">
        {#each visible as song (song.trackId)}
            <RequestCard
                {song}
                onplay={() => changeStatus(song, "PLAYED")}
                onstash={() => changeStatus(song, "STASHED")}
                ondelete={() => deleteSong(song)}
            />
        {:else}
            <p class="text-center text-lg opacity-70 py-16">{emptyMessages[tab]()}</p>
        {/each}
    </div>

    <UndoToast message={undo?.message ?? null} onundo={runUndo} />
    <SettingsDialog bind:this={settingsDialog} {settings} joinUrl={data.joinUrl} qrSvg={data.qrSvg} />
</section>
