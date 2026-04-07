import { useAuth } from '../context/AuthContext';
import './WorkspacePage.css';

const WorkspacePage = () => {
    const { user, logout } = useAuth();

    return (
        <div className="workspace-wrapper">
            <div className="workspace-card">
                <div className="workspace-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M3 17l4-8 4 4 4-6 4 10" stroke="#fff" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <h2>¡Bienvenido, {user?.name}! 👋</h2>
                <p>Tu workspace está listo</p>
                <button onClick={logout} className="btn-logout">
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
};

export default WorkspacePage;

/**
 * Página destino tras login
 */