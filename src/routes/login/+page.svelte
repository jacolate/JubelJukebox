<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
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
            await update({ reset: false });
        };
    };
</script>

<svelte:head>
    <title>{m.meta_login_title()}</title>
    <meta name="description" content={m.meta_login_description()} />
</svelte:head>

<Toast />

<div class="absolute top-4 right-4"><LocaleSwitch /></div>

<section class="flex flex-col items-center justify-center min-h-dvh space-y-20">
    <BrandTitle />

    <form method="post" use:enhance={handleSubmit}>
        <div class="flex flex-col justify-center items-center gap-5">
            <IconInput icon={User} labelClass="w-4/5" id="username" name="username" type="text" placeholder={m.login_name()} autocomplete="nickname" enterkeyhint="next" required />
            <IconInput
                icon={Key}
                labelClass="w-4/5"
                id="code"
                name="code"
                type="text"
                placeholder={m.login_code()}
                value={(page.url.searchParams.get("code") ?? "").toUpperCase()}
                autocomplete="off"
                autocapitalize="characters"
                enterkeyhint="go"
                oninput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())}
                required
            />
            <button class="btn btn-primary mt-4">{m.login_submit()}</button>
        </div>
    </form>
</section>
