import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

export const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'No autorizado, token requerido' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        if (!req.user || req.user.activo === false) {
            return res.status(403).json({ message: 'Tu cuenta está desactivada. Contacta al administrador.' });
        }

        next();
    } catch (error) {
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
};

export const authorizeRole = (...rolesPermitidos) => {
    return (req, res, next) => {
        const userRole = req.user?.role || 'operador';
        if (!rolesPermitidos.includes(userRole)) {
            return res.status(403).json({ message: 'Acceso denegado: permisos insuficientes' });
        }
        next();
    };
};

// Bloquea operaciones de escritura a usuarios pendientes de aprobación
export const requireActive = (req, res, next) => {
    const userStatus = req.user?.status || 'pending';
    if (userStatus === 'pending') {
        return res.status(403).json({
            message: 'Tu cuenta está pendiente de aprobación. Contacta al administrador para activar el acceso.',
            code: 'ACCOUNT_PENDING',
        });
    }
    if (userStatus === 'suspended') {
        return res.status(403).json({
            message: 'Tu cuenta está suspendida. Contacta al administrador.',
            code: 'ACCOUNT_SUSPENDED',
        });
    }
    next();
};