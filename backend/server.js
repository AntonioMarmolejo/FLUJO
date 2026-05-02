import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import turnoRoutes from './src/routes/turno.routes.js';
import movimientoRoutes from './src/routes/movimiento.routes.js';
import vehiculoRoutes from './src/routes/vehiculo.routes.js';

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

app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/movimientos', movimientoRoutes);
app.use('/api/vehiculos', vehiculoRoutes);

// Health check
app.get('/', (req, res) => res.json({ message: '🚀 Flujo API corriendo' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));