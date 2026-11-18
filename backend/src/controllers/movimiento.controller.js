import Movimiento from '../models/Movimiento.model.js';
import Vehiculo from '../models/Vehiculo.model.js';
import Turno from '../models/Turno.model.js';
import Reporte from '../models/Reporte.model.js';
import { tieneBloque, denegarBloque } from '../middleware/auth.middleware.js';

const getHora = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guayaquil' });
const getFecha = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

// Escapa caracteres especiales de regex para que el texto de búsqueda del usuario
// nunca se interprete como un patrón (evita errores y "regex injection").
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const vehiculoFields = ({ marca, color, tipoVehiculo, empresa, conductor, cedula }) =>
    ({ marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '', empresa: empresa || '', conductor: conductor || '', cedula: cedula || '' });

// ── EN CAMINO ─────────────────────────────────────────────
// Una SALIDA hacia otra garita del bloque aparece en EN CAMINO de las garitas
// por las que pasa, como máximo durante esta cantidad de minutos.
const EN_CAMINO_MIN = 60;
const texto = (v, max = 60) => String(v ?? '').trim().slice(0, max);

// Valida el tránsito que arma la app al registrar la SALIDA (ver frontend lib/garitas.js)
const leerTransito = (t, ahora = Date.now()) => {
    if (!t || typeof t !== 'object') return undefined;
    const origen = texto(t.origen), destino = texto(t.destino);
    if (!origen || !destino || origen === destino) return undefined;
    const tiempos = (Array.isArray(t.tiempos) ? t.tiempos : []).slice(0, 30).map(x => {
        const min = x?.min == null || x.min === '' ? null : Number(x.min);
        return { garita: texto(x?.garita), min: Number.isFinite(min) ? Math.max(0, Math.round(min)) : null };
    }).filter(x => x.garita && x.garita !== origen);
    if (tiempos[tiempos.length - 1]?.garita !== destino) tiempos.push({ garita: destino, min: null });
    // La hora de salida la pone el dispositivo (puede subirse más tarde, sin conexión)
    let salidaAt = new Date(t.salidaAt).getTime();
    if (!Number.isFinite(salidaAt) || salidaAt > ahora + 10 * 60e3 || salidaAt < ahora - 7 * 864e5) salidaAt = ahora;
    return { origen, destino, salidaAt: new Date(salidaAt), tiempos, estado: 'en_camino', vistos: [], cerradoAt: null };
};

// Datos del vehículo que el INGRESO registrado desde EN CAMINO toma de la SALIDA
const CAMPOS_INSTANCIA = ['marca', 'color', 'tipoVehiculo', 'empresa', 'conductor', 'cedula', 'destino', 'actividad', 'guia', 'quienAutoriza', 'empresaAutoriza'];
// Datos del vehículo que viajan con cada fila de EN CAMINO (para registrar la llegada completa, aun sin conexión)
const CAMPOS_VEHICULO = ['marca', 'color', 'tipoVehiculo', 'empresa', 'conductor', 'cedula', 'destino', 'actividad', 'genero'];
const esId = v => /^[0-9a-f]{24}$/i.test(String(v || ''));
const vehiculoDe = d => Object.fromEntries(CAMPOS_VEHICULO.map(c => [c, d?.[c] || (c === 'genero' ? 'm' : '')]));

// La garita registró la llegada: deja de verlo en EN CAMINO; si era el destino, el tránsito se cierra
const marcarLlegada = async (salida, garita) => {
    const g = texto(garita);
    if (!g) return;
    const update = { $addToSet: { 'transito.vistos': g } };
    if (g === salida.transito.destino) update.$set = { 'transito.estado': 'llegado', 'transito.cerradoAt': new Date() };
    await Movimiento.updateOne({ _id: salida._id, 'transito.estado': 'en_camino' }, update);
};

