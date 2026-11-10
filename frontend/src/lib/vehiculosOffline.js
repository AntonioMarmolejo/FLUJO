import db from './db.js';
import api from '../api/axios.js';
import { touchCatalogMeta } from './syncEngine.js';
import { nuevoIdWorker } from './flujoWorkersOffline.js';

// Placas de vehículos sin conexión. Cada cambio se aplica al instante en la copia
// local (vehiculosCache, la misma que usa el formulario de movimientos para
// autocompletar) y entra a una cola que se sube en orden cuando hay internet.
//
// Reenviar un cambio es seguro aunque el servidor ya lo haya recibido: los
// vehículos nuevos llevan su ID desde el dispositivo (crearlo dos veces no crea
// otro) y las ediciones envían el registro completo.

const TIMEOUT_MS = 15_000;

export const nuevoIdVehiculo = nuevoIdWorker;

const avisar = (detail) => window.dispatchEvent(new CustomEvent('flujo:vehiculos', { detail }));

// Aplica a la copia local los cambios que aún no se suben
const aplicarPendientesEnCache = async () => {
    const pendientes = await db.vehiculosPending.orderBy('seq').toArray();
    for (const c of pendientes) {
        if (c.tipo === 'borrar') await db.vehiculosCache.delete(c.placa);
        else await db.vehiculosCache.put({ ...c.doc, updatedAt: Date.now() });
    }
};

export const leerVehiculosLocales = async () => {
    const arr = await db.vehiculosCache.toArray();
    return arr.sort((a, b) => (a.placa || '').localeCompare(b.placa || ''));
};

let subidas = 0; // una lista pedida antes de la última subida ya está vieja

const descargarVehiculos = async () => {
    const version = subidas;
    const { data } = await api.get('/vehiculos', { timeout: TIMEOUT_MS });
    if (version !== subidas) return;
    // La lista del servidor reemplaza la copia local (así desaparecen los que
    // otro dispositivo borró) y encima se vuelven a poner los cambios pendientes.
    await db.transaction('rw', db.vehiculosCache, db.vehiculosPending, async () => {
        await db.vehiculosCache.clear();
        const ahora = Date.now();
        await db.vehiculosCache.bulkPut(data.vehiculos.map(v => ({ ...v, updatedAt: ahora })));
        await aplicarPendientesEnCache();
    });
    await touchCatalogMeta('vehiculos');
};

const enviarCambio = ({ tipo, id, doc }) => {
    const config = { timeout: TIMEOUT_MS };
    if (tipo === 'crear') return api.post('/vehiculos', doc, config);
    if (tipo === 'editar') return api.put(`/vehiculos/${id}`, doc, config);
    return api.delete(`/vehiculos/${id}`, config);
};

let sincronizando = false;

export const syncVehiculos = async () => {
    if (!navigator.onLine || sincronizando) return;
    sincronizando = true;
    let rechazados = 0;
    const inicio = subidas;
    try {
        for (;;) {
            const cambio = await db.vehiculosPending.orderBy('seq').first();
            if (!cambio) break;
            try {
                await enviarCambio(cambio);
            } catch (err) {
                const status = err.response?.status;
                // Sin red, servidor caído o sin acceso por ahora: sigue en cola, en orden
                if (!status || status >= 500 || [401, 403, 429].includes(status)) break;
                const existente = err.response.data?.existing;
                if (status === 409 && cambio.tipo === 'crear' && existente?._id) {
                    // La placa ya estaba registrada (por ejemplo, desde un movimiento):
                    // los datos escritos se guardan sobre ese vehículo, y los cambios
                    // siguientes del mismo vehículo pasan a apuntar a él.
                    await db.vehiculosPending.update(cambio.seq, { tipo: 'editar', id: existente._id, doc: { ...cambio.doc, _id: existente._id } });
                    await db.vehiculosPending.where('seq').above(cambio.seq)
                        .filter(c => c.id === cambio.id)
                        .modify(c => { c.id = existente._id; if (c.doc) c.doc._id = existente._id; });
                    continue;
                }
                // Un 404 al editar o borrar: otro dispositivo ya lo eliminó, no hay nada que hacer
                if (status !== 404 || cambio.tipo === 'crear') rechazados++;
            }
            await db.vehiculosPending.delete(cambio.seq);
            subidas++;
        }
    } finally {
        sincronizando = false;
    }
    if (subidas !== inicio) {
        await descargarVehiculos().catch(() => {});
        avisar({ rechazados });
    }
};

// Trae la lista del servidor (subiendo antes lo pendiente). Falla sin conexión.
export const refrescarVehiculos = async () => {
    await syncVehiculos();
    await descargarVehiculos();
};

// Registra un cambio: se ve al instante y se sube cuando haya conexión.
// cambio = { tipo: 'crear' | 'editar', doc } o { tipo: 'borrar', id, placa }
export const encolarCambioVehiculo = async (cambio) => {
    const registro = { ...cambio, id: cambio.id || cambio.doc._id, placa: cambio.placa || cambio.doc.placa, createdAt: Date.now() };
    await db.transaction('rw', db.vehiculosCache, db.vehiculosPending, async () => {
        await db.vehiculosPending.add(registro);
        if (registro.tipo === 'borrar') await db.vehiculosCache.delete(registro.placa);
        else await db.vehiculosCache.put({ ...registro.doc, updatedAt: Date.now() });
    });
    avisar({ rechazados: 0 });
    syncVehiculos().catch(() => {});
};
