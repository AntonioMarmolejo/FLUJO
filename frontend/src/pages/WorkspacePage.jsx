import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BLOQUES_DATA } from '../data/bloques.js';
import api from '../api/axios';
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from 'recharts';
import '../styles/WorkspacePage.css';
import * as XLSX from 'xlsx';
import jsQR from 'jsqr';

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

// ── Helpers ───────────────────────────────────────────────
const EMPTY_FORM = { tipo: 'salida', placa: '', marca: '', color: '', tipoVehiculo: '', empresa: '', conductor: '', cedula: '', destino: '', actividad: '', guia: '', guias: [], quienAutoriza: '', empresaAutoriza: '', documento: '', documentoNombre: '', documentoTipo: '' };
const TIPO_VEHICULO_OPTS = ['Sedán', 'SUV', 'Camioneta', 'Camión', 'Cama Baja', 'Cama Alta', 'Bus', 'Volquete', 'Tanquero', 'Grúa', 'Moto', 'Otro'];

const formatMov = m => [m.marca, m.color, m.conductor].filter(Boolean).join(' · ') || 'Sin datos';
const movToText = m =>
    `Placa: ${m.placa}\nTipo: ${m.tipo}\nConductor: ${m.conductor || '—'}\nCédula: ${m.cedula || '—'}\nEmpresa: ${m.empresa || '—'}\nDestino: ${m.destino || '—'}${m.actividad ? '\nActividad: ' + m.actividad : ''}${m.guia ? '\nGuía: ' + m.guia : ''}${m.quienAutoriza ? '\nAutoriza: ' + m.quienAutoriza : ''}${m.empresaAutoriza ? '\nEmpresa autoriza: ' + m.empresaAutoriza : ''}\nHora: ${m.hora} — ${m.fecha}`;

