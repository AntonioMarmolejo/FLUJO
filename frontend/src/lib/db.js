import Dexie from 'dexie';

// Base de datos local para operación offline-first
const db = new Dexie('FlujoSecurityDB');

db.version(1).stores({
    movimientosPending: 'uuid, synced, fecha, createdAt',
    vehiculosCache: 'placa, updatedAt',
    personasCache: 'cedula, updatedAt',
});

// v2: cola para ediciones offline (usa put para que la última edición gane)
db.version(2).stores({
    edicionesPending: 'id, synced, createdAt',
});

export default db;
