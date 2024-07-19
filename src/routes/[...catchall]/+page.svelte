<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    // Redirect to home page or any other specific route
    goto('/'); // You can change this to any route you want to redirect to
  });
</script>

<h1>Redirecting...</h1>
