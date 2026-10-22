import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { unlockWithPin, unlockWithBiometric, destroyVault, hasBiometricGate, InvalidPinError, LockedOutError, VaultWipedError } from '../lib/vault.js';
import { isBiometricGateSupported } from '../lib/biometricGate.js';
import PinPad from '../components/PinPad.jsx';
import '../styles/PinScreen.css';

const PIN_LENGTH = 6;

const FingerprintIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 1C8.5 1 5.5 2.5 3.5 5M12 1c3.5 0 6.5 1.5 8.5 4M3 9c-.3 1-.5 2-.5 3M21 9c.3 1 .5 2 .5 3M12 7c-2.8 0-5 2.2-5 5 0 1.5.3 2.9.8 4.1M12 7c2.8 0 5 2.2 5 5 0 1.5-.3 2.9-.8 4.1M12 11c-1.1 0-2 .9-2 2 0 1.5.4 2.9 1 4.1M12 11c1.1 0 2 .9 2 2 0 1.5-.4 2.9-1 4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

// Pantalla de bloqueo: se muestra en vez del login normal cuando ya existe un
// vault en este dispositivo. El PIN se valida completamente en local — no se
// llama al servidor hasta después de descifrar el refreshToken con éxito.
const LockScreen = ({ onUnlocked }) => {
    const { restoreFromVault } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const [busy, setBusy] = useState(false);
    const [lockedMsg, setLockedMsg] = useState('');
    const [canUseBiometric, setCanUseBiometric] = useState(false);

    useEffect(() => {
        (async () => {
            const [supported, registered] = await Promise.all([isBiometricGateSupported(), hasBiometricGate()]);
            setCanUseBiometric(supported && registered);
        })();
    }, []);

    const cachedName = (() => {
        try { return JSON.parse(localStorage.getItem('user') || 'null')?.name; } catch { return null; }
    })();

    const triggerError = (msg) => {
        setError(msg);
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 400);
    };

    // Comparte el manejo de resultado entre el camino de PIN y el de huella:
    // ambos terminan con el mismo refreshToken descifrado.
    const finishUnlock = useCallback(async (refreshToken) => {
        const result = await restoreFromVault(refreshToken);
        if (result.expired) {
            setLockedMsg('Tu sesión expiró en este dispositivo. Inicia sesión de nuevo.');
            setTimeout(() => { window.location.href = '/'; }, 2500);
            return;
        }
        onUnlocked();
    }, [restoreFromVault, onUnlocked]);

    const attemptUnlock = useCallback(async (fullPin) => {
        setBusy(true);
        setError('');
        try {
            const { refreshToken } = await unlockWithPin(fullPin);
            await finishUnlock(refreshToken);
        } catch (err) {
            if (err instanceof LockedOutError) {
                triggerError(`Demasiados intentos. Espera ${Math.ceil(err.remainingMs / 1000)}s.`);
            } else if (err instanceof VaultWipedError) {
                setLockedMsg('Demasiados intentos fallidos. Inicia sesión de nuevo.');
                setTimeout(() => { window.location.href = '/'; }, 2000);
            } else if (err instanceof InvalidPinError) {
                triggerError('PIN incorrecto');
            } else {
                triggerError('No se pudo desbloquear. Intenta de nuevo.');
            }
        } finally {
            setBusy(false);
        }
    }, [finishUnlock]);

    const handleBiometric = async () => {
        setBusy(true);
        setError('');
        try {
            const { refreshToken } = await unlockWithBiometric();
            await finishUnlock(refreshToken);
        } catch {
            setError('No se pudo validar la huella. Usa tu PIN.');
        } finally {
            setBusy(false);
        }
    };

    const handleDigit = (d) => {
        if (busy || lockedMsg) return;
        const next = (pin + d).slice(0, PIN_LENGTH);
        setPin(next);
        setError('');
        if (next.length === PIN_LENGTH) attemptUnlock(next);
    };

    const handleBackspace = () => { if (!busy) { setPin(p => p.slice(0, -1)); setError(''); } };

    const handleOlvide = async () => {
        await destroyVault().catch(() => {});
        window.location.href = '/';
    };

    return (
        <div className="pin-wrapper">
            <div className="pin-logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17l4-8 4 4 4-6 4 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <h1 className="pin-title">{lockedMsg ? 'Sesión bloqueada' : 'Ingresa tu PIN'}</h1>
            {!lockedMsg && cachedName && <p className="pin-user-name">{cachedName}</p>}
            {lockedMsg ? (
                <p className="pin-subtitle">{lockedMsg}</p>
            ) : (
                <>
                    <PinPad length={PIN_LENGTH} value={pin} onDigit={handleDigit} onBackspace={handleBackspace}
                        error={!!error} shake={shake} disabled={busy}
                        extraKey={canUseBiometric && (
                            <button className="pin-key" type="button" disabled={busy} onClick={handleBiometric} title="Usar huella">
                                <FingerprintIcon />
                            </button>
                        )} />
                    <p className="pin-error-msg">{error}</p>
                    <button className="pin-footer-link" onClick={handleOlvide}>Olvidé mi PIN</button>
                </>
            )}
        </div>
    );
};

export default LockScreen;
