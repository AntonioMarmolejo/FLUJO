import { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
    encolarMovimiento,
    subirMovimientoPendiente,
    cancelarMovimientoPendiente,
    getPendingMovimientos,
    syncPendingMovimientos,
    syncPendingEdiciones,
    encolarBorrado,
    cancelarBorradoEncolado,
    getBorradosPendientesIds,
    syncPendingBorrados,
    guardarTurnoLocal,
    leerTurnoLocal,
} from '../../lib/syncEngine.js';
import { getTurnoFecha } from './helpers';

// Turno activo y movimientos del puesto: carga desde el servidor, la cola
// offline (Dexie) y los cambios optimistas que se confirman después.
export const useMovimientosTurno = (userId, isPending) => {
    const [diasActivos, setDiasActivos] = useState(0);
    const [movimientos, setMovimientos] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState(null);

    // El turno se guarda también en el dispositivo: sin conexión se sigue
    // trabajando con él (incluido uno abierto offline que aún no se sube).
    useEffect(() => {
        const cargarTurno = () => {
            const local = leerTurnoLocal(userId);
            if (local) setTurnoActivo(local);
            api.get('/turnos/activo')
                .then(({ data }) => {
                    if (data.turno) {
                        setTurnoActivo(data.turno);
                        guardarTurnoLocal(data.turno, userId);
                    } else if (!local?._pendiente) {
                        setTurnoActivo(null);
                    }
                })
                .catch(() => { });
        };
        cargarTurno();
        const onOperacion = e => { if (e.detail?.tipo === 'turno' && e.detail.data) cargarTurno(); };
        window.addEventListener('flujo:operaciones', onOperacion);
        return () => window.removeEventListener('flujo:operaciones', onOperacion);
    }, [userId]);

    const cargarDatos = async () => {
        if (!turnoActivo) return;
        const turnoFecha = turnoActivo.fecha || getTurnoFecha(turnoActivo.turnoActual);
        try {
            const mRes = await api.get(`/movimientos?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}&fecha=${turnoFecha}`);
            // No volver a mostrar un movimiento que el usuario ya borró pero que
            // todavía no se confirmó contra el servidor (borrado en cola offline).
            const borrados = new Set(await getBorradosPendientesIds());
            const serverMovs = mRes.data.movimientos.filter(m => !borrados.has(m._id));
            const serverIds = new Set(serverMovs.map(m => m._id));
            const pending = await getPendingMovimientos();
            const pendingItems = pending
                .filter(item => !serverIds.has(item.uuid))
                .map(item => ({ _id: item.uuid, _pending: true, hora: item.hora, fecha: item.fecha, ...item.payload }));
            setMovimientos([...serverMovs, ...pendingItems]);
            api.get(`/movimientos/stats?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}&fecha=${turnoFecha}`)
                .then(sRes => setDiasActivos(sRes.data.diasActivos ?? 0))
                .catch(() => {});
        } catch {
            // Sin conexión: conservar confirmados + cola Dexie
            const pending = await getPendingMovimientos();
            setMovimientos(prev => {
                const confirmed = prev.filter(m => !m._pending);
                const confirmedIds = new Set(confirmed.map(m => m._id));
                const queueItems = pending
                    .filter(i => !confirmedIds.has(i.uuid))
                    .map(i => ({ _id: i.uuid, _pending: true, hora: i.hora, fecha: i.fecha, ...i.payload }));
                return [...confirmed, ...queueItems];
            });
        }
    };

    useEffect(() => { cargarDatos(); }, [turnoActivo]);

    // Sincronización offline: reintenta la cola Dexie cuando vuelve la conexión,
    // cuando la pestaña recupera el foco (el navegador puede pausar el intervalo
    // mientras está en segundo plano) y cada 30 s como respaldo.
    useEffect(() => {
        if (!turnoActivo || isPending) return;
        const onSynced = ({ uuid, serverId, cancelado }) => {
            if (cancelado) return; // el usuario ya lo borró localmente mientras se subía
            setMovimientos(prev => prev.map(m => m._id === uuid ? { ...m, _id: serverId, _pending: false } : m));
        };
        const onSyncedEdicion = (id, movData) => {
            setMovimientos(prev => prev.map(m => m._id === id ? { ...m, ...movData } : m));
        };
        const sync = () => {
            if (navigator.onLine) {
                syncPendingMovimientos(onSynced);
                syncPendingEdiciones(onSyncedEdicion);
                syncPendingBorrados();
            }
        };
        const onVisibility = () => { if (document.visibilityState === 'visible') sync(); };
        sync();
        window.addEventListener('online', sync);
        document.addEventListener('visibilitychange', onVisibility);
        const interval = setInterval(sync, 30_000);
        return () => {
            window.removeEventListener('online', sync);
            document.removeEventListener('visibilitychange', onVisibility);
            clearInterval(interval);
        };
    }, [turnoActivo, isPending]);

    // Guardado optimista (nuevo movimiento aparece al instante)
    const agregarOptimista = tempMov => {
        setMovimientos(prev => [...prev, tempMov]);
    };

    const confirmarMovimiento = (tempId, realMov) => {
        setMovimientos(prev => prev.map(m => m._id === tempId ? realMov : m));
    };

    // Actualiza el movimiento en estado local de inmediato (antes de que la API confirme)
    const editarLocal = updatedMov => {
        setMovimientos(prev => prev.map(m => m._id === updatedMov._id ? { ...m, ...updatedMov } : m));
    };

    // Borrado optimista: quita la fila de inmediato. Si el movimiento todavía
    // no se había subido al servidor (sigue en la cola offline), basta con
    // cancelarlo ahí — nunca llegó a crearse allá. Si ya estaba confirmado,
    // se encola el borrado y se reintenta solo hasta que se confirme —
    // ya no depende de que haya internet en el momento exacto del clic.
    const borrar = async id => {
        const target = movimientos.find(m => m._id === id);
        setMovimientos(prev => prev.filter(m => m._id !== id));

        if (target?._pending) {
            await cancelarMovimientoPendiente(id).catch(() => {});
            return;
        }

        await encolarBorrado(id);
        try {
            await api.delete(`/movimientos/${id}`);
            await cancelarBorradoEncolado(id);
        } catch {
            // Queda en la cola; el motor de sincronización lo reintentará
        }
    };

    const borrarVarios = async ids => {
        const pendingIds = ids.filter(id => movimientos.find(m => m._id === id)?._pending);
        const confirmedIds = ids.filter(id => !pendingIds.includes(id));
        const borrarSet = new Set(ids);

        setMovimientos(prev => prev.filter(m => !borrarSet.has(m._id)));

        await Promise.all(pendingIds.map(id => cancelarMovimientoPendiente(id).catch(() => {})));

        if (confirmedIds.length) {
            await Promise.all(confirmedIds.map(id => encolarBorrado(id)));
            try {
                await api.delete('/movimientos/batch', { data: { ids: confirmedIds } });
                await Promise.all(confirmedIds.map(id => cancelarBorradoEncolado(id)));
            } catch {
                // Quedan en la cola; el motor de sincronización las reintentará una por una
            }
        }
    };

    const cambiarHora = async (id, newHora) => {
        setMovimientos(prev => prev.map(m => m._id === id ? { ...m, hora: newHora } : m));
        try { await api.put(`/movimientos/${id}`, { hora: newHora }); }
        catch { cargarDatos(); }
    };

    // Registrar / editar ingreso directo desde la bitácora
    const guardarIngreso = async ({ b, hora, conductor, cedula, actividad, destino }) => {
        if (b.ingreso) {
            // Actualizar ingreso existente — optimista
            const updated = { ...b.ingreso, hora, conductor, cedula, actividad, destino };
            setMovimientos(prev => prev.map(m => m._id === b.ingreso._id ? updated : m));
            api.put(`/movimientos/${b.ingreso._id}`, { hora, conductor, cedula, actividad, destino }).catch(() => cargarDatos());
        } else {
            // Crear nuevo movimiento de ingreso
            const tempId = crypto.randomUUID();
            const fechaFlujo = turnoActivo?.fecha || getTurnoFecha(turnoActivo?.turnoActual);
            const payload = {
                tipo: 'ingreso',
                puesto: turnoActivo?.puesto,
                bloque: turnoActivo?.bloque,
                placa: b.placa,
                marca: b.salida?.marca || '',
                color: b.salida?.color || '',
                tipoVehiculo: b.salida?.tipoVehiculo || '',
                empresa: b.salida?.empresa || '',
                conductor: conductor || b.salida?.conductor || '',
                cedula: cedula || b.salida?.cedula || '',
                actividad,
                destino,
                fecha: fechaFlujo,
                hora,
                clientUUID: tempId,
            };
            const tempMov = { ...payload, _id: tempId, _pending: true };
            setMovimientos(prev => [...prev, tempMov]);
            await encolarMovimiento({ uuid: tempId, payload, hora, fecha: fechaFlujo });
            try {
                const result = await subirMovimientoPendiente(tempId);
                if (result?.movimiento) confirmarMovimiento(tempId, result.movimiento);
            } catch { /* queda en cola Dexie */ }
        }
    };

    return {
        turnoActivo, movimientos, diasActivos, cargarDatos,
        agregarOptimista, confirmarMovimiento, editarLocal,
        borrar, borrarVarios, cambiarHora, guardarIngreso,
    };
};
