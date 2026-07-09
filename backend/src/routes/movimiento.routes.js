import { Router } from 'express';
import { crearMovimiento, getMovimientos, getMovimientosTodos, getStats, deleteMovimiento, batchDeleteMovimientos, updateMovimiento } from '../controllers/movimiento.controller.js';
import { protect, requireActive } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', protect, requireActive, crearMovimiento);
router.get('/', protect, getMovimientos);
router.get('/stats', protect, getStats);
router.get('/todos', protect, getMovimientosTodos);
router.delete('/batch', protect, requireActive, batchDeleteMovimientos); // antes de /:id para evitar conflicto
router.delete('/:id', protect, requireActive, deleteMovimiento);
router.put('/:id', protect, requireActive, updateMovimiento);

export default router;
