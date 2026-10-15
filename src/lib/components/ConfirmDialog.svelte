<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import type { Snippet } from "svelte";

    let {
        title,
        confirmLabel,
        cancelLabel,
        onconfirm,
        children
    }: {
        title: string;
        confirmLabel: string;
        cancelLabel: string;
        onconfirm: () => void;
        children: Snippet;
    } = $props();

    let dialog: HTMLDialogElement;

    export function open() {
        dialog.showModal();
    }
</script>

<dialog class="modal" bind:this={dialog}>
    <div class="modal-box">
        <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" aria-label={m.common_close()}>✕</button>
            <h3 class="text-lg font-bold">{title}</h3>
            <p class="py-4 text-center">
                {@render children()}
            </p>
            <div class="flex justify-end gap-3">
                <button class="btn btn-error w-2/6">{cancelLabel}</button>
                <button class="btn btn-success w-2/6" onclick={onconfirm}>{confirmLabel}</button>
            </div>
        </form>
    </div>
</dialog>
