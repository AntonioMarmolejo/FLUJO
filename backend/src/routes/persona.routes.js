import { Router } from 'express';
import { getPersonas, createPersona, updatePersona, deletePersona, bulkImport } from '../controllers/persona.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, getPersonas);
router.post('/bulk', protect, bulkImport);   // antes de /:id
router.post('/', protect, createPersona);
router.put('/:id', protect, updatePersona);
router.delete('/:id', protect, deletePersona);

export default router;
