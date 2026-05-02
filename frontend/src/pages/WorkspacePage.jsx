import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BLOQUES_DATA } from '../data/bloques.js';
import api from '../api/axios';
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from 'recharts';
import '../styles/WorkspacePage.css';

// ── Iconos ────────────────────────────────────────────────
const TruckIcon = ({ color }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="2" />
        <circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="2" />
    </svg>
);

const IconMinus = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

const IconPencil = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M15.232 5.232l3.536 3.536M9 11l6.536-6.536a2 2 0 012.828 2.829L11.828 13.828a2 2 0 01-.707.464l-3.536 1.06 1.06-3.536A2 2 0 019 11z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const IconCopy = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" />
    </svg>
);

const IconShare = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ── Helpers ───────────────────────────────────────────────
const EMPTY_FORM = { tipo: 'ingreso', placa: '', marca: '', color: '', tipoVehiculo: '', empresa: '', conductor: '', cedula: '', destino: '', actividad: '' };
const TIPO_VEHICULO_OPTS = ['Sedán', 'SUV', 'Camioneta', 'Camión', 'Bus', 'Moto', 'Otro'];

const formatMov = m => [m.marca, m.color, m.conductor].filter(Boolean).join(' · ') || 'Sin datos';

const movToText = m =>
    `Placa: ${m.placa}\nTipo: ${m.tipo}\nConductor: ${m.conductor || '—'}\nEmpresa: ${m.empresa || '—'}\nDestino: ${m.destino || '—'}\nHora: ${m.hora} — ${m.fecha}`;

// ── Campos del formulario ────────────────────────────────
const ModalField = ({ name, label, placeholder, required, value, onChange, autoFilled }) => (
    <div className={`modal-field ${autoFilled && value ? 'modal-field-autofilled' : ''}`}>
        <label>{label}{required && <span style={{ color: '#f87171' }}> *</span>}</label>
        <input type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} />
    </div>
);

const ModalSelect = ({ name, label, options, value, onChange, autoFilled }) => (
    <div className={`modal-field ${autoFilled && value ? 'modal-field-autofilled' : ''}`}>
        <label>{label}</label>
        <select name={name} value={value} onChange={onChange}>
            <option value="">— Seleccionar —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);

