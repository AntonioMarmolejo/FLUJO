import { Router } from 'express';
import { getFirmas, createFirma, updateFirma, deleteFirma } from '../controllers/firma.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, getFirmas);
router.post('/', protect, createFirma);
router.put('/:id', protect, updateFirma);
router.delete('/:id', protect, deleteFirma);

export default router;
