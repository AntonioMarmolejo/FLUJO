import Movimiento from '../models/Movimiento.model.js';
import Vehiculo from '../models/Vehiculo.model.js';

const getHora = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guayaquil' });
const getFecha = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

const vehiculoFields = ({ marca, color, tipoVehiculo, empresa, conductor, cedula }) =>
    ({ marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '', empresa: empresa || '', conductor: conductor || '', cedula: cedula || '' });

// POST /api/movimientos
export const crearMovimiento = async (req, res) => {
    try {
        const { tipo, placa, marca, color, tipoVehiculo, empresa, conductor, cedula, destino, actividad, guia, guias, quienAutoriza, empresaAutoriza, documento, documentoNombre, documentoTipo, puesto, bloque, hora: horaCliente } = req.body;
        if (!tipo || !placa || !puesto || !bloque) return res.status(400).json({ message: 'Tipo, placa, puesto y bloque son obligatorios' });

        const movimiento = await Movimiento.create({
            usuario: req.user._id, puesto, bloque, tipo,
            placa: placa.trim().toUpperCase(),
            marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '',
            empresa: empresa || '', conductor: conductor || '', cedula: cedula || '',
            destino: destino || '', actividad: actividad || '',
            guia: guia || '', guias: guias || [], quienAutoriza: quienAutoriza || '', empresaAutoriza: empresaAutoriza || '',
            documento: documento || '', documentoNombre: documentoNombre || '', documentoTipo: documentoTipo || '',
            hora: horaCliente || getHora(), fecha: req.body.fecha || getFecha(),
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

// GET /api/movimientos?puesto=X&bloque=Y[&desde=ISO_DATE][&fecha=YYYY-MM-DD]
export const getMovimientos = async (req, res) => {
    try {
        const { puesto, bloque, desde, fecha } = req.query;
        const filter = { usuario: req.user._id, puesto, bloque, fecha: fecha || getFecha() };
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
        const fecha = req.query.fecha || getFecha();
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
        const b = req.body;
        // Solo sobreescribir los campos que vengan en el body — así editar solo la hora
        // no borra el resto de los datos del movimiento.
        const update = {};
        if ('tipo'             in b) update.tipo             = b.tipo;
        if ('placa'            in b) update.placa            = b.placa?.trim().toUpperCase();
        if ('marca'            in b) update.marca            = b.marca            || '';
        if ('color'            in b) update.color            = b.color            || '';
        if ('tipoVehiculo'     in b) update.tipoVehiculo     = b.tipoVehiculo     || '';
        if ('empresa'          in b) update.empresa          = b.empresa          || '';
        if ('conductor'        in b) update.conductor        = b.conductor        || '';
        if ('cedula'           in b) update.cedula           = b.cedula           || '';
        if ('destino'          in b) update.destino          = b.destino          || '';
        if ('actividad'        in b) update.actividad        = b.actividad        || '';
        if ('guia'             in b) update.guia             = b.guia             || '';
        if ('guias'            in b) update.guias            = b.guias            || [];
        if ('quienAutoriza'    in b) update.quienAutoriza    = b.quienAutoriza    || '';
        if ('empresaAutoriza'  in b) update.empresaAutoriza  = b.empresaAutoriza  || '';
        if ('documento'        in b) update.documento        = b.documento        || '';
        if ('documentoNombre'  in b) update.documentoNombre  = b.documentoNombre  || '';
        if ('documentoTipo'    in b) update.documentoTipo    = b.documentoTipo    || '';
        if ('hora'             in b && b.hora) update.hora   = b.hora;
        const mov = await Movimiento.findOneAndUpdate(
            { _id: req.params.id, usuario: req.user._id },
            update,
            { new: true }
        );
        if (!mov) return res.status(404).json({ message: 'Movimiento no encontrado' });

        if (placa) await Vehiculo.findOneAndUpdate({ placa: placa.trim().toUpperCase() }, vehiculoFields(req.body), { upsert: true });

        res.json({ message: 'Movimiento actualizado', movimiento: mov });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
