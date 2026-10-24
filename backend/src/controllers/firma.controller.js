import Firma from '../models/Firma.model.js';
import Persona from '../models/Persona.model.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const fields = f => ({
    nombres: f.nombres?.trim() || '',
    empresa: f.empresa?.trim() || '',
    departamento: f.departamento?.trim() || '',
    cargo: f.cargo?.trim() || '',
});

// GET /api/firmas?search=texto&cedula=X
// Por defecto solo trae firmas vigentes (las que se usan para verificar en
// garita). `cedula` exacta se usa para el chequeo "¿ya tiene firma?" antes
// de guardar una nueva.
export const getFirmas = async (req, res) => {
    try {
        const { search, cedula } = req.query;
        const filter = { vigente: true };
        if (cedula) filter.cedula = cedula.trim();
        if (search && search.trim()) {
            const regex = new RegExp(escapeRegex(search.trim()), 'i');
            filter.$or = [{ nombres: regex }, { cedula: regex }, { empresa: regex }, { cargo: regex }];
        }
        const firmas = await Firma.find(filter).sort({ nombres: 1 });
        res.json({ firmas });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener firmas', error: error.message });
    }
};

// POST /api/firmas
export const createFirma = async (req, res) => {
    try {
        const { cedula, imagen, puesto, bloque, reemplazaA } = req.body;
        if (!cedula?.trim()) return res.status(400).json({ message: 'La cédula es obligatoria' });
        if (!req.body.nombres?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
        if (!imagen) return res.status(400).json({ message: 'La imagen de la firma es obligatoria' });

        const cedulaTrim = cedula.trim();

        // Solo se puede registrar firma de una persona ya autorizada por un
        // admin (Personas > autorizar) — a diferencia de movimientos, aquí
        // no se crea la persona automáticamente.
        const persona = await Persona.findOne({ cedula: cedulaTrim });
        if (!persona || !persona.autorizadoFirma) {
            return res.status(403).json({
                message: 'Esta persona no está autorizada para registrar firma. Pide a un administrador que la autorice desde Personas.',
            });
        }

        if (reemplazaA) {
            await Firma.updateOne({ _id: reemplazaA, cedula: cedulaTrim }, { vigente: false });
        }

        const firma = await Firma.create({
            cedula: cedulaTrim,
            ...fields(req.body),
            imagen,
            puesto: puesto || '',
            bloque: bloque || '',
            usuario: req.user._id,
        });

        res.status(201).json({ message: 'Firma registrada', firma });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/firmas/:id
export const updateFirma = async (req, res) => {
    try {
        const update = { ...fields(req.body) };
        if (req.body.imagen) update.imagen = req.body.imagen;
        const firma = await Firma.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!firma) return res.status(404).json({ message: 'Firma no encontrada' });
        res.json({ message: 'Firma actualizada', firma });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/firmas/:id
export const deleteFirma = async (req, res) => {
    try {
        const firma = await Firma.findByIdAndDelete(req.params.id);
        if (!firma) return res.status(404).json({ message: 'Firma no encontrada' });
        res.json({ message: 'Firma eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
