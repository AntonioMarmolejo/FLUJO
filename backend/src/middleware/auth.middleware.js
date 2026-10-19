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

// Protege la vista "Puestos" (ver los registros de TODOS los puestos de un
// bloque, no solo los propios): exige el permiso 'puestos' otorgado por el
// admin, y que el usuario pertenezca al bloque que está consultando.
export const requirePuestosBloque = (req, res, next) => {
    const { bloque } = req.query;
    const isAdmin = req.user?.role === 'admin';
    const tienePermiso = isAdmin || (req.user?.permisosPanel || []).includes('puestos');
    if (!tienePermiso) {
        return res.status(403).json({ message: 'No tienes permiso para ver los Puestos del bloque. Solicítalo al administrador.' });
    }
    if (!isAdmin && !(req.user?.bloques || []).includes(bloque)) {
        return res.status(403).json({ message: 'No perteneces a este bloque' });
    }
    next();
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