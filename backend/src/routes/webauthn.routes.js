import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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

// Estas dos rutas no piden sesión: se limitan igual que el login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

// Registro de passkey (requiere sesión activa con contraseña)
router.post('/register/options', protect, registrationOptions);
router.post('/register/verify', protect, registrationVerify);

// Login biométrico (sin sesión previa)
router.post('/authenticate/options', loginLimiter, authenticationOptions);
router.post('/authenticate/verify', loginLimiter, authenticationVerify);

// Gestión de passkeys
router.get('/passkeys', protect, listPasskeys);
router.delete('/passkeys/:credentialID', protect, deletePasskey);

export default router;
