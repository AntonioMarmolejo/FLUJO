import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRoute } from '../lib/homeRoute.js';
import { vaultExists } from '../lib/vault.js';
import LoginPage from '../pages/LoginPage';
import LockScreen from '../pages/LockScreen';
import Spinner from './Spinner';

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
    if (user) return <Navigate to={getHomeRoute(user)} replace />;
    return <LoginPage />;
};

export default RootRoute;
