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
        // Sin permiso (panel o bloque): reintentar enseguida no cambia nada.
        // Queda en la cola y se sube cuando el admin devuelva el acceso.
        if (attempt >= 3 || err.response?.status === 403) throw err;
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
// Nota: 'nombres' no es un índice de la tabla, así que se ordena en JS
// (orderBy() de Dexie exige que la clave esté indexada).
export const getPersonasCache = async () => {
    const arr = await db.personasCache.toArray();
    return arr.sort((a, b) => (a.nombres || '').localeCompare(b.nombres || ''));
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
    const arr = await db.extensionesCache.toArray();
    return arr.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
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

// Cachea una firma para la galería de Firmas Funcionarios offline
export const cacheFirma = async (f) => {
    if (!f._id) return;
    await db.firmasCache.put({ ...f, updatedAt: Date.now() });
};

export const getFirmasCache = async () => {
    const arr = await db.firmasCache.toArray();
    return arr.sort((a, b) => (a.nombres || '').localeCompare(b.nombres || ''));
};

export const deleteCachedFirma = async (id) => {
    if (!id) return;
    await db.firmasCache.delete(id);
};

// Cachea los nominativos de un bloque para Plataformas y Nominativos offline
export const cacheNominativo = async (n) => {
    if (!n._id) return;
    await db.nominativosCache.put({ ...n, updatedAt: Date.now() });
};

export const getNominativosCache = async (bloque) => {
    const arr = await db.nominativosCache.where('bloque').equals(bloque).toArray();
    return arr.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
};

export const deleteCachedNominativo = async (id) => {
    if (!id) return;
    await db.nominativosCache.delete(id);
};

// ── Vigencia de caché tipo Netflix (cachedAt/expiresAt) ───
// Un registro por catálogo ('vehiculos' | 'personas' | 'extensiones' | 'firmas').
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

// ── Cola offline de operaciones de garita ─────────────────
// Abrir turno, registrar firmas y personas nuevas sin conexión: se guardan en
// Dexie y se suben en orden cuando vuelve internet (ver SyncOperaciones).
const ENDPOINT_OPERACION = { turno: '/turnos/iniciar', firma: '/firmas', persona: '/personas' };

// Rechazos que pueden cambiar si el admin devuelve el acceso: la operación
// sigue en cola en vez de marcarse como fallida.
const RECHAZO_TEMPORAL = ['ACCOUNT_PENDING', 'ACCOUNT_SUSPENDED', 'PANEL_DENIED', 'BLOQUE_DENIED'];

// Avisa a las pantallas abiertas que la cola cambió (detail: { tipo, uuid, data? })
const notificarOperaciones = (detail) =>
    window.dispatchEvent(new CustomEvent('flujo:operaciones', { detail }));

export const encolarOperacion = async (tipo, payload, uuid = crypto.randomUUID()) => {
    await db.operacionesPending.add({ uuid, tipo, payload, createdAt: Date.now(), error: null });
    notificarOperaciones({ tipo, uuid });
    return uuid;
};

export const getOperacionesPendientes = async (tipo) =>
    (await db.operacionesPending.where('tipo').equals(tipo).toArray()).sort((a, b) => a.createdAt - b.createdAt);

export const descartarOperacion = async (uuid) => {
    const op = await db.operacionesPending.get(uuid);
    await db.operacionesPending.delete(uuid);
    if (op) notificarOperaciones({ tipo: op.tipo, uuid });
};

let sincronizandoOperaciones = false;

export const syncPendingOperaciones = async () => {
    if (!navigator.onLine || sincronizandoOperaciones) return;
    sincronizandoOperaciones = true;
    try {
        const pendientes = (await db.operacionesPending.orderBy('createdAt').toArray()).filter(op => !op.error);
        for (const op of pendientes) {
            try {
                const { data } = await api.post(ENDPOINT_OPERACION[op.tipo], op.payload);
                await db.operacionesPending.delete(op.uuid);
                if (op.tipo === 'turno' && data.turno) reemplazarTurnoLocal(data.turno);
                if (op.tipo === 'persona' && data.persona) cachePersona(data.persona).catch(() => {});
                notificarOperaciones({ tipo: op.tipo, uuid: op.uuid, data });
            } catch (err) {
                const status = err.response?.status;
                // Sin red o servidor caído: se corta y se reintenta en el próximo ciclo
                if (!status || status >= 500) break;
                // La persona ya existía en el servidor: el objetivo ya se cumplió
                if (op.tipo === 'persona' && status === 409) {
                    await db.operacionesPending.delete(op.uuid);
                    notificarOperaciones({ tipo: op.tipo, uuid: op.uuid });
                    continue;
                }
                if (status === 401 || RECHAZO_TEMPORAL.includes(err.response.data?.code)) continue;
                // Rechazo definitivo (datos inválidos, persona no autorizada...):
                // se marca para que el usuario lo vea y decida descartarlo.
                await db.operacionesPending.update(op.uuid, { error: err.response.data?.message || 'El servidor rechazó el registro' });
                notificarOperaciones({ tipo: op.tipo, uuid: op.uuid });
            }
        }
    } finally {
        sincronizandoOperaciones = false;
    }
};

// Registra una persona: en línea va directo al servidor; sin conexión (o si
// la red falla) queda en cola. Un rechazo del servidor se propaga al llamador.
export const registrarPersona = async (persona) => {
    if (navigator.onLine) {
        try {
            const { data } = await api.post('/personas', persona);
            cachePersona(data.persona).catch(() => {});
            return data.persona;
        } catch (err) {
            if (err.response) throw err;
        }
    }
    const uuid = await encolarOperacion('persona', persona);
    cachePersona(persona).catch(() => {});
    return { ...persona, _id: uuid, _pendiente: true };
};

// ── Turno activo guardado en el dispositivo ───────────────
// Permite seguir trabajando (y abrir turno) sin conexión. Se guarda por
// usuario para que otra cuenta en el mismo equipo no vea un turno ajeno.
const TURNO_LOCAL_KEY = 'flujo-turno-activo';
const TZ_ECU = 'America/Guayaquil';

export const fechaECU = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ_ECU });
export const horaECU = (d = new Date()) =>
    d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ_ECU });

