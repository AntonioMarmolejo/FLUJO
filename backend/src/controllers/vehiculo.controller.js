import Vehiculo from '../models/Vehiculo.model.js';

// GET /api/vehiculos
export const getVehiculos = async (req, res) => {
    try {
        const vehiculos = await Vehiculo.find().sort({ placa: 1 });
        res.json({ vehiculos });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener vehículos', error: error.message });
    }
};

// GET /api/vehiculos/search?placa=XX
export const searchVehiculos = async (req, res) => {
    try {
        const { placa } = req.query;
        if (!placa || placa.length < 2) return res.json({ vehiculos: [] });
        const vehiculos = await Vehiculo.find({ placa: { $regex: placa.trim(), $options: 'i' } }).limit(5);
        res.json({ vehiculos });
    } catch (error) {
        res.status(500).json({ message: 'Error al buscar vehículos', error: error.message });
    }
};

// POST /api/vehiculos
export const createVehiculo = async (req, res) => {
    try {
        const { placa, marca, color, tipoVehiculo, empresa, conductor, cedula } = req.body;
        if (!placa) return res.status(400).json({ message: 'La placa es obligatoria' });

        const vehiculo = await Vehiculo.create({
            placa: placa.trim().toUpperCase(),
            marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '',
            empresa: empresa || '', conductor: conductor || '', cedula: cedula || '',
        });
        res.status(201).json({ message: 'Vehículo registrado', vehiculo });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Esa placa ya está registrada' });
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/vehiculos/:id
export const updateVehiculo = async (req, res) => {
    try {
        const { marca, color, tipoVehiculo, empresa, conductor, cedula } = req.body;
        const vehiculo = await Vehiculo.findByIdAndUpdate(
            req.params.id,
            { marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '', empresa: empresa || '', conductor: conductor || '', cedula: cedula || '' },
            { new: true }
        );
        if (!vehiculo) return res.status(404).json({ message: 'Vehículo no encontrado' });
        res.json({ message: 'Vehículo actualizado', vehiculo });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/vehiculos/bulk
export const bulkImport = async (req, res) => {
    try {
        const { vehiculos } = req.body;
        if (!vehiculos?.length) return res.status(400).json({ message: 'No hay datos para importar' });

        const conflicts = [];
        let created = 0;

        for (const v of vehiculos) {
            if (!v.placa) continue;
            const placa = v.placa.trim().toUpperCase();
            const existing = await Vehiculo.findOne({ placa });
            if (existing) {
                conflicts.push({ existing, incoming: { ...v, placa } });
            } else {
                await Vehiculo.create({
                    placa,
                    marca: v.marca || '', color: v.color || '', tipoVehiculo: v.tipoVehiculo || '',
                    empresa: v.empresa || '', conductor: v.conductor || '', cedula: v.cedula || '',
                });
                created++;
            }
        }

        res.json({ created, conflicts });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/vehiculos/:id
export const deleteVehiculo = async (req, res) => {
    try {
        const vehiculo = await Vehiculo.findByIdAndDelete(req.params.id);
        if (!vehiculo) return res.status(404).json({ message: 'Vehículo no encontrado' });
        res.json({ message: 'Vehículo eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
