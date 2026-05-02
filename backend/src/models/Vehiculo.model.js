import mongoose from 'mongoose';

const vehiculoSchema = new mongoose.Schema(
    {
        placa: { type: String, required: true, unique: true, trim: true, uppercase: true },
        marca: { type: String, trim: true, default: '' },
        color: { type: String, trim: true, default: '' },
        tipoVehiculo: { type: String, trim: true, default: '' },
        empresa: { type: String, trim: true, default: '' },
        conductor: { type: String, trim: true, default: '' },
        cedula: { type: String, trim: true, default: '' },
    },
    { timestamps: true }
);

export default mongoose.model('Vehiculo', vehiculoSchema);
