import Comentario from '../models/Comentario.model.js';

const TIPOS = ['opinion', 'sugerencia', 'error'];

// POST /api/comentarios  — cualquier usuario con sesión deja su opinión
export const crearComentario = async (req, res) => {
    try {
        const mensaje = (req.body.mensaje || '').trim();
        if (!mensaje) return res.status(400).json({ message: 'Escribe tu comentario' });
        if (mensaje.length > 2000) return res.status(400).json({ message: 'El comentario no puede pasar de 2000 caracteres' });

        const calificacion = Number(req.body.calificacion);
        const comentario = await Comentario.create({
            usuario: req.user._id,
            tipo: TIPOS.includes(req.body.tipo) ? req.body.tipo : 'opinion',
            calificacion: Number.isInteger(calificacion) && calificacion >= 1 && calificacion <= 5 ? calificacion : null,
            mensaje,
        });
        res.status(201).json({ message: '¡Gracias por tu comentario!', comentario });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/comentarios  (admin)
export const getComentarios = async (req, res) => {
    try {
        const comentarios = await Comentario.find()
            .sort({ createdAt: -1 })
            .limit(500)
            .populate('usuario', 'name email');
        res.json({ comentarios });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener comentarios', error: error.message });
    }
};

// PATCH /api/comentarios/:id  (admin) — marcar como leído / no leído
export const marcarComentario = async (req, res) => {
    try {
        const comentario = await Comentario.findByIdAndUpdate(
            req.params.id,
            { leido: req.body.leido !== false },
            { new: true }
        ).populate('usuario', 'name email');
        if (!comentario) return res.status(404).json({ message: 'Comentario no encontrado' });
        res.json({ comentario });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/comentarios/:id  (admin)
export const deleteComentario = async (req, res) => {
    try {
        const comentario = await Comentario.findByIdAndDelete(req.params.id);
        if (!comentario) return res.status(404).json({ message: 'Comentario no encontrado' });
        res.json({ message: 'Comentario eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
