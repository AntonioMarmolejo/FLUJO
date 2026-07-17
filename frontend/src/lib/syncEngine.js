import db from './db.js';
import api from '../api/axios.js';

// Sube un item pendiente al servidor con reintentos exponenciales
const uploadItem = async (item, attempt = 0) => {
    try {
        const { data } = await api.post('/movimientos', item.payload);
        await db.movimientosPending.update(item.uuid, { synced: true, serverId: data.movimiento._id });
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
