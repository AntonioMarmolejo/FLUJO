import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vaultExists } from '../lib/vault.js';
import LoginPage from '../pages/LoginPage';
import LockScreen from '../pages/LockScreen';

const Spinner = () => (
    <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#ffffff',
        fontSize: '14px', gap: '12px', flexDirection: 'column',
    }}>
        <div style={{
            width: '32px', height: '32px',
            border: '3px solid #333', borderTop: '3px solid #ffffff',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// Ruta "/": primero revisa si hay un vault cifrado en este dispositivo — si lo
// hay, muestra la pantalla de bloqueo (PIN/huella) ANTES de cualquier otra
// cosa. Si no hay vault, cae al comportamiento de siempre: si ya hay una
// sesión restaurada (AuthContext), salta directo al panel; si no, login normal.
const RootRoute = () => {
    const { user, loading } = useAuth();
    const [checkingVault, setCheckingVault] = useState(true);
    const [hasVault, setHasVault] = useState(false);
    const [unlocked, setUnlocked] = useState(false);

    useEffect(() => {
        vaultExists().then(exists => { setHasVault(exists); setCheckingVault(false); });
    }, []);

    if (checkingVault) return <Spinner />;
    if (hasVault && !unlocked) return <LockScreen onUnlocked={() => setUnlocked(true)} />;

    if (loading) return <Spinner />;
    if (user) return <Navigate to={user.onboardingCompleto ? '/workspace' : '/onboarding'} replace />;
    return <LoginPage />;
};

export default RootRoute;
