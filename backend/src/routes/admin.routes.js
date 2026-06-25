import { Router } from 'express';
import { protect, authorizeRole } from '../middleware/auth.middleware.js';
import {
    getUsuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    resetPassword,
    getStats,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(protect, authorizeRole('admin'));

router.get('/stats', getStats);
router.get('/usuarios', getUsuarios);
router.post('/usuarios', createUsuario);
router.put('/usuarios/:id', updateUsuario);
router.delete('/usuarios/:id', deleteUsuario);
router.put('/usuarios/:id/password', resetPassword);

export default router;
