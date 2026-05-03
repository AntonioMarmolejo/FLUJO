import { Router } from 'express';
import { crearMovimiento, getMovimientos, getMovimientosTodos, getStats, deleteMovimiento, batchDeleteMovimientos, updateMovimiento } from '../controllers/movimiento.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', protect, crearMovimiento);
router.get('/', protect, getMovimientos);
router.get('/stats', protect, getStats);
router.get('/todos', protect, getMovimientosTodos);
router.delete('/batch', protect, batchDeleteMovimientos); // antes de /:id para evitar conflicto
router.delete('/:id', protect, deleteMovimiento);
router.put('/:id', protect, updateMovimiento);

export default router;
