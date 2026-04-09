import mongoose from 'mongoose';

const turnoSchema = new mongoose.Schema(
    {
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        cedula: {
            type: String,
            required: [true, 'La cédula es obligatoria'],
            trim: true,
        },
        nombre: {
            type: String,
            required: [true, 'El nombre es obligatorio'],
            trim: true,
        },
        apellidos: {
            type: String,
            required: [true, 'Los apellidos son obligatorios'],
            trim: true,
        },
        empresa: {
            type: String,
            required: [true, 'La empresa es obligatoria'],
            trim: true,
        },
        bloque: {
            type: String,
            required: true,
        },
        puesto: {
            type: String,
            required: true,
        },
        turnoInicial: {
            type: String,
            enum: ['diurno', 'nocturno'],
            required: true,
        },
        turnoActual: {
            type: String,
            enum: ['diurno', 'nocturno'],
            required: true,
        },
        fecha: {
            type: String, // "2026-04-09"
            required: true,
        },
        horaInicio: {
            type: String, // "06:00"
            required: true,
        },
        // Historial de cambios de turno durante el día
        cambios: [
            {
                de: { type: String, enum: ['diurno', 'nocturno'] },
                a: { type: String, enum: ['diurno', 'nocturno'] },
                hora: { type: String },
                fecha: { type: Date, default: Date.now },
            },
        ],
        activo: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Turno', turnoSchema);