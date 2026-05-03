import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

const IconPhone = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.61 21 3 14.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.02l-2.2 2.2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconPerson = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const IconBriefcase = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 12v4M10 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const IconBolt = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconArrowLeft = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconUserCircle = ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="7" r="4" stroke={active ? '#818cf8' : '#fff'} strokeWidth="2" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? '#818cf8' : '#fff'} strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const IconClock = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// ── Helpers ───────────────────────────────────────────────
const EMPTY_FORM = { tipo: 'ingreso', placa: '', marca: '', color: '', tipoVehiculo: '', empresa: '', conductor: '', cedula: '', destino: '', actividad: '' };
const TIPO_VEHICULO_OPTS = ['Sedán', 'SUV', 'Camioneta', 'Camión', 'Bus', 'Moto', 'Otro'];

const formatMov = m => [m.marca, m.color, m.conductor].filter(Boolean).join(' · ') || 'Sin datos';
const movToText = m =>
    `Placa: ${m.placa}\nTipo: ${m.tipo}\nConductor: ${m.conductor || '—'}\nEmpresa: ${m.empresa || '—'}\nDestino: ${m.destino || '—'}\nHora: ${m.hora} — ${m.fecha}`;

// Tabs que vienen del cajón (tienen botón de regreso)
const DRAWER_TABS = new Set(['avance', 'placas-db', 'extensiones', 'personas', 'jefes']);
const DRAWER_TITLES = { avance: 'AVANCE DEL DÍA', 'placas-db': 'PLACAS', extensiones: 'EXTENSIONES', personas: 'PERSONAS', jefes: 'JEFES' };

// ── Campos del formulario ────────────────────────────────
const ModalField = ({ name, label, placeholder, required, value, onChange, autoFilled }) => (
    <div className={`modal-field ${autoFilled && value ? 'modal-field-autofilled' : ''}`}>
        <label>{label}{required && <span style={{ color: '#f87171' }}> *</span>}</label>
        <input type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} />
    </div>
);

const ModalCombo = ({ name, label, options, placeholder, value, onChange, autoFilled }) => (
    <div className={`modal-field ${autoFilled && value ? 'modal-field-autofilled' : ''}`}>
        <label>{label}</label>
        <input type="text" name={name} list={`combo-${name}`} placeholder={placeholder || ''} value={value} onChange={onChange} />
        <datalist id={`combo-${name}`}>
            {options.map(o => <option key={o} value={o} />)}
        </datalist>
    </div>
);

// ── Menú cajón ────────────────────────────────────────────
const DRAWER_ITEMS = [
    { label: 'Avance del día', tab: 'avance', icon: <IconClock /> },
    { label: 'Placas Vehículos', tab: 'placas-db', icon: <TruckIcon color="currentColor" /> },
    { label: 'Extensiones', tab: 'extensiones', icon: <IconPhone /> },
    { label: 'Personas', tab: 'personas', icon: <IconPerson /> },
    { label: 'Jefes Inmediatos', tab: 'jefes', icon: <IconBriefcase /> },
];

const DrawerMenu = ({ onClose, onNavigate, onNuevoFlujo }) => (
    <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
                <span className="drawer-brand">FLUJO</span>
                <button className="drawer-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="drawer-nav">
                {DRAWER_ITEMS.map(item => (
                    <button key={item.tab} className="drawer-item" onClick={() => { onNavigate(item.tab); onClose(); }}>
                        <span className="drawer-item-icon">{item.icon}</span>
                        <span className="drawer-item-label">{item.label}</span>
                        <IconChevronRight />
                    </button>
                ))}
                <div className="drawer-divider" />
                <button className="drawer-item drawer-item-flujo" onClick={() => { onNuevoFlujo(); onClose(); }}>
                    <span className="drawer-item-icon"><IconBolt /></span>
                    <span className="drawer-item-label">Crear nuevo flujo</span>
                </button>
            </div>
        </div>
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
            .slice(0, 4).map(m => ({ ...m, _source: 'hoy' }));

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
                        <ModalCombo name="tipoVehiculo" label="TIPO" options={TIPO_VEHICULO_OPTS} placeholder="SUV, Sedán..." value={form.tipoVehiculo} {...fp} />
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
                    <span className={`detalle-badge ${mov.tipo}`}>{mov.tipo === 'ingreso' ? 'INGRESO' : 'SALIDA'}</span>
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
                    <button className="detalle-act-btn" onClick={() => { onEdit(mov); onClose(); }}><IconPencil /> Editar</button>
                    <button className="detalle-act-btn" onClick={() => onCopy(mov)}><IconCopy /> Copiar</button>
                    <button className="detalle-act-btn" onClick={() => onShare(mov)}><IconShare /> Compartir</button>
                    <button className="detalle-act-btn danger" onClick={() => { onDelete(mov._id); onClose(); }}><IconMinus /> Eliminar</button>
                </div>
            </div>
        </div>
    );
};

