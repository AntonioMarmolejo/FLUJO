import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { createVault } from '../lib/vault.js';
import PinPad from '../components/PinPad.jsx';
import '../styles/PinScreen.css';

const PIN_LENGTH = 6;

// Se muestra justo después de un login online exitoso, solo si este
// dispositivo todavía no tiene un vault — ver AuthContext.afterAuthSuccess.
const CreatePinScreen = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { refreshToken, dest } = location.state || {};

    const [stage, setStage] = useState('enter'); // 'enter' | 'confirm'
    const [firstPin, setFirstPin] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const [busy, setBusy] = useState(false);

    // Acceso directo a esta ruta sin haber pasado por un login — no hay
    // refreshToken que envolver, así que no hay nada que hacer aquí.
    if (!refreshToken) return <Navigate to="/" replace />;

    const triggerError = (msg) => {
        setError(msg);
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 400);
    };

    const handleDigit = async (d) => {
        if (busy) return;
        const next = (pin + d).slice(0, PIN_LENGTH);
        setPin(next);
        setError('');
        if (next.length !== PIN_LENGTH) return;

        if (stage === 'enter') {
            setFirstPin(next);
            setPin('');
            setStage('confirm');
            return;
        }

        if (next !== firstPin) {
            triggerError('No coincide, intenta de nuevo');
            setFirstPin('');
            setStage('enter');
            return;
        }

        setBusy(true);
        try {
            await createVault({ pin: next, refreshToken });
            navigate(dest || '/workspace', { replace: true });
        } catch {
            triggerError('No se pudo guardar el PIN. Intenta de nuevo.');
            setFirstPin('');
            setStage('enter');
        } finally {
            setBusy(false);
        }
    };

    const handleBackspace = () => { if (!busy) { setPin(p => p.slice(0, -1)); setError(''); } };

    return (
        <div className="pin">
            <div className="pin__logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17l4-8 4 4 4-6 4 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <h1 className="pin__title">{stage === 'enter' ? 'Crea un PIN' : 'Confirma tu PIN'}</h1>
            {stage === 'enter' && (
                <p className="pin__subtitle">
                    Lo usarás para entrar rápido en este dispositivo sin conexión, en vez de escribir tu correo y contraseña cada vez.
                </p>
            )}
            <PinPad length={PIN_LENGTH} value={pin} onDigit={handleDigit} onBackspace={handleBackspace}
                error={!!error} shake={shake} disabled={busy} />
            <p className="pin__error-msg">{error}</p>
        </div>
    );
};

export default CreatePinScreen;
