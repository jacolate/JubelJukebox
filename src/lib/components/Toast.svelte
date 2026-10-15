<script lang="ts">
    import { fade } from "svelte/transition";
    import { toast } from "#lib/toast.svelte.ts";
    import CheckCircle from "./icons/CheckCircle.svelte";
</script>

{#if toast.visible}
    <div role="alert" class="alert {toast.type} fixed top-4 left-1/2 transform -translate-x-1/2 w-11/12 md:w-3/6 lg:w-2/6 z-50"
         in:fade={{ duration: 300 }}
         out:fade={{ duration: 300 }}>
        <CheckCircle class="h-6 w-6 shrink-0 stroke-current" />
        <span>{toast.message}</span>
    </div>
{/if}
