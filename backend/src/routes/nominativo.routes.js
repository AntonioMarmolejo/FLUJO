import { Router } from 'express';
import {
    getNominativos,
    createNominativo,
    updateNominativo,
    deleteNominativo,
    bulkImportNominativos,
} from '../controllers/nominativo.controller.js';
import { protect, requirePanel } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, requirePanel('utilidades'), getNominativos);
router.post('/bulk', protect, requirePanel('utilidades'), bulkImportNominativos); // antes de /:id
router.post('/', protect, requirePanel('utilidades'), createNominativo);
router.put('/:id', protect, requirePanel('utilidades'), updateNominativo);
router.delete('/:id', protect, requirePanel('utilidades'), deleteNominativo);

export default router;