// ── Tarjeta de movimiento ─────────────────────────────────
const MovCard = ({ m, selectMode, selected, onToggleSelect, onOpenDetail, onDelete, onEdit, onCopy, onShare }) => (
    <div className={`mov-item ${selected ? 'mov-selected' : ''}`}
        onClick={() => selectMode ? onToggleSelect(m._id) : onOpenDetail(m)}>
        {selectMode && (
            <input type="checkbox" className="mov-check" checked={selected}
                onChange={() => onToggleSelect(m._id)} onClick={e => e.stopPropagation()} />
        )}
        <div className={`mov-icon ${m.tipo}`}>
            <TruckIcon color={m.tipo === 'ingreso' ? '#818cf8' : '#f87171'} />
            <span className="mov-hora-small">{m.hora}</span>
        </div>
        <div className="mov-info">
            <span className={`mov-tipo ${m.tipo}`}>{m.tipo === 'ingreso' ? 'Ingreso' : 'Salida'} · {m.placa}</span>
            <span className="mov-detalle">{m.conductor || '—'}{m.cedula ? ' · ' + m.cedula : ''}</span>
            {(m.empresa || m.destino) && (
                <span className="mov-detalle" style={{ fontSize: 11 }}>
                    {[m.empresa, m.destino].filter(Boolean).join(' · ')}
                </span>
            )}
        </div>
        {!selectMode && (
            <div className="mov-actions" onClick={e => e.stopPropagation()}>
                <button className="mov-act-btn danger" title="Eliminar" onClick={() => onDelete(m._id)}><IconMinus /></button>
                <button className="mov-act-btn" title="Editar" onClick={() => onEdit(m)}><IconPencil /></button>
                <button className="mov-act-btn" title="Copiar" onClick={() => onCopy(m)}><IconCopy /></button>
                <button className="mov-act-btn" title="Compartir" onClick={() => onShare(m)}><IconShare /></button>
            </div>
        )}
    </div>
);

