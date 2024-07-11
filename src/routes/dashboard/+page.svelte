<script>
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
