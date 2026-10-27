import User from '../models/User.model.js';
import { buildUserResponse } from './auth.controller.js';
import { tieneBloque, denegarBloque } from '../middleware/auth.middleware.js';

// POST /api/user/bloques
export const updateBloques = async (req, res) => {
    try {
        const { bloques } = req.body;

        if (!bloques || bloques.length === 0) {
            return res.status(400).json({ message: 'Selecciona al menos un bloque' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { bloques, onboardingCompleto: true },
            { new: true }
        );

        res.status(200).json({
            message: 'Bloques guardados',
            user: buildUserResponse(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/user/puestos
export const updatePuestos = async (req, res) => {
    try {
        const { bloqueId, puestos } = req.body;

        if (!bloqueId || !puestos || puestos.length === 0) {
            return res.status(400).json({ message: 'Datos incompletos' });
        }
        if (!tieneBloque(req.user, bloqueId)) return denegarBloque(res);

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { [`puestos.${bloqueId}`]: puestos },
            { new: true }
        );

        res.status(200).json({
            message: 'Puestos guardados',
            user: buildUserResponse(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};