<script lang="ts">
    import {writable} from "svelte/store";
    import {onMount} from "svelte";
    import { source } from 'sveltekit-sse'
    import { derived } from 'svelte/store';
  import type { json } from "@sveltejs/kit";

    interface Song {
        name: string;
        interprete: string;
        url: string;
    }


    type SongRequest = {
        _id: string;
        song: Song;
        user: string;
        status: string; 
    }

    const requests = writable<SongRequest[]>([]);

    onMount(() => {
        const url = '/api/request'; // Your backend endpoint URL

        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json(); // or .text() if the response is not JSON
            })
            .then(data => {
                requests.set(data)
                // Handle success (e.g., show a confirmation message)
            })
            .catch(error => {
                console.error('Error:', error);
                // Handle errors (e.g., show an error message)
            });

    });


    const connection = source('/api/newRequest');
    const songRequest = connection.select('song-request-update').json(
    function or({error, raw, previous}){
      console.error(`Could not parse "${raw}" as json.`, error)
      return previous  // This will be the new value of the store
    }
  )
  $: if($songRequest){
    requests.update(reqs => [...reqs, $songRequest])
  }
  
  console.log($songRequest)


    const sortedRequests = derived(requests, $requests => {
        return $requests.slice().sort((a, b) => {
            const order = { "PENDING": 1, "STASHED": 2, "PLAYED": 3 };
            return order[a.status] - order[b.status];
        });
    });



    async function deleteRequest(request: SongRequest) {
        const url = `/api/request/${request._id}`;

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Success:', data);

            // Update the requests store
            requests.update(reqs => reqs.filter(req => req._id !== request._id));

            // Optional: Show a success message to the user
        } catch (error) {
            console.error('Error:', error);
            // Optional: Show an error message to the user
        }
    }

    async function changeRequest(request: SongRequest){
        const url = `/api/request/${request._id}`;

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Success:', data);

            // Update the requests store
            requests.update(reqs => reqs.map(req => req._id === request._id ? request : req));

        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function stashRequest(request: SongRequest){
        request.status = 'STASHED';
        changeRequest(request);
    }

    async function playRequest(request: SongRequest){
        request.status = 'PLAYED';
        changeRequest(request);
    }

</script>

<svelte:head>
    <title>Dashboard</title>
    <meta name="description" content="Svelte demo app" />
</svelte:head>

<section class="flex flex-col h-screen">
    <div
        class="flex items-center p-4 gap-3 bg-base-200 shadow-md justify-between"
    >
        <div class="flex items-center gap-3">
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
        <button
            class="btn btn-primary mt-4"
            onclick="session_create_modal.showModal()">Create session</button
        >
    </div>

    <div class="flex flex-col justify-center">
        {#each $sortedRequests as request}
        <div class="card flex shadow-xl m-5 mx-auto w-3/4"
        class:bg-base-200={request.status === "STASHED"}
             class:bg-base-300={request.status === "PLAYED"}>
             <div class="card-body flex-row justify-between items-center m-1 gap-3">
                <div>
                <p class="overflow-hidden"><strong>Song:</strong> {request.song.name}</p>
                <p class="overflow-hidden"><strong>Interpret:</strong> {request.song.interprete}</p>
                <p><strong>Requested by:</strong> {request.user}</p>
                </div>
                <div class="flex flex-row justify-center items-center gap-2">
                    <div class="badge gap-2"
                    class:badge-info={request.status === "PENDING"}
                    class:badge-warning={request.status === "STASHED"}
                    class:badge-success={request.status === "PLAYED"}
                    >
                        {request.status}
                </div>

                <button on:click={() => window.open(request.song.url, '_blank')}>
                    <svg class="p-1" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 496 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
                        <path fill="#1db954" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm31-76.2c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3z"/>
                    </svg>
                </button>
                <button on:click={() => playRequest(request)}>
                    <svg class="text-black bg-success dark:text-success dark:bg-transparent p-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M5 11.917 9.724 16.5 19 7.5"/>
                    </svg>
                                      </button>
                <button on:click={() => stashRequest(request)}>
                    <svg class="light:text-black bg-warning dark:text-warning dark:bg-transparent p-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                    </svg>
                                      </button>
                <button on:click={() => deleteRequest(request)}>
                <svg class="text-black bg-error dark:text-error dark:bg-transparent p-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                  </svg>
                </button>
                </div>
                </div>
            </div>
        {/each}
    </div>


    <div
        class="flex flex-col h-5/6 justify-between self-center mt-10 w-11/12 md:w-5/12"
    >
        <dialog id="session_create_modal" class="modal">
            <div class="modal-box">
            <h2 class="text-2xl font-bold">Create a new session</h2>
                <form method="dialog">
                    <button
                        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        >✕</button
                    >
                </form>
                <div class="mt-8">
                <div class="w-4/6 self-center">
                    <label class="input input-bordered flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            class="w-4 h-4 opacity-70"
                            ><path
                                fill-rule="evenodd"
                                d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                                clip-rule="evenodd"
                            /></svg
                        >
                        <input
                            type="text"
                            class="grow"
                            placeholder="Session code"
                        />
                    </label>
                    </div>
                    <div class="flex justify-end gap-2">
                        <button class="btn btn-primary"
                            >Create</button
                        >
                    </div>
                </div>
            </div>
        </dialog>
    </div>
</section>

<style>
    svg {
    cursor: pointer;
    transition: background-color 0.3s;
    border-radius: 50%;
  }

  svg:hover {
    background-color:gainsboro;
  }

  .gray {
    background-color: #e7e4e4; /* Heller Grauton */
}

.dark-gray {
    background-color: #cccccc; /* Dunklerer Grauton */
}
</style>
