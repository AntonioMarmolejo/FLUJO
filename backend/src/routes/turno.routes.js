import { Router } from 'express';
import { iniciarTurno, getTurnoActivo, getUltimoTurno } from '../controllers/turno.controller.js';
import { protect, requireActive } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/iniciar', protect, requireActive, iniciarTurno);
router.get('/ultimo', protect, getUltimoTurno);
router.get('/activo', protect, getTurnoActivo);

export default router;