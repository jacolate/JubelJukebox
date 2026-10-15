<script lang="ts">
    import { m } from "#lib/paraglide/messages.js";
    import { enhance, type SubmitFunction } from "$app/forms";
    import { showToast } from "#lib/toast.svelte.ts";
    import type { EventSettings } from "#lib/types.ts";
    import LocaleSwitch from "./LocaleSwitch.svelte";

    let { settings, joinUrl, qrSvg }: { settings: EventSettings; joinUrl: string; qrSvg: string } = $props();

    let dialog: HTMLDialogElement;

    export function open() {
        dialog.showModal();
    }

    const handleSave: SubmitFunction = () => {
        return async ({ result }) => {
            if (result.type === "success") {
                showToast("alert-success", m.settings_saved());
                dialog.close();
            } else {
                showToast("alert-error", m.settings_save_failed());
            }
        };
    };

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(joinUrl);
            showToast("alert-success", m.settings_link_copied());
        } catch {
            showToast("alert-error", m.settings_copy_failed());
        }
    }
</script>

<dialog class="modal modal-bottom sm:modal-middle" bind:this={dialog}>
    <div class="modal-box">
        <h2 class="text-2xl font-bold">{m.settings_title()}</h2>
        <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" aria-label={m.common_close()}>✕</button>
        </form>

        <form method="post" action="?/settings" use:enhance={handleSave} class="mt-6">
            <fieldset class="fieldset gap-3 min-w-0">
                <label class="label justify-between gap-3 whitespace-normal text-base-content text-sm">
                    <span class="min-w-0">{m.settings_requests_open()}</span>
                    <input type="checkbox" name="requestsOpen" class="shrink-0 toggle toggle-success" checked={settings.requestsOpen} />
                </label>
                <label class="label justify-between gap-3 whitespace-normal text-base-content text-sm">
                    <span class="min-w-0">{m.settings_max_open()} <span class="opacity-60 whitespace-nowrap">{m.settings_max_open_hint()}</span></span>
                    <input type="number" name="maxOpenPerGuest" min="0" max="50" class="input input-bordered input-sm w-20 shrink-0" value={settings.maxOpenPerGuest} />
                </label>
                <label class="label justify-between gap-3 whitespace-normal text-base-content text-sm">
                    <span class="min-w-0">{m.settings_block_explicit()}</span>
                    <input type="checkbox" name="blockExplicit" class="shrink-0 toggle toggle-success" checked={settings.blockExplicit} />
                </label>
                <label class="flex flex-col gap-1 text-sm">
                    <span>{m.settings_blocklist()} <span class="opacity-60">{m.settings_blocklist_hint()}</span></span>
                    <textarea name="blocklist" rows="3" maxlength="20000" class="textarea textarea-bordered w-full max-w-full">{settings.blocklist.join("\n")}</textarea>
                </label>
                <label class="label justify-between gap-3 whitespace-normal text-base-content text-sm">
                    <span class="min-w-0">{m.settings_show_timeline()}</span>
                    <input type="checkbox" name="showTimeline" class="shrink-0 toggle toggle-success" checked={settings.showTimeline} />
                </label>
                <label class="label justify-between gap-3 whitespace-normal text-base-content text-sm">
                    <span class="min-w-0">{m.settings_show_names()}</span>
                    <input type="checkbox" name="showNames" class="shrink-0 toggle toggle-success" checked={settings.showNames} />
                </label>
            </fieldset>
            <div class="flex justify-end mt-4">
                <button class="btn btn-primary">{m.settings_save()}</button>
            </div>
        </form>

        <div class="divider"></div>

        <h3 class="font-bold mb-3">{m.settings_invite()}</h3>
        <div class="flex gap-4 items-center min-w-0">
            <div class="w-28 h-28 shrink-0 [&>svg]:w-full [&>svg]:h-full">
                <!-- uqr only emits rect/path elements, no text from the URL -->
                {@html qrSvg}
            </div>
            <div class="flex flex-col gap-2 min-w-0">
                <p class="text-xs break-all opacity-70">{joinUrl}</p>
                <div class="flex flex-wrap gap-2">
                    <button class="btn btn-sm" onclick={copyLink}>{m.settings_copy_link()}</button>
                    <a class="btn btn-sm" href="/dashboard/invite">{m.settings_print_card()}</a>
                </div>
            </div>
        </div>

        <div class="divider"></div>

        <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-3">
                <a class="btn btn-sm" href="/dashboard/recap">{m.dashboard_recap()}</a>
                <LocaleSwitch />
            </div>
            <form method="post" action="?/logout">
                <button class="btn btn-ghost">{m.settings_logout()}</button>
            </form>
        </div>
    </div>
</dialog>
