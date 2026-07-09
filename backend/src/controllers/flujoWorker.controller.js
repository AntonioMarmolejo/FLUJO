import FlujoWorker from '../models/FlujoWorker.model.js';

const fields = w => ({
    name:      w.name?.trim(),
    role:      w.role?.trim(),
    cycle:     w.cycle,
    total:     Number(w.total),
    days:      Number(w.days) || 1,
    inDateISO: w.inDateISO,
    back:      w.back?.trim() || 'Pendiente',
    status:    w.status || 'active',
    remaining: w.remaining ?? null,
    turno:     w.turno || 'dia',
});

// GET /api/flujo-workers
export const getWorkers = async (req, res) => {
    try {
        const workers = await FlujoWorker.find().sort({ createdAt: 1 });
        const enTurno   = workers.filter(w => w.turno !== 'descanso');
        const enDescanso = workers.filter(w => w.turno === 'descanso');
        res.json({
            active:   enTurno.filter(w => w.status === 'active'),
            soon:     enTurno.filter(w => w.status === 'soon'),
            descanso: enDescanso,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener funcionarios', error: error.message });
    }
};

// POST /api/flujo-workers
export const createWorker = async (req, res) => {
    try {
        const worker = await FlujoWorker.create(fields(req.body));
        res.status(201).json({ message: 'Funcionario registrado', worker });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/flujo-workers/:id
export const updateWorker = async (req, res) => {
    try {
        const worker = await FlujoWorker.findByIdAndUpdate(req.params.id, fields(req.body), { new: true });
        if (!worker) return res.status(404).json({ message: 'Funcionario no encontrado' });
        res.json({ message: 'Funcionario actualizado', worker });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/flujo-workers/:id
export const deleteWorker = async (req, res) => {
    try {
        const worker = await FlujoWorker.findByIdAndDelete(req.params.id);
        if (!worker) return res.status(404).json({ message: 'Funcionario no encontrado' });
        res.json({ message: 'Funcionario eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/flujo-workers/bulk
export const bulkImport = async (req, res) => {
    try {
        const { workers } = req.body;
        if (!workers?.length) return res.status(400).json({ message: 'No hay datos para importar' });
        const created = await FlujoWorker.insertMany(workers.map(fields));
        res.json({ created: created.length });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
