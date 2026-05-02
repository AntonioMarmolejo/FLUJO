import Movimiento from '../models/Movimiento.model.js';
import Turno from '../models/Turno.model.js';

const getHora = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
const getFecha = () => new Date().toISOString().split('T')[0];

// POST /api/movimientos
export const crearMovimiento = async (req, res) => {
    try {
        const { tipo, placa, conductor, cedula, puesto, bloque } = req.body;

        if (!tipo || !placa || !conductor || !cedula || !puesto || !bloque) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const movimiento = await Movimiento.create({
            usuario: req.user._id,
            puesto,
            bloque,
            tipo,
            placa,
            conductor,
            cedula,
            hora: getHora(),
            fecha: getFecha(),
        });

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

        // Total vehículos hoy (ingresos)
        const totalVehiculos = await Movimiento.countDocuments({
            usuario: req.user._id, puesto, bloque, fecha, tipo: 'ingreso',
        });

        // Total flujos hoy (todos los movimientos)
        const totalFlujos = await Movimiento.countDocuments({
            usuario: req.user._id, puesto, bloque, fecha,
        });

        // Días activos del guardia en este puesto
        const diasActivos = await Movimiento.distinct('fecha', {
            usuario: req.user._id, puesto, bloque,
        });

        // Datos por hora para el gráfico (hoy)
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