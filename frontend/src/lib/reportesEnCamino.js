import { nuevoIdCatalogo } from './catalogoOffline.js';
import { actualizarOperacion, descartarOperacion, encolarOperacion, syncPendingOperaciones } from './syncEngine.js';

// EN CAMINO: vehículos que una garita se reporta a sí misma ("viene hacia aquí")
// con todos los datos del formulario. Van por la cola de operaciones: se ven al
// instante y se suben cuando haya conexión. El _id lo genera el dispositivo, así
// la llegada se puede registrar aunque el reporte todavía no se haya subido.

export const CAMPOS_REPORTE = ['placa', 'marca', 'color', 'tipoVehiculo', 'empresa', 'conductor', 'cedula', 'destino', 'actividad', 'genero'];

export const reportarVehiculo = async ({ bloque, garita, datos, origen = '', esperadoMin = null }) => {
    const _id = nuevoIdCatalogo();
    const payload = {
        _id, bloque, garita, origen, esperadoMin, reportadoAt: Date.now(),
        ...Object.fromEntries(CAMPOS_REPORTE.map(c => [c, datos[c] || (c === 'genero' ? 'm' : '')])),
    };
    await encolarOperacion('reporte', payload, _id);
    syncPendingOperaciones().catch(() => {});
    return payload;
};

// Antes de que llegue: corregir los datos, extender el tiempo o mandarlo a otra garita.
// Si el reporte todavía no se subió, se cambian sus datos en la cola; si no, el cambio
// va por la cola como una operación más (también sin conexión).
export const editarReporte = async ({ id, pendiente, cambios }) => {
    if (pendiente) await actualizarOperacion(id, cambios);
    else await encolarOperacion('reporteEditar', { id, ...cambios });
    syncPendingOperaciones().catch(() => {});
};

// Se reportó por error. Si todavía no se había subido, basta con sacarlo de la cola.
export const quitarReporte = async ({ id, pendiente }) => {
    if (pendiente) await descartarOperacion(id);
    else await encolarOperacion('reporteQuitar', { id });
    syncPendingOperaciones().catch(() => {});
};
