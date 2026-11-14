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
        // El destino del tramo es una bifurcación en Y (no una plataforma): de ahí salen desvíos
        esY: { type: Boolean, default: false },
        // Hacia qué lado sale el desvío de la vía principal (solo dibujo del mapa)
        lado: { type: String, enum: ['derecha', 'izquierda'], default: 'derecha' },
        // Última vez que cambió el estado de la vía o su nota, y quién lo hizo
        at: { type: Date, default: Date.now },
        by: { type: String, trim: true, default: '' },
    },
    { timestamps: true }
);

export default mongoose.model('Tramo', tramoSchema);
