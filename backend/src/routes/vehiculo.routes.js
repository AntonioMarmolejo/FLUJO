import { Router } from 'express';
import { getVehiculos, searchVehiculos, createVehiculo, updateVehiculo, deleteVehiculo, bulkImport } from '../controllers/vehiculo.controller.js';
import { protect, requireActive, requirePanel } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/search', protect, requireActive, searchVehiculos);
router.get('/', protect, requirePanel('placas'), getVehiculos);
router.post('/bulk', protect, requirePanel('placas'), bulkImport);
router.post('/', protect, requirePanel('placas'), createVehiculo);
router.put('/:id', protect, requirePanel('placas'), updateVehiculo);
router.delete('/:id', protect, requirePanel('placas'), deleteVehiculo);

export default router;