export const guardarTurnoLocal = (turno, usuarioId) => {
    if (!turno || !usuarioId) return;
    try { localStorage.setItem(TURNO_LOCAL_KEY, JSON.stringify({ usuarioId: String(usuarioId), turno })); } catch { /* sin espacio */ }
};

// Último turno guardado del usuario, sin importar la fecha (para autollenar)
export const leerUltimoTurnoLocal = (usuarioId) => {
    try {
        const guardado = JSON.parse(localStorage.getItem(TURNO_LOCAL_KEY) || 'null');
        return guardado && guardado.usuarioId === String(usuarioId) ? guardado.turno : null;
    } catch { return null; }
};

// Turno todavía vigente: el de hoy, o el nocturno de ayer antes de las 06:00,
// con la misma regla que GET /turnos/activo en el servidor.
export const leerTurnoLocal = (usuarioId) => {
    const turno = leerUltimoTurnoLocal(usuarioId);
    if (!turno || turno.activo === false) return null;
    const ahora = new Date();
    if (turno.fecha === fechaECU(ahora)) return turno;
    const ayer = fechaECU(new Date(ahora.getTime() - 24 * 60 * 60 * 1000));
    const horaActual = parseInt(horaECU(ahora).slice(0, 2), 10);
    if (turno.fecha === ayer && turno.turnoActual === 'nocturno' && horaActual < 6) return turno;
    return null;
};

// Al sincronizar, el turno guardado pasa a ser el del servidor (con su _id
// real) si corresponde al mismo puesto, bloque y fecha.
const reemplazarTurnoLocal = (turnoServidor) => {
    try {
        const guardado = JSON.parse(localStorage.getItem(TURNO_LOCAL_KEY) || 'null');
        const t = guardado?.turno;
        if (t && t.puesto === turnoServidor.puesto && t.bloque === turnoServidor.bloque && t.fecha === turnoServidor.fecha) {
            guardarTurnoLocal(turnoServidor, guardado.usuarioId);
        }
    } catch { /* ignorar */ }
};

// Abre (o cambia) el turno sin conexión, con la misma lógica que el servidor:
// si ya hay un turno vigente en ese puesto y bloque, se registra como cambio.
export const iniciarTurnoOffline = async (datos, usuarioId) => {
    const ahora = new Date();
    const fecha = fechaECU(ahora);
    const hora = horaECU(ahora);
    const vigente = leerTurnoLocal(usuarioId);

    let turno;
    let esCambio = false;
    if (vigente && vigente.puesto === datos.puesto && vigente.bloque === datos.bloque) {
        esCambio = true;
        turno = {
            ...vigente,
            cambios: vigente.turnoActual === datos.turno
                ? (vigente.cambios || [])
                : [...(vigente.cambios || []), { de: vigente.turnoActual, a: datos.turno, hora }],
            turnoActual: datos.turno,
        };
    } else {
        turno = {
            _id: crypto.randomUUID(),
            usuario: String(usuarioId),
            cedula: datos.cedula, nombre: datos.nombre, apellidos: datos.apellidos, empresa: datos.empresa,
            bloque: datos.bloque, puesto: datos.puesto,
            turnoInicial: datos.turno, turnoActual: datos.turno,
            fecha, horaInicio: hora, activo: true, cambios: [],
        };
    }
    turno._pendiente = true;

    // El servidor usa la fecha y hora en que realmente se abrió, no la de la sincronización
    const uuid = esCambio ? crypto.randomUUID() : turno._id;
    await encolarOperacion('turno', { ...datos, fecha: turno.fecha, horaInicio: hora }, uuid);
    guardarTurnoLocal(turno, usuarioId);
    return { turno, esCambio };
};
