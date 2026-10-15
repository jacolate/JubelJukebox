export type ToastType = 'alert-success' | 'alert-error' | 'alert-info' | 'alert-warning';

export const toast = $state({ type: '' as ToastType | '', message: '', visible: false });

let hideTimer: ReturnType<typeof setTimeout> | undefined;

/** Shows a toast and hides it again after a few seconds. */
export function showToast(type: ToastType, message: string, durationMs = 3000) {
	clearTimeout(hideTimer);
	toast.type = type;
	toast.message = message;
	toast.visible = true;
	hideTimer = setTimeout(() => (toast.visible = false), durationMs);
}
