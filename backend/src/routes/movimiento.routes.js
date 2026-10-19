import { Router } from 'express';
import {
    crearMovimiento, getMovimientos, getMovimientosTodos, getStats,
    deleteMovimiento, batchDeleteMovimientos, updateMovimiento,
    getFlujoAnios, getFlujoMeses, getFlujoDias, deleteMovimientosPorFecha, buscarMovimientos,
} from '../controllers/movimiento.controller.js';
import { protect, requireActive } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', protect, requireActive, crearMovimiento);
router.get('/', protect, getMovimientos);
router.get('/stats', protect, getStats);
router.get('/todos', protect, getMovimientosTodos);
router.get('/anios', protect, getFlujoAnios);
router.get('/meses', protect, getFlujoMeses);
router.get('/dias', protect, getFlujoDias);
router.get('/buscar', protect, buscarMovimientos);
router.delete('/dia', protect, requireActive, deleteMovimientosPorFecha); // antes de /:id para evitar conflicto
router.delete('/batch', protect, requireActive, batchDeleteMovimientos); // antes de /:id para evitar conflicto
router.delete('/:id', protect, requireActive, deleteMovimiento);
router.put('/:id', protect, requireActive, updateMovimiento);

export default router;
