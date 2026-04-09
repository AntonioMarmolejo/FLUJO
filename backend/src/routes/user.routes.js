import { Router } from 'express';
import { updateBloques } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/bloques', protect, updateBloques);

export default router;