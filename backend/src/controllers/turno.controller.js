import Turno from '../models/Turno.model.js';

const TZ = 'America/Guayaquil';

// Siempre en hora de Ecuador para evitar el corte a las 19:00 ECU (medianoche UTC)
const getHoraActual = () =>
    new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

const getFechaActual = () =>
    new Date().toLocaleDateString('en-CA', { timeZone: TZ });

const getHoraECU = () =>
    parseInt(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', hour12: false, timeZone: TZ }), 10);

const getFechaAyer = () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return ayer.toLocaleDateString('en-CA', { timeZone: TZ });
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
        const horaECU = getHoraECU();

        // Buscar turno activo de hoy; si es madrugada (00-05) también revisar nocturno de ayer
        let turnoExistente = await Turno.findOne({ usuario: req.user._id, puesto, bloque, fecha, activo: true });
        if (!turnoExistente && horaECU < 6) {
            turnoExistente = await Turno.findOne({
                usuario: req.user._id, puesto, bloque,
                fecha: getFechaAyer(), turnoActual: 'nocturno', activo: true,
            });
        }

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

// GET /api/turnos/ultimo  — datos del último turno + turno más frecuente
export const getUltimoTurno = async (req, res) => {
    try {
        const [ultimo, todos] = await Promise.all([
            Turno.findOne({ usuario: req.user._id }).sort({ createdAt: -1 }),
            Turno.find({ usuario: req.user._id }, 'turnoInicial'),
        ]);

        const counts = { diurno: 0, nocturno: 0 };
        todos.forEach(t => { if (t.turnoInicial) counts[t.turnoInicial]++; });
        const turnoFrecuente = counts.nocturno > counts.diurno ? 'nocturno' : 'diurno';

        res.status(200).json({ turno: ultimo, turnoFrecuente });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/turnos/activo
export const getTurnoActivo = async (req, res) => {
    try {
        const fecha = getFechaActual();
        let turno = await Turno.findOne({ usuario: req.user._id, fecha, activo: true });

        // Si es madrugada (00:00-05:59 ECU) y no hay turno de hoy, buscar nocturno de ayer
        if (!turno && getHoraECU() < 6) {
            turno = await Turno.findOne({
                usuario: req.user._id,
                fecha: getFechaAyer(),
                turnoActual: 'nocturno',
                activo: true,
            });
        }

        res.status(200).json({ turno });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};