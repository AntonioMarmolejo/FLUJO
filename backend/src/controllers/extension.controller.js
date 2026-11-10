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
// El dispositivo puede mandar el _id: si la app reenvía la misma creación (porque se
// perdió la respuesta sin conexión), se devuelve la extensión ya creada en vez de otra.
export const createExtension = async (req, res) => {
    try {
        const { _id, nombre, empresa, cargo, departamento, extension, celular } = req.body;
        if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
        if (_id !== undefined && !/^[0-9a-f]{24}$/i.test(String(_id))) {
            return res.status(400).json({ message: 'ID de extensión inválido' });
        }
        if (_id) {
            const existente = await Extension.findById(_id);
            if (existente) return res.json({ message: 'Extensión ya registrada', extension: existente });
        }
        const ext = await Extension.create({
            ...(_id ? { _id } : {}),
            nombre: nombre.trim(),
            empresa: empresa || '', cargo: cargo || '',
            departamento: departamento || '', extension: extension || '', celular: celular || '',
        });
        res.status(201).json({ message: 'Extensión registrada', extension: ext });
    } catch (error) {
        // Dos envíos de la misma extensión casi al mismo tiempo: el segundo choca con el primero
        if (error.code === 11000 && req.body._id) {
            const misma = await Extension.findById(req.body._id).catch(() => null);
            if (misma) return res.json({ message: 'Extensión ya registrada', extension: misma });
        }
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
