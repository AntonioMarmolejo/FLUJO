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
// El dispositivo puede mandar el _id: si la app reenvía la misma creación (porque se
// perdió la respuesta sin conexión), se devuelve el vehículo ya creado en vez de otro.
export const createVehiculo = async (req, res) => {
    try {
        const { _id, placa, marca, color, tipoVehiculo, empresa, caf } = req.body;
        if (!placa?.trim()) return res.status(400).json({ message: 'La placa es obligatoria' });
        if (_id !== undefined && !/^[0-9a-f]{24}$/i.test(String(_id))) {
            return res.status(400).json({ message: 'ID de vehículo inválido' });
        }
        if (_id) {
            const existente = await Vehiculo.findById(_id);
            if (existente) return res.json({ message: 'Vehículo ya registrado', vehiculo: existente });
        }

        const vehiculo = await Vehiculo.create({
            ...(_id ? { _id } : {}),
            placa: placa.trim().toUpperCase(),
            marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '',
            empresa: empresa || '', caf: caf || '',
        });
        res.status(201).json({ message: 'Vehículo registrado', vehiculo });
    } catch (error) {
        // Dos envíos del mismo vehículo casi al mismo tiempo: el segundo choca con el primero
        if (error.code === 11000 && req.body._id) {
            const mismo = await Vehiculo.findById(req.body._id).catch(() => null);
            if (mismo) return res.json({ message: 'Vehículo ya registrado', vehiculo: mismo });
        }
        if (error.code === 11000) {
            // Devolver el vehículo existente para que el frontend pueda ofrecer edición
            const existing = await Vehiculo.findOne({ placa: (req.body.placa || '').trim().toUpperCase() }).catch(() => null);
            return res.status(409).json({ message: 'Esa placa ya está registrada', existing });
        }
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/vehiculos/:id
export const updateVehiculo = async (req, res) => {
    try {
        const { marca, color, tipoVehiculo, empresa, caf } = req.body;
        const vehiculo = await Vehiculo.findByIdAndUpdate(
            req.params.id,
            { marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '', empresa: empresa || '', caf: caf || '' },
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
