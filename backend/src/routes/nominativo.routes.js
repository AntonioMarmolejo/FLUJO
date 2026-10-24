import { Router } from 'express';
import {
    getNominativos,
    createNominativo,
    updateNominativo,
    deleteNominativo,
    bulkImportNominativos,
} from '../controllers/nominativo.controller.js';
import { protect, requireActive } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, getNominativos);
router.post('/bulk', protect, requireActive, bulkImportNominativos); // antes de /:id
router.post('/', protect, requireActive, createNominativo);
router.put('/:id', protect, requireActive, updateNominativo);
router.delete('/:id', protect, requireActive, deleteNominativo);

export default router;
