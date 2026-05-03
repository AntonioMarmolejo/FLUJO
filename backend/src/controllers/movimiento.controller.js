import Movimiento from '../models/Movimiento.model.js';
import Vehiculo from '../models/Vehiculo.model.js';

const getHora = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
const getFecha = () => new Date().toISOString().split('T')[0];

const vehiculoFields = ({ marca, color, tipoVehiculo, empresa, conductor, cedula }) =>
    ({ marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '', empresa: empresa || '', conductor: conductor || '', cedula: cedula || '' });

// POST /api/movimientos
export const crearMovimiento = async (req, res) => {
    try {
        const { tipo, placa, marca, color, tipoVehiculo, empresa, conductor, cedula, destino, actividad, puesto, bloque } = req.body;
        if (!tipo || !placa || !puesto || !bloque) return res.status(400).json({ message: 'Tipo, placa, puesto y bloque son obligatorios' });

        const movimiento = await Movimiento.create({
            usuario: req.user._id, puesto, bloque, tipo,
            placa: placa.trim().toUpperCase(),
            marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '',
            empresa: empresa || '', conductor: conductor || '', cedula: cedula || '',
            destino: destino || '', actividad: actividad || '',
            hora: getHora(), fecha: getFecha(),
        });

        await Vehiculo.findOneAndUpdate(
            { placa: movimiento.placa },
            vehiculoFields(req.body),
            { upsert: true, new: true }
        );

        res.status(201).json({ message: 'Movimiento registrado', movimiento });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos?puesto=X&bloque=Y[&desde=ISO_DATE]
export const getMovimientos = async (req, res) => {
    try {
        const { puesto, bloque, desde } = req.query;
        const filter = { usuario: req.user._id, puesto, bloque, fecha: getFecha() };
        if (desde) filter.createdAt = { $gte: new Date(desde) };
        const movimientos = await Movimiento.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ movimientos });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/stats?puesto=X&bloque=Y[&desde=ISO_DATE]
export const getStats = async (req, res) => {
    try {
        const { puesto, bloque, desde } = req.query;
        const fecha = getFecha();
        const filter = { usuario: req.user._id, puesto, bloque };
        const movFilter = { ...filter, fecha };
        if (desde) movFilter.createdAt = { $gte: new Date(desde) };

        const [totalFlujos, fechasActivas, movimientosHoy] = await Promise.all([
            Movimiento.countDocuments(movFilter),
            Movimiento.distinct('fecha', filter),
            Movimiento.find(movFilter),
        ]);

        const isPetro = m => m.empresa?.toLowerCase().includes('petroecuador');
        const placaMap = {};
        movimientosHoy.forEach(m => {
            if (!placaMap[m.placa] || (!placaMap[m.placa].empresa && m.empresa)) placaMap[m.placa] = m;
        });
        const uniqueVehicles = Object.values(placaMap);
        const petroecuador = uniqueVehicles.filter(isPetro).length;
        const contratistas = uniqueVehicles.filter(m => !isPetro(m)).length;

        const grafico = Array.from({ length: 24 }, (_, hora) => {
            const label = `${hora}h`;
            const ing = movimientosHoy.filter(m => parseInt(m.hora.split(':')[0]) === hora && m.tipo === 'ingreso').length;
            const sal = movimientosHoy.filter(m => parseInt(m.hora.split(':')[0]) === hora && m.tipo === 'salida').length;
            return { label, ingresos: ing, salidas: sal };
        });

        res.status(200).json({ totalVehiculos: uniqueVehicles.length, totalFlujos, diasActivos: fechasActivas.length, petroecuador, contratistas, grafico });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/movimientos/:id
export const deleteMovimiento = async (req, res) => {
    try {
        const mov = await Movimiento.findOneAndDelete({ _id: req.params.id, usuario: req.user._id });
        if (!mov) return res.status(404).json({ message: 'Movimiento no encontrado' });
        res.json({ message: 'Movimiento eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/movimientos/batch
export const batchDeleteMovimientos = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids?.length) return res.status(400).json({ message: 'Se requieren IDs' });
        await Movimiento.deleteMany({ _id: { $in: ids }, usuario: req.user._id });
        res.json({ message: 'Movimientos eliminados' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/todos?puesto=X&bloque=Y  (sin filtro de fecha)
export const getMovimientosTodos = async (req, res) => {
    try {
        const { puesto, bloque } = req.query;
        const movimientos = await Movimiento.find({ usuario: req.user._id, puesto, bloque }).sort({ fecha: -1, createdAt: -1 });
        res.status(200).json({ movimientos });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/movimientos/:id
export const updateMovimiento = async (req, res) => {
    try {
        const { tipo, placa, marca, color, tipoVehiculo, empresa, conductor, cedula, destino, actividad } = req.body;
        const mov = await Movimiento.findOneAndUpdate(
            { _id: req.params.id, usuario: req.user._id },
            { tipo, placa: placa?.trim().toUpperCase(), marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '', empresa: empresa || '', conductor: conductor || '', cedula: cedula || '', destino: destino || '', actividad: actividad || '' },
            { new: true }
        );
        if (!mov) return res.status(404).json({ message: 'Movimiento no encontrado' });

        if (placa) await Vehiculo.findOneAndUpdate({ placa: placa.trim().toUpperCase() }, vehiculoFields(req.body), { upsert: true });

        res.json({ message: 'Movimiento actualizado', movimiento: mov });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
