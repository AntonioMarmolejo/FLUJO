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
    },
    { timestamps: true }
);

// Acelera los filtros por usuario/puesto/bloque/fecha que usa la pantalla de Flujos
// (listado por años, meses y días, y el detalle de un día puntual).
movimientoSchema.index({ usuario: 1, puesto: 1, bloque: 1, fecha: 1 });

export default mongoose.model('Movimiento', movimientoSchema);
