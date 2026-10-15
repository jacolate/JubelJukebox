<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import { enhance } from "$app/forms";
    import BrandTitle from "#lib/components/BrandTitle.svelte";
    import IconInput from "#lib/components/IconInput.svelte";
    import Key from "#lib/components/icons/Key.svelte";
    import User from "#lib/components/icons/User.svelte";
    import LocaleSwitch from "#lib/components/LocaleSwitch.svelte";
    import Toast from "#lib/components/Toast.svelte";
    import { showToast } from "#lib/toast.svelte.ts";
    import type { SubmitFunction } from "./$types";

    const handleSubmit: SubmitFunction = () => {
        return async ({ result, update }) => {
            if (result.type === "failure") {
                showToast("alert-error", String(result.data?.message ?? m.login_failed()));
            }
            await update();
        };
    };
</script>

<svelte:head>
    <title>{m.meta_admin_title()}</title>
    <meta name="description" content={m.meta_admin_description()} />
</svelte:head>

<Toast />

<div class="absolute top-4 right-4"><LocaleSwitch /></div>

<section class="flex flex-col items-center justify-center min-h-dvh space-y-20">
    <BrandTitle />

    <form method="post" use:enhance={handleSubmit} class="flex flex-col justify-center items-center gap-3">
        <IconInput icon={User} id="admin-username" name="username" type="text" placeholder={m.login_username()} autocomplete="username" required />
        <IconInput icon={Key} id="admin-password" name="password" type="password" placeholder={m.login_password()} autocomplete="current-password" required />
        <button class="btn btn-primary mt-4">{m.login_submit()}</button>
    </form>
</section>