const REGISTRO_CONFIG_KEY = 'ws_registro_config';
const getRegistroConfig = () => {
    try { return JSON.parse(localStorage.getItem(REGISTRO_CONFIG_KEY) || '{}'); } catch { return {}; }
};
const generarNarrativa = (mov, cfg = {}) => {
    const { hora, tipo, conductor, cedula, empresa, tipoVehiculo, placa, destino, actividad, guia, guias, quienAutoriza, empresaAutoriza } = mov;
    const ubiIngreso = cfg.ubicacion || 'EPF';
    const accion = tipo === 'ingreso' ? `Ingresa al ${ubiIngreso}` : `Sale al ${destino || 'destino'}`;
    const dir = tipo === 'ingreso' ? 'trayendo' : 'llevando';
    let descripcion;
    const guiasValidas = (guias || []).filter(g => g.numero?.trim());
    if (guiasValidas.length === 1) {
        const g = guiasValidas[0];
        const emp = g.empresa || empresaAutoriza || cfg.empresaAutoriza || 'EP Petroecuador';
        descripcion = `${dir} materiales con guía N°: (${g.numero})${g.items ? ' de ' + g.items + ' item' : ''} de ${emp}${quienAutoriza ? ` autoriza ${quienAutoriza}` : ''}.`;
    } else if (guiasValidas.length > 1) {
        const partes = guiasValidas.map(g => {
            const emp = g.empresa || cfg.empresaAutoriza || '';
            return `n° ${g.numero}${g.items ? ' de ' + g.items + ' item' : ''}${emp ? ' de ' + emp : ''}`;
        });
        descripcion = `${dir} materiales con varias guías ${partes.join(', ')}${quienAutoriza ? `, autoriza ${quienAutoriza}` : ''}.`;
    } else if (guia && guia.trim()) {
        const emp = empresaAutoriza || cfg.empresaAutoriza || 'EP Petroecuador';
        descripcion = `${dir} materiales con guía N°: (${guia}) de ${emp}${quienAutoriza ? ` autoriza ${quienAutoriza}` : ''}.`;
    } else if (!actividad || /^vac[ií]o$/i.test(actividad.trim())) {
        descripcion = 'vacía';
    } else {
        descripcion = actividad.trim();
    }
    return `${hora} ${accion} el Sr. ${conductor || '—'} cc: ${cedula || '—'} de ${empresa || '—'} conduciendo la ${tipoVehiculo || 'vehículo'} de Placas ${placa} ${descripcion}`;
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

const SuggestionField = ({ name, label, required, placeholder, value, onChange, autoFilled, suggestions, onSelect, labelAction }) => (
    <div className={`modal-field ${autoFilled && value ? 'modal-field-autofilled' : ''}`}>
        <label>{label}{required && <span style={{ color: '#f87171' }}> *</span>}{labelAction}</label>
        <div className="placa-wrapper">
            <input type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} autoComplete="off" />
            {suggestions.length > 0 && (
                <div className="placa-suggestions">
                    {suggestions.map((s, i) => (
                        <div key={i} className="placa-suggestion-item" onClick={() => onSelect(s)}>
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

const TextSugField = ({ name, label, placeholder, value, onChange, onFocus, onClearSugs, suggestions, onSelect, multiline }) => (
    <div className="modal-field">
        <label>{label}</label>
        <div className="placa-wrapper">
            {multiline ? (
                <textarea name={name} placeholder={placeholder || ''} value={value} onChange={onChange} onFocus={onFocus}
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} autoComplete="off"
                    rows={3} style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 1.5 }} />
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

const DrawerMenu = ({ onClose, onNavigate, onNuevoFlujo, activeTab }) => (
    <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
                <span className="drawer-brand">FLUJO</span>
                <button className="drawer-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="drawer-nav">
                {DRAWER_ITEMS.map(item => (
                    <button key={item.tab}
                        className={`drawer-item ${item.tab === activeTab ? 'drawer-item-active' : ''}`}
                        onClick={() => { onNavigate(item.tab); onClose(); }}>
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

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setHint('Apunta al código QR');
                rafRef.current = requestAnimationFrame(tick);
            })
            .catch(() => setCamError('No se pudo acceder a la cámara. Verifica los permisos.'));

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
        reader.onload = ev => {
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
const ModalAgregar = ({ puesto, bloque, onClose, onGuardado, movimientos, editData }) => {
    const [form, setForm] = useState(editData
        ? { tipo: editData.tipo, placa: editData.placa, marca: editData.marca || '', color: editData.color || '', tipoVehiculo: editData.tipoVehiculo || '', empresa: editData.empresa || '', conductor: editData.conductor || '', cedula: editData.cedula || '', destino: editData.destino || '', actividad: editData.actividad || '', guia: editData.guia || '', guias: editData.guias || [], quienAutoriza: editData.quienAutoriza || '', empresaAutoriza: editData.empresaAutoriza || '', documento: editData.documento || '', documentoNombre: editData.documentoNombre || '', documentoTipo: editData.documentoTipo || '' }
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
    const searchTimer = useRef(null);
    const cedulaTimer = useRef(null);
    const conductorTimer = useRef(null);
    const docInputRef = useRef(null);
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
                setSuggestions(results);
                setPlacaNotFound(results.length === 0);
            } catch { setSuggestions([]); }
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
                setCedulaSugs(results);
                if (results.length === 0) setPersonaNotFound(true);
            } catch { setCedulaSugs([]); }
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
                setConductorSugs(results);
                if (results.length === 0) setPersonaNotFound(true);
            } catch { setConductorSugs([]); }
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

    const handleDocFile = async e => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async ev => {
                const compressed = await compressImage(ev.target.result);
                setForm(f => ({ ...f, documento: compressed, documentoNombre: file.name, documentoTipo: 'image/jpeg' }));
            };
            reader.readAsDataURL(file);
        } else {
            if (file.size > 5 * 1024 * 1024) { setError('El PDF no debe superar 5 MB'); return; }
            const reader = new FileReader();
            reader.onload = ev => setForm(f => ({ ...f, documento: ev.target.result, documentoNombre: file.name, documentoTipo: file.type }));
            reader.readAsDataURL(file);
        }
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
        setLoading(true);
        try {
            if (personaNotFound && form.cedula) {
                try {
                    await api.post('/personas', { nombres: form.conductor || '', cedula: form.cedula, empresa: form.empresa || '' });
                } catch { }
            }
            if (editData?._id) {
                await api.put(`/movimientos/${editData._id}`, form);
                onGuardado();
                onClose();
            } else {
                await api.post('/movimientos', { ...form, puesto, bloque });
                onGuardado();
                setForm(EMPTY_FORM);
                setSuggestions([]);
                setCedulaSugs([]);
                setConductorSugs([]);
                setDestinoSugs([]);
                setActividadSugs([]);
                setAutoFilled(false);
                setPersonaNotFound(false);
                setPlacaNotFound(false);
                setError('');
                setGuardado(true);
                setTimeout(() => setGuardado(false), 2500);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
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
                                ...(val === 'ingreso' && !f.destino ? { destino: 'EPF' } : {}),
                            }))}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="modal-fields">
                    <div className={`modal-field ${autoFilled ? 'modal-field-autofilled' : ''}`}>
                        <label>
                            <span>PLACAS <span style={{ color: '#f87171' }}>*</span></span>
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
                        <ModalCombo name="tipoVehiculo" label="TIPO" options={TIPO_VEHICULO_OPTS} placeholder="SUV, Sedán..." value={form.tipoVehiculo} {...fp} />
                        <TextSugField name="empresa" label="EMPRESA" placeholder="Empresa S.A."
                            value={form.empresa} onChange={handleEmpresaChange}
                            onFocus={() => setEmpresaSugs(recentUnique('empresa', form.empresa))}
                            onClearSugs={() => setEmpresaSugs([])}
                            suggestions={empresaSugs} onSelect={s => { setForm(f => ({ ...f, empresa: s })); setEmpresaSugs([]); }} />
                    </div>
                    <SuggestionField name="conductor" label="CONDUCTOR" placeholder="Nombre completo"
                        value={form.conductor} onChange={handleConductorChange} autoFilled={autoFilled}
                        suggestions={conductorSugs} onSelect={selectPersonaSug}
                        labelAction={!editData && (
                            <div style={{ display: 'flex', gap: 4 }}>
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
                                <button className="qr-field-btn" title="Adjuntar documento (PDF o imagen)" onClick={() => docInputRef.current.click()}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                        <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                                <input ref={docInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleDocFile} />
                            </div>
                        )} />
                    <SuggestionField name="cedula" label="CÉDULA" placeholder="Nro. de cédula"
                        value={form.cedula} onChange={handleCedulaChange} autoFilled={autoFilled}
                        suggestions={cedulaSugs} onSelect={selectPersonaSug} />
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
                    <TextSugField name="actividad" label="ACTIVIDAD / OBSERVACIÓN" placeholder="VACIO · con 2 pax a... · llevando materiales con varias guías..."
                        value={form.actividad} onChange={handleActividadChange}
                        onFocus={() => setActividadSugs(recentUnique('actividad', form.actividad))}
                        onClearSugs={() => setActividadSugs([])}
                        suggestions={actividadSugs} onSelect={s => { setForm(f => ({ ...f, actividad: s })); setActividadSugs([]); }}
                        multiline />
                    <div className="guias-block">
                        <div className="guias-block-header">
                            <span className="guias-block-label">GUÍAS DE MATERIALES</span>
                            <button type="button" className="guias-add-btn"
                                onClick={() => setForm(f => ({ ...f, guias: [...(f.guias || []), { numero: '', items: '', empresa: '' }] }))}>
                                + Agregar guía
                            </button>
                        </div>
                        {(form.guias || []).map((g, i) => (
                            <div key={i} className="guia-row">
                                <div className="guia-row-head">
                                    <span className="guia-row-num">Guía #{i + 1}</span>
                                    <button type="button" className="guia-remove-btn"
                                        onClick={() => setForm(f => ({ ...f, guias: f.guias.filter((_, idx) => idx !== i) }))}>✕</button>
                                </div>
                                <div className="guia-row-fields">
                                    <input className="guia-input guia-input-num" placeholder="N° de guía" value={g.numero}
                                        onChange={e => setForm(f => ({ ...f, guias: f.guias.map((x, idx) => idx === i ? { ...x, numero: e.target.value } : x) }))} />
                                    <input className="guia-input guia-input-items" placeholder="Ítems" value={g.items}
                                        onChange={e => setForm(f => ({ ...f, guias: f.guias.map((x, idx) => idx === i ? { ...x, items: e.target.value } : x) }))} />
                                </div>
                                <input className="guia-input guia-input-empresa" placeholder="Empresa (EP Petroecuador, Sertecpet...)" value={g.empresa}
                                    onChange={e => setForm(f => ({ ...f, guias: f.guias.map((x, idx) => idx === i ? { ...x, empresa: e.target.value } : x) }))} />
                            </div>
                        ))}
                        {(form.guias || []).length > 0 && (
                            <ModalField name="quienAutoriza" label="AUTORIZA (persona)" placeholder="Nombre de quien autoriza" value={form.quienAutoriza}
                                onChange={e => setForm(f => ({ ...f, quienAutoriza: e.target.value }))} autoFilled={false} />
                        )}
                    </div>
                    {form.documento && (
                        <div className="doc-preview-form">
                            {form.documentoTipo?.startsWith('image/') ? (
                                <img src={form.documento} alt="doc" className="doc-thumb-form" />
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round"/>
                                    <path d="M14 2v6h6" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round"/>
                                </svg>
                            )}
                            <span className="doc-preview-name">{form.documentoNombre}</span>
                            <button className="doc-preview-remove" onClick={() => setForm(f => ({ ...f, documento: '', documentoNombre: '', documentoTipo: '' }))}>✕</button>
                        </div>
                    )}
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
const DetalleRow = ({ label, value }) =>
    value ? (
        <div className="detalle-field">
            <span className="detalle-label">{label}</span>
            <span className="detalle-value">{value}</span>
        </div>
    ) : null;

const ModalDetalle = ({ mov, onClose, onEdit, onDelete, onCopy, onShare }) => (
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
            <div className="detalle-fields detalle-scroll">
                <DetalleRow label="Marca"            value={mov.marca} />
                <DetalleRow label="Color"            value={mov.color} />
                <DetalleRow label="Tipo vehículo"    value={mov.tipoVehiculo} />
                <DetalleRow label="Empresa"          value={mov.empresa} />
                <DetalleRow label="Conductor"        value={mov.conductor} />
                <DetalleRow label="Cédula"           value={mov.cedula} />
                <DetalleRow label="Destino"          value={mov.destino || '—'} />
                <DetalleRow label="Actividad / Obs." value={mov.actividad || '—'} />
                <DetalleRow label="N° Guía (legado)"  value={mov.guia} />
                {mov.guias && mov.guias.filter(g => g.numero).length > 0 && (
                    <div className="detalle-field">
                        <span className="detalle-label">Guías de materiales</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {mov.guias.filter(g => g.numero).map((g, i) => (
                                <span key={i} className="detalle-value" style={{ fontSize: 11 }}>
                                    #{i+1} · {g.numero}{g.items ? ' · ' + g.items + ' items' : ''}{g.empresa ? ' · ' + g.empresa : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <DetalleRow label="Empresa autoriza" value={mov.empresaAutoriza} />
                <DetalleRow label="Autoriza"         value={mov.quienAutoriza} />
                {mov.documento && (
                    <div className="detalle-doc-section">
                        {mov.documentoTipo?.startsWith('image/') ? (
                            <img src={mov.documento} alt="documento" className="detalle-doc-thumb" />
                        ) : (
                            <div className="detalle-doc-pdf">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round"/>
                                    <path d="M14 2v6h6" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round"/>
                                    <path d="M9 13h6M9 17h4" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                <span>{mov.documentoNombre}</span>
                            </div>
                        )}
                        <a href={mov.documento} download={mov.documentoNombre} className="detalle-doc-btn">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Ver / Descargar
                        </a>
                    </div>
                )}
            </div>
            <div className="detalle-actions">
                <button className="detalle-act-btn" onClick={() => { onEdit(mov); onClose(); }}><IconPencil /> Editar</button>
                <button className="detalle-act-btn" onClick={() => onCopy(mov)}><IconCopy /> Copiar</button>
                <button className="detalle-act-btn" onClick={() => onShare(mov)}><IconShare /> Compartir</button>
                <button className="detalle-act-btn danger" onClick={() => { onDelete(mov._id); onClose(); }}><IconMinus /> Eliminar</button>
            </div>
        </div>
    </div>
);

// ── Modal ver documento ───────────────────────────────────
const ModalVerDocumento = ({ documento, documentoTipo, documentoNombre, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="doc-viewer-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <span style={{ fontSize: 13, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{documentoNombre}</span>
                <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            {documentoTipo?.startsWith('image/') ? (
                <img src={documento} alt={documentoNombre} className="doc-viewer-img" />
            ) : (
                <iframe src={documento} title={documentoNombre} className="doc-viewer-iframe" />
            )}
            <a href={documento} download={documentoNombre} className="detalle-doc-btn" style={{ marginTop: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Descargar
            </a>
        </div>
    </div>
);

// ── Modal config Registro ─────────────────────────────────
const ModalRegistroConfig = ({ config, onSave, onClose }) => {
    const [local, setLocal] = useState({ ubicacion: config.ubicacion || 'EPF', empresaAutoriza: config.empresaAutoriza || 'EP Petroecuador' });
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>Configurar Registro</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <ModalField name="ubicacion" label="UBICACIÓN (destino del ingreso)" placeholder="Ej: EPF" value={local.ubicacion} autoFilled={false}
                        onChange={e => setLocal(l => ({ ...l, ubicacion: e.target.value }))} />
                    <ModalField name="empresaAutoriza" label="EMPRESA AUTORIZANTE (default)" placeholder="Ej: EP Petroecuador" value={local.empresaAutoriza} autoFilled={false}
                        onChange={e => setLocal(l => ({ ...l, empresaAutoriza: e.target.value }))} />
                    <p style={{ fontSize: 11, color: '#666', margin: 0, lineHeight: 1.5 }}>
                        Estos valores se usan para generar la narrativa automática cuando no se especifican en el movimiento individual.
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

// ── Tarjeta de movimiento ─────────────────────────────────
const MovCard = ({ m, selectMode, selected, onToggleSelect, onOpenDetail, onDelete, onEdit, onCopy, onShare }) => {
    const [showDoc, setShowDoc] = useState(false);
    const [showGuias, setShowGuias] = useState(false);
    const guiasValidas = (m.guias || []).filter(g => g.numero?.trim());
    const tieneGuias = guiasValidas.length > 0;
    const tieneGuiaLegacy = !tieneGuias && m.guia;
    return (
        <>
            {showDoc && (
                <ModalVerDocumento
                    documento={m.documento} documentoTipo={m.documentoTipo}
                    documentoNombre={m.documentoNombre} onClose={() => setShowDoc(false)}
                />
            )}
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
                    {showGuias && tieneGuias && (
                        <div className="mov-guias-dropdown">
                            {guiasValidas.map((g, i) => (
                                <span key={i} className="mov-guia-item">
                                    <span className="mov-guia-item-num">#{i+1}</span>
                                    {g.numero}{g.items ? ` · ${g.items} item` : ''}{g.empresa ? ` · ${g.empresa}` : ''}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {!selectMode && (
                    <>
                        {(tieneGuias || tieneGuiaLegacy || m.documento) && (
                            <div className="mov-doc-col" onClick={e => e.stopPropagation()}>
                                {tieneGuias && (
                                    <button className={`mov-guia-tag mov-guia-tag-btn${showGuias ? ' active' : ''}`}
                                        onClick={() => setShowGuias(g => !g)}
                                        title="Ver guías">
                                        {guiasValidas.length} guía{guiasValidas.length > 1 ? 's' : ''}
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 3, transform: showGuias ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                )}
                                {tieneGuiaLegacy && <span className="mov-guia-tag">{m.guia}</span>}
                                {m.documento && (
                                    <button className="mov-doc-thumb-btn" title="Ver documento" onClick={() => setShowDoc(true)}>
                                        {m.documentoTipo?.startsWith('image/') ? (
                                            <img src={m.documento} alt="doc" className="mov-doc-thumb" />
                                        ) : (
                                            <div className="mov-doc-thumb mov-doc-thumb-pdf">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round"/>
                                                    <path d="M14 2v6h6" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round"/>
                                                </svg>
                                                <span>PDF</span>
                                            </div>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="mov-actions" onClick={e => e.stopPropagation()}>
                            <button className="mov-act-btn danger" title="Eliminar" onClick={() => onDelete(m._id)}><IconMinus /></button>
                            <button className="mov-act-btn" title="Editar" onClick={() => onEdit(m)}><IconPencil /></button>
                            <button className="mov-act-btn" title="Copiar" onClick={() => onCopy(m)}><IconCopy /></button>
                            <button className="mov-act-btn" title="Compartir" onClick={() => onShare(m)}><IconShare /></button>
                        </div>
                    </>
                )}
            </div>
        </>
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
        reader.onload = evt => {
            try {
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

// ── Pantalla Placas DB ────────────────────────────────────
const PantallaPlacasDB = () => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editVehiculo, setEditVehiculo] = useState(null);
    const [qrVehiculo, setQrVehiculo] = useState(null);
    const [showImport, setShowImport] = useState(false);

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
            <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
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
                                                    <button className="mov-act-btn" title="Editar" onClick={() => setEditVehiculo(v)}><IconPencil /></button>
                                                    <button className="mov-act-btn danger" title="Eliminar" onClick={() => handleDelete(v._id)}><IconMinus /></button>
                                                    <button className="mov-act-btn" title="Copiar" onClick={() => handleCopyText(vToText(v))}><IconCopy /></button>
                                                    <button className="mov-act-btn" title="Compartir" onClick={() => handleShareText(vToText(v))}><IconShare /></button>
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

    const handleShareFlujo = async () => {
        const fl = new Date(fecha + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const text = `FLUJO — ${fl}\nTotal: ${movs.length} movimiento${movs.length !== 1 ? 's' : ''}\n\n` +
            movs.map((m, i) =>
                `${i + 1}. [${(m.tipo || 'MOV').toUpperCase()}] ${m.placa}\n   ${m.conductor || '—'} · ${m.empresa || '—'}\n   → ${m.destino || '—'}  ${m.hora}`
            ).join('\n\n');
        if (navigator.share) { await navigator.share({ title: 'FLUJO — ' + fecha, text }).catch(() => {}); }
        else { navigator.clipboard?.writeText(text); }
    };

    const sq = search.toLowerCase();
    const filtrados = sq
        ? movs.filter(m => m.placa.toLowerCase().includes(sq) || (m.conductor || '').toLowerCase().includes(sq))
        : movs;

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
const PantallaFlujos = ({ turnoActivo }) => {
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [flujoSeleccionado, setFlujoSeleccionado] = useState(null);
    const [confirmarFlujo, setConfirmarFlujo] = useState(null);

    useEffect(() => {
        if (!turnoActivo) { setLoading(false); return; }
        api.get(`/movimientos/todos?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}`)
            .then(res => { setMovimientos(res.data.movimientos); setLoading(false); })
            .catch(() => setLoading(false));
    }, [turnoActivo]);

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
        <>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {flujos.map(f => {
                const fechaLarga = new Date(f.fecha + 'T12:00:00').toLocaleDateString('es-EC', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                });
                const ingresos = f.movs.filter(m => m.tipo === 'ingreso').length;
                const salidas = f.movs.filter(m => m.tipo === 'salida').length;
                const isPetro = m => m.empresa?.toLowerCase().includes('petroecuador');
                const unicos = Object.values(f.movs.reduce((acc, m) => {
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
                    <div key={f.fecha} className="flujo-card" onClick={() => setFlujoSeleccionado(f.fecha)}>
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
            })}
        </div>

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

// ── Helpers de texto para copiar/compartir ────────────────
const vToText = v => [
    `PLACA: ${v.placa}`,
    v.marca ? `MARCA: ${v.marca}` : '',
    v.color ? `COLOR: ${v.color}` : '',
    v.tipoVehiculo ? `TIPO: ${v.tipoVehiculo}` : '',
    v.empresa ? `EMPRESA: ${v.empresa}` : '',
    v.conductor ? `CONDUCTOR: ${v.conductor}` : '',
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
                await api.put(`/extensiones/${editData._id}`, form);
            } else {
                await api.post('/extensiones', form);
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

    const cargar = () => {
        api.get('/extensiones')
            .then(res => { setExtensiones(res.data.extensiones); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, []);

    const sq = search.toLowerCase();
    const filtrados = sq
        ? extensiones.filter(e =>
            (e.nombre || '').toLowerCase().includes(sq) ||
            (e.cargo || '').toLowerCase().includes(sq) ||
            (e.departamento || '').toLowerCase().includes(sq))
        : extensiones;

    const handleDelete = async id => {
        try { await api.delete(`/extensiones/${id}`); cargar(); } catch { }
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

            {/* Tabla */}
            {loading
                ? <p className="ws-empty">Cargando...</p>
                : filtrados.length === 0
                    ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'No hay extensiones registradas'}</p>
                    : (
                        <div className="placas-scroll">
                            <table className="placas-table">
                                <thead>
                                    <tr>
                                        <th>NOMBRE</th>
                                        <th>EMPRESA</th>
                                        <th>CARGO</th>
                                        <th>DEPT.</th>
                                        <th>EXT.</th>
                                        <th>CELULAR</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map(e => (
                                        <tr key={e._id}>
                                            <td className="placas-td-nombre">{e.nombre.toUpperCase()}</td>
                                            <td>{(e.empresa || '—').toUpperCase()}</td>
                                            <td>{e.cargo || '—'}</td>
                                            <td>{(e.departamento || '—').toUpperCase()}</td>
                                            <td className="placas-td-ext">{e.extension || '—'}</td>
                                            <td>{e.celular || '—'}</td>
                                            <td>
                                                <div className="placas-actions">
                                                    <button className="mov-act-btn" title="Editar" onClick={() => setEditExt(e)}><IconPencil /></button>
                                                    <button className="mov-act-btn danger" title="Eliminar" onClick={() => handleDelete(e._id)}><IconMinus /></button>
                                                    <button className="mov-act-btn" title="Copiar" onClick={() => handleCopyText(extToText(e))}><IconCopy /></button>
                                                    <button className="mov-act-btn" title="Compartir" onClick={() => handleShareText(extToText(e))}><IconShare /></button>
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

            {(showForm || editExt) && (
                <ModalExtension
                    onClose={() => { setShowForm(false); setEditExt(null); }}
                    onGuardado={cargar}
                    editData={editExt}
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
        reader.onload = evt => {
            try {
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

            {/* Tabla */}
            {loading
                ? <p className="ws-empty">Cargando...</p>
                : filtrados.length === 0
                    ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'No hay personas registradas'}</p>
                    : (
                        <div className="placas-scroll">
                            <table className="placas-table">
                                <thead>
                                    <tr>
                                        <th>CÉDULA</th>
                                        <th>NOMBRES</th>
                                        <th>EMPRESA</th>
                                        <th className="col-xs-hide">CARGO</th>
                                        <th className="col-xs-hide">DEPT.</th>
                                        <th className="col-md-hide">NOMINATIVO</th>
                                        <th>QR</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map(p => (
                                        <tr key={p._id}>
                                            <td className="placas-td-placa">{p.cedula}</td>
                                            <td className="placas-td-nombre personas-td-name">{(p.nombres || '').toUpperCase()}</td>
                                            <td>{(p.empresa || '—').toUpperCase()}</td>
                                            <td className="col-xs-hide">{p.cargo || '—'}</td>
                                            <td className="col-xs-hide">{(p.departamento || '—').toUpperCase()}</td>
                                            <td className="col-md-hide">{p.nominativo || '—'}</td>
                                            <td>
                                                <img
                                                    className="placas-qr"
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(pQrData(p))}`}
                                                    alt="QR"
                                                    onClick={() => setQrPersona(p)}
                                                />
                                            </td>
                                            <td>
                                                <div className="placas-actions">
                                                    <button className="mov-act-btn" title="Editar" onClick={() => setEditPersona(p)}><IconPencil /></button>
                                                    <button className="mov-act-btn danger" title="Eliminar" onClick={() => handleDelete(p._id)}><IconMinus /></button>
                                                    <button className="mov-act-btn" title="Copiar" onClick={() => handleCopyText(pToText(p))}><IconCopy /></button>
                                                    <button className="mov-act-btn" title="Compartir" onClick={() => handleShareText(pToText(p))}><IconShare /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
    const location = useLocation();

    const [tabActiva, setTabActiva] = useState('inicio');
    const [dashCollapsed, setDashCollapsed] = useState(true);
    const [movCollapsed, setMovCollapsed] = useState(false);
    const [chartCollapsed, setChartCollapsed] = useState(true);

    const [stats, setStats] = useState(null);
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
    const [registroConfig, setRegistroConfig] = useState(getRegistroConfig);

    const sq = searchQuery.toLowerCase();
    const movsFiltrados = sq
        ? movimientos.filter(m =>
            m.placa.toLowerCase().includes(sq) ||
            (m.conductor || '').toLowerCase().includes(sq))
        : movimientos;

    const bitacora = useMemo(() => {
        const sorted = [...movimientos].reverse();
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
                        status: 'completo',
                    });
                } else {
                    pairs.push({
                        placa: mov.placa, salida: null, ingreso: mov,
                        horaS: '—', horaI: mov.hora,
                        conductor: mov.conductor || '—', conductorChanged: false,
                        marca: mov.marca, empresa: mov.empresa,
                        tipoVehiculo: mov.tipoVehiculo, destino: mov.destino,
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
                    status: 'en-campo',
                });
            }
        }
        return pairs.sort((a, b) => {
            const ta = a.horaS !== '—' ? a.horaS : a.horaI;
            const tb = b.horaS !== '—' ? b.horaS : b.horaI;
            return ta.localeCompare(tb);
        });
    }, [movimientos]);

    useEffect(() => {
        api.get('/turnos/activo')
            .then(({ data }) => { if (data.turno) setTurnoActivo(data.turno); })
            .catch(() => { });
    }, []);

    const cargarDatos = async () => {
        if (!turnoActivo) return;
        const desde = turnoActivo.createdAt ? `&desde=${encodeURIComponent(turnoActivo.createdAt)}` : '';
        try {
            const [sRes, mRes] = await Promise.all([
                api.get(`/movimientos/stats?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}${desde}`),
                api.get(`/movimientos?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}${desde}`),
            ]);
            setStats(sRes.data);
            setMovimientos(mRes.data.movimientos);
        } catch { }
    };

    useEffect(() => { cargarDatos(); }, [turnoActivo]);

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
            const shareData = { title: 'Movimiento FLUJO', text: movToText(m) };
            if (m.documento && m.documentoNombre) {
                try {
                    const res = await fetch(m.documento);
                    const blob = await res.blob();
                    const file = new File([blob], m.documentoNombre, { type: m.documentoTipo || blob.type });
                    if (navigator.canShare?.({ files: [file] })) shareData.files = [file];
                } catch (_) { /* compartir sin archivo si falla */ }
            }
            await navigator.share(shareData).catch(() => { });
        } else handleCopy(m);
    };

    const handleEdit = m => setEditMov(m);

    const exportData = format => {
        setShowExportMenu(false);
        const fecha = new Date().toISOString().split('T')[0];
        exportMovimientos(movimientos, format, `movimientos_${fecha}`);
    };

    const exportBitacora = () => {
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
        localStorage.setItem(REGISTRO_CONFIG_KEY, JSON.stringify(cfg));
        setRegistroConfig(cfg);
    };

    const exportRegistroExcel = () => {
        if (!movimientos.length) return;
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

    const cardProps = { selectMode, onToggleSelect: toggleSelect, onOpenDetail: setDetailMov, onDelete: handleDelete, onEdit: handleEdit, onCopy: handleCopy, onShare: handleShare };

    const isDrawerTab = DRAWER_TABS.has(tabActiva);

    return (
        <div className="ws-wrapper">

            {showDrawer && (
                <DrawerMenu
                    onClose={() => setShowDrawer(false)}
                    activeTab={lastDrawerTab}
                    onNavigate={tab => {
                        setLastDrawerTab(tab);
                        if (tab === 'calendario') navigate('/calendario');
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
                    {!isDrawerTab && tabActiva !== 'flujos' && tabActiva !== 'perfil' && (
                        <button className="ws-topbar-btn" onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke={showSearch ? '#818cf8' : '#fff'} strokeWidth="2" />
                                <path d="M21 21l-4.35-4.35" stroke={showSearch ? '#818cf8' : '#fff'} strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    )}
                    {!isDrawerTab && tabActiva !== 'flujos' && (
                        <button className="ws-topbar-btn" onClick={() => handleTabChange('perfil')}>
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
                                <span className="bit-toolbar-count">{bitacora.length} registro{bitacora.length !== 1 ? 's' : ''}</span>
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
                            ) : (
                                <div className="bit-list">
                                    {bitacora.map((b, i) => (
                                        <div key={i} className={`bit-row bit-${b.status}`}>
                                            <div className="bit-row-top">
                                                <span className="bit-placa">{b.placa}</span>
                                                {b.tipoVehiculo && <span className="bit-tipo">{b.tipoVehiculo}</span>}
                                                <span className={`bit-badge bit-badge-${b.status}`}>
                                                    {b.status === 'completo' ? 'Completado' : b.status === 'en-campo' ? 'En campo' : 'Solo ingreso'}
                                                </span>
                                            </div>
                                            <div className="bit-row-times">
                                                <div className="bit-time bit-time-s">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <span className="bit-time-label">Salida</span>
                                                    <span className="bit-time-val">{b.horaS}</span>
                                                </div>
                                                <div className="bit-time-arrow">→</div>
                                                <div className="bit-time bit-time-i">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <span className="bit-time-label">Ingreso</span>
                                                    <span className="bit-time-val">{b.horaI}</span>
                                                </div>
                                            </div>
                                            <div className="bit-row-bottom">
                                                <span className={`bit-conductor${b.conductorChanged ? ' changed' : ''}`}>
                                                    {b.conductorChanged && (
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                                            <path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    )}
                                                    {b.conductor}
                                                </span>
                                                {b.empresa && <span className="bit-empresa">{b.empresa}</span>}
                                                {(() => {
                                                    const movs = [b.salida, b.ingreso].filter(Boolean);
                                                    const total = movs.reduce((n, mv) => {
                                                        const vg = (mv.guias || []).filter(g => g.numero?.trim()).length;
                                                        return n + (vg > 0 ? vg : (mv.guia ? 1 : 0));
                                                    }, 0);
                                                    return total > 0 ? (
                                                        <span className="bit-guia-badge">
                                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/></svg>
                                                            {total} guía{total > 1 ? 's' : ''}
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {vistaInicio === 'registro' && (
                        <div className="ws-registro">
                            <div className="reg-toolbar">
                                <span className="reg-count">{movimientos.length} entrada{movimientos.length !== 1 ? 's' : ''}</span>
                                <div className="reg-toolbar-actions">
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
                            ) : (
                                <div className="reg-list">
                                    {movimientos.map(mov => (
                                        <div key={mov._id} className={`reg-entry reg-${mov.tipo}`}>
                                            <div className="reg-narrativa" onClick={() => setRegistroDetailMov(mov)}>
                                                <span className={`reg-badge reg-badge-${mov.tipo}`}>{mov.tipo === 'ingreso' ? '↓' : '↑'}</span>
                                                {generarNarrativa(mov, registroConfig)}
                                            </div>
                                            <div className="reg-actions">
                                                <button className="reg-act-btn" onClick={() => setRegistroDetailMov(mov)} title="Ver detalle">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2"/></svg>
                                                </button>
                                                <button className="reg-act-btn" onClick={() => handleEdit(mov)} title="Editar">
                                                    <IconPencil />
                                                </button>
                                                <button className="reg-act-btn" onClick={() => { navigator.clipboard?.writeText(generarNarrativa(mov, registroConfig)); }} title="Copiar narrativa">
                                                    <IconCopy />
                                                </button>
                                                <button className="reg-act-btn" onClick={() => handleShare(mov)} title="Compartir">
                                                    <IconShare />
                                                </button>
                                                <button className="reg-act-btn danger" onClick={() => handleDelete(mov._id)} title="Eliminar">
                                                    <IconMinus />
                                                </button>
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
                                            <>
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
                                            </>
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
                    </>
                )}

                {tabActiva === 'avance' && (
                    <PantallaAvance turnoActivo={turnoActivo} user={user} />
                )}

                {tabActiva === 'flujos' && <PantallaFlujos turnoActivo={turnoActivo} />}

                {tabActiva === 'perfil' && (
                    <PantallaPerfil user={user} turnoActivo={turnoActivo} onLogout={logout} />
                )}

                {tabActiva === 'placas-db' && <PantallaPlacasDB />}
                {tabActiva === 'extensiones' && <PantallaExtensiones />}
                {tabActiva === 'personas' && <PantallaPersonas />}
                {tabActiva === 'jefes' && <PantallaStub title="Jefes Inmediatos" />}
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
            {registroDetailMov && (
                <ModalDetalle mov={registroDetailMov} onClose={() => setRegistroDetailMov(null)}
                    onEdit={m => { handleEdit(m); setRegistroDetailMov(null); }} onDelete={id => { handleDelete(id); setRegistroDetailMov(null); }} onCopy={handleCopy} onShare={handleShare} />
            )}
            {showRegistroConfig && (
                <ModalRegistroConfig config={registroConfig} onSave={handleSaveRegistroConfig} onClose={() => setShowRegistroConfig(false)} />
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
