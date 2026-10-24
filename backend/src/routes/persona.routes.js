import { Router } from 'express';
import { getPersonas, searchPersonas, createPersona, updatePersona, deletePersona, bulkImport, setAutorizacionFirma } from '../controllers/persona.controller.js';
import { protect, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/search', protect, searchPersonas);
router.get('/', protect, getPersonas);
router.post('/bulk', protect, bulkImport);   // antes de /:id
router.post('/', protect, createPersona);
router.put('/:id/autorizar', protect, authorizeRole('admin'), setAutorizacionFirma); // antes de /:id
router.put('/:id', protect, updatePersona);
router.delete('/:id', protect, deletePersona);

export default router;
