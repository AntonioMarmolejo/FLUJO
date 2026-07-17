import Dexie from 'dexie';

// Base de datos local para operación offline-first
const db = new Dexie('FlujoSecurityDB');

db.version(1).stores({
    // Cola de movimientos pendientes de sincronizar con el servidor
    // uuid = clave primaria generada en el cliente (evita duplicados en sync)
    movimientosPending: 'uuid, synced, fecha, createdAt',

    // Caché de vehículos para búsqueda offline de placas
    vehiculosCache: 'placa, updatedAt',

    // Caché de personas para búsqueda offline de conductores
    personasCache: 'cedula, updatedAt',
});

export default db;
