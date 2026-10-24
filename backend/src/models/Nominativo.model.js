import mongoose from 'mongoose';

const nominativoSchema = new mongoose.Schema({
    bloque:   { type: String, required: true, trim: true },
    seccion:  { type: String, required: true, enum: ['puesto', 'locacion'] },
    nombre:   { type: String, required: true, trim: true },
    codigo:   { type: String, required: true, trim: true, uppercase: true },
    orden:    { type: Number, default: 0 },
    usuario:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// "Debe ser único dentro del bloque"
nominativoSchema.index({ bloque: 1, codigo: 1 }, { unique: true });
nominativoSchema.index({ bloque: 1, seccion: 1 });

export default mongoose.model('Nominativo', nominativoSchema);
