import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BLOQUES_DATA } from '../data/bloques.js';
import api from '../api/axios';
import {
    encolarMovimiento,
    marcarSincronizado,
    getPendingMovimientos,
    syncPendingMovimientos,
    encolarEdicion,
    marcarEdicionSincronizada,
    syncPendingEdiciones,
    cacheVehiculo,
    buscarPlacaLocal,
    getVehiculosCache,
    deleteCachedVehiculo,
    cachePersona,
    buscarPersonaLocal,
} from '../lib/syncEngine.js';
import '../styles/WorkspacePage.css';

const StatsChart = lazy(() => import('../components/StatsChart.jsx'));

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

const IconQR = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="5.5" y="5.5" width="3" height="3" fill="currentColor"/>
        <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="15.5" y="5.5" width="3" height="3" fill="currentColor"/>
        <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="5.5" y="15.5" width="3" height="3" fill="currentColor"/>
        <rect x="13" y="13" width="3" height="3" fill="currentColor"/>
        <rect x="18" y="13" width="3" height="3" fill="currentColor"/>
        <rect x="13" y="18" width="3" height="3" fill="currentColor"/>
        <rect x="18" y="18" width="3" height="3" fill="currentColor"/>
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

const IconSun = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const IconMoon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconCalendar = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const IconShield = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
);

// ── Helpers ───────────────────────────────────────────────
const EMPTY_FORM = { tipo: 'salida', placa: '', marca: '', color: '', tipoVehiculo: '', empresa: '', conductor: '', cedula: '', destino: '', actividad: '', genero: 'm' };
const TIPO_VEHICULO_OPTS = ['Sedán', 'SUV', 'Camioneta', 'Camión', 'Cama Baja', 'Cama Alta', 'Bus', 'Volquete', 'Tanquero', 'Grúa', 'Moto', 'Otro'];

