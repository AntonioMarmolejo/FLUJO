import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import RootRoute from './components/RootRoute';
import CreatePinScreen from './pages/CreatePinScreen';
import BlockSelectPage from './pages/BlockSelectPage';
import PostSelectPage from './pages/PostSelectPage';
import WorkspacePage from './pages/WorkspacePage';
import ProtectedRoute from './components/ProtectedRoute';
import TurnoPage from './pages/TurnoPage';
import ConfirmacionTurnoPage from './pages/ConfirmacionTurnoPage';
import FlujoPersonalPage from './pages/FlujoPersonalPage';
import CalendarioPage from './pages/CalendarioPage';
import AdminPage from './pages/AdminPage';
import CuentaEstadoPage from './pages/CuentaEstadoPage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route path="/" element={<RootRoute />} />
                        <Route path="/crear-pin" element={
                            <ProtectedRoute><CreatePinScreen /></ProtectedRoute>
                        } />
                        <Route path="/onboarding" element={
                            <ProtectedRoute requireActive><BlockSelectPage /></ProtectedRoute>
                        } />
                        <Route path="/onboarding/puestos" element={
                            <ProtectedRoute requireActive><PostSelectPage /></ProtectedRoute>
                        } />
                        <Route path="/cuenta-pendiente" element={
                            <ProtectedRoute><CuentaEstadoPage /></ProtectedRoute>
                        } />
                        <Route path="/workspace" element={
                            <ProtectedRoute><WorkspacePage /></ProtectedRoute>
                        } />
                        <Route path="/turno" element={
                            <ProtectedRoute requireActive><TurnoPage /></ProtectedRoute>
                        } />
                        <Route path="/turno/confirmacion" element={
                            <ProtectedRoute requireActive><ConfirmacionTurnoPage /></ProtectedRoute>
                        } />
                        <Route path="/flujos/personal" element={
                            <ProtectedRoute requireActive><FlujoPersonalPage /></ProtectedRoute>
                        } />
                        <Route path="/calendario" element={
                            <ProtectedRoute requireActive><CalendarioPage /></ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                            <ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>
                        } />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </GoogleOAuthProvider>
    );
}

export default App;
