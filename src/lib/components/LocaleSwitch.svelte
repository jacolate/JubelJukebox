<script lang="ts">
    import { getLocale, locales, setLocale } from "#lib/paraglide/runtime.js";
    import { m } from "#lib/paraglide/messages.js";

    const current = getLocale();
</script>

<div class="join" role="group" aria-label={m.locale_switch()}>
    {#each locales as locale (locale)}
        <button
            type="button"
            class="btn btn-ghost btn-sm join-item uppercase"
            class:btn-active={locale === current}
            aria-pressed={locale === current}
            lang={locale}
            onclick={() => setLocale(locale)}>{locale}</button
        >
    {/each}
</div>
