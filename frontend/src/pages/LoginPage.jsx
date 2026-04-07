import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
    const { login, register } = useAuth();
    const [tab, setTab] = useState('login');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', email: '', password: '' });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            if (tab === 'login') {
                await login(form.email, form.password);
            } else {
                await register(form.name, form.email, form.password);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            {/* Header */}
            <div className="login-header">
                <div className="login-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M3 17l4-8 4 4 4-6 4 10" stroke="#fff" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <span className="login-brand">FLUJO</span>
            </div>

            {/* Tabs */}
            <div className="login-tabs">
                <button
                    className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
                    onClick={() => { setTab('login'); setError(''); }}
                >
                    Iniciar sesión
                </button>
                <button
                    className={`tab-btn ${tab === 'register' ? 'active' : ''}`}
                    onClick={() => { setTab('register'); setError(''); }}
                >
                    Registrarse
                </button>
            </div>

            {/* Title */}
            <div className="login-title">
                <h1>{tab === 'login' ? 'Bienvenido\nde vuelta' : 'Crea tu\ncuenta'}</h1>
                <p className="login-subtitle">
                    <span className="dot" />
                    {tab === 'login'
                        ? 'Tu espacio de trabajo te espera'
                        : 'Empieza a gestionar tu flujo'}
                </p>
            </div>

            {/* Form */}
            <div className="login-form">
                {tab === 'register' && (
                    <div className="field-group">
                        <label>NOMBRE</label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                name="name"
                                placeholder="Tu nombre"
                                value={form.name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                )}

                <div className="field-group">
                    <label>CORREO ELECTRÓNICO</label>
                    <div className="input-wrapper">
                        <input
                            type="email"
                            name="email"
                            placeholder="tu@empresa.com"
                            value={form.email}
                            onChange={handleChange}
                        />
                        <span className="input-icon">✉</span>
                    </div>
                </div>

                <div className="field-group">
                    <label>CONTRASEÑA</label>
                    <div className="input-wrapper">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                        />
                        <button
                            className="toggle-password"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                        >
                            {showPassword ? '🙈' : '👁'}
                        </button>
                    </div>
                </div>

                {tab === 'login' && (
                    <div className="forgot-password">
                        <a href="#">¿Olvidaste tu contraseña?</a>
                    </div>
                )}

                {error && <p className="error-msg">{error}</p>}

                <button
                    className="btn-primary"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading
                        ? 'Cargando...'
                        : tab === 'login' ? 'Ingresar al workspace' : 'Crear cuenta'}
                </button>

                <div className="divider"><span>o continúa con</span></div>

                <button className="btn-google">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google Workspace
                </button>

                <p className="login-footer">
                    {tab === 'login' ? '¿Sin cuenta? ' : '¿Ya tienes cuenta? '}
                    <a onClick={() => setTab(tab === 'login' ? 'register' : 'login')}>
                        {tab === 'login' ? 'Créala gratis' : 'Inicia sesión'}
                    </a>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;