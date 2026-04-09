import Turno from '../models/Turno.model.js';

// Obtener hora actual en formato HH:MM
const getHoraActual = () => {
    return new Date().toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

// Obtener fecha actual en formato YYYY-MM-DD
const getFechaActual = () => {
    return new Date().toISOString().split('T')[0];
};

// POST /api/turnos/iniciar
export const iniciarTurno = async (req, res) => {
    try {
        const { cedula, nombre, apellidos, empresa, bloque, puesto, turno } = req.body;

        if (!cedula || !nombre || !apellidos || !empresa || !bloque || !puesto || !turno) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const fecha = getFechaActual();
        const horaInicio = getHoraActual();

        // Verificar si ya existe un turno activo para este usuario, puesto y fecha
        const turnoExistente = await Turno.findOne({
            usuario: req.user._id,
            puesto,
            bloque,
            fecha,
            activo: true,
        });

        if (turnoExistente) {
            // Registrar cambio de turno
            const nuevoTurno = turno === 'diurno' ? 'diurno' : 'nocturno';
            turnoExistente.cambios.push({
                de: turnoExistente.turnoActual,
                a: nuevoTurno,
                hora: horaInicio,
            });
            turnoExistente.turnoActual = nuevoTurno;
            await turnoExistente.save();

            return res.status(200).json({
                message: 'Cambio de turno registrado',
                turno: turnoExistente,
                esCambio: true,
            });
        }

        // Crear nuevo turno
        const nuevoTurno = await Turno.create({
            usuario: req.user._id,
            cedula,
            nombre,
            apellidos,
            empresa,
            bloque,
            puesto,
            turnoInicial: turno,
            turnoActual: turno,
            fecha,
            horaInicio,
        });

        res.status(201).json({
            message: 'Turno iniciado correctamente',
            turno: nuevoTurno,
            esCambio: false,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/turnos/activo
export const getTurnoActivo = async (req, res) => {
    try {
        const fecha = getFechaActual();
        const turno = await Turno.findOne({
            usuario: req.user._id,
            fecha,
            activo: true,
        });
        res.status(200).json({ turno });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};