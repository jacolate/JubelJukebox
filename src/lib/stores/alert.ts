import { writable } from 'svelte/store';

export interface Alert {
    type: string;
    message: string;
    visible: boolean;
}

export const alert = writable<Alert>({ type: '', message: '', visible: false });

let hideTimer: ReturnType<typeof setTimeout> | undefined;

/** Shows an alert and hides it again after a few seconds. */
export function showAlert(type: string, message: string, durationMs = 3000) {
    clearTimeout(hideTimer);
    alert.set({ type, message, visible: true });
    hideTimer = setTimeout(() => alert.set({ type: '', message: '', visible: false }), durationMs);
}
