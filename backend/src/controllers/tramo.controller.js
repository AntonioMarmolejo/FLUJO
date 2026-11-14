import Tramo from '../models/Tramo.model.js';
import { leerEditoresDistancias, puedeEditarDistancias } from './ajuste.controller.js';

const ESTADOS = ['Buena', 'Regular', 'Mala', 'Cerrada'];

// Valida y normaliza los datos de un tramo. Devuelve { error } o { datos }.
const leerDatos = (b) => {
    const from = String(b.from ?? '').trim(), to = String(b.to ?? '').trim();
    const km = Number(b.km), vmin = Number(b.vmin), vmax = Number(b.vmax);
    if (!from || !to) return { error: 'Indica las dos plataformas del tramo' };
    if (from.toLowerCase() === to.toLowerCase()) return { error: 'Las plataformas del tramo deben ser distintas' };
    if (!(km > 0)) return { error: 'La distancia debe ser mayor que 0' };
    if (!(vmin > 0) || !(vmax > vmin)) return { error: 'Velocidades no válidas' };
    const cond = ESTADOS.includes(b.cond) ? b.cond : 'Buena';
    return {
        datos: {
            tipo: b.tipo === 'desvio' ? 'desvio' : 'principal',
            from, to, km, vmin, vmax, cond,
            note: String(b.note ?? '').trim().slice(0, 500),
            orden: Number.isFinite(Number(b.orden)) ? Number(b.orden) : 0,
            esY: b.esY === true,
            lado: b.lado === 'izquierda' ? 'izquierda' : 'derecha',
        },
    };
};

// El administrador puede restringir quién modifica la vía (ver ajuste.controller.js)
export const requireEditarDistancias = async (req, res, next) => {
    try {
        if (puedeEditarDistancias(req.user, await leerEditoresDistancias())) return next();
        res.status(403).json({
            message: 'Solo algunos usuarios pueden modificar las distancias. Pídeselo al administrador.',
            code: 'EDICION_RESTRINGIDA',
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/tramos
export const getTramos = async (req, res) => {
    try {
        const tramos = await Tramo.find().sort({ orden: 1, createdAt: 1 });
        res.json({ tramos });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los tramos', error: error.message });
    }
};

// POST /api/tramos
// El dispositivo puede mandar el _id: si la app reenvía la misma creación (porque se
// perdió la respuesta sin conexión), se devuelve el tramo ya creado en vez de otro.
export const createTramo = async (req, res) => {
    try {
        const { _id } = req.body;
        if (_id !== undefined && !/^[0-9a-f]{24}$/i.test(String(_id))) {
            return res.status(400).json({ message: 'ID de tramo inválido' });
        }
        if (_id) {
            const existente = await Tramo.findById(_id);
            if (existente) return res.json({ message: 'Tramo ya registrado', tramo: existente });
        }
        const { error, datos } = leerDatos(req.body);
        if (error) return res.status(400).json({ message: error });
        const tramo = await Tramo.create({ ...(_id ? { _id } : {}), ...datos, at: new Date(), by: req.user.name || '' });
        res.status(201).json({ message: 'Tramo registrado', tramo });
    } catch (error) {
        // Dos envíos del mismo tramo casi al mismo tiempo: el segundo choca con el primero
        if (error.code === 11000 && req.body._id) {
            const mismo = await Tramo.findById(req.body._id).catch(() => null);
            if (mismo) return res.json({ message: 'Tramo ya registrado', tramo: mismo });
        }
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/tramos/:id  (registro completo)
export const updateTramo = async (req, res) => {
    try {
        const tramo = await Tramo.findById(req.params.id);
        if (!tramo) return res.status(404).json({ message: 'Tramo no encontrado' });
        const { error, datos } = leerDatos(req.body);
        if (error) return res.status(400).json({ message: error });
        // Quién y cuándo se registran solo cuando cambia el estado de la vía o su nota
        const cambioEstado = datos.cond !== tramo.cond || datos.note !== tramo.note;
        tramo.set(datos);
        if (cambioEstado) {
            tramo.at = new Date();
            tramo.by = req.user.name || '';
        }
        await tramo.save();
        res.json({ message: 'Tramo actualizado', tramo });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/tramos/:id
export const deleteTramo = async (req, res) => {
    try {
        const tramo = await Tramo.findByIdAndDelete(req.params.id);
        if (!tramo) return res.status(404).json({ message: 'Tramo no encontrado' });
        res.json({ message: 'Tramo eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
