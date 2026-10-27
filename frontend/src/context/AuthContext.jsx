import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import api from '../api/axios';
import { setAccessToken, setRefreshToken, getRefreshToken, clearAuthStore } from '../lib/authStore.js';
import { vaultExists, destroyVault } from '../lib/vault.js';
import { getHomeRoute } from '../lib/homeRoute.js';

const AuthContext = createContext();

const getDeviceId = () => {
    let id = localStorage.getItem('deviceId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('deviceId', id); }
    return id;
};

// El perfil del usuario no es un secreto (ya se muestra en la UI) y sigue
// cacheado en claro para poder pintar la app sin esperar al servidor. El
// token/refreshToken YA NO se guardan aquí — ver lib/authStore.js (memoria)
// y lib/vault.js (vault cifrado en Dexie, desbloqueado por PIN/huella).
const cacheUser = (user) => localStorage.setItem('user', JSON.stringify(user));

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
        const bootstrap = async () => {
            // Si ya existe un vault en este dispositivo, la restauración real la
            // hace LockScreen (PIN/huella) llamando a restoreFromVault() — aquí
            // no hay nada que intentar contra el servidor todavía.
            if (await vaultExists()) { setLoading(false); return; }

            // Sin vault: dispositivo nuevo, o una sesión "legacy" (de antes de
            // este cambio) que aún tiene token en claro en localStorage. Si hay
            // una sesión legacy, se migra sin forzar un re-login — ver
            // afterAuthSuccess más abajo y CreatePinScreen.
            const legacyToken = localStorage.getItem('token');
            const legacyRefresh = localStorage.getItem('refreshToken');
            const cached = localStorage.getItem('user');

            if (!legacyToken && !legacyRefresh) { setLoading(false); return; }

            if (!navigator.onLine && cached) {
                try {
                    setUser(JSON.parse(cached));
                    if (legacyRefresh) setRefreshToken(legacyRefresh);
                    setLoading(false);
                    return;
                } catch { /* ignorar */ }
            }

            if (legacyToken) {
                try {
                    setAccessToken(legacyToken);
                    const { data } = await api.get('/auth/me', { timeout: 8000 });
                    setUser(data.user);
                    if (legacyRefresh) setRefreshToken(legacyRefresh);
                    setLoading(false);
                    return;
                } catch { /* continuar */ }
            }

            if (legacyRefresh) {
                try {
                    const { data } = await api.post('/auth/refresh', { refreshToken: legacyRefresh });
                    setAccessToken(data.token);
                    setRefreshToken(legacyRefresh);
                    if (data.user) cacheUser(data.user);
                    setUser(data.user || (cached ? JSON.parse(cached) : null));
                    setLoading(false);
                    return;
                } catch { /* refresh vencido o sin internet */ }
            }

            if (cached && !navigator.onLine) {
                try { setUser(JSON.parse(cached)); setLoading(false); return; } catch { /* ignorar */ }
            }

            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            setLoading(false);
        };
        bootstrap();
    }, []);

    useEffect(() => {
        if (!user) return;
        const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [user]);

    const updateUser = (newUserData) => {
        cacheUser(newUserData);
        setUser(newUserData);
    };

    // El interceptor de axios avisa cuando el servidor niega algo por estado
    // de cuenta o permisos: se resincroniza el perfil para que la interfaz
    // (paneles visibles, redirección de cuenta suspendida) refleje lo real.
    useEffect(() => {
        if (!user) return;
        let enCurso = false;
        const resincronizar = async () => {
            if (enCurso) return;
            enCurso = true;
            try {
                const { data } = await api.get('/auth/me', { timeout: 8000 });
                cacheUser(data.user);
                setUser(data.user);
            } catch { /* sin conexión: se queda con el perfil cacheado */ }
            finally { enCurso = false; }
        };
        window.addEventListener('flujo:acceso-cambiado', resincronizar);
        return () => window.removeEventListener('flujo:acceso-cambiado', resincronizar);
    }, [user]);

    // Llamado por LockScreen tras un PIN/huella correcto: repuebla la sesión
    // SIN tocar el servidor (restaura el perfil cacheado de inmediato), y si
    // hay internet intenta refrescar el access token en background sin
    // bloquear al usuario si falla por estar simplemente offline.
    const restoreFromVault = async (refreshToken) => {
        setRefreshToken(refreshToken);
        const cached = localStorage.getItem('user');
        if (cached) { try { setUser(JSON.parse(cached)); } catch { /* ignorar */ } }

        if (!navigator.onLine) return { ok: true };
        try {
            const { data } = await api.post('/auth/refresh', { refreshToken });
            setAccessToken(data.token);
            if (data.user) { setUser(data.user); cacheUser(data.user); }
            return { ok: true };
        } catch (err) {
            if (err.response?.status === 401) {
                // El refreshToken guardado en el vault ya no es válido en el
                // servidor (revocado o vencido) — no se puede restaurar esta
                // sesión, hay que iniciar sesión de nuevo.
                clearAuthStore();
                localStorage.removeItem('user');
                await destroyVault().catch(() => {});
                setUser(null);
                return { ok: false, expired: true };
            }
            // Error de red u otro problema pasajero: seguir con lo ya restaurado.
            return { ok: true };
        }
    };

    // Tras cualquier login online exitoso: si este dispositivo no tiene vault
    // todavía, pide crear un PIN antes de entrar (CreatePinScreen). Si ya
    // existe uno, se deja tal cual — el refreshToken anterior sigue siendo
    // válido en el servidor por un tiempo, así que no hace falta pedir el PIN
    // de nuevo solo para actualizarlo.
    const afterAuthSuccess = async (data) => {
        setAccessToken(data.token);
        setRefreshToken(data.refreshToken);
        cacheUser(data.user);
        setUser(data.user);

        const dest = getHomeRoute(data.user);
        if (!(await vaultExists())) {
            navigate('/crear-pin', { state: { refreshToken: data.refreshToken, dest } });
        } else {
            navigate(dest);
        }
    };

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password, deviceId: getDeviceId() });
        await afterAuthSuccess(data);
    };

    const register = async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password, deviceId: getDeviceId() });
        await afterAuthSuccess(data);
    };

    const loginWithGoogle = async (accessToken) => {
        const { data } = await api.post('/auth/google', { token: accessToken, deviceId: getDeviceId() });
        await afterAuthSuccess(data);
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
        await afterAuthSuccess(verifyRes.data);
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
        const refreshToken = getRefreshToken();
        if (refreshToken) {
            api.post('/auth/logout', { refreshToken }).catch(() => {});
        }
        clearAuthStore();
        localStorage.removeItem('user');
        await destroyVault().catch(() => {});
        setUser(null);
        navigate('/');
    };

    const role = user?.role || 'operador';
    const isAdmin = role === 'admin';
    const isSupervisor = role === 'supervisor' || role === 'admin';
    const isPending = !isAdmin && (user?.status || 'pending') === 'pending';
    const isSuspended = !isAdmin && user?.status === 'suspended';
    const permisosPanel = user?.permisosPanel || [];
    const hasPermiso = (panel) => isAdmin || permisosPanel.includes(panel);
    // Bloques que el admin aprobó: solo en esos se puede abrir turno y ver su información
    const bloquesAprobados = user?.bloquesAprobados || [];
    const tieneBloque = (bloque) => isAdmin || bloquesAprobados.includes(String(bloque));

    return (
        <AuthContext.Provider value={{
            user, loading,
            login, register, loginWithGoogle, loginWithBiometric, registerPasskey,
            logout, updateUser, restoreFromVault,
            role, isAdmin, isSupervisor, isPending, isSuspended, permisosPanel, hasPermiso, tieneBloque,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
