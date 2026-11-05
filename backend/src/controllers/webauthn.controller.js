import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { randomUUID } from 'crypto';
import User from '../models/User.model.js';
import { issueTokens } from './auth.controller.js';

const RP_NAME = 'FlujoSecurity';

// Se leen al usarse: los import de server.js corren antes de dotenv.config()
const esDesarrollo = () => process.env.NODE_ENV === 'development';
const rpID = () => process.env.WEBAUTHN_RP_ID || (esDesarrollo() ? 'localhost' : 'flujosecurity.com');
const origen = () => process.env.WEBAUTHN_ORIGIN
    || (esDesarrollo() ? (process.env.CLIENT_URL || 'http://localhost:5173') : 'https://flujosecurity.com');

// Desafíos temporales (en producción mover a Redis o colección Mongo con TTL)
const DESAFIO_TTL_MS = 5 * 60 * 1000;
const challenges = new Map();

const guardarDesafio = (clave, challenge) => {
    const ahora = Date.now();
    for (const [k, d] of challenges) {
        if (d.expira <= ahora) challenges.delete(k);
    }
    challenges.set(clave, { challenge, expira: ahora + DESAFIO_TTL_MS });
};

// Cada desafío sirve una sola vez, aunque la verificación falle
const tomarDesafio = (clave) => {
    const desafio = challenges.get(clave);
    challenges.delete(clave);
    return desafio && desafio.expira > Date.now() ? desafio.challenge : null;
};

const buildUserResponse = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || 'operador',
    status: user.status || 'pending',
    permisosPanel: user.permisosPanel || [],
    activo: user.activo !== false,
    bloques: user.bloques,
    puestos: Object.fromEntries(user.puestos || new Map()),
    onboardingCompleto: user.onboardingCompleto,
});

// POST /api/webauthn/register/options  (requiere autenticación previa con contraseña)
export const registrationOptions = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+passkeys');
        const excludeCredentials = (user.passkeys || []).map(pk => ({ id: pk.credentialID }));

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: rpID(),
            userID: Buffer.from(user._id.toString()),
            userName: user.email,
            userDisplayName: user.name,
            excludeCredentials,
            authenticatorSelection: {
                // Credencial detectable: permite entrar con huella sin escribir el correo
                residentKey: 'required',
                userVerification: 'required',
                authenticatorAttachment: 'platform',
            },
        });

        guardarDesafio(user._id.toString(), options.challenge);

        res.json(options);
    } catch (err) {
        res.status(500).json({ message: 'Error generando opciones WebAuthn', error: err.message });
    }
};

// POST /api/webauthn/register/verify
export const registrationVerify = async (req, res) => {
    try {
        const { body, deviceName = '' } = req.body;
        const userId = req.user._id.toString();
        const expectedChallenge = tomarDesafio(userId);
        if (!expectedChallenge) return res.status(400).json({ message: 'Desafío no encontrado o expirado' });

        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: origen(),
            expectedRPID: rpID(),
            requireUserVerification: true,
        });

        if (!verification.verified) return res.status(400).json({ message: 'Verificación fallida' });

        const { credential } = verification.registrationInfo;
        const newPasskey = {
            credentialID: credential.id, // la librería ya lo entrega en base64url
            publicKey: Buffer.from(credential.publicKey).toString('base64url'),
            counter: credential.counter,
            deviceId: req.body.deviceId || '',
            deviceName,
            createdAt: new Date(),
        };

        await User.findByIdAndUpdate(req.user._id, { $push: { passkeys: newPasskey } });

        res.json({ verified: true, message: 'Huella/Face ID registrado correctamente' });
    } catch (err) {
        res.status(500).json({ message: 'Error verificando registro WebAuthn', error: err.message });
    }
};

// POST /api/webauthn/authenticate/options  (sin autenticación previa — para login biométrico)
// El correo es opcional: sin él, el dispositivo ofrece las huellas que tenga para
// este sitio. La respuesta es la misma exista o no el correo, para no revelar cuentas.
export const authenticationOptions = async (req, res) => {
    try {
        const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const user = email ? await User.findOne({ email }).select('+passkeys') : null;
        const allowCredentials = (user?.passkeys || []).map(pk => ({ id: pk.credentialID }));

        const options = await generateAuthenticationOptions({
            rpID: rpID(),
            allowCredentials,
            userVerification: 'required',
        });

        const challengeId = randomUUID();
        guardarDesafio(challengeId, options.challenge);

        res.json({ ...options, challengeId });
    } catch (err) {
        res.status(500).json({ message: 'Error generando opciones de autenticación', error: err.message });
    }
};

// POST /api/webauthn/authenticate/verify
export const authenticationVerify = async (req, res) => {
    try {
        const { body, challengeId, deviceId = '' } = req.body;
        if (typeof challengeId !== 'string' || typeof body?.id !== 'string') {
            return res.status(400).json({ message: 'Datos de autenticación incompletos' });
        }

        const expectedChallenge = tomarDesafio(challengeId);
        if (!expectedChallenge) return res.status(400).json({ message: 'Desafío no encontrado o expirado' });

        // La credencial que usó el dispositivo identifica al usuario
        const user = await User.findOne({ 'passkeys.credentialID': body.id }).select('+passkeys');
        if (!user) {
            return res.status(400).json({ message: 'Esta huella no está registrada. Entra con tu contraseña y actívala en tu perfil.' });
        }

        const passkey = user.passkeys.find(pk => pk.credentialID === body.id);

        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge,
                expectedOrigin: origen(),
                expectedRPID: rpID(),
                credential: {
                    id: passkey.credentialID,
                    publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
                    counter: passkey.counter,
                },
                requireUserVerification: true,
            });
        } catch {
            return res.status(400).json({ message: 'Autenticación biométrica fallida' });
        }

        if (!verification.verified) return res.status(400).json({ message: 'Autenticación biométrica fallida' });

        if (user.activo === false) {
            return res.status(403).json({ message: 'Tu cuenta está desactivada. Contacta al administrador.' });
        }

        // Actualizar contador (previene ataques de replay)
        await User.updateOne(
            { _id: user._id, 'passkeys.credentialID': passkey.credentialID },
            { $set: { 'passkeys.$.counter': verification.authenticationInfo.newCounter, lastLogin: new Date() } }
        );

        const { accessToken, refreshToken } = await issueTokens(user, deviceId);

        res.json({
            verified: true,
            token: accessToken,
            refreshToken,
            user: buildUserResponse(user),
        });
    } catch (err) {
        res.status(500).json({ message: 'Error verificando autenticación WebAuthn', error: err.message });
    }
};

// GET /api/webauthn/passkeys  (listar passkeys del usuario)
export const listPasskeys = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+passkeys');
        const passkeys = (user.passkeys || []).map(pk => ({
            credentialID: pk.credentialID,
            deviceName: pk.deviceName || 'Dispositivo',
            createdAt: pk.createdAt,
        }));
        res.json({ passkeys });
    } catch (err) {
        res.status(500).json({ message: 'Error listando passkeys', error: err.message });
    }
};

// DELETE /api/webauthn/passkeys/:credentialID
export const deletePasskey = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { passkeys: { credentialID: req.params.credentialID } },
        });
        res.json({ message: 'Passkey eliminada' });
    } catch (err) {
        res.status(500).json({ message: 'Error eliminando passkey', error: err.message });
    }
};
