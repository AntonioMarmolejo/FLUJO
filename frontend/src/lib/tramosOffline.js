import db from './db.js';
import { crearCatalogoOffline, nuevoIdCatalogo } from './catalogoOffline.js';

// Tramos de la vía de lastre (pantalla Distancias) sin conexión (ver catalogoOffline.js)
const tramos = crearCatalogoOffline({
    ruta: '/tramos',
    lista: 'tramos',
    clave: '_id',
    cache: db.tramosCache,
    pendientes: db.tramosPending,
    evento: 'flujo:tramos',
    catalogo: 'tramos',
    ordenar: (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
});

export const nuevoIdTramo = nuevoIdCatalogo;
export const leerTramosLocales = tramos.leerLocales;
export const idsTramosPendientes = tramos.idsPendientes;
export const syncTramos = tramos.sincronizar;
export const refrescarTramos = tramos.refrescar;
// { tipo: 'crear' | 'editar', doc } o { tipo: 'borrar', id, clave: id }
export const encolarCambioTramo = tramos.encolar;
