import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BLOQUES_DATA } from '../data/bloques.js';
import api from '../api/axios';
import { guardarTurnoLocal, leerUltimoTurnoLocal, iniciarTurnoOffline } from '../lib/syncEngine.js';
import '../styles/TurnoPage.css';

const TurnoPage = () => {
    const { user, tieneBloque } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Recibe bloque y puesto desde el estado de navegación
    const { bloqueId, puesto: puestoInicial, bloqueIndex, totalBloques, fromWorkspace } = location.state || {};
    const bloque = BLOQUES_DATA[bloqueId];

    const [puestoActual, setPuestoActual] = useState(puestoInicial || '');
    const [showPuestoMenu, setShowPuestoMenu] = useState(false);

    const [form, setForm] = useState({
        cedula: '',
        nombre: '',
        apellidos: '',
        empresa: '',
    });
    const [turno, setTurno] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoFilled, setAutoFilled] = useState(false);

    useEffect(() => {
        const autollenar = (t) => {
            setForm({
                cedula: t.cedula || '',
                nombre: t.nombre || '',
                apellidos: t.apellidos || '',
                empresa: t.empresa || '',
            });
            setAutoFilled(true);
        };
        api.get('/turnos/ultimo')
            .then(({ data }) => {
                if (data.turno) autollenar(data.turno);
                if (data.turnoFrecuente) setTurno(data.turnoFrecuente);
            })
            .catch(() => {
                // Sin conexión: autollenar con el último turno guardado en el dispositivo
                const local = leerUltimoTurnoLocal(user?.id);
                if (local) { autollenar(local); setTurno(local.turnoActual || ''); }
            });
    }, [user?.id]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async () => {
        if (!form.cedula || !form.nombre || !form.apellidos || !form.empresa || !turno) {
            setError('Todos los campos son obligatorios');
            return;
        }

        setLoading(true);
        const datos = { ...form, bloque: bloqueId, puesto: puestoActual, turno };
        try {
            let data;
            try {
                if (!navigator.onLine) throw new Error('offline');
                ({ data } = await api.post('/turnos/iniciar', datos));
                guardarTurnoLocal(data.turno, user?.id);
            } catch (err) {
                if (err.response) throw err; // el servidor lo rechazó: mostrar el motivo
                // Sin conexión: el turno se abre en el dispositivo y se sube al volver internet
                if (!tieneBloque(bloqueId)) {
                    setError('No tienes acceso a este bloque. Pide al administrador que lo apruebe.');
                    return;
                }
                data = await iniciarTurnoOffline(datos, user?.id);
            }

            const esUltimoPuesto = bloqueIndex + 1 === totalBloques;

            if (esUltimoPuesto) {
                navigate('/turno/confirmacion', {
                    state: {
                        turno: {
                            ...data.turno,
                            nombre: form.nombre,
                            apellidos: form.apellidos,
                            empresa: form.empresa,
                            cedula: form.cedula,
                        },
                        bloqueIndex,
                        totalBloques,
                        bloquesConPuestos: location.state.bloquesConPuestos,
                    },
                });
            } else {
                // Ir al siguiente puesto
                navigate('/turno', {
                    state: {
                        bloqueId: location.state.bloquesConPuestos[bloqueIndex + 1].bloqueId,
                        puesto: location.state.bloquesConPuestos[bloqueIndex + 1].puesto,
                        bloqueIndex: bloqueIndex + 1,
                        totalBloques,
                        bloquesConPuestos: location.state.bloquesConPuestos,
                    },
                });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar turno');
        } finally {
            setLoading(false);
        }
    };

    const handleVolver = () => fromWorkspace ? navigate('/workspace') : navigate(-1);

    if (!bloque) return null;

    return (
        <div className="turno-wrapper">
            <div className="turno-card">

                {/* Avatar icono */}
                <div className="turno-avatar" style={{ background: bloque.bg }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2"
                            stroke={bloque.color} strokeWidth="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"
                            stroke={bloque.color} strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="16" r="1.5" fill={bloque.color} />
                    </svg>
                </div>

                {/* Título */}
                <div className="turno-title">
                    <span style={{ color: bloque.color }}>
                        {bloque.nombre.toUpperCase()} {bloque.codigo}
                    </span>
                    <h2>{fromWorkspace ? 'Nuevo turno' : puestoActual}</h2>
                    <p>{fromWorkspace ? 'Selecciona el turno para iniciar un nuevo flujo.' : 'Ingresa los datos del guardia para iniciar el turno.'}</p>
                </div>

                {/* Indicador de progreso si hay múltiples puestos */}
                {!fromWorkspace && totalBloques > 1 && (
                    <div className="turno-progress">
                        Puesto {bloqueIndex + 1} de {totalBloques}
                    </div>
                )}

                {/* Selector puesto/bloque cuando viene de workspace */}
                {fromWorkspace && (
                    <div className="turno-cambiar">
                        {/* Puesto con dropdown */}
                        <div className="turno-puesto">
                            <button className="turno-puesto-btn" onClick={() => setShowPuestoMenu(v => !v)}>
                                <span><span className="turno-cambiar-label">Puesto:</span><strong className="turno-puesto-actual">{puestoActual}</strong></span>
                                <span className="turno-cambiar-aviso">¿Cambiaste de puesto? ▾</span>
                            </button>
                            {showPuestoMenu && (
                                <div className="turno-puesto-menu">
                                    {bloque.puestos.map(p => (
                                        <div key={p}
                                            className={`turno-puesto-opcion${p === puestoActual ? ' actual' : ''}`}
                                            onClick={() => { setPuestoActual(p); setShowPuestoMenu(false); }}
                                        >
                                            {p}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Cambiar bloque */}
                        <button
                            className="turno-bloque-btn"
                            onClick={() => navigate('/onboarding')}
                        >
                            <span className="turno-cambiar-label">Bloque:</span>
                            <strong className="turno-bloque-actual">{bloque.nombre} {bloque.codigo}</strong>
                            <span className="turno-bloque-aviso">¿Cambiaste de bloque? →</span>
                        </button>
                    </div>
                )}

                <div className="turno-divider" />

                {/* Formulario */}
                {autoFilled && (
                    <div className="turno-autollenado">
                        Datos del último turno cargados automáticamente
                    </div>
                )}
                <div className="turno-form">

                    <div className="turno-field">
                        <label>Cédula de identidad</label>
                        <input
                            type="text"
                            name="cedula"
                            placeholder="Ej: 1234567890"
                            value={form.cedula}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="turno-row">
                        <div className="turno-field">
                            <label>Nombre</label>
                            <input
                                type="text"
                                name="nombre"
                                placeholder="Ej: Carlos"
                                value={form.nombre}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="turno-field">
                            <label>Apellidos</label>
                            <input
                                type="text"
                                name="apellidos"
                                placeholder="Ej: Ramírez"
                                value={form.apellidos}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="turno-field">
                        <label>Empresa</label>
                        <input
                            type="text"
                            name="empresa"
                            placeholder="Ej: Seguridad Privada S.A."
                            value={form.empresa}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Selección de turno */}
                    <div className="turno-field">
                        <label>Turno</label>
                        <div className="turno-options">
                            <div
                                className={`turno-option ${turno === 'diurno' ? 'selected' : ''}`}
                                onClick={() => setTurno('diurno')}
                            >
                                <div className="turno-option-icon diurno">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="4" stroke="#f59e0b" strokeWidth="2" />
                                        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                                            stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <span className="turno-option-nombre">Diurno</span>
                                <span className="turno-option-hora">06:00 – 18:00</span>
                            </div>

                            <div
                                className={`turno-option ${turno === 'nocturno' ? 'selected' : ''}`}
                                onClick={() => setTurno('nocturno')}
                            >
                                <div className="turno-option-icon nocturno">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                                            stroke="#818cf8" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span className="turno-option-nombre">Nocturno</span>
                                <span className="turno-option-hora">18:00 – 06:00</span>
                            </div>
                        </div>
                    </div>

                </div>

                {error && <p className="turno-error">{error}</p>}

                {/* Botones */}
                <div className="turno-actions">
                    <button className="turno-btn-back" onClick={handleVolver}>
                        ← Volver
                    </button>
                    <button
                        className={`turno-btn-submit ${form.cedula && form.nombre && form.apellidos && form.empresa && turno ? 'active' : ''}`}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Iniciar turno →'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default TurnoPage;