import { Router } from 'express';
import { getWorkers, createWorker, updateWorker, deleteWorker, bulkImport } from '../controllers/flujoWorker.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, getWorkers);
router.post('/bulk', protect, bulkImport);
router.post('/', protect, createWorker);
router.put('/:id', protect, updateWorker);
router.delete('/:id', protect, deleteWorker);

export default router;
