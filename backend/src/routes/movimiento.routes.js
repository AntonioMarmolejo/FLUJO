import { Router } from 'express';
import {
    crearMovimiento, getMovimientos, getMovimientosTodos, getStats,
    deleteMovimiento, batchDeleteMovimientos, updateMovimiento,
    getFlujoAnios, getFlujoMeses, getFlujoDias, deleteMovimientosPorFecha, buscarMovimientos, getUltimoMovimientoPlaca,
    getBloquePuestos, getBloqueAnios, getBloqueMeses, getBloqueDias, getBloqueDia,
} from '../controllers/movimiento.controller.js';
import { protect, requireActive, requirePuestosBloque } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', protect, requireActive, crearMovimiento);
router.get('/', protect, getMovimientos);
router.get('/stats', protect, getStats);
router.get('/todos', protect, getMovimientosTodos);
router.get('/anios', protect, getFlujoAnios);
router.get('/meses', protect, getFlujoMeses);
router.get('/dias', protect, getFlujoDias);
router.get('/buscar', protect, buscarMovimientos);
router.get('/ultimo', protect, getUltimoMovimientoPlaca);

// "Puestos": archivo de TODO el bloque (todos los usuarios), gateado por permiso de admin
router.get('/bloque/puestos', protect, requirePuestosBloque, getBloquePuestos);
router.get('/bloque/anios', protect, requirePuestosBloque, getBloqueAnios);
router.get('/bloque/meses', protect, requirePuestosBloque, getBloqueMeses);
router.get('/bloque/dias', protect, requirePuestosBloque, getBloqueDias);
router.get('/bloque/dia', protect, requirePuestosBloque, getBloqueDia);

router.delete('/dia', protect, requireActive, deleteMovimientosPorFecha); // antes de /:id para evitar conflicto
router.delete('/batch', protect, requireActive, batchDeleteMovimientos); // antes de /:id para evitar conflicto
router.delete('/:id', protect, requireActive, deleteMovimiento);
router.put('/:id', protect, requireActive, updateMovimiento);

export default router;
