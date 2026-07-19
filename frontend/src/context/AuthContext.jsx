import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import api from '../api/axios';

const AuthContext = createContext();

const getDeviceId = () => {
    let id = localStorage.getItem('deviceId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('deviceId', id); }
    return id;
};

const saveSession = (data) => {
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
};

// Devuelve true si el dispositivo tiene autenticador biométrico de plataforma
export const checkBiometricSupport = async () => {
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('token');
            const refreshToken = localStorage.getItem('refreshToken');
            const cached = localStorage.getItem('user');

            if (!token && !refreshToken) { setLoading(false); return; }

            // Sin internet: restaurar sesión cacheada sin tocar el servidor
            if (!navigator.onLine && cached) {
                try { setUser(JSON.parse(cached)); setLoading(false); return; } catch { /* ignorar */ }
            }

            // Intento 1: access token válido
            if (token) {
                try {
                    const { data } = await api.get('/auth/me', { timeout: 8000 });
                    setUser(data.user);
                    setLoading(false);
                    return;
                } catch { /* continuar */ }
            }

            // Intento 2: renovar con refresh token
            if (refreshToken) {
                try {
                    const { data } = await api.post('/auth/refresh', { refreshToken });
                    localStorage.setItem('token', data.token);
                    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                    setUser(data.user || (cached ? JSON.parse(cached) : null));
                    setLoading(false);
                    return;
                } catch { /* refresh expirado o sin internet */ }
            }

            // Último recurso offline
            if (cached && !navigator.onLine) {
                try { setUser(JSON.parse(cached)); setLoading(false); return; } catch { /* ignorar */ }
            }

            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            setLoading(false);
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
        const { data } = await api.post('/auth/login', { email, password, deviceId: getDeviceId() });
        saveSession(data);
        setUser(data.user);
        if (data.user.onboardingCompleto) navigate('/workspace');
        else navigate('/onboarding');
    };

    const register = async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password, deviceId: getDeviceId() });
        saveSession(data);
        setUser(data.user);
        navigate('/onboarding');
    };

    const loginWithGoogle = async (accessToken) => {
        const { data } = await api.post('/auth/google', { token: accessToken, deviceId: getDeviceId() });
        saveSession(data);
        setUser(data.user);
        if (data.user.onboardingCompleto) navigate('/workspace');
        else navigate('/onboarding');
    };

    // Login biométrico: el usuario solo necesita su email + huella/Face ID
    const loginWithBiometric = async (email) => {
        const deviceId = getDeviceId();
        const optRes = await api.post('/webauthn/authenticate/options', { email });
        const asseResp = await startAuthentication({ optionsJSON: optRes.data });
        const verifyRes = await api.post('/webauthn/authenticate/verify', {
            body: asseResp,
            userId: optRes.data.userId,
            deviceId,
        });
        saveSession(verifyRes.data);
        setUser(verifyRes.data.user);
        if (verifyRes.data.user.onboardingCompleto) navigate('/workspace');
        else navigate('/onboarding');
    };

    // Registrar la huella del dispositivo actual (debe llamarse con sesión activa)
    const registerPasskey = async (deviceName = '') => {
        const deviceId = getDeviceId();
        const optRes = await api.post('/webauthn/register/options');
        const attResp = await startRegistration({ optionsJSON: optRes.data });
        const verifyRes = await api.post('/webauthn/register/verify', {
            body: attResp,
            deviceId,
            deviceName,
        });
        return verifyRes.data;
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            api.post('/auth/logout', { refreshToken }).catch(() => {});
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
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
        <AuthContext.Provider value={{
            user, loading,
            login, register, loginWithGoogle, loginWithBiometric, registerPasskey,
            logout, updateUser,
            role, isAdmin, isSupervisor, isPending, permisosPanel, hasPermiso,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
