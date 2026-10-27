import { Router } from 'express';
import { getFirmas, createFirma, updateFirma, deleteFirma } from '../controllers/firma.controller.js';
import { protect, requirePanel } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, requirePanel('utilidades'), getFirmas);
router.post('/', protect, requirePanel('utilidades'), createFirma);
router.put('/:id', protect, requirePanel('utilidades'), updateFirma);
router.delete('/:id', protect, requirePanel('utilidades'), deleteFirma);

export default router;
