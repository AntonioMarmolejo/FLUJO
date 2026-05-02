import Movimiento from '../models/Movimiento.model.js';
import Vehiculo from '../models/Vehiculo.model.js';

const getHora = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
const getFecha = () => new Date().toISOString().split('T')[0];

// POST /api/movimientos
export const crearMovimiento = async (req, res) => {
    try {
        const { tipo, placa, marca, color, tipoVehiculo, empresa, conductor, cedula, destino, actividad, puesto, bloque } = req.body;

        if (!tipo || !placa || !puesto || !bloque) {
            return res.status(400).json({ message: 'Tipo, placa, puesto y bloque son obligatorios' });
        }

        const movimiento = await Movimiento.create({
            usuario: req.user._id,
            puesto,
            bloque,
            tipo,
            placa: placa.trim().toUpperCase(),
            marca: marca || '',
            color: color || '',
            tipoVehiculo: tipoVehiculo || '',
            empresa: empresa || '',
            conductor: conductor || '',
            cedula: cedula || '',
            destino: destino || '',
            actividad: actividad || '',
            hora: getHora(),
            fecha: getFecha(),
        });

        // Guarda o actualiza los datos del vehículo en la base de datos
        await Vehiculo.findOneAndUpdate(
            { placa: movimiento.placa },
            { marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '', empresa: empresa || '', conductor: conductor || '', cedula: cedula || '' },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: 'Movimiento registrado', movimiento });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos?puesto=X&bloque=Y
export const getMovimientos = async (req, res) => {
    try {
        const { puesto, bloque } = req.query;
        const fecha = getFecha();

        const movimientos = await Movimiento.find({
            usuario: req.user._id,
            puesto,
            bloque,
            fecha,
        }).sort({ createdAt: -1 });

        res.status(200).json({ movimientos });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/stats?puesto=X&bloque=Y
export const getStats = async (req, res) => {
    try {
        const { puesto, bloque } = req.query;
        const fecha = getFecha();

        const totalVehiculos = await Movimiento.countDocuments({
            usuario: req.user._id, puesto, bloque, fecha, tipo: 'ingreso',
        });

        const totalFlujos = await Movimiento.countDocuments({
            usuario: req.user._id, puesto, bloque, fecha,
        });

        const diasActivos = await Movimiento.distinct('fecha', {
            usuario: req.user._id, puesto, bloque,
        });

        const movimientosHoy = await Movimiento.find({
            usuario: req.user._id, puesto, bloque, fecha,
        });

        const horas = ['6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm'];
        const grafico = horas.map((label, i) => {
            const hora = i + 6;
            const ingresos = movimientosHoy.filter(m =>
                parseInt(m.hora.split(':')[0]) === hora && m.tipo === 'ingreso'
            ).length;
            const salidas = movimientosHoy.filter(m =>
                parseInt(m.hora.split(':')[0]) === hora && m.tipo === 'salida'
            ).length;
            return { label, ingresos, salidas };
        });

        res.status(200).json({
            totalVehiculos,
            totalFlujos,
            diasActivos: diasActivos.length,
            grafico,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
