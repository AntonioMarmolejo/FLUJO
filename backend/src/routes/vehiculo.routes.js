import { Router } from 'express';
import { searchVehiculos } from '../controllers/vehiculo.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/search', protect, searchVehiculos);

export default router;
