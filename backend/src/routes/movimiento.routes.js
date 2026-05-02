import { Router } from 'express';
import { crearMovimiento, getMovimientos, getStats } from '../controllers/movimiento.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', protect, crearMovimiento);
router.get('/', protect, getMovimientos);
router.get('/stats', protect, getStats);

export default router;