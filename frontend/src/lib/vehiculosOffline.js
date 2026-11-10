import db from './db.js';
import { crearCatalogoOffline, nuevoIdCatalogo } from './catalogoOffline.js';

// Placas de vehículos sin conexión (ver catalogoOffline.js). La copia local es
// vehiculosCache, la misma que usa el formulario de movimientos para autocompletar.
const vehiculos = crearCatalogoOffline({
    ruta: '/vehiculos',
    lista: 'vehiculos',
    clave: 'placa',
    cache: db.vehiculosCache,
    pendientes: db.vehiculosPending,
    evento: 'flujo:vehiculos',
    catalogo: 'vehiculos',
    ordenar: (a, b) => (a.placa || '').localeCompare(b.placa || ''),
});

export const nuevoIdVehiculo = nuevoIdCatalogo;
export const leerVehiculosLocales = vehiculos.leerLocales;
export const syncVehiculos = vehiculos.sincronizar;
export const refrescarVehiculos = vehiculos.refrescar;
// { tipo: 'crear' | 'editar', doc } o { tipo: 'borrar', id, clave: placa }
export const encolarCambioVehiculo = vehiculos.encolar;
