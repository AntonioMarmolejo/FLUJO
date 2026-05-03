import Extension from '../models/Extension.model.js';

// GET /api/extensiones
export const getExtensiones = async (req, res) => {
    try {
        const extensiones = await Extension.find().sort({ nombre: 1 });
        res.json({ extensiones });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener extensiones', error: error.message });
    }
};

// POST /api/extensiones
export const createExtension = async (req, res) => {
    try {
        const { nombre, empresa, cargo, departamento, extension, celular } = req.body;
        if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });
        const ext = await Extension.create({
            nombre: nombre.trim(),
            empresa: empresa || '', cargo: cargo || '',
            departamento: departamento || '', extension: extension || '', celular: celular || '',
        });
        res.status(201).json({ message: 'Extensión registrada', extension: ext });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/extensiones/:id
export const updateExtension = async (req, res) => {
    try {
        const { nombre, empresa, cargo, departamento, extension, celular } = req.body;
        const ext = await Extension.findByIdAndUpdate(
            req.params.id,
            { nombre: nombre?.trim() || '', empresa: empresa || '', cargo: cargo || '', departamento: departamento || '', extension: extension || '', celular: celular || '' },
            { new: true }
        );
        if (!ext) return res.status(404).json({ message: 'Extensión no encontrada' });
        res.json({ message: 'Extensión actualizada', extension: ext });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/extensiones/:id
export const deleteExtension = async (req, res) => {
    try {
        const ext = await Extension.findByIdAndDelete(req.params.id);
        if (!ext) return res.status(404).json({ message: 'Extensión no encontrada' });
        res.json({ message: 'Extensión eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
