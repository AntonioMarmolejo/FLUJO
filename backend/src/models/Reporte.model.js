import mongoose from 'mongoose';

// EN CAMINO: vehículo que una garita se reporta a sí misma ("viene hacia aquí")
// con todos sus datos, para que al llegar solo se registre el INGRESO.
// Lo ve cualquier guardia de esa garita (también el del turno siguiente).
const reporteSchema = new mongoose.Schema(
    {
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        bloque: { type: String, required: true },
        garita: { type: String, required: true, trim: true },     // garita a la que viene
        origen: { type: String, trim: true, default: '' },         // de dónde viene (texto libre)
        reportadoAt: { type: Date, required: true },
        esperadoMin: { type: Number, default: null },              // minutos estimados hasta llegar
        // Los mismos datos del formulario de nuevo movimiento
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
        estado: { type: String, enum: ['en_camino', 'llegado', 'quitado'], default: 'en_camino' },
        cerradoAt: { type: Date, default: null },
    },
    { timestamps: true }
);

reporteSchema.index({ bloque: 1, garita: 1, estado: 1, reportadoAt: -1 });

export default mongoose.model('Reporte', reporteSchema);
