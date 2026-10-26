import axios from 'axios';
import { getAccessToken, setAccessToken, getRefreshToken, clearAuthStore } from '../lib/authStore.js';
import { destroyVault } from '../lib/vault.js';

const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let isRefreshing = false;
let refreshQueue = [];

const processRefreshQueue = (error, token) => {
    refreshQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
    refreshQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
            // Si estamos offline, NO redirigir — dejar que opere localmente
            if (!navigator.onLine) return Promise.reject(error);

            // El refreshToken ya no vive en localStorage: solo está en memoria
            // (se repobló al desbloquear el vault o al hacer login). Si no hay
            // nada en memoria (ej. la pestaña se recargó sin desbloquear), mandar
            // a la raíz para que RootRoute decida entre LockScreen y LoginPage.
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                clearAuthStore();
                window.location.href = '/';
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    refreshQueue.push({ resolve, reject });
                }).then(token => {
                    original.headers.Authorization = `Bearer ${token}`;
                    return api(original);
                });
            }

            original._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post('/api/auth/refresh', { refreshToken });
                setAccessToken(data.token);
                if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                processRefreshQueue(null, data.token);
                original.headers.Authorization = `Bearer ${data.token}`;
                return api(original);
            } catch (refreshError) {
                processRefreshQueue(refreshError, null);
                // Si el refresh falló por red, servidor reiniciándose o un 5xx,
                // la sesión sigue siendo válida: no cerrarla por un fallo pasajero.
                const rechazado = [401, 403].includes(refreshError.response?.status);
                if (!rechazado) return Promise.reject(refreshError);
                // El refreshToken guardado ya no es válido en el servidor (revocado
                // o expirado): no tiene sentido mantener un vault que nunca más va
                // a poder refrescar sesión, así que se borra y se manda a login.
                clearAuthStore();
                localStorage.removeItem('user');
                await destroyVault().catch(() => {});
                window.location.href = '/';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
