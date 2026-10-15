<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import type { Status } from "#lib/types.ts";

    let { status }: { status: Status } = $props();

    const labels: Record<Status, () => string> = {
        PENDING: m.status_pending,
        STASHED: m.status_stashed,
        PLAYED: m.status_played,
    };
</script>

<div class="badge gap-2 whitespace-nowrap"
    class:badge-info={status === "PENDING"}
    class:badge-warning={status === "STASHED"}
    class:badge-success={status === "PLAYED"}
>
    {labels[status]?.() ?? status}
</div>
