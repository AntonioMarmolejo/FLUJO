import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BLOQUES_DATA } from '../data/bloques.js';
import api from '../api/axios';
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from 'recharts';
import '../styles/WorkspacePage.css';

// ── Icono camión ──────────────────────────────────────────
const TruckIcon = ({ color }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"
            stroke={color} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="2" />
        <circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="2" />
    </svg>
);

// ── Modal agregar movimiento ──────────────────────────────
const ModalAgregar = ({ puesto, bloque, onClose, onGuardado }) => {
    const [form, setForm] = useState({ tipo: 'ingreso', placa: '', conductor: '', cedula: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async () => {
        if (!form.placa || !form.conductor || !form.cedula) {
            setError('Todos los campos son obligatorios');
            return;
        }
        setLoading(true);
        try {
            await api.post('/movimientos', { ...form, puesto, bloque });
            onGuardado();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Nuevo movimiento</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-tipo">
                    {['ingreso', 'salida'].map(t => (
                        <button
                            key={t}
                            className={`modal-tipo-btn ${form.tipo === t ? 'active-' + t : ''}`}
                            onClick={() => setForm({ ...form, tipo: t })}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="modal-fields">
                    {[
                        { name: 'placa', label: 'Placa', placeholder: 'Ej: ABC-1234' },
                        { name: 'conductor', label: 'Conductor', placeholder: 'Ej: Carlos Ruiz' },
                        { name: 'cedula', label: 'Cédula', placeholder: 'Ej: 1023456789' },
                    ].map(f => (
                        <div key={f.name} className="modal-field">
                            <label>{f.label}</label>
                            <input
                                type="text"
                                name={f.name}
                                placeholder={f.placeholder}
                                value={form[f.name]}
                                onChange={handleChange}
                            />
                        </div>
                    ))}
                </div>

                {error && <p className="modal-error">{error}</p>}

                <button
                    className={`modal-btn ${form.placa && form.conductor && form.cedula ? 'active' : ''}`}
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : 'Registrar movimiento'}
                </button>
            </div>
        </div>
    );
};

// ── Pantalla Perfil ───────────────────────────────────────
const PantallaVehiculos = ({ movimientos }) => (
    <div className="ws-section-content">
        <h3 className="ws-sub-title">Todos los vehículos hoy</h3>
        {movimientos.length === 0
            ? <p className="ws-empty">Sin vehículos registrados hoy</p>
            : movimientos.filter(m => m.tipo === 'ingreso').map(m => (
                <div key={m._id} className="mov-item">
                    <div className="mov-icon ingreso"><TruckIcon color="#818cf8" /></div>
                    <div className="mov-info">
                        <span className="mov-tipo ingreso">{m.placa}</span>
                        <span className="mov-detalle">{m.conductor} · {m.cedula.slice(0, 7)}...</span>
                    </div>
                    <span className="mov-hora">{m.hora}</span>
                </div>
            ))
        }
    </div>
);

const PantallaPerfil = ({ user, turnoActivo, onLogout }) => {
    const bloque = turnoActivo ? BLOQUES_DATA[turnoActivo.bloque] : null;
    const iniciales = `${user?.name?.split(' ')[0]?.[0] || ''}${user?.name?.split(' ')[1]?.[0] || ''}`.toUpperCase();

    return (
        <div className="perfil-wrapper">
            <div className="perfil-avatar">{iniciales}</div>
            <h2 className="perfil-nombre">{user?.name}</h2>
            <p className="perfil-email">{user?.email}</p>

            {turnoActivo && bloque && (
                <div className="perfil-turno-card" style={{ borderColor: bloque.color + '40', background: bloque.bg }}>
                    <span style={{ color: bloque.color, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                        TURNO ACTIVO
                    </span>
                    <p style={{ color: '#fff', fontWeight: 700, marginTop: 4 }}>{turnoActivo.puesto}</p>
                    <p style={{ color: '#888', fontSize: 13 }}>{bloque.nombre} {bloque.codigo}</p>
                    <p style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                        {turnoActivo.turnoActual === 'diurno' ? '06:00 – 18:00' : '18:00 – 06:00'}
                    </p>
                </div>
            )}

            <button className="perfil-logout" onClick={onLogout}>Cerrar sesión</button>
        </div>
    );
};

// ── Dashboard principal ───────────────────────────────────
const WorkspacePage = () => {
    const { user, logout } = useAuth();

    const [tabActiva, setTabActiva] = useState('inicio');
    const [dashCollapsed, setDashCollapsed] = useState(false);
    const [movCollapsed, setMovCollapsed] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const [stats, setStats] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState(null);

    // Obtener el primer turno activo del usuario
    useEffect(() => {
        const fetchTurno = async () => {
            try {
                const { data } = await api.get('/turnos/activo');
                if (data.turno) setTurnoActivo(data.turno);
            } catch { }
        };
        fetchTurno();
    }, []);

    // Cargar stats y movimientos cuando hay turno activo
    const cargarDatos = async () => {
        if (!turnoActivo) return;
        try {
            const [statsRes, movRes] = await Promise.all([
                api.get(`/movimientos/stats?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}`),
                api.get(`/movimientos?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}`),
            ]);
            setStats(statsRes.data);
            setMovimientos(movRes.data.movimientos);
        } catch { }
    };

    useEffect(() => { cargarDatos(); }, [turnoActivo]);

    const bloque = turnoActivo ? BLOQUES_DATA[turnoActivo.bloque] : null;

    return (
        <div className="ws-wrapper">

            {/* Top bar */}
            <div className="ws-topbar">
                <button className="ws-topbar-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M3 12h18M3 18h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                <span className="ws-topbar-title">FLUJO</span>
                <button className="ws-topbar-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            {/* Contenido según tab */}
            <div className="ws-body">

                {tabActiva === 'inicio' && (
                    <>
                        {/* Sección Dashboard */}
                        <div className="ws-section">
                            <button className="ws-section-header" onClick={() => setDashCollapsed(p => !p)}>
                                <span>DASHBOARD</span>
                                <span className={`ws-chevron ${dashCollapsed ? 'collapsed' : ''}`}>∧</span>
                            </button>

                            {!dashCollapsed && (
                                <div className="ws-section-content">
                                    {/* Contadores */}
                                    <div className="ws-counters">
                                        {[
                                            { valor: stats?.totalVehiculos ?? '–', label: 'VEHÍCULOS' },
                                            { valor: stats?.totalFlujos ?? '–', label: 'FLUJOS' },
                                            { valor: stats?.diasActivos ?? '–', label: 'DÍAS', suffix: 'd' },
                                        ].map(c => (
                                            <div key={c.label} className="ws-counter-card">
                                                <span className="ws-counter-val">
                                                    {c.valor}
                                                    {c.suffix && <sub className="ws-counter-suffix">{c.suffix}</sub>}
                                                </span>
                                                <span className="ws-counter-label">{c.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Gráfico */}
                                    <div className="ws-chart-card">
                                        <div className="ws-chart-header">
                                            <span>Movimiento de vehículos</span>
                                            <span className="ws-chart-badge">+{stats?.totalFlujos ?? 0} hoy</span>
                                        </div>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <LineChart data={stats?.grafico || []} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                                <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 10 }} interval={1} />
                                                <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                                                <Tooltip
                                                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                                                    labelStyle={{ color: '#aaa' }}
                                                />
                                                <Line type="monotone" dataKey="ingresos" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} name="Ingresos" />
                                                <Line type="monotone" dataKey="salidas" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} name="Salidas" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                        <div className="ws-chart-legend">
                                            <span><span className="ws-dot" style={{ background: '#818cf8' }} />Ingresos</span>
                                            <span><span className="ws-dot" style={{ background: '#f87171' }} />Salidas</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sección Movimientos */}
                        <div className="ws-section">
                            <button className="ws-section-header" onClick={() => setMovCollapsed(p => !p)}>
                                <span>MOVIMIENTOS</span>
                                <span className={`ws-chevron ${movCollapsed ? 'collapsed' : ''}`}>∧</span>
                            </button>

                            {!movCollapsed && (
                                <div className="ws-section-content">
                                    {movimientos.length === 0
                                        ? <p className="ws-empty">Sin movimientos registrados hoy</p>
                                        : movimientos.map(m => (
                                            <div key={m._id} className="mov-item">
                                                <div className={`mov-icon ${m.tipo}`}>
                                                    <TruckIcon color={m.tipo === 'ingreso' ? '#818cf8' : '#f87171'} />
                                                    <span className="mov-hora-small">{m.hora}</span>
                                                </div>
                                                <div className="mov-info">
                                                    <span className={`mov-tipo ${m.tipo}`}>
                                                        {m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}
                                                    </span>
                                                    <span className="mov-detalle">
                                                        {turnoActivo?.puesto} · {m.conductor} · {m.cedula.slice(0, 7)}...
                                                    </span>
                                                </div>
                                                <div className={`mov-badge ${m.tipo}`}>
                                                    {m.tipo[0].toUpperCase()}
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </>
                )}

                {tabActiva === 'vehiculos' && (
                    <PantallaVehiculos movimientos={movimientos} />
                )}

                {tabActiva === 'flujos' && (
                    <div className="ws-section-content">
                        <h3 className="ws-sub-title">Flujos del día</h3>
                        <p className="ws-empty">Próximamente</p>
                    </div>
                )}

                {tabActiva === 'perfil' && (
                    <PantallaPerfil user={user} turnoActivo={turnoActivo} onLogout={logout} />
                )}
            </div>

            {/* Botón flotante + */}
            {tabActiva === 'inicio' && (
                <button className="ws-fab" onClick={() => setShowModal(true)}>+</button>
            )}

            {/* Modal */}
            {showModal && turnoActivo && (
                <ModalAgregar
                    puesto={turnoActivo.puesto}
                    bloque={turnoActivo.bloque}
                    onClose={() => setShowModal(false)}
                    onGuardado={cargarDatos}
                />
            )}

            {/* Bottom nav */}
            <nav className="ws-navbar">
                {[
                    {
                        id: 'inicio', label: 'Inicio', icon: (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        )
                    },
                    { id: 'vehiculos', label: 'Vehículos', icon: <TruckIcon color="currentColor" /> },
                    {
                        id: 'flujos', label: 'Flujos', icon: (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6h18M3 12h12M3 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )
                    },
                    {
                        id: 'perfil', label: 'Perfil', icon: (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )
                    },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`ws-nav-btn ${tabActiva === tab.id ? 'active' : ''}`}
                        onClick={() => setTabActiva(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tabActiva === tab.id && <div className="ws-nav-dot" />}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default WorkspacePage;