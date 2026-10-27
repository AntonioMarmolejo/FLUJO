import { Router } from 'express';
import { crearComentario, getComentarios, marcarComentario, deleteComentario } from '../controllers/comentario.controller.js';
import { protect, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', protect, crearComentario);
router.get('/', protect, authorizeRole('admin'), getComentarios);
router.patch('/:id', protect, authorizeRole('admin'), marcarComentario);
router.delete('/:id', protect, authorizeRole('admin'), deleteComentario);

export default router;
