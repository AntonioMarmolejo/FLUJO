import { Router } from 'express';
import {
    registrationOptions,
    registrationVerify,
    authenticationOptions,
    authenticationVerify,
    listPasskeys,
    deletePasskey,
} from '../controllers/webauthn.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Registro de passkey (requiere sesión activa con contraseña)
router.post('/register/options', protect, registrationOptions);
router.post('/register/verify', protect, registrationVerify);

// Login biométrico (sin sesión previa)
router.post('/authenticate/options', authenticationOptions);
router.post('/authenticate/verify', authenticationVerify);

// Gestión de passkeys
router.get('/passkeys', protect, listPasskeys);
router.delete('/passkeys/:credentialID', protect, deletePasskey);

export default router;
