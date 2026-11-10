import { Router } from 'express';
import { getTramos, createTramo, updateTramo, deleteTramo, requireEditarDistancias } from '../controllers/tramo.controller.js';
import { protect, requireActive } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, getTramos);
router.post('/', protect, requireActive, requireEditarDistancias, createTramo);
router.put('/:id', protect, requireActive, requireEditarDistancias, updateTramo);
router.delete('/:id', protect, requireActive, requireEditarDistancias, deleteTramo);

export default router;
