import { Router } from 'express';
import { register, login, getMe, updateBloques } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);  // Ruta protegida
router.post('/bloques', protect, updateBloques);

export default router;