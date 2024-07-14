import { writable } from 'svelte/store';

// Function to get the initial code value safely
function getInitialCode() {
    // Check if running in a browser environment
    if (typeof window !== 'undefined') {
        const code = localStorage.getItem('code');
        return code ? code : '';
    }
    // Return a default value or null if not in a browser
    return '';
}

// Initialize the auth store with the value from localStorage if it exists and if in a browser environment
export const codeVal = writable<string>(getInitialCode());

// Subscribe to the auth store and update localStorage whenever it changes, but only if in a browser environment
codeVal.subscribe((value) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('code', value.toString());
    }
});