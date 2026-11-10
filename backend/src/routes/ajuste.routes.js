import { Router } from 'express';
import { getAjustes, setEditoresDistancias } from '../controllers/ajuste.controller.js';
import { protect, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, getAjustes);
router.put('/distancias', protect, authorizeRole('admin'), setEditoresDistancias);

export default router;
