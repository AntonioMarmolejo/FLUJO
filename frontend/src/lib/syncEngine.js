import db from './db.js';
import api from '../api/axios.js';

// Sube un item pendiente al servidor con reintentos exponenciales
const uploadItem = async (item, attempt = 0) => {
    try {
        const { data } = await api.post('/movimientos', item.payload);
        await db.movimientosPending.update(item.uuid, { synced: 1, serverId: data.movimiento._id });
        return { uuid: item.uuid, serverId: data.movimiento._id };
    } catch (err) {
        if (attempt >= 3) throw err;
        const delay = 2000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        return uploadItem(item, attempt + 1);
    }
};

// Recorre la cola y sube todo lo que esté pendiente
export const syncPendingMovimientos = async (onSynced) => {
    if (!navigator.onLine) return;
    const pending = await db.movimientosPending.where('synced').equals(0).toArray();
    for (const item of pending) {
        try {
            const result = await uploadItem(item);
            if (onSynced) onSynced(result);
        } catch {
            // Se reintentará la próxima vez que haya conexión
        }
    }
};

// Agrega un movimiento a la cola offline
export const encolarMovimiento = async ({ uuid, payload, hora, fecha }) => {
    await db.movimientosPending.add({
        uuid,
        payload: { ...payload, clientUUID: uuid },
        hora,
        fecha,
        synced: 0,
        createdAt: Date.now(),
    });
};

// Obtiene todos los pendientes sin sincronizar (para mostrar en UI)
export const getPendingMovimientos = async () => {
    return db.movimientosPending.where('synced').equals(0).toArray();
};

// Marca un item como sincronizado (llamar cuando la API responde OK tras el write-ahead)
export const marcarSincronizado = async (uuid, serverId) => {
    await db.movimientosPending.update(uuid, { synced: 1, serverId });
};

// ── Cola de ediciones offline ─────────────────────────────
// Persiste una edición en Dexie. Si el mismo movimiento se edita varias veces
// offline, la más reciente reemplaza a la anterior (put = upsert).
export const encolarEdicion = async ({ id, payload }) => {
    await db.edicionesPending.put({ id, payload, synced: 0, createdAt: Date.now() });
};

// Marca una edición como sincronizada (llamar cuando la API responde OK)
export const marcarEdicionSincronizada = async (id) => {
    await db.edicionesPending.update(id, { synced: 1 });
};

// Sube todas las ediciones pendientes al servidor
export const syncPendingEdiciones = async (onSynced) => {
    if (!navigator.onLine) return;
    const pending = await db.edicionesPending.where('synced').equals(0).toArray();
    for (const item of pending) {
        try {
            const { data } = await api.put(`/movimientos/${item.id}`, item.payload);
            await db.edicionesPending.update(item.id, { synced: 1 });
            if (onSynced) onSynced(item.id, data.movimiento);
        } catch { /* se reintentará en el próximo ciclo */ }
    }
};

// Elimina un item de la cola (solo los ya sincronizados o cancelados)
export const limpiarSincronizados = async () => {
    await db.movimientosPending.where('synced').equals(1).delete();
};

// Cachea un vehículo para búsqueda offline
export const cacheVehiculo = async (v) => {
    await db.vehiculosCache.put({ ...v, updatedAt: Date.now() });
};

// Busca una placa en caché local
export const buscarPlacaLocal = async (placa) => {
    return db.vehiculosCache.get(placa.trim().toUpperCase());
};

// Devuelve todos los vehículos cacheados (para listado offline completo)
export const getVehiculosCache = async () => {
    return db.vehiculosCache.orderBy('placa').toArray();
};

// Elimina un vehículo del caché local (tras borrado en servidor)
export const deleteCachedVehiculo = async (placa) => {
    if (!placa) return;
    await db.vehiculosCache.delete(placa.trim().toUpperCase());
};

// Cachea personas para búsqueda offline de conductor/cédula
export const cachePersona = async (p) => {
    if (!p.cedula) return;
    await db.personasCache.put({ ...p, updatedAt: Date.now() });
};

export const buscarPersonaLocal = async (query) => {
    const q = query.toLowerCase();
    return db.personasCache
        .filter(p =>
            (p.nombres || '').toLowerCase().includes(q) ||
            (p.cedula || '').includes(q)
        )
        .toArray();
};

// Devuelve todo el catálogo de personas cacheado (para la pantalla de Personas offline)
export const getPersonasCache = async () => {
    return db.personasCache.orderBy('nombres').toArray();
};

export const deleteCachedPersona = async (cedula) => {
    if (!cedula) return;
    await db.personasCache.delete(cedula);
};

// Cachea una extensión para la pantalla de Extensiones offline
export const cacheExtension = async (e) => {
    if (!e._id) return;
    await db.extensionesCache.put({ ...e, updatedAt: Date.now() });
};

export const getExtensionesCache = async () => {
    return db.extensionesCache.orderBy('nombre').toArray();
};

export const deleteCachedExtension = async (id) => {
    if (!id) return;
    await db.extensionesCache.delete(id);
};

export const buscarExtensionLocal = async (query) => {
    const q = query.toLowerCase();
    return db.extensionesCache
        .filter(e =>
            (e.nombre || '').toLowerCase().includes(q) ||
            (e.cargo || '').toLowerCase().includes(q) ||
            (e.departamento || '').toLowerCase().includes(q)
        )
        .toArray();
};

// ── Vigencia de caché tipo Netflix (cachedAt/expiresAt) ───
// Un registro por catálogo ('vehiculos' | 'personas' | 'extensiones').
export const CATALOG_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export const touchCatalogMeta = async (catalogo) => {
    const now = Date.now();
    await db.catalogMeta.put({ catalogo, cachedAt: now, expiresAt: now + CATALOG_TTL_MS });
};

export const getCatalogMeta = async (catalogo) => {
    return db.catalogMeta.get(catalogo);
};

export const isCatalogStale = async (catalogo) => {
    const meta = await getCatalogMeta(catalogo);
    return !meta || meta.expiresAt < Date.now();
};