// ── Cola offline (Dexie/IndexedDB) ───────────────────────
// Migración one-time: mover items del localStorage viejo a Dexie
const OFFLINE_QUEUE_KEY = 'flujo_offline_queue';
(async () => {
    try {
        const old = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        if (old.length) {
            await Promise.all(old.map(item =>
                encolarMovimiento({ uuid: item.tempId, payload: item.payload, hora: item.hora, fecha: item.fecha })
            ));
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
        }
    } catch { /* ignorar errores de migración */ }
})();
const getHoraLocal = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guayaquil' });
const getFechaLocal = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
// Para turno nocturno (18:00-06:00) que cruza medianoche, usar fecha del día anterior entre 00:00-05:59
const getTurnoFecha = (turnoActual) => {
    const horaActual = parseInt(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', hour12: false, timeZone: 'America/Guayaquil' }));
    if (turnoActual === 'nocturno' && horaActual < 6) {
        const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return ayer.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
    }
    return getFechaLocal();
};

const formatMov = m => [m.marca, m.color, m.conductor].filter(Boolean).join(' · ') || 'Sin datos';
const movToText = m =>
    `Placa: ${m.placa}\nTipo: ${m.tipo}\nConductor: ${m.conductor || '—'}\nCédula: ${m.cedula || '—'}\nEmpresa: ${m.empresa || '—'}\nDestino: ${m.destino || '—'}${m.actividad ? '\nActividad: ' + m.actividad : ''}\nHora: ${m.hora} — ${m.fecha}`;

const LAST_TURNO_KEY = 'flujo_last_turno';

// Ubicación por defecto de cada puesto (usada en narrativas y en el destino de ingresos)
const PUESTO_UBICACION = {
    'Guardia Garita Principal EPF': 'EPF',
    'Guardia Garita Interior EPF': 'EPF',
    'Guardia PAD-E': 'EPF',          // PAD-E: cuando algo ingresa, va hacia EPF
    'Guardia PAD-C': 'PAD-C',
    'Guardia PAD-L': 'PAD-L',
    'Guardia PAD Puerto Edén': 'PAD Edén',
    'Guardia Puerto Nuevo': 'Puerto Nuevo',
    'Guardia Móvil': 'Móvil',
};

// Destino por defecto para SALIDAS (solo puestos intermedios con destino habitual)
const PUESTO_SALIDA_DEFAULT = {
    'Guardia PAD-E': 'Pto. Nuevo',   // PAD-E: cuando algo sale, va hacia Puerto Nuevo
};
const getRegistroConfigKey = puesto => `ws_registro_config_${puesto || 'default'}`;
// Config por puesto: cada puesto guarda su propia configuración de narrativa en localStorage
const getRegistroConfig = puesto => {
    try {
        const saved = JSON.parse(localStorage.getItem(getRegistroConfigKey(puesto)) || '{}');
        const ubiDefault = PUESTO_UBICACION[puesto] || puesto || 'EPF';
        return { ubicacion: ubiDefault, ...saved };
    } catch {
        return { ubicacion: PUESTO_UBICACION[puesto] || puesto || 'EPF' };
    }
};
const buildStats = (movs, diasActivos = 0) => {
    const isPetro = m => m.empresa?.toLowerCase().includes('petroecuador');
    const placaMap = {};
    movs.forEach(m => {
        if (!placaMap[m.placa] || (!placaMap[m.placa].empresa && m.empresa)) placaMap[m.placa] = m;
    });
    const unicos = Object.values(placaMap);
    // Datos por hora (las 24h — el filtrado al turno ocurre en StatsChart)
    const grafico = Array.from({ length: 24 }, (_, h) => ({
        label: `${h}h`,
        hora: h,
        ingresos: movs.filter(m => parseInt(m.hora?.split(':')[0] ?? 0) === h && m.tipo === 'ingreso').length,
        salidas:  movs.filter(m => parseInt(m.hora?.split(':')[0] ?? 0) === h && m.tipo === 'salida').length,
    }));
    // Top destinos / plataformas
    const destMap = {};
    movs.forEach(m => { if (m.destino?.trim()) destMap[m.destino.trim()] = (destMap[m.destino.trim()] || 0) + 1; });
    const topDestinos = Object.entries(destMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    // Top actividades
    const actMap = {};
    movs.forEach(m => {
        const a = m.actividad?.trim();
        if (a && !/^vac[ií]o$/i.test(a)) actMap[a] = (actMap[a] || 0) + 1;
    });
    const topActividades = Object.entries(actMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    // Top vehículos (por nº de movimientos)
    const placaMovMap = {};
    movs.forEach(m => { if (m.placa?.trim()) placaMovMap[m.placa.trim()] = (placaMovMap[m.placa.trim()] || 0) + 1; });
    const topPlacas = Object.entries(placaMovMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    return {
        totalFlujos: movs.length,
        diasActivos,
        petroecuador: unicos.filter(isPetro).length,
        contratistas: unicos.filter(m => !isPetro(m)).length,
        grafico,
        topDestinos,
        topActividades,
        topPlacas,
    };
};

const MASC_TIPOS = new Set(['sedán','sedan','suv','camión','camion','bus','volquete','tanquero','cabezal','tráiler','trailer','tracto','furgón','furgon','pickup','pick-up','pick up','camper','buldócer','buldocer','cisternero']);
const articuloVehiculo = tipo => tipo && MASC_TIPOS.has(tipo.toLowerCase().trim()) ? 'el' : 'la';

const generarNarrativa = (mov, cfg = {}) => {
    const { hora, tipo, conductor, cedula, empresa, tipoVehiculo, placa, destino, actividad, genero } = mov;
    const ubiIngreso  = cfg.ubicacion    || 'EPF';
    const conSalida   = cfg.conSalida    || 'Sale al';
    const conIngreso  = cfg.conIngreso   || 'Ingresa al';
    const titHombre   = cfg.conTitHombre || 'el Sr.';
    const titMujer    = cfg.conTitMujer  || 'la Srta.';
    const conCedula   = cfg.conCedula    || 'cc:';
    const conEmpresa  = cfg.conEmpresa   || 'de';
    const conPlaca    = cfg.conPlaca     || 'de Placas';
    const conVehiculo = cfg.conVehiculo  || `conduciendo ${articuloVehiculo(tipoVehiculo)}`;
    const titulo      = genero === 'f' ? titMujer : titHombre;
    const accion      = tipo === 'ingreso' ? `${conIngreso} ${destino || ubiIngreso}` : `${conSalida} ${destino || 'destino'}`;
    const descripcion = (!actividad || /^vac[ií]o$/i.test(actividad.trim())) ? 'vacía' : actividad.trim();
    return `${hora} ${accion} ${titulo} ${conductor || '—'} ${conCedula} ${cedula || '—'} ${conEmpresa} ${empresa || '—'} ${conVehiculo} ${tipoVehiculo || 'vehículo'} ${conPlaca} ${placa} ${descripcion}`;
};

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

const SuggestionField = ({ name, label, required, placeholder, value, onChange, onClear, autoFilled, suggestions, onSelect, onClearSugs, labelAction }) => {
    const inputRef = useRef(null);
    return (
        <div className={`modal-field ${autoFilled && value ? 'modal-field-autofilled' : ''}`}>
            <label>{label}{required && <span style={{ color: '#f87171' }}> *</span>}{labelAction}</label>
            <div className="placa-wrapper">
                <input ref={inputRef} type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} autoComplete="off"
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} />
                {value && onClear && (
                    <button className="field-clear-btn" type="button" onMouseDown={e => {
                        e.preventDefault();
                        onClear();
                        setTimeout(() => inputRef.current?.focus(), 0);
                    }}>✕</button>
                )}
                {suggestions.length > 0 && (
                    <div className="placa-suggestions">
                        {suggestions.map((s, i) => (
                            <div key={i} className="placa-suggestion-item" onMouseDown={e => { e.preventDefault(); onSelect(s); }}>
                                <div>
                                    <div className="placa-suggestion-placa">{s.nombres || s.cedula}</div>
                                    <div className="placa-suggestion-info">
                                        {[s.cedula, s.empresa].filter(Boolean).join(' · ') || '—'}
                                    </div>
                                </div>
                                <span className={`placa-suggestion-badge ${s._source}`}>
                                    {s._source === 'hoy' ? 'Hoy' : 'BD'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const TextSugField = ({ name, label, placeholder, value, onChange, onFocus, onClearSugs, suggestions, onSelect, multiline }) => (
    <div className="modal-field">
        <label>{label}</label>
        <div className="placa-wrapper">
            {multiline ? (
                <textarea name={name} placeholder={placeholder || ''} value={value} onChange={onChange} onFocus={onFocus}
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} autoComplete="off"
                    rows={3} className="modal-textarea" />
            ) : (
                <input type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} onFocus={onFocus}
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} autoComplete="off" />
            )}
            {suggestions.length > 0 && (
                <div className="placa-suggestions">
                    {suggestions.map((s, i) => (
                        <div key={i} className="placa-suggestion-item" onClick={() => onSelect(s)}>
                            <div className="placa-suggestion-placa">{s}</div>
                            <span className="placa-suggestion-badge hoy">Hoy</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

// ── Menú cajón ────────────────────────────────────────────
const DRAWER_ITEMS = [
    { label: 'Avance del día', tab: 'avance', icon: <IconClock /> },
    { label: 'Placas Vehículos', tab: 'placas-db', icon: <TruckIcon color="currentColor" /> },
    { label: 'Extensiones', tab: 'extensiones', icon: <IconPhone /> },
    { label: 'Personas', tab: 'personas', icon: <IconPerson /> },
    { label: 'Jefes Inmediatos', tab: 'jefes', icon: <IconBriefcase /> },
    { label: 'Calendario', tab: 'calendario', icon: <IconCalendar /> },
];

// Qué permiso requiere cada tab del cajón (null = siempre accesible)
const DRAWER_PERMISSION = {
    'avance':      'reportes',
    'placas-db':   'placas',
    'extensiones': 'extensiones',
    'personas':    'personas',
    'jefes':       'jefes',
    'calendario':  null,
};

const DrawerMenu = ({ onClose, onNavigate, onNuevoFlujo, activeTab, isAdmin, isPending, hasPermiso }) => {
    const canAccess = (tab) => {
        if (isAdmin) return true;
        const perm = DRAWER_PERMISSION[tab];
        if (!perm) return !isPending;
        return !isPending && hasPermiso(perm);
    };
    return (
    <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
                <span className="drawer-brand">FLUJO</span>
                <button className="drawer-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="drawer-nav">
                {DRAWER_ITEMS.map(item => {
                    const ok = canAccess(item.tab);
                    return (
                    <button key={item.tab}
                        className={`drawer-item ${item.tab === activeTab ? 'drawer-item-active' : ''}`}
                        style={!ok ? { opacity: 0.55 } : undefined}
                        onClick={() => {
                            if (!ok) return;
                            onNavigate(item.tab); onClose();
                        }}>
                        <span className="drawer-item-icon">{item.icon}</span>
                        <span className="drawer-item-label">{item.label}</span>
                        {ok ? <IconChevronRight /> : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )}
                    </button>
                    );
                })}
                <div className="drawer-divider" />
                <button className="drawer-item drawer-item-flujo" onClick={() => { onNuevoFlujo(); onClose(); }}>
                    <span className="drawer-item-icon"><IconBolt /></span>
                    <span className="drawer-item-label">Crear nuevo flujo</span>
                </button>
                {isAdmin && (
                    <>
                        <div className="drawer-divider" />
                        <button className="drawer-item" onClick={() => { onNavigate('admin'); onClose(); }}>
                            <span className="drawer-item-icon"><IconShield /></span>
                            <span className="drawer-item-label">Administración</span>
                            <IconChevronRight />
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
    );
};

// ── Escáner QR ────────────────────────────────────────────
const ModalEscanerQR = ({ onScanned, onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const fileInputRef = useRef(null);
    const [camError, setCamError] = useState('');
    const [hint, setHint] = useState('');
    const [imgError, setImgError] = useState('');

    useEffect(() => {
        let active = true;
        let jsQR = null;

        const start = async () => {
            const m = await import('jsqr');
            jsQR = m.default;

            const tick = () => {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || !canvas || !active) return;
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
                    if (code) { active = false; onScanned(code.data); return; }
                }
                rafRef.current = requestAnimationFrame(tick);
            };

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setHint('Apunta al código QR');
                rafRef.current = requestAnimationFrame(tick);
            } catch {
                setCamError('No se pudo acceder a la cámara. Verifica los permisos.');
            }
        };

        start();

        return () => {
            active = false;
            cancelAnimationFrame(rafRef.current);
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [onScanned]);

    const handleImageFile = e => {
        const file = e.target.files[0];
        if (!file) return;
        setImgError('');
        const reader = new FileReader();
        reader.onload = async ev => {
            const { default: jsQR } = await import('jsqr');
            const image = new Image();
            image.onload = () => {
                const canvas = canvasRef.current;
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
                if (code) {
                    onScanned(code.data);
                } else {
                    setImgError('No se detectó ningún QR en la imagen.');
                }
            };
            image.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="qr-scanner-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="2"/>
                            <rect x="14" y="3" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="2"/>
                            <rect x="3" y="14" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="2"/>
                            <rect x="15" y="15" width="2" height="2" fill="#818cf8"/>
                            <rect x="19" y="15" width="2" height="2" fill="#818cf8"/>
                            <rect x="15" y="19" width="2" height="2" fill="#818cf8"/>
                            <rect x="19" y="19" width="2" height="2" fill="#818cf8"/>
                        </svg>
                        <h3 style={{ margin: 0 }}>Escanear QR</h3>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                {camError
                    ? <p className="modal-error" style={{ margin: '16px 0 0' }}>{camError}</p>
                    : (
                        <>
                            <p style={{ fontSize: 12, color: '#666', margin: '8px 0 12px' }}>
                                {hint || 'Iniciando cámara...'}
                            </p>
                            <div className="qr-video-wrap">
                                <video ref={videoRef} className="qr-video" playsInline muted />
                                <div className="qr-frame" />
                            </div>
                            <p style={{ fontSize: 11, color: '#444', marginTop: 12, textAlign: 'center' }}>
                                Funciona con QR de vehículos y tarjetas de personas
                            </p>
                        </>
                    )
                }
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="qr-img-divider">— o selecciona una imagen —</div>
                <button className="qr-img-btn" onClick={() => fileInputRef.current.click()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Elegir imagen
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
                {imgError && <p style={{ color: '#ef4444', fontSize: 11, marginTop: 8, textAlign: 'center' }}>{imgError}</p>}
            </div>
        </div>
    );
};

// ── Parser de QR ──────────────────────────────────────────
const parseQR = raw => {
    const map = {};
    raw.split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i > 0) map[line.slice(0, i).trim().toUpperCase()] = line.slice(i + 1).trim();
    });
    return map;
};

const compressImage = (dataUrl, maxDim = 1200) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = img.width * scale;
        c.height = img.height * scale;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.src = dataUrl;
});

// ── Modal formulario (crear + editar) ────────────────────
const ModalAgregar = ({ puesto, bloque, turnoActual, fechaFlujo, ubiIngreso = 'EPF', ubiSalida = '', onClose, onGuardado, onGuardadoOptimista, onEditadoOptimista, onMovimientoConfirmado, movimientos, editData }) => {
    const [form, setForm] = useState(editData
        ? { tipo: editData.tipo, placa: editData.placa, marca: editData.marca || '', color: editData.color || '', tipoVehiculo: editData.tipoVehiculo || '', empresa: editData.empresa || '', conductor: editData.conductor || '', cedula: editData.cedula || '', destino: editData.destino || '', actividad: editData.actividad || '', genero: editData.genero || 'm' }
        : EMPTY_FORM
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [guardado, setGuardado] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [cedulaSugs, setCedulaSugs] = useState([]);
    const [conductorSugs, setConductorSugs] = useState([]);
    const [autoFilled, setAutoFilled] = useState(!!editData);
    const [destinoSugs, setDestinoSugs] = useState([]);
    const [actividadSugs, setActividadSugs] = useState([]);
    const [marcaSugs, setMarcaSugs] = useState([]);
    const [colorSugs, setColorSugs] = useState([]);
    const [empresaSugs, setEmpresaSugs] = useState([]);
    const [tipoSugs, setTipoSugs] = useState([]);
    const [personasTags, setPersonasTags] = useState([]);
    const [showTagInput, setShowTagInput] = useState(false);
    const [horaManual, setHoraManual] = useState('');
    const [showHoraInput, setShowHoraInput] = useState(false);
    const [tagQuery, setTagQuery] = useState('');
    const [tagSugs, setTagSugs] = useState([]);
    const actividadRef = useRef(null);
    const horaInputRef = useRef(null);
    const searchTimer = useRef(null);
    const cedulaTimer = useRef(null);
    const conductorTimer = useRef(null);
    const tagTimer = useRef(null);
    const [showScanner, setShowScanner] = useState(false);
    const [showPersonaScanner, setShowPersonaScanner] = useState(false);
    const [personaNotFound, setPersonaNotFound] = useState(false);
    const [placaNotFound, setPlacaNotFound] = useState(false);

    const handleChange = e => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setError('');
    };

    const handlePlacaChange = e => {
        const val = e.target.value.toUpperCase();
        setForm(f => ({ ...f, placa: val }));
        setAutoFilled(false);
        setError('');
        setPlacaNotFound(false);
        if (val.length < 3) { setSuggestions([]); return; }

        const seen = new Set();
        const todayHits = movimientos
            .filter(m => m.placa.includes(val) && !seen.has(m.placa) && seen.add(m.placa))
            .slice(0, 4).map(m => ({ ...m, _source: 'hoy' }));

        if (todayHits.length > 0) { setSuggestions(todayHits); return; }

        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(async () => {
            try {
                const { data } = await api.get(`/vehiculos/search?placa=${val}`);
                const results = data.vehiculos.map(v => ({ ...v, _source: 'db' }));
                results.forEach(v => cacheVehiculo(v));
                setSuggestions(results);
                setPlacaNotFound(results.length === 0);
            } catch {
                // Sin conexión: buscar en caché local
                const local = await buscarPlacaLocal(val).catch(() => null);
                if (local) { setSuggestions([{ ...local, _source: 'local' }]); setPlacaNotFound(false); }
                else { setSuggestions([]); setPlacaNotFound(true); }
            }
        }, 300);
    };

    const selectSuggestion = v => {
        setForm(f => ({ ...f, placa: v.placa, marca: v.marca || '', color: v.color || '', tipoVehiculo: v.tipoVehiculo || '', empresa: v.empresa || '', conductor: v.conductor || '', cedula: v.cedula || '' }));
        setSuggestions([]);
        setCedulaSugs([]);
        setConductorSugs([]);
        setAutoFilled(true);
        setPlacaNotFound(false);
    };

    const handleCedulaChange = e => {
        const val = e.target.value;
        setForm(f => ({ ...f, cedula: val }));
        setError('');
        setPersonaNotFound(false);
        if (val.length < 3) { setCedulaSugs([]); return; }

        const seen = new Set();
        const hits = movimientos
            .filter(m => m.cedula && m.cedula.includes(val) && !seen.has(m.cedula) && seen.add(m.cedula))
            .slice(0, 5)
            .map(m => ({ cedula: m.cedula, nombres: m.conductor || '', empresa: m.empresa || '', _source: 'hoy' }));

        if (hits.length > 0) { setCedulaSugs(hits); return; }

        clearTimeout(cedulaTimer.current);
        cedulaTimer.current = setTimeout(async () => {
            try {
                const { data } = await api.get(`/personas/search?q=${encodeURIComponent(val)}`);
                const results = data.personas.map(p => ({ ...p, _source: 'db' }));
                results.forEach(p => cachePersona(p));
                setCedulaSugs(results);
                if (results.length === 0) setPersonaNotFound(true);
            } catch {
                const local = await buscarPersonaLocal(val).catch(() => []);
                const results = (local || []).map(p => ({ ...p, _source: 'local' }));
                setCedulaSugs(results);
                if (results.length === 0) setPersonaNotFound(true);
            }
        }, 300);
    };

    const handleConductorChange = e => {
        const val = e.target.value;
        setForm(f => ({ ...f, conductor: val }));
        setError('');
        setPersonaNotFound(false);
        if (val.length < 3) { setConductorSugs([]); return; }

        const seen = new Set();
        const hits = movimientos
            .filter(m => m.conductor && m.conductor.toLowerCase().includes(val.toLowerCase()) && !seen.has(m.conductor) && seen.add(m.conductor))
            .slice(0, 5)
            .map(m => ({ cedula: m.cedula || '', nombres: m.conductor, empresa: m.empresa || '', _source: 'hoy' }));

        if (hits.length > 0) { setConductorSugs(hits); return; }

        clearTimeout(conductorTimer.current);
        conductorTimer.current = setTimeout(async () => {
            try {
                const { data } = await api.get(`/personas/search?q=${encodeURIComponent(val)}`);
                const results = data.personas.map(p => ({ ...p, _source: 'db' }));
                results.forEach(p => cachePersona(p));
                setConductorSugs(results);
                if (results.length === 0) setPersonaNotFound(true);
            } catch {
                const local = await buscarPersonaLocal(val).catch(() => []);
                const results = (local || []).map(p => ({ ...p, _source: 'local' }));
                setConductorSugs(results);
                if (results.length === 0) setPersonaNotFound(true);
            }
        }, 300);
    };

    const selectPersonaSug = sug => {
        setForm(f => ({ ...f, conductor: sug.nombres || '', cedula: sug.cedula || '', empresa: sug.empresa || f.empresa }));
        setCedulaSugs([]);
        setConductorSugs([]);
        setAutoFilled(true);
        setPersonaNotFound(false);
    };

    const recentUnique = (field, val) => {
        const seen = new Set();
        return movimientos
            .filter(m => m[field] && (!val || m[field].toLowerCase().includes(val.toLowerCase())) && !seen.has(m[field]) && seen.add(m[field]))
            .slice(0, 5).map(m => m[field]);
    };

    const handleDestinoChange = e => {
        const val = e.target.value;
        setForm(f => ({ ...f, destino: val }));
        setError('');
        setDestinoSugs(val.length >= 1 ? recentUnique('destino', val) : []);
    };

    const handleActividadChange = e => {
        const val = e.target.value;
        setForm(f => ({ ...f, actividad: val }));
        setError('');
        setActividadSugs(val.length >= 1 ? recentUnique('actividad', val) : []);
    };

    const handleTagSearch = val => {
        setTagQuery(val);
        if (val.length < 2) { setTagSugs([]); return; }
        clearTimeout(tagTimer.current);
        tagTimer.current = setTimeout(async () => {
            try {
                const { data } = await api.get(`/personas/search?q=${encodeURIComponent(val)}`);
                setTagSugs(data.personas || []);
            } catch { setTagSugs([]); }
        }, 300);
    };

    const selectTag = persona => {
        setPersonasTags(t => [...t, persona]);
        setShowTagInput(false);
        setTagQuery('');
        setTagSugs([]);
    };

    const handleTipoVehChange = e => {
        const val = e.target.value;
        setForm(f => ({ ...f, tipoVehiculo: val }));
        setTipoSugs(TIPO_VEHICULO_OPTS.filter(o => !val || o.toLowerCase().includes(val.toLowerCase())));
    };

    const handleMarcaChange = e => {
        const val = e.target.value;
        setForm(f => ({ ...f, marca: val }));
        setMarcaSugs(val.length >= 1 ? recentUnique('marca', val) : []);
    };

    const handleColorChange = e => {
        const val = e.target.value;
        setForm(f => ({ ...f, color: val }));
        setColorSugs(val.length >= 1 ? recentUnique('color', val) : []);
    };

    const handleEmpresaChange = e => {
        const val = e.target.value;
        setForm(f => ({ ...f, empresa: val }));
        setEmpresaSugs(val.length >= 1 ? recentUnique('empresa', val) : []);
    };

    const handleQRScanned = data => {
        const q = parseQR(data);
        const placa     = q.PLACA || q.PLA;
        const marca     = q.MARCA || q.MARC;
        const color     = q.COLOR || q.COL;
        const tipo      = q.TIPO  || q.TIP;
        const empresa   = q.EMPRESA || q.CIA;
        const cedula    = q.CEDULA || q.CED || q.CC;
        const conductor = q.CONDUCTOR || q.NOMBRES || q.NOMBRE || q.NOM;
        setForm(f => ({
            ...f,
            ...(placa     && { placa }),
            ...(marca     && { marca }),
            ...(color     && { color }),
            ...(tipo      && { tipoVehiculo: tipo }),
            ...(empresa   && { empresa }),
            ...(conductor && { conductor }),
            ...(cedula    && { cedula }),
        }));
        setAutoFilled(true);
        setPersonaNotFound(false);
        setPlacaNotFound(false);
        setShowScanner(false);
    };

    const handlePersonaQRScanned = data => {
        const q = parseQR(data);
        const cedula    = q.CEDULA || q.CED || q.CC;
        const conductor = q.CONDUCTOR || q.NOMBRES || q.NOMBRE || q.NOM;
        const empresa   = q.EMPRESA || q.CIA;
        setForm(f => ({
            ...f,
            ...(conductor && { conductor }),
            ...(cedula    && { cedula }),
            ...(empresa   && { empresa }),
        }));
        setPersonaNotFound(false);
        setShowPersonaScanner(false);
    };

    const handleSubmit = async () => {
        if (!form.placa) { setError('La placa es obligatoria'); return; }

        const actividadFinal = [
            form.actividad,
            ...personasTags.map(p => p.nombres + (p.cedula ? ' CI: ' + p.cedula : '')),
        ].filter(Boolean).join(' · ');
        const formFinal = { ...form, actividad: actividadFinal };

        // Edición optimista: cierra el formulario de inmediato y sincroniza en background
        if (editData?._id) {
            // 1. Actualizar la UI sin esperar la red
            onEditadoOptimista({ ...editData, ...formFinal });
            onClose();
            // 2. Write-ahead en Dexie (sobrevive page refresh)
            await encolarEdicion({ id: editData._id, payload: formFinal });
            // 3. Intentar API en background; si falla, el sync periódico lo recogerá
            api.put(`/movimientos/${editData._id}`, formFinal)
                .then(async () => { await marcarEdicionSincronizada(editData._id); })
                .catch(() => { /* queda en cola Dexie para reintento */ });
            return;
        }

        // Nuevo movimiento: guardado optimista — aparece en UI de inmediato
        const tempId = crypto.randomUUID();
        const hora = horaManual || getHoraLocal();
        // fechaFlujo viene del turno activo (fecha de inicio del turno) para que todos los
        // movimientos del turno nocturno queden agrupados bajo la misma fecha, incluso los
        // registrados después de medianoche.
        const fecha = fechaFlujo || getTurnoFecha(turnoActual);
        const tempMov = { ...formFinal, _id: tempId, hora, fecha, _pending: true };

        onGuardadoOptimista(tempMov);
        setForm(EMPTY_FORM);
        setSuggestions([]); setCedulaSugs([]); setConductorSugs([]);
        setDestinoSugs([]); setActividadSugs([]);
        setTipoSugs([]); setPersonasTags([]); setShowTagInput(false); setTagQuery(''); setTagSugs([]);
        setHoraManual(''); setShowHoraInput(false);
        setAutoFilled(false); setPersonaNotFound(false); setPlacaNotFound(false); setError('');
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2500);

        const payload = { ...formFinal, puesto, bloque, fecha, hora, clientUUID: tempId };
        if (personaNotFound && form.cedula) {
            api.post('/personas', { nombres: form.conductor || '', cedula: form.cedula, empresa: form.empresa || '' }).catch(() => {});
        }
        // Write-ahead: guardar en Dexie ANTES de intentar la API.
        // Así, si el usuario refresca durante el vuelo o el servidor no responde,
        // el movimiento no se pierde — ya está en la cola local.
        await encolarMovimiento({ uuid: tempId, payload, hora, fecha });
        try {
            const { data } = await api.post('/movimientos', payload);
            // Éxito: marcar como sincronizado en Dexie y confirmar en UI
            await marcarSincronizado(tempId, data.movimiento._id);
            onMovimientoConfirmado(tempId, data.movimiento);
        } catch {
            // El movimiento ya está en Dexie; el motor de reintento lo subirá
        }
    };

    const fp = { onChange: handleChange, autoFilled };

    return (
        <div className="modal-overlay" onClick={onClose}>
            {showScanner && (
                <ModalEscanerQR
                    onScanned={handleQRScanned}
                    onClose={() => setShowScanner(false)}
                />
            )}
            {showPersonaScanner && (
                <ModalEscanerQR
                    onScanned={handlePersonaQRScanned}
                    onClose={() => setShowPersonaScanner(false)}
                />
            )}
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{editData ? 'Editar movimiento' : 'Nuevo movimiento'}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-tipo">
                    {[['ingreso', 'INGRESA'], ['salida', 'SALE']].map(([val, label]) => (
                        <button key={val} className={`modal-tipo-btn ${form.tipo === val ? 'active-' + val : ''}`}
                            onClick={() => setForm(f => ({
                                ...f,
                                tipo: val,
                                ...(val === 'ingreso' && !f.destino ? { destino: ubiIngreso } :
                    val === 'salida' && !f.destino && ubiSalida ? { destino: ubiSalida } : {}),
                            }))}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="modal-fields">
                    <div className={`modal-field ${autoFilled ? 'modal-field-autofilled' : ''}`}>
                        <label>
                            <span>PLACAS <span style={{ color: '#f87171' }}>*</span></span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {showHoraInput ? (
                                    <input
                                        ref={horaInputRef}
                                        type="time"
                                        className="hora-manual-input"
                                        value={horaManual}
                                        onChange={e => setHoraManual(e.target.value)}
                                        onBlur={() => { if (!horaManual) setShowHoraInput(false); }}
                                        autoFocus
                                    />
                                ) : (
                                    <button className="activ-add-tag-btn" onClick={() => {
                                        setShowHoraInput(true);
                                        setTimeout(() => horaInputRef.current?.showPicker?.(), 50);
                                    }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                                        hora
                                    </button>
                                )}
                                {horaManual && (
                                    <button className="activ-add-tag-btn" style={{ color: '#f87171' }} onClick={() => { setHoraManual(''); setShowHoraInput(false); }}>✕</button>
                                )}
                            </span>
                            {!editData && (
                                <button className="qr-field-btn" title="Escanear QR vehículo" onClick={() => setShowScanner(true)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                                        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                                        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                                        <rect x="15" y="15" width="2" height="2" fill="currentColor"/>
                                        <rect x="19" y="15" width="2" height="2" fill="currentColor"/>
                                        <rect x="15" y="19" width="2" height="2" fill="currentColor"/>
                                        <rect x="19" y="19" width="2" height="2" fill="currentColor"/>
                                    </svg>
                                </button>
                            )}
                        </label>
                        <div className="placa-wrapper">
                            <input type="text" name="placa" placeholder="Ej: ABC-1234"
                                value={form.placa} onChange={handlePlacaChange} autoComplete="off"
                                onBlur={() => setTimeout(() => setSuggestions([]), 150)} />
                            {suggestions.length > 0 && (
                                <div className="placa-suggestions">
                                    {suggestions.map((v, i) => (
                                        <div key={i} className="placa-suggestion-item" onMouseDown={e => { e.preventDefault(); selectSuggestion(v); }}>
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
                    {placaNotFound && form.placa.length >= 3 && (
                        <div className="quick-info-banner">
                            Placa <strong>{form.placa}</strong> no está en la BD — se registrará al guardar
                        </div>
                    )}
                    <div className="modal-fields-row">
                        <TextSugField name="marca" label="MARCA" placeholder="Toyota"
                            value={form.marca} onChange={handleMarcaChange}
                            onFocus={() => setMarcaSugs(recentUnique('marca', form.marca))}
                            onClearSugs={() => setMarcaSugs([])}
                            suggestions={marcaSugs} onSelect={s => { setForm(f => ({ ...f, marca: s })); setMarcaSugs([]); }} />
                        <TextSugField name="color" label="COLOR" placeholder="Blanco"
                            value={form.color} onChange={handleColorChange}
                            onFocus={() => setColorSugs(recentUnique('color', form.color))}
                            onClearSugs={() => setColorSugs([])}
                            suggestions={colorSugs} onSelect={s => { setForm(f => ({ ...f, color: s })); setColorSugs([]); }} />
                    </div>
                    <div className="modal-fields-row">
                        <TextSugField name="tipoVehiculo" label="TIPO" placeholder="SUV, Sedán..."
                            value={form.tipoVehiculo} onChange={handleTipoVehChange}
                            onFocus={() => setTipoSugs(TIPO_VEHICULO_OPTS.filter(o => !form.tipoVehiculo || o.toLowerCase().includes(form.tipoVehiculo.toLowerCase())))}
                            onClearSugs={() => setTipoSugs([])}
                            suggestions={tipoSugs}
                            onSelect={s => { setForm(f => ({ ...f, tipoVehiculo: s })); setTipoSugs([]); }} />
                        <TextSugField name="empresa" label="EMPRESA" placeholder="Empresa S.A."
                            value={form.empresa} onChange={handleEmpresaChange}
                            onFocus={() => setEmpresaSugs(recentUnique('empresa', form.empresa))}
                            onClearSugs={() => setEmpresaSugs([])}
                            suggestions={empresaSugs} onSelect={s => { setForm(f => ({ ...f, empresa: s })); setEmpresaSugs([]); }} />
                    </div>
                    <SuggestionField name="conductor" label="CONDUCTOR" placeholder="Nombre completo"
                        value={form.conductor} onChange={handleConductorChange} autoFilled={autoFilled}
                        suggestions={conductorSugs} onSelect={selectPersonaSug}
                        onClearSugs={() => setConductorSugs([])}
                        onClear={() => { setForm(f => ({ ...f, conductor: '' })); setConductorSugs([]); setAutoFilled(false); }}
                        labelAction={
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button className={`genero-toggle-btn${form.genero === 'm' ? ' active' : ''}`} title="Masculino" onClick={() => setForm(f => ({ ...f, genero: 'm' }))}>♂</button>
                                <button className={`genero-toggle-btn${form.genero === 'f' ? ' active-f' : ''}`} title="Femenino" onClick={() => setForm(f => ({ ...f, genero: 'f' }))}>♀</button>
                                {!editData && (
                                    <button className="qr-field-btn" title="Escanear QR persona" onClick={() => setShowPersonaScanner(true)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                                            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                                            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                                            <rect x="15" y="15" width="2" height="2" fill="currentColor"/>
                                            <rect x="19" y="15" width="2" height="2" fill="currentColor"/>
                                            <rect x="15" y="19" width="2" height="2" fill="currentColor"/>
                                            <rect x="19" y="19" width="2" height="2" fill="currentColor"/>
                                        </svg>
                                    </button>
                                )}
                            </span>
                        } />
                    <SuggestionField name="cedula" label="CÉDULA" placeholder="Nro. de cédula"
                        value={form.cedula} onChange={handleCedulaChange} autoFilled={autoFilled}
                        suggestions={cedulaSugs} onSelect={selectPersonaSug}
                        onClearSugs={() => setCedulaSugs([])}
                        onClear={() => { setForm(f => ({ ...f, cedula: '' })); setCedulaSugs([]); setAutoFilled(false); }} />
                    {personaNotFound && (
                        <div className="quick-info-banner">
                            Persona no encontrada en la BD — se registrará al guardar
                        </div>
                    )}
                    <TextSugField name="destino" label="DESTINO" placeholder="Área o lugar"
                        value={form.destino} onChange={handleDestinoChange}
                        onFocus={() => setDestinoSugs(recentUnique('destino', form.destino))}
                        onClearSugs={() => setDestinoSugs([])}
                        suggestions={destinoSugs} onSelect={s => { setForm(f => ({ ...f, destino: s })); setDestinoSugs([]); }} />
                    <div className="modal-field">
                        <label>ACTIVIDAD / OBSERVACIÓN</label>
                        <div className="placa-wrapper">
                            <textarea
                                ref={actividadRef}
                                name="actividad"
                                placeholder="VACIO · con 2 pax a destino..."
                                value={form.actividad}
                                onChange={handleActividadChange}
                                onFocus={() => setActividadSugs(recentUnique('actividad', form.actividad))}
                                onBlur={() => setTimeout(() => setActividadSugs([]), 200)}
                                autoComplete="off"
                                rows={3}
                                className="modal-textarea"
                            />
                            {actividadSugs.length > 0 && (
                                <div className="placa-suggestions">
                                    {actividadSugs.map((s, i) => (
                                        <div key={i} className="placa-suggestion-item" onMouseDown={e => { e.preventDefault(); setForm(f => ({ ...f, actividad: s })); setActividadSugs([]); }}>
                                            <div className="placa-suggestion-placa">{s}</div>
                                            <span className="placa-suggestion-badge hoy">Reciente</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="activ-tags-row">
                            {personasTags.map((p, i) => (
                                <span key={i} className="activ-persona-tag">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                    {p.nombres}{p.cedula ? ` · ${p.cedula}` : ''}
                                    <button className="activ-tag-remove" onMouseDown={e => { e.preventDefault(); setPersonasTags(t => t.filter((_, j) => j !== i)); }}>×</button>
                                </span>
                            ))}
                            {personasTags.length < 10 && (
                                showTagInput ? (
                                    <div className="activ-tag-input-wrap">
                                        <input
                                            autoFocus
                                            className="activ-tag-input"
                                            placeholder="Nombre o cédula..."
                                            value={tagQuery}
                                            onChange={e => handleTagSearch(e.target.value)}
                                            onBlur={() => setTimeout(() => { setShowTagInput(false); setTagQuery(''); setTagSugs([]); }, 200)}
                                        />
                                        {tagSugs.length > 0 && (
                                            <div className="placa-suggestions activ-tag-sugs">
                                                {tagSugs.map((pg, i) => (
                                                    <div key={i} className="placa-suggestion-item" onMouseDown={e => { e.preventDefault(); selectTag(pg); }}>
                                                        <div>
                                                            <div className="placa-suggestion-placa">{pg.nombres}</div>
                                                            <div className="placa-suggestion-info">{[pg.cedula, pg.empresa].filter(Boolean).join(' · ')}</div>
                                                        </div>
                                                        <span className="placa-suggestion-badge db">BD</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button className="activ-add-tag-btn" onClick={() => setShowTagInput(true)}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                                        persona
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>
                {error && <p className="modal-error">{error}</p>}
                {guardado && (
                    <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: '#4ade80', textAlign: 'center', fontWeight: 600 }}>
                        ✓ Movimiento registrado
                    </div>
                )}
                <button className={`modal-btn ${form.placa ? 'active' : ''}`} onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Guardando...' : editData ? 'Guardar cambios' : 'Registrar movimiento'}
                </button>
            </div>
        </div>
    );
};

// ── Modal detalle ─────────────────────────────────────────
const DetalleRow = ({ label, value, full }) =>
    value ? (
        <div className={`detalle-field${full ? ' detalle-field-full' : ''}`}>
            <span className="detalle-label">{label}</span>
            <span className="detalle-value">{value}</span>
        </div>
    ) : null;

const ModalDetalle = ({ mov, onClose, onEdit, onDelete, onCopy, onShare, hasPrev, hasNext, onPrev, onNext, counter }) => {
    const isIngreso = mov.tipo === 'ingreso';
    const SK = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';

    const campos = [
        { label: 'Marca',         valor: mov.marca },
        { label: 'Color',         valor: mov.color },
        { label: 'Tipo vehículo', valor: mov.tipoVehiculo },
        { label: 'Empresa',       valor: mov.empresa },
        { label: 'Conductor',     valor: mov.conductor },
        { label: 'Cédula',        valor: mov.cedula },
        { label: 'Destino',       valor: mov.destino, span: true },
    ].filter(c => c.valor);

    const actBtn = (title, onClick, svg) => (
        <button
            key={title}
            title={title}
            onClick={onClick}
            style={{
                width: 26, height: 26, padding: 0, border: 'none', flexShrink: 0,
                borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                color: '#d4d4d8', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '94vw', maxWidth: 580,
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 20,
                    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
                    overflow: 'hidden',
                }}
            >
                {/* ── Cabecera: hora · badge · placa + cerrar ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px 0 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>{mov.hora}</span>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '5px 11px',
                            borderRadius: 100, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0,
                            background: isIngreso ? 'rgba(59,130,246,0.15)' : 'rgba(244,63,94,0.15)',
                            color: isIngreso ? '#60a5fa' : '#fb7185',
                        }}>
                            {isIngreso ? 'INGRESO' : 'SALIDA'}
                        </span>
                        <span style={{
                            fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{mov.placa}</span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: '100%', border: 'none', flexShrink: 0,
                            background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12,
                        }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── Fecha ── */}
                <div style={{
                    padding: '10px 24px 18px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', justifyContent: 'flex-end',
                }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#8b8b92' }}>{mov.fecha}</span>
                </div>

                {/* ── Grid de campos ── */}
                {campos.length > 0 && (
                    <div style={{
                        padding: '20px 24px 6px 24px',
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        columnGap: 24, rowGap: 18,
                    }}>
                        {campos.map(c => (
                            <div key={c.label} style={{ gridColumn: c.span ? 'span 2' : undefined }}>
                                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#71717a', textTransform: 'uppercase' }}>
                                    {c.label}
                                </div>
                                <div style={{ marginTop: 5, fontSize: 15, fontWeight: 600, color: '#f4f4f5' }}>
                                    {c.valor}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Caja actividad ── */}
                <div style={{
                    margin: '18px 24px 20px 24px',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12,
                }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#71717a', textTransform: 'uppercase' }}>
                        Actividad / Obs.
                    </div>
                    <div style={{
                        marginTop: 10, fontSize: 14.5, lineHeight: '26px', color: '#e4e4e7',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.25) 0.8px, transparent 0.8px)',
                        backgroundSize: '6px 26px', backgroundRepeat: 'repeat', backgroundPosition: '0 30px',
                        minHeight: 26,
                    }}>
                        {mov.actividad || '—'}
                    </div>
                </div>

                {/* ── Acciones ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 24px 20px 24px' }}>
                    {onEdit   && actBtn('Editar',    () => { onEdit(mov); onClose(); },
                        `<svg width="13" height="13" viewBox="0 0 24 24" ${SK}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`)}
                    {onCopy   && actBtn('Copiar',    () => onCopy(mov),
                        `<svg width="13" height="13" viewBox="0 0 24 24" ${SK}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`)}
                    {onShare  && actBtn('Compartir', () => onShare(mov),
                        `<svg width="13" height="13" viewBox="0 0 24 24" ${SK}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>`)}
                    {onDelete && actBtn('Eliminar',  () => { onDelete(mov._id); onClose(); },
                        `<svg width="13" height="13" viewBox="0 0 24 24" ${SK}><path d="M5 12h14"/></svg>`)}
                </div>

                {/* ── Navegación anterior / siguiente ── */}
                {(hasPrev || hasNext || counter) && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)',
                        background: 'rgba(255,255,255,0.015)',
                    }}>
                        <button
                            onClick={onPrev} disabled={!hasPrev}
                            style={{
                                width: 34, height: 34, padding: 0, borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.09)', background: 'transparent',
                                color: hasPrev ? '#d4d4d8' : '#3f3f46', cursor: hasPrev ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 6c-2 2-5.5 4.5-8 6 2.5 1.5 6 4 8 6" />
                            </svg>
                        </button>
                        <span style={{ fontSize: 13, color: '#8b8b92', fontWeight: 600 }}>{counter}</span>
                        <button
                            onClick={onNext} disabled={!hasNext}
                            style={{
                                width: 34, height: 34, padding: 0, borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.09)', background: 'transparent',
                                color: hasNext ? '#d4d4d8' : '#3f3f46', cursor: hasNext ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 6c2 2 5.5 4.5 8 6-2.5 1.5-6 4-8 6" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


// ── Modal editar hora ─────────────────────────────────────
const ModalEditHora = ({ mov, onClose, onSave }) => {
    const [hora, setHora] = useState(mov.hora);
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ maxWidth: 300 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>Editar hora · {mov.placa}</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                        type="time"
                        value={hora}
                        onChange={e => setHora(e.target.value)}
                        style={{
                            width: '100%', padding: '12px', background: '#1e1e1e',
                            border: '1px solid #2e2e2e', borderRadius: 10, color: '#fff',
                            fontSize: 28, fontWeight: 700, textAlign: 'center',
                            boxSizing: 'border-box',
                        }}
                    />
                    <button className="modal-btn active" onClick={() => hora && onSave(mov._id, hora)}>
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Modal registrar / editar ingreso desde bitácora ──────
const ModalRegistrarIngreso = ({ b, movimientos, ubiIngreso = 'EPF', onClose, onGuardar }) => {
    const isNew = !b.ingreso;
    const [hora, setHora]           = useState(() => b.horaI && b.horaI !== '—' ? b.horaI : getHoraLocal());
    const [conductor, setConductor] = useState(b.ingreso?.conductor || b.salida?.conductor || '');
    const [cedula, setCedula]       = useState(b.ingreso?.cedula    || b.salida?.cedula    || '');
    const [actividad, setActividad] = useState(b.ingreso?.actividad || '');
    const [destino,   setDestino]   = useState(b.ingreso?.destino   || ubiIngreso);
    const [conductorSugs, setConductorSugs] = useState([]);
    const [cedulaSugs,    setCedulaSugs]    = useState([]);
    const [actividadSugs, setActividadSugs] = useState([]);
    const [destinoSugs,   setDestinoSugs]   = useState([]);
    const [personaNotFound, setPersonaNotFound] = useState(false);
    const conductorTimer = useRef(null);
    const cedulaTimer    = useRef(null);

    const recentUniq = (field, val) => {
        const seen = new Set();
        return (movimientos || [])
            .filter(m => m[field] && (!val || m[field].toLowerCase().includes(val.toLowerCase()))
                && !seen.has(m[field]) && seen.add(m[field]))
            .slice(0, 5).map(m => m[field]);
    };

    const searchPersonas = async (val, setList) => {
        try {
            const { data } = await api.get(`/personas/search?q=${encodeURIComponent(val)}`);
            setList(data.personas || []);
            if (!(data.personas || []).length) setPersonaNotFound(true);
        } catch {
            const local = await buscarPersonaLocal(val).catch(() => []);
            setList(local || []);
            if (!(local || []).length) setPersonaNotFound(true);
        }
    };

    const handleConductorChange = val => {
        setConductor(val); setPersonaNotFound(false);
        if (val.length < 3) { setConductorSugs([]); return; }
        const seen = new Set();
        const hits = (movimientos || [])
            .filter(m => m.conductor && m.conductor.toLowerCase().includes(val.toLowerCase())
                && !seen.has(m.conductor) && seen.add(m.conductor))
            .slice(0, 5)
            .map(m => ({ cedula: m.cedula || '', nombres: m.conductor, empresa: m.empresa || '' }));
        if (hits.length) { setConductorSugs(hits); return; }
        clearTimeout(conductorTimer.current);
        conductorTimer.current = setTimeout(() => searchPersonas(val, setConductorSugs), 300);
    };

    const handleCedulaChange = val => {
        setCedula(val); setPersonaNotFound(false);
        if (val.length < 3) { setCedulaSugs([]); return; }
        const seen = new Set();
        const hits = (movimientos || [])
            .filter(m => m.cedula && m.cedula.includes(val) && !seen.has(m.cedula) && seen.add(m.cedula))
            .slice(0, 5)
            .map(m => ({ cedula: m.cedula, nombres: m.conductor || '', empresa: m.empresa || '' }));
        if (hits.length) { setCedulaSugs(hits); return; }
        clearTimeout(cedulaTimer.current);
        cedulaTimer.current = setTimeout(() => searchPersonas(val, setCedulaSugs), 300);
    };

    const selectPersona = p => {
        setConductor(p.nombres || ''); setCedula(p.cedula || '');
        setConductorSugs([]); setCedulaSugs([]); setPersonaNotFound(false);
    };

    const handleSubmit = () => {
        if (!hora) return;
        if (personaNotFound && cedula) {
            api.post('/personas', { nombres: conductor, cedula, empresa: b.empresa || '' }).catch(() => {});
        }
        onGuardar({ b, hora, conductor: conductor.trim(), cedula: cedula.trim(), actividad: actividad.trim(), destino: destino.trim() });
    };

    const fld = {
        width: '100%', padding: '10px 12px', background: '#141820',
        border: '1px solid #2a2f3d', borderRadius: 8, color: '#e8eaed',
        fontSize: 13, boxSizing: 'border-box', outline: 'none',
    };

    const PersonaSugList = ({ items }) => !items.length ? null : (
        <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: '#1a1e28', border: '1px solid #2a2f3d', borderRadius: 8,
            overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.45)', marginTop: 2,
        }}>
            {items.map((p, i) => (
                <div key={i} onClick={() => selectPersona(p)}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < items.length - 1 ? '1px solid #1f2330' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#232838'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e8eaed' }}>{p.nombres}</div>
                    {p.cedula && <div style={{ fontSize: 11, color: '#5a6070' }}>CI: {p.cedula}{p.empresa ? ' · ' + p.empresa : ''}</div>}
                </div>
            ))}
        </div>
    );

    const StrSugList = ({ items, onSel }) => !items.length ? null : (
        <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: '#1a1e28', border: '1px solid #2a2f3d', borderRadius: 8,
            overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.45)', marginTop: 2,
        }}>
            {items.map((s, i) => (
                <div key={i} onClick={() => onSel(s)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#c4c8d2',
                        borderBottom: i < items.length - 1 ? '1px solid #1f2330' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#232838'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>{s}</div>
            ))}
        </div>
    );

    const LBL = ({ t }) => (
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', color: '#5a6070', textTransform: 'uppercase', marginBottom: 6 }}>{t}</div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                width: '94vw', maxWidth: 400,
                background: 'linear-gradient(180deg,#1a1c23 0%,#16171d 100%)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16,
                boxShadow: '0 24px 60px rgba(0,0,0,0.55)', overflow: 'visible',
            }}>
                {/* Cabecera */}
                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                            borderRadius: 100, background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0,
                        }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                            INGRESO
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{b.placa}</span>
                        {b.tipoVehiculo && <span style={{ fontSize: 11, color: '#5a6070', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.tipoVehiculo}</span>}
                    </div>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: '50%', border: 'none', flexShrink: 0,
                        background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 10,
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Hora */}
                    <div>
                        <LBL t="Hora de retorno" />
                        <input type="time" value={hora} onChange={e => setHora(e.target.value)} autoFocus
                            style={{ ...fld, fontSize: 26, fontWeight: 700, textAlign: 'center', padding: '12px' }} />
                    </div>

                    {/* Conductor */}
                    <div style={{ position: 'relative' }}>
                        <LBL t="Conductor de retorno" />
                        <input type="text" placeholder="Nombre del conductor..." value={conductor}
                            onChange={e => handleConductorChange(e.target.value)}
                            onBlur={() => setTimeout(() => setConductorSugs([]), 150)} style={fld} />
                        <PersonaSugList items={conductorSugs} />
                    </div>

                    {/* Cédula */}
                    <div style={{ position: 'relative' }}>
                        <LBL t="Cédula" />
                        <input type="text" placeholder="Nro. de cédula..." value={cedula}
                            onChange={e => handleCedulaChange(e.target.value)}
                            onBlur={() => setTimeout(() => setCedulaSugs([]), 150)} style={fld} />
                        <PersonaSugList items={cedulaSugs} />
                        {personaNotFound && cedula.length >= 3 && (
                            <div style={{ marginTop: 5, fontSize: 11, color: '#e0a83e' }}>
                                ⚠️ Persona no encontrada — se guardará automáticamente
                            </div>
                        )}
                    </div>

                    {/* Actividad */}
                    <div style={{ position: 'relative' }}>
                        <LBL t="Actividad / Observación" />
                        <input type="text" placeholder="Descripción de la actividad..." value={actividad}
                            onChange={e => { setActividad(e.target.value); setActividadSugs(e.target.value.length >= 1 ? recentUniq('actividad', e.target.value) : []); }}
                            onBlur={() => setTimeout(() => setActividadSugs([]), 150)}
                            style={fld} />
                        <StrSugList items={actividadSugs} onSel={s => { setActividad(s); setActividadSugs([]); }} />
                    </div>

                    {/* Destino */}
                    <div style={{ position: 'relative' }}>
                        <LBL t="Destino" />
                        <input type="text" placeholder="Área o lugar..." value={destino}
                            onChange={e => { setDestino(e.target.value); setDestinoSugs(e.target.value.length >= 1 ? recentUniq('destino', e.target.value) : []); }}
                            onBlur={() => setTimeout(() => setDestinoSugs([]), 150)}
                            style={fld} />
                        <StrSugList items={destinoSugs} onSel={s => { setDestino(s); setDestinoSugs([]); }} />
                    </div>

                    {/* Botón guardar */}
                    <button onClick={handleSubmit} disabled={!hora} style={{
                        padding: '12px', borderRadius: 10, border: 'none', marginTop: 2,
                        background: hora ? '#4a5be0' : '#1e2030',
                        color: hora ? '#fff' : '#3a3f4a',
                        fontSize: 14, fontWeight: 700, cursor: hora ? 'pointer' : 'not-allowed',
                        transition: 'background 0.15s ease',
                    }}>
                        {isNew ? 'Registrar ingreso' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Modal detalle Bitácora ────────────────────────────────
const ModalBitacoraDetalle = ({ bitacora, idx, onClose, onChange, onEditMov, onEditIngreso, onDeletePair }) => {
    const b = bitacora[idx];
    if (!b) return null;
    const total = bitacora.length;
    const hasPrev = idx > 0;
    const hasNext = idx < total - 1;

    const bToText = entry => [
        `Bitácora: ${entry.placa}${entry.tipoVehiculo ? ' · ' + entry.tipoVehiculo : ''}`,
        `Estado: ${entry.status === 'completo' ? 'Completado' : entry.status === 'en-campo' ? 'En campo' : 'Solo ingreso'}`,
        `Conductor: ${entry.conductor}`,
        entry.empresa && `Empresa: ${entry.empresa}`,
        entry.destino && `Destino: ${entry.destino}`,
        `Salida: ${entry.horaS}  →  Ingreso: ${entry.horaI}`,
    ].filter(Boolean).join('\n');

    const handleCopy = () => navigator.clipboard?.writeText(bToText(b));
    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({ title: 'Bitácora FLUJO', text: bToText(b) }).catch(() => {});
        } else {
            handleCopy();
        }
    };

    const MovSection = ({ mov, label, color }) => {
        if (!mov) return null;
        const handleEditClick = () => {
            if (color === 'ingreso' && onEditIngreso) { onEditIngreso(b); }
            else if (onEditMov) { onEditMov(mov); }
        };
        return (
            <div className={`bit-det-section bit-det-${color}`}>
                <div className="bit-det-section-header">
                    <span className="bit-det-section-label">{label} · {color === 'salida' ? b.horaS : b.horaI}</span>
                    <button className="bit-det-edit-btn" onClick={handleEditClick}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Editar
                    </button>
                </div>
                {mov.conductor && <div className="bit-det-row"><span className="bit-det-lbl">Conductor</span><span className="bit-det-val">{mov.conductor}{mov.cedula ? ' · ' + mov.cedula : ''}</span></div>}
                {mov.empresa && <div className="bit-det-row"><span className="bit-det-lbl">Empresa</span><span className="bit-det-val">{mov.empresa}</span></div>}
                {mov.destino && <div className="bit-det-row"><span className="bit-det-lbl">Destino</span><span className="bit-det-val">{mov.destino}</span></div>}
                {mov.actividad && <div className="bit-det-row"><span className="bit-det-lbl">Actividad</span><span className="bit-det-val">{mov.actividad}</span></div>}
            </div>
        );
    };

    return (
        <div className="modal-overlay bit-det-overlay" onClick={onClose}>
            <div className="modal-card bit-det-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bit-det-header">
                    <div className="bit-det-placa-row">
                        <span className="bit-placa">{b.placa}</span>
                        {b.tipoVehiculo && <span className="bit-tipo">{b.tipoVehiculo}</span>}
                        <span className={`bit-badge bit-badge-${b.status}`}>
                            {b.status === 'completo' ? 'Completado' : b.status === 'en-campo' ? 'En campo' : 'Solo ingreso'}
                        </span>
                    </div>
                    <span className="bit-det-counter">{idx + 1} / {total}</span>
                </div>

                {/* Sections */}
                <MovSection mov={b.salida} label="↑ SALIDA" color="salida" />
                <MovSection mov={b.ingreso} label="↓ INGRESO" color="ingreso" />

                {/* Actions */}
                <div className="bit-det-actions">
                    <button className="bit-det-act-btn" onClick={handleCopy} title="Copiar"><IconCopy /></button>
                    <button className="bit-det-act-btn" onClick={handleShare} title="Compartir"><IconShare /></button>
                    <button className="bit-det-act-btn danger" onClick={() => onDeletePair(b, idx)} title="Eliminar">
                        <IconMinus />
                    </button>
                </div>

                {/* Navigation */}
                <div className="bit-det-nav">
                    <button className="bit-det-nav-btn" onClick={() => onChange(idx - 1)} disabled={!hasPrev}>← Anterior</button>
                    <button className="bit-det-nav-btn" onClick={() => onChange(idx + 1)} disabled={!hasNext}>Siguiente →</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal config Registro ─────────────────────────────────
const CFG_DEFAULTS = {
    ubicacion: 'EPF', empresaAutoriza: 'EP Petroecuador',
    conSalida: 'Sale al', conIngreso: 'Ingresa al',
    conTitHombre: 'el Sr.', conTitMujer: 'la Srta.',
    conCedula: 'cc:', conEmpresa: 'de', conPlaca: 'de Placas',
    conVehiculo: '',
};
const ModalRegistroConfig = ({ config, onSave, onClose }) => {
    const [local, setLocal] = useState({ ...CFG_DEFAULTS, ...config });
    const f = key => e => setLocal(l => ({ ...l, [key]: e.target.value }));
    const Row = ({ k, label, placeholder }) => (
        <ModalField name={k} label={label} placeholder={placeholder} value={local[k]} autoFilled={false} onChange={f(k)} />
    );
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>Configurar Narrativa</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 11, color: '#818cf8', margin: 0, fontWeight: 700 }}>DESTINO / UBICACIÓN</p>
                    <Row k="ubicacion"   label="NOMBRE DEL LUGAR (para ingresos)"  placeholder="EPF" />
                    <Row k="conSalida"   label="CONECTOR SALIDA"                    placeholder="Sale al" />
                    <Row k="conIngreso"  label="CONECTOR INGRESO"                   placeholder="Ingresa al" />
                    <p style={{ fontSize: 11, color: '#818cf8', margin: 0, fontWeight: 700 }}>CONDUCTOR</p>
                    <Row k="conTitHombre" label="TÍTULO MASCULINO"                  placeholder="el Sr." />
                    <Row k="conTitMujer"  label="TÍTULO FEMENINO"                   placeholder="la Srta." />
                    <p style={{ fontSize: 11, color: '#818cf8', margin: 0, fontWeight: 700 }}>OTROS CONECTORES</p>
                    <Row k="conCedula"   label="PREFIJO CÉDULA"                     placeholder="cc:" />
                    <Row k="conEmpresa"  label="PREFIJO EMPRESA"                    placeholder="de" />
                    <Row k="conVehiculo" label="ACCIÓN VEHÍCULO (vacío = auto)"     placeholder="conduciendo el / conduciendo la" />
                    <Row k="conPlaca"    label="PREFIJO PLACA"                       placeholder="de Placas" />
                    <p style={{ fontSize: 11, color: '#818cf8', margin: 0, fontWeight: 700 }}>EXCEL / WORD</p>
                    <Row k="empresaAutoriza" label="EMPRESA AUTORIZANTE (default)"  placeholder="EP Petroecuador" />
                    <p style={{ fontSize: 11, color: '#555', margin: 0, lineHeight: 1.5 }}>
                        Deja "Acción vehículo" vacío para detectar el/la automáticamente según el tipo.
                    </p>
                </div>
                <div style={{ padding: '0 16px 16px' }}>
                    <button className="modal-btn active" onClick={() => { onSave(local); onClose(); }}>
                        Guardar configuración
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Helper: drag con mouse equivalente al swipe táctil ─────
// Adjunta onMouseDown que escucha mousemove/mouseup en window.
// onDragEnd(dx) recibe el desplazamiento horizontal al soltar.
// Marca ref.current.didDrag=true para que onClick lo ignore.
const addMouseSwipe = (ref, onDragEnd) => ({
    onMouseDown: (e) => {
        if (e.button !== 0) return; // solo botón izquierdo
        ref.current = { startX: e.clientX, startY: e.clientY, moved: false, vertScroll: false, didDrag: false };
        const onMove = (me) => {
            const dx = me.clientX - ref.current.startX;
            const dy = me.clientY - ref.current.startY;
            if (!ref.current.moved && !ref.current.vertScroll) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                if (Math.abs(dy) > Math.abs(dx)) { ref.current.vertScroll = true; return; }
                ref.current.moved = true;
            }
        };
        const onUp = (me) => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            if (!ref.current.moved) return;
            ref.current.didDrag = true;
            onDragEnd(me.clientX - ref.current.startX);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    },
});

// ── Tarjeta de movimiento ─────────────────────────────────
const MovCard = ({ m, count = 1, selectMode, selected, onToggleSelect, onOpenDetail, onDelete, onEdit, onCopy, onShare, swipedMovId, setSwipedMovId, movSwipeRef, onEditHora, onGoToReg }) => {
    const isSwiped = swipedMovId === m._id;
    return (
        <div className={`mov-item${selected ? ' mov-selected' : ''}${m._pending ? ' mov-pending' : ''}`} data-movid={m._id}>
            {!selectMode && !m._pending && (
                <div className="mov-actions" onClick={e => e.stopPropagation()}>
                    <button className="mov-act-btn danger" title="Eliminar" onClick={() => { onDelete(m._id); setSwipedMovId(null); }}><IconMinus /></button>
                    <button className="mov-act-btn" title="Editar" onClick={() => { onEdit(m); setSwipedMovId(null); }}><IconPencil /></button>
                    <button className="mov-act-btn" title="Copiar" onClick={() => { onCopy(m); setSwipedMovId(null); }}><IconCopy /></button>
                    <button className="mov-act-btn" title="Compartir" onClick={() => { onShare(m); setSwipedMovId(null); }}><IconShare /></button>
                </div>
            )}
            <div
                className={`mov-item-inner ${m.tipo}${isSwiped ? ' mov-item-swiped' : ''}`}
                onTouchStart={e => {
                    movSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false };
                }}
                onTouchMove={e => {
                    const dx = e.touches[0].clientX - movSwipeRef.current.startX;
                    const dy = e.touches[0].clientY - movSwipeRef.current.startY;
                    if (!movSwipeRef.current.moved && !movSwipeRef.current.vertScroll) {
                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                        if (Math.abs(dy) > Math.abs(dx)) { movSwipeRef.current.vertScroll = true; return; }
                        movSwipeRef.current.moved = true;
                    }
                    if (movSwipeRef.current.moved) e.preventDefault();
                }}
                onTouchEnd={e => {
                    if (!movSwipeRef.current.moved) return;
                    const dx = e.changedTouches[0].clientX - movSwipeRef.current.startX;
                    if (isSwiped) {
                        if (dx < -30) setSwipedMovId(null);
                    } else {
                        if (dx > 55) setSwipedMovId(m._id);
                        else if (dx < -55 && !m._pending) { onGoToReg(m._id); }
                    }
                }}
                {...addMouseSwipe(movSwipeRef, dx => {
                    if (isSwiped) {
                        if (dx < -30) setSwipedMovId(null);
                    } else {
                        if (dx > 55) setSwipedMovId(m._id);
                        else if (dx < -55 && !m._pending) onGoToReg(m._id);
                    }
                })}
                onClick={() => {
                    if (movSwipeRef.current?.didDrag) { movSwipeRef.current.didDrag = false; return; }
                    if (isSwiped) { setSwipedMovId(null); return; }
                    selectMode ? onToggleSelect(m._id) : onOpenDetail(m);
                }}
            >
                {/* Card body: badge izquierdo + info derecha */}
                <div className="mov-card-body">
                    {selectMode && (
                        <input type="checkbox" className="mov-check" checked={selected}
                            onChange={() => onToggleSelect(m._id)} onClick={e => e.stopPropagation()} />
                    )}
                    {/* Badge: N° + hora + botón editar en esquina */}
                    <div className={`mov-icon ${m.tipo}`}>
                        {!selectMode && !m._pending && (
                            <button className="mov-hora-edit-btn" title="Editar hora"
                                onClick={e => { e.stopPropagation(); onEditHora(m._id); }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                                </svg>
                            </button>
                        )}
                        <span className="mov-count">{count}</span>
                        <span className="mov-hora-small">{m.hora}</span>
                    </div>
                    {/* Info: fila 1 TIPO·PLACA·EMPRESA / fila 2 conductor + destino */}
                    <div className="mov-info">
                        <div className={`mov-info-r1 ${m.tipo}`}>
                            <span className="mov-tipo-tag">{m.tipo === 'ingreso' ? 'INGRESO' : 'SALIDA'}</span>
                            {' · '}
                            <span className="mov-placa-code">{m.placa}</span>
                            {m.empresa && <>{' · '}<span className="mov-empresa-r1">{m.empresa}</span></>}
                        </div>
                        <div className="mov-info-r2">
                            <span className="mov-conductor-ci">
                                {m.conductor || '—'}{m.cedula ? `/CI: ${m.cedula}` : ''}
                            </span>
                            {m.destino && <span className="mov-destino-r2">{m.destino.toUpperCase()}</span>}
                        </div>
                    </div>
                    {m._pending && (
                        <span className="mov-pending-dot" title="Sin conexión — se sincronizará al reconectar" style={{ marginLeft: 'auto', alignSelf: 'center' }} />
                    )}
                </div>
                {/* Actividad — debajo del body */}
                {m.actividad && !/^vac[ií]o$/i.test(m.actividad.trim()) && (
                    <div className="mov-actividad">{m.actividad}</div>
                )}
            </div>
        </div>
    );
};

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
const EMPTY_VEHICULO = { placa: '', marca: '', color: '', tipoVehiculo: '', empresa: '', caf: '' };

const ModalVehiculo = ({ onClose, onGuardado, editData }) => {
    const [form, setForm] = useState(editData
        ? { placa: editData.placa, marca: editData.marca || '', color: editData.color || '', tipoVehiculo: editData.tipoVehiculo || '', empresa: editData.empresa || '', caf: editData.caf || '' }
        : EMPTY_VEHICULO
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tipoSugs, setTipoSugs] = useState([]);
    const [existente, setExistente] = useState(null);

    const handleChange = e => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: name === 'placa' ? value.toUpperCase() : value }));
        setError('');
    };

    const handleTipoChange = e => {
        const val = e.target.value;
        setForm(f => ({ ...f, tipoVehiculo: val }));
        setTipoSugs(TIPO_VEHICULO_OPTS.filter(o => !val || o.toLowerCase().includes(val.toLowerCase())));
        setError('');
    };

    const handleSubmit = async () => {
        if (!form.placa) { setError('La placa es obligatoria'); return; }
        setLoading(true);
        setExistente(null);
        try {
            if (editData?._id) {
                const { data } = await api.put(`/vehiculos/${editData._id}`, form);
                await cacheVehiculo(data.vehiculo).catch(() => {});
                onGuardado(data.vehiculo);
            } else {
                const { data } = await api.post('/vehiculos', form);
                await cacheVehiculo(data.vehiculo).catch(() => {});
                onGuardado(data.vehiculo);
            }
            onClose();
        } catch (err) {
            const status = err.response?.status;
            const msg    = err.response?.data?.message || 'Error al guardar';
            if (status === 409 && err.response?.data?.existing) {
                setExistente(err.response.data.existing);
                setError('Esta placa ya está en la base de datos (fue creada al registrar un movimiento). Puedes actualizar sus datos:');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditarExistente = async () => {
        if (!existente?._id) return;
        setLoading(true);
        try {
            const { data } = await api.put(`/vehiculos/${existente._id}`, form);
            await cacheVehiculo(data.vehiculo).catch(() => {});
            onGuardado(data.vehiculo);
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
                        <TextSugField name="tipoVehiculo" label="TIPO" placeholder="SUV, Sedán..."
                            value={form.tipoVehiculo} onChange={handleTipoChange}
                            onFocus={() => setTipoSugs(TIPO_VEHICULO_OPTS.filter(o => !form.tipoVehiculo || o.toLowerCase().includes(form.tipoVehiculo.toLowerCase())))}
                            onClearSugs={() => setTipoSugs([])}
                            suggestions={tipoSugs}
                            onSelect={s => { setForm(f => ({ ...f, tipoVehiculo: s })); setTipoSugs([]); }} />
                        <ModalField name="empresa" label="EMPRESA" placeholder="Empresa S.A." value={form.empresa} {...fp} />
                    </div>
                    <ModalField name="caf" label="CAF" placeholder="Código de acceso" value={form.caf} {...fp} />
                </div>
                {error && <p className="modal-error">{error}</p>}
                {existente ? (
                    <button className="modal-btn active" onClick={handleEditarExistente} disabled={loading}>
                        {loading ? 'Guardando...' : '✏️ Actualizar datos de este vehículo'}
                    </button>
                ) : (
                    <button className={`modal-btn ${form.placa ? 'active' : ''}`} onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Guardando...' : editData ? 'Guardar cambios' : 'Registrar vehículo'}
                    </button>
                )}
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
        vehiculo.caf ? `CAF: ${vehiculo.caf}` : '',
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

// ── Modal importar vehículos (CSV / Excel) ────────────────
const ModalImportVehiculos = ({ onClose, onGuardado }) => {
    const [step, setStep] = useState('upload');
    const [parsedRows, setParsedRows] = useState([]);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [choices, setChoices] = useState({});

    const norm = h => String(h || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const mapHeader = h => {
        const n = norm(h);
        if (n.includes('placa') || n === 'plate') return 'placa';
        if (n.includes('marca') || n.includes('brand') || n.includes('make')) return 'marca';
        if (n.includes('color')) return 'color';
        if (n.includes('tipo') || n === 'type') return 'tipoVehiculo';
        if (n.includes('empresa') || n.includes('company')) return 'empresa';
        return null;
    };

    const handleFile = e => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setError('');
        setParsedRows([]);
        const reader = new FileReader();
        reader.onload = async evt => {
            try {
                const XLSX = await import('xlsx');
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                if (rows.length < 2) { setError('El archivo está vacío o no tiene datos'); return; }
                const hMap = rows[0].map(mapHeader);
                const parsed = rows.slice(1)
                    .filter(r => r.some(v => String(v).trim()))
                    .map(r => {
                        const obj = {};
                        hMap.forEach((f, i) => { if (f) obj[f] = String(r[i] || '').trim(); });
                        return obj;
                    })
                    .filter(v => v.placa);
                if (!parsed.length) { setError('No se encontraron filas válidas. Asegúrate de que el encabezado incluya PLACA.'); return; }
                setParsedRows(parsed);
            } catch { setError('No se pudo leer el archivo. Verifica que sea CSV o Excel válido.'); }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        setLoading(true); setError('');
        try {
            const { data } = await api.post('/vehiculos/bulk', { vehiculos: parsedRows });
            setResult(data);
            if (data.conflicts.length > 0) {
                const defaultChoices = {};
                data.conflicts.forEach(c => { defaultChoices[c.existing.placa] = 'keep'; });
                setChoices(defaultChoices);
                setStep('conflicts');
            } else {
                setStep('done');
                onGuardado();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al importar');
        } finally { setLoading(false); }
    };

    const handleResolve = async () => {
        setLoading(true); setError('');
        try {
            const toUpdate = result.conflicts.filter(c => choices[c.existing.placa] === 'update');
            await Promise.all(toUpdate.map(c =>
                api.put(`/vehiculos/${c.existing._id}`, {
                    marca: c.incoming.marca || c.existing.marca,
                    color: c.incoming.color || c.existing.color,
                    tipoVehiculo: c.incoming.tipoVehiculo || c.existing.tipoVehiculo,
                    empresa: c.incoming.empresa !== undefined ? c.incoming.empresa : c.existing.empresa,
                })
            ));
            setStep('done');
            onGuardado();
        } catch { setError('Error al aplicar los cambios'); }
        finally { setLoading(false); }
    };

    if (step === 'upload') return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Importar vehículos</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                    Sube un archivo <strong style={{ color: '#4ade80' }}>CSV</strong> o <strong style={{ color: '#4ade80' }}>Excel (.xlsx)</strong>.<br />
                    Encabezados reconocidos: <span style={{ color: '#818cf8' }}>PLACA, MARCA, COLOR, TIPO, EMPRESA</span>
                </p>
                <label className="import-dropzone">
                    <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} style={{ display: 'none' }} />
                    {fileName ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                            <div style={{ color: '#ddd', fontWeight: 700, fontSize: 13 }}>{fileName}</div>
                            {parsedRows.length > 0
                                ? <div style={{ color: '#4ade80', marginTop: 6, fontSize: 13 }}>{parsedRows.length} registros detectados</div>
                                : <div style={{ color: '#f87171', marginTop: 6, fontSize: 12 }}>Sin registros válidos</div>}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#555' }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 10 }}>
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 15V5" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div style={{ fontSize: 13 }}>Toca para seleccionar CSV o Excel</div>
                        </div>
                    )}
                </label>
                {parsedRows.length > 0 && (
                    <div style={{ background: '#111', borderRadius: 10, padding: 12, fontSize: 12, color: '#888', maxHeight: 130, overflowY: 'auto' }}>
                        {parsedRows.slice(0, 6).map((v, i) => (
                            <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: 8 }}>
                                <span style={{ color: '#818cf8', flexShrink: 0 }}>{v.placa}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[v.marca, v.empresa].filter(Boolean).join(' · ') || '—'}</span>
                            </div>
                        ))}
                        {parsedRows.length > 6 && <div style={{ color: '#444', marginTop: 6 }}>+{parsedRows.length - 6} más...</div>}
                    </div>
                )}
                {error && <p className="modal-error">{error}</p>}
                <button className={`modal-btn ${parsedRows.length > 0 ? 'active' : ''}`}
                    onClick={handleImport} disabled={!parsedRows.length || loading}>
                    {loading ? 'Importando...' : parsedRows.length > 0 ? `Importar ${parsedRows.length} registros` : 'Selecciona un archivo primero'}
                </button>
            </div>
        </div>
    );

    if (step === 'conflicts') return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{result.conflicts.length} conflicto{result.conflicts.length !== 1 ? 's' : ''}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>{result.created} nuevos</span> importados. Las placas siguientes ya existen — elige qué conservar:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '48vh', overflowY: 'auto' }}>
                    {result.conflicts.map(c => (
                        <div key={c.existing.placa} style={{ background: '#111', borderRadius: 12, padding: 14, fontSize: 12 }}>
                            <div style={{ color: '#818cf8', fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>{c.existing.placa}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                                    <div style={{ color: '#555', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ACTUAL</div>
                                    <div style={{ color: '#ddd', fontWeight: 600 }}>{c.existing.marca || '—'}</div>
                                    <div style={{ color: '#888', marginTop: 2 }}>{c.existing.empresa || '—'}</div>
                                </div>
                                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                                    <div style={{ color: '#555', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>NUEVO</div>
                                    <div style={{ color: '#ddd', fontWeight: 600 }}>{c.incoming.marca || '—'}</div>
                                    <div style={{ color: '#888', marginTop: 2 }}>{c.incoming.empresa || '—'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[['keep', 'Mantener actual', '#818cf8'], ['update', 'Usar nuevo', '#4ade80']].map(([val, label, color]) => (
                                    <button key={val}
                                        onClick={() => setChoices(ch => ({ ...ch, [c.existing.placa]: val }))}
                                        style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${choices[c.existing.placa] === val ? color : '#2e2e2e'}`, background: choices[c.existing.placa] === val ? `${color}18` : '#1e1e1e', color: choices[c.existing.placa] === val ? color : '#666', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {error && <p className="modal-error">{error}</p>}
                <button className="modal-btn active" onClick={handleResolve} disabled={loading}>
                    {loading ? 'Aplicando...' : 'Aplicar selección'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ alignItems: 'center', gap: 18 }} onClick={e => e.stopPropagation()}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#4ade80" strokeWidth="2" />
                    <path d="M8 12l3 3 5-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Importación exitosa</div>
                <div style={{ color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
                    {result.created} vehículo{result.created !== 1 ? 's' : ''} nuevos importados
                    {result.conflicts.length > 0 && ` · ${result.conflicts.length} conflicto${result.conflicts.length !== 1 ? 's' : ''} resuelto${result.conflicts.length !== 1 ? 's' : ''}`}
                </div>
                <button className="modal-btn active" style={{ marginBottom: 0 }} onClick={onClose}>Listo</button>
            </div>
        </div>
    );
};

// ── Modal detalle vehículo ────────────────────────────────
const ModalDetalleVehiculo = ({ vehiculos, id, onClose, onEdit, onNavigate }) => {
    const idx = vehiculos.findIndex(v => v._id === id);
    const v   = vehiculos[idx];
    if (!v) return null;

    const campos = [
        { label: 'Marca',   val: v.marca },
        { label: 'Color',   val: v.color },
        { label: 'Tipo',    val: v.tipoVehiculo },
        { label: 'Empresa', val: v.empresa },
        { label: 'CAF',     val: v.caf },
    ].filter(c => c.val);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ maxWidth: 340 }} onClick={e => e.stopPropagation()}>
                {/* Cabecera */}
                <div className="modal-header">
                    <h3 style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 3, color: '#818cf8' }}>{v.placa}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Campos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '6px 0 14px' }}>
                    {campos.length > 0 ? campos.map(({ label, val }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e1e1e', paddingBottom: 10 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                            <span style={{ fontSize: 13, color: '#ddd', maxWidth: '68%', textAlign: 'right', wordBreak: 'break-word' }}>{val}</span>
                        </div>
                    )) : (
                        <p style={{ color: '#444', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>Sin datos adicionales registrados</p>
                    )}
                </div>

                {/* Botón editar */}
                <button
                    className="modal-btn active"
                    style={{ marginBottom: 10 }}
                    onClick={() => { onEdit(v); onClose(); }}
                >
                    ✏️ Editar este vehículo
                </button>

                {/* Navegación anterior / siguiente */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <button
                        onClick={() => onNavigate(vehiculos[idx - 1]?._id)}
                        disabled={idx === 0}
                        style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #2a2a2a',
                            background: idx === 0 ? '#111' : '#1a1a1a', color: idx === 0 ? '#333' : '#aaa',
                            cursor: idx === 0 ? 'default' : 'pointer', fontSize: 16,
                        }}
                    >←</button>
                    <span style={{ fontSize: 11, color: '#444', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {idx + 1} / {vehiculos.length}
                    </span>
                    <button
                        onClick={() => onNavigate(vehiculos[idx + 1]?._id)}
                        disabled={idx === vehiculos.length - 1}
                        style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #2a2a2a',
                            background: idx === vehiculos.length - 1 ? '#111' : '#1a1a1a',
                            color: idx === vehiculos.length - 1 ? '#333' : '#aaa',
                            cursor: idx === vehiculos.length - 1 ? 'default' : 'pointer', fontSize: 16,
                        }}
                    >→</button>
                </div>
            </div>
        </div>
    );
};

// ── Pantalla Placas DB ────────────────────────────────────
const PantallaPlacasDB = () => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editVehiculo, setEditVehiculo] = useState(null);
    const [qrVehiculo, setQrVehiculo] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [swipedVehId, setSwipedVehId] = useState(null);
    const [detalleId, setDetalleId] = useState(null);   // ID del vehículo en modal detalle
    const vehSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false, didDrag: false });

    const cargar = async () => {
        setLoading(true);
        setLoadError(false);
        setFromCache(false);
        try {
            const { data } = await api.get('/vehiculos');
            setVehiculos(data.vehiculos);
            // Actualizar caché offline con todos los vehículos recibidos
            data.vehiculos.forEach(v => cacheVehiculo(v).catch(() => {}));
        } catch {
            // Sin conexión: intentar cargar desde caché local
            try {
                const cached = await getVehiculosCache();
                if (cached.length > 0) {
                    setVehiculos(cached);
                    setFromCache(true);
                } else {
                    setLoadError(true);
                }
            } catch {
                setLoadError(true);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    // Actualización optimista local tras guardar (sin recargar todo)
    const onGuardado = (savedVehiculo) => {
        if (!savedVehiculo) { cargar(); return; }
        setVehiculos(prev => {
            const idx = prev.findIndex(v => v._id === savedVehiculo._id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = savedVehiculo;
                return next;
            }
            return [...prev, savedVehiculo].sort((a, b) => a.placa.localeCompare(b.placa));
        });
    };

    const sq = search.toLowerCase();
    const filtrados = sq
        ? vehiculos.filter(v =>
            v.placa.toLowerCase().includes(sq) ||
            (v.empresa || '').toLowerCase().includes(sq) ||
            (v.marca || '').toLowerCase().includes(sq) ||
            (v.conductor || '').toLowerCase().includes(sq))
        : vehiculos;

    // Eliminación optimista: quita la fila de inmediato, luego sincroniza con el servidor
    const handleDelete = async (id, placa) => {
        setVehiculos(prev => prev.filter(v => v._id !== id));
        deleteCachedVehiculo(placa).catch(() => {});
        try { await api.delete(`/vehiculos/${id}`); } catch { }
    };

    const qrData = v => [
        `PLACA: ${v.placa}`,
        v.marca ? `MARCA: ${v.marca}` : '',
        v.color ? `COLOR: ${v.color}` : '',
        v.tipoVehiculo ? `TIPO: ${v.tipoVehiculo}` : '',
        v.empresa ? `EMPRESA: ${v.empresa}` : '',
        v.caf ? `CAF: ${v.caf}` : '',
    ].filter(Boolean).join('\n');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>

            {/* Barra búsqueda */}
            <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="ws-search-bar" style={{ padding: 0, flex: 1, margin: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#555', flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws-search-input" type="text"
                        placeholder="Placa, marca, empresa o conductor..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="ws-search-clear" onClick={() => setSearch('')}>✕</button>}
                </div>
                <button className="ws-topbar-btn" title="Importar CSV / Excel" onClick={() => setShowImport(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 15V5"
                            stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <span style={{ color: '#555', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {filtrados.length} reg.
                </span>
            </div>

            {/* Aviso de datos cargados desde caché offline */}
            {fromCache && (
                <div style={{ margin: '0 16px 6px', padding: '7px 12px', background: '#1a1400', border: '1px solid #3a2e00', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#a87f00' }}>📴 Mostrando datos guardados localmente</span>
                    <button onClick={cargar} style={{ background: 'none', border: 'none', color: '#fbbf24', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                        Actualizar
                    </button>
                </div>
            )}

            {/* Tabla de vehículos */}
            {loading
                ? <p className="ws-empty">Cargando...</p>
                : loadError
                    ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                            <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>
                                ⚠️ No se pudo cargar la lista de vehículos
                            </p>
                            <button
                                onClick={cargar}
                                style={{ background: '#222', border: '1px solid #444', color: '#ddd', borderRadius: 8, padding: '7px 18px', fontSize: 12, cursor: 'pointer' }}
                            >
                                Reintentar
                            </button>
                        </div>
                    )
                : filtrados.length === 0
                    ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'No hay vehículos registrados'}</p>
                    : (
                        <div className="ftable-scroll">
                            {/* Encabezado */}
                            <div className="ftable-head" style={{ display: 'grid', gridTemplateColumns: '90px 110px 90px 120px 1fr' }}>
                                {['PLACA', 'MARCA', 'COLOR', 'TIPO', 'EMPRESA'].map(h => (
                                    <span key={h} className="ftable-head-cell">{h}</span>
                                ))}
                            </div>
                            <div className="ftable">
                                {filtrados.map(v => {
                                    const isSwiped = swipedVehId === v._id;
                                    return (
                                        <div key={v._id} className="ftable-row-wrap">
                                            <div className="ftable-actions" onClick={ev => ev.stopPropagation()}>
                                                <button className="plist-act-btn" title="Editar"    onClick={() => { setEditVehiculo(v); setSwipedVehId(null); }}><IconPencil /></button>
                                                <button className="plist-act-btn" title="Copiar"    onClick={() => { handleCopyText(vToText(v)); setSwipedVehId(null); }}><IconCopy /></button>
                                                <button className="plist-act-btn" title="Compartir" onClick={() => { handleShareText(vToText(v)); setSwipedVehId(null); }}><IconShare /></button>
                                                <button className="plist-act-btn" title="Ver QR"    onClick={() => { setQrVehiculo(v); setSwipedVehId(null); }}><IconQR /></button>
                                                <button className="plist-act-btn danger" title="Eliminar" onClick={() => { handleDelete(v._id, v.placa); setSwipedVehId(null); }}><IconMinus /></button>
                                            </div>
                                            <div
                                                className={`ftable-row${isSwiped ? ' ftable-swiped-5' : ''}`}
                                                style={{ display: 'grid', gridTemplateColumns: '90px 110px 90px 120px 1fr' }}
                                                onTouchStart={ev => { vehSwipeRef.current = { startX: ev.touches[0].clientX, startY: ev.touches[0].clientY, moved: false, vertScroll: false }; }}
                                                onTouchMove={ev => {
                                                    const dx = ev.touches[0].clientX - vehSwipeRef.current.startX;
                                                    const dy = ev.touches[0].clientY - vehSwipeRef.current.startY;
                                                    if (!vehSwipeRef.current.moved && !vehSwipeRef.current.vertScroll) {
                                                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                                        if (Math.abs(dy) > Math.abs(dx)) { vehSwipeRef.current.vertScroll = true; return; }
                                                        vehSwipeRef.current.moved = true;
                                                    }
                                                    if (vehSwipeRef.current.moved) ev.preventDefault();
                                                }}
                                                onTouchEnd={ev => {
                                                    if (!vehSwipeRef.current.moved) return;
                                                    const dx = ev.changedTouches[0].clientX - vehSwipeRef.current.startX;
                                                    if (isSwiped) { if (dx < -30) setSwipedVehId(null); }
                                                    else { if (dx > 55) setSwipedVehId(v._id); }
                                                }}
                                                {...addMouseSwipe(vehSwipeRef, dx => {
                                                    if (isSwiped) { if (dx < -30) setSwipedVehId(null); }
                                                    else { if (dx > 55) setSwipedVehId(v._id); }
                                                })}
                                                onClick={() => {
                                                    if (vehSwipeRef.current?.didDrag) { vehSwipeRef.current.didDrag = false; return; }
                                                    if (isSwiped) { setSwipedVehId(null); return; }
                                                    setDetalleId(v._id);
                                                }}
                                            >
                                                <span className="ftable-cell ftable-cell-accent" style={{ width: 90 }}>{v.placa}</span>
                                                <span className="ftable-cell" style={{ width: 110 }}>{(v.marca || '—').toUpperCase()}</span>
                                                <span className="ftable-cell ftable-cell-dim" style={{ width: 90 }}>{(v.color || '—').toUpperCase()}</span>
                                                <span className="ftable-cell ftable-cell-dim" style={{ width: 120 }}>{(v.tipoVehiculo || '—').toUpperCase()}</span>
                                                <span className="ftable-cell ftable-cell-flex">{(v.empresa || '—').toUpperCase()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
            }

            {/* FAB agregar */}
            <button className="placas-fab" onClick={() => setShowForm(true)}>+</button>

            {/* Modal detalle vehículo */}
            {detalleId && (
                <ModalDetalleVehiculo
                    vehiculos={filtrados}
                    id={detalleId}
                    onClose={() => setDetalleId(null)}
                    onEdit={v => { setEditVehiculo(v); setDetalleId(null); }}
                    onNavigate={newId => { if (newId) setDetalleId(newId); }}
                />
            )}

            {(showForm || editVehiculo) && (
                <ModalVehiculo
                    onClose={() => { setShowForm(false); setEditVehiculo(null); }}
                    onGuardado={onGuardado}
                    editData={editVehiculo}
                />
            )}
            {qrVehiculo && <ModalQR vehiculo={qrVehiculo} onClose={() => setQrVehiculo(null)} />}
            {showImport && (
                <ModalImportVehiculos
                    onClose={() => setShowImport(false)}
                    onGuardado={cargar}
                />
            )}
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
    const [vista, setVista] = useState('movimientos');
    const [detailIdx, setDetailIdx] = useState(null);
    const [bitDetailIdx, setBitDetailIdx] = useState(null);
    const [sortDesc, setSortDesc] = useState(true);
    const [swipedBitIdx, setSwipedBitIdx] = useState(null);
    const [editIngresoBit, setEditIngresoBit] = useState(null);
    const bitSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });

    const bitacora = useMemo(() => {
        const sorted = [...movs].sort((a, b) => (a.hora || '').localeCompare(b.hora || '') || (a._id || '').localeCompare(b._id || ''));
        const openSalidas = {};
        const pairs = [];
        for (const mov of sorted) {
            if (mov.tipo === 'salida') {
                if (!openSalidas[mov.placa]) openSalidas[mov.placa] = [];
                openSalidas[mov.placa].push(mov);
            } else if (mov.tipo === 'ingreso') {
                if (openSalidas[mov.placa]?.length > 0) {
                    const sal = openSalidas[mov.placa].shift();
                    const condSal = (sal.conductor || '').trim();
                    const condIng = (mov.conductor || '').trim();
                    pairs.push({
                        placa: mov.placa, salida: sal, ingreso: mov,
                        horaS: sal.hora, horaI: mov.hora,
                        conductor: condSal.toLowerCase() === condIng.toLowerCase()
                            ? (condSal || '—')
                            : `${condSal || '—'} / ${condIng || '—'}`,
                        conductorChanged: condSal.toLowerCase() !== condIng.toLowerCase(),
                        marca: sal.marca || mov.marca, empresa: sal.empresa || mov.empresa,
                        tipoVehiculo: sal.tipoVehiculo || mov.tipoVehiculo,
                        destino: sal.destino || mov.destino,
                        actividad: mov.actividad || sal.actividad || '',
                        status: 'completo',
                    });
                } else {
                    pairs.push({
                        placa: mov.placa, salida: null, ingreso: mov,
                        horaS: '—', horaI: mov.hora,
                        conductor: mov.conductor || '—', conductorChanged: false,
                        marca: mov.marca, empresa: mov.empresa,
                        tipoVehiculo: mov.tipoVehiculo, destino: mov.destino,
                        actividad: mov.actividad || '',
                        status: 'solo-ingreso',
                    });
                }
            }
        }
        for (const sals of Object.values(openSalidas)) {
            for (const s of sals) {
                pairs.push({
                    placa: s.placa, salida: s, ingreso: null,
                    horaS: s.hora, horaI: '—',
                    conductor: s.conductor || '—', conductorChanged: false,
                    marca: s.marca, empresa: s.empresa,
                    tipoVehiculo: s.tipoVehiculo, destino: s.destino,
                    actividad: s.actividad || '',
                    status: 'en-campo',
                });
            }
        }
        // Ordenar por el primer evento registrado (mínimo entre horaS y horaI)
        const firstHora = p => {
            const times = [p.horaS, p.horaI].filter(h => h && h !== '—');
            return times.length ? times.slice().sort()[0] : '99:99';
        };
        return pairs.sort((a, b) => firstHora(a).localeCompare(firstHora(b)));
    }, [movs]);

    const bitPlacaCounts = useMemo(() => {
        const c = {};
        bitacora.forEach(b => { c[b.placa] = (c[b.placa] || 0) + 1; });
        return c;
    }, [bitacora]);

    const handleShareFlujo = async () => {
        const fl = new Date(fecha + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const text = `FLUJO — ${fl}\nTotal: ${movs.length} movimiento${movs.length !== 1 ? 's' : ''}\n\n` +
            movs.map((m, i) => `${i + 1}. [${(m.tipo || 'MOV').toUpperCase()}] ${m.placa}\n   ${m.conductor || '—'} · ${m.empresa || '—'}\n   → ${m.destino || '—'}  ${m.hora}`).join('\n\n');
        if (navigator.share) { await navigator.share({ title: 'FLUJO — ' + fecha, text }).catch(() => {}); }
        else { navigator.clipboard?.writeText(text); }
    };

    const sq = search.toLowerCase();
    const filtrados = sq
        ? movs.filter(m => m.placa.toLowerCase().includes(sq) || (m.conductor || '').toLowerCase().includes(sq))
        : movs;
    const movsOrdered = sortDesc ? [...filtrados].reverse() : [...filtrados];

    const isPetro = m => m.empresa?.toLowerCase().includes('petroecuador');
    const uniqueVehicles = Object.values(movs.reduce((acc, m) => {
        if (!acc[m.placa] || (!acc[m.placa].empresa && m.empresa)) acc[m.placa] = m;
        return acc;
    }, {}));
    const petroecuador = uniqueVehicles.filter(isPetro).length;
    const contratistas = uniqueVehicles.filter(m => !isPetro(m)).length;

    const fechaLarga = new Date(fecha + 'T12:00:00').toLocaleDateString('es-EC', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const doExport = async fmt => {
        setShowExport(false);
        if (vista === 'bitacora' || fmt === 'bitacora') {
            const XLSX = await import('xlsx');
            const cols = ['#', 'Placa', 'Tipo Vehículo', 'Marca', 'Empresa', 'Hora Salida', 'Hora Ingreso', 'Conductor', 'Destino', 'Estado'];
            const estadoLabel = { completo: 'Completado', 'en-campo': 'En campo', 'solo-ingreso': 'Solo ingreso' };
            const rows = bitacora.map((b, i) => [i + 1, b.placa, b.tipoVehiculo || '—', b.marca || '—', b.empresa || '—', b.horaS, b.horaI, b.conductor, b.destino || '—', estadoLabel[b.status] || b.status]);
            const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
            ws['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 13 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Bitácora');
            XLSX.writeFile(wb, `bitacora_${fecha}.xlsx`);
        } else {
            exportMovimientos(movs, fmt, `flujo_${fecha}`);
        }
    };

    const detailMov = detailIdx !== null ? movsOrdered[detailIdx] : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 8px' }}>
                <button className="ws-topbar-btn" style={{ flexShrink: 0 }} onClick={onBack}><IconArrowLeft /></button>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#aaa', textTransform: 'capitalize' }}>{fechaLarga}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{movs.length} mov. · {bitacora.length} en bitácora</div>
                </div>
                <button className="ws-topbar-btn" style={{ color: '#818cf8', marginRight: 4 }} onClick={handleShareFlujo} title="Compartir">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="6" cy="12" r="2.2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="17" cy="6" r="2.2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="17" cy="18" r="2.2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 11l7-3.5M8 13l7 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                </button>
                <button className="ws-topbar-btn" style={{ color: '#4ade80' }} onClick={() => setShowExport(s => !s)} title="Exportar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Menú exportar */}
            {showExport && (
                <div style={{ margin: '0 16px 8px', background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 12, overflow: 'hidden' }}>
                    {vista === 'movimientos' ? (<>
                        <div className="export-menu-item" onClick={() => doExport('xls')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#4ade80" strokeWidth="2" /><path d="M9 3v18M3 9h6M3 15h6" stroke="#4ade80" strokeWidth="2" /><path d="M12 8l3 4-3 4M15 12h6" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            Excel (.xls)
                        </div>
                        <div className="export-menu-item" onClick={() => doExport('csv')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#818cf8" strokeWidth="2" /><path d="M14 2v6h6M8 13h8M8 17h5" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" /></svg>
                            CSV (.csv)
                        </div>
                    </>) : (
                        <div className="export-menu-item" onClick={() => doExport('bitacora')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#4ade80" strokeWidth="2" /><path d="M9 3v18M3 9h6M3 15h6" stroke="#4ade80" strokeWidth="2" /></svg>
                            Exportar Bitácora (.xlsx)
                        </div>
                    )}
                </div>
            )}

            {/* Contadores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 10px' }}>
                <div className="ws-counter-card">
                    <span className="ws-counter-val">{contratistas}</span>
                    <span className="ws-counter-label">CONTRATISTAS</span>
                </div>
                <div className="ws-counter-card">
                    <span className="ws-counter-val">{petroecuador}</span>
                    <span className="ws-counter-label">EP PETRO.</span>
                </div>
            </div>

            {/* Tabs Movimientos / Bitácora */}
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px' }}>
                <button className={`ws-vista-tab${vista === 'movimientos' ? ' active' : ''}`}
                    onClick={() => setVista('movimientos')}>
                    Movimientos
                </button>
                <button className={`ws-vista-tab${vista === 'bitacora' ? ' active' : ''}`}
                    onClick={() => setVista('bitacora')}>
                    Bitácora
                </button>
            </div>

            {/* Búsqueda + ordenamiento (solo movimientos) */}
            {vista === 'movimientos' && (
                <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', alignItems: 'center' }}>
                    <div className="ws-search-bar" style={{ flex: 1, background: 'transparent' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#555', flexShrink: 0 }}>
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input className="ws-search-input" type="text" placeholder="Buscar por placa o conductor..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                        {search && <button className="ws-search-clear" onClick={() => setSearch('')}>✕</button>}
                    </div>
                    <button
                        onClick={() => setSortDesc(d => !d)}
                        title={sortDesc ? 'Más reciente primero' : 'Más antiguo primero'}
                        style={{
                            flexShrink: 0, width: 36, height: 36, borderRadius: 10,
                            border: '1px solid #2e2e2e', background: '#1a1a1a',
                            color: '#818cf8', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            {sortDesc ? (
                                <>
                                    <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </>
                            ) : (
                                <>
                                    <path d="M3 18h18M7 12h10M11 6h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </>
                            )}
                        </svg>
                    </button>
                </div>
            )}

            {/* Lista de movimientos */}
            {vista === 'movimientos' && (
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {movsOrdered.length === 0
                        ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'Sin movimientos'}</p>
                        : (() => {
                            const counts = {};
                            filtrados.forEach(m => { counts[m.placa] = (counts[m.placa] || 0) + 1; });
                            return movsOrdered.map((m, idx) => (
                                <div key={m._id} className="mov-item" onClick={() => setDetailIdx(idx)} style={{ cursor: 'pointer' }}>
                                    <div className="mov-item-inner">
                                        <div className={`mov-icon ${m.tipo}`}>
                                            <span className="mov-count">{counts[m.placa] || 1}</span>
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
                                            {m.actividad && !/^vac[ií]o$/i.test(m.actividad.trim()) && (
                                                <span className="mov-actividad">{m.actividad}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ));
                        })()}
                </div>
            )}

            {/* Bitácora */}
            {vista === 'bitacora' && (
                <div className="ws-bitacora">
                    <div className="bit-toolbar">
                        <span className="bit-toolbar-count">{bitacora.length} registro{bitacora.length !== 1 ? 's' : ''}</span>
                    </div>
                    {bitacora.length === 0 ? (
                        <p className="ws-empty">Sin movimientos para consolidar</p>
                    ) : (
                        <div className="bit-table-scroll">
                            <div className="bit-table">
                                <div className="bit-table-header">
                                    <div className="bit-hcell">N°</div>
                                    <div className="bit-hcell">Salida</div>
                                    <div className="bit-hcell">Ingreso</div>
                                    <div className="bit-hcell">Placa</div>
                                    <div className="bit-hcell">Conductor / Empresa</div>
                                    <div className="bit-hcell">Actividad / Observación</div>
                                    <div className="bit-hcell" style={{ textAlign: 'right' }}>Estado</div>
                                </div>
                                <div className="bit-list">
                                    {bitacora.map((b, i) => {
                                        const bText = [`Bitácora: ${b.placa}${b.tipoVehiculo ? ' · ' + b.tipoVehiculo : ''}`, `Conductor: ${b.conductor}`, b.empresa && `Empresa: ${b.empresa}`, b.destino && `Destino: ${b.destino}`, `Salida: ${b.horaS}  →  Ingreso: ${b.horaI}`].filter(Boolean).join('\n');
                                        const isSwiped = swipedBitIdx === i;
                                        const stMap = {
                                            completo:       { color: '#3ecf8e', bg: 'rgba(62,207,142,0.12)',  label: 'Completado'   },
                                            'en-campo':     { color: '#e0a83e', bg: 'rgba(224,168,62,0.12)',  label: 'En campo'     },
                                            'solo-ingreso': { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', label: 'Solo ingreso' },
                                        };
                                        const st = stMap[b.status] || stMap['solo-ingreso'];
                                        return (
                                            <div key={i} className="bit-item">
                                                <div className="bit-actions" onClick={e => e.stopPropagation()}>
                                                    <button className="bit-act-btn" title="Copiar" onClick={() => { navigator.clipboard?.writeText(bText); setSwipedBitIdx(null); }}><IconCopy /></button>
                                                    <button className="bit-act-btn" title="Compartir" onClick={async () => { if (navigator.share) { await navigator.share({ title: 'Bitácora FLUJO', text: bText }).catch(() => {}); } else navigator.clipboard?.writeText(bText); setSwipedBitIdx(null); }}><IconShare /></button>
                                                </div>
                                                <div
                                                    className={`bit-row bit-${b.status}${isSwiped ? ' bit-row-swiped' : ''}`}
                                                    onTouchStart={e => { bitSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false }; }}
                                                    onTouchMove={e => {
                                                        const dx = e.touches[0].clientX - bitSwipeRef.current.startX;
                                                        const dy = e.touches[0].clientY - bitSwipeRef.current.startY;
                                                        if (!bitSwipeRef.current.moved && !bitSwipeRef.current.vertScroll) {
                                                            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                                            if (Math.abs(dy) > Math.abs(dx)) { bitSwipeRef.current.vertScroll = true; return; }
                                                            bitSwipeRef.current.moved = true;
                                                        }
                                                        if (bitSwipeRef.current.moved) e.preventDefault();
                                                    }}
                                                    onTouchEnd={e => {
                                                        if (!bitSwipeRef.current.moved) return;
                                                        const dx = e.changedTouches[0].clientX - bitSwipeRef.current.startX;
                                                        if (isSwiped) { if (dx < -30) setSwipedBitIdx(null); }
                                                        else {
                                                            if (dx > 55) setSwipedBitIdx(i);
                                                            else if (dx < -55) setEditIngresoBit(b);
                                                        }
                                                    }}
                                                    {...addMouseSwipe(bitSwipeRef, dx => {
                                                        if (isSwiped) { if (dx < -30) setSwipedBitIdx(null); }
                                                        else {
                                                            if (dx > 55) setSwipedBitIdx(i);
                                                            else if (dx < -55) setEditIngresoBit(b);
                                                        }
                                                    })}
                                                    onClick={() => { if (bitSwipeRef.current?.didDrag) { bitSwipeRef.current.didDrag = false; return; } if (isSwiped) { setSwipedBitIdx(null); return; } setBitDetailIdx(i); }}
                                                >
                                                    {/* N° */}
                                                    <div className="bit-tcell-num">{i + 1}</div>
                                                    {/* Salida */}
                                                    <div><span className="bit-hora-s">{b.horaS || '—'}</span></div>
                                                    {/* Ingreso */}
                                                    <div><span className="bit-hora-i">{b.horaI || '—'}</span></div>
                                                    {/* Placa + Tipo */}
                                                    <div>
                                                        <div className="bit-tplaca">{b.placa}</div>
                                                        {b.tipoVehiculo && <div className="bit-ttipo">{b.tipoVehiculo}</div>}
                                                    </div>
                                                    {/* Conductor + Empresa */}
                                                    <div style={{ minWidth: 0 }}>
                                                        <div className={`bit-tconductor${b.conductorChanged ? ' changed' : ''}`}>
                                                            {b.conductorChanged && (
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                            )}
                                                            {b.conductor || '—'}
                                                        </div>
                                                        {b.empresa && <div className="bit-tempresa">{b.empresa}</div>}
                                                    </div>
                                                    {/* Actividad / Observación */}
                                                    <div className="bit-tobservacion">{b.actividad || ''}</div>
                                                    {/* Estado — punto de color */}
                                                    <div className="bit-tcell-estado">
                                                        <div className="bit-status-dot" style={{ background: st.color }} title={st.label} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal detalle movimiento (solo lectura) */}
            {detailMov && (
                <ModalDetalle
                    mov={detailMov}
                    onClose={() => setDetailIdx(null)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onCopy={m => navigator.clipboard?.writeText(movToText(m))}
                    onShare={m => { if (navigator.share) navigator.share({ title: m.placa, text: movToText(m) }).catch(() => {}); else navigator.clipboard?.writeText(movToText(m)); }}
                    hasPrev={detailIdx > 0}
                    hasNext={detailIdx < movsOrdered.length - 1}
                    onPrev={() => setDetailIdx(i => i - 1)}
                    onNext={() => setDetailIdx(i => i + 1)}
                    counter={`${detailIdx + 1} / ${movsOrdered.length}`}
                />
            )}
            {/* Modal detalle bitácora (solo lectura) */}
            {bitDetailIdx !== null && (
                <ModalBitacoraDetalle
                    bitacora={bitacora}
                    idx={bitDetailIdx}
                    onClose={() => setBitDetailIdx(null)}
                    onChange={setBitDetailIdx}
                    onEditMov={() => {}}
                    onDeletePair={() => {}}
                />
            )}
        </div>
    );
};

// ── Modal confirmación genérico ───────────────────────────
const ModalConfirm = ({ mensaje, onConfirm, onCancel }) => (
    <div className="modal-overlay" onClick={onCancel}>
        <div className="modal-card" style={{ maxWidth: 320, gap: 20, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto' }}>
                <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p style={{ color: '#ddd', fontSize: 15, fontWeight: 600, lineHeight: 1.5, margin: 0 }}>{mensaje}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
                <button onClick={onCancel} style={{ padding: '11px 0', borderRadius: 10, border: '1px solid #2e2e2e', background: '#1e1e1e', color: '#aaa', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={onConfirm} style={{ padding: '11px 0', borderRadius: 10, border: 'none', background: '#f87171', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
            </div>
        </div>
    </div>
);

// ── Pantalla lista de flujos ───────────────────────────────
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PantallaFlujos = ({ turnoActivo }) => {
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [flujoSeleccionado, setFlujoSeleccionado] = useState(null);
    const [confirmarFlujo, setConfirmarFlujo] = useState(null);
    const [vistaFlujos, setVistaFlujos] = useState('archivo');
    const [expandedYears, setExpandedYears] = useState({});
    const [expandedMonths, setExpandedMonths] = useState({});
    const [genCampo, setGenCampo] = useState('todos');
    const [genQuery, setGenQuery] = useState('');
    const returnTabRef = useRef('archivo');

    // Guarda el último puesto/bloque conocido para poder ver flujos sin turno activo
    useEffect(() => {
        if (turnoActivo) {
            localStorage.setItem(LAST_TURNO_KEY, JSON.stringify({ puesto: turnoActivo.puesto, bloque: turnoActivo.bloque }));
        }
    }, [turnoActivo]);

    const { puesto, bloque } = useMemo(() => {
        if (turnoActivo) return { puesto: turnoActivo.puesto, bloque: turnoActivo.bloque };
        try { return JSON.parse(localStorage.getItem(LAST_TURNO_KEY) || '{}'); } catch { return {}; }
    }, [turnoActivo]);

    useEffect(() => {
        if (!puesto || !bloque) { setLoading(false); return; }
        setLoading(true);
        api.get(`/movimientos/todos?puesto=${puesto}&bloque=${bloque}`)
            .then(res => { setMovimientos(res.data.movimientos); setLoading(false); })
            .catch(() => setLoading(false));
    }, [puesto, bloque]);

    // Abrir el año y mes actuales por defecto
    useEffect(() => {
        const now = new Date();
        const year = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, '0');
        setExpandedYears({ [year]: true });
        setExpandedMonths({ [`${year}-${month}`]: true });
    }, []);

    const handleDeleteFlujo = async () => {
        if (!confirmarFlujo) return;
        try {
            await api.delete('/movimientos/batch', { data: { ids: confirmarFlujo.ids } });
            setMovimientos(prev => prev.filter(m => m.fecha !== confirmarFlujo.fecha));
        } catch { }
        setConfirmarFlujo(null);
    };

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

    // Agrupar flujos por año → mes
    const flujosArchivo = useMemo(() => {
        const byYear = {};
        flujos.forEach(f => {
            const [year, month] = f.fecha.split('-');
            const ym = `${year}-${month}`;
            if (!byYear[year]) byYear[year] = {};
            if (!byYear[year][ym]) byYear[year][ym] = [];
            byYear[year][ym].push(f);
        });
        return byYear;
    }, [flujos]);

    // Búsqueda global (pestaña General)
    const genResultados = useMemo(() => {
        if (!genQuery.trim()) return [];
        const q = genQuery.toLowerCase().trim();
        return movimientos.filter(m => {
            if (genCampo === 'placa')     return m.placa?.toLowerCase().includes(q);
            if (genCampo === 'conductor') return (m.conductor || '').toLowerCase().includes(q);
            if (genCampo === 'empresa')   return (m.empresa || '').toLowerCase().includes(q);
            if (genCampo === 'actividad') return (m.actividad || '').toLowerCase().includes(q);
            return (
                m.placa?.toLowerCase().includes(q) ||
                (m.conductor || '').toLowerCase().includes(q) ||
                (m.empresa || '').toLowerCase().includes(q) ||
                (m.actividad || '').toLowerCase().includes(q) ||
                (m.destino || '').toLowerCase().includes(q)
            );
        }).sort((a, b) => a.fecha !== b.fecha ? b.fecha.localeCompare(a.fecha) : b.hora.localeCompare(a.hora));
    }, [movimientos, genQuery, genCampo]);

    // Tarjeta de flujo (reutilizada en archivo y en resultados generales)
    const renderFlujoCard = (f) => {
        const fechaLarga = new Date(f.fecha + 'T12:00:00').toLocaleDateString('es-EC', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
        const ingresos = f.movs.filter(m => m.tipo === 'ingreso').length;
        const salidas  = f.movs.filter(m => m.tipo === 'salida').length;
        const isPetro  = m => m.empresa?.toLowerCase().includes('petroecuador');
        const unicos   = Object.values(f.movs.reduce((acc, m) => {
            if (!acc[m.placa] || (!acc[m.placa].empresa && m.empresa)) acc[m.placa] = m;
            return acc;
        }, {}));
        const petro = unicos.filter(isPetro).length;
        const earliestHour = (() => {
            const sorted = [...f.movs].sort((a, b) => a.hora.localeCompare(b.hora));
            return parseInt((sorted[0]?.hora || '12:00').split(':')[0]);
        })();
        const isDiurno = earliestHour >= 6 && earliestHour < 18;
        return (
            <div key={f.fecha} className="flujo-card" onClick={() => { returnTabRef.current = vistaFlujos; setFlujoSeleccionado(f.fecha); }}>
                <div style={{ flex: 1 }}>
                    <div className="flujo-fecha" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: isDiurno ? '#fcd34d' : '#818cf8', display: 'flex', alignItems: 'center' }}>
                            {isDiurno ? <IconSun size={14} /> : <IconMoon size={14} />}
                        </span>
                        {fechaLarga}
                    </div>
                    <div className="flujo-stats">
                        <span style={{ color: '#818cf8' }}>{ingresos} ing.</span>
                        <span style={{ color: '#555' }}> · </span>
                        <span style={{ color: '#f87171' }}>{salidas} sal.</span>
                        {petro > 0 && <><span style={{ color: '#555' }}> · </span><span style={{ color: '#4ade80' }}>{petro} EP</span></>}
                    </div>
                </div>
                <button
                    className="flujo-delete-btn"
                    title="Eliminar flujo"
                    onClick={e => { e.stopPropagation(); setConfirmarFlujo({ fecha: f.fecha, ids: f.movs.map(m => m._id), fechaLarga }); }}
                >
                    <IconMinus />
                </button>
                <IconChevronRight />
            </div>
        );
    };

    if (!puesto || !bloque) {
        return <p className="ws-empty" style={{ padding: 32 }}>Sin turno activo</p>;
    }

    if (flujoSeleccionado) {
        const flujo = flujos.find(f => f.fecha === flujoSeleccionado);
        return (
            <PantallaFlujoDetalle
                fecha={flujoSeleccionado}
                movs={flujo?.movs || []}
                onBack={() => { setFlujoSeleccionado(null); setVistaFlujos(returnTabRef.current); returnTabRef.current = 'archivo'; }}
            />
        );
    }

    if (loading) return <p className="ws-empty" style={{ padding: 32 }}>Cargando...</p>;

    return (
        <>
        {/* Pestañas Archivo / General */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px 10px' }}>
            <button className={`ws-vista-tab${vistaFlujos === 'archivo' ? ' active' : ''}`}
                onClick={() => setVistaFlujos('archivo')}>Archivo</button>
            <button className={`ws-vista-tab${vistaFlujos === 'general' ? ' active' : ''}`}
                onClick={() => setVistaFlujos('general')}>General</button>
        </div>

        {/* ── TAB ARCHIVO ── */}
        {vistaFlujos === 'archivo' && (
            flujos.length === 0
                ? <p className="ws-empty" style={{ padding: 32 }}>No hay flujos registrados aún</p>
                : <div style={{ padding: '0 16px 80px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {Object.keys(flujosArchivo).sort((a, b) => b.localeCompare(a)).map(year => {
                        const totalFlujos = Object.values(flujosArchivo[year]).flat().length;
                        return (
                            <div key={year}>
                                <button
                                    className="flujo-year-header"
                                    onClick={() => setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }))}
                                >
                                    <span className="flujo-year-label">{year}</span>
                                    <span className="flujo-year-count">{totalFlujos} día{totalFlujos !== 1 ? 's' : ''}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        style={{ marginLeft: 'auto', flexShrink: 0, transition: 'transform 0.2s', transform: expandedYears[year] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>

                                {expandedYears[year] && (
                                    <div style={{ paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {Object.keys(flujosArchivo[year]).sort((a, b) => b.localeCompare(a)).map(ym => {
                                            const monthNum = parseInt(ym.split('-')[1]);
                                            const mesNombre = MESES_ES[monthNum - 1];
                                            const diasCount = flujosArchivo[year][ym].length;
                                            const movsCount = flujosArchivo[year][ym].reduce((s, f) => s + f.movs.length, 0);
                                            return (
                                                <div key={ym}>
                                                    <button
                                                        className="flujo-month-header"
                                                        onClick={() => setExpandedMonths(prev => ({ ...prev, [ym]: !prev[ym] }))}
                                                    >
                                                        <span className="flujo-month-label">{mesNombre}</span>
                                                        <span className="flujo-month-count">{diasCount} día{diasCount !== 1 ? 's' : ''} · {movsCount} mov.</span>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                                            style={{ marginLeft: 'auto', flexShrink: 0, transition: 'transform 0.2s', transform: expandedMonths[ym] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>

                                                    {expandedMonths[ym] && (
                                                        <div style={{ paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, paddingBottom: 4 }}>
                                                            {flujosArchivo[year][ym].map(f => renderFlujoCard(f))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
        )}

        {/* ── TAB GENERAL ── */}
        {vistaFlujos === 'general' && (
            <div style={{ padding: '0 16px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Chips de filtro */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                        { id: 'todos',      label: 'Todos' },
                        { id: 'placa',      label: 'Placa' },
                        { id: 'conductor',  label: 'Conductor' },
                        { id: 'empresa',    label: 'Empresa' },
                        { id: 'actividad',  label: 'Actividad' },
                    ].map(f => (
                        <button key={f.id} onClick={() => setGenCampo(f.id)} className={`gen-chip${genCampo === f.id ? ' active' : ''}`}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Barra de búsqueda */}
                <div className="ws-search-bar" style={{ background: 'transparent' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#555', flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <input
                        className="ws-search-input"
                        type="text"
                        placeholder={`Buscar por ${genCampo === 'todos' ? 'cualquier campo' : genCampo}…`}
                        value={genQuery}
                        onChange={e => setGenQuery(e.target.value)}
                    />
                    {genQuery && <button className="ws-search-clear" onClick={() => setGenQuery('')}>✕</button>}
                </div>

                {/* Resultados */}
                {!genQuery.trim() ? (
                    <p className="ws-empty" style={{ marginTop: 20 }}>Escribe algo para buscar en todos los registros</p>
                ) : genResultados.length === 0 ? (
                    <p className="ws-empty" style={{ marginTop: 20 }}>Sin resultados para "{genQuery}"</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                            {genResultados.length} resultado{genResultados.length !== 1 ? 's' : ''}
                        </p>
                        {genResultados.map(m => {
                            const fechaCorta = new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-EC', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            });
                            return (
                                <div key={m._id} className="mov-item" style={{ cursor: 'pointer' }}
                                    onClick={() => { returnTabRef.current = 'general'; setFlujoSeleccionado(m.fecha); }}>
                                    <div className="mov-item-inner">
                                        <div className={`mov-icon ${m.tipo}`}>
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
                                            {m.actividad && !/^vac[ií]o$/i.test(m.actividad.trim()) && (
                                                <span className="mov-actividad">{m.actividad}</span>
                                            )}
                                            <span style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{fechaCorta}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {confirmarFlujo && (
            <ModalConfirm
                mensaje={`¿Eliminar los ${confirmarFlujo.ids.length} movimientos del ${confirmarFlujo.fechaLarga}?`}
                onConfirm={handleDeleteFlujo}
                onCancel={() => setConfirmarFlujo(null)}
            />
        )}
        </>
    );
};

// ── Pantalla Utilidades ────────────────────────────────────
const UTIL_ITEMS = [
    {
        id: 'firmas', label: 'Firmas\nFuncionarios',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.828 2.828 0 114 4L8 20l-5 1 1-5L17 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
        id: 'plataformas', label: 'Plataformas y\nNominativos',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="13" width="18" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="3" width="18" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>,
    },
    {
        id: 'mapas', label: 'Mapas de\nLocaciones',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.8"/></svg>,
    },
    {
        id: 'distancias', label: 'Distancias',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 12l3.5-3M3 12l3.5 3M21 12l-3.5-3M21 12l-3.5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
        id: 'codigos-radio', label: 'Códigos\nde Radio',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="7" y="8" width="10" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M10 3h4M12 3v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    },
    {
        id: 'nominativo-radio', label: 'Nominativo\nRadio',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 20c0-3.5 3.1-6 7-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 13l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
        id: 'nominativo-personal', label: 'Nominativo\nPersonal',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M1 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="18" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M16 20c0-2.5 1.5-4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    },
    {
        id: 'luminarias', label: 'Control de\nLuminarias',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M9 21h6M12 3a6 6 0 016 6c0 2.4-1.2 4.5-3 5.7V17H9v-2.3C7.2 13.5 6 11.4 6 9a6 6 0 016-6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
        id: 'consignas-permanentes', label: 'Consignas\nPermanentes',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8"/><path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    },
    {
        id: 'novedades-importantes', label: 'Novedades\nImportantes',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
];

const PantallaUtilidades = () => {
    const [detalle, setDetalle] = useState(null);

    if (detalle) {
        return (
            <div className="util-detalle">
                <button className="util-back-btn" onClick={() => setDetalle(null)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Volver
                </button>
                <h2 className="util-detalle-titulo">{detalle.label.replace('\n', ' ')}</h2>
                <div className="util-detalle-contenido">
                    <p className="ws-empty">Próximamente</p>
                </div>
            </div>
        );
    }

    return (
        <div className="util-grid">
            {UTIL_ITEMS.map(u => (
                <button key={u.id} className="util-tile" onClick={() => setDetalle(u)}>
                    <div className="util-tile-icon">{u.icon}</div>
                    <span className="util-tile-label">{u.label}</span>
                </button>
            ))}
        </div>
    );
};

// ── Helpers de texto para copiar/compartir ────────────────
const vToText = v => [
    `PLACA: ${v.placa}`,
    v.marca ? `MARCA: ${v.marca}` : '',
    v.color ? `COLOR: ${v.color}` : '',
    v.tipoVehiculo ? `TIPO: ${v.tipoVehiculo}` : '',
    v.empresa ? `EMPRESA: ${v.empresa}` : '',
    v.caf ? `CAF: ${v.caf}` : '',
].filter(Boolean).join('\n');

const extToText = e => [
    `NOMBRE: ${e.nombre}`,
    e.empresa ? `EMPRESA: ${e.empresa}` : '',
    e.cargo ? `CARGO: ${e.cargo}` : '',
    e.departamento ? `DEPT: ${e.departamento}` : '',
    e.extension ? `EXT: ${e.extension}` : '',
    e.celular ? `CEL: ${e.celular}` : '',
].filter(Boolean).join('\n');

const pToText = p => [
    `CÉDULA: ${p.cedula}`,
    `NOMBRES: ${p.nombres}`,
    p.empresa ? `EMPRESA: ${p.empresa}` : '',
    p.cargo ? `CARGO: ${p.cargo}` : '',
    p.departamento ? `DEPT: ${p.departamento}` : '',
    p.nominativo ? `NOMINATIVO: ${p.nominativo}` : '',
].filter(Boolean).join('\n');

const handleCopyText = text => navigator.clipboard?.writeText(text);
const handleShareText = async text => {
    if (navigator.share) {
        await navigator.share({ title: 'FLUJO', text }).catch(() => { });
    } else {
        handleCopyText(text);
    }
};

// ── Modal detalle Extensión ───────────────────────────────
const ModalDetalleExt = ({ ext, onClose, onEdit, onDelete }) => {
    const initials = (ext.nombre || '')
        .split(' ').filter(Boolean).slice(0, 2)
        .map(w => w[0].toUpperCase()).join('');

    const fields = [
        { label: 'Cargo',        value: ext.cargo },
        { label: 'Departamento', value: ext.departamento },
        { label: 'Extensión',    value: ext.extension },
        { label: 'Celular',      value: ext.celular },
    ].filter(f => f.value);

    const S = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    const actionBtnStyle = (color) => ({
        background: 'none', border: 'none', padding: '10px', cursor: 'pointer',
        color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, transition: 'opacity 0.15s ease',
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '90vw', maxWidth: 380,
                    background: 'linear-gradient(180deg, #1a1c23 0%, #16171d 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 20,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
                    overflow: 'hidden',
                }}
            >
                {/* Barra superior: badge + botón cerrar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0 20px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'rgba(122,138,255,0.12)', border: '1px solid rgba(122,138,255,0.25)',
                        color: '#a3b0ff', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                        padding: '6px 12px', borderRadius: 999,
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.37 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 17z" />
                        </svg>
                        EXTENSIÓN
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                            background: 'rgba(255,255,255,0.05)', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#8b8d96',
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6 6 18" /><path d="M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Avatar + nombre + empresa */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '20px 24px 22px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                        background: 'linear-gradient(135deg, #6d7cff, #4a5be0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 800, color: '#fff',
                    }}>{initials || '?'}</div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontSize: 18, fontWeight: 800, color: '#f5f5f7',
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{(ext.nombre || '—').toUpperCase()}</div>
                        {ext.empresa && (
                            <div style={{ fontSize: 13, color: '#6c6e78', marginTop: 3,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ext.empresa.toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Campos */}
                <div style={{ padding: '8px 24px 4px 24px' }}>
                    {fields.length > 0 ? fields.map(f => (
                        <div key={f.label} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <span style={{ fontSize: 12, color: '#75767f', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                                {f.label}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#eeeef1', letterSpacing: '0.01em', textAlign: 'right', marginLeft: 12, fontVariantNumeric: 'tabular-nums' }}>
                                {f.value}
                            </span>
                        </div>
                    )) : (
                        <div style={{ padding: '16px 0', textAlign: 'center', color: '#444', fontSize: 12 }}>
                            Sin datos adicionales
                        </div>
                    )}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '18px 24px 22px 24px' }}>
                    {onEdit && (
                        <button title="Editar" style={actionBtnStyle('#c7c8ce')} onClick={() => { onEdit(ext); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M12 20h9" ${S}/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" ${S}/>` }} />
                        </button>
                    )}
                    <button title="Copiar" style={actionBtnStyle('#c7c8ce')} onClick={() => handleCopyText(extToText(ext))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<rect x="9" y="9" width="12" height="12" rx="2" ${S}/><path d="M5 15V5a2 2 0 0 1 2-2h10" ${S}/>` }} />
                    </button>
                    <button title="Compartir" style={actionBtnStyle('#c7c8ce')} onClick={() => handleShareText(extToText(ext))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" ${S}/><path d="M16 6l-4-4-4 4" ${S}/><path d="M12 2v14" ${S}/>` }} />
                    </button>
                    {onDelete && (
                        <button title="Eliminar" style={actionBtnStyle('#ff8a8a')} onClick={() => { onDelete(ext._id); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M5 12h14" ${S}/>` }} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Modal detalle Persona ─────────────────────────────────
const ModalDetallePersona = ({ persona: p, onClose, onEdit, onDelete, onQR }) => {
    const initials = (p.nombres || '')
        .split(' ').filter(Boolean).slice(0, 2)
        .map(w => w[0].toUpperCase()).join('');

    const fields = [
        { label: 'Empresa',      value: p.empresa },
        { label: 'Cargo',        value: p.cargo },
        { label: 'Departamento', value: p.departamento },
        { label: 'Nominativo',   value: p.nominativo },
    ].filter(f => f.value);

    const S = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    const actionBtnStyle = (color) => ({
        background: 'none', border: 'none', padding: '10px', cursor: 'pointer',
        color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, transition: 'opacity 0.15s ease',
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '90vw', maxWidth: 380,
                    background: 'linear-gradient(180deg, #1a1c23 0%, #16171d 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 20,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
                    overflow: 'hidden',
                }}
            >
                {/* Barra superior: badge + botón cerrar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0 20px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'rgba(122,138,255,0.12)', border: '1px solid rgba(122,138,255,0.25)',
                        color: '#a3b0ff', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                        padding: '6px 12px', borderRadius: 999,
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                        </svg>
                        PERSONA
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                            background: 'rgba(255,255,255,0.05)', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#8b8d96',
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6 6 18" /><path d="M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Avatar + nombre + cédula */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '20px 24px 22px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                        background: 'linear-gradient(135deg, #6d7cff, #4a5be0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 800, color: '#fff',
                    }}>{initials || '?'}</div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontSize: 20, fontWeight: 800, color: '#f5f5f7',
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{p.nombres}</div>
                        <div style={{ fontSize: 13, color: '#6c6e78', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {p.cedula}
                        </div>
                    </div>
                </div>

                {/* Campos */}
                <div style={{ padding: '8px 24px 4px 24px' }}>
                    {fields.length > 0 ? fields.map(f => (
                        <div key={f.label} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <span style={{ fontSize: 12, color: '#75767f', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                                {f.label}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#eeeef1', letterSpacing: '0.01em', textAlign: 'right', marginLeft: 12 }}>
                                {f.value}
                            </span>
                        </div>
                    )) : (
                        <div style={{ padding: '16px 0', textAlign: 'center', color: '#444', fontSize: 12 }}>
                            Sin datos adicionales
                        </div>
                    )}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '18px 24px 22px 24px' }}>
                    {onEdit && (
                        <button title="Editar" style={actionBtnStyle('#c7c8ce')} onClick={() => { onEdit(p); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M12 20h9" ${S}/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" ${S}/>` }} />
                        </button>
                    )}
                    <button title="Copiar" style={actionBtnStyle('#c7c8ce')} onClick={() => handleCopyText(pToText(p))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<rect x="9" y="9" width="12" height="12" rx="2" ${S}/><path d="M5 15V5a2 2 0 0 1 2-2h10" ${S}/>` }} />
                    </button>
                    <button title="Compartir" style={actionBtnStyle('#c7c8ce')} onClick={() => handleShareText(pToText(p))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" ${S}/><path d="M16 6l-4-4-4 4" ${S}/><path d="M12 2v14" ${S}/>` }} />
                    </button>
                    {onQR && (
                        <button title="Ver QR" style={actionBtnStyle('#c7c8ce')} onClick={() => { onQR(p); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<rect x="3" y="3" width="7" height="7" ${S}/><rect x="14" y="3" width="7" height="7" ${S}/><rect x="14" y="14" width="7" height="7" ${S}/><rect x="3" y="14" width="7" height="7" ${S}/>` }} />
                        </button>
                    )}
                    {onDelete && (
                        <button title="Eliminar" style={actionBtnStyle('#ff8a8a')} onClick={() => { onDelete(p._id); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M5 12h14" ${S}/>` }} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Modal extensión (agregar / editar) ────────────────────
const EMPTY_EXT = { nombre: '', empresa: '', cargo: '', departamento: '', extension: '', celular: '' };

const ModalExtension = ({ onClose, onGuardado, editData }) => {
    const [form, setForm] = useState(editData
        ? { nombre: editData.nombre, empresa: editData.empresa || '', cargo: editData.cargo || '', departamento: editData.departamento || '', extension: editData.extension || '', celular: editData.celular || '' }
        : EMPTY_EXT
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = e => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async () => {
        if (!form.nombre) { setError('El nombre es obligatorio'); return; }
        setLoading(true);
        try {
            if (editData?._id) {
                const { data } = await api.put(`/extensiones/${editData._id}`, form);
                onGuardado(data.extension);
            } else {
                const { data } = await api.post('/extensiones', form);
                onGuardado(data.extension);
            }
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
                    <h3>{editData ? 'Editar extensión' : 'Nueva extensión'}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-fields">
                    <ModalField name="nombre" label="NOMBRE *" placeholder="Nombre completo" value={form.nombre} {...fp} />
                    <div className="modal-fields-row">
                        <ModalField name="empresa" label="EMPRESA" placeholder="EP Petroecuador" value={form.empresa} {...fp} />
                        <ModalField name="departamento" label="DEPARTAMENTO" placeholder="OPR, ADM..." value={form.departamento} {...fp} />
                    </div>
                    <ModalField name="cargo" label="CARGO" placeholder="Jefe de Campo..." value={form.cargo} {...fp} />
                    <div className="modal-fields-row">
                        <ModalField name="extension" label="EXTENSIÓN" placeholder="78201" value={form.extension} {...fp} />
                        <ModalField name="celular" label="CELULAR" placeholder="0998..." value={form.celular} {...fp} />
                    </div>
                </div>
                {error && <p className="modal-error">{error}</p>}
                <button className={`modal-btn ${form.nombre ? 'active' : ''}`} onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Guardando...' : editData ? 'Guardar cambios' : 'Registrar extensión'}
                </button>
            </div>
        </div>
    );
};

// ── Pantalla Extensiones ──────────────────────────────────
const PantallaExtensiones = () => {
    const [extensiones, setExtensiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editExt, setEditExt] = useState(null);
    const [swipedExtId, setSwipedExtId] = useState(null);
    const extSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false, didDrag: false });
    const [detailExt, setDetailExt] = useState(null);

    const cargar = () => {
        api.get('/extensiones')
            .then(res => { setExtensiones(res.data.extensiones); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, []);

    // Actualización optimista: refleja el cambio en la UI de inmediato
    const onGuardado = (savedExt) => {
        if (!savedExt) { cargar(); return; }
        setExtensiones(prev => {
            const idx = prev.findIndex(e => e._id === savedExt._id);
            if (idx >= 0) {
                // Edición: reemplaza el registro existente
                const next = [...prev];
                next[idx] = savedExt;
                return next;
            }
            // Nuevo: inserta ordenado por nombre
            return [...prev, savedExt].sort((a, b) =>
                (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
            );
        });
    };

    const sq = search.toLowerCase();
    const filtrados = sq
        ? extensiones.filter(e =>
            (e.nombre || '').toLowerCase().includes(sq) ||
            (e.cargo || '').toLowerCase().includes(sq) ||
            (e.empresa || '').toLowerCase().includes(sq) ||
            (e.departamento || '').toLowerCase().includes(sq))
        : extensiones;

    // Eliminación optimista: quita la fila inmediatamente, luego sincroniza
    const handleDelete = async id => {
        setExtensiones(prev => prev.filter(e => e._id !== id));
        try { await api.delete(`/extensiones/${id}`); } catch { }
    };

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
                        placeholder="Filtrar por nombre, cargo o departamento..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="ws-search-clear" onClick={() => setSearch('')}>✕</button>}
                </div>
                <span style={{ color: '#555', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {filtrados.length} reg.
                </span>
            </div>

            {/* Tabla de extensiones */}
            {loading
                ? <p className="ws-empty">Cargando...</p>
                : filtrados.length === 0
                    ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'No hay extensiones registradas'}</p>
                    : (
                        <div className="ftable-scroll">
                            {/* Encabezado */}
                            <div className="ftable-head" style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px 70px 100px 110px' }}>
                                {['NOMBRE', 'CARGO', 'DEPTO', 'EXT.', 'CELULAR', 'EMPRESA'].map(h => (
                                    <span key={h} className="ftable-head-cell">{h}</span>
                                ))}
                            </div>
                            <div className="ftable">
                                {filtrados.map(e => {
                                    const isSwiped = swipedExtId === e._id;
                                    return (
                                        <div key={e._id} className="ftable-row-wrap">
                                            <div className="ftable-actions" onClick={ev => ev.stopPropagation()}>
                                                <button className="plist-act-btn" title="Editar"    onClick={() => { setEditExt(e); setSwipedExtId(null); }}><IconPencil /></button>
                                                <button className="plist-act-btn" title="Copiar"    onClick={() => { handleCopyText(extToText(e)); setSwipedExtId(null); }}><IconCopy /></button>
                                                <button className="plist-act-btn" title="Compartir" onClick={() => { handleShareText(extToText(e)); setSwipedExtId(null); }}><IconShare /></button>
                                                <button className="plist-act-btn danger" title="Eliminar" onClick={() => { handleDelete(e._id); setSwipedExtId(null); }}><IconMinus /></button>
                                            </div>
                                            <div
                                                className={`ftable-row${isSwiped ? ' ftable-swiped-4' : ''}`}
                                                style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px 70px 100px 110px' }}
                                                onTouchStart={ev => { extSwipeRef.current = { startX: ev.touches[0].clientX, startY: ev.touches[0].clientY, moved: false, vertScroll: false }; }}
                                                onTouchMove={ev => {
                                                    const dx = ev.touches[0].clientX - extSwipeRef.current.startX;
                                                    const dy = ev.touches[0].clientY - extSwipeRef.current.startY;
                                                    if (!extSwipeRef.current.moved && !extSwipeRef.current.vertScroll) {
                                                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                                        if (Math.abs(dy) > Math.abs(dx)) { extSwipeRef.current.vertScroll = true; return; }
                                                        extSwipeRef.current.moved = true;
                                                    }
                                                    if (extSwipeRef.current.moved) ev.preventDefault();
                                                }}
                                                onTouchEnd={ev => {
                                                    if (!extSwipeRef.current.moved) return;
                                                    const dx = ev.changedTouches[0].clientX - extSwipeRef.current.startX;
                                                    if (isSwiped) { if (dx < -30) setSwipedExtId(null); }
                                                    else { if (dx > 55) setSwipedExtId(e._id); }
                                                }}
                                                {...addMouseSwipe(extSwipeRef, dx => {
                                                    if (isSwiped) { if (dx < -30) setSwipedExtId(null); }
                                                    else { if (dx > 55) setSwipedExtId(e._id); }
                                                })}
                                                onClick={() => {
                                                    if (extSwipeRef.current?.didDrag) { extSwipeRef.current.didDrag = false; return; }
                                                    if (isSwiped) { setSwipedExtId(null); return; }
                                                    setDetailExt(e);
                                                }}
                                            >
                                                <span className="ftable-cell ftable-cell-flex ftable-cell-bold">{(e.nombre || '—').toUpperCase()}</span>
                                                <span className="ftable-cell" style={{ width: 130 }}>{e.cargo || '—'}</span>
                                                <span className="ftable-cell ftable-cell-dim" style={{ width: 100 }}>{(e.departamento || '—').toUpperCase()}</span>
                                                <span className="ftable-cell ftable-cell-accent" style={{ width: 70 }}>{e.extension ? `Ext. ${e.extension}` : '—'}</span>
                                                <span className="ftable-cell ftable-cell-dim" style={{ width: 100 }}>{e.celular || '—'}</span>
                                                <span className="ftable-cell" style={{ width: 110 }}>{(e.empresa || '—').toUpperCase()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
            }

            <button className="placas-fab" onClick={() => setShowForm(true)}>+</button>

            {(showForm || editExt) && (
                <ModalExtension
                    onClose={() => { setShowForm(false); setEditExt(null); }}
                    onGuardado={onGuardado}
                    editData={editExt}
                />
            )}
            {detailExt && (
                <ModalDetalleExt
                    ext={detailExt}
                    onClose={() => setDetailExt(null)}
                    onEdit={ex => { setEditExt(ex); setDetailExt(null); }}
                    onDelete={id => { handleDelete(id); setDetailExt(null); }}
                />
            )}
        </div>
    );
};

// ── Modal persona (agregar / editar) ─────────────────────
const EMPTY_PERSONA = { cedula: '', nombres: '', empresa: '', cargo: '', departamento: '', nominativo: '' };

const ModalPersona = ({ onClose, onGuardado, editData }) => {
    const [form, setForm] = useState(editData
        ? { cedula: editData.cedula, nombres: editData.nombres, empresa: editData.empresa || '', cargo: editData.cargo || '', departamento: editData.departamento || '', nominativo: editData.nominativo || '' }
        : EMPTY_PERSONA
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = e => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async () => {
        if (!form.cedula || !form.nombres) { setError('Cédula y nombres son obligatorios'); return; }
        setLoading(true);
        try {
            if (editData?._id) {
                await api.put(`/personas/${editData._id}`, form);
            } else {
                await api.post('/personas', form);
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
                    <h3>{editData ? 'Editar persona' : 'Nueva persona'}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-fields">
                    <div className="modal-fields-row">
                        <ModalField name="cedula" label="CÉDULA *" placeholder="1234567890" value={form.cedula} {...fp} />
                        <ModalField name="nominativo" label="NOMINATIVO" placeholder="VENUS, ECO 43..." value={form.nominativo} {...fp} />
                    </div>
                    <ModalField name="nombres" label="NOMBRES *" placeholder="Apellidos y nombres completos" value={form.nombres} {...fp} />
                    <div className="modal-fields-row">
                        <ModalField name="empresa" label="EMPRESA" placeholder="EP Petroecuador" value={form.empresa} {...fp} />
                        <ModalField name="departamento" label="DEPARTAMENTO" placeholder="OPR, SFI..." value={form.departamento} {...fp} />
                    </div>
                    <ModalField name="cargo" label="CARGO" placeholder="Jefe de Campo..." value={form.cargo} {...fp} />
                </div>
                {error && <p className="modal-error">{error}</p>}
                <button className={`modal-btn ${form.cedula && form.nombres ? 'active' : ''}`} onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Guardando...' : editData ? 'Guardar cambios' : 'Registrar persona'}
                </button>
            </div>
        </div>
    );
};

// ── Modal importar personas (CSV / Excel) ─────────────────
const ModalImportPersonas = ({ onClose, onGuardado }) => {
    const [step, setStep] = useState('upload'); // 'upload' | 'conflicts' | 'done'
    const [parsedRows, setParsedRows] = useState([]);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [choices, setChoices] = useState({});

    const norm = h => String(h || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const mapHeader = h => {
        const n = norm(h);
        if (n.includes('cedul') || n === 'id') return 'cedula';
        if (n.includes('nombre')) return 'nombres';
        if (n.includes('empresa') || n.includes('company')) return 'empresa';
        if (n.includes('cargo') || n.includes('puesto') || n.includes('posit')) return 'cargo';
        if (n.includes('depart') || n === 'dept') return 'departamento';
        if (n.includes('nominat') || n.includes('codigo') || n.includes('cod')) return 'nominativo';
        return null;
    };

    const handleFile = e => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setError('');
        setParsedRows([]);

        const reader = new FileReader();
        reader.onload = async evt => {
            try {
                const XLSX = await import('xlsx');
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

                if (rows.length < 2) { setError('El archivo está vacío o no tiene datos'); return; }

                const hMap = rows[0].map(mapHeader);
                const parsed = rows.slice(1)
                    .filter(r => r.some(v => String(v).trim()))
                    .map(r => {
                        const obj = {};
                        hMap.forEach((f, i) => { if (f) obj[f] = String(r[i] || '').trim(); });
                        return obj;
                    })
                    .filter(p => p.cedula);

                if (!parsed.length) {
                    setError('No se encontraron filas válidas. Asegúrate de que el encabezado incluya CÉDULA y NOMBRES.');
                    return;
                }
                setParsedRows(parsed);
            } catch {
                setError('No se pudo leer el archivo. Verifica que sea CSV o Excel válido.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.post('/personas/bulk', { personas: parsedRows });
            setResult(data);
            if (data.conflicts.length > 0) {
                const defaultChoices = {};
                data.conflicts.forEach(c => { defaultChoices[c.existing.cedula] = 'keep'; });
                setChoices(defaultChoices);
                setStep('conflicts');
            } else {
                setStep('done');
                onGuardado();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al importar');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        setLoading(true);
        setError('');
        try {
            const toUpdate = result.conflicts.filter(c => choices[c.existing.cedula] === 'update');
            await Promise.all(toUpdate.map(c =>
                api.put(`/personas/${c.existing._id}`, {
                    nombres: c.incoming.nombres || c.existing.nombres,
                    empresa: c.incoming.empresa !== undefined ? c.incoming.empresa : c.existing.empresa,
                    cargo: c.incoming.cargo !== undefined ? c.incoming.cargo : c.existing.cargo,
                    departamento: c.incoming.departamento !== undefined ? c.incoming.departamento : c.existing.departamento,
                    nominativo: c.incoming.nominativo !== undefined ? c.incoming.nominativo : c.existing.nominativo,
                })
            ));
            setStep('done');
            onGuardado();
        } catch {
            setError('Error al aplicar los cambios');
        } finally {
            setLoading(false);
        }
    };

    // ── Pantalla subida ──
    if (step === 'upload') return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Importar personas</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                    Sube un archivo <strong style={{ color: '#4ade80' }}>CSV</strong> o <strong style={{ color: '#4ade80' }}>Excel (.xlsx)</strong>.<br />
                    Encabezados reconocidos: <span style={{ color: '#818cf8' }}>CÉDULA, NOMBRES, EMPRESA, CARGO, DEPARTAMENTO, NOMINATIVO</span>
                </p>

                <label className="import-dropzone">
                    <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} style={{ display: 'none' }} />
                    {fileName ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                            <div style={{ color: '#ddd', fontWeight: 700, fontSize: 13 }}>{fileName}</div>
                            {parsedRows.length > 0
                                ? <div style={{ color: '#4ade80', marginTop: 6, fontSize: 13 }}>{parsedRows.length} registros detectados</div>
                                : <div style={{ color: '#f87171', marginTop: 6, fontSize: 12 }}>Sin registros válidos</div>
                            }
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#555' }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 10 }}>
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 15V5" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div style={{ fontSize: 13 }}>Toca para seleccionar CSV o Excel</div>
                        </div>
                    )}
                </label>

                {parsedRows.length > 0 && (
                    <div style={{ background: '#111', borderRadius: 10, padding: 12, fontSize: 12, color: '#888', maxHeight: 130, overflowY: 'auto' }}>
                        {parsedRows.slice(0, 6).map((p, i) => (
                            <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: 8 }}>
                                <span style={{ color: '#818cf8', flexShrink: 0 }}>{p.cedula}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombres}</span>
                            </div>
                        ))}
                        {parsedRows.length > 6 && <div style={{ color: '#444', marginTop: 6 }}>+{parsedRows.length - 6} más...</div>}
                    </div>
                )}

                {error && <p className="modal-error">{error}</p>}
                <button className={`modal-btn ${parsedRows.length > 0 ? 'active' : ''}`}
                    onClick={handleImport} disabled={!parsedRows.length || loading}>
                    {loading ? 'Importando...' : parsedRows.length > 0 ? `Importar ${parsedRows.length} registros` : 'Selecciona un archivo primero'}
                </button>
            </div>
        </div>
    );

    // ── Pantalla conflictos ──
    if (step === 'conflicts') return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{result.conflicts.length} conflicto{result.conflicts.length !== 1 ? 's' : ''}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>{result.created} nuevos</span> importados. Las cédulas siguientes ya existen — elige qué conservar:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '48vh', overflowY: 'auto' }}>
                    {result.conflicts.map(c => (
                        <div key={c.existing.cedula} style={{ background: '#111', borderRadius: 12, padding: 14, fontSize: 12 }}>
                            <div style={{ color: '#818cf8', fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>{c.existing.cedula}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                                    <div style={{ color: '#555', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ACTUAL</div>
                                    <div style={{ color: '#ddd', fontWeight: 600 }}>{c.existing.nombres}</div>
                                    <div style={{ color: '#888', marginTop: 2 }}>{c.existing.empresa || '—'}</div>
                                    {c.existing.cargo && <div style={{ color: '#666', marginTop: 2 }}>{c.existing.cargo}</div>}
                                </div>
                                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                                    <div style={{ color: '#555', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>NUEVO</div>
                                    <div style={{ color: '#ddd', fontWeight: 600 }}>{c.incoming.nombres}</div>
                                    <div style={{ color: '#888', marginTop: 2 }}>{c.incoming.empresa || '—'}</div>
                                    {c.incoming.cargo && <div style={{ color: '#666', marginTop: 2 }}>{c.incoming.cargo}</div>}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[['keep', 'Mantener actual', '#818cf8'], ['update', 'Usar nuevo', '#4ade80']].map(([val, label, color]) => (
                                    <button key={val}
                                        onClick={() => setChoices(ch => ({ ...ch, [c.existing.cedula]: val }))}
                                        style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${choices[c.existing.cedula] === val ? color : '#2e2e2e'}`, background: choices[c.existing.cedula] === val ? `${color}18` : '#1e1e1e', color: choices[c.existing.cedula] === val ? color : '#666', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {error && <p className="modal-error">{error}</p>}
                <button className="modal-btn active" onClick={handleResolve} disabled={loading}>
                    {loading ? 'Aplicando...' : 'Aplicar selección'}
                </button>
            </div>
        </div>
    );

    // ── Pantalla éxito ──
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ alignItems: 'center', gap: 18 }} onClick={e => e.stopPropagation()}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#4ade80" strokeWidth="2" />
                    <path d="M8 12l3 3 5-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Importación exitosa</div>
                <div style={{ color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
                    {result.created} registro{result.created !== 1 ? 's' : ''} nuevos importados
                    {result.conflicts.length > 0 && ` · ${result.conflicts.length} conflicto${result.conflicts.length !== 1 ? 's' : ''} resuelto${result.conflicts.length !== 1 ? 's' : ''}`}
                </div>
                <button className="modal-btn active" style={{ marginBottom: 0 }} onClick={onClose}>Listo</button>
            </div>
        </div>
    );
};

// ── Pantalla Personas ──────────────────────────────────────
const PantallaPersonas = () => {
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editPersona, setEditPersona] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [qrPersona, setQrPersona] = useState(null);
    const [swipedPersonaId, setSwipedPersonaId] = useState(null);
    const personaSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false, didDrag: false });
    const [detailPersona, setDetailPersona] = useState(null);

    const cargar = () => {
        api.get('/personas')
            .then(res => { setPersonas(res.data.personas); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, []);

    const sq = search.toLowerCase();
    const filtrados = sq
        ? personas.filter(p =>
            (p.nombres || '').toLowerCase().includes(sq) ||
            (p.empresa || '').toLowerCase().includes(sq) ||
            (p.cedula || '').includes(sq) ||
            (p.departamento || '').toLowerCase().includes(sq))
        : personas;

    const handleDelete = async id => {
        try { await api.delete(`/personas/${id}`); cargar(); } catch { }
    };

    const pQrData = p => [
        `CEDULA: ${p.cedula}`,
        p.nombres ? `NOMBRES: ${p.nombres}` : '',
        p.empresa ? `EMPRESA: ${p.empresa}` : '',
        p.departamento ? `DEPT: ${p.departamento}` : '',
        p.nominativo ? `NOM: ${p.nominativo}` : '',
    ].filter(Boolean).join('\n');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>

            {/* Barra búsqueda */}
            <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="ws-search-bar" style={{ padding: 0, flex: 1, margin: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#555', flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws-search-input" type="text"
                        placeholder="Filtrar por nombre, cédula o departamento..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="ws-search-clear" onClick={() => setSearch('')}>✕</button>}
                </div>
                <button className="ws-topbar-btn" title="Importar CSV / Excel" onClick={() => setShowImport(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 15V5"
                            stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <span style={{ color: '#555', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {filtrados.length} reg.
                </span>
            </div>

            {/* Tabla de personas */}
            {loading
                ? <p className="ws-empty">Cargando...</p>
                : filtrados.length === 0
                    ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'No hay personas registradas'}</p>
                    : (
                        <div className="ftable-scroll">
                            {/* Encabezado fijo — mismo template que las filas para alineación perfecta */}
                            <div className="ftable-head" style={{ display: 'grid', gridTemplateColumns: '100px 160px 140px 110px 100px 80px' }}>
                                {['CÉDULA', 'NOMBRE', 'EMPRESA', 'CARGO', 'DEPTO', 'NOM.'].map(h => (
                                    <span key={h} className="ftable-head-cell">{h}</span>
                                ))}
                            </div>
                            <div className="ftable">
                                {filtrados.map(p => {
                                    const isSwiped = swipedPersonaId === p._id;
                                    return (
                                        <div key={p._id} className="ftable-row-wrap">
                                            <div className="ftable-actions" onClick={ev => ev.stopPropagation()}>
                                                <button className="plist-act-btn" title="Editar"    onClick={() => { setEditPersona(p); setSwipedPersonaId(null); }}><IconPencil /></button>
                                                <button className="plist-act-btn" title="Copiar"    onClick={() => { handleCopyText(pToText(p)); setSwipedPersonaId(null); }}><IconCopy /></button>
                                                <button className="plist-act-btn" title="Compartir" onClick={() => { handleShareText(pToText(p)); setSwipedPersonaId(null); }}><IconShare /></button>
                                                <button className="plist-act-btn" title="Ver QR"    onClick={() => { setQrPersona(p); setSwipedPersonaId(null); }}><IconQR /></button>
                                                <button className="plist-act-btn danger" title="Eliminar" onClick={() => { handleDelete(p._id); setSwipedPersonaId(null); }}><IconMinus /></button>
                                            </div>
                                            <div
                                                className={`ftable-row${isSwiped ? ' ftable-swiped-5' : ''}`}
                                                style={{ display: 'grid', gridTemplateColumns: '100px 160px 140px 110px 100px 80px' }}
                                                onTouchStart={ev => { personaSwipeRef.current = { startX: ev.touches[0].clientX, startY: ev.touches[0].clientY, moved: false, vertScroll: false }; }}
                                                onTouchMove={ev => {
                                                    const dx = ev.touches[0].clientX - personaSwipeRef.current.startX;
                                                    const dy = ev.touches[0].clientY - personaSwipeRef.current.startY;
                                                    if (!personaSwipeRef.current.moved && !personaSwipeRef.current.vertScroll) {
                                                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                                        if (Math.abs(dy) > Math.abs(dx)) { personaSwipeRef.current.vertScroll = true; return; }
                                                        personaSwipeRef.current.moved = true;
                                                    }
                                                    if (personaSwipeRef.current.moved) ev.preventDefault();
                                                }}
                                                onTouchEnd={ev => {
                                                    if (!personaSwipeRef.current.moved) return;
                                                    const dx = ev.changedTouches[0].clientX - personaSwipeRef.current.startX;
                                                    if (isSwiped) { if (dx < -30) setSwipedPersonaId(null); }
                                                    else { if (dx > 55) setSwipedPersonaId(p._id); }
                                                }}
                                                {...addMouseSwipe(personaSwipeRef, dx => {
                                                    if (isSwiped) { if (dx < -30) setSwipedPersonaId(null); }
                                                    else { if (dx > 55) setSwipedPersonaId(p._id); }
                                                })}
                                                onClick={() => {
                                                    if (personaSwipeRef.current?.didDrag) { personaSwipeRef.current.didDrag = false; return; }
                                                    if (isSwiped) { setSwipedPersonaId(null); return; }
                                                    setDetailPersona(p);
                                                }}
                                            >
                                                <span className="ftable-cell ftable-cell-accent">{p.cedula || '—'}</span>
                                                <span className="ftable-cell ftable-cell-bold">{(p.nombres || '—').toUpperCase()}</span>
                                                <span className="ftable-cell">{(p.empresa || '—').toUpperCase()}</span>
                                                <span className="ftable-cell ftable-cell-dim">{p.cargo || '—'}</span>
                                                <span className="ftable-cell ftable-cell-dim">{(p.departamento || '—').toUpperCase()}</span>
                                                <span className="ftable-cell ftable-cell-dim" style={{ color: p.nominativo ? '#818cf8' : undefined }}>{p.nominativo || '—'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
            }

            <button className="placas-fab" onClick={() => setShowForm(true)}>+</button>

            {(showForm || editPersona) && (
                <ModalPersona
                    onClose={() => { setShowForm(false); setEditPersona(null); }}
                    onGuardado={cargar}
                    editData={editPersona}
                />
            )}
            {showImport && (
                <ModalImportPersonas
                    onClose={() => setShowImport(false)}
                    onGuardado={cargar}
                />
            )}
            {detailPersona && (
                <ModalDetallePersona
                    persona={detailPersona}
                    onClose={() => setDetailPersona(null)}
                    onEdit={per => { setEditPersona(per); setDetailPersona(null); }}
                    onDelete={id => { handleDelete(id); setDetailPersona(null); }}
                    onQR={per => { setQrPersona(per); setDetailPersona(null); }}
                />
            )}
            {qrPersona && (
                <div className="modal-overlay" onClick={() => setQrPersona(null)}>
                    <div className="modal-card" style={{ alignItems: 'center', gap: 20 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ width: '100%' }}>
                            <h3>{qrPersona.cedula}</h3>
                            <button className="modal-close" onClick={() => setQrPersona(null)}>✕</button>
                        </div>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pQrData(qrPersona))}`}
                            alt="QR" style={{ width: 200, height: 200, borderRadius: 8, background: '#fff', padding: 8 }}
                        />
                        <p style={{ fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 1.8 }}>
                            {pQrData(qrPersona).split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
                        </p>
                    </div>
                </div>
            )}
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
    const { registerPasskey } = useAuth();
    const bloque = turnoActivo ? BLOQUES_DATA[turnoActivo.bloque] : null;
    const iniciales = `${user?.name?.split(' ')[0]?.[0] || ''}${user?.name?.split(' ')[1]?.[0] || ''}`.toUpperCase();

    const [bioSupported, setBioSupported] = useState(false);
    const [bioStatus, setBioStatus] = useState('idle'); // idle | loading | ok | error
    const [bioMsg, setBioMsg] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                setBioSupported(ok);
            } catch { /* no soportado */ }
        })();
    }, []);

    const handleActivarHuella = async () => {
        setBioStatus('loading');
        setBioMsg('');
        try {
            const deviceName = navigator.platform || 'Este dispositivo';
            await registerPasskey(deviceName);
            setBioStatus('ok');
            setBioMsg('Huella / Face ID activado en este dispositivo');
        } catch (err) {
            setBioStatus('error');
            if (err.name === 'NotAllowedError') {
                setBioMsg('Cancelado. Vuelve a intentarlo cuando quieras.');
            } else if (err.name === 'InvalidStateError') {
                setBioMsg('Ya tienes una huella registrada en este dispositivo.');
            } else {
                setBioMsg(err.response?.data?.message || 'No se pudo registrar la huella');
            }
        }
    };

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

            {bioSupported && (
                <div className="perfil-bio-section">
                    <p className="perfil-bio-label">ACCESO BIOMÉTRICO</p>
                    {bioStatus === 'ok' ? (
                        <p className="perfil-bio-success">{bioMsg}</p>
                    ) : (
                        <>
                            <button
                                className="perfil-bio-btn"
                                onClick={handleActivarHuella}
                                disabled={bioStatus === 'loading'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 1C8.5 1 5.5 2.5 3.5 5M12 1c3.5 0 6.5 1.5 8.5 4M3 9c-.3 1-.5 2-.5 3M21 9c.3 1 .5 2 .5 3M12 7c-2.8 0-5 2.2-5 5 0 1.5.3 2.9.8 4.1M12 7c2.8 0 5 2.2 5 5 0 1.5-.3 2.9-.8 4.1M12 11c-1.1 0-2 .9-2 2 0 1.5.4 2.9 1 4.1M12 11c1.1 0 2 .9 2 2 0 1.5-.4 2.9-1 4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                                {bioStatus === 'loading' ? 'Registrando…' : 'Activar huella / Face ID'}
                            </button>
                            {bioStatus === 'error' && <p className="perfil-bio-error">{bioMsg}</p>}
                        </>
                    )}
                </div>
            )}

            <button className="perfil-logout" onClick={onLogout}>Cerrar sesión</button>
        </div>
    );
};

// ── Acceso restringido ────────────────────────────────────
const AccesoRestringido = ({ label }) => (
    <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
    }}>
        <div style={{
            width: 56, height: 56, borderRadius: 16, marginBottom: 16,
            background: 'rgba(239,159,39,0.10)', border: '1px solid rgba(239,159,39,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#ef9f27" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="#ef9f27" strokeWidth="2" strokeLinecap="round" />
            </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f0', marginBottom: 8 }}>Acceso restringido</div>
        <div style={{ fontSize: 13, color: '#888', lineHeight: 1.55, maxWidth: 280 }}>
            No tienes permiso para acceder a <strong style={{ color: '#ccc' }}>{label}</strong>.
            Contacta al administrador para solicitar acceso.
        </div>
    </div>
);

const PANEL_LABELS = {
    movimientos: 'Registrar Movimientos',
    reportes:    'Avance del Día',
    placas:      'Placas Vehículos',
    extensiones: 'Extensiones',
    personas:    'Gestión de Personas',
    jefes:       'Jefes Inmediatos',
    utilidades:  'Utilidades',
};

// ── Panel estado activación (para usuarios pendientes o con permisos parciales) ──
const PanelActivacion = ({ user, permisosPanel, isPending }) => {
    const paneles = Object.entries(PANEL_LABELS);
    return (
        <div style={{
            margin: '12px 12px 4px', borderRadius: 14,
            background: 'rgba(239,159,39,0.07)',
            border: '1px solid rgba(239,159,39,0.25)',
            padding: '14px 16px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(239,159,39,0.15)', border: '1px solid rgba(239,159,39,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#ef9f27" strokeWidth="2" />
                        <path d="M12 8v4M12 16h.01" stroke="#ef9f27" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
                <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f0f0f0' }}>
                        {isPending ? 'Cuenta pendiente de activación' : 'Acceso parcial'}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#888' }}>
                        {isPending
                            ? 'El administrador debe aprobar tu cuenta para habilitar los módulos.'
                            : 'Algunos módulos aún no están habilitados para tu cuenta.'}
                    </div>
                </div>
            </div>

            {/* Pasos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
                {[
                    { label: 'Registro', done: true },
                    { label: 'Aprobación', done: !isPending },
                    { label: 'Acceso completo', done: !isPending && paneles.every(([id]) => permisosPanel.includes(id)) },
                ].map((step, i, arr) => (
                    <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : undefined }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{
                                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                background: step.done ? 'rgba(40,201,151,0.2)' : 'rgba(239,159,39,0.15)',
                                border: `1.5px solid ${step.done ? '#28c997' : 'rgba(239,159,39,0.5)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {step.done
                                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#28c997" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    : <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef9f27', opacity: 0.7 }} />
                                }
                            </div>
                            <span style={{ fontSize: 9.5, color: step.done ? '#28c997' : '#888', fontWeight: 600, whiteSpace: 'nowrap' }}>{step.label}</span>
                        </div>
                        {i < arr.length - 1 && (
                            <div style={{ flex: 1, height: 1.5, background: step.done ? 'rgba(40,201,151,0.3)' : 'rgba(255,255,255,0.08)', margin: '0 6px', marginBottom: 14 }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Módulos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {paneles.map(([id, label]) => {
                    const granted = !isPending && permisosPanel.includes(id);
                    return (
                        <div key={id} style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            background: granted ? 'rgba(40,201,151,0.07)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${granted ? 'rgba(40,201,151,0.2)' : 'rgba(255,255,255,0.07)'}`,
                            borderRadius: 8, padding: '6px 8px',
                        }}>
                            <div style={{
                                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                                background: granted ? 'rgba(40,201,151,0.2)' : 'rgba(239,159,39,0.15)',
                                border: `1px solid ${granted ? '#28c99766' : 'rgba(239,159,39,0.4)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {granted
                                    ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#28c997" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    : <svg width="7" height="7" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#ef9f27" strokeWidth="2.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="#ef9f27" strokeWidth="2.5" strokeLinecap="round" /></svg>
                                }
                            </div>
                            <span style={{ fontSize: 10.5, color: granted ? '#d4d4d4' : '#666', fontWeight: 600 }}>{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Dashboard principal ───────────────────────────────────
const WorkspacePage = () => {
    const { user, logout, isAdmin, isPending, hasPermiso, permisosPanel } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [tabActiva, setTabActiva] = useState('inicio');
    const [dashCollapsed, setDashCollapsed] = useState(true);
    const [movCollapsed, setMovCollapsed] = useState(false);
    const [chartCollapsed, setChartCollapsed] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 280);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const [diasActivos, setDiasActivos] = useState(0);
    const [movimientos, setMovimientos] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [detailMov, setDetailMov] = useState(null);
    const [editMov, setEditMov] = useState(null);

    const [showDrawer, setShowDrawer] = useState(false);
    const [lastDrawerTab, setLastDrawerTab] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [vistaInicio, setVistaInicio] = useState('movimientos');
    const [registroDetailMov, setRegistroDetailMov] = useState(null);
    const [showRegistroConfig, setShowRegistroConfig] = useState(false);
    // Config de narrativa por puesto (se carga cuando llega turnoActivo)
    const [registroConfig, setRegistroConfig] = useState({});
    const [bitDetailIdx, setBitDetailIdx] = useState(null);
    const [swipedRegId, setSwipedRegId] = useState(null);
    const regSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });
    const [swipedBitMainIdx, setSwipedBitMainIdx] = useState(null);
    const bitMainSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });
    const [movSort, setMovSort] = useState('desc');
    const [regSort, setRegSort] = useState('asc');
    const [detailMovIdx, setDetailMovIdx] = useState(null);
    const [swipedMovId, setSwipedMovId] = useState(null);
    const movSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });
    const [editHoraMov, setEditHoraMov] = useState(null);
    const [editIngresoBit, setEditIngresoBit] = useState(null);
    const [highlightMovId, setHighlightMovId] = useState(null);
    const [highlightRegId, setHighlightRegId] = useState(null);

    useEffect(() => {
        if (!highlightRegId || vistaInicio !== 'registro') return;
        const t = setTimeout(() => {
            const el = document.querySelector(`[data-regid="${highlightRegId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('flash-highlight');
                setTimeout(() => el.classList.remove('flash-highlight'), 1400);
            }
            setHighlightRegId(null);
        }, 200);
        return () => clearTimeout(t);
    }, [highlightRegId, vistaInicio]);

    useEffect(() => {
        if (!highlightMovId || vistaInicio !== 'movimientos') return;
        const t = setTimeout(() => {
            const el = document.querySelector(`[data-movid="${highlightMovId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('flash-highlight');
                setTimeout(() => el.classList.remove('flash-highlight'), 1400);
            }
            setHighlightMovId(null);
        }, 200);
        return () => clearTimeout(t);
    }, [highlightMovId, vistaInicio]);

    const stats = useMemo(
        () => movimientos.length > 0 ? buildStats(movimientos, diasActivos) : null,
        [movimientos, diasActivos]
    );

    const movsFiltrados = useMemo(() => {
        const sq = searchQuery.toLowerCase();
        return sq
            ? movimientos.filter(m =>
                m.placa.toLowerCase().includes(sq) ||
                (m.conductor || '').toLowerCase().includes(sq))
            : movimientos;
    }, [movimientos, searchQuery]);

    const sortedMovs = useMemo(() => {
        const arr = [...movsFiltrados];
        return movSort === 'desc'
            ? arr.sort((a, b) => (b.hora || '').localeCompare(a.hora || ''))
            : arr.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    }, [movsFiltrados, movSort]);

    const sortedRegs = useMemo(() => {
        const arr = [...movsFiltrados];
        return regSort === 'asc'
            ? arr.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
            : arr.sort((a, b) => (b.hora || '').localeCompare(a.hora || ''));
    }, [movsFiltrados, regSort]);

    const placaCounts = useMemo(() => {
        const counts = {};
        movimientos.forEach(m => { counts[m.placa] = (counts[m.placa] || 0) + 1; });
        return counts;
    }, [movimientos]);

    const bitacora = useMemo(() => {
        // Ordenar cronológicamente (más antiguo primero) para que salida siempre preceda su ingreso
        const sorted = [...movimientos].sort((a, b) => (a.hora || '').localeCompare(b.hora || '') || (a._id || '').localeCompare(b._id || ''));
        const openSalidas = {};
        const pairs = [];
        for (const mov of sorted) {
            if (mov.tipo === 'salida') {
                if (!openSalidas[mov.placa]) openSalidas[mov.placa] = [];
                openSalidas[mov.placa].push(mov);
            } else if (mov.tipo === 'ingreso') {
                if (openSalidas[mov.placa] && openSalidas[mov.placa].length > 0) {
                    const sal = openSalidas[mov.placa].shift();
                    const condSal = (sal.conductor || '').trim();
                    const condIng = (mov.conductor || '').trim();
                    pairs.push({
                        placa: mov.placa,
                        salida: sal,
                        ingreso: mov,
                        horaS: sal.hora,
                        horaI: mov.hora,
                        conductor: condSal.toLowerCase() === condIng.toLowerCase()
                            ? (condSal || '—')
                            : `${condSal || '—'} / ${condIng || '—'}`,
                        conductorChanged: condSal.toLowerCase() !== condIng.toLowerCase(),
                        marca: sal.marca || mov.marca,
                        empresa: sal.empresa || mov.empresa,
                        tipoVehiculo: sal.tipoVehiculo || mov.tipoVehiculo,
                        destino: sal.destino || mov.destino,
                        actividad: mov.actividad || sal.actividad || '',
                        status: 'completo',
                    });
                } else {
                    pairs.push({
                        placa: mov.placa, salida: null, ingreso: mov,
                        horaS: '—', horaI: mov.hora,
                        conductor: mov.conductor || '—', conductorChanged: false,
                        marca: mov.marca, empresa: mov.empresa,
                        tipoVehiculo: mov.tipoVehiculo, destino: mov.destino,
                        actividad: mov.actividad || '',
                        status: 'solo-ingreso',
                    });
                }
            }
        }
        for (const sals of Object.values(openSalidas)) {
            for (const s of sals) {
                pairs.push({
                    placa: s.placa, salida: s, ingreso: null,
                    horaS: s.hora, horaI: '—',
                    conductor: s.conductor || '—', conductorChanged: false,
                    marca: s.marca, empresa: s.empresa,
                    tipoVehiculo: s.tipoVehiculo, destino: s.destino,
                    actividad: s.actividad || '',
                    status: 'en-campo',
                });
            }
        }
        // Ordenar por el primer evento registrado (mínimo entre horaS y horaI)
        const firstHora = p => {
            const times = [p.horaS, p.horaI].filter(h => h && h !== '—');
            return times.length ? times.slice().sort()[0] : '99:99';
        };
        return pairs.sort((a, b) => firstHora(a).localeCompare(firstHora(b)));
    }, [movimientos]);

    const bitacoraFiltrada = useMemo(() => {
        if (!searchQuery) return bitacora;
        const sq = searchQuery.toLowerCase();
        return bitacora.filter(b =>
            b.placa?.toLowerCase().includes(sq) ||
            (b.conductor || '').toLowerCase().includes(sq) ||
            (b.empresa || '').toLowerCase().includes(sq)
        );
    }, [bitacora, searchQuery]);

    const bitPlacaCounts = useMemo(() => {
        const c = {};
        bitacora.forEach(b => { c[b.placa] = (c[b.placa] || 0) + 1; });
        return c;
    }, [bitacora]);

    useEffect(() => {
        api.get('/turnos/activo')
            .then(({ data }) => { if (data.turno) setTurnoActivo(data.turno); })
            .catch(() => { });
    }, []);

    const cargarDatos = async () => {
        if (!turnoActivo) return;
        const turnoFecha = turnoActivo.fecha || getTurnoFecha(turnoActivo.turnoActual);
        try {
            const mRes = await api.get(`/movimientos?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}&fecha=${turnoFecha}`);
            const serverMovs = mRes.data.movimientos;
            const serverIds = new Set(serverMovs.map(m => m._id));
            const pending = await getPendingMovimientos();
            const pendingItems = pending
                .filter(item => !serverIds.has(item.uuid))
                .map(item => ({ _id: item.uuid, _pending: true, hora: item.hora, fecha: item.fecha, ...item.payload }));
            setMovimientos([...serverMovs, ...pendingItems]);
            api.get(`/movimientos/stats?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}&fecha=${turnoFecha}`)
                .then(sRes => setDiasActivos(sRes.data.diasActivos ?? 0))
                .catch(() => {});
        } catch {
            // Sin conexión: conservar confirmados + cola Dexie
            const pending = await getPendingMovimientos();
            setMovimientos(prev => {
                const confirmed = prev.filter(m => !m._pending);
                const confirmedIds = new Set(confirmed.map(m => m._id));
                const queueItems = pending
                    .filter(i => !confirmedIds.has(i.uuid))
                    .map(i => ({ _id: i.uuid, _pending: true, hora: i.hora, fecha: i.fecha, ...i.payload }));
                return [...confirmed, ...queueItems];
            });
        }
    };

    useEffect(() => { cargarDatos(); }, [turnoActivo]);

    // Cargar/recargar la config de narrativa cada vez que cambia el puesto
    useEffect(() => {
        if (turnoActivo?.puesto) setRegistroConfig(getRegistroConfig(turnoActivo.puesto));
    }, [turnoActivo?.puesto]);

    // Handlers para guardado optimista (nuevo movimiento aparece al instante)
    const handleGuardadoOptimista = tempMov => {
        setMovimientos(prev => [...prev, tempMov]);
    };

    const handleMovimientoConfirmado = (tempId, realMov) => {
        setMovimientos(prev => prev.map(m => m._id === tempId ? realMov : m));
    };

    // Sincronización offline: reintenta la cola Dexie cuando vuelve la conexión
    // y cada 30 s para cubrir casos donde el servidor rechazó el POST sin perder internet
    useEffect(() => {
        if (!turnoActivo || isPending) return;
        const onSynced = ({ uuid, serverId }) => {
            setMovimientos(prev => prev.map(m => m._id === uuid ? { ...m, _id: serverId, _pending: false } : m));
        };
        const onSyncedEdicion = (id, movData) => {
            setMovimientos(prev => prev.map(m => m._id === id ? { ...m, ...movData } : m));
        };
        const sync = () => {
            if (navigator.onLine) {
                syncPendingMovimientos(onSynced);
                syncPendingEdiciones(onSyncedEdicion);
            }
        };
        sync();
        window.addEventListener('online', sync);
        const interval = setInterval(sync, 30_000);
        return () => {
            window.removeEventListener('online', sync);
            clearInterval(interval);
        };
    }, [turnoActivo, isPending]);

    useEffect(() => {
        if (location.state?.openDrawer) {
            setLastDrawerTab(location.state.activeTab || null);
            setShowDrawer(true);
            window.history.replaceState({}, '');
        }
    }, []);

    const handleTabChange = tab => {
        if (DRAWER_TABS.has(tab)) setLastDrawerTab(tab);
        setTabActiva(tab);
        setShowSearch(false);
        setSearchQuery('');
    };

    const toggleSelectMode = () => { setSelectMode(s => !s); setSelectedIds(new Set()); setSwipedMovId(null); };

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

    const handleDeleteBitPair = async (b, idx) => {
        const ids = [b.salida?._id, b.ingreso?._id].filter(Boolean);
        if (!ids.length) return;
        const label = ids.length > 1 ? 'los 2 movimientos' : 'el movimiento';
        if (!window.confirm(`¿Eliminar ${label} de ${b.placa}?`)) return;
        try {
            await Promise.all(ids.map(id => api.delete(`/movimientos/${id}`)));
            setBitDetailIdx(null);
            cargarDatos();
        } catch {}
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
            await navigator.share({ title: 'Movimiento FLUJO', text: movToText(m) }).catch(() => {});
        } else handleCopy(m);
    };

    const handleEdit = m => setEditMov(m);

    // Actualiza el movimiento en estado local de inmediato (antes de que la API confirme)
    const handleEditadoOptimista = updatedMov => {
        setMovimientos(prev => prev.map(m => m._id === updatedMov._id ? { ...m, ...updatedMov } : m));
        setEditMov(null);
    };

    const handleEditHora = async (id, newHora) => {
        setMovimientos(prev => prev.map(m => m._id === id ? { ...m, hora: newHora } : m));
        setEditHoraMov(null);
        try { await api.put(`/movimientos/${id}`, { hora: newHora }); }
        catch { cargarDatos(); }
    };

    // Registrar / editar ingreso directo desde la bitácora
    const handleGuardarIngreso = async ({ b, hora, conductor, cedula, actividad, destino }) => {
        setEditIngresoBit(null);
        if (b.ingreso) {
            // Actualizar ingreso existente — optimista
            const updated = { ...b.ingreso, hora, conductor, cedula, actividad, destino };
            setMovimientos(prev => prev.map(m => m._id === b.ingreso._id ? updated : m));
            api.put(`/movimientos/${b.ingreso._id}`, { hora, conductor, cedula, actividad, destino }).catch(() => cargarDatos());
        } else {
            // Crear nuevo movimiento de ingreso
            const tempId = crypto.randomUUID();
            const fechaFlujo = turnoActivo?.fecha || getTurnoFecha(turnoActivo?.turnoActual);
            const payload = {
                tipo: 'ingreso',
                puesto: turnoActivo?.puesto,
                bloque: turnoActivo?.bloque,
                placa: b.placa,
                marca: b.salida?.marca || '',
                color: b.salida?.color || '',
                tipoVehiculo: b.salida?.tipoVehiculo || '',
                empresa: b.salida?.empresa || '',
                conductor: conductor || b.salida?.conductor || '',
                cedula: cedula || b.salida?.cedula || '',
                actividad,
                destino,
                fecha: fechaFlujo,
                hora,
                clientUUID: tempId,
            };
            const tempMov = { ...payload, _id: tempId, _pending: true };
            setMovimientos(prev => [...prev, tempMov]);
            await encolarMovimiento({ uuid: tempId, payload, hora, fecha: fechaFlujo });
            try {
                const { data } = await api.post('/movimientos', payload);
                await marcarSincronizado(tempId, data.movimiento._id);
                handleMovimientoConfirmado(tempId, data.movimiento);
            } catch { /* queda en cola Dexie */ }
        }
    };

    const exportData = format => {
        setShowExportMenu(false);
        const fecha = new Date().toISOString().split('T')[0];
        exportMovimientos(movimientos, format, `movimientos_${fecha}`);
    };

    const exportBitacora = async () => {
        const XLSX = await import('xlsx');
        const fecha = new Date().toISOString().split('T')[0];
        const cols = ['#', 'Placa', 'Tipo Vehículo', 'Marca', 'Empresa', 'Hora Salida', 'Hora Ingreso', 'Conductor', 'Destino / Actividad', 'Estado'];
        const estadoLabel = { completo: 'Completado', 'en-campo': 'En campo', 'solo-ingreso': 'Solo ingreso' };
        const rows = bitacora.map((b, i) => [
            i + 1,
            b.placa,
            b.tipoVehiculo || '—',
            b.marca || '—',
            b.empresa || '—',
            b.horaS,
            b.horaI,
            b.conductor,
            b.destino || '—',
            estadoLabel[b.status] || b.status,
        ]);
        const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
        ws['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 13 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bitácora');
        XLSX.writeFile(wb, `bitacora_${fecha}.xlsx`);
    };

    const handleSaveRegistroConfig = cfg => {
        localStorage.setItem(getRegistroConfigKey(turnoActivo?.puesto), JSON.stringify(cfg));
        setRegistroConfig(cfg);
    };

    const exportRegistroExcel = async () => {
        if (!movimientos.length) return;
        const XLSX = await import('xlsx');
        const fecha = new Date().toISOString().split('T')[0];
        const cols = ['#', 'Hora', 'Tipo', 'Placa', 'Tipo Vehículo', 'Conductor', 'Cédula', 'Empresa', 'Destino', 'Guía', 'Empresa Autoriza', 'Quién Autoriza', 'Narrativa'];
        const rows = [...movimientos].map((m, i) => [
            i + 1,
            m.hora,
            m.tipo === 'ingreso' ? 'Ingreso' : 'Salida',
            m.placa,
            m.tipoVehiculo || '—',
            m.conductor || '—',
            m.cedula || '—',
            m.empresa || '—',
            m.destino || '—',
            m.guia || '—',
            m.empresaAutoriza || registroConfig.empresaAutoriza || '—',
            m.quienAutoriza || '—',
            generarNarrativa(m, registroConfig),
        ]);
        const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
        ws['!cols'] = [{ wch: 4 }, { wch: 7 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 13 }, { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 80 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registro');
        XLSX.writeFile(wb, `registro_${fecha}.xlsx`);
    };

    const exportRegistroWord = () => {
        if (!movimientos.length) return;
        const fecha = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const puesto = turnoActivo?.puesto || '';
        const entradas = [...movimientos].map(m => `<p style="margin:0 0 10pt 0;font-size:12pt;">${generarNarrativa(m, registroConfig)}</p>`).join('');
        const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Registro</title><style>body{font-family:Arial,sans-serif;margin:2cm;}h2{font-size:14pt;margin-bottom:4pt;}p.sub{font-size:11pt;color:#555;margin:0 0 16pt 0;}hr{border:none;border-top:1px solid #ccc;margin:12pt 0;}</style></head><body><h2>REGISTRO DE MOVIMIENTOS DE VEHÍCULOS</h2><p class="sub">${fecha} &nbsp;·&nbsp; ${puesto}</p><hr/>${entradas}</body></html>`;
        const blob = new Blob(['﻿', html], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `registro_${new Date().toISOString().split('T')[0]}.doc`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleShareMovs = async (movsToShare) => {
        setShowShareMenu(false);
        if (!movsToShare.length) return;
        const fechaLarga = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const text = `FLUJO DE VEHÍCULOS — ${fechaLarga}\nTotal: ${movsToShare.length} movimiento${movsToShare.length !== 1 ? 's' : ''}\n\n` +
            movsToShare.map((m, i) =>
                `${i + 1}. [${(m.tipo || 'MOV').toUpperCase()}] ${m.placa}\n` +
                `   ${m.conductor || '—'} · ${m.empresa || '—'}\n` +
                `   → ${m.destino || '—'}  ${m.hora}`
            ).join('\n\n');
        if (navigator.share) {
            await navigator.share({ title: 'FLUJO — Movimientos', text }).catch(() => {});
        } else {
            navigator.clipboard?.writeText(text);
        }
    };

    const openDetailMov = m => {
        const idx = sortedMovs.findIndex(x => x._id === m._id);
        setDetailMov(m);
        setDetailMovIdx(idx);
    };

    const goToReg = id => { setVistaInicio('registro'); setHighlightRegId(id); };
    const goToMov = id => { setVistaInicio('movimientos'); setHighlightMovId(id); };
    const cardProps = { selectMode, onToggleSelect: toggleSelect, onOpenDetail: openDetailMov, onDelete: handleDelete, onEdit: handleEdit, onCopy: handleCopy, onShare: handleShare, swipedMovId, setSwipedMovId, movSwipeRef, onEditHora: id => setEditHoraMov(sortedMovs.find(m => m._id === id)), onGoToReg: goToReg };

    const isDrawerTab = DRAWER_TABS.has(tabActiva);

    return (
        <div className="ws-wrapper">

            {showDrawer && (
                <DrawerMenu
                    onClose={() => setShowDrawer(false)}
                    activeTab={lastDrawerTab}
                    isAdmin={isAdmin}
                    isPending={isPending}
                    hasPermiso={hasPermiso}
                    onNavigate={tab => {
                        setLastDrawerTab(tab);
                        if (tab === 'admin') navigate('/admin');
                        else if (tab === 'calendario') navigate('/calendario');
                        else if (tab === 'jefes') navigate('/flujos/personal');
                        else handleTabChange(tab);
                    }}
                    onNuevoFlujo={() => {
                        if (turnoActivo) {
                            navigate('/turno', {
                                state: {
                                    bloqueId: turnoActivo.bloque,
                                    puesto: turnoActivo.puesto,
                                    bloqueIndex: 0,
                                    totalBloques: 1,
                                    bloquesConPuestos: [{ bloqueId: turnoActivo.bloque, puesto: turnoActivo.puesto }],
                                    fromWorkspace: true,
                                }
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
                    onClick={isDrawerTab ? () => { handleTabChange('inicio'); setShowDrawer(true); } : () => setShowDrawer(true)}>
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
                    {!isDrawerTab && tabActiva !== 'flujos' && tabActiva !== 'perfil' && tabActiva !== 'utilidades' && (
                        <button className="ws-topbar-btn" onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke={showSearch ? '#818cf8' : '#fff'} strokeWidth="2" />
                                <path d="M21 21l-4.35-4.35" stroke={showSearch ? '#818cf8' : '#fff'} strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    )}
                    {!isDrawerTab && tabActiva !== 'flujos' && tabActiva !== 'utilidades' && (
                        <button className="ws-topbar-btn" onClick={() => handleTabChange(tabActiva === 'perfil' ? 'inicio' : 'perfil')}>
                            <IconUserCircle active={tabActiva === 'perfil'} />
                        </button>
                    )}
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
                    <>
                    {(isPending || (!isAdmin && permisosPanel.length < Object.keys(PANEL_LABELS).length)) && (
                        <PanelActivacion user={user} permisosPanel={permisosPanel} isPending={isPending} />
                    )}
                    <div className="ws-vista-tabs">
                        <button className={`ws-vista-tab${vistaInicio === 'movimientos' ? ' active' : ''}`}
                            onClick={() => setVistaInicio('movimientos')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Movimientos
                        </button>
                        <button className={`ws-vista-tab${vistaInicio === 'bitacora' ? ' active' : ''}`}
                            onClick={() => setVistaInicio('bitacora')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            Bitácora
                        </button>
                        <button className={`ws-vista-tab${vistaInicio === 'registro' ? ' active' : ''}`}
                            onClick={() => setVistaInicio('registro')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                <path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Registro
                        </button>
                    </div>
                    {vistaInicio === 'bitacora' && (
                        <div className="ws-bitacora">
                            <div className="bit-toolbar">
                                <span className="bit-toolbar-count">
                                    {searchQuery
                                        ? <>{bitacoraFiltrada.length} <span style={{ color: '#818cf8' }}>de {bitacora.length}</span></>
                                        : <>{bitacora.length} registro{bitacora.length !== 1 ? 's' : ''}</>
                                    }
                                </span>
                                <button className="bit-export-btn" onClick={exportBitacora} disabled={bitacora.length === 0}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                        <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    Exportar Excel
                                </button>
                            </div>
                            {bitacora.length === 0 ? (
                                <p className="ws-empty">Sin movimientos para consolidar</p>
                            ) : bitacoraFiltrada.length === 0 ? (
                                <p className="ws-empty">Sin resultados para "{searchQuery}"</p>
                            ) : (
                                <div className="bit-table-scroll">
                                    <div className="bit-table">
                                        <div className="bit-list">
                                            {bitacoraFiltrada.map((b, i) => {
                                                const bText = [
                                                    `Bitácora: ${b.placa}${b.tipoVehiculo ? ' · ' + b.tipoVehiculo : ''}`,
                                                    `Estado: ${b.status === 'completo' ? 'Completado' : b.status === 'en-campo' ? 'En campo' : 'Solo ingreso'}`,
                                                    `Conductor: ${b.conductor}`,
                                                    b.empresa && `Empresa: ${b.empresa}`,
                                                    b.destino && `Destino: ${b.destino}`,
                                                    `Salida: ${b.horaS}  →  Ingreso: ${b.horaI}`,
                                                ].filter(Boolean).join('\n');
                                                const isSwiped = swipedBitMainIdx === i;
                                                return (
                                                <div key={i} className="bit-item">
                                                    <div className="bit-actions" onClick={e => e.stopPropagation()}>
                                                        <button className="bit-act-btn" title="Copiar" onClick={() => { navigator.clipboard?.writeText(bText); setSwipedBitMainIdx(null); }}><IconCopy /></button>
                                                        <button className="bit-act-btn" title="Compartir" onClick={async () => { if (navigator.share) { await navigator.share({ title: 'Bitácora FLUJO', text: bText }).catch(() => {}); } else navigator.clipboard?.writeText(bText); setSwipedBitMainIdx(null); }}><IconShare /></button>
                                                        <button className="bit-act-btn" title="Editar" onClick={() => { setBitDetailIdx(i); setSwipedBitMainIdx(null); }}>
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                        </button>
                                                        <button className="bit-act-btn danger" title="Eliminar" onClick={() => { handleDeleteBitPair(b, i); setSwipedBitMainIdx(null); }}><IconMinus /></button>
                                                    </div>
                                                    <div
                                                        className={`bit-card bit-${b.status}${isSwiped ? ' bit-row-swiped' : ''}`}
                                                        onTouchStart={e => { bitMainSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false }; }}
                                                        onTouchMove={e => {
                                                            const dx = e.touches[0].clientX - bitMainSwipeRef.current.startX;
                                                            const dy = e.touches[0].clientY - bitMainSwipeRef.current.startY;
                                                            if (!bitMainSwipeRef.current.moved && !bitMainSwipeRef.current.vertScroll) {
                                                                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                                                if (Math.abs(dy) > Math.abs(dx)) { bitMainSwipeRef.current.vertScroll = true; return; }
                                                                bitMainSwipeRef.current.moved = true;
                                                            }
                                                            if (bitMainSwipeRef.current.moved) e.preventDefault();
                                                        }}
                                                        onTouchEnd={e => {
                                                            if (!bitMainSwipeRef.current.moved) return;
                                                            const dx = e.changedTouches[0].clientX - bitMainSwipeRef.current.startX;
                                                            if (isSwiped) { if (dx < -30) setSwipedBitMainIdx(null); }
                                                            else {
                                                                if (dx > 55) setSwipedBitMainIdx(i);
                                                                else if (dx < -55) setEditIngresoBit(b);
                                                            }
                                                        }}
                                                        {...addMouseSwipe(bitMainSwipeRef, dx => {
                                                            if (isSwiped) { if (dx < -30) setSwipedBitMainIdx(null); }
                                                            else {
                                                                if (dx > 55) setSwipedBitMainIdx(i);
                                                                else if (dx < -55) setEditIngresoBit(b);
                                                            }
                                                        })}
                                                        onClick={() => { if (bitMainSwipeRef.current?.didDrag) { bitMainSwipeRef.current.didDrag = false; return; } if (isSwiped) { setSwipedBitMainIdx(null); return; } setBitDetailIdx(i); }}
                                                    >
                                                        {/* Fila 1: horas · placa | tipo vehículo */}
                                                        <div className="bit-card-r1">
                                                            <div className="bit-card-horas">
                                                                <span className="bit-hora-s">{b.horaS || '—'}</span>
                                                                <span className="bit-card-sep"> — </span>
                                                                <span className="bit-hora-i">{b.horaI || '—'}</span>
                                                                <span className="bit-card-sep"> · </span>
                                                                <span className="bit-tplaca">{b.placa}</span>
                                                            </div>
                                                            {b.tipoVehiculo && <span className="bit-ttipo">{b.tipoVehiculo.toUpperCase()}</span>}
                                                        </div>
                                                        {/* Fila 2: conductor | destino/empresa */}
                                                        <div className="bit-card-r2">
                                                            <span className={`bit-tconductor${b.conductorChanged ? ' changed' : ''}`}>
                                                                {b.conductorChanged && (
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                )}
                                                                {b.conductor || '—'}
                                                            </span>
                                                            {(b.destino || b.empresa) && (
                                                                <span className="bit-card-dest">{b.destino || b.empresa}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {vistaInicio === 'registro' && (
                        <div className="ws-registro">
                            <div className="reg-toolbar">
                                <span className="reg-count">
                                    {searchQuery
                                        ? <>{sortedRegs.length} <span style={{ color: '#818cf8' }}>de {movimientos.length}</span></>
                                        : <>{movimientos.length} entrada{movimientos.length !== 1 ? 's' : ''}</>
                                    }
                                </span>
                                <div className="reg-toolbar-actions">
                                    <span
                                        className="sort-toggle-btn"
                                        title={regSort === 'asc' ? 'Más antiguo primero' : 'Más reciente primero'}
                                        onClick={() => setRegSort(s => s === 'asc' ? 'desc' : 'asc')}>
                                        {regSort === 'asc' ? '↑ Ant.' : '↓ Rec.'}
                                    </span>
                                    <button className="reg-cfg-btn" onClick={() => setShowRegistroConfig(true)}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        Configurar
                                    </button>
                                    <button className="reg-export-btn" onClick={exportRegistroExcel} disabled={!movimientos.length}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2"/></svg>
                                        Excel
                                    </button>
                                    <button className="reg-export-btn" onClick={exportRegistroWord} disabled={!movimientos.length}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
                                        Word
                                    </button>
                                </div>
                            </div>
                            {movimientos.length === 0 ? (
                                <p className="ws-empty">Sin movimientos registrados</p>
                            ) : sortedRegs.length === 0 ? (
                                <p className="ws-empty">Sin resultados para "{searchQuery}"</p>
                            ) : (
                                <div className="reg-list">
                                    {sortedRegs.map(mov => (
                                        <div key={mov._id} className={`reg-entry reg-${mov.tipo}${swipedRegId === mov._id ? ' reg-swiped' : ''}`} data-regid={mov._id}>
                                            <div className="reg-actions" onClick={e => e.stopPropagation()}>
                                                <button className="reg-act-btn" title="Ver detalle" onClick={() => { setRegistroDetailMov(mov); setSwipedRegId(null); }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2"/></svg>
                                                </button>
                                                <button className="reg-act-btn" title="Editar" onClick={() => { handleEdit(mov); setSwipedRegId(null); }}>
                                                    <IconPencil />
                                                </button>
                                                <button className="reg-act-btn" title="Copiar" onClick={() => { navigator.clipboard?.writeText(generarNarrativa(mov, registroConfig)); setSwipedRegId(null); }}>
                                                    <IconCopy />
                                                </button>
                                                <button className="reg-act-btn" title="Compartir" onClick={async () => {
                                                    const text = generarNarrativa(mov, registroConfig);
                                                    if (navigator.share) { await navigator.share({ title: 'Movimiento FLUJO', text }).catch(() => {}); }
                                                    else { navigator.clipboard?.writeText(text); }
                                                    setSwipedRegId(null);
                                                }}>
                                                    <IconShare />
                                                </button>
                                                <button className="reg-act-btn danger" title="Eliminar" onClick={() => { handleDelete(mov._id); setSwipedRegId(null); }}>
                                                    <IconMinus />
                                                </button>
                                            </div>
                                            <div
                                                className="reg-entry-inner"
                                                onTouchStart={e => {
                                                    regSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false };
                                                }}
                                                onTouchMove={e => {
                                                    const dx = e.touches[0].clientX - regSwipeRef.current.startX;
                                                    const dy = e.touches[0].clientY - regSwipeRef.current.startY;
                                                    if (!regSwipeRef.current.moved && !regSwipeRef.current.vertScroll) {
                                                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                                        if (Math.abs(dy) > Math.abs(dx)) { regSwipeRef.current.vertScroll = true; return; }
                                                        regSwipeRef.current.moved = true;
                                                    }
                                                    if (regSwipeRef.current.moved) e.preventDefault();
                                                }}
                                                onTouchEnd={e => {
                                                    if (!regSwipeRef.current.moved) return;
                                                    const dx = e.changedTouches[0].clientX - regSwipeRef.current.startX;
                                                    if (swipedRegId === mov._id) {
                                                        if (dx < -30) setSwipedRegId(null);
                                                    } else {
                                                        if (dx > 55) setSwipedRegId(mov._id);
                                                        else if (dx < -55) goToMov(mov._id);
                                                    }
                                                }}
                                                {...addMouseSwipe(regSwipeRef, dx => {
                                                    if (swipedRegId === mov._id) {
                                                        if (dx < -30) setSwipedRegId(null);
                                                    } else {
                                                        if (dx > 55) setSwipedRegId(mov._id);
                                                        else if (dx < -55) goToMov(mov._id);
                                                    }
                                                })}
                                                onClick={() => {
                                                    if (regSwipeRef.current?.didDrag) { regSwipeRef.current.didDrag = false; return; }
                                                    if (swipedRegId === mov._id) { setSwipedRegId(null); return; }
                                                    setRegistroDetailMov(mov);
                                                }}
                                            >
                                                <div className="reg-narrativa">
                                                    <span className={`reg-badge reg-badge-${mov.tipo}`}>{mov.tipo === 'ingreso' ? '↓' : '↑'}</span>
                                                    {generarNarrativa(mov, registroConfig)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {vistaInicio === 'movimientos' && (
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
                                        <button className="ws-chart-toggle" onClick={() => setChartCollapsed(p => !p)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#818cf8', flexShrink: 0 }}>
                                                    <path d="M3 3h18v4H3zM3 10h12v4H3zM3 17h7v4H3z" fill="currentColor" opacity="0.8" />
                                                    <path d="M21 14l-4 4-4-4" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M17 18V10" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                                <span>Movimiento de vehículos</span>
                                                <span className="ws-chart-badge">+{stats?.totalFlujos ?? 0} hoy</span>
                                            </div>
                                            <svg
                                                width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                style={{ transition: 'transform 0.25s', transform: chartCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', color: '#666', flexShrink: 0 }}
                                            >
                                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {!chartCollapsed && (
                                            <Suspense fallback={<div style={{ height: 220 }} />}>
                                                <StatsChart
                                                    data={stats?.grafico}
                                                    turno={turnoActivo?.turnoActual || 'diurno'}
                                                    topDestinos={stats?.topDestinos || []}
                                                    topActividades={stats?.topActividades || []}
                                                    topPlacas={stats?.topPlacas || []}
                                                />
                                            </Suspense>
                                        )}
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
                                        <>
                                            <span
                                                className="sort-toggle-btn"
                                                title={movSort === 'desc' ? 'Más reciente primero' : 'Más antiguo primero'}
                                                onClick={e => { e.stopPropagation(); setMovSort(s => s === 'desc' ? 'asc' : 'desc'); }}>
                                                {movSort === 'desc' ? '↓ Rec.' : '↑ Ant.'}
                                            </span>
                                            <span className="select-toggle-btn"
                                                onClick={e => { e.stopPropagation(); toggleSelectMode(); }}>
                                                {selectMode ? 'Cancelar' : 'Selec.'}
                                            </span>
                                        </>
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
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="share-selected-btn"
                                                        onClick={() => handleShareMovs(movimientos.filter(m => selectedIds.has(m._id)))}>
                                                        Compartir {selectedIds.size}
                                                    </button>
                                                    <button className="delete-selected-btn" onClick={handleBatchDelete}>
                                                        Eliminar {selectedIds.size}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="ws-section-content">
                                        {movimientos.length === 0
                                            ? <p className="ws-empty">Sin movimientos registrados hoy</p>
                                            : movsFiltrados.length === 0
                                                ? <p className="ws-empty">Sin resultados para "{searchQuery}"</p>
                                                : sortedMovs.map(m => (
                                                    <MovCard key={m._id} m={m}
                                                        count={bitPlacaCounts[m.placa] || 1}
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
                    </>
                )}

                {tabActiva === 'avance' && (
                    (!isAdmin && (isPending || !hasPermiso('reportes')))
                        ? <AccesoRestringido label="Avance del Día" />
                        : <PantallaAvance turnoActivo={turnoActivo} user={user} />
                )}

                {tabActiva === 'flujos' && <PantallaFlujos turnoActivo={turnoActivo} />}

                {tabActiva === 'utilidades' && <PantallaUtilidades />}

                {tabActiva === 'perfil' && (
                    <PantallaPerfil user={user} turnoActivo={turnoActivo} onLogout={logout} />
                )}

                {tabActiva === 'placas-db' && ((!isAdmin && (isPending || !hasPermiso('placas'))) ? <AccesoRestringido label="Placas Vehículos" /> : <PantallaPlacasDB />)}
                {tabActiva === 'extensiones' && ((!isAdmin && (isPending || !hasPermiso('extensiones'))) ? <AccesoRestringido label="Extensiones" /> : <PantallaExtensiones />)}
                {tabActiva === 'personas' && ((!isAdmin && (isPending || !hasPermiso('personas'))) ? <AccesoRestringido label="Gestión de Personas" /> : <PantallaPersonas />)}
                {tabActiva === 'jefes' && ((!isAdmin && (isPending || !hasPermiso('jefes'))) ? <AccesoRestringido label="Jefes Inmediatos" /> : <PantallaStub title="Jefes Inmediatos" />)}
            </div>

            {/* FABs — solo en inicio / movimientos */}
            {tabActiva === 'inicio' && vistaInicio === 'movimientos' && !selectMode && (
                <>
                    {fabOpen && showShareMenu && (
                        <div className="share-menu">
                            <div className="export-menu-item"
                                onClick={() => handleShareMovs(movimientos)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                    <circle cx="6" cy="12" r="2.2" stroke="#818cf8" strokeWidth="2"/>
                                    <circle cx="17" cy="6" r="2.2" stroke="#818cf8" strokeWidth="2"/>
                                    <circle cx="17" cy="18" r="2.2" stroke="#818cf8" strokeWidth="2"/>
                                    <path d="M8 11l7-3.5M8 13l7 3.5" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round"/>
                                </svg>
                                Todos ({movimientos.length})
                            </div>
                        </div>
                    )}
                    {fabOpen && showExportMenu && (
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
                    <div className="ws-speed-dial">
                        <div className={`ws-dial-items${fabOpen ? ' open' : ''}`}>
                            <button className="ws-dial-item ws-dial-share"
                                onClick={() => { setShowShareMenu(s => !s); setShowExportMenu(false); }}
                                title="Compartir movimientos">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="17" cy="6" r="2.5" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="17" cy="18" r="2.5" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M8.3 10.8l5.4-3M8.3 13.2l5.4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                            <button className="ws-dial-item ws-dial-export"
                                onClick={() => { setShowExportMenu(s => !s); setShowShareMenu(false); }}
                                title="Exportar movimientos">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <button className="ws-dial-item ws-dial-add"
                                onClick={() => { setShowModal(true); setFabOpen(false); setShowShareMenu(false); setShowExportMenu(false); }}
                                title="Nuevo movimiento">
                                +
                            </button>
                        </div>
                        <button className={`ws-dial-trigger${fabOpen ? ' open' : ''}`}
                            onClick={() => { setFabOpen(s => !s); setShowShareMenu(false); setShowExportMenu(false); }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            </svg>
                        </button>
                    </div>
                </>
            )}

            {/* Modales */}
            {showModal && turnoActivo && (
                <ModalAgregar puesto={turnoActivo.puesto} bloque={turnoActivo.bloque} turnoActual={turnoActivo.turnoActual}
                    fechaFlujo={turnoActivo.fecha}
                    ubiIngreso={registroConfig.ubicacion || PUESTO_UBICACION[turnoActivo.puesto] || 'EPF'}
                    ubiSalida={PUESTO_SALIDA_DEFAULT[turnoActivo.puesto] || ''}
                    onClose={() => setShowModal(false)}
                    onGuardado={cargarDatos}
                    onGuardadoOptimista={handleGuardadoOptimista}
                    onMovimientoConfirmado={handleMovimientoConfirmado}
                    movimientos={movimientos} />
            )}
            {editMov && turnoActivo && (
                <ModalAgregar puesto={turnoActivo.puesto} bloque={turnoActivo.bloque} turnoActual={turnoActivo.turnoActual}
                    fechaFlujo={turnoActivo.fecha}
                    ubiIngreso={registroConfig.ubicacion || PUESTO_UBICACION[turnoActivo.puesto] || 'EPF'}
                    ubiSalida={PUESTO_SALIDA_DEFAULT[turnoActivo.puesto] || ''}
                    onClose={() => setEditMov(null)} onEditadoOptimista={handleEditadoOptimista} movimientos={movimientos} editData={editMov} />
            )}
            {detailMov && (
                <ModalDetalle
                    mov={detailMov}
                    onClose={() => { setDetailMov(null); setDetailMovIdx(null); }}
                    onEdit={handleEdit} onDelete={handleDelete} onCopy={handleCopy} onShare={handleShare}
                    hasPrev={detailMovIdx !== null && detailMovIdx > 0}
                    hasNext={detailMovIdx !== null && detailMovIdx < sortedMovs.length - 1}
                    onPrev={() => { const ni = detailMovIdx - 1; setDetailMovIdx(ni); setDetailMov(sortedMovs[ni]); }}
                    onNext={() => { const ni = detailMovIdx + 1; setDetailMovIdx(ni); setDetailMov(sortedMovs[ni]); }}
                    counter={detailMovIdx !== null ? `${detailMovIdx + 1} / ${sortedMovs.length}` : null}
                />
            )}
            {editHoraMov && (
                <ModalEditHora
                    mov={editHoraMov}
                    onClose={() => setEditHoraMov(null)}
                    onSave={handleEditHora}
                />
            )}
            {registroDetailMov && (
                <ModalDetalle mov={registroDetailMov} onClose={() => setRegistroDetailMov(null)}
                    onEdit={m => { handleEdit(m); setRegistroDetailMov(null); }} onDelete={id => { handleDelete(id); setRegistroDetailMov(null); }} onCopy={handleCopy} onShare={handleShare} />
            )}
            {showRegistroConfig && (
                <ModalRegistroConfig config={registroConfig} onSave={handleSaveRegistroConfig} onClose={() => setShowRegistroConfig(false)} />
            )}
            {bitDetailIdx !== null && (
                <ModalBitacoraDetalle
                    bitacora={bitacora}
                    idx={bitDetailIdx}
                    onClose={() => setBitDetailIdx(null)}
                    onChange={setBitDetailIdx}
                    onEditMov={handleEdit}
                    onEditIngreso={b => setEditIngresoBit(b)}
                    onDeletePair={handleDeleteBitPair}
                />
            )}
            {editIngresoBit && (
                <ModalRegistrarIngreso
                    b={editIngresoBit}
                    movimientos={movimientos}
                    ubiIngreso={registroConfig.ubicacion || PUESTO_UBICACION[turnoActivo?.puesto] || 'EPF'}
                    onClose={() => setEditIngresoBit(null)}
                    onGuardar={handleGuardarIngreso}
                />
            )}

            {/* Banner cuenta pendiente */}
            {isPending && (
                <div style={{
                    background: 'rgba(239,159,39,0.12)', borderTop: '1px solid rgba(239,159,39,0.3)',
                    padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, color: '#ef9f27',
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>Cuenta pendiente de aprobación. Los movimientos se guardan localmente hasta que el administrador active tu acceso.</span>
                </div>
            )}

            {/* Botón volver arriba */}
            {showScrollTop && !showModal && !editMov && !detailMov && !registroDetailMov && !showRegistroConfig && bitDetailIdx === null && !editHoraMov && !editIngresoBit && (
                <button
                    className="scroll-top-btn"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    title="Volver arriba"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
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
                    {
                        id: 'flujos', label: 'Flujos', icon: (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6h18M3 12h12M3 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )
                    },
                    ...(!isPending && hasPermiso('utilidades') ? [{
                        id: 'utilidades', label: 'Utilidades', icon: (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )
                    }] : []),
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
