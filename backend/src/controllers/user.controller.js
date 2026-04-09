import User from '../models/User.model.js';

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
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bloques: user.bloques,
                onboardingCompleto: user.onboardingCompleto,
            },
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

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { [`puestos.${bloqueId}`]: puestos },
            { new: true }
        );

        res.status(200).json({
            message: 'Puestos guardados',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bloques: user.bloques,
                puestos: Object.fromEntries(user.puestos),
                onboardingCompleto: user.onboardingCompleto,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};