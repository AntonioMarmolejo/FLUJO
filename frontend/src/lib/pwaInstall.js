// Captura el evento "beforeinstallprompt" apenas carga la app (fuera de React),
// para no perderlo si el usuario entra a la pantalla de Perfil recién después
// de que el navegador ya lo disparó. Chrome/Edge/Android lo emiten una sola vez
// por carga de página, y si nadie llama a prompt() en ese momento, se pierde.
let deferredPrompt = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        notify();
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        notify();
    });
}

export const getDeferredPrompt = () => deferredPrompt;

export const clearDeferredPrompt = () => {
    deferredPrompt = null;
    notify();
};

export const subscribePwaInstall = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};
