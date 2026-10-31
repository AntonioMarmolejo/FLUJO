import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import {
    encolarMovimiento,
    subirMovimientoPendiente,
    encolarEdicion,
    marcarEdicionSincronizada,
    cacheVehiculo,
    buscarPlacaLocal,
    cachePersona,
    buscarPersonaLocal,
    registrarPersona,
} from '../../lib/syncEngine.js';
import { ModalField, SuggestionField, TextSugField } from './comunes';
import {
    CFG_DEFAULTS,
    EMPTY_FORM,
    TIPO_VEHICULO_OPTS,
    addMouseSwipe,
    formatMov,
    getHoraLocal,
    getTurnoFecha,
    parseQR,
} from './helpers';
import { IconCopy, IconMinus, IconPencil, IconShare } from './iconos';

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
                    <div className="modal-titulo-icono">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="2"/>
                            <rect x="14" y="3" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="2"/>
                            <rect x="3" y="14" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="2"/>
                            <rect x="15" y="15" width="2" height="2" fill="#818cf8"/>
                            <rect x="19" y="15" width="2" height="2" fill="#818cf8"/>
                            <rect x="15" y="19" width="2" height="2" fill="#818cf8"/>
                            <rect x="19" y="19" width="2" height="2" fill="#818cf8"/>
                        </svg>
                        <h3 className="sin-margen">Escanear QR</h3>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                {camError
                    ? <p className="modal-error qr-error">{camError}</p>
                    : (
                        <>
                            <p className="qr-hint">
                                {hint || 'Iniciando cámara...'}
                            </p>
                            <div className="qr-video-wrap">
                                <video ref={videoRef} className="qr-video" playsInline muted />
                                <div className="qr-frame" />
                            </div>
                            <p className="qr-nota">
                                Funciona con QR de vehículos y tarjetas de personas
                            </p>
                        </>
                    )
                }
                <canvas ref={canvasRef} hidden />
                <div className="qr-img-divider">— o selecciona una imagen —</div>
                <button className="qr-img-btn" onClick={() => fileInputRef.current.click()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Elegir imagen
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageFile} />
                {imgError && <p className="qr-img-error">{imgError}</p>}
            </div>
        </div>
    );
};

