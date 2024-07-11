<script>
</script>

<svelte:head>
    <title>Hinzufügen</title>
    <meta name="description" content="Svelte demo app" />
</svelte:head>

<section class="flex flex-col h-screen">
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

    <div class="flex flex-col h-5/6 justify-between self-center mt-10 w-11/12 md:w-5/12">
        <div>
            <div class="flex flex-col items-center justify-center mb-4">
                <h1 class="uppercase font-bold text-2xl text-gray-700">
                    Musik suchen
                </h1>
            </div>
            <label
                class="input input-bordered flex items-center gap-2 w-full mb-4"
            >
                <input type="text" class="grow p-2" placeholder="Search" />
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    class="w-4 h-4 opacity-70"
                    ><path
                        fill-rule="evenodd"
                        d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                        clip-rule="evenodd"
                    /></svg
                >
            </label>
        </div>

        <div class="mb-6">
            <div class="overflow-x-auto">
                <table class="table table-zebra w-full">
                    <!-- head -->
                    <thead>
                        <tr>
                            <th>Song Name</th>
                            <th>Interpret</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- row 1 -->
                        <tr>
                            <td>Turn Red</td>
                            <td>M Dot R</td>
                        </tr>
                        <!-- row 2 -->
                        <tr>
                            <td>Carmen</td>
                            <td>Sido</td>
                        </tr>
                        <!-- row 3 -->
                        <tr>
                            <td>The Shinning</td>
                            <td>Vince Staples</td>
                        </tr>
                        <!-- row 3 -->
                        <tr>
                            <td>The Shinning</td>
                            <td>Vince Staples</td>
                        </tr>
                        <!-- row 3 -->
                        <tr>
                            <td>The Shinning</td>
                            <td>Vince Staples</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</section>
