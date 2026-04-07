import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    // Esperar a que se verifique la sesión antes de redirigir
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                color: '#666',
                fontSize: '14px'
            }}>
                Cargando...
            </div>
        );
    }

    return user ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;