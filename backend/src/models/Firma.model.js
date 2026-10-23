import mongoose from 'mongoose';

const firmaSchema = new mongoose.Schema(
    {
        cedula: { type: String, required: true, trim: true },
        nombres: { type: String, required: true, trim: true },
        empresa: { type: String, default: '', trim: true },
        departamento: { type: String, default: '', trim: true },
        cargo: { type: String, default: '', trim: true },
        imagen: { type: String, required: true }, // base64 (ya comprimida en el cliente)
        puesto: { type: String, default: '', trim: true },
        bloque: { type: String, default: '', trim: true },
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        // Solo la firma vigente de cada cédula se usa para verificación en
        // garita. Al registrar una nueva como reemplazo, la anterior pasa a
        // vigente:false (se conserva como histórico, no se borra).
        vigente: { type: Boolean, default: true },
    },
    { timestamps: true }
);

firmaSchema.index({ cedula: 1, vigente: 1 });

export default mongoose.model('Firma', firmaSchema);
