<script lang="ts">
    import type { Component } from "svelte";
    import type { HTMLInputAttributes } from "svelte/elements";

    let {
        icon: Icon,
        labelClass = "",
        ...input
    }: { icon: Component<{ class?: string }>; labelClass?: string } & HTMLInputAttributes = $props();
</script>

<label for={input.id} class="input input-bordered flex items-center gap-2 {labelClass}">
    <Icon class="w-4 h-4 opacity-70" />
    <input class="grow" {...input} />
</label>
