import mongoose from 'mongoose';

const extensionSchema = new mongoose.Schema({
    nombre:       { type: String, required: true, trim: true },
    empresa:      { type: String, default: '', trim: true },
    cargo:        { type: String, default: '', trim: true },
    departamento: { type: String, default: '', trim: true },
    extension:    { type: String, default: '', trim: true },
    celular:      { type: String, default: '', trim: true },
}, { timestamps: true });

export default mongoose.model('Extension', extensionSchema);
