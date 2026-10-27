import { Router } from 'express';
import { getPersonas, searchPersonas, createPersona, updatePersona, deletePersona, bulkImport, setAutorizacionFirma } from '../controllers/persona.controller.js';
import { protect, authorizeRole, requireActive, requirePanel } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/search', protect, requireActive, searchPersonas);
router.get('/', protect, requirePanel('personas'), getPersonas);
router.post('/bulk', protect, requirePanel('personas'), bulkImport);   // antes de /:id
router.post('/', protect, requireActive, createPersona);
router.put('/:id/autorizar', protect, authorizeRole('admin'), setAutorizacionFirma); // antes de /:id
router.put('/:id', protect, requirePanel('personas'), updatePersona);
router.delete('/:id', protect, requirePanel('personas'), deletePersona);

export default router;
