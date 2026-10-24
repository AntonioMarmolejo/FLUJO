import mongoose from 'mongoose';

const personaSchema = new mongoose.Schema({
    cedula:       { type: String, required: true, unique: true, trim: true },
    nombres:      { type: String, required: true, trim: true },
    empresa:      { type: String, default: '', trim: true },
    cargo:        { type: String, default: '', trim: true },
    departamento: { type: String, default: '', trim: true },
    nominativo:   { type: String, default: '', trim: true },
    // Solo las personas autorizadas por un admin pueden tener una firma
    // registrada en Utilidades > Firmas Funcionarios.
    autorizadoFirma: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Persona', personaSchema);
