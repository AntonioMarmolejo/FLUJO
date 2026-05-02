import { Router } from 'express';
import { getVehiculos, searchVehiculos, createVehiculo, updateVehiculo, deleteVehiculo } from '../controllers/vehiculo.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/search', protect, searchVehiculos); // antes de / para evitar conflicto
router.get('/', protect, getVehiculos);
router.post('/', protect, createVehiculo);
router.put('/:id', protect, updateVehiculo);
router.delete('/:id', protect, deleteVehiculo);

export default router;
