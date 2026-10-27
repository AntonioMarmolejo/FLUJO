import mongoose from 'mongoose';

// Opiniones que los usuarios dejan sobre la aplicación desde el menú lateral;
// el admin las revisa en el panel de Administración.
const comentarioSchema = new mongoose.Schema(
    {
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        tipo: { type: String, enum: ['opinion', 'sugerencia', 'error'], default: 'opinion' },
        calificacion: { type: Number, min: 1, max: 5, default: null },
        mensaje: { type: String, required: true, trim: true, maxlength: 2000 },
        leido: { type: Boolean, default: false },
    },
    { timestamps: true }
);

comentarioSchema.index({ createdAt: -1 });

export default mongoose.model('Comentario', comentarioSchema);
