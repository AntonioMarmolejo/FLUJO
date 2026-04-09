import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import BlockSelectPage from './pages/BlockSelectPage';
import PostSelectPage from './pages/PostSelectPage';   // ← nuevo
import WorkspacePage from './pages/WorkspacePage';
import ProtectedRoute from './components/ProtectedRoute';

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
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
