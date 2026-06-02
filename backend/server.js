import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import turnoRoutes from './src/routes/turno.routes.js';
import movimientoRoutes from './src/routes/movimiento.routes.js';
import vehiculoRoutes from './src/routes/vehiculo.routes.js';
import extensionRoutes from './src/routes/extension.routes.js';
import personaRoutes from './src/routes/persona.routes.js';
import flujoWorkerRoutes from './src/routes/flujoWorker.routes.js';

dotenv.config();
connectDB();

const app = express();

const corsOrigin = process.env.NODE_ENV === 'development'
    ? /^http:\/\/localhost:\d+$/
    : process.env.CLIENT_URL;

app.use(cors({
    origin: corsOrigin,
    credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/movimientos', movimientoRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/extensiones', extensionRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/flujo-workers', flujoWorkerRoutes);

// Health check
app.get('/', (_req, res) => res.json({ message: '🚀 Flujo API corriendo' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));