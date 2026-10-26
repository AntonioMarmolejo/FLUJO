import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import User from '../models/User.model.js';
import { issueTokens } from './auth.controller.js';

const RP_NAME = 'FlujoSecurity';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'flujosecurity.com';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'https://flujosecurity.com';

// Desafíos temporales (en producción mover a Redis o colección Mongo con TTL)
const challenges = new Map();

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
        const excludeCredentials = (user.passkeys || []).map(pk => ({
            id: Buffer.from(pk.credentialID, 'base64url'),
            type: 'public-key',
        }));

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: RP_ID,
            userID: Buffer.from(user._id.toString()),
            userName: user.email,
            userDisplayName: user.name,
            excludeCredentials,
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'required',
                authenticatorAttachment: 'platform',
            },
        });

        challenges.set(user._id.toString(), options.challenge);
        setTimeout(() => challenges.delete(user._id.toString()), 5 * 60 * 1000); // expira en 5 min

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
        const expectedChallenge = challenges.get(userId);
        if (!expectedChallenge) return res.status(400).json({ message: 'Desafío no encontrado o expirado' });

        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            requireUserVerification: true,
        });

        if (!verification.verified) return res.status(400).json({ message: 'Verificación fallida' });

        const { credential } = verification.registrationInfo;
        const newPasskey = {
            credentialID: Buffer.from(credential.id).toString('base64url'),
            publicKey: Buffer.from(credential.publicKey).toString('base64url'),
            counter: credential.counter,
            deviceId: req.body.deviceId || '',
            deviceName,
            createdAt: new Date(),
        };

        await User.findByIdAndUpdate(req.user._id, { $push: { passkeys: newPasskey } });
        challenges.delete(userId);

        res.json({ verified: true, message: 'Huella/Face ID registrado correctamente' });
    } catch (err) {
        res.status(500).json({ message: 'Error verificando registro WebAuthn', error: err.message });
    }
};

// POST /api/webauthn/authenticate/options  (sin autenticación previa — para login biométrico)
export const authenticationOptions = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email requerido' });

        const user = await User.findOne({ email }).select('+passkeys');
        if (!user || !user.passkeys?.length) {
            return res.status(404).json({ message: 'Usuario sin passkey registrado' });
        }

        const allowCredentials = user.passkeys.map(pk => ({
            id: Buffer.from(pk.credentialID, 'base64url'),
            type: 'public-key',
        }));

        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            allowCredentials,
            userVerification: 'required',
        });

        challenges.set(user._id.toString(), options.challenge);
        setTimeout(() => challenges.delete(user._id.toString()), 5 * 60 * 1000);

        res.json({ ...options, userId: user._id });
    } catch (err) {
        res.status(500).json({ message: 'Error generando opciones de autenticación', error: err.message });
    }
};

// POST /api/webauthn/authenticate/verify
export const authenticationVerify = async (req, res) => {
    try {
        const { body, userId, deviceId = '' } = req.body;
        if (!userId) return res.status(400).json({ message: 'userId requerido' });

        const user = await User.findById(userId).select('+passkeys');
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const expectedChallenge = challenges.get(userId.toString());
        if (!expectedChallenge) return res.status(400).json({ message: 'Desafío no encontrado o expirado' });

        const passkey = user.passkeys.find(pk => pk.credentialID === body.id);
        if (!passkey) return res.status(400).json({ message: 'Passkey no reconocida' });

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            credential: {
                id: Buffer.from(passkey.credentialID, 'base64url'),
                publicKey: Buffer.from(passkey.publicKey, 'base64url'),
                counter: passkey.counter,
            },
            requireUserVerification: true,
        });

        if (!verification.verified) return res.status(400).json({ message: 'Autenticación biométrica fallida' });

        // Actualizar contador (previene ataques de replay)
        await User.updateOne(
            { _id: user._id, 'passkeys.credentialID': passkey.credentialID },
            { $set: { 'passkeys.$.counter': verification.authenticationInfo.newCounter } }
        );
        challenges.delete(userId.toString());

        if (user.activo === false) return res.status(403).json({ message: 'Tu cuenta está desactivada.' });

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
