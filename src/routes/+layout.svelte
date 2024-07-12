<script lang="ts">
    import "tailwindcss/tailwind.css";
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import {browser} from "$app/environment";
    
    let code;
    const SESSION_CODE = import.meta.env.VITE_SESSION_CODE;

    onMount(() => {
        if (browser) {
            code = localStorage.getItem('code');
            if (code !== SESSION_CODE) {
                goto('/');
            }
        }
    });
</script>

<slot />