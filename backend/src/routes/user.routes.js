import { Router } from 'express';
import { updateBloques, updatePuestos } from '../controllers/user.controller.js';
import { protect, requireActive } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/bloques', protect, requireActive, updateBloques);
router.post('/puestos', protect, requireActive, updatePuestos);

export default router;