// ── Avance del día (timer + progreso del turno) ───────────
const PantallaAvance = ({ turnoActivo, user }) => {
    const [transcurrido, setTranscurrido] = useState(0);
    const [horaActual, setHoraActual] = useState(new Date());

    const bloque = turnoActivo ? BLOQUES_DATA[turnoActivo.bloque] : null;
    const esDiurno = turnoActivo?.turnoActual === 'diurno';
    const horaInicio = esDiurno ? 6 : 18;
    const duracion = 12 * 60 * 60;

    useEffect(() => {
        const calcular = () => {
            const ahora = new Date();
            setHoraActual(ahora);
            const inicio = new Date();
            inicio.setHours(horaInicio, 0, 0, 0);
            setTranscurrido(Math.max(0, Math.floor((ahora - inicio) / 1000)));
        };
        calcular();
        const id = setInterval(calcular, 1000);
        return () => clearInterval(id);
    }, [horaInicio]);

    if (!turnoActivo || !bloque) {
        return <p className="ws-empty" style={{ padding: 32 }}>Sin turno activo</p>;
    }

    const progreso = Math.min(100, (transcurrido / duracion) * 100);
    const restante = Math.max(0, duracion - transcurrido);
    const hh = Math.floor(transcurrido / 3600).toString().padStart(2, '0');
    const mm = Math.floor((transcurrido % 3600) / 60).toString().padStart(2, '0');
    const ss = (transcurrido % 60).toString().padStart(2, '0');
    const hrRest = Math.floor(restante / 3600);
    const minRest = Math.floor((restante % 3600) / 60);

    const col = esDiurno
        ? { bg: '#1a1200', border: '#f59e0b', text: '#fcd34d', badge: '#2d1f00', badgeText: '#fbbf24', progress: '#f59e0b', iconBg: '#2d1f00', iconColor: '#fcd34d' }
        : { bg: '#0d0f2e', border: '#818cf8', text: '#c7d2fe', badge: '#1e1b4b', badgeText: '#a5b4fc', progress: '#818cf8', iconBg: '#1e1b4b', iconColor: '#c7d2fe' };

    const iniciales = `${user?.name?.split(' ')[0]?.[0] || ''}${user?.name?.split(' ')[1]?.[0] || ''}`.toUpperCase();
    const fecha = horaActual.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Card turno activo */}
            <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: col.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {esDiurno ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="4" stroke={col.iconColor} strokeWidth="2" />
                                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke={col.iconColor} strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={col.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <span style={{ fontSize: 10, fontWeight: 700, background: col.badge, color: col.badgeText, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.5 }}>
                                Turno {esDiurno ? 'diurno' : 'nocturno'} activo
                            </span>
                            <div style={{ fontSize: 34, fontWeight: 800, color: col.text, fontVariantNumeric: 'tabular-nums', letterSpacing: 2, marginTop: 4 }}>
                                {hh}:{mm}:{ss}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: col.text, lineHeight: 1.7 }}>
                        <div>{fecha}</div>
                        <div style={{ fontWeight: 700 }}>{esDiurno ? '06:00 – 18:00' : '18:00 – 06:00'}</div>
                    </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${progreso}%`, background: col.progress, borderRadius: 10, transition: 'width 1s linear' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: col.text }}>
                    <span>{esDiurno ? '06:00' : '18:00'}</span>
                    <span style={{ fontWeight: 600 }}>{hrRest}h {minRest}min restantes</span>
                    <span>{esDiurno ? '18:00' : '06:00'}</span>
                </div>
            </div>

            {/* Card guardia */}
            <div style={{ background: '#161616', borderRadius: 16, padding: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: 1.5, marginBottom: 14 }}>DATOS DEL GUARDIA</p>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#e0f2f1', color: '#0f766e', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {iniciales}
                    </div>
                    <div>
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{user?.name}</p>
                        <p style={{ fontSize: 12, color: '#888' }}>{user?.email}</p>
                    </div>
                </div>
                <div style={{ borderTop: '1px solid #222', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                        ['Puesto', turnoActivo.puesto],
                        ['Bloque', `${bloque.nombre} ${bloque.codigo}`],
                        ['Turno', esDiurno ? 'Diurno  06:00 – 18:00' : 'Nocturno  18:00 – 06:00'],
                    ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                            <span style={{ fontSize: 13, color: '#ddd', fontWeight: 500 }}>{val}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── Modal formulario vehículo ─────────────────────────────
const EMPTY_VEHICULO = { placa: '', marca: '', color: '', tipoVehiculo: '', empresa: '', conductor: '', cedula: '' };

const ModalVehiculo = ({ onClose, onGuardado, editData }) => {
    const [form, setForm] = useState(editData
        ? { placa: editData.placa, marca: editData.marca || '', color: editData.color || '', tipoVehiculo: editData.tipoVehiculo || '', empresa: editData.empresa || '', conductor: editData.conductor || '', cedula: editData.cedula || '' }
        : EMPTY_VEHICULO
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = e => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: name === 'placa' ? value.toUpperCase() : value }));
        setError('');
    };

    const handleSubmit = async () => {
        if (!form.placa) { setError('La placa es obligatoria'); return; }
        setLoading(true);
        try {
            if (editData?._id) {
                await api.put(`/vehiculos/${editData._id}`, form);
            } else {
                await api.post('/vehiculos', form);
            }
            onGuardado();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const fp = { onChange: handleChange, autoFilled: false };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{editData ? 'Editar vehículo' : 'Nuevo vehículo'}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-fields">
                    <ModalField name="placa" label="PLACA *" placeholder="Ej: ABC-1234" value={form.placa} {...fp} />
                    <div className="modal-fields-row">
                        <ModalField name="marca" label="MARCA" placeholder="Toyota" value={form.marca} {...fp} />
                        <ModalField name="color" label="COLOR" placeholder="Blanco" value={form.color} {...fp} />
                    </div>
                    <div className="modal-fields-row">
                        <ModalCombo name="tipoVehiculo" label="TIPO" options={TIPO_VEHICULO_OPTS} placeholder="SUV..." value={form.tipoVehiculo} {...fp} />
                        <ModalField name="empresa" label="EMPRESA" placeholder="Empresa S.A." value={form.empresa} {...fp} />
                    </div>
                    <ModalField name="conductor" label="CONDUCTOR" placeholder="Nombre completo" value={form.conductor} {...fp} />
                    <ModalField name="cedula" label="CÉDULA" placeholder="Nro. de cédula" value={form.cedula} {...fp} />
                </div>
                {error && <p className="modal-error">{error}</p>}
                <button className={`modal-btn ${form.placa ? 'active' : ''}`} onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Guardando...' : editData ? 'Guardar cambios' : 'Registrar vehículo'}
                </button>
            </div>
        </div>
    );
};

// ── Modal QR ──────────────────────────────────────────────
const ModalQR = ({ vehiculo, onClose }) => {
    const data = [
        `PLACA: ${vehiculo.placa}`,
        vehiculo.marca ? `MARCA: ${vehiculo.marca}` : '',
        vehiculo.color ? `COLOR: ${vehiculo.color}` : '',
        vehiculo.tipoVehiculo ? `TIPO: ${vehiculo.tipoVehiculo}` : '',
        vehiculo.empresa ? `EMPRESA: ${vehiculo.empresa}` : '',
        vehiculo.conductor ? `CONDUCTOR: ${vehiculo.conductor}` : '',
    ].filter(Boolean).join('\n');

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ alignItems: 'center', gap: 20 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ width: '100%' }}>
                    <h3>{vehiculo.placa}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, borderRadius: 8, background: '#fff', padding: 8 }} />
                <p style={{ fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 1.8 }}>
                    {data.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
                </p>
            </div>
        </div>
    );
};

// ── Pantalla Placas DB ────────────────────────────────────
const PantallaPlacasDB = () => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editVehiculo, setEditVehiculo] = useState(null);
    const [qrVehiculo, setQrVehiculo] = useState(null);

    const cargar = () => {
        api.get('/vehiculos')
            .then(res => { setVehiculos(res.data.vehiculos); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, []);

    const sq = search.toLowerCase();
    const filtrados = sq
        ? vehiculos.filter(v =>
            v.placa.toLowerCase().includes(sq) ||
            (v.empresa || '').toLowerCase().includes(sq))
        : vehiculos;

    const handleDelete = async id => {
        try { await api.delete(`/vehiculos/${id}`); cargar(); } catch { }
    };

    const qrData = v => [
        `PLACA: ${v.placa}`,
        v.marca ? `MARCA: ${v.marca}` : '',
        v.color ? `COLOR: ${v.color}` : '',
        v.tipoVehiculo ? `TIPO: ${v.tipoVehiculo}` : '',
        v.empresa ? `EMPRESA: ${v.empresa}` : '',
    ].filter(Boolean).join('\n');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>

            {/* Barra búsqueda */}
            <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="ws-search-bar" style={{ padding: 0, flex: 1, margin: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#555', flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws-search-input" type="text"
                        placeholder="Filtrar por placa o empresa..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="ws-search-clear" onClick={() => setSearch('')}>✕</button>}
                </div>
                <span style={{ color: '#555', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {filtrados.length} reg.
                </span>
            </div>

            {/* Tabla */}
            {loading
                ? <p className="ws-empty">Cargando...</p>
                : filtrados.length === 0
                    ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'No hay vehículos registrados'}</p>
                    : (
                        <div className="placas-scroll">
                            <table className="placas-table">
                                <thead>
                                    <tr>
                                        <th>PLACA</th>
                                        <th>MARCA</th>
                                        <th>COLOR</th>
                                        <th>TIPO</th>
                                        <th>EMPRESA</th>
                                        <th>QR</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map(v => (
                                        <tr key={v._id}>
                                            <td className="placas-td-placa">{v.placa}</td>
                                            <td>{(v.marca || '—').toUpperCase()}</td>
                                            <td>{(v.color || '—').toUpperCase()}</td>
                                            <td>{(v.tipoVehiculo || '—').toUpperCase()}</td>
                                            <td>{(v.empresa || '—').toUpperCase()}</td>
                                            <td>
                                                <img
                                                    className="placas-qr"
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(qrData(v))}`}
                                                    alt="QR"
                                                    onClick={() => setQrVehiculo(v)}
                                                />
                                            </td>
                                            <td>
                                                <div className="placas-actions">
                                                    <button className="mov-act-btn" title="Editar" onClick={() => setEditVehiculo(v)}>
                                                        <IconPencil />
                                                    </button>
                                                    <button className="mov-act-btn danger" title="Eliminar" onClick={() => handleDelete(v._id)}>
                                                        <IconMinus />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
            }

            {/* FAB agregar */}
            <button className="placas-fab" onClick={() => setShowForm(true)}>+</button>

            {(showForm || editVehiculo) && (
                <ModalVehiculo
                    onClose={() => { setShowForm(false); setEditVehiculo(null); }}
                    onGuardado={cargar}
                    editData={editVehiculo}
                />
            )}
            {qrVehiculo && <ModalQR vehiculo={qrVehiculo} onClose={() => setQrVehiculo(null)} />}
        </div>
    );
};