// ── Modal formulario (crear + editar) ────────────────────
const ModalAgregar = ({ puesto, bloque, onClose, onGuardado, movimientos, editData }) => {
    const [form, setForm] = useState(editData
        ? { tipo: editData.tipo, placa: editData.placa, marca: editData.marca || '', color: editData.color || '', tipoVehiculo: editData.tipoVehiculo || '', empresa: editData.empresa || '', conductor: editData.conductor || '', cedula: editData.cedula || '', destino: editData.destino || '', actividad: editData.actividad || '' }
        : EMPTY_FORM
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [autoFilled, setAutoFilled] = useState(!!editData);
    const searchTimer = useRef(null);

    const handleChange = e => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setError('');
    };

    const handlePlacaChange = e => {
        const val = e.target.value.toUpperCase();
        setForm(f => ({ ...f, placa: val }));
        setAutoFilled(false);
        setError('');

        if (val.length < 2) { setSuggestions([]); return; }

        const seen = new Set();
        const todayHits = movimientos
            .filter(m => m.placa.includes(val) && !seen.has(m.placa) && seen.add(m.placa))
            .slice(0, 4)
            .map(m => ({ ...m, _source: 'hoy' }));

        if (todayHits.length > 0) { setSuggestions(todayHits); return; }

        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(async () => {
            try {
                const { data } = await api.get(`/vehiculos/search?placa=${val}`);
                setSuggestions(data.vehiculos.map(v => ({ ...v, _source: 'db' })));
            } catch { setSuggestions([]); }
        }, 300);
    };

    const selectSuggestion = v => {
        setForm(f => ({ ...f, placa: v.placa, marca: v.marca || '', color: v.color || '', tipoVehiculo: v.tipoVehiculo || '', empresa: v.empresa || '', conductor: v.conductor || '', cedula: v.cedula || '' }));
        setSuggestions([]);
        setAutoFilled(true);
    };

    const handleSubmit = async () => {
        if (!form.placa) { setError('La placa es obligatoria'); return; }
        setLoading(true);
        try {
            if (editData?._id) {
                await api.put(`/movimientos/${editData._id}`, form);
            } else {
                await api.post('/movimientos', { ...form, puesto, bloque });
            }
            onGuardado();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const fp = { onChange: handleChange, autoFilled };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{editData ? 'Editar movimiento' : 'Nuevo movimiento'}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-tipo">
                    {[['ingreso', 'INGRESA'], ['salida', 'SALE']].map(([val, label]) => (
                        <button key={val} className={`modal-tipo-btn ${form.tipo === val ? 'active-' + val : ''}`}
                            onClick={() => setForm(f => ({ ...f, tipo: val }))}>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="modal-fields">
                    <div className={`modal-field ${autoFilled ? 'modal-field-autofilled' : ''}`}>
                        <label>PLACAS <span style={{ color: '#f87171' }}>*</span></label>
                        <div className="placa-wrapper">
                            <input type="text" name="placa" placeholder="Ej: ABC-1234"
                                value={form.placa} onChange={handlePlacaChange} autoComplete="off" />
                            {suggestions.length > 0 && (
                                <div className="placa-suggestions">
                                    {suggestions.map((v, i) => (
                                        <div key={i} className="placa-suggestion-item" onClick={() => selectSuggestion(v)}>
                                            <div>
                                                <div className="placa-suggestion-placa">{v.placa}</div>
                                                <div className="placa-suggestion-info">{formatMov(v)}</div>
                                            </div>
                                            <span className={`placa-suggestion-badge ${v._source}`}>
                                                {v._source === 'hoy' ? 'Hoy' : 'BD'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-fields-row">
                        <ModalField name="marca" label="MARCA" placeholder="Toyota" value={form.marca} {...fp} />
                        <ModalField name="color" label="COLOR" placeholder="Blanco" value={form.color} {...fp} />
                    </div>

                    <div className="modal-fields-row">
                        <ModalSelect name="tipoVehiculo" label="TIPO" options={TIPO_VEHICULO_OPTS} value={form.tipoVehiculo} {...fp} />
                        <ModalField name="empresa" label="EMPRESA" placeholder="Empresa S.A." value={form.empresa} {...fp} />
                    </div>

                    <ModalField name="conductor" label="CONDUCTOR" placeholder="Nombre completo" value={form.conductor} {...fp} />
                    <ModalField name="cedula" label="CÉDULA" placeholder="Nro. de cédula" value={form.cedula} {...fp} />
                    <ModalField name="destino" label="DESTINO" placeholder="Área o lugar" value={form.destino} {...fp} />
                    <ModalField name="actividad" label="ACTIVIDAD / OBSERVACIÓN" placeholder="Descripción..." value={form.actividad} {...fp} />
                </div>

                {error && <p className="modal-error">{error}</p>}

                <button className={`modal-btn ${form.placa ? 'active' : ''}`} onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Guardando...' : editData ? 'Guardar cambios' : 'Registrar movimiento'}
                </button>
            </div>
        </div>
    );
};

// ── Modal detalle ─────────────────────────────────────────
const ModalDetalle = ({ mov, onClose, onEdit, onDelete, onCopy, onShare }) => {
    const campos = [
        ['Marca', mov.marca], ['Color', mov.color], ['Tipo vehículo', mov.tipoVehiculo],
        ['Empresa', mov.empresa], ['Conductor', mov.conductor], ['Cédula', mov.cedula],
        ['Destino', mov.destino], ['Actividad', mov.actividad],
    ].filter(([, v]) => v);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className={`detalle-badge ${mov.tipo}`}>
                        {mov.tipo === 'ingreso' ? 'INGRESO' : 'SALIDA'}
                    </span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div>
                    <div className="detalle-placa">{mov.placa}</div>
                    <div className="detalle-hora">{mov.hora} · {mov.fecha}</div>
                </div>

                {campos.length > 0 && (
                    <div className="detalle-fields">
                        {campos.map(([label, value]) => (
                            <div key={label} className="detalle-field">
                                <span className="detalle-label">{label}</span>
                                <span className="detalle-value">{value}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="detalle-actions">
                    <button className="detalle-act-btn" onClick={() => { onEdit(mov); onClose(); }}>
                        <IconPencil /> Editar
                    </button>
                    <button className="detalle-act-btn" onClick={() => onCopy(mov)}>
                        <IconCopy /> Copiar
                    </button>
                    <button className="detalle-act-btn" onClick={() => onShare(mov)}>
                        <IconShare /> Compartir
                    </button>
                    <button className="detalle-act-btn danger" onClick={() => { onDelete(mov._id); onClose(); }}>
                        <IconMinus /> Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Tarjeta de movimiento ─────────────────────────────────
const MovCard = ({ m, selectMode, selected, onToggleSelect, onOpenDetail, onDelete, onEdit, onCopy, onShare }) => (
    <div
        className={`mov-item ${selected ? 'mov-selected' : ''}`}
        onClick={() => selectMode ? onToggleSelect(m._id) : onOpenDetail(m)}
    >
        {selectMode && (
            <input type="checkbox" className="mov-check"
                checked={selected}
                onChange={() => onToggleSelect(m._id)}
                onClick={e => e.stopPropagation()} />
        )}
        <div className={`mov-icon ${m.tipo}`}>
            <TruckIcon color={m.tipo === 'ingreso' ? '#818cf8' : '#f87171'} />
            <span className="mov-hora-small">{m.hora}</span>
        </div>
        <div className="mov-info">
            <span className={`mov-tipo ${m.tipo}`}>
                {m.tipo === 'ingreso' ? 'Ingreso' : 'Salida'} · {m.placa}
            </span>
            <span className="mov-detalle">
                {m.conductor || '—'}{m.empresa ? ' · ' + m.empresa : ''}
            </span>
        </div>
        {!selectMode && (
            <div className="mov-actions" onClick={e => e.stopPropagation()}>
                <button className="mov-act-btn danger" title="Eliminar" onClick={() => onDelete(m._id)}>
                    <IconMinus />
                </button>
                <button className="mov-act-btn" title="Editar" onClick={() => onEdit(m)}>
                    <IconPencil />
                </button>
                <button className="mov-act-btn" title="Copiar" onClick={() => onCopy(m)}>
                    <IconCopy />
                </button>
                <button className="mov-act-btn" title="Compartir" onClick={() => onShare(m)}>
                    <IconShare />
                </button>
            </div>
        )}
    </div>
);

// ── Pantallas de tabs ─────────────────────────────────────
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
                        <span className="mov-detalle">{m.conductor || '—'}{m.empresa ? ' · ' + m.empresa : ''}</span>
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
                    <span style={{ color: bloque.color, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>TURNO ACTIVO</span>
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

    const [stats, setStats] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState(null);

    // Modales
    const [showModal, setShowModal] = useState(false);
    const [detailMov, setDetailMov] = useState(null);
    const [editMov, setEditMov] = useState(null);

    // Selección
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => {
        const fetchTurno = async () => {
            try {
                const { data } = await api.get('/turnos/activo');
                if (data.turno) setTurnoActivo(data.turno);
            } catch { }
        };
        fetchTurno();
    }, []);

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

    // Handlers selección
    const toggleSelectMode = () => {
        setSelectMode(s => !s);
        setSelectedIds(new Set());
    };

    const toggleSelect = id => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(selectedIds.size === movimientos.length
            ? new Set()
            : new Set(movimientos.map(m => m._id))
        );
    };

    // Handlers CRUD
    const handleDelete = async id => {
        try {
            await api.delete(`/movimientos/${id}`);
            cargarDatos();
        } catch { }
    };

    const handleBatchDelete = async () => {
        if (!selectedIds.size) return;
        try {
            await api.delete('/movimientos/batch', { data: { ids: [...selectedIds] } });
            setSelectedIds(new Set());
            setSelectMode(false);
            cargarDatos();
        } catch { }
    };

    const handleCopy = m => {
        navigator.clipboard?.writeText(movToText(m));
    };

    const handleShare = async m => {
        const text = movToText(m);
        if (navigator.share) {
            await navigator.share({ title: 'Movimiento FLUJO', text }).catch(() => { });
        } else {
            handleCopy(m);
        }
    };

    const handleEdit = m => setEditMov(m);

    const cardProps = {
        selectMode,
        onToggleSelect: toggleSelect,
        onOpenDetail: setDetailMov,
        onDelete: handleDelete,
        onEdit: handleEdit,
        onCopy: handleCopy,
        onShare: handleShare,
    };

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

            <div className="ws-body">
                {tabActiva === 'inicio' && (
                    <>
                        {/* Dashboard */}
                        <div className="ws-section">
                            <button className="ws-section-header" onClick={() => setDashCollapsed(p => !p)}>
                                <span>DASHBOARD</span>
                                <span className={`ws-chevron ${dashCollapsed ? 'collapsed' : ''}`}>∧</span>
                            </button>

                            {!dashCollapsed && (
                                <div className="ws-section-content">
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
                                                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} labelStyle={{ color: '#aaa' }} />
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

                        {/* Movimientos */}
                        <div className="ws-section">
                            <button className="ws-section-header" onClick={() => setMovCollapsed(p => !p)}>
                                <span>MOVIMIENTOS</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {!movCollapsed && movimientos.length > 0 && (
                                        <span className="select-toggle-btn"
                                            onClick={e => { e.stopPropagation(); toggleSelectMode(); }}>
                                            {selectMode ? 'Cancelar' : 'Selec.'}
                                        </span>
                                    )}
                                    <span className={`ws-chevron ${movCollapsed ? 'collapsed' : ''}`}>∧</span>
                                </div>
                            </button>

                            {!movCollapsed && (
                                <>
                                    {selectMode && (
                                        <div className="select-bar">
                                            <label className="select-bar-label" onClick={selectAll}>
                                                <input type="checkbox"
                                                    checked={selectedIds.size === movimientos.length && movimientos.length > 0}
                                                    onChange={selectAll}
                                                    style={{ accentColor: '#818cf8' }}
                                                    onClick={e => e.stopPropagation()} />
                                                {selectedIds.size === movimientos.length ? 'Ninguno' : 'Todos'} ({selectedIds.size}/{movimientos.length})
                                            </label>
                                            {selectedIds.size > 0 && (
                                                <button className="delete-selected-btn" onClick={handleBatchDelete}>
                                                    Eliminar {selectedIds.size}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="ws-section-content">
                                        {movimientos.length === 0
                                            ? <p className="ws-empty">Sin movimientos registrados hoy</p>
                                            : movimientos.map(m => (
                                                <MovCard key={m._id} m={m}
                                                    selected={selectedIds.has(m._id)}
                                                    {...cardProps} />
                                            ))
                                        }
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                {tabActiva === 'vehiculos' && <PantallaVehiculos movimientos={movimientos} />}

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

            {/* FAB */}
            {tabActiva === 'inicio' && !selectMode && (
                <button className="ws-fab" onClick={() => setShowModal(true)}>+</button>
            )}

            {/* Modal nuevo movimiento */}
            {showModal && turnoActivo && (
                <ModalAgregar
                    puesto={turnoActivo.puesto}
                    bloque={turnoActivo.bloque}
                    onClose={() => setShowModal(false)}
                    onGuardado={cargarDatos}
                    movimientos={movimientos}
                />
            )}

            {/* Modal editar */}
            {editMov && turnoActivo && (
                <ModalAgregar
                    puesto={turnoActivo.puesto}
                    bloque={turnoActivo.bloque}
                    onClose={() => setEditMov(null)}
                    onGuardado={cargarDatos}
                    movimientos={movimientos}
                    editData={editMov}
                />
            )}

            {/* Modal detalle */}
            {detailMov && (
                <ModalDetalle
                    mov={detailMov}
                    onClose={() => setDetailMov(null)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                    onShare={handleShare}
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
                    <button key={tab.id}
                        className={`ws-nav-btn ${tabActiva === tab.id ? 'active' : ''}`}
                        onClick={() => setTabActiva(tab.id)}>
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
