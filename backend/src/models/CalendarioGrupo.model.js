import mongoose from 'mongoose';

const calendarioGrupoSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    dias:   { type: Map, of: String, default: {} },
}, { timestamps: true });

export default mongoose.model('CalendarioGrupo', calendarioGrupoSchema);
