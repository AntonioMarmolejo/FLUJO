import { Router } from 'express';
import { getExtensiones, createExtension, updateExtension, deleteExtension } from '../controllers/extension.controller.js';
import { protect, requirePanel } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, requirePanel('extensiones'), getExtensiones);
router.post('/', protect, requirePanel('extensiones'), createExtension);
router.put('/:id', protect, requirePanel('extensiones'), updateExtension);
router.delete('/:id', protect, requirePanel('extensiones'), deleteExtension);

export default router;
