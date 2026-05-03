import { Router } from 'express';
import { getExtensiones, createExtension, updateExtension, deleteExtension } from '../controllers/extension.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, getExtensiones);
router.post('/', protect, createExtension);
router.put('/:id', protect, updateExtension);
router.delete('/:id', protect, deleteExtension);

export default router;
