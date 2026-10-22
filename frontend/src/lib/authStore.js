// Store de credenciales EN MEMORIA (nunca en localStorage). Vive solo mientras
// dure la pestaña — al recargar, hay que pasar de nuevo por el vault (PIN/huella)
// o por un login online para repoblarlo.
let accessToken = null;
let refreshToken = null;

export const setAccessToken = (token) => { accessToken = token || null; };
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => { accessToken = null; };

export const setRefreshToken = (token) => { refreshToken = token || null; };
export const getRefreshToken = () => refreshToken;
export const clearRefreshToken = () => { refreshToken = null; };

export const clearAuthStore = () => { accessToken = null; refreshToken = null; };
