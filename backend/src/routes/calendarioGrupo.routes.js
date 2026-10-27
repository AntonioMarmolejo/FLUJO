import { Router } from 'express';
import { getGrupos, createGrupo, updateGrupo, deleteGrupo, updateDia } from '../controllers/calendarioGrupo.controller.js';
import { protect, requireActive } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, requireActive, getGrupos);
router.post('/', protect, requireActive, createGrupo);
router.put('/:id', protect, requireActive, updateGrupo);
router.delete('/:id', protect, requireActive, deleteGrupo);
router.patch('/:id/dia', protect, requireActive, updateDia);

export default router;