// ── Modal formulario (crear + editar) ────────────────────
export const ModalAgregar = ({ puesto, bloque, turnoActual, fechaFlujo, ubiIngreso = 'EPF', ubiSalida = '', onClose, onGuardado, onGuardadoOptimista, onEditadoOptimista, onMovimientoConfirmado, movimientos, editData }) => {
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
    // Destino/actividad precargados del último movimiento de la placa:
    // historialRef guarda los valores puestos para saber si el usuario los
    // cambió (si no, se pueden reemplazar al cambiar INGRESA/SALE).
    const [historialInfo, setHistorialInfo] = useState(null); // { tipo, fecha }
    const historialRef = useRef(null);
    const formRef = useRef(form);
    useEffect(() => { formRef.current = form; }, [form]);

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
        setHistorialInfo(null);
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

    // Último movimiento de la placa entre los del flujo actual (incluye los
    // que aún no se sincronizan, que se toman como los más recientes).
    const ultimoMovimientoLocal = (placa, tipo) => {
        const ts = m => (m.createdAt ? Date.parse(m.createdAt) : Number.MAX_SAFE_INTEGER);
        return movimientos
            .filter(m => m.placa === placa && (!tipo || m.tipo === tipo))
            .sort((a, b) => ts(b) - ts(a))[0] || null;
    };

    // Destino y actividad salen del último movimiento del MISMO tipo: una salida
    // toma los de la última salida del vehículo y un ingreso los del último
    // ingreso. Solo reemplaza campos vacíos, con la ubicación por defecto, o
    // que sigan con lo precargado antes.
    const precargarHistorial = async (placa, tipo) => {
        if (editData || !placa) return;
        const filtroTipo = tipo === 'salida' ? 'salida' : 'ingreso';
        let ultimo = ultimoMovimientoLocal(placa, filtroTipo);
        if (!ultimo) {
            try {
                const { data } = await api.get('/movimientos/ultimo', { params: { placa, ...(filtroTipo && { tipo: filtroTipo }) } });
                ultimo = data.movimiento;
            } catch { /* sin conexión: solo se usa lo local */ }
        }

        const f = formRef.current;
        if (f.placa !== placa || f.tipo !== tipo) return; // cambió mientras se consultaba
        const prev = historialRef.current;
        const reemplazable = campo => !f[campo] || f[campo] === prev?.[campo]
            || (campo === 'destino' && [ubiIngreso, ubiSalida].includes(f.destino));

        const cambios = {};
        ['destino', 'actividad'].forEach(campo => {
            if (!reemplazable(campo)) return;
            if (ultimo?.[campo]) cambios[campo] = ultimo[campo];
            else if (prev?.[campo] && f[campo] === prev[campo]) cambios[campo] = '';
        });
        if (ultimo && (ultimo.destino || ultimo.actividad)) {
            historialRef.current = { destino: cambios.destino ?? prev?.destino, actividad: cambios.actividad ?? prev?.actividad };
            if (Object.keys(cambios).length > 0) setHistorialInfo({ tipo: ultimo.tipo, fecha: ultimo.fecha });
        } else {
            historialRef.current = null;
            setHistorialInfo(null);
        }
        if (Object.keys(cambios).length > 0) setForm(cur => ({ ...cur, ...cambios }));
    };

    const selectSuggestion = v => {
        setForm(f => ({ ...f, placa: v.placa, marca: v.marca || '', color: v.color || '', tipoVehiculo: v.tipoVehiculo || '', empresa: v.empresa || '', conductor: v.conductor || '', cedula: v.cedula || '' }));
        setSuggestions([]);
        setCedulaSugs([]);
        setConductorSugs([]);
        setAutoFilled(true);
        setPlacaNotFound(false);
        formRef.current = { ...formRef.current, placa: v.placa };
        precargarHistorial(v.placa, formRef.current.tipo);
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
        if (placa) {
            formRef.current = { ...formRef.current, placa };
            precargarHistorial(placa, formRef.current.tipo);
        }
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
        setHistorialInfo(null); historialRef.current = null;
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2500);

        const payload = { ...formFinal, puesto, bloque, fecha, hora, clientUUID: tempId };
        if (personaNotFound && form.cedula) {
            registrarPersona({ nombres: form.conductor || '', cedula: form.cedula, empresa: form.empresa || '' }).catch(() => {});
        }
        // Write-ahead: guardar en Dexie ANTES de intentar la API.
        // Así, si el usuario refresca durante el vuelo o el servidor no responde,
        // el movimiento no se pierde — ya está en la cola local. Subirlo pasa
        // por el mismo punto único que usa el motor de reintento (candado en
        // memoria incluido) para que nunca se suba dos veces en paralelo.
        await encolarMovimiento({ uuid: tempId, payload, hora, fecha });
        try {
            const result = await subirMovimientoPendiente(tempId);
            if (result?.movimiento) onMovimientoConfirmado(tempId, result.movimiento);
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
                            onClick={() => {
                                const f = formRef.current;
                                const next = {
                                    ...f,
                                    tipo: val,
                                    ...(val === 'ingreso' && !f.destino ? { destino: ubiIngreso } :
                                        val === 'salida' && !f.destino && ubiSalida ? { destino: ubiSalida } : {}),
                                };
                                setForm(next);
                                formRef.current = next;
                                if (val !== f.tipo && (historialRef.current || autoFilled)) precargarHistorial(f.placa, val);
                            }}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="modal-fields">
                    <div className={`modal-field ${autoFilled ? 'modal-field-autofilled' : ''}`}>
                        <label>
                            <span>PLACAS <span className="campo-obligatorio">*</span></span>
                            <span className="label-acciones">
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
                                    <button className="activ-add-tag-btn activ-add-tag-btn-quitar" onClick={() => { setHoraManual(''); setShowHoraInput(false); }}>✕</button>
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
                            onClear={() => { setForm(f => ({ ...f, empresa: '' })); setEmpresaSugs([]); }}
                            suggestions={empresaSugs} onSelect={s => { setForm(f => ({ ...f, empresa: s })); setEmpresaSugs([]); }} />
                    </div>
                    <SuggestionField name="conductor" label="CONDUCTOR" placeholder="Nombre completo"
                        value={form.conductor} onChange={handleConductorChange} autoFilled={autoFilled}
                        suggestions={conductorSugs} onSelect={selectPersonaSug}
                        onClearSugs={() => setConductorSugs([])}
                        onClear={() => { setForm(f => ({ ...f, conductor: '' })); setConductorSugs([]); setAutoFilled(false); }}
                        labelAction={
                            <span className="label-acciones">
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
                        onClear={() => { setForm(f => ({ ...f, destino: '' })); setDestinoSugs([]); }}
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
                                className="modal-textarea modal-textarea-clearable"
                            />
                            {form.actividad && (
                                <button className="field-clear-btn field-clear-btn-top" type="button" title="Limpiar" onMouseDown={e => {
                                    e.preventDefault();
                                    setForm(f => ({ ...f, actividad: '' }));
                                    setActividadSugs([]);
                                    setTimeout(() => actividadRef.current?.focus(), 0);
                                }}>✕</button>
                            )}
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
                        {historialInfo && (
                            <div className="historial-hint">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Destino y actividad tomados {historialInfo.tipo === 'salida' ? 'de la última salida' : 'del último ingreso'}
                                {historialInfo.fecha && ` (${historialInfo.fecha.split('-').reverse().slice(0, 2).join('/')})`}
                            </div>
                        )}
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
                    <div className="mov-guardado">
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

export const ModalDetalle = ({ mov, onClose, onEdit, onDelete, onCopy, onShare, hasPrev, hasNext, onPrev, onNext, counter }) => {
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
        <button key={title} title={title} onClick={onClick} className="movdet-act-btn"
            dangerouslySetInnerHTML={{ __html: svg }} />
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="movdet-card detalle-arriba-movil" onClick={e => e.stopPropagation()}>
                {/* ── Cabecera: hora · badge · placa + cerrar ── */}
                <div className="movdet-header">
                    <div className="movdet-header-info">
                        <span className="movdet-hora">{mov.hora}</span>
                        <span className={`movdet-tipo ${isIngreso ? 'movdet-tipo-ingreso' : 'movdet-tipo-salida'}`}>
                            {isIngreso ? 'INGRESO' : 'SALIDA'}
                        </span>
                        <span className="movdet-placa">{mov.placa}</span>
                    </div>
                    <button className="movdet-cerrar" onClick={onClose}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── Fecha ── */}
                <div className="movdet-fecha-row">
                    <span className="movdet-fecha">{mov.fecha}</span>
                </div>

                {/* ── Grid de campos ── */}
                {campos.length > 0 && (
                    <div className="movdet-campos">
                        {campos.map(c => (
                            <div key={c.label} className={c.span ? 'movdet-campo-ancho' : undefined}>
                                <div className="movdet-label">{c.label}</div>
                                <div className="movdet-valor">{c.valor}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Caja actividad ── */}
                <div className="movdet-actividad-box">
                    <div className="movdet-label">Actividad / Obs.</div>
                    <div className="movdet-actividad">{mov.actividad || '—'}</div>
                </div>

                {/* ── Acciones ── */}
                <div className="movdet-acciones">
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
                    <div className="movdet-nav">
                        <button className="movdet-nav-btn" onClick={onPrev} disabled={!hasPrev}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 6c-2 2-5.5 4.5-8 6 2.5 1.5 6 4 8 6" />
                            </svg>
                        </button>
                        <span className="movdet-contador">{counter}</span>
                        <button className="movdet-nav-btn" onClick={onNext} disabled={!hasNext}>
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
export const ModalEditHora = ({ mov, onClose, onSave }) => {
    const [hora, setHora] = useState(mov.hora);
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card modal-angosto" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-titulo-chico">Editar hora · {mov.placa}</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-cuerpo">
                    <input
                        type="time"
                        value={hora}
                        onChange={e => setHora(e.target.value)}
                        className="hora-grande"
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
export const ModalRegistrarIngreso = ({ b, movimientos, ubiIngreso = 'EPF', onClose, onGuardar }) => {
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
            registrarPersona({ nombres: conductor, cedula, empresa: b.empresa || '' }).catch(() => {});
        }
        onGuardar({ b, hora, conductor: conductor.trim(), cedula: cedula.trim(), actividad: actividad.trim(), destino: destino.trim() });
    };

    // Listas de sugerencias: funciones (no componentes) para que no se
    // vuelvan a montar en cada render
    const listaPersonas = items => !items.length ? null : (
        <div className="ingbit-sugs">
            {items.map((p, i) => (
                <div key={i} className="ingbit-sug" onClick={() => selectPersona(p)}>
                    <div className="ingbit-sug-nombre">{p.nombres}</div>
                    {p.cedula && <div className="ingbit-sug-info">CI: {p.cedula}{p.empresa ? ' · ' + p.empresa : ''}</div>}
                </div>
            ))}
        </div>
    );

    const listaTextos = (items, onSel) => !items.length ? null : (
        <div className="ingbit-sugs">
            {items.map((s, i) => (
                <div key={i} className="ingbit-sug ingbit-sug-texto" onClick={() => onSel(s)}>{s}</div>
            ))}
        </div>
    );

    // Agrega la ✕ para limpiar un campo. Es una función y no un componente
    // para que el input no se vuelva a montar (y pierda el foco) al escribir.
    const conLimpiar = (input, value, onClear) => (
        <div className="ingbit-limpiable">
            {input}
            {value && (
                <button className="field-clear-btn" type="button" title="Limpiar" onMouseDown={e => {
                    e.preventDefault();
                    e.currentTarget.parentElement.querySelector('input')?.focus();
                    onClear();
                }}>✕</button>
            )}
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="ingbit-card" onClick={e => e.stopPropagation()}>
                {/* Cabecera */}
                <div className="ingbit-header">
                    <div className="ingbit-header-info">
                        <span className="ingbit-badge">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                            INGRESO
                        </span>
                        <span className="ingbit-placa">{b.placa}</span>
                        {b.tipoVehiculo && <span className="ingbit-tipo">{b.tipoVehiculo}</span>}
                    </div>
                    <button className="ingbit-cerrar" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div className="ingbit-cuerpo">
                    {/* Hora */}
                    <div>
                        <div className="ingbit-label">Hora de retorno</div>
                        <input type="time" className="ingbit-input ingbit-hora" value={hora} onChange={e => setHora(e.target.value)} autoFocus />
                    </div>

                    {/* Conductor */}
                    <div className="ingbit-campo">
                        <div className="ingbit-label">Conductor de retorno</div>
                        {conLimpiar(
                            <input type="text" className="ingbit-input" placeholder="Nombre del conductor..." value={conductor}
                                onChange={e => handleConductorChange(e.target.value)}
                                onBlur={() => setTimeout(() => setConductorSugs([]), 150)} />,
                            conductor, () => { setConductor(''); setConductorSugs([]); setPersonaNotFound(false); }
                        )}
                        {listaPersonas(conductorSugs)}
                    </div>

                    {/* Cédula */}
                    <div className="ingbit-campo">
                        <div className="ingbit-label">Cédula</div>
                        {conLimpiar(
                            <input type="text" className="ingbit-input" placeholder="Nro. de cédula..." value={cedula}
                                onChange={e => handleCedulaChange(e.target.value)}
                                onBlur={() => setTimeout(() => setCedulaSugs([]), 150)} />,
                            cedula, () => { setCedula(''); setCedulaSugs([]); setPersonaNotFound(false); }
                        )}
                        {listaPersonas(cedulaSugs)}
                        {personaNotFound && cedula.length >= 3 && (
                            <div className="ingbit-aviso">⚠️ Persona no encontrada — se guardará automáticamente</div>
                        )}
                    </div>

                    {/* Actividad */}
                    <div className="ingbit-campo">
                        <div className="ingbit-label">Actividad / Observación</div>
                        {conLimpiar(
                            <input type="text" className="ingbit-input" placeholder="Descripción de la actividad..." value={actividad}
                                onChange={e => { setActividad(e.target.value); setActividadSugs(e.target.value.length >= 1 ? recentUniq('actividad', e.target.value) : []); }}
                                onBlur={() => setTimeout(() => setActividadSugs([]), 150)} />,
                            actividad, () => { setActividad(''); setActividadSugs([]); }
                        )}
                        {listaTextos(actividadSugs, s => { setActividad(s); setActividadSugs([]); })}
                    </div>

                    {/* Destino */}
                    <div className="ingbit-campo">
                        <div className="ingbit-label">Destino</div>
                        {conLimpiar(
                            <input type="text" className="ingbit-input" placeholder="Área o lugar..." value={destino}
                                onChange={e => { setDestino(e.target.value); setDestinoSugs(e.target.value.length >= 1 ? recentUniq('destino', e.target.value) : []); }}
                                onBlur={() => setTimeout(() => setDestinoSugs([]), 150)} />,
                            destino, () => { setDestino(''); setDestinoSugs([]); }
                        )}
                        {listaTextos(destinoSugs, s => { setDestino(s); setDestinoSugs([]); })}
                    </div>

                    {/* Botón guardar (se habilita con la hora) */}
                    <button className="ingbit-guardar" onClick={handleSubmit} disabled={!hora}>
                        {isNew ? 'Registrar ingreso' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Modal detalle Bitácora ────────────────────────────────
export const ModalBitacoraDetalle = ({ bitacora, idx, onClose, onChange, onEditMov, onEditIngreso, onDeletePair }) => {
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

export const ModalRegistroConfig = ({ config, onSave, onClose }) => {
    const [local, setLocal] = useState({ ...CFG_DEFAULTS, ...config });
    const f = key => e => setLocal(l => ({ ...l, [key]: e.target.value }));
    const Row = ({ k, label, placeholder }) => (
        <ModalField name={k} label={label} placeholder={placeholder} value={local[k]} autoFilled={false} onChange={f(k)} />
    );
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-titulo-chico">Configurar Narrativa</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-cuerpo modal-cuerpo-junto">
                    <p className="config-seccion">DESTINO / UBICACIÓN</p>
                    <Row k="ubicacion"   label="NOMBRE DEL LUGAR (para ingresos)"  placeholder="EPF" />
                    <Row k="conSalida"   label="CONECTOR SALIDA"                    placeholder="Sale al" />
                    <Row k="conIngreso"  label="CONECTOR INGRESO"                   placeholder="Ingresa al" />
                    <p className="config-seccion">CONDUCTOR</p>
                    <Row k="conTitHombre" label="TÍTULO MASCULINO"                  placeholder="el Sr." />
                    <Row k="conTitMujer"  label="TÍTULO FEMENINO"                   placeholder="la Srta." />
                    <p className="config-seccion">OTROS CONECTORES</p>
                    <Row k="conCedula"   label="PREFIJO CÉDULA"                     placeholder="cc:" />
                    <Row k="conEmpresa"  label="PREFIJO EMPRESA"                    placeholder="de" />
                    <Row k="conVehiculo" label="ACCIÓN VEHÍCULO (vacío = auto)"     placeholder="conduciendo el / conduciendo la" />
                    <Row k="conPlaca"    label="PREFIJO PLACA"                       placeholder="de Placas" />
                    <p className="config-seccion">EXCEL / WORD</p>
                    <Row k="empresaAutoriza" label="EMPRESA AUTORIZANTE (default)"  placeholder="EP Petroecuador" />
                    <p className="config-nota">
                        Deja "Acción vehículo" vacío para detectar el/la automáticamente según el tipo.
                    </p>
                </div>
                <div className="modal-pie">
                    <button className="modal-btn active" onClick={() => { onSave(local); onClose(); }}>
                        Guardar configuración
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Tarjeta de movimiento ─────────────────────────────────
export const MovCard = ({ m, count = 1, selectMode, selected, onToggleSelect, onOpenDetail, onDelete, onEdit, onCopy, onShare, swipedMovId, setSwipedMovId, movSwipeRef, onEditHora, onGoToReg }) => {
    const isSwiped = swipedMovId === m._id;
    const [collapsed, setCollapsed] = useState(true);
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
                <div className="mov-card-body">
                    {selectMode && (
                        <input type="checkbox" className="mov-check" checked={selected}
                            onChange={() => onToggleSelect(m._id)} onClick={e => e.stopPropagation()} />
                    )}
                    {/* Badge izquierdo */}
                    <div className={`mov-icon ${m.tipo}${collapsed ? ' mov-icon-sm' : ''}`}>
                        {!selectMode && !m._pending && (
                            <button className="mov-hora-edit-btn" title="Editar hora"
                                onClick={e => { e.stopPropagation(); onEditHora(m._id); }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                                </svg>
                            </button>
                        )}
                        {!collapsed && <span className="mov-count">{count}</span>}
                        <span className="mov-hora-small">{m.hora}</span>
                    </div>
                    {/* Info central */}
                    <div className="mov-info">
                        {collapsed ? (
                            <div className={`mov-info-r1 ${m.tipo}`}>
                                <span className="mov-tipo-tag">{m.tipo === 'ingreso' ? 'INGRESO' : 'SALIDA'}</span>
                                {' · '}
                                <span className="mov-placa-code">{m.placa}</span>
                                {(m.conductor || m.cedula) && (
                                    <>{' · '}<span className="mov-coll-conductor">{m.conductor || '—'}{m.cedula ? `/CI: ${m.cedula}` : ''}</span></>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className={`mov-info-r1 ${m.tipo}`}>
                                    <span className="mov-tipo-tag">{m.tipo === 'ingreso' ? 'INGRESO' : 'SALIDA'}</span>
                                    {' · '}
                                    <span className="mov-placa-code">{m.placa}</span>
                                    {m.empresa && <>{' · '}<span className="mov-empresa-r1">{m.empresa}</span></>}
                                </div>
                                <div className="mov-info-r2">
                                    <span className="mov-conductor-ci">{m.conductor || '—'}{m.cedula ? `/CI: ${m.cedula}` : ''}</span>
                                    {m.destino && <span className="mov-destino-r2">{m.destino.toUpperCase()}</span>}
                                </div>
                            </>
                        )}
                    </div>
                    {/* Chevron */}
                    <button className="mov-chevron-btn" onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                             className={`chevron-giro${collapsed ? '' : ' abierto'}`}>
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    {m._pending && <span className="mov-pending-dot mov-pending-dot-fin" title="Sin conexión — se sincronizará al reconectar" />}
                </div>
                {!collapsed && m.actividad && !/^vac[ií]o$/i.test(m.actividad.trim()) && (
                    <div className="mov-actividad">{m.actividad}</div>
                )}
            </div>
        </div>
    );
};
