import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: 'http://localhost:5173' })); // Puerto de Vite
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (req, res) => res.json({ message: '🚀 Flujo API corriendo' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));