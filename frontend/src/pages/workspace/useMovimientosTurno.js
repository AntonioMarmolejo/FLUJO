import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import {
    guardarMovimientosFlujo,
    leerMovimientosFlujo,
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
    // Mientras esto no se resuelva, una lista vacía no significa "sin movimientos"
    const [turnoResuelto, setTurnoResuelto] = useState(false);
    const [cargadoPara, setCargadoPara] = useState(null);

    // El turno se guarda también en el dispositivo: sin conexión se sigue
    // trabajando con él (incluido uno abierto offline que aún no se sube).
    useEffect(() => {
        const cargarTurno = () => {
            const local = leerTurnoLocal(userId);
            if (local) { setTurnoActivo(local); setTurnoResuelto(true); }
            api.get('/turnos/activo')
                .then(({ data }) => {
                    if (data.turno) {
                        setTurnoActivo(data.turno);
                        guardarTurnoLocal(data.turno, userId);
                    } else if (!local?._pendiente) {
                        setTurnoActivo(null);
                    }
                })
                .catch(() => { })
                .finally(() => setTurnoResuelto(true));
        };
        cargarTurno();
        const onOperacion = e => { if (e.detail?.tipo === 'turno' && e.detail.data) cargarTurno(); };
        window.addEventListener('flujo:operaciones', onOperacion);
        return () => window.removeEventListener('flujo:operaciones', onOperacion);
    }, [userId]);

    // Sube cada vez que un movimiento se confirma o se borra en el servidor. Una
    // lista pedida antes de ese cambio ya está vieja: no se usa y se pide de nuevo.
    const version = useRef(0);
    const marcarCambio = () => { version.current++; };
    // Flujo al que pertenece la lista en pantalla (al cambiar de flujo no se mezclan)
    const claveEnPantalla = useRef(null);

    const fechaTurno = turnoActivo && (turnoActivo.fecha || getTurnoFecha(turnoActivo.turnoActual));
    const claveTurno = turnoActivo && `${turnoActivo.puesto}|${turnoActivo.bloque}|${fechaTurno}`;

    const cargarDatos = () => cargarFlujo(0);
    const cargarFlujo = async intento => {
        if (!turnoActivo) return;
        const { puesto, bloque } = turnoActivo;
        const clave = claveTurno;

        // Movimientos de ESTE flujo que siguen en la cola del dispositivo, menos
        // los que ya aparecen confirmados (se comparan por su ID del dispositivo)
        const leerCola = async confirmados => {
            const uuids = new Set(confirmados.map(m => m.clientUUID).filter(Boolean));
            const ids = new Set(confirmados.map(m => m._id));
            return (await getPendingMovimientos())
                .filter(i => i.fecha === fechaTurno && i.payload?.puesto === puesto && i.payload?.bloque === bloque)
                .filter(i => !uuids.has(i.uuid) && !ids.has(i.uuid))
                .map(i => ({ _id: i.uuid, _pending: true, hora: i.hora, fecha: i.fecha, ...i.payload }));
        };
        // No volver a mostrar lo que el usuario borró y aún no se confirma en el servidor
        const sinBorrados = async lista => {
            const borrados = new Set(await getBorradosPendientesIds());
            return lista.filter(m => !borrados.has(m._id));
        };

        // 1. Lo que el dispositivo ya tenía de este flujo, al instante (solo si la
        //    pantalla aún no muestra nada: lo que está en pantalla es más reciente)
        const guardados = await sinBorrados(await leerMovimientosFlujo(clave).catch(() => []));
        const colaInicial = await leerCola(guardados);
        const mismoFlujo = claveEnPantalla.current === clave;
        claveEnPantalla.current = clave;
        setMovimientos(prev => (mismoFlujo && prev.length ? prev : [...guardados, ...colaInicial]));

        // 2. La lista del servidor
        const versionPedida = version.current;
        try {
            const mRes = await api.get(`/movimientos?puesto=${puesto}&bloque=${bloque}&fecha=${fechaTurno}`, { timeout: 20_000 });
            if (versionPedida !== version.current && intento < 3) return cargarFlujo(intento + 1);
            const serverMovs = await sinBorrados(mRes.data.movimientos);
            setMovimientos([...serverMovs, ...await leerCola(serverMovs)]);
            api.get(`/movimientos/stats?puesto=${puesto}&bloque=${bloque}&fecha=${fechaTurno}`)
                .then(sRes => setDiasActivos(sRes.data.diasActivos ?? 0))
                .catch(() => {});
        } catch {
            // Sin conexión o señal mala: nunca se quita nada de lo que ya se veía.
            // Se juntan lo confirmado en pantalla, la copia del dispositivo y la cola.
            const cola = await getPendingMovimientos();
            const colaFlujo = cola.filter(i => i.fecha === fechaTurno && i.payload?.puesto === puesto && i.payload?.bloque === bloque);
            setMovimientos(prev => {
                const confirmados = prev.filter(m => !m._pending);
                const vistos = new Set(confirmados.map(m => m._id));
                const todos = [...confirmados, ...guardados.filter(m => !vistos.has(m._id))];
                const uuids = new Set(todos.map(m => m.clientUUID).filter(Boolean));
                const enCola = colaFlujo
                    .filter(i => !uuids.has(i.uuid))
                    .map(i => ({ _id: i.uuid, _pending: true, hora: i.hora, fecha: i.fecha, ...i.payload }));
                return [...todos, ...enCola];
            });
        }
    };

    useEffect(() => {
        cargarDatos().finally(() => setCargadoPara(claveTurno));
    }, [turnoActivo]);
    const cargando = !turnoResuelto || (!!turnoActivo && cargadoPara !== claveTurno);

    // Copia en el dispositivo de lo confirmado que se ve, para la próxima carga
    useEffect(() => {
        if (!claveTurno || cargadoPara !== claveTurno) return;
        guardarMovimientosFlujo(claveTurno, movimientos.filter(m => !m._pending)).catch(() => {});
    }, [movimientos, claveTurno, cargadoPara]);

    // Sincronización offline: reintenta la cola Dexie cuando vuelve la conexión,
    // cuando la pestaña recupera el foco (el navegador puede pausar el intervalo
    // mientras está en segundo plano) y cada 30 s como respaldo.
    useEffect(() => {
        if (!turnoActivo || isPending) return;
        const onSynced = ({ uuid, serverId, cancelado }) => {
            if (cancelado) return; // el usuario ya lo borró localmente mientras se subía
            marcarCambio();
            setMovimientos(prev => prev.map(m => m._id === uuid ? { ...m, _id: serverId, _pending: false } : m));
        };
        const onSyncedEdicion = (id, movData) => {
            setMovimientos(prev => prev.map(m => m._id === id ? { ...m, ...movData } : m));
        };
        const sync = () => {
            if (navigator.onLine) {
                syncPendingMovimientos(onSynced);
                syncPendingEdiciones(onSyncedEdicion);
                syncPendingBorrados().then(n => { if (n) marcarCambio(); });
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
        marcarCambio();
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
            marcarCambio();
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
                marcarCambio();
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
        turnoActivo, movimientos, diasActivos, cargando, cargarDatos,
        agregarOptimista, confirmarMovimiento, editarLocal,
        borrar, borrarVarios, cambiarHora, guardarIngreso,
    };
};