// POST /api/movimientos
export const crearMovimiento = async (req, res) => {
    try {
        const { tipo, placa, marca, color, tipoVehiculo, empresa, conductor, cedula, destino, actividad, genero, guia, guias, quienAutoriza, empresaAutoriza, documento, documentoNombre, documentoTipo, puesto, bloque, hora: horaCliente, clientUUID } = req.body;
        if (!tipo || !placa || !puesto || !bloque) return res.status(400).json({ message: 'Tipo, placa, puesto y bloque son obligatorios' });
        if (!tieneBloque(req.user, bloque)) return denegarBloque(res);

        // Idempotencia: si ya existe un mov con este UUID del cliente, devolver el existente
        if (clientUUID) {
            const existing = await Movimiento.findOne({ clientUUID, usuario: req.user._id });
            if (existing) return res.status(201).json({ message: 'Movimiento ya registrado', movimiento: existing });
        }

        const datos = {
            usuario: req.user._id, puesto, bloque, tipo,
            placa: placa.trim().toUpperCase(),
            marca: marca || '', color: color || '', tipoVehiculo: tipoVehiculo || '',
            empresa: empresa || '', conductor: conductor || '', cedula: cedula || '',
            destino: destino || '', actividad: actividad || '', genero: genero || 'm',
            clientUUID: clientUUID || null,
            guia: guia || '', guias: guias || [], quienAutoriza: quienAutoriza || '', empresaAutoriza: empresaAutoriza || '',
            documento: documento || '', documentoNombre: documentoNombre || '', documentoTipo: documentoTipo || '',
            hora: horaCliente || getHora(), fecha: req.body.fecha || getFecha(),
        };
        // SALIDA hacia otra garita: queda en EN CAMINO
        if (tipo === 'salida') {
            const transito = leerTransito(req.body.transito);
            if (transito) datos.transito = transito;
        }
        // INGRESO registrado desde EN CAMINO: completa los datos con los de la SALIDA
        // (aunque la haya registrado otro guardia del bloque)
        let salida = null;
        const { instanciadoDe } = req.body;
        if (tipo === 'ingreso' && /^[0-9a-f]{24}$/i.test(String(instanciadoDe || ''))) {
            salida = await Movimiento.findOne({ _id: instanciadoDe, bloque, tipo: 'salida' });
            if (salida) {
                datos.instanciadoDe = salida._id;
                CAMPOS_INSTANCIA.forEach(c => { if (!datos[c]) datos[c] = salida[c] || ''; });
                if (!genero) datos.genero = salida.genero || 'm';
                if (!datos.guias.length && salida.guias?.length) datos.guias = salida.guias;
            }
        }

        // INGRESO de un vehículo que la garita se había reportado: el reporte se cierra.
        // Si el reporte todavía no se subió, queda enlazado igual y nacerá cerrado (crearReporte).
        if (tipo === 'ingreso' && esId(req.body.reporteDe)) {
            datos.reporteDe = req.body.reporteDe;
            await Reporte.updateOne({ _id: req.body.reporteDe, bloque, estado: 'en_camino' }, { estado: 'llegado', cerradoAt: new Date() });
        }

        const movimiento = await Movimiento.create(datos);
        if (salida?.transito) await marcarLlegada(salida, req.body.garitaLlegada);

        await Vehiculo.findOneAndUpdate(
            { placa: movimiento.placa },
            vehiculoFields(datos),
            { upsert: true, new: true }
        );

        res.status(201).json({ message: 'Movimiento registrado', movimiento });
    } catch (error) {
        // Carrera entre dos intentos con el mismo clientUUID (ej. el guardado
        // inicial y el motor de reintento, ambos en vuelo por internet lento):
        // el índice único de (usuario, clientUUID) rechaza el segundo insert
        // en vez de crear un duplicado. Se trata igual que el camino feliz de
        // idempotencia de arriba — devolver el que ya quedó guardado.
        if (error.code === 11000 && req.body.clientUUID) {
            const existing = await Movimiento.findOne({ clientUUID: req.body.clientUUID, usuario: req.user._id });
            if (existing) return res.status(201).json({ message: 'Movimiento ya registrado', movimiento: existing });
        }
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/en-camino?bloque=12&garita=PAD-E
// Salidas de CUALQUIER guardia del bloque que vienen hacia esta garita o pasan
// por ella, sin cerrar y de la última hora: placa, ruta, hora y datos del vehículo.
export const getEnCamino = async (req, res) => {
    try {
        const bloque = texto(req.query.bloque, 10), garita = texto(req.query.garita);
        if (!bloque || !garita) return res.status(400).json({ message: 'Bloque y garita son obligatorios' });
        if (!tieneBloque(req.user, bloque)) return denegarBloque(res);
        const desde = new Date(Date.now() - EN_CAMINO_MIN * 60e3);
        const campos = `placa transito ${CAMPOS_VEHICULO.join(' ')}`;
        const [salidas, enviadas, reportes] = await Promise.all([
            // Vienen hacia esta garita o pasan por ella
            Movimiento.find({
                bloque, tipo: 'salida',
                'transito.estado': 'en_camino',
                'transito.salidaAt': { $gte: desde },
                'transito.tiempos.garita': garita,
                'transito.origen': { $ne: garita },
                'transito.vistos': { $ne: garita },
            }).select(campos).sort({ 'transito.salidaAt': 1 }).limit(200).lean(),
            // Salieron de esta garita hacia otra
            Movimiento.find({
                bloque, tipo: 'salida',
                'transito.estado': 'en_camino',
                'transito.salidaAt': { $gte: desde },
                'transito.origen': garita,
            }).select(campos).sort({ 'transito.salidaAt': 1 }).limit(200).lean(),
            // Los que la garita se reportó a sí misma
            Reporte.find({ bloque, garita, estado: 'en_camino', reportadoAt: { $gte: desde } })
                .sort({ reportadoAt: 1 }).limit(200).lean(),
        ]);
        const fila = s => ({
            _id: s._id, placa: s.placa,
            origen: s.transito.origen, destino: s.transito.destino,
            salidaAt: s.transito.salidaAt, tiempos: s.transito.tiempos,
        });
        res.json({
            ahora: Date.now(),   // para corregir la diferencia de reloj del dispositivo
            enCamino: [
                ...salidas.map(s => ({ ...fila(s), vehiculo: vehiculoDe(s) })),
                ...reportes.map(r => ({
                    _id: r._id, placa: r.placa, reporte: true,
                    origen: r.origen, destino: garita, salidaAt: r.reportadoAt,
                    tiempos: [{ garita, min: r.esperadoMin }],
                    vehiculo: vehiculoDe(r),
                })),
            ],
            enviados: enviadas.map(s => ({ ...fila(s), vehiculo: vehiculoDe(s) })),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/movimientos/reportes  — la garita se reporta un vehículo que viene hacia ella.
// El _id lo genera el dispositivo: reenviar el mismo reporte (sin conexión) no lo duplica.
export const crearReporte = async (req, res) => {
    try {
        const b = req.body;
        const bloque = texto(b.bloque, 10), garita = texto(b.garita), placa = texto(b.placa, 20).toUpperCase();
        if (!esId(b._id)) return res.status(400).json({ message: 'ID de reporte inválido' });
        if (!bloque || !garita || !placa) return res.status(400).json({ message: 'Bloque, garita y placa son obligatorios' });
        if (!tieneBloque(req.user, bloque)) return denegarBloque(res);
        const existente = await Reporte.findById(b._id);
        if (existente) return res.json({ message: 'Reporte ya registrado', reporte: existente });

        let reportadoAt = new Date(b.reportadoAt).getTime();
        const ahora = Date.now();
        if (!Number.isFinite(reportadoAt) || reportadoAt > ahora + 10 * 60e3 || reportadoAt < ahora - 7 * 864e5) reportadoAt = ahora;
        const min = b.esperadoMin == null || b.esperadoMin === '' ? null : Number(b.esperadoMin);
        // Si la llegada ya se registró (sin conexión, antes de subir el reporte), nace cerrado
        const yaLlego = await Movimiento.exists({ reporteDe: b._id });
        const reporte = await Reporte.create({
            _id: b._id, usuario: req.user._id, bloque, garita, placa,
            origen: texto(b.origen), reportadoAt: new Date(reportadoAt),
            esperadoMin: Number.isFinite(min) && min > 0 ? Math.round(min) : null,
            ...Object.fromEntries(CAMPOS_VEHICULO.filter(c => c !== 'genero').map(c => [c, texto(b[c], c === 'actividad' ? 1000 : 120)])),
            genero: b.genero === 'f' ? 'f' : 'm',
            ...(yaLlego && { estado: 'llegado', cerradoAt: new Date() }),
        });
        res.status(201).json({ message: 'Reporte registrado', reporte });
    } catch (error) {
        if (error.code === 11000 && req.body._id) {
            const mismo = await Reporte.findById(req.body._id).catch(() => null);
            if (mismo) return res.json({ message: 'Reporte ya registrado', reporte: mismo });
        }
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/movimientos/reportes/quitar  { id } — se reportó por error
export const quitarReporte = async (req, res) => {
    try {
        if (!esId(req.body.id)) return res.status(400).json({ message: 'ID de reporte inválido' });
        const reporte = await Reporte.findById(req.body.id);
        if (!reporte) return res.status(404).json({ message: 'Reporte no encontrado' });
        if (!tieneBloque(req.user, reporte.bloque)) return denegarBloque(res);
        if (reporte.estado !== 'en_camino') return res.status(409).json({ message: 'El vehículo ya llegó o el reporte ya se quitó' });
        reporte.estado = 'quitado';
        reporte.cerradoAt = new Date();
        await reporte.save();
        res.json({ message: 'Reporte quitado', reporte });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/movimientos/reportes/editar  { id, ...cambios } — antes de que llegue: corregir
// o completar los datos, extender el tiempo estimado o mandarlo a otra garita del bloque.
// Solo se cambia lo que viene en el pedido.
export const editarReporte = async (req, res) => {
    try {
        const b = req.body;
        if (!esId(b.id)) return res.status(400).json({ message: 'ID de reporte inválido' });
        const reporte = await Reporte.findById(b.id);
        if (!reporte) return res.status(404).json({ message: 'Reporte no encontrado' });
        if (!tieneBloque(req.user, reporte.bloque)) return denegarBloque(res);
        if (reporte.estado !== 'en_camino') return res.status(409).json({ message: 'El vehículo ya llegó o el reporte ya se quitó', reporte });

        if (b.placa !== undefined) {
            const placa = texto(b.placa, 20).toUpperCase();
            if (!placa) return res.status(400).json({ message: 'La placa es obligatoria' });
            reporte.placa = placa;
        }
        if (b.garita !== undefined) {
            const garita = texto(b.garita);
            if (!garita) return res.status(400).json({ message: 'Garita no válida' });
            reporte.garita = garita;
        }
        if (b.origen !== undefined) reporte.origen = texto(b.origen);
        if (b.esperadoMin !== undefined) {
            const min = b.esperadoMin == null || b.esperadoMin === '' ? null : Number(b.esperadoMin);
            reporte.esperadoMin = Number.isFinite(min) && min > 0 ? Math.round(min) : null;
        }
        CAMPOS_VEHICULO.filter(c => c !== 'genero' && b[c] !== undefined)
            .forEach(c => { reporte[c] = texto(b[c], c === 'actividad' ? 1000 : 120); });
        if (b.genero !== undefined) reporte.genero = b.genero === 'f' ? 'f' : 'm';
        await reporte.save();
        res.json({ message: 'Reporte actualizado', reporte });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/movimientos/transito  { id, accion: 'cancelar' | 'destino', transito? }
// Desde la garita de origen: cancelar el tránsito o cambiar su destino.
// Cancelar no borra la SALIDA: sigue en el historial.
export const actualizarTransito = async (req, res) => {
    try {
        const { id, accion } = req.body;
        if (!/^[0-9a-f]{24}$/i.test(String(id || ''))) return res.status(400).json({ message: 'Movimiento inválido' });
        const mov = await Movimiento.findOne({ _id: id, usuario: req.user._id, tipo: 'salida' });
        if (!mov?.transito) return res.status(404).json({ message: 'La salida no está en tránsito' });
        if (!tieneBloque(req.user, mov.bloque)) return denegarBloque(res);
        if (mov.transito.estado !== 'en_camino') {
            return res.status(409).json({
                message: mov.transito.estado === 'llegado' ? 'El vehículo ya llegó a su destino' : 'El tránsito ya estaba cancelado',
                movimiento: mov,
            });
        }
        if (accion === 'cancelar') {
            mov.transito.estado = 'cancelado';
            mov.transito.cerradoAt = new Date();
        } else if (accion === 'destino') {
            const nuevo = leerTransito({ ...req.body.transito, origen: mov.transito.origen, salidaAt: mov.transito.salidaAt });
            if (!nuevo) return res.status(400).json({ message: 'Destino no válido' });
            mov.transito = { ...nuevo, vistos: mov.transito.vistos };
            mov.destino = nuevo.destino;
        } else {
            return res.status(400).json({ message: 'Acción no válida' });
        }
        await mov.save();
        res.json({ message: 'Tránsito actualizado', movimiento: mov });
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
        const mov = await Movimiento.findOne({ _id: req.params.id, usuario: req.user._id });
        if (!mov) return res.status(404).json({ message: 'Movimiento no encontrado' });
        if (!tieneBloque(req.user, mov.bloque)) return denegarBloque(res);
        await mov.deleteOne();
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
        const bloques = await Movimiento.distinct('bloque', { _id: { $in: ids }, usuario: req.user._id });
        if (!bloques.every(b => tieneBloque(req.user, b))) return denegarBloque(res);
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

// ── Helpers de agregación para el archivo de flujos (años/meses/días) ──
// Reciben un $match base ({usuario, puesto, bloque} para el archivo personal,
// o {puesto, bloque} sin usuario para la vista de "Puestos" del bloque) y
// hacen el conteo en el servidor, sin traer movimientos completos.

const aniosDesde = async (matchBase) => {
    const rows = await Movimiento.aggregate([
        { $match: matchBase },
        { $group: { _id: { anio: { $substrCP: ['$fecha', 0, 4] }, fecha: '$fecha' } } },
        { $group: { _id: '$_id.anio', dias: { $sum: 1 } } },
        { $project: { _id: 0, anio: '$_id', dias: 1 } },
        { $sort: { anio: -1 } },
    ]);
    return rows;
};

const mesesDesde = async (matchBase, anio) => {
    const rows = await Movimiento.aggregate([
        { $match: { ...matchBase, fecha: { $regex: `^${anio}-` } } },
        { $group: { _id: { mes: { $substrCP: ['$fecha', 5, 2] }, fecha: '$fecha' } } },
        { $group: { _id: '$_id.mes', dias: { $sum: 1 } } },
        { $project: { _id: 0, mes: '$_id', dias: 1 } },
    ]);
    return rows;
};

const diasDesde = async (matchBase, anio, mes) => {
    const docs = await Movimiento.aggregate([
        { $match: { ...matchBase, fecha: { $regex: `^${anio}-${mes}` } } },
        // Primero se agrupa por vehículo dentro de cada día: el contador de
        // "Petroecuador" cuenta vehículos únicos, no movimientos.
        {
            $group: {
                _id: { fecha: '$fecha', placa: '$placa' },
                tipos: { $push: '$tipo' },
                empresas: { $push: '$empresa' },
                horas: { $push: '$hora' },
            },
        },
        {
            $project: {
                fecha: '$_id.fecha',
                ingresos: { $size: { $filter: { input: '$tipos', as: 't', cond: { $eq: ['$$t', 'ingreso'] } } } },
                salidas: { $size: { $filter: { input: '$tipos', as: 't', cond: { $eq: ['$$t', 'salida'] } } } },
                empresaNonEmpty: {
                    $let: {
                        vars: { nonEmpty: { $filter: { input: '$empresas', as: 'e', cond: { $ne: ['$$e', ''] } } } },
                        in: { $arrayElemAt: ['$$nonEmpty', 0] },
                    },
                },
                horas: 1,
            },
        },
        {
            $group: {
                _id: '$fecha',
                ingresos: { $sum: '$ingresos' },
                salidas: { $sum: '$salidas' },
                petro: {
                    $sum: {
                        $cond: [
                            { $regexMatch: { input: { $toLower: { $ifNull: ['$empresaNonEmpty', ''] } }, regex: 'petroecuador' } },
                            1, 0,
                        ],
                    },
                },
                horas: { $push: '$horas' },
            },
        },
        {
            $project: {
                _id: 0, fecha: '$_id', ingresos: 1, salidas: 1, petro: 1,
                horas: { $reduce: { input: '$horas', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } },
            },
        },
        { $sort: { fecha: -1 } },
    ]);

    // Día o noche: lo que el usuario eligió al crear el flujo (y los cambios de
    // turno que haya registrado ese día), no la hora a la que se abrió o se
    // registró el primer movimiento. En la vista de Puestos un mismo día puede
    // tener el flujo de día de un guardia y el de noche de otro.
    const turnosPorFecha = new Map();
    const flujos = await Turno.find(
        { ...matchBase, fecha: { $in: docs.map(d => d.fecha) } },
        'fecha turnoInicial cambios.a'
    ).lean();
    flujos.forEach(t => {
        const set = turnosPorFecha.get(t.fecha) || new Set();
        set.add(t.turnoInicial);
        (t.cambios || []).forEach(c => c.a && set.add(c.a));
        turnosPorFecha.set(t.fecha, set);
    });

    return docs.map(d => {
        const elegidos = turnosPorFecha.get(d.fecha);
        let turnos;
        if (elegidos?.size) {
            turnos = ['diurno', 'nocturno'].filter(t => elegidos.has(t));
        } else {
            // Días antiguos sin flujo guardado: se deduce por la hora del primer movimiento
            const primeraHora = [...d.horas].sort()[0] || '12:00';
            const hora = parseInt(primeraHora.split(':')[0], 10);
            turnos = [hora >= 6 && hora < 18 ? 'diurno' : 'nocturno'];
        }
        return {
            fecha: d.fecha, ingresos: d.ingresos, salidas: d.salidas, petro: d.petro,
            turnos,
            isDiurno: turnos[0] === 'diurno', // compatibilidad con versiones anteriores de la app
        };
    });
};

const ANIO_RE = /^\d{4}$/;
const MES_RE = /^(0[1-9]|1[0-2])$/;

// GET /api/movimientos/anios?puesto=X&bloque=Y
// Solo etiquetas de años con datos (sin cargar movimientos). Cuenta días distintos por año.
export const getFlujoAnios = async (req, res) => {
    try {
        const { puesto, bloque } = req.query;
        const anios = await aniosDesde({ usuario: req.user._id, puesto, bloque });
        res.json({ anios });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/meses?puesto=X&bloque=Y&anio=YYYY
// Solo etiquetas de meses con datos dentro de un año (sin cargar movimientos).
export const getFlujoMeses = async (req, res) => {
    try {
        const { puesto, bloque, anio } = req.query;
        if (!ANIO_RE.test(anio || '')) return res.status(400).json({ message: 'Año inválido' });
        const meses = await mesesDesde({ usuario: req.user._id, puesto, bloque }, anio);
        res.json({ meses });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/dias?puesto=X&bloque=Y&anio=YYYY&mes=MM
// Etiquetas de días registrados en un mes, con los contadores que usa la tarjeta
// (ingresos, salidas, vehículos de Petroecuador), calculados en el servidor
// para no tener que traer todos los movimientos del mes al cliente.
export const getFlujoDias = async (req, res) => {
    try {
        const { puesto, bloque, anio, mes } = req.query;
        if (!ANIO_RE.test(anio || '')) return res.status(400).json({ message: 'Año inválido' });
        if (!MES_RE.test(mes || '')) return res.status(400).json({ message: 'Mes inválido' });
        const dias = await diasDesde({ usuario: req.user._id, puesto, bloque }, anio, mes);
        res.json({ dias });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// ── Pestaña "Puestos": igual que el archivo, pero a nivel de todo el bloque
// (todos los usuarios) en vez de solo los propios. Las rutas van protegidas
// con el middleware requirePuestosBloque (permiso otorgado por el admin +
// pertenencia al bloque), así que aquí no se vuelve a validar.

// GET /api/movimientos/bloque/puestos?bloque=Y
// Galería: cuántos días tiene registrados cada puesto del bloque.
export const getBloquePuestos = async (req, res) => {
    try {
        const { bloque } = req.query;
        const rows = await Movimiento.aggregate([
            { $match: { bloque } },
            { $group: { _id: { puesto: '$puesto', fecha: '$fecha' } } },
            { $group: { _id: '$_id.puesto', dias: { $sum: 1 } } },
            { $project: { _id: 0, puesto: '$_id', dias: 1 } },
        ]);
        res.json({ puestos: rows });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/bloque/anios?bloque=Y&puesto=X
export const getBloqueAnios = async (req, res) => {
    try {
        const { puesto, bloque } = req.query;
        const anios = await aniosDesde({ puesto, bloque });
        res.json({ anios });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/bloque/meses?bloque=Y&puesto=X&anio=YYYY
export const getBloqueMeses = async (req, res) => {
    try {
        const { puesto, bloque, anio } = req.query;
        if (!ANIO_RE.test(anio || '')) return res.status(400).json({ message: 'Año inválido' });
        const meses = await mesesDesde({ puesto, bloque }, anio);
        res.json({ meses });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/bloque/dias?bloque=Y&puesto=X&anio=YYYY&mes=MM
export const getBloqueDias = async (req, res) => {
    try {
        const { puesto, bloque, anio, mes } = req.query;
        if (!ANIO_RE.test(anio || '')) return res.status(400).json({ message: 'Año inválido' });
        if (!MES_RE.test(mes || '')) return res.status(400).json({ message: 'Mes inválido' });
        const dias = await diasDesde({ puesto, bloque }, anio, mes);
        res.json({ dias });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/bloque/dia?bloque=Y&puesto=X&fecha=YYYY-MM-DD
// Detalle de un día para TODOS los usuarios que registraron en ese puesto/bloque
// (a diferencia de GET /movimientos, que solo trae los propios).
export const getBloqueDia = async (req, res) => {
    try {
        const { puesto, bloque, fecha } = req.query;
        if (!puesto || !bloque || !fecha) return res.status(400).json({ message: 'puesto, bloque y fecha son obligatorios' });
        const movimientos = await Movimiento.find({ puesto, bloque, fecha }).sort({ createdAt: -1 });
        res.json({ movimientos });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/movimientos/dia  { puesto, bloque, fecha }
// Elimina de un solo golpe todos los movimientos de un día (sin necesitar sus ids,
// que ya no se cargan hasta que se abre el detalle del día).
export const deleteMovimientosPorFecha = async (req, res) => {
    try {
        const { puesto, bloque, fecha } = req.body;
        if (!puesto || !bloque || !fecha) return res.status(400).json({ message: 'puesto, bloque y fecha son obligatorios' });
        if (!tieneBloque(req.user, bloque)) return denegarBloque(res);
        const result = await Movimiento.deleteMany({ usuario: req.user._id, puesto, bloque, fecha });
        res.json({ message: 'Flujo eliminado', eliminados: result.deletedCount });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/buscar?puesto=X&bloque=Y&campo=Z&q=texto
// Búsqueda de la pestaña "General": se resuelve en el servidor (limitada a 150
// resultados) en vez de descargar todo el histórico para filtrarlo en el cliente.
export const buscarMovimientos = async (req, res) => {
    try {
        const { puesto, bloque, campo, q } = req.query;
        if (!q || !q.trim()) return res.json({ movimientos: [] });

        const regex = new RegExp(escapeRegex(q.trim()), 'i');
        const camposBuscables = ['placa', 'conductor', 'empresa', 'actividad', 'destino'];
        const filter = { usuario: req.user._id, puesto, bloque };
        if (campo && camposBuscables.includes(campo)) {
            filter[campo] = regex;
        } else {
            filter.$or = camposBuscables.map(c => ({ [c]: regex }));
        }

        const movimientos = await Movimiento.find(filter).sort({ fecha: -1, hora: -1 }).limit(150);
        res.json({ movimientos });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/movimientos/ultimo?placa=ABC1234&tipo=salida
// Último movimiento del usuario para una placa (de cualquier puesto o día),
// usado para precargar destino y actividad al registrar ese vehículo de nuevo.
// Sin `tipo` devuelve el último movimiento sea ingreso o salida.
export const getUltimoMovimientoPlaca = async (req, res) => {
    try {
        const placa = (req.query.placa || '').trim().toUpperCase();
        if (!placa) return res.json({ movimiento: null });

        const filter = { usuario: req.user._id, placa };
        if (['ingreso', 'salida'].includes(req.query.tipo)) filter.tipo = req.query.tipo;

        const movimiento = await Movimiento.findOne(filter)
            .sort({ createdAt: -1 })
            .select('tipo destino actividad fecha hora createdAt');
        res.json({ movimiento });
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
        if ('genero'           in b) update.genero           = b.genero           || 'm';
        if ('guia'             in b) update.guia             = b.guia             || '';
        if ('guias'            in b) update.guias            = b.guias            || [];
        if ('quienAutoriza'    in b) update.quienAutoriza    = b.quienAutoriza    || '';
        if ('empresaAutoriza'  in b) update.empresaAutoriza  = b.empresaAutoriza  || '';
        if ('documento'        in b) update.documento        = b.documento        || '';
        if ('documentoNombre'  in b) update.documentoNombre  = b.documentoNombre  || '';
        if ('documentoTipo'    in b) update.documentoTipo    = b.documentoTipo    || '';
        if ('hora'             in b && b.hora) update.hora   = b.hora;
        if ('clientUUID'       in b) update.clientUUID = b.clientUUID || null;
        const actual = await Movimiento.findOne({ _id: req.params.id, usuario: req.user._id }).select('bloque');
        if (!actual) return res.status(404).json({ message: 'Movimiento no encontrado' });
        if (!tieneBloque(req.user, actual.bloque)) return denegarBloque(res);
        const mov = await Movimiento.findOneAndUpdate(
            { _id: req.params.id, usuario: req.user._id },
            update,
            { new: true }
        );
        if (!mov) return res.status(404).json({ message: 'Movimiento no encontrado' });

        if (b.placa) await Vehiculo.findOneAndUpdate({ placa: b.placa.trim().toUpperCase() }, vehiculoFields(req.body), { upsert: true });

        res.json({ message: 'Movimiento actualizado', movimiento: mov });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
