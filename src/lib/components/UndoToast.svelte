<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import { fade } from "svelte/transition";

    let { message, onundo }: { message: string | null; onundo: () => void } = $props();
</script>

{#if message}
    <div class="toast toast-bottom toast-center z-50 w-full max-w-md px-4 sm:px-0" transition:fade={{ duration: 200 }}>
        <div role="status" class="alert shadow-lg flex flex-row justify-between whitespace-normal">
            <span class="line-clamp-2 min-w-0">{message}</span>
            <button class="btn btn-sm btn-primary shrink-0" onclick={onundo}>{m.dashboard_undo()}</button>
        </div>
    </div>
{/if}
