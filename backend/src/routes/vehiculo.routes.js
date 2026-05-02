import { Router } from 'express';
import { getVehiculos, searchVehiculos } from '../controllers/vehiculo.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/search', protect, searchVehiculos); // antes de / para evitar conflicto
router.get('/', protect, getVehiculos);

export default router;
