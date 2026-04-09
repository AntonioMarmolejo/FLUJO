import { Router } from 'express';
import { iniciarTurno, getTurnoActivo } from '../controllers/turno.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/iniciar', protect, iniciarTurno);
router.get('/activo', protect, getTurnoActivo);

export default router;