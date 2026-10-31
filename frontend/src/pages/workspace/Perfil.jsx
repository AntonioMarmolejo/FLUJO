import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BLOQUES_DATA } from '../../data/bloques.js';
import { usePwaInstall } from '../../hooks/usePwaInstall.js';
import {
    vaultExists,
    hasBiometricGate,
    enableBiometricGate,
    disableBiometricGate,
    unlockWithPin,
    InvalidPinError,
} from '../../lib/vault.js';
import { isBiometricGateSupported } from '../../lib/biometricGate.js';
import PinPad from '../../components/PinPad.jsx';

// ── Perfil ────────────────────────────────────────────────
// Activar/desactivar el gate biométrico LOCAL para desbloquear el vault del
// PIN (distinto del "ACCESO BIOMÉTRICO" de arriba, que es el login completo
// verificado contra el servidor). Exige confirmar el PIN actual antes de
// vincular una huella nueva — mismo criterio de "no activar biometría sin
// autenticar antes" aplicado aquí al desbloqueo local.
const DesbloqueoHuellaLocal = () => {
    const [ready, setReady] = useState(false);
    const [visible, setVisible] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            const [hasVault, supported, registered] = await Promise.all([
                vaultExists(), isBiometricGateSupported(), hasBiometricGate(),
            ]);
            setVisible(hasVault && supported);
            setEnabled(registered);
            setReady(true);
        })();
    }, []);

    const triggerError = (msg) => {
        setError(msg);
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 400);
    };

    const handleDigit = async (d) => {
        if (busy) return;
        const next = (pin + d).slice(0, 6);
        setPin(next);
        setError('');
        if (next.length < 6) return;
        setBusy(true);
        try {
            const { deviceKeyBytes } = await unlockWithPin(next);
            await enableBiometricGate(deviceKeyBytes);
            setEnabled(true);
            setConfirming(false);
        } catch (err) {
            triggerError(err instanceof InvalidPinError ? 'PIN incorrecto' : 'No se pudo activar');
        } finally {
            setBusy(false);
        }
    };

    const handleBackspace = () => { if (!busy) { setPin(p => p.slice(0, -1)); setError(''); } };

    const handleDesactivar = async () => {
        await disableBiometricGate().catch(() => {});
        setEnabled(false);
    };

    if (!ready || !visible) return null;

    return (
        <div className="perfil-bio-section">
            <p className="perfil-bio-label">DESBLOQUEO RÁPIDO</p>
            {enabled ? (
                <>
                    <p className="perfil-bio-success">✓ Huella activada para desbloquear la app en este dispositivo</p>
                    <button className="pin__footer-link" onClick={handleDesactivar}>Desactivar</button>
                </>
            ) : confirming ? (
                <>
                    <p className="perfil-install-note">Confirma tu PIN para activar la huella</p>
                    <PinPad length={6} value={pin} onDigit={handleDigit} onBackspace={handleBackspace}
                        error={!!error} shake={shake} disabled={busy} />
                    <p className="pin__error-msg">{error}</p>
                </>
            ) : (
                <button className="perfil-bio-btn" onClick={() => setConfirming(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 1C8.5 1 5.5 2.5 3.5 5M12 1c3.5 0 6.5 1.5 8.5 4M3 9c-.3 1-.5 2-.5 3M21 9c.3 1 .5 2 .5 3M12 7c-2.8 0-5 2.2-5 5 0 1.5.3 2.9.8 4.1M12 7c2.8 0 5 2.2 5 5 0 1.5-.3 2.9-.8 4.1M12 11c-1.1 0-2 .9-2 2 0 1.5.4 2.9 1 4.1M12 11c1.1 0 2 .9 2 2 0 1.5-.4 2.9-1 4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Activar desbloqueo con huella
                </button>
            )}
            <p className="perfil-install-note perfil-install-note-junto">
                Esto solo desbloquea la app en este dispositivo — no reemplaza tu inicio de sesión.
            </p>
        </div>
    );
};

export const PantallaPerfil = ({ user, turnoActivo, onLogout }) => {
    const { registerPasskey } = useAuth();
    const { installed: appInstalada, canPrompt: puedeInstalar, isIOS: esIOS, promptInstall } = usePwaInstall();
    const bloque = turnoActivo ? BLOQUES_DATA[turnoActivo.bloque] : null;
    const iniciales = `${user?.name?.split(' ')[0]?.[0] || ''}${user?.name?.split(' ')[1]?.[0] || ''}`.toUpperCase();

    const [instalando, setInstalando] = useState(false);
    const handleInstalar = async () => {
        setInstalando(true);
        try { await promptInstall(); } finally { setInstalando(false); }
    };

    const [bioSupported, setBioSupported] = useState(false);
    const [bioStatus, setBioStatus] = useState('idle'); // idle | loading | ok | error
    const [bioMsg, setBioMsg] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                setBioSupported(ok);
            } catch { /* no soportado */ }
        })();
    }, []);

    const handleActivarHuella = async () => {
        setBioStatus('loading');
        setBioMsg('');
        try {
            const deviceName = navigator.platform || 'Este dispositivo';
            await registerPasskey(deviceName);
            setBioStatus('ok');
            setBioMsg('Huella / Face ID activado en este dispositivo');
        } catch (err) {
            setBioStatus('error');
            if (err.name === 'NotAllowedError') {
                setBioMsg('Cancelado. Vuelve a intentarlo cuando quieras.');
            } else if (err.name === 'InvalidStateError') {
                setBioMsg('Ya tienes una huella registrada en este dispositivo.');
            } else {
                setBioMsg(err.response?.data?.message || 'No se pudo registrar la huella');
            }
        }
    };

    return (
        <div className="perfil-wrapper">
            <div className="perfil-avatar">{iniciales}</div>
            <h2 className="perfil-nombre">{user?.name}</h2>
            <p className="perfil-email">{user?.email}</p>
            {turnoActivo && bloque && (
                // Solo los colores del bloque van en línea, como variables CSS:
                // cambian según el bloque del turno (ver .perfil-turno-* en el CSS)
                <div className="perfil-turno-card" style={{
                    '--bloque-color': bloque.color,
                    '--bloque-borde': bloque.color + '40',
                    '--bloque-fondo': bloque.bg,
                }}>
                    <span className="perfil-turno-label">TURNO ACTIVO</span>
                    <p className="perfil-turno-puesto">{turnoActivo.puesto}</p>
                    <p className="perfil-turno-bloque">{bloque.nombre} {bloque.codigo}</p>
                    <p className="perfil-turno-horario">
                        {turnoActivo.turnoActual === 'diurno' ? '06:00 – 18:00' : '18:00 – 06:00'}
                    </p>
                </div>
            )}

            {bioSupported && (
                <div className="perfil-bio-section">
                    <p className="perfil-bio-label">ACCESO BIOMÉTRICO</p>
                    {bioStatus === 'ok' ? (
                        <p className="perfil-bio-success">{bioMsg}</p>
                    ) : (
                        <>
                            <button
                                className="perfil-bio-btn"
                                onClick={handleActivarHuella}
                                disabled={bioStatus === 'loading'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 1C8.5 1 5.5 2.5 3.5 5M12 1c3.5 0 6.5 1.5 8.5 4M3 9c-.3 1-.5 2-.5 3M21 9c.3 1 .5 2 .5 3M12 7c-2.8 0-5 2.2-5 5 0 1.5.3 2.9.8 4.1M12 7c2.8 0 5 2.2 5 5 0 1.5-.3 2.9-.8 4.1M12 11c-1.1 0-2 .9-2 2 0 1.5.4 2.9 1 4.1M12 11c1.1 0 2 .9 2 2 0 1.5-.4 2.9-1 4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                                {bioStatus === 'loading' ? 'Registrando…' : 'Activar huella / Face ID'}
                            </button>
                            {bioStatus === 'error' && <p className="perfil-bio-error">{bioMsg}</p>}
                        </>
                    )}
                </div>
            )}

            <DesbloqueoHuellaLocal />

            {!appInstalada && (puedeInstalar || esIOS) && (
                <div className="perfil-bio-section">
                    <p className="perfil-bio-label">APLICACIÓN</p>
                    {puedeInstalar ? (
                        <button className="perfil-bio-btn" onClick={handleInstalar} disabled={instalando}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3v12M7 10l5 5 5-5M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {instalando ? 'Instalando…' : 'Instalar aplicación'}
                        </button>
                    ) : (
                        <p className="perfil-install-note">
                            Para instalarla: toca <strong>Compartir</strong> en Safari y luego <strong>"Agregar a pantalla de inicio"</strong>
                        </p>
                    )}
                </div>
            )}
            {appInstalada && (
                <p className="perfil-bio-success">✓ Aplicación instalada en este dispositivo</p>
            )}

            <button className="perfil-logout" onClick={onLogout}>Cerrar sesión</button>
        </div>
    );
};
