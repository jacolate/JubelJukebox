<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import { page } from "$app/state";
    import BrandTitle from "#lib/components/BrandTitle.svelte";

    const messages: Record<number, () => string> = {
        401: m.error_401,
        403: m.error_403,
        404: m.error_404,
        429: m.error_429
    };
</script>

<svelte:head>
    <title>{page.status} · Jubel Jukebox</title>
</svelte:head>

<section class="flex flex-col items-center justify-center min-h-dvh space-y-12 px-4 text-center">
    <BrandTitle />
    <div class="space-y-2">
        <p class="text-6xl font-bold text-gray-700 dark:text-base-content">{page.status}</p>
        <p class="text-lg">{(messages[page.status] ?? m.error_other)()}</p>
    </div>
    <a href="/" class="btn btn-primary">{m.error_home()}</a>
</section>
