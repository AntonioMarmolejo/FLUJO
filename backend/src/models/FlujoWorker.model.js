import mongoose from 'mongoose';

const flujoWorkerSchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true },
    role:       { type: String, required: true, trim: true },
    cycle:      { type: String, required: true, enum: ['14-7', '14-14', '15-15', '20-10', '30'] },
    total:      { type: Number, required: true },
    days:       { type: Number, required: true, default: 1 },
    inDateISO:  { type: String, required: true },
    back:       { type: String, default: 'Pendiente', trim: true },
    status:     { type: String, enum: ['active', 'soon'], default: 'active' },
    remaining:  { type: Number, default: null },
    turno:      { type: String, enum: ['dia', 'noche', 'descanso'], default: 'dia' },
}, { timestamps: true });

export default mongoose.model('FlujoWorker', flujoWorkerSchema);
