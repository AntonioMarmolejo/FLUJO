import { Router } from 'express';
import { getWorkers, createWorker, updateWorker, deleteWorker, bulkImport } from '../controllers/flujoWorker.controller.js';
import { protect, requireActive } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, requireActive, getWorkers);
router.post('/bulk', protect, requireActive, bulkImport);
router.post('/', protect, requireActive, createWorker);
router.put('/:id', protect, requireActive, updateWorker);
router.delete('/:id', protect, requireActive, deleteWorker);

export default router;
