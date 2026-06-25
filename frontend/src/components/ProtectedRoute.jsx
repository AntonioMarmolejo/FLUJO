import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, role } = useAuth();

    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/" replace />;

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/workspace" replace />;
    }

    return children;
};

export default ProtectedRoute;
