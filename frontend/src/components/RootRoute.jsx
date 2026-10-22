import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';

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

// Ruta "/": si ya hay una sesión válida (restaurada por AuthContext desde el
// token guardado o desde caché offline), salta la pantalla de login y entra
// directo al panel — en vez de mostrar el formulario aunque el usuario ya
// esté autenticado.
const RootRoute = () => {
    const { user, loading } = useAuth();

    if (loading) return <Spinner />;
    if (user) return <Navigate to={user.onboardingCompleto ? '/workspace' : '/onboarding'} replace />;
    return <LoginPage />;
};

export default RootRoute;
