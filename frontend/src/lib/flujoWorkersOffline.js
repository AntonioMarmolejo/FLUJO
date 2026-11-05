import db from './db.js';
import api from '../api/axios.js';

// Jefes Inmediatos sin conexión. Cada cambio se pinta al instante y entra a una
// cola que se sube en orden. Lo que se ve siempre es la última copia del servidor
// más los cambios que aún no se suben, así una recarga no deshace nada.
//
// Reenviar un cambio es seguro, aunque el servidor ya lo haya recibido y solo se
// perdiera la respuesta: los funcionarios nuevos llevan su ID desde el dispositivo
// (crear dos veces el mismo no crea otro) y las ediciones envían el registro completo.

const TIMEOUT_MS = 15_000;
const CLAVE_CACHE = 'lista';

const avisar = (detail) => window.dispatchEvent(new CustomEvent('flujo:workers', { detail }));

// Mismo formato que un ObjectId de MongoDB: 4 bytes de fecha y 8 al azar
export const nuevoIdWorker = () => {
    const fecha = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const azar = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
    return fecha + azar;
};

export const aplicarCambios = (lista, cambios) => cambios.reduce((acc, c) => {
    if (c.tipo === 'borrar') return acc.filter(w => w._id !== c.id);
    if (acc.some(w => w._id === c.id)) return acc.map(w => (w._id === c.id ? c.doc : w));
    return c.tipo === 'crear' ? [...acc, c.doc] : acc;
}, lista);

export const leerWorkersLocales = async () => {
    const [cache, pendientes] = await Promise.all([
        db.flujoWorkersCache.get(CLAVE_CACHE),
        db.flujoWorkersPending.orderBy('seq').toArray(),
    ]);
    return aplicarCambios(cache?.workers || [], pendientes);
};

let subidas = 0; // una lista pedida antes de la última subida ya está vieja

const descargarWorkers = async () => {
    const version = subidas;
    const { data } = await api.get('/flujo-workers', { timeout: TIMEOUT_MS });
    if (version !== subidas) return;
    const workers = [...data.active, ...data.soon, ...(data.descanso || [])];
    await db.flujoWorkersCache.put({ id: CLAVE_CACHE, workers });
};

const enviarCambio = ({ tipo, id, doc }) => {
    const config = { timeout: TIMEOUT_MS };
    if (tipo === 'crear') return api.post('/flujo-workers', doc, config);
    if (tipo === 'editar') return api.put(`/flujo-workers/${id}`, doc, config);
    return api.delete(`/flujo-workers/${id}`, config);
};

let sincronizando = false;

export const syncFlujoWorkers = async () => {
    if (!navigator.onLine || sincronizando) return;
    sincronizando = true;
    let rechazados = 0;
    const inicio = subidas;
    try {
        for (;;) {
            const cambio = await db.flujoWorkersPending.orderBy('seq').first();
            if (!cambio) break;
            try {
                await enviarCambio(cambio);
            } catch (err) {
                const status = err.response?.status;
                // Sin red, servidor caído o sin acceso por ahora: sigue en cola, en orden
                if (!status || status >= 500 || [401, 403, 429].includes(status)) break;
                // Un 404 al editar o borrar: otro dispositivo ya lo eliminó, no hay nada que hacer
                if (status !== 404 || cambio.tipo === 'crear') rechazados++;
            }
            await db.flujoWorkersPending.delete(cambio.seq);
            subidas++;
        }
    } finally {
        sincronizando = false;
    }
    if (subidas !== inicio) {
        await descargarWorkers().catch(() => {});
        avisar({ rechazados });
    }
};

// Trae la lista del servidor (subiendo antes lo pendiente). Falla sin conexión.
export const refrescarWorkers = async () => {
    await syncFlujoWorkers();
    await descargarWorkers();
};

export const encolarCambiosWorkers = async (cambios) => {
    await db.flujoWorkersPending.bulkAdd(cambios.map(c => ({ ...c, createdAt: Date.now() })));
    avisar({ rechazados: 0 });
    syncFlujoWorkers().catch(() => {});
};
