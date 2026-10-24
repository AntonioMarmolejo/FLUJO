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

// v3: vault de sesión cifrada (PIN/huella) + caché offline de extensiones +
// metadata de vigencia ("cachedAt/expiresAt" tipo Netflix) por catálogo.
db.version(3).stores({
    movimientosPending: 'uuid, synced, fecha, createdAt',
    vehiculosCache: 'placa, updatedAt',
    personasCache: 'cedula, updatedAt',
    edicionesPending: 'id, synced, createdAt',
    extensionesCache: '_id, updatedAt',
    catalogMeta: 'catalogo',
    authVault: 'id',
});

// v4: cola de borrados offline (borrar un movimiento también debe funcionar
// sin conexión, igual que crear/editar).
db.version(4).stores({
    movimientosPending: 'uuid, synced, fecha, createdAt',
    vehiculosCache: 'placa, updatedAt',
    personasCache: 'cedula, updatedAt',
    edicionesPending: 'id, synced, createdAt',
    extensionesCache: '_id, updatedAt',
    catalogMeta: 'catalogo',
    authVault: 'id',
    borradosPending: 'id, createdAt',
});

// v5: caché offline de Firmas Funcionarios (solo lectura, igual que Personas/Extensiones)
db.version(5).stores({
    movimientosPending: 'uuid, synced, fecha, createdAt',
    vehiculosCache: 'placa, updatedAt',
    personasCache: 'cedula, updatedAt',
    edicionesPending: 'id, synced, createdAt',
    extensionesCache: '_id, updatedAt',
    catalogMeta: 'catalogo',
    authVault: 'id',
    borradosPending: 'id, createdAt',
    firmasCache: '_id, updatedAt',
});

// v6: caché offline de Plataformas y Nominativos (solo lectura, por bloque)
db.version(6).stores({
    movimientosPending: 'uuid, synced, fecha, createdAt',
    vehiculosCache: 'placa, updatedAt',
    personasCache: 'cedula, updatedAt',
    edicionesPending: 'id, synced, createdAt',
    extensionesCache: '_id, updatedAt',
    catalogMeta: 'catalogo',
    authVault: 'id',
    borradosPending: 'id, createdAt',
    firmasCache: '_id, updatedAt',
    nominativosCache: '_id, bloque, updatedAt',
});

export default db;
