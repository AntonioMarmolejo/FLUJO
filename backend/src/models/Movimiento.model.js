import mongoose from 'mongoose';

const movimientoSchema = new mongoose.Schema(
    {
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        puesto: { type: String, required: true },
        bloque: { type: String, required: true },
        tipo: {
            type: String,
            enum: ['ingreso', 'salida'],
            required: true,
        },
        placa: { type: String, required: true, trim: true, uppercase: true },
        marca: { type: String, trim: true, default: '' },
        color: { type: String, trim: true, default: '' },
        tipoVehiculo: { type: String, trim: true, default: '' },
        empresa: { type: String, trim: true, default: '' },
        conductor: { type: String, trim: true, default: '' },
        cedula: { type: String, trim: true, default: '' },
        destino: { type: String, trim: true, default: '' },
        actividad: { type: String, trim: true, default: '' },
        genero: { type: String, enum: ['m', 'f'], default: 'm' },
        guia: { type: String, trim: true, default: '' },
        guias: [{
            numero: { type: String, trim: true, default: '' },
            items:  { type: String, trim: true, default: '' },
            empresa: { type: String, trim: true, default: '' },
        }],
        quienAutoriza: { type: String, trim: true, default: '' },
        empresaAutoriza: { type: String, trim: true, default: '' },
        documento: { type: String, default: '' },
        documentoNombre: { type: String, trim: true, default: '' },
        documentoTipo: { type: String, trim: true, default: '' },
        hora: { type: String, required: true },
        fecha: { type: String, required: true },
        clientUUID: { type: String, default: null },
        // EN CAMINO: una SALIDA hacia otra garita del bloque queda "en tránsito".
        // La ven las garitas por las que pasa (tiempos) durante 1 hora como máximo.
        transito: {
            type: new mongoose.Schema({
                origen: { type: String, trim: true },            // garita donde salió
                destino: { type: String, trim: true },           // garita a la que va
                salidaAt: { type: Date },                        // momento real de la salida
                // Garitas de la ruta en orden, con los minutos esperados desde la salida
                // (min null si Distancias no tiene la ruta). La última es el destino.
                tiempos: [{ _id: false, garita: { type: String, trim: true }, min: { type: Number, default: null } }],
                // Garitas elegidas como destino, en orden (varios destinos). La última es `destino`;
                // las demás son paradas: ahí no figura "de paso"
                paradas: [{ type: String, trim: true }],
                estado: { type: String, enum: ['en_camino', 'llegado', 'cancelado'], default: 'en_camino' },
                vistos: [{ type: String, trim: true }],          // garitas que ya registraron su llegada
                // Cuándo lo registró cada garita (para marcar por dónde pasó y detener el contador)
                pasos: [{ _id: false, garita: { type: String, trim: true }, at: { type: Date } }],
                cerradoAt: { type: Date, default: null },
            }, { _id: false }),
            default: undefined,
        },
        // INGRESO registrado desde EN CAMINO: la SALIDA de la que viene
        instanciadoDe: { type: mongoose.Schema.Types.ObjectId, ref: 'Movimiento', default: null },
        // INGRESO registrado desde un vehículo que la propia garita se reportó
        reporteDe: { type: mongoose.Schema.Types.ObjectId, ref: 'Reporte', default: null },
    },
    { timestamps: true }
);

// Acelera los filtros por usuario/puesto/bloque/fecha que usa la pantalla de Flujos
// (listado por años, meses y días, y el detalle de un día puntual).
movimientoSchema.index({ usuario: 1, puesto: 1, bloque: 1, fecha: 1 });
// EN CAMINO: salidas en tránsito del bloque, las más recientes
movimientoSchema.index({ bloque: 1, 'transito.estado': 1, 'transito.salidaAt': -1 });
// Último movimiento de una placa (precarga de destino/actividad en el formulario).
movimientoSchema.index({ usuario: 1, placa: 1, createdAt: -1 });

// Evita duplicados reales: si dos peticiones con el mismo clientUUID (reintento
// del cliente offline-first) llegan casi al mismo tiempo, la verificación de
// "¿ya existe?" en el controlador puede pasar en ambas antes de que ninguna
// termine de guardar. Este índice hace que la segunda inserción falle en la
// base de datos (error 11000) en vez de crear un registro duplicado.
// Parcial porque clientUUID es null para movimientos que no vinieron de la
// cola offline (no deben competir por unicidad entre sí).
movimientoSchema.index(
    { usuario: 1, clientUUID: 1 },
    { unique: true, partialFilterExpression: { clientUUID: { $type: 'string' } } }
);

export default mongoose.model('Movimiento', movimientoSchema);
