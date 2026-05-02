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
        conductor: { type: String, required: true, trim: true },
        cedula: { type: String, required: true, trim: true },
        hora: { type: String, required: true },   // "07:14"
        fecha: { type: String, required: true },  // "2026-04-09"
    },
    { timestamps: true }
);

export default mongoose.model('Movimiento', movimientoSchema);