import Persona from '../models/Persona.model.js';

const fields = p => ({
    nombres:      p.nombres || '',
    empresa:      p.empresa || '',
    cargo:        p.cargo || '',
    departamento: p.departamento || '',
    nominativo:   p.nominativo || '',
});

// GET /api/personas/search?q=texto (busca por cédula o nombres)
export const searchPersonas = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ personas: [] });
        const personas = await Persona.find({
            $or: [
                { cedula: { $regex: q.trim(), $options: 'i' } },
                { nombres: { $regex: q.trim(), $options: 'i' } },
            ]
        }).limit(6);
        res.json({ personas });
    } catch (error) {
        res.status(500).json({ message: 'Error al buscar personas', error: error.message });
    }
};

// GET /api/personas
export const getPersonas = async (req, res) => {
    try {
        const personas = await Persona.find().sort({ nombres: 1 });
        res.json({ personas });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener personas', error: error.message });
    }
};

// POST /api/personas
export const createPersona = async (req, res) => {
    try {
        const { cedula } = req.body;
        if (!cedula) return res.status(400).json({ message: 'La cédula es obligatoria' });
        const persona = await Persona.create({ cedula: cedula.trim(), ...fields(req.body) });
        res.status(201).json({ message: 'Persona registrada', persona });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Esa cédula ya está registrada' });
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/personas/:id
export const updatePersona = async (req, res) => {
    try {
        const persona = await Persona.findByIdAndUpdate(req.params.id, fields(req.body), { new: true });
        if (!persona) return res.status(404).json({ message: 'Persona no encontrada' });
        res.json({ message: 'Persona actualizada', persona });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/personas/:id
export const deletePersona = async (req, res) => {
    try {
        const persona = await Persona.findByIdAndDelete(req.params.id);
        if (!persona) return res.status(404).json({ message: 'Persona no encontrada' });
        res.json({ message: 'Persona eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/personas/bulk
export const bulkImport = async (req, res) => {
    try {
        const { personas } = req.body;
        if (!personas?.length) return res.status(400).json({ message: 'No hay datos para importar' });

        const conflicts = [];
        let created = 0;

        for (const p of personas) {
            if (!p.cedula) continue;
            const existing = await Persona.findOne({ cedula: p.cedula.trim() });
            if (existing) {
                conflicts.push({ existing, incoming: p });
            } else {
                await Persona.create({ cedula: p.cedula.trim(), ...fields(p) });
                created++;
            }
        }

        res.json({ created, conflicts });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
