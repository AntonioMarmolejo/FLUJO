import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vaultExists } from '../lib/vault.js';
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

// allowedRoles: array de roles permitidos, ej. ['admin'] o ['admin', 'supervisor']
// Si no se pasa allowedRoles, solo verifica que el usuario esté autenticado.
// requireActive: la ruta permite hacer cambios (crear flujos, turnos...), así
// que una cuenta pendiente de aprobación se manda a /cuenta-pendiente.
const ProtectedRoute = ({ children, allowedRoles, requireActive }) => {
    const { user, loading, role, isPending } = useAuth();
    const [checkingVault, setCheckingVault] = useState(true);
    const [hasVault, setHasVault] = useState(false);
    const [unlocked, setUnlocked] = useState(false);

    useEffect(() => {
        vaultExists().then(exists => { setHasVault(exists); setCheckingVault(false); });
    }, []);

    if (checkingVault) return <Spinner />;
    // Recargar la página estando en una ruta protegida (ej. /workspace) no
    // pasa por RootRoute ("/"), así que sin esto el vault nunca se consulta
    // aquí: AuthContext deja user=null a propósito para que LockScreen lo
    // restaure, pero esta ruta lo tomaría como sesión cerrada y expulsaría al
    // login en vez de pedir PIN/huella. `!user` evita re-pedirlo justo
    // después de un login recién hecho en esta misma sesión.
    if (hasVault && !unlocked && !user) return <LockScreen onUnlocked={() => setUnlocked(true)} />;

    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/" replace />;

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/workspace" replace />;
    }

    if (requireActive && isPending) return <Navigate to="/cuenta-pendiente" replace />;

    return children;
};

export default ProtectedRoute;
