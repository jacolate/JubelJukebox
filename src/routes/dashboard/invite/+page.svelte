<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import BrandTitle from "#lib/components/BrandTitle.svelte";

    let { data } = $props();
</script>

<svelte:head>
    <title>{m.meta_invite_title()}</title>
</svelte:head>

<div class="print:hidden flex justify-center gap-3 p-4">
    <a href="/dashboard" class="btn btn-ghost">{m.common_back()}</a>
    <button class="btn btn-primary" onclick={() => window.print()}>{m.common_print()}</button>
</div>

<section class="invite mx-auto flex flex-col items-center gap-8 p-10 text-center bg-base-100 text-base-content">
    <BrandTitle />
    <div class="w-64 h-64 [&>svg]:w-full [&>svg]:h-full">
        <!-- uqr only emits rect/path elements, no text from the URL -->
        {@html data.qrSvg}
    </div>
    <div class="space-y-1">
        <p class="text-xl font-bold">Scannen und Musik wünschen</p>
        <p class="opacity-70">Scan to request songs</p>
    </div>
    <div class="space-y-1">
        <p class="text-sm opacity-70">oder Code eingeben · or enter code</p>
        <p class="font-mono text-3xl tracking-widest font-bold">{data.entryCode}</p>
        <p class="text-xs opacity-60 break-all">{data.joinUrl.split("?")[0]}</p>
    </div>
</section>

<style>
    .invite {
        max-width: 26rem;
    }

    @media print {
        :global(html, body) {
            background: white !important;
        }
        .invite {
            color: black;
            break-inside: avoid;
        }
    }
</style>
