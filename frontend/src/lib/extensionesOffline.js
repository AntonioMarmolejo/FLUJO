import db from './db.js';
import { crearCatalogoOffline, nuevoIdCatalogo } from './catalogoOffline.js';

// Extensiones telefónicas sin conexión (ver catalogoOffline.js). La copia local
// es extensionesCache; no hay otro campo único, así que la clave es el _id.
const extensiones = crearCatalogoOffline({
    ruta: '/extensiones',
    lista: 'extensiones',
    clave: '_id',
    cache: db.extensionesCache,
    pendientes: db.extensionesPending,
    evento: 'flujo:extensiones',
    catalogo: 'extensiones',
    ordenar: (a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }),
});

export const nuevoIdExtension = nuevoIdCatalogo;
export const leerExtensionesLocales = extensiones.leerLocales;
export const idsExtensionesPendientes = extensiones.idsPendientes;
export const syncExtensiones = extensiones.sincronizar;
export const refrescarExtensiones = extensiones.refrescar;
// { tipo: 'crear' | 'editar', doc } o { tipo: 'borrar', id, clave: id }
export const encolarCambioExtension = extensiones.encolar;
