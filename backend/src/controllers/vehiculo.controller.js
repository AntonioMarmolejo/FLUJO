import Vehiculo from '../models/Vehiculo.model.js';

// GET /api/vehiculos/search?placa=XX
export const searchVehiculos = async (req, res) => {
    try {
        const { placa } = req.query;
        if (!placa || placa.length < 2) return res.json({ vehiculos: [] });

        const vehiculos = await Vehiculo.find({
            placa: { $regex: placa.trim(), $options: 'i' },
        }).limit(5);

        res.json({ vehiculos });
    } catch (error) {
        res.status(500).json({ message: 'Error al buscar vehículos', error: error.message });
    }
};
