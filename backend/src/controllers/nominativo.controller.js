import Nominativo from '../models/Nominativo.model.js';
import { tieneBloque, denegarBloque } from '../middleware/auth.middleware.js';

const fields = n => ({
    seccion: n.seccion,
    nombre:  (n.nombre || '').trim(),
    codigo:  (n.codigo || '').trim().toUpperCase(),
});

// GET /api/nominativos?bloque=12
export const getNominativos = async (req, res) => {
    try {
        const { bloque } = req.query;
        if (!bloque) return res.status(400).json({ message: 'Falta el bloque' });
        if (!tieneBloque(req.user, bloque)) return denegarBloque(res);
        const nominativos = await Nominativo.find({ bloque }).sort({ seccion: 1, orden: 1, nombre: 1 });
        res.json({ nominativos });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener nominativos', error: error.message });
    }
};

// POST /api/nominativos
export const createNominativo = async (req, res) => {
    try {
        const { bloque } = req.body;
        if (!bloque) return res.status(400).json({ message: 'Falta el bloque' });
        if (!tieneBloque(req.user, bloque)) return denegarBloque(res);
        if (!req.body.seccion || !req.body.nombre || !req.body.codigo) {
            return res.status(400).json({ message: 'Nombre y nominativo son obligatorios' });
        }
        const nominativo = await Nominativo.create({
            bloque,
            ...fields(req.body),
            usuario: req.user._id,
        });
        res.status(201).json({ message: 'Nominativo registrado', nominativo });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Ese nominativo ya está en uso en este bloque' });
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/nominativos/:id
export const updateNominativo = async (req, res) => {
    try {
        const actual = await Nominativo.findById(req.params.id);
        if (!actual) return res.status(404).json({ message: 'Nominativo no encontrado' });
        if (!tieneBloque(req.user, actual.bloque)) return denegarBloque(res);
        const nominativo = await Nominativo.findByIdAndUpdate(req.params.id, fields(req.body), { new: true, runValidators: true });
        res.json({ message: 'Nominativo actualizado', nominativo });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Ese nominativo ya está en uso en este bloque' });
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/nominativos/:id
export const deleteNominativo = async (req, res) => {
    try {
        const nominativo = await Nominativo.findById(req.params.id);
        if (!nominativo) return res.status(404).json({ message: 'Nominativo no encontrado' });
        if (!tieneBloque(req.user, nominativo.bloque)) return denegarBloque(res);
        await nominativo.deleteOne();
        res.json({ message: 'Nominativo eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/nominativos/bulk — upsert por {bloque, seccion, nombre}, usado por Importar Excel
export const bulkImportNominativos = async (req, res) => {
    try {
        const { bloque, items } = req.body;
        if (!bloque) return res.status(400).json({ message: 'Falta el bloque' });
        if (!tieneBloque(req.user, bloque)) return denegarBloque(res);
        if (!items?.length) return res.status(400).json({ message: 'No hay datos para importar' });

        let created = 0;
        let updated = 0;

        for (const item of items) {
            if (!item.seccion || !item.nombre || !item.codigo) continue;
            const result = await Nominativo.findOneAndUpdate(
                { bloque, seccion: item.seccion, nombre: item.nombre.trim() },
                { $set: { codigo: item.codigo.trim().toUpperCase(), usuario: req.user._id } },
                { upsert: true, new: true, rawResult: true, setDefaultsOnInsert: true }
            );
            if (result.lastErrorObject?.updatedExisting) updated++; else created++;
        }

        res.json({ created, updated });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Hay un nominativo duplicado en el archivo' });
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
