import { useEffect, useState } from 'react';
import { getDeferredPrompt, clearDeferredPrompt, subscribePwaInstall } from '../lib/pwaInstall.js';

const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true; // Safari/iOS

const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;

// Da acceso al botón de "Instalar aplicación": usa el prompt nativo del
// navegador cuando está disponible (Android/Chrome/Edge/desktop) y, si no
// (iOS, que no soporta este prompt), avisa para mostrar instrucciones manuales.
export const usePwaInstall = () => {
    const [installed, setInstalled] = useState(isStandalone());
    const [canPrompt, setCanPrompt] = useState(!!getDeferredPrompt());

    useEffect(() => {
        const unsub = subscribePwaInstall(() => {
            setCanPrompt(!!getDeferredPrompt());
            setInstalled(isStandalone());
        });
        const onInstalled = () => setInstalled(true);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            unsub();
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const promptInstall = async () => {
        const prompt = getDeferredPrompt();
        if (!prompt) return null;
        prompt.prompt();
        const choice = await prompt.userChoice;
        clearDeferredPrompt();
        setCanPrompt(false);
        if (choice?.outcome === 'accepted') setInstalled(true);
        return choice;
    };

    return {
        installed,
        canPrompt,
        isIOS: isIOS() && !installed,
        promptInstall,
    };
};
