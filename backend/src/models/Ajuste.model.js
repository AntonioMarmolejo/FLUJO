import mongoose from 'mongoose';

// Ajustes generales de la app que decide el administrador (clave → valor)
const ajusteSchema = new mongoose.Schema(
    {
        clave: { type: String, required: true, unique: true },
        valor: { type: mongoose.Schema.Types.Mixed },
    },
    { timestamps: true }
);

export default mongoose.model('Ajuste', ajusteSchema);
