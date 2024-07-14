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
        class:gray={request.status === "STASHED"}
             class:dark-gray={request.status === "PLAYED"}>
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
                        {request.status}</div>

                    <button on:click={() => window.open(request.song.url, '_blank')}>
                    <svg class="text-gray-800 dark:text-white p-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="50" height="50" viewBox="0 0 50 50">
                    <path d="M 25 1.9902344 C 12.266865 1.9902344 1.9902344 12.266865 1.9902344 25 C 1.9902344 37.733135 12.266865 48.009766 25 48.009766 C 37.733135 48.009766 48.009766 37.733135 48.009766 25 C 48.009766 12.266865 37.733135 1.9902344 25 1.9902344 z M 25 4.0097656 C 36.650865 4.0097656 45.990234 13.349135 45.990234 25 C 45.990234 36.650865 36.650865 45.990234 25 45.990234 C 13.349135 45.990234 4.0097656 36.650865 4.0097656 25 C 4.0097656 13.349135 13.349135 4.0097656 25 4.0097656 z M 21.933594 14 C 16.000841 14 11.536373 15.027452 11.318359 15.078125 L 11.316406 15.078125 L 11.316406 15.080078 C 9.7155259 15.453865 8.7059511 17.079339 9.078125 18.679688 C 9.450288 20.281477 11.075526 21.288538 12.675781 20.921875 L 12.683594 20.921875 L 12.689453 20.919922 C 12.575843 20.947632 12.739283 20.908042 12.859375 20.882812 C 12.979472 20.857582 13.156783 20.822622 13.386719 20.779297 C 13.846591 20.692637 14.514202 20.576349 15.345703 20.460938 C 17.008724 20.230114 19.325722 20 21.933594 20 L 21.996094 20 C 26.308988 20.0059 32.506391 20.667785 37.480469 23.587891 L 37.482422 23.587891 L 37.482422 23.589844 C 37.954848 23.865283 38.481566 24 38.998047 24 C 40.027098 24 41.03278 23.462606 41.587891 22.517578 C 42.4204 21.099781 41.937951 19.245598 40.519531 18.412109 C 34.27637 14.746763 27.008921 14.007143 22.003906 14 L 21.933594 14 z M 21.933594 16 L 22.003906 16 C 26.808831 16.007 33.751684 16.758455 39.505859 20.136719 C 39.99344 20.42323 40.148772 21.019657 39.863281 21.505859 C 39.672394 21.830832 39.340995 22 38.998047 22 C 38.827923 22 38.658397 21.95814 38.494141 21.863281 L 38.490234 21.861328 C 33.0131 18.647428 26.504103 18.006131 21.998047 18 L 21.933594 18 C 19.208465 18 16.806263 18.239792 15.072266 18.480469 C 14.205267 18.600807 13.504003 18.72047 13.015625 18.8125 C 12.771436 18.85852 12.58045 18.8978 12.447266 18.925781 C 12.322091 18.952081 12.331069 18.948276 12.230469 18.972656 C 11.674724 19.099993 11.153228 18.776774 11.025391 18.226562 C 10.897698 17.677484 11.221452 17.156242 11.769531 17.027344 C 11.921515 16.992022 16.232346 16 21.933594 16 z M 21.992188 22.001953 C 19.485831 22.022933 17.321981 22.257131 15.742188 22.498047 C 14.162394 22.738963 13.265055 22.956785 12.976562 23.039062 C 11.545298 23.4449 10.697078 24.961798 11.103516 26.394531 C 11.511255 27.828702 13.027844 28.672719 14.458984 28.265625 L 14.464844 28.263672 L 14.46875 28.263672 C 14.49469 28.257572 14.53521 28.248108 14.587891 28.236328 C 14.69326 28.212768 14.848723 28.180835 15.048828 28.140625 C 15.449038 28.060205 16.026057 27.951569 16.740234 27.84375 C 18.168588 27.628113 20.142467 27.410079 22.322266 27.390625 C 26.185509 27.356565 30.567753 27.924285 34.84375 30.587891 C 35.289626 30.867749 35.792755 31.001953 36.28125 31.001953 C 37.187002 31.001953 38.077741 30.54265 38.589844 29.722656 C 39.378024 28.458742 38.985326 26.765566 37.720703 25.978516 C 32.336064 22.623808 26.560664 21.964096 21.992188 22.001953 z M 22.009766 24 C 26.371289 23.96386 31.724703 24.598489 36.664062 27.675781 C 37.00944 27.890731 37.108398 28.317977 36.892578 28.664062 C 36.752681 28.88807 36.521498 29.001953 36.28125 29.001953 C 36.149745 29.001953 36.024374 28.968673 35.90625 28.894531 L 35.904297 28.892578 C 31.213033 25.969431 26.380741 25.35469 22.304688 25.390625 C 20.002485 25.411175 17.940802 25.640824 16.441406 25.867188 C 15.691708 25.980369 15.083306 26.093481 14.654297 26.179688 C 14.439792 26.222787 14.270205 26.258358 14.150391 26.285156 C 14.090481 26.298556 14.043261 26.309979 14.007812 26.318359 C 13.972362 26.326759 14.028242 26.308563 13.902344 26.345703 L 13.912109 26.341797 C 13.529249 26.450703 13.137605 26.235485 13.027344 25.847656 C 12.915932 25.454918 13.129707 25.073722 13.521484 24.962891 L 13.523438 24.962891 C 13.511947 24.966191 14.540762 24.703693 16.042969 24.474609 C 17.545141 24.245573 19.619122 24.020016 22.009766 24 z M 22.5 29.001953 C 18.141114 29.002953 14.914292 30.062424 14.708984 30.130859 C 13.409991 30.563124 12.696085 31.994504 13.128906 33.292969 C 13.561895 34.591934 14.993351 35.312698 16.294922 34.871094 L 16.279297 34.876953 C 16.379482 34.844753 16.438799 34.823793 16.742188 34.742188 C 17.045575 34.660578 17.491802 34.551256 18.048828 34.441406 C 19.16288 34.221707 20.724875 34.002431 22.5 34.001953 C 26.836932 34.000989 29.799021 35.039503 32.113281 36.582031 L 32.113281 36.580078 C 32.537053 36.863144 33.023236 37.001953 33.498047 37.001953 C 34.304696 37.001953 35.102812 36.603444 35.580078 35.886719 C 36.338631 34.748062 36.024808 33.181703 34.886719 32.421875 C 31.24152 29.992096 27.140106 28.999891 22.5 29.001953 z M 22.5 31.001953 C 26.859894 31.000053 30.494548 31.897723 33.777344 34.085938 C 34.015629 34.246398 34.075032 34.5406 33.916016 34.779297 C 33.815282 34.930571 33.661397 35.001953 33.498047 35.001953 C 33.400857 35.001953 33.310884 34.976899 33.222656 34.917969 L 33.222656 34.916016 C 30.588916 33.160587 27.163068 32.000917 22.5 32.001953 C 20.561125 32.002475 18.875557 32.239215 17.662109 32.478516 C 17.055386 32.598166 16.565205 32.718405 16.222656 32.810547 C 15.880107 32.902687 15.581784 33.000359 15.667969 32.972656 L 15.660156 32.974609 L 15.652344 32.976562 C 15.385915 33.066963 15.116402 32.933192 15.025391 32.660156 C 14.934381 32.387121 15.069741 32.117683 15.341797 32.027344 C 15.400487 32.007784 18.468886 31.002914 22.5 31.001953 z"></path>
                </svg></button>
                <button on:click={() => playRequest(request)}>
                    <svg class="text-gray-800 dark:text-white p-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M5 11.917 9.724 16.5 19 7.5"/>
                      </svg>
                                      </button>
                <button on:click={() => stashRequest(request)}>
                                        <svg class="text-gray-800 dark:text-white p-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                      </svg>
                                      </button>
                <button on:click={() => deleteRequest(request)}>
                <svg class="text-gray-800 dark:text-white p-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="none" viewBox="0 0 24 24">
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