<script lang="ts">
    import { alert } from "#lib/stores/alert.ts";
    import { fade } from 'svelte/transition';
</script>

{#if $alert.visible}
    <div role="alert" class="alert {$alert.type} fixed top-4 left-1/2 transform -translate-x-1/2 w-11/12 md:w-3/6 lg:w-2/6 z-50"
         in:fade={{ duration: 300 }}
         out:fade={{ duration: 300 }}>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
        <span>{$alert.message}</span>
    </div>
{/if}
