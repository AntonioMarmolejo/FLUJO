import CalendarioGrupo from '../models/CalendarioGrupo.model.js';

export const getGrupos = async (req, res) => {
    try {
        const grupos = await CalendarioGrupo.find().sort({ createdAt: 1 });
        res.json({ grupos });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const createGrupo = async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre?.trim()) return res.status(400).json({ message: 'Nombre requerido' });
        const grupo = await CalendarioGrupo.create({ nombre: nombre.trim() });
        res.status(201).json({ grupo });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const updateGrupo = async (req, res) => {
    try {
        const { nombre } = req.body;
        const grupo = await CalendarioGrupo.findByIdAndUpdate(
            req.params.id,
            { nombre: nombre?.trim() },
            { new: true }
        );
        if (!grupo) return res.status(404).json({ message: 'Grupo no encontrado' });
        res.json({ grupo });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const deleteGrupo = async (req, res) => {
    try {
        const grupo = await CalendarioGrupo.findByIdAndDelete(req.params.id);
        if (!grupo) return res.status(404).json({ message: 'Grupo no encontrado' });
        res.json({ message: 'Grupo eliminado' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// PATCH /api/calendarios/:id/dia  { date: "2026-06-01", shift: "noche" | null }
export const updateDia = async (req, res) => {
    try {
        const { date, shift } = req.body;
        if (!date) return res.status(400).json({ message: 'Fecha requerida' });
        const grupo = await CalendarioGrupo.findById(req.params.id);
        if (!grupo) return res.status(404).json({ message: 'Grupo no encontrado' });
        if (shift) {
            grupo.dias.set(date, shift);
        } else {
            grupo.dias.delete(date);
        }
        await grupo.save();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};
