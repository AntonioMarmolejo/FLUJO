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
import { SuggestionField, TextSugField } from './comunes';
import { EMPTY_FORM, TIPO_VEHICULO_OPTS, formatMov, getHoraLocal, getTurnoFecha, parseQR } from './helpers';

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
