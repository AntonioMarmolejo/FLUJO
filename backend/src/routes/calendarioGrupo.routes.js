import { Router } from 'express';
import { getGrupos, createGrupo, updateGrupo, deleteGrupo, updateDia } from '../controllers/calendarioGrupo.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, getGrupos);
router.post('/', protect, createGrupo);
router.put('/:id', protect, updateGrupo);
router.delete('/:id', protect, deleteGrupo);
router.patch('/:id/dia', protect, updateDia);

export default router;
