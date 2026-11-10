import Ajuste from '../models/Ajuste.model.js';

// Quién puede modificar la vía en Distancias:
// 'todos' (cualquier cuenta activa), 'supervisores' (supervisores y administradores) o 'admin'
export const EDITORES_DISTANCIAS = ['todos', 'supervisores', 'admin'];
const CLAVE_EDITORES = 'distancias.editores';

export const leerEditoresDistancias = async () => {
    const ajuste = await Ajuste.findOne({ clave: CLAVE_EDITORES }).lean();
    return EDITORES_DISTANCIAS.includes(ajuste?.valor) ? ajuste.valor : 'todos';
};

export const puedeEditarDistancias = (user, editores) => {
    if (user?.role === 'admin') return true;
    if (editores === 'admin') return false;
    if (editores === 'supervisores') return user?.role === 'supervisor';
    return true;
};

// GET /api/ajustes
export const getAjustes = async (req, res) => {
    try {
        res.json({ distanciasEditores: await leerEditoresDistancias() });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los ajustes', error: error.message });
    }
};

// PUT /api/ajustes/distancias  { editores }  (solo admin)
export const setEditoresDistancias = async (req, res) => {
    try {
        const { editores } = req.body;
        if (!EDITORES_DISTANCIAS.includes(editores)) {
            return res.status(400).json({ message: 'Opción no válida' });
        }
        await Ajuste.findOneAndUpdate({ clave: CLAVE_EDITORES }, { valor: editores }, { upsert: true });
        res.json({ distanciasEditores: editores });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el ajuste', error: error.message });
    }
};
