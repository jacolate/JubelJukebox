<script lang="ts">
    import { onMount } from "svelte";
    import {writable} from "svelte/store";
    import Alert from "$lib/components/Alert.svelte";
    import { alert } from "$lib/stores/alert";

    interface Song {
        name: string;
        interprete: string;
        url: string;
    }

    interface SongRequest{
        song: Song;
        user: string;
        status: string;
    }

    const clientId = import.meta.env.VITE_CLIENT_ID
    const clientSecret = import.meta.env.VITE_CLIENT_SECRET

    let accessToken = '';
    let searchQuery = '';
    let name = writable<string>('');
    const songs = writable<Song[]>([]);
    const showModal = writable(false);
    let selectedSong: Song | null = null;
onMount(() => {
    
    fetch('https://accounts.spotify.com/api/token',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
        }).then(response => response.json()
    ).then(data => {
        accessToken = data.access_token;
    }).catch((error) => {
        console.error('Error:', error);
    })
});

    const searchMusic = async (query: String) => {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        songs.set(filterSongs(data));
    }

    function sendSongRequest(request: SongRequest) {
    const url = '/api/request'; // Your backend endpoint URL

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // or .text() if the response is not JSON
        })
        .then(data => {
            console.log('Success:', data);
            alert.set({
                type: 'alert-success',
                message: 'Der Wunsch wurde erfolgreich eingereicht.',
                visible: true
            });
            // Hide the alert after a few seconds
            setTimeout(() => {
                alert.set({ type: '', message: '', visible: false });
            }, 3000);
        })
        .catch(error => {
            console.error('Error:', error);
            alert.set({
                type: 'alert-error',
                message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
                visible: true
            });
            // Hide the alert after a few seconds
            setTimeout(() => {
                alert.set({ type: '', message: '', visible: false });
            }, 3000);
        });
    }


    const filterSongs = (data: any): Song[] => {
        return data.tracks.items.map((item: any) => ({
            name: item.name,
            interprete: item.artists.map((artist: any) => artist.name).join(', '),
            url: item.external_urls.spotify
        }));
    }

    function openModal(song:Song) {
        selectedSong = song;
        confirm_modal.showModal()
    }

    function handleConfirm() {
        const request: SongRequest = {
            song: selectedSong as Song,
            user: $name as string,
            status: 'PENDING'
        };
        console.log(request);
        sendSongRequest(request);
        songs.set([]);
        selectedSong = null;
        searchQuery = '';
    }

</script>

<svelte:head>
    <title>Hinzufügen</title>
    <meta name="description" content="Svelte demo app" />
</svelte:head>

<section class="flex flex-col h-screen">

    <Alert />

    <dialog id="confirm_modal" class="modal">
        <div class="modal-box">
            <form method="dialog">
                <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                <h3 class="text-lg font-bold">Wunsch</h3>
                <p class="py-4 text-center">Wollen Sie sich wirklich den Song "{selectedSong?.name}" wünschen?</p>
                <div class="flex justify-end gap-3">
                <button class="btn btn-error w-2/6">Nein</button>
                <button class="btn btn-success w-2/6" on:click={() => handleConfirm()}>Ja</button>
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
            <label
                class="gap-2 flex items-center w-full mb-4"
            >
                <input type="text" bind:value={searchQuery} class="input input-bordered flex-grow p-2" placeholder="Songtitel" />
                <button on:click={() => searchMusic(searchQuery)} class="btn btn-primary">Suchen</button>

            </label>
        </div>

        {#if $songs.length > 0}
        <div class="mb-6">
            <div class="overflow-x-auto">
                <table class="table table-zebra w-full">
                    <!-- head -->
                    <thead>
                        <tr>
                            <th class="text-xs sm:text-sm md:text-base">Songtitel</th>
                            <th class="text-xs sm:text-sm md:text-base">Interpret</th>
                        </tr>
                    </thead>
                    <tbody>
                    {#each $songs as song}
                    <tr>
                        <td class="text-xs sm:text-sm md:text-base">{song.name}</td>
                        <td class="text-xs sm:text-sm md:text-base">{song.interprete}</td>
                        <td>
                            <button class="btn btn-info btn-outline btn-sm text-xs sm:text-sm" on:click={() => openModal(song)}>Wünschen</button>
                        </td>
                    </tr>
                    {/each}
                    </tbody>
                </table>
            </div>
        </div>
        {:else}
        <div class="flex-center ">
            <h1 class="mb-4 text-xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-5xl dark:text-white">                Wünschen Sie sich was!
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
