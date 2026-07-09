import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';

const buildUser = (u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role || 'operador',
    status: u.status || 'pending',
    permisosPanel: u.permisosPanel || [],
    activo: u.activo !== false,
    lastLogin: u.lastLogin || null,
    createdAt: u.createdAt,
});

// GET /api/admin/usuarios
export const getUsuarios = async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        res.json({ users: users.map(buildUser) });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// POST /api/admin/usuarios  — el admin crea un nuevo usuario
export const createUsuario = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nombre, correo y contraseña son obligatorios' });
        }

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: 'El correo ya está registrado' });

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'operador',
            status: 'active',
            activo: true,
        });

        res.status(201).json({ message: 'Usuario creado', user: buildUser(user) });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/admin/usuarios/:id  — cambiar role, activo, status y/o permisosPanel
export const updateUsuario = async (req, res) => {
    try {
        const { role, activo, name, status, permisosPanel } = req.body;
        const update = {};
        if (role !== undefined) update.role = role;
        if (activo !== undefined) update.activo = activo;
        if (name !== undefined) update.name = name;
        if (status !== undefined) update.status = status;
        if (permisosPanel !== undefined) update.permisosPanel = permisosPanel;

        // No dejar al admin desactivarse a sí mismo ni quitarse el rol
        if (req.params.id === String(req.user._id)) {
            if (activo === false) {
                return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
            }
            if (role && role !== 'admin') {
                return res.status(400).json({ message: 'No puedes quitarte el rol de administrador' });
            }
        }

        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        res.json({ message: 'Usuario actualizado', user: buildUser(user) });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// DELETE /api/admin/usuarios/:id
export const deleteUsuario = async (req, res) => {
    try {
        if (req.params.id === String(req.user._id)) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
        }
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// PUT /api/admin/usuarios/:id/password
export const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const hashed = await bcrypt.hash(password, 12);
        const user = await User.findByIdAndUpdate(req.params.id, { password: hashed }, { new: true });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Contraseña actualizada' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// GET /api/admin/stats  — métricas de uso
export const getStats = async (req, res) => {
    try {
        const [total, admins, supervisors, operadores, inactivos, pendientes] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'supervisor' }),
            User.countDocuments({ role: 'operador' }),
            User.countDocuments({ activo: false }),
            User.countDocuments({ status: 'pending' }),
        ]);

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activosUltimos30 = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });

        res.json({ total, admins, supervisors, operadores, inactivos, pendientes, activosUltimos30 });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
