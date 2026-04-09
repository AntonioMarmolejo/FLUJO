import { Router } from 'express';
import { updateBloques, updatePuestos } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/bloques', protect, updateBloques);
router.post('/puestos', protect, updatePuestos);

export default router;