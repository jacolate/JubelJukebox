import { writable } from 'svelte/store';

export interface Alert {
    type: string;
    message: string;
    visible: boolean;
}

export const alert = writable<Alert>({ type: '', message: '', visible: false });