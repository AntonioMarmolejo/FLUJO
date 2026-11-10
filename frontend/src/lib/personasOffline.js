import db from './db.js';
import { crearCatalogoOffline, nuevoIdCatalogo } from './catalogoOffline.js';

// Personas sin conexión (ver catalogoOffline.js). La copia local es personasCache,
// la misma que usan los formularios de movimientos y firmas para autocompletar.
const personas = crearCatalogoOffline({
    ruta: '/personas',
    lista: 'personas',
    clave: 'cedula',
    cache: db.personasCache,
    pendientes: db.personasPending,
    evento: 'flujo:personas',
    catalogo: 'personas',
    ordenar: (a, b) => (a.nombres || '').localeCompare(b.nombres || ''),
});

export const nuevoIdPersona = nuevoIdCatalogo;
export const leerPersonasLocales = personas.leerLocales;
export const idsPersonasPendientes = personas.idsPendientes;
export const syncPersonas = personas.sincronizar;
export const refrescarPersonas = personas.refrescar;
// { tipo: 'crear' | 'editar', doc } o { tipo: 'borrar', id, clave: cedula }
export const encolarCambioPersona = personas.encolar;
