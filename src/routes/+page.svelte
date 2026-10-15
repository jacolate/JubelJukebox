<script lang="ts">
    import Alert from "#lib/components/Alert.svelte";
    import { showAlert } from "#lib/stores/alert.ts";
    import type { Song } from "#lib/types.ts";

    let searchQuery = $state("");
    let songs = $state<Song[]>([]);
    let selectedSong = $state<Song | null>(null);
    let confirmModal: HTMLDialogElement;

    const searchMusic = async (query: string) => {
        const q = query.trim();
        if (!q) return;
        try {
            const response = await fetch(`/api/search?${new URLSearchParams({ q })}`);
            if (!response.ok) throw new Error(`Search failed with status ${response.status}`);
            songs = await response.json();
        } catch (error) {
            console.error("Error:", error);
            showAlert(
                "alert-error",
                "Die Suche ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut.",
            );
        }
    };

    async function sendSongRequest(song: Song) {
        try {
            const response = await fetch("/api/request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ song }),
            });
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            showAlert("alert-success", "Der Wunsch wurde erfolgreich eingereicht.");
        } catch (error) {
            console.error("Error:", error);
            showAlert(
                "alert-error",
                "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
            );
        }
    }

    function openModal(song: Song) {
        selectedSong = song;
        confirmModal.showModal();
    }

    function handleConfirm() {
        if (selectedSong) sendSongRequest(selectedSong);
        songs = [];
        selectedSong = null;
        searchQuery = "";
    }
</script>

<svelte:head>
    <title>Hinzufügen</title>
    <meta name="description" content="Jukebox – Musikwünsche einreichen" />
</svelte:head>

<section class="flex flex-col h-screen">
    <Alert />

    <dialog id="confirm_modal" class="modal" bind:this={confirmModal}>
        <div class="modal-box">
            <form method="dialog">
                <button
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    >✕</button
                >
                <h3 class="text-lg font-bold">Wunsch</h3>
                <p class="py-4 text-center">
                    Wollen Sie sich wirklich den Song "{selectedSong?.name}"
                    wünschen?
                </p>
                <div class="flex justify-end gap-3">
                    <button class="btn btn-error w-2/6">Nein</button>
                    <button
                        class="btn btn-success w-2/6"
                        onclick={() => handleConfirm()}>Ja</button
                    >
                </div>
            </form>
        </div>
    </dialog>

    <div class="flex items-center p-4 gap-3 bg-base-200 shadow-md">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-10 h-10 text-orange-600"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
            />
        </svg>
        <h1 class="text-4xl uppercase font-bold">Jukebox</h1>
    </div>

    <div class="flex flex-col h-5/6 self-center mt-10 w-11/12 md:w-5/12">
        <div>
            <div class="flex flex-col items-center justify-center mb-4">
                <h1 class="uppercase font-bold text-2xl text-gray-700">
                    Musik suchen
                </h1>
            </div>
            <label class="gap-2 flex items-center w-full mb-4">
                <input
                    type="text"
                    bind:value={searchQuery}
                    class="input input-bordered flex-grow p-2"
                    placeholder="Songtitel"
                    onkeydown={(e) => e.key === "Enter" && searchMusic(searchQuery)}
                />
                <button
                    onclick={() => searchMusic(searchQuery)}
                    class="btn btn-primary">Suchen</button
                >
            </label>
        </div>

        {#if songs.length > 0}
            <div class="mb-6">
                <div class="overflow-x-auto">
                    <table class="table table-zebra w-full">
                        <!-- head -->
                        <thead>
                            <tr>
                                <th class="text-xs sm:text-sm md:text-base"
                                    >Songtitel</th
                                >
                                <th class="text-xs sm:text-sm md:text-base"
                                    >Interpret</th
                                >
                            </tr>
                        </thead>
                        <tbody>
                            {#each songs as song}
                                <tr>
                                    <td class="text-xs sm:text-sm md:text-base"
                                        >{song.name}</td
                                    >
                                    <td class="text-xs sm:text-sm md:text-base"
                                        >{song.interprete}</td
                                    >
                                    <td>
                                        <button
                                            class="btn btn-info btn-outline btn-sm text-xs sm:text-sm"
                                            onclick={() => openModal(song)}
                                            >Wünschen</button
                                        >
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {:else}
            <div class="flex-center">
                <h1
                    class="mb-4 text-xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-5xl dark:text-white"
                >
                    Wünschen Sie sich was!
                </h1>
            </div>
        {/if}
    </div>
</section>

<style>
    .flex-center {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh; /* Use the full height of the viewport */
    }
</style>
