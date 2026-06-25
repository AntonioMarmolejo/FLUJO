import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const buildUserResponse = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || 'operador',
    activo: user.activo !== false,
    bloques: user.bloques,
    puestos: Object.fromEntries(user.puestos || new Map()),
    onboardingCompleto: user.onboardingCompleto,
});

// POST /api/auth/register
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        // Si no existe ningún admin, el primer usuario en registrarse es admin
        const adminCount = await User.countDocuments({ role: 'admin' });
        const role = adminCount === 0 ? 'admin' : 'operador';

        const user = await User.create({ name, email, password, role });
        const token = generateToken(user._id, user.role);

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            token,
            user: buildUserResponse(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

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

        const token = generateToken(user._id, user.role);

        res.status(200).json({
            message: 'Sesión iniciada',
            token,
            user: buildUserResponse(user),
        });
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
        const { token } = req.body;
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
            const role = adminCount === 0 ? 'admin' : 'operador';
            user = await User.create({ googleId, email, name, onboardingCompleto: false, role });
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }

        if (user.activo === false) {
            return res.status(403).json({ message: 'Tu cuenta está desactivada. Contacta al administrador.' });
        }

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const jwtToken = generateToken(user._id, user.role);
        res.json({
            token: jwtToken,
            user: buildUserResponse(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error con Google auth', error: error.message });
    }
};
