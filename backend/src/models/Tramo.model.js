import mongoose from 'mongoose';

// Tramo de la vía de lastre (pantalla Distancias). La vía principal es la cadena
// de tramos 'principal' ordenados por `orden`; los 'desvio' salen de cualquier
// plataforma de la red hacia otra plataforma.
const tramoSchema = new mongoose.Schema(
    {
        tipo: { type: String, enum: ['principal', 'desvio'], default: 'principal' },
        from: { type: String, required: true, trim: true },
        to: { type: String, required: true, trim: true },
        km: { type: Number, required: true, min: 0 },
        vmin: { type: Number, required: true, min: 0 },
        vmax: { type: Number, required: true, min: 0 },
        cond: { type: String, enum: ['Buena', 'Regular', 'Mala', 'Cerrada'], default: 'Buena' },
        note: { type: String, trim: true, default: '' },
        orden: { type: Number, default: 0 },
        // Última vez que cambió el estado de la vía o su nota, y quién lo hizo
        at: { type: Date, default: Date.now },
        by: { type: String, trim: true, default: '' },
    },
    { timestamps: true }
);

export default mongoose.model('Tramo', tramoSchema);
