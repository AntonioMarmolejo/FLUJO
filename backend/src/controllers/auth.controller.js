import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// Generar JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

// POST /api/auth/register
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        const user = await User.create({ name, email, password });
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bloques: user.bloques,
                puestos: Object.fromEntries(user.puestos || new Map()),
                onboardingCompleto: user.onboardingCompleto,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario (incluir password que está oculto por defecto)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        // Verificar contraseña
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            message: 'Sesión iniciada',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bloques: user.bloques,
                puestos: Object.fromEntries(user.puestos || new Map()),
                onboardingCompleto: user.onboardingCompleto,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/user/bloques
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
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bloques: user.bloques,
                onboardingCompleto: user.onboardingCompleto,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/auth/me  (ruta protegida)
export const getMe = async (req, res) => {
    res.status(200).json({ user: req.user });
};