import { Router } from 'express';
import { getVehiculos, searchVehiculos, createVehiculo, updateVehiculo, deleteVehiculo, bulkImport } from '../controllers/vehiculo.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/search', protect, searchVehiculos);
router.get('/', protect, getVehiculos);
router.post('/bulk', protect, bulkImport);
router.post('/', protect, createVehiculo);
router.put('/:id', protect, updateVehiculo);
router.delete('/:id', protect, deleteVehiculo);

export default router;
