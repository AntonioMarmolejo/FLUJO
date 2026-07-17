import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.model.js';

const generateAccessToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

const generateRefreshToken = () => crypto.randomBytes(48).toString('hex');

const REFRESH_TTL_DAYS = 30;
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

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

const issueTokens = async (user, deviceId = '') => {
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken();

    // Guardar refresh token; limpiar los vencidos y limitar a 5 por usuario
    const ahora = Date.now();
    const vigentes = (user.refreshTokens || [])
        .filter(r => new Date(r.createdAt).getTime() + REFRESH_TTL_MS > ahora)
        .slice(-4); // máx 4 existentes + 1 nuevo = 5
    vigentes.push({ token: refreshToken, deviceId, createdAt: new Date() });

    await User.findByIdAndUpdate(user._id, { refreshTokens: vigentes });
    return { accessToken, refreshToken };
};

// POST /api/auth/register
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        const adminCount = await User.countDocuments({ role: 'admin' });
        const isFirst = adminCount === 0;
        const role = isFirst ? 'admin' : 'operador';
        const status = isFirst ? 'active' : 'pending';

        const user = await User.create({ name, email, password, role, status });
        const deviceId = req.body.deviceId || '';
        const { accessToken, refreshToken } = await issueTokens(user, deviceId);

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            token: accessToken,
            refreshToken,
            user: buildUserResponse(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password, deviceId = '' } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        if (user.activo === false) {
            return res.status(403).json({ message: 'Tu cuenta está desactivada. Contacta al administrador.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const { accessToken, refreshToken } = await issueTokens(user, deviceId);

        res.status(200).json({
            message: 'Sesión iniciada',
            token: accessToken,
            refreshToken,
            user: buildUserResponse(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/auth/refresh
export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ message: 'Refresh token requerido' });

        const user = await User.findOne({ 'refreshTokens.token': refreshToken }).select('+refreshTokens');
        if (!user) return res.status(401).json({ message: 'Refresh token inválido' });

        const record = user.refreshTokens.find(r => r.token === refreshToken);
        const ahora = Date.now();
        if (!record || new Date(record.createdAt).getTime() + REFRESH_TTL_MS <= ahora) {
            return res.status(401).json({ message: 'Refresh token expirado' });
        }

        if (user.activo === false) {
            return res.status(403).json({ message: 'Tu cuenta está desactivada.' });
        }

        const accessToken = generateAccessToken(user._id, user.role);
        res.json({ token: accessToken, user: buildUserResponse(user) });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await User.updateOne(
                { 'refreshTokens.token': refreshToken },
                { $pull: { refreshTokens: { token: refreshToken } } }
            );
        }
        res.json({ message: 'Sesión cerrada' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/auth/bloques
export const updateBloques = async (req, res) => {
    try {
        const { bloques } = req.body;

        if (!bloques || bloques.length === 0) {
            return res.status(400).json({ message: 'Selecciona al menos un bloque' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { bloques, onboardingCompleto: true },
            { new: true }
        );

        res.status(200).json({
            message: 'Bloques guardados',
            user: buildUserResponse(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
    res.status(200).json({ user: buildUserResponse(req.user) });
};

// POST /api/auth/google
export const googleAuth = async (req, res) => {
    try {
        const { token, deviceId = '' } = req.body;
        if (!token) return res.status(400).json({ message: 'Token requerido' });

        const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!gRes.ok) return res.status(401).json({ message: 'Token de Google inválido' });

        const { sub: googleId, email, name } = await gRes.json();
        if (!email) return res.status(401).json({ message: 'No se pudo obtener el correo de Google' });

        let user = await User.findOne({ $or: [{ googleId }, { email }] });
        if (!user) {
            const adminCount = await User.countDocuments({ role: 'admin' });
            const isFirst = adminCount === 0;
            const role = isFirst ? 'admin' : 'operador';
            const status = isFirst ? 'active' : 'pending';
            user = await User.create({ googleId, email, name, onboardingCompleto: false, role, status });
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }

        if (user.activo === false) {
            return res.status(403).json({ message: 'Tu cuenta está desactivada. Contacta al administrador.' });
        }

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const { accessToken, refreshToken } = await issueTokens(user, deviceId);
        res.json({
            token: accessToken,
            refreshToken,
            user: buildUserResponse(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error con Google auth', error: error.message });
    }
};
