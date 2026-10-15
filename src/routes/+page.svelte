<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { api, ApiError } from "#lib/api.ts";
    import AppHeader from "#lib/components/AppHeader.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import MySongs from "#lib/components/MySongs.svelte";
    import SearchResults from "#lib/components/SearchResults.svelte";
    import Tabs from "#lib/components/Tabs.svelte";
    import Timeline from "#lib/components/Timeline.svelte";
    import Toast from "#lib/components/Toast.svelte";
    import { connectLive } from "#lib/live.svelte.ts";
    import { showToast, type ToastType } from "#lib/toast.svelte.ts";
    import type { GuestSongDTO, GuestTab, PublicSettings, RejectReason, SearchResult, TabItem, TimelineEntry } from "#lib/types.ts";

    const SEARCH_DELAY_MS = 350;

    let searchQuery = $state("");
    let results = $state<SearchResult[]>([]);
    let selected = $state<SearchResult | null>(null);
    let confirmDialog: ConfirmDialog;

    let mine = $state<GuestSongDTO[]>([]);
    let timeline = $state<TimelineEntry[] | null>(null);
    let settings = $state<PublicSettings>({ requestsOpen: true, maxOpenPerGuest: 0, showNames: false, showTimeline: true });

    const tab = $derived.by((): GuestTab => {
        const value = page.url.searchParams.get("tab");
        if (value === "mine") return "mine";
        if (value === "played" && settings.showTimeline) return "played";
        return "search";
    });

    const tabs = $derived<TabItem[]>([
        { key: "search", label: m.tab_search(), href: "?tab=search" },
        { key: "mine", label: m.tab_mine(), href: "?tab=mine", count: mine.length },
        ...(settings.showTimeline ? [{ key: "played", label: m.tab_played(), href: "?tab=played" }] : []),
    ]);

    onMount(() => {
        const live = connectLive(
            {
                "guest-init": (data) => {
                    mine = data.mine;
                    timeline = data.timeline;
                    settings = data.settings;
                },
                mine: ({ song }) => {
                    const index = mine.findIndex((s) => s.trackId === song.trackId);
                    if (index === -1) mine.unshift(song);
                    else mine[index] = song;
                },
                "mine-removed": ({ trackId }) => (mine = mine.filter((s) => s.trackId !== trackId)),
                timeline: (data) => (timeline = data.timeline),
                "public-settings": (data) => (settings = data.settings),
            },
            { onClosed: () => (window.location.href = "/login") },
        );
        return live.close;
    });

    // --- search: starts while typing, older requests are aborted ---
    let searchTimer: ReturnType<typeof setTimeout> | undefined;
    let searchController: AbortController | undefined;

    function scheduleSearch() {
        clearTimeout(searchTimer);
        if (searchQuery.trim().length < 2) {
            searchController?.abort();
            results = [];
            return;
        }
        searchTimer = setTimeout(() => searchMusic(searchQuery), SEARCH_DELAY_MS);
    }

    async function searchMusic(query: string) {
        clearTimeout(searchTimer);
        const q = query.trim();
        if (!q) return;
        searchController?.abort();
        searchController = new AbortController();
        try {
            results = await api.search(q, searchController.signal);
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            console.error("Error:", error);
            showToast("alert-error", m.search_unavailable());
        }
    }

    // --- requests ---
    const rejectMessages: Record<RejectReason, [ToastType, () => string]> = {
        paused: ["alert-warning", m.reject_paused],
        played: ["alert-info", m.reject_played],
        unavailable: ["alert-warning", m.reject_unavailable],
        blocked: ["alert-warning", m.reject_unavailable],
        explicit: ["alert-warning", m.reject_explicit],
        limit: ["alert-warning", m.reject_limit],
    };

    async function sendSongRequest(result: SearchResult) {
        try {
            const { result: outcome } = await api.requestSong(result.trackId);
            if (outcome === "created") showToast("alert-success", m.request_created());
            else if (outcome === "voted") showToast("alert-success", m.request_voted());
            else showToast("alert-info", m.request_already());
        } catch (error) {
            if (error instanceof ApiError && error.reason) {
                const [type, message] = rejectMessages[error.reason];
                showToast(type, message());
            } else {
                console.error("Error:", error);
                showToast("alert-error", m.common_error());
            }
        }
    }

    function openModal(result: SearchResult) {
        selected = result;
        confirmDialog.open();
    }

    function handleConfirm() {
        if (selected) sendSongRequest(selected);
        results = [];
        selected = null;
        searchQuery = "";
    }
</script>

<svelte:head>
    <title>{m.meta_guest_title()}</title>
    <meta name="description" content={m.meta_guest_description()} />
</svelte:head>

<section class="flex flex-col min-h-dvh">
    <Toast />

    <ConfirmDialog bind:this={confirmDialog} title={m.confirm_title()} cancelLabel={m.confirm_no()} confirmLabel={m.confirm_yes()} onconfirm={handleConfirm}>
        {#if selected?.state === "requested"}
            {m.confirm_vote({ name: selected.name, count: selected.votes })}
        {:else}
            {m.confirm_request({ name: selected?.name ?? "" })}
        {/if}
    </ConfirmDialog>

    <AppHeader />
    <Tabs items={tabs} active={tab} />

    <div class="flex flex-col grow self-center mt-10 w-11/12 md:w-5/12">
        {#if !settings.requestsOpen}
            <div role="status" class="alert alert-warning mb-6">{m.guest_paused()}</div>
        {/if}

        {#if tab === "search"}
            <div>
                <div class="flex flex-col items-center justify-center mb-4">
                    <h1 class="uppercase font-bold text-2xl text-gray-700">
                        {m.search_heading()}
                    </h1>
                </div>
                <label class="gap-2 flex items-center w-full mb-4">
                    <input
                        type="search"
                        bind:value={searchQuery}
                        class="input input-bordered flex-grow p-2"
                        placeholder={m.search_placeholder()}
                        aria-label={m.search_label()}
                        autocomplete="off"
                        enterkeyhint="search"
                        oninput={scheduleSearch}
                        onkeydown={(e) => e.key === "Enter" && searchMusic(searchQuery)}
                    />
                    <button onclick={() => searchMusic(searchQuery)} class="btn btn-primary">{m.search_submit()}</button>
                </label>
            </div>

            {#if results.length > 0}
                <SearchResults {results} disabled={!settings.requestsOpen} onselect={openModal} />
            {:else}
                <div class="flex grow justify-center items-center pb-24">
                    <h1
                        class="mb-4 text-xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-5xl dark:text-white"
                    >
                        {m.search_empty()}
                    </h1>
                </div>
            {/if}
        {:else if tab === "mine"}
            <MySongs songs={mine} />
        {:else}
            <Timeline entries={timeline ?? []} />
        {/if}
    </div>
</section>
