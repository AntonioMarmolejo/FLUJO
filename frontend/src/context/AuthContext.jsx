import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('token');
            if (!token) { setLoading(false); return; }
            try {
                const { data } = await api.get('/auth/me', { timeout: 8000 });
                setUser(data.user);
            } catch {
                const cached = localStorage.getItem('user');
                if (cached) {
                    try { setUser(JSON.parse(cached)); return; } catch { /* ignorar */ }
                }
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        verifyToken();
    }, []);

    useEffect(() => {
        if (!user) return;
        const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [user]);

    const updateUser = (newUserData) => {
        localStorage.setItem('user', JSON.stringify(newUserData));
        setUser(newUserData);
    };

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        if (data.user.onboardingCompleto) navigate('/workspace');
        else navigate('/onboarding');
    };

    const register = async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        navigate('/onboarding');
    };

    const loginWithGoogle = async (accessToken) => {
        const { data } = await api.post('/auth/google', { token: accessToken });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        if (data.user.onboardingCompleto) navigate('/workspace');
        else navigate('/onboarding');
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
    };

    const role = user?.role || 'operador';
    const isAdmin = role === 'admin';
    const isSupervisor = role === 'supervisor' || role === 'admin';
    const isPending = (user?.status || 'pending') === 'pending';
    const permisosPanel = user?.permisosPanel || [];
    const hasPermiso = (panel) => isAdmin || permisosPanel.includes(panel);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, updateUser, role, isAdmin, isSupervisor, isPending, permisosPanel, hasPermiso }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