// ── Export helper (módulo-level para reutilizar) ──────────
const exportMovimientos = (movimientos, format, filename) => {
    const cols = ['Hora', 'Tipo', 'Placa', 'Marca', 'Color', 'Tipo Vehículo', 'Empresa', 'Conductor', 'Cédula', 'Destino', 'Actividad', 'Fecha', 'Puesto'];
    const rows = movimientos.map(m => [
        m.hora, m.tipo, m.placa, m.marca, m.color, m.tipoVehiculo, m.empresa,
        m.conductor, m.cedula, m.destino, m.actividad, m.fecha, m.puesto,
    ]);
    if (format === 'csv') {
        const content = [cols, ...rows].map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
        const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `${filename}.csv` }).click();
        URL.revokeObjectURL(url);
    } else {
        const esc = v => (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = `<html><head><meta charset="UTF-8"></head><body><table>
<tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>
${rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('\n')}
</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `${filename}.xls` }).click();
        URL.revokeObjectURL(url);
    }
};

// ── Pantalla detalle de un flujo ──────────────────────────
const PantallaFlujoDetalle = ({ fecha, movs, onBack }) => {
    const [search, setSearch] = useState('');
    const [showExport, setShowExport] = useState(false);

    const sq = search.toLowerCase();
    const filtrados = sq
        ? movs.filter(m => m.placa.toLowerCase().includes(sq) || (m.conductor || '').toLowerCase().includes(sq))
        : movs;

    const isPetro = m => m.empresa?.toLowerCase().includes('petroecuador');
    const ingresos = movs.filter(m => m.tipo === 'ingreso');
    const petroecuador = ingresos.filter(isPetro).length;
    const contratistas = ingresos.filter(m => !isPetro(m)).length;

    const fechaLarga = new Date(fecha + 'T12:00:00').toLocaleDateString('es-EC', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const doExport = fmt => {
        setShowExport(false);
        exportMovimientos(movs, fmt, `flujo_${fecha}`);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 8px' }}>
                <button className="ws-topbar-btn" style={{ flexShrink: 0 }} onClick={onBack}>
                    <IconArrowLeft />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#aaa', textTransform: 'capitalize' }}>{fechaLarga}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{movs.length} movimiento{movs.length !== 1 ? 's' : ''}</div>
                </div>
                <button className="ws-topbar-btn" style={{ color: '#4ade80' }} onClick={() => setShowExport(s => !s)} title="Exportar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Menú exportar */}
            {showExport && (
                <div style={{ margin: '0 16px 8px', background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="export-menu-item" onClick={() => doExport('xls')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#4ade80" strokeWidth="2" /><path d="M9 3v18M3 9h6M3 15h6" stroke="#4ade80" strokeWidth="2" /><path d="M12 8l3 4-3 4M15 12h6" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        Excel (.xls)
                    </div>
                    <div className="export-menu-item" onClick={() => doExport('csv')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#818cf8" strokeWidth="2" /><path d="M14 2v6h6M8 13h8M8 17h5" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" /></svg>
                        CSV (.csv)
                    </div>
                </div>
            )}

            {/* Contadores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 12px' }}>
                <div className="ws-counter-card">
                    <span className="ws-counter-val">{contratistas}</span>
                    <span className="ws-counter-label">CONTRATISTAS</span>
                </div>
                <div className="ws-counter-card">
                    <span className="ws-counter-val">{petroecuador}</span>
                    <span className="ws-counter-label">EP PETRO.</span>
                </div>
            </div>

            {/* Búsqueda */}
            <div className="ws-search-bar" style={{ padding: '0 16px 12px', background: 'transparent' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#555', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input className="ws-search-input" type="text" placeholder="Buscar por placa o conductor..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button className="ws-search-clear" onClick={() => setSearch('')}>✕</button>}
            </div>

            {/* Lista de movimientos (solo lectura) */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtrados.length === 0
                    ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'Sin movimientos'}</p>
                    : filtrados.map(m => (
                        <div key={m._id} className="mov-item" style={{ cursor: 'default' }}>
                            <div className={`mov-icon ${m.tipo}`}>
                                <TruckIcon color={m.tipo === 'ingreso' ? '#818cf8' : '#f87171'} />
                                <span className="mov-hora-small">{m.hora}</span>
                            </div>
                            <div className="mov-info">
                                <span className={`mov-tipo ${m.tipo}`}>{m.tipo === 'ingreso' ? 'Ingreso' : 'Salida'} · {m.placa}</span>
                                <span className="mov-detalle">{m.conductor || '—'}{m.cedula ? ' · ' + m.cedula : ''}</span>
                                {(m.empresa || m.destino) && (
                                    <span className="mov-detalle" style={{ fontSize: 11 }}>
                                        {[m.empresa, m.destino].filter(Boolean).join(' · ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

// ── Pantalla lista de flujos ───────────────────────────────
const PantallaFlujos = ({ turnoActivo }) => {
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [flujoSeleccionado, setFlujoSeleccionado] = useState(null);

    useEffect(() => {
        if (!turnoActivo) { setLoading(false); return; }
        api.get(`/movimientos/todos?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}`)
            .then(res => { setMovimientos(res.data.movimientos); setLoading(false); })
            .catch(() => setLoading(false));
    }, [turnoActivo]);

    const flujos = useMemo(() => {
        const groups = {};
        movimientos.forEach(m => {
            if (!groups[m.fecha]) groups[m.fecha] = [];
            groups[m.fecha].push(m);
        });
        return Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([fecha, movs]) => ({ fecha, movs }));
    }, [movimientos]);

    if (!turnoActivo) {
        return <p className="ws-empty" style={{ padding: 32 }}>Sin turno activo</p>;
    }

    if (flujoSeleccionado) {
        const flujo = flujos.find(f => f.fecha === flujoSeleccionado);
        return (
            <PantallaFlujoDetalle
                fecha={flujoSeleccionado}
                movs={flujo?.movs || []}
                onBack={() => setFlujoSeleccionado(null)}
            />
        );
    }

    if (loading) return <p className="ws-empty" style={{ padding: 32 }}>Cargando...</p>;
    if (flujos.length === 0) return <p className="ws-empty" style={{ padding: 32 }}>No hay flujos registrados aún</p>;

    return (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {flujos.map(f => {
                const fechaLarga = new Date(f.fecha + 'T12:00:00').toLocaleDateString('es-EC', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                });
                const ingresos = f.movs.filter(m => m.tipo === 'ingreso').length;
                const salidas = f.movs.filter(m => m.tipo === 'salida').length;
                const isPetro = m => m.empresa?.toLowerCase().includes('petroecuador');
                const petro = f.movs.filter(m => m.tipo === 'ingreso' && isPetro(m)).length;
                return (
                    <div key={f.fecha} className="flujo-card" onClick={() => setFlujoSeleccionado(f.fecha)}>
                        <div style={{ flex: 1 }}>
                            <div className="flujo-fecha">{fechaLarga}</div>
                            <div className="flujo-stats">
                                <span style={{ color: '#818cf8' }}>{ingresos} ing.</span>
                                <span style={{ color: '#555' }}> · </span>
                                <span style={{ color: '#f87171' }}>{salidas} sal.</span>
                                {petro > 0 && <><span style={{ color: '#555' }}> · </span><span style={{ color: '#4ade80' }}>{petro} EP</span></>}
                            </div>
                        </div>
                        <IconChevronRight />
                    </div>
                );
            })}
        </div>
    );
};

// ── Pantalla stub ─────────────────────────────────────────
const PantallaStub = ({ title }) => (
    <div className="ws-section-content" style={{ padding: 16 }}>
        <h3 className="ws-sub-title">{title}</h3>
        <p className="ws-empty">Próximamente</p>
    </div>
);

// ── Perfil ────────────────────────────────────────────────
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
    const navigate = useNavigate();

    const [tabActiva, setTabActiva] = useState('inicio');
    const [dashCollapsed, setDashCollapsed] = useState(false);
    const [movCollapsed, setMovCollapsed] = useState(false);

    const [stats, setStats] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [detailMov, setDetailMov] = useState(null);
    const [editMov, setEditMov] = useState(null);

    const [showDrawer, setShowDrawer] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const sq = searchQuery.toLowerCase();
    const movsFiltrados = sq
        ? movimientos.filter(m =>
            m.placa.toLowerCase().includes(sq) ||
            (m.conductor || '').toLowerCase().includes(sq))
        : movimientos;

    useEffect(() => {
        api.get('/turnos/activo')
            .then(({ data }) => { if (data.turno) setTurnoActivo(data.turno); })
            .catch(() => { });
    }, []);

    const cargarDatos = async () => {
        if (!turnoActivo) return;
        try {
            const [sRes, mRes] = await Promise.all([
                api.get(`/movimientos/stats?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}`),
                api.get(`/movimientos?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}`),
            ]);
            setStats(sRes.data);
            setMovimientos(mRes.data.movimientos);
        } catch { }
    };

    useEffect(() => { cargarDatos(); }, [turnoActivo]);

    const handleTabChange = tab => {
        setTabActiva(tab);
        setShowSearch(false);
        setSearchQuery('');
    };

    const toggleSelectMode = () => { setSelectMode(s => !s); setSelectedIds(new Set()); };

    const toggleSelect = id => setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const selectAll = () => setSelectedIds(
        selectedIds.size === movimientos.length ? new Set() : new Set(movimientos.map(m => m._id))
    );

    const handleDelete = async id => {
        try { await api.delete(`/movimientos/${id}`); cargarDatos(); } catch { }
    };

    const handleBatchDelete = async () => {
        if (!selectedIds.size) return;
        try {
            await api.delete('/movimientos/batch', { data: { ids: [...selectedIds] } });
            setSelectedIds(new Set()); setSelectMode(false); cargarDatos();
        } catch { }
    };

    const handleCopy = m => navigator.clipboard?.writeText(movToText(m));

    const handleShare = async m => {
        if (navigator.share) {
            await navigator.share({ title: 'Movimiento FLUJO', text: movToText(m) }).catch(() => { });
        } else handleCopy(m);
    };

    const handleEdit = m => setEditMov(m);

    const exportData = format => {
        setShowExportMenu(false);
        const fecha = new Date().toISOString().split('T')[0];
        exportMovimientos(movimientos, format, `movimientos_${fecha}`);
    };

    const cardProps = { selectMode, onToggleSelect: toggleSelect, onOpenDetail: setDetailMov, onDelete: handleDelete, onEdit: handleEdit, onCopy: handleCopy, onShare: handleShare };

    const isDrawerTab = DRAWER_TABS.has(tabActiva);

    return (
        <div className="ws-wrapper">

            {showDrawer && (
                <DrawerMenu
                    onClose={() => setShowDrawer(false)}
                    onNavigate={handleTabChange}
                    onNuevoFlujo={() => {
                        if (turnoActivo) {
                            navigate('/turno', {
                                state: {
                                    bloqueId: turnoActivo.bloque,
                                    puesto: turnoActivo.puesto,
                                    bloqueIndex: 0,
                                    totalBloques: 1,
                                    bloquesConPuestos: [{ bloqueId: turnoActivo.bloque, puesto: turnoActivo.puesto }],
                                },
                            });
                        } else {
                            navigate('/onboarding');
                        }
                    }}
                />
            )}

            {/* Top bar */}
            <div className="ws-topbar">
                <button className="ws-topbar-btn"
                    onClick={isDrawerTab ? () => handleTabChange('inicio') : () => setShowDrawer(true)}>
                    {isDrawerTab ? <IconArrowLeft /> : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M3 12h18M3 18h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    )}
                </button>
                <span className="ws-topbar-title">
                    {isDrawerTab ? DRAWER_TITLES[tabActiva] : 'FLUJO'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                    {!isDrawerTab && (
                        <button className="ws-topbar-btn" onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke={showSearch ? '#818cf8' : '#fff'} strokeWidth="2" />
                                <path d="M21 21l-4.35-4.35" stroke={showSearch ? '#818cf8' : '#fff'} strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    )}
                    <button className="ws-topbar-btn" onClick={() => handleTabChange('perfil')}>
                        <IconUserCircle active={tabActiva === 'perfil'} />
                    </button>
                </div>
            </div>

            {/* Barra de búsqueda */}
            {showSearch && !isDrawerTab && (
                <div className="ws-search-bar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#555', flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws-search-input" type="text"
                        placeholder="Buscar por placa o conductor..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
                    {searchQuery && (
                        <button className="ws-search-clear" onClick={() => setSearchQuery('')}>✕</button>
                    )}
                </div>
            )}

            <div className="ws-body">
                {tabActiva === 'inicio' && (
                    <div className="ws-desktop-grid">
                        <div className="ws-section">
                            <button className="ws-section-header" onClick={() => setDashCollapsed(p => !p)}>
                                <span>DASHBOARD</span>
                                <span className={`ws-chevron ${dashCollapsed ? 'collapsed' : ''}`}>∧</span>
                            </button>
                            {!dashCollapsed && (
                                <div className="ws-section-content">
                                    <div className="ws-counters">
                                        {[
                                            { valor: stats?.contratistas ?? '–', label: 'CONTRATISTAS' },
                                            { valor: stats?.petroecuador ?? '–', label: 'EP PETRO.' },
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
                                                <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 10 }} interval={5} />
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

                        <div className="ws-section">
                            <button className="ws-section-header" onClick={() => setMovCollapsed(p => !p)}>
                                <span>
                                    MOVIMIENTOS
                                    {searchQuery && (
                                        <span style={{ color: '#818cf8', marginLeft: 6, fontWeight: 700 }}>
                                            · {movsFiltrados.length} resultado{movsFiltrados.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </span>
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
                                                    onChange={selectAll} style={{ accentColor: '#818cf8' }}
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
                                            : movsFiltrados.length === 0
                                                ? <p className="ws-empty">Sin resultados para "{searchQuery}"</p>
                                                : movsFiltrados.map(m => (
                                                    <MovCard key={m._id} m={m}
                                                        selected={selectedIds.has(m._id)}
                                                        {...cardProps} />
                                                ))
                                        }
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {tabActiva === 'avance' && (
                    <PantallaAvance turnoActivo={turnoActivo} user={user} />
                )}

                {tabActiva === 'flujos' && <PantallaFlujos turnoActivo={turnoActivo} />}

                {tabActiva === 'perfil' && (
                    <PantallaPerfil user={user} turnoActivo={turnoActivo} onLogout={logout} />
                )}

                {tabActiva === 'placas-db' && <PantallaPlacasDB />}
                {tabActiva === 'extensiones' && <PantallaStub title="Extensiones" />}
                {tabActiva === 'personas' && <PantallaStub title="Personas" />}
                {tabActiva === 'jefes' && <PantallaStub title="Jefes Inmediatos" />}
            </div>

            {/* FABs — solo en inicio */}
            {tabActiva === 'inicio' && !selectMode && (
                <>
                    {showExportMenu && (
                        <div className="export-menu">
                            <div className="export-menu-item" onClick={() => exportData('xls')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#4ade80" strokeWidth="2"/><path d="M9 3v18M3 9h6M3 15h6" stroke="#4ade80" strokeWidth="2"/><path d="M12 8l3 4-3 4M15 12h6" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                Excel (.xls)
                            </div>
                            <div className="export-menu-item" onClick={() => exportData('csv')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#818cf8" strokeWidth="2"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"/></svg>
                                CSV (.csv)
                            </div>
                        </div>
                    )}
                    <button className="ws-fab-export" onClick={() => setShowExportMenu(s => !s)} title="Exportar movimientos">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <button className="ws-fab" onClick={() => { setShowModal(true); setShowExportMenu(false); }}>+</button>
                </>
            )}

            {/* Modales */}
            {showModal && turnoActivo && (
                <ModalAgregar puesto={turnoActivo.puesto} bloque={turnoActivo.bloque}
                    onClose={() => setShowModal(false)} onGuardado={cargarDatos} movimientos={movimientos} />
            )}
            {editMov && turnoActivo && (
                <ModalAgregar puesto={turnoActivo.puesto} bloque={turnoActivo.bloque}
                    onClose={() => setEditMov(null)} onGuardado={cargarDatos} movimientos={movimientos} editData={editMov} />
            )}
            {detailMov && (
                <ModalDetalle mov={detailMov} onClose={() => setDetailMov(null)}
                    onEdit={handleEdit} onDelete={handleDelete} onCopy={handleCopy} onShare={handleShare} />
            )}

            {/* Bottom nav — solo Inicio, Avance, Flujos */}
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
                    {
                        id: 'flujos', label: 'Flujos', icon: (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6h18M3 12h12M3 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )
                    },
                ].map(tab => (
                    <button key={tab.id}
                        className={`ws-nav-btn ${tabActiva === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}>
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
