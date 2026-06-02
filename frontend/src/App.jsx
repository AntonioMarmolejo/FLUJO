import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import BlockSelectPage from './pages/BlockSelectPage';
import PostSelectPage from './pages/PostSelectPage';   // ← nuevo
import WorkspacePage from './pages/WorkspacePage';
import ProtectedRoute from './components/ProtectedRoute';
import TurnoPage from './pages/TurnoPage';
import ConfirmacionTurnoPage from './pages/ConfirmacionTurnoPage';
import FlujoPersonalPage from './pages/FlujoPersonalPage';
import CalendarioPage from './pages/CalendarioPage';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/onboarding" element={
                        <ProtectedRoute><BlockSelectPage /></ProtectedRoute>
                    } />
                    <Route path="/onboarding/puestos" element={
                        <ProtectedRoute><PostSelectPage /></ProtectedRoute>
                    } />
                    <Route path="/workspace" element={
                        <ProtectedRoute><WorkspacePage /></ProtectedRoute>
                    } />
                    <Route path="/turno" element={
                        <ProtectedRoute><TurnoPage /></ProtectedRoute>
                    } />
                    <Route path="/turno/confirmacion" element={
                        <ProtectedRoute><ConfirmacionTurnoPage /></ProtectedRoute>
                    } />
                    <Route path="/flujos/personal" element={
                        <ProtectedRoute><FlujoPersonalPage /></ProtectedRoute>
                    } />
                    <Route path="/calendario" element={
                        <ProtectedRoute><CalendarioPage /></ProtectedRoute>
                    } />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
