import db from './db.js';
import api from '../api/axios.js';
import { touchCatalogMeta } from './syncEngine.js';
import { nuevoIdWorker } from './flujoWorkersOffline.js';

// Catálogo sin conexión (Placas de vehículos, Personas). Cada cambio se aplica al
// instante en la copia local (la misma que usan los formularios para autocompletar)
// y entra a una cola que se sube en orden cuando hay internet.
//
// Reenviar un cambio es seguro aunque el servidor ya lo haya recibido: los
// registros nuevos llevan su ID desde el dispositivo (crearlo dos veces no crea
// otro) y las ediciones envían el registro completo.
//
// config: {
//   ruta:     '/vehiculos'           ruta de la API
//   lista:    'vehiculos'            campo de la respuesta de GET con la lista
//   clave:    'placa'                clave de la copia local (única en el servidor)
//   cache, pendientes                tablas de Dexie
//   evento:   'flujo:vehiculos'      se emite al terminar de subir la cola
//   catalogo: 'vehiculos'            nombre en catalogMeta (fecha de la última copia)
//   ordenar:  (a, b) => ...          orden en que se muestra la lista
// }

const TIMEOUT_MS = 15_000;

export const nuevoIdCatalogo = nuevoIdWorker;

export const crearCatalogoOffline = ({ ruta, lista, clave, cache, pendientes, evento, catalogo, ordenar }) => {
    const avisar = (detail) => window.dispatchEvent(new CustomEvent(evento, { detail }));

    // Aplica a la copia local los cambios que aún no se suben
    const aplicarPendientesEnCache = async () => {
        const cola = await pendientes.orderBy('seq').toArray();
        for (const c of cola) {
            if (c.tipo === 'borrar') await cache.delete(c.clave);
            else await cache.put({ ...c.doc, updatedAt: Date.now() });
        }
    };

    const leerLocales = async () => (await cache.toArray()).sort(ordenar);

    // IDs con cambios todavía sin subir (para marcarlos como "Pendiente")
    const idsPendientes = async () => new Set((await pendientes.toArray()).filter(c => c.tipo !== 'borrar').map(c => c.id));

    let subidas = 0; // una lista pedida antes de la última subida ya está vieja

    const descargar = async () => {
        const version = subidas;
        const { data } = await api.get(ruta, { timeout: TIMEOUT_MS });
        if (version !== subidas) return;
        // La lista del servidor reemplaza la copia local (así desaparecen los que
        // otro dispositivo borró) y encima se vuelven a poner los cambios pendientes.
        await db.transaction('rw', cache, pendientes, async () => {
            await cache.clear();
            const ahora = Date.now();
            await cache.bulkPut(data[lista].filter(r => r[clave]).map(r => ({ ...r, updatedAt: ahora })));
            await aplicarPendientesEnCache();
        });
        await touchCatalogMeta(catalogo);
    };

    const enviarCambio = ({ tipo, id, doc }) => {
        const config = { timeout: TIMEOUT_MS };
        if (tipo === 'crear') return api.post(ruta, doc, config);
        if (tipo === 'editar') return api.put(`${ruta}/${id}`, doc, config);
        return api.delete(`${ruta}/${id}`, config);
    };

    let sincronizando = false;

    const sincronizar = async () => {
        if (!navigator.onLine || sincronizando) return;
        sincronizando = true;
        let rechazados = 0;
        const inicio = subidas;
        try {
            for (;;) {
                const cambio = await pendientes.orderBy('seq').first();
                if (!cambio) break;
                try {
                    await enviarCambio(cambio);
                } catch (err) {
                    const status = err.response?.status;
                    // Sin red, servidor caído o sin acceso por ahora: sigue en cola, en orden
                    if (!status || status >= 500 || [401, 403, 429].includes(status)) break;
                    const existente = err.response.data?.existing;
                    if (status === 409 && cambio.tipo === 'crear' && existente?._id) {
                        // Ya estaba registrado (por ejemplo, desde un movimiento): los datos
                        // escritos se guardan sobre ese registro, y los cambios siguientes
                        // del mismo registro pasan a apuntar a él.
                        await pendientes.update(cambio.seq, { tipo: 'editar', id: existente._id, doc: { ...cambio.doc, _id: existente._id } });
                        await pendientes.where('seq').above(cambio.seq)
                            .filter(c => c.id === cambio.id)
                            .modify(c => { c.id = existente._id; if (c.doc) c.doc._id = existente._id; });
                        continue;
                    }
                    // Un 404 al editar o borrar: otro dispositivo ya lo eliminó, no hay nada que hacer
                    if (status !== 404 || cambio.tipo === 'crear') rechazados++;
                }
                await pendientes.delete(cambio.seq);
                subidas++;
            }
        } finally {
            sincronizando = false;
        }
        if (subidas !== inicio) {
            await descargar().catch(() => {});
            avisar({ rechazados });
        }
    };

    // Trae la lista del servidor (subiendo antes lo pendiente). Falla sin conexión.
    const refrescar = async () => {
        await sincronizar();
        await descargar();
    };

    // Registra un cambio: se ve al instante y se sube cuando haya conexión.
    // cambio = { tipo: 'crear' | 'editar', doc } o { tipo: 'borrar', id, clave }
    const encolar = async (cambio) => {
        const registro = { ...cambio, id: cambio.id || cambio.doc._id, clave: cambio.clave || cambio.doc[clave], createdAt: Date.now() };
        await db.transaction('rw', cache, pendientes, async () => {
            await pendientes.add(registro);
            if (registro.tipo === 'borrar') await cache.delete(registro.clave);
            else await cache.put({ ...registro.doc, updatedAt: Date.now() });
        });
        avisar({ rechazados: 0 });
        sincronizar().catch(() => {});
    };

    return { leerLocales, idsPendientes, sincronizar, refrescar, encolar };
};
