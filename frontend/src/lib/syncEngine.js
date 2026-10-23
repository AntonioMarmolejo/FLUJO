import db from './db.js';
import api from '../api/axios.js';

// Evita que el mismo movimiento se suba dos veces en paralelo — el intento
// inmediato al guardar y el motor de reintento periódico pueden dispararse
// casi al mismo tiempo si la red está lenta, y sin este candado ambos
// terminan creando su propio registro en el servidor (el "se duplica el
// movimiento" que reporta el usuario). El índice único de clientUUID en el
// backend es la segunda línea de defensa si de todas formas se solapan.
const uploadingUuids = new Set();

// Sube un item pendiente al servidor con reintentos exponenciales
const uploadItem = async (item, attempt = 0) => {
    try {
        const { data } = await api.post('/movimientos', item.payload);
        // Si el usuario borró este movimiento mientras se estaba subiendo
        // (ver cancelarMovimientoPendiente), deshacer también en el servidor.
        const fresh = await db.movimientosPending.get(item.uuid);
        if (fresh?.cancelado) {
            await api.delete(`/movimientos/${data.movimiento._id}`).catch(() => {});
            await db.movimientosPending.delete(item.uuid);
            return { uuid: item.uuid, serverId: null, cancelado: true };
        }
        await db.movimientosPending.update(item.uuid, { synced: 1, serverId: data.movimiento._id });
        return { uuid: item.uuid, serverId: data.movimiento._id, movimiento: data.movimiento };
    } catch (err) {
        if (attempt >= 3) throw err;
        const delay = 2000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        return uploadItem(item, attempt + 1);
    }
};

// Punto único de subida: lo usan tanto el guardado inicial (handleSubmit)
// como el motor de reintento periódico, para que el candado en memoria
// realmente los excluya mutuamente. Devuelve null si ya se estaba subiendo
// desde otro disparador, o si el item ya no existe/ya está sincronizado.
export const subirMovimientoPendiente = async (uuid) => {
    if (uploadingUuids.has(uuid)) return null;
    uploadingUuids.add(uuid);
    try {
        const item = await db.movimientosPending.get(uuid);
        if (!item || item.synced) return null;
        return await uploadItem(item);
    } finally {
        uploadingUuids.delete(uuid);
    }
};

// Recorre la cola y sube todo lo que esté pendiente
export const syncPendingMovimientos = async (onSynced) => {
    if (!navigator.onLine) return;
    const pending = await db.movimientosPending.where('synced').equals(0).toArray();
    for (const item of pending) {
        try {
            const result = await subirMovimientoPendiente(item.uuid);
            if (result && onSynced) onSynced(result);
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

// Cancela un movimiento que todavía no se subió al servidor. Si justo se
// está subiendo en este momento, no se puede abortar la petición en vuelo —
// se marca para que, si de todas formas llega a crearse, uploadItem la
// borre apenas lo note (ver arriba).
export const cancelarMovimientoPendiente = async (uuid) => {
    if (uploadingUuids.has(uuid)) {
        await db.movimientosPending.update(uuid, { cancelado: true });
    } else {
        await db.movimientosPending.delete(uuid);
    }
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

// ── Cola de borrados offline ──────────────────────────────
// Borrar un movimiento ya confirmado en el servidor también debe funcionar
// sin conexión: se encola y el motor de sincronización lo reintenta cuando
// vuelve internet, en vez de fallar en silencio como pasaba antes.
export const encolarBorrado = async (id) => {
    await db.borradosPending.put({ id, createdAt: Date.now() });
};

// Si el borrado ya se confirmó contra el servidor, sale de la cola
export const cancelarBorradoEncolado = async (id) => {
    await db.borradosPending.delete(id);
};

export const getBorradosPendientesIds = async () => {
    const rows = await db.borradosPending.toArray();
    return rows.map(r => r.id);
};

export const syncPendingBorrados = async () => {
    if (!navigator.onLine) return;
    const pending = await db.borradosPending.toArray();
    for (const { id } of pending) {
        try {
            await api.delete(`/movimientos/${id}`);
            await db.borradosPending.delete(id);
        } catch (err) {
            // Si el servidor dice que ya no existe, el borrado ya se cumplió
            if (err.response?.status === 404) await db.borradosPending.delete(id);
            // si no, se reintentará en el próximo ciclo
        }
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
