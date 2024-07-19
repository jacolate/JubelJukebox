<script lang="ts">
	import { enhance } from "$app/forms";

	import type { ActionData } from "./$types";

	export let form: ActionData;

</script>

<svelte:head>
    <title>Home</title>
    <meta name="description" content="Svelte demo app" />
</svelte:head>

<section class="flex flex-col items-center justify-center h-screen space-y-20">
    <div class="flex flex-col items-center justify-center">
        <h1 class="uppercase font-bold text-5xl">Jubel</h1>
        <h1 class="uppercase font-bold text-5xl text-orange-600">Jukebox</h1>
    </div>

    <form method="post" use:enhance>
        <div class="flex flex-col justify-center items-center gap-5">
            <label
                for="name"
                class="input input-bordered flex items-center gap-2 w-4/5"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    class="w-4 h-4 opacity-70"
                    ><path
                        d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z"
                    /></svg
                >
                <input
                    id="username"
                    name="username"
                    type="text"
                    class="grow"
                    placeholder="Name"
                    required
                />
            </label>

            <label
                for="code"
                class="input input-bordered flex items-center gap-2 w-4/5"
            >
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
                    id="code"
                    name="code"
                    type="text"
                    class="grow"
                    placeholder="Code"
                    required
                />
            </label>

            <button class="btn btn-primary mt-4">Anmelden</button>
        </div>
    </form>
</section>
