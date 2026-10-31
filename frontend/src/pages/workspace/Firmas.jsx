import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../api/axios';
import {
    cachePersona,
    buscarPersonaLocal,
    cacheFirma,
    getFirmasCache,
    deleteCachedFirma,
    touchCatalogMeta,
    getCatalogMeta,
    encolarOperacion,
    getOperacionesPendientes,
    descartarOperacion,
} from '../../lib/syncEngine.js';
import { CacheFreshnessBadge, ModalConfirm, PendienteBadge, PersonaSugMini } from './comunes';
import { CROP_MIN, compressImage, fmtFechaCorta, rotateImageDataUrl } from './helpers';
import { IconChevronRight } from './iconos';

// ── Firmas Funcionarios ────────────────────────────────────
// Captura de firma: cámara en vivo (mismo patrón que ModalEscanerQR, sin jsQR)
// + subir imagen como alternativa.
const CapturaFirma = ({ onCapturada, onCancelar }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);
    const [camError, setCamError] = useState('');
    const [activa, setActiva] = useState(false);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (cancelado) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setActiva(true);
            } catch {
                setCamError('No se pudo acceder a la cámara. Verifica los permisos o sube una imagen.');
            }
        })();
        return () => { cancelado = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
    }, []);

    const handleTomarFoto = () => {
        const video = videoRef.current, canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        onCapturada(canvas.toDataURL('image/jpeg', 0.92));
    };

    const handleArchivo = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => onCapturada(ev.target.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <div className="modal-overlay" onClick={onCancelar}>
            <div className="firma-captura-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="sin-margen">Capturar firma</h3>
                    <button className="modal-close" onClick={onCancelar}>✕</button>
                </div>
                {camError
                    ? <p className="modal-error firma-captura-error">{camError}</p>
                    : (
                        <div className="qr-video-wrap">
                            <video ref={videoRef} className="qr-video" playsInline muted />
                        </div>
                    )}
                <canvas ref={canvasRef} hidden />
                <div className="firma-captura-botones">
                    <button className="firma-btn-primary" onClick={handleTomarFoto} disabled={!activa}>
                        Tomar foto
                    </button>
                    <button className="firma-btn-secondary" onClick={() => fileInputRef.current.click()}>
                        Subir imagen
                    </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleArchivo} />
            </div>
        </div>
    );
};

const RecortarFirma = ({ src, onAplicar, onCancelar }) => {
    const imgRef = useRef(null);
    const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
    const [crop, setCrop] = useState(null);
    const dragRef = useRef(null);

    const onImgLoad = () => {
        const el = imgRef.current;
        const w = el.clientWidth, h = el.clientHeight;
        setImgSize({ w, h });
        const cw = w * 0.8, ch = h * 0.8;
        setCrop({ x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch });
    };

    const clamp = ({ x, y, w, h }) => {
        w = Math.max(CROP_MIN, Math.min(w, imgSize.w));
        h = Math.max(CROP_MIN, Math.min(h, imgSize.h));
        x = Math.max(0, Math.min(x, imgSize.w - w));
        y = Math.max(0, Math.min(y, imgSize.h - h));
        return { x, y, w, h };
    };

    const startDrag = (modo) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.target.setPointerCapture?.(e.pointerId);
        dragRef.current = { modo, startX: e.clientX, startY: e.clientY, startCrop: { ...crop } };
    };

    const onPointerMove = (e) => {
        if (!dragRef.current) return;
        const { modo, startX, startY, startCrop } = dragRef.current;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        let next = { ...startCrop };
        if (modo === 'move') { next.x = startCrop.x + dx; next.y = startCrop.y + dy; }
        else if (modo === 'nw') { next.x = startCrop.x + dx; next.y = startCrop.y + dy; next.w = startCrop.w - dx; next.h = startCrop.h - dy; }
        else if (modo === 'ne') { next.y = startCrop.y + dy; next.w = startCrop.w + dx; next.h = startCrop.h - dy; }
        else if (modo === 'sw') { next.x = startCrop.x + dx; next.w = startCrop.w - dx; next.h = startCrop.h + dy; }
        else if (modo === 'se') { next.w = startCrop.w + dx; next.h = startCrop.h + dy; }
        setCrop(clamp(next));
    };

    const endDrag = () => { dragRef.current = null; };

    const handleAplicar = () => {
        const el = imgRef.current;
        const scaleX = el.naturalWidth / imgSize.w;
        const scaleY = el.naturalHeight / imgSize.h;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(crop.w * scaleX);
        canvas.height = Math.round(crop.h * scaleY);
        canvas.getContext('2d').drawImage(
            el, crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, crop.h * scaleY,
            0, 0, canvas.width, canvas.height
        );
        onAplicar(canvas.toDataURL('image/jpeg', 0.92));
    };

    return (
        <div className="modal-overlay firma-crop-overlay">
            <div className="firma-crop-container"
                onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
                <img ref={imgRef} src={src} alt="" className="firma-crop-img" onLoad={onImgLoad} draggable={false} />
                {crop && (
                    <div className="firma-crop-box" style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
                        onPointerDown={startDrag('move')}>
                        <span className="firma-crop-handle firma-crop-handle-nw" onPointerDown={startDrag('nw')} />
                        <span className="firma-crop-handle firma-crop-handle-ne" onPointerDown={startDrag('ne')} />
                        <span className="firma-crop-handle firma-crop-handle-sw" onPointerDown={startDrag('sw')} />
                        <span className="firma-crop-handle firma-crop-handle-se" onPointerDown={startDrag('se')} />
                    </div>
                )}
            </div>
            <div className="firma-crop-actions">
                <button className="firma-btn-secondary" onClick={onCancelar}>Cancelar</button>
                <button className="firma-btn-primary" onClick={handleAplicar}>Aplicar recorte</button>
            </div>
        </div>
    );
};

// Formulario de nueva firma / edición
const FirmaForm = ({ turnoActivo, editando, onCancelar, onGuardada, onReemplazo }) => {
    const [imagen, setImagen] = useState(editando?.imagen || null);
    const [capturaAbierta, setCapturaAbierta] = useState(false);
    const [recortando, setRecortando] = useState(false);
    const [nombres, setNombres] = useState(editando?.nombres || '');
    const [cedula, setCedula] = useState(editando?.cedula || '');
    const [empresa, setEmpresa] = useState(editando?.empresa || '');
    const [departamento, setDepartamento] = useState(editando?.departamento || '');
    const [cargo, setCargo] = useState(editando?.cargo || '');
    const [matchEstado, setMatchEstado] = useState(editando ? 'cargado' : null); // null | 'cargado' | 'no-autorizado' | 'no-encontrado'
    const [sugsNombres, setSugsNombres] = useState([]);
    const [sugsCedula, setSugsCedula] = useState([]);
    const [avisoExistente, setAvisoExistente] = useState(null);
    const [reemplazaA, setReemplazaA] = useState(null);
    const [verFirmaExistente, setVerFirmaExistente] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const timerNombres = useRef(null);
    const timerCedula = useRef(null);

    // Solo personas autorizadas por un admin pueden tener firma — las
    // sugerencias se filtran a esas, y si hay coincidencias sin autorizar
    // se avisa en vez de permitir crear una persona nueva desde aquí.
    const buscarYSugerir = async (val, setSugs) => {
        try {
            const { data } = await api.get(`/personas/search?q=${encodeURIComponent(val)}`);
            const todas = data.personas || [];
            todas.forEach(p => cachePersona(p).catch(() => {}));
            const autorizadas = todas.filter(p => p.autorizadoFirma);
            setSugs(autorizadas);
            if (!autorizadas.length) setMatchEstado(todas.length ? 'no-autorizado' : 'no-encontrado');
        } catch {
            const local = await buscarPersonaLocal(val).catch(() => []);
            const autorizadas = (local || []).filter(p => p.autorizadoFirma);
            setSugs(autorizadas);
            if (!autorizadas.length) setMatchEstado((local || []).length ? 'no-autorizado' : 'no-encontrado');
        }
    };

    const checkFirmaExistente = async (cedulaVal) => {
        if (editando) return; // al editar no tiene sentido compararla contra sí misma
        try {
            const { data } = await api.get(`/firmas?cedula=${encodeURIComponent(cedulaVal)}`);
            setAvisoExistente(data.firmas?.[0] || null);
            setReemplazaA(null);
        } catch { /* sin internet no se puede chequear; se deja continuar */ }
    };

    const handleNombresChange = val => {
        setNombres(val);
        setError('');
        setMatchEstado(null);
        if (val.trim().length < 3) { setSugsNombres([]); return; }
        clearTimeout(timerNombres.current);
        timerNombres.current = setTimeout(() => buscarYSugerir(val, setSugsNombres), 300);
    };

    const handleCedulaChange = val => {
        const soloDigitos = val.replace(/\D/g, '').slice(0, 10);
        setCedula(soloDigitos);
        setError('');
        setAvisoExistente(null);
        setReemplazaA(null);
        setMatchEstado(null);
        if (soloDigitos.length < 3) { setSugsCedula([]); return; }
        clearTimeout(timerCedula.current);
        timerCedula.current = setTimeout(async () => {
            await buscarYSugerir(soloDigitos, setSugsCedula);
            if (soloDigitos.length === 10) checkFirmaExistente(soloDigitos);
        }, 300);
    };

    const seleccionarPersona = p => {
        setNombres(p.nombres || '');
        setCedula(p.cedula || '');
        if (p.empresa) setEmpresa(p.empresa);
        if (p.departamento) setDepartamento(p.departamento);
        if (p.cargo) setCargo(p.cargo);
        setMatchEstado('cargado');
        setSugsNombres([]); setSugsCedula([]);
        if (p.cedula) checkFirmaExistente(p.cedula);
    };

    const handleCapturada = async (dataUrl) => {
        const comprimida = await compressImage(dataUrl);
        setImagen(comprimida);
        setCapturaAbierta(false);
    };

    const handleArchivoDirecto = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => setImagen(await compressImage(ev.target.result));
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleGirar = async () => setImagen(await rotateImageDataUrl(imagen));

    const nombresOk = nombres.trim().length > 2;
    const cedulaOk = cedula.trim().length === 10;
    const autorizadoOk = matchEstado === 'cargado';
    const puedeGuardar = !!imagen && nombresOk && cedulaOk && autorizadoOk;

    const footerHint = !imagen
        ? 'Captura la firma para continuar.'
        : matchEstado === 'no-encontrado'
            ? 'Esta persona no está registrada. Pide a un administrador que la registre en Personas y la autorice.'
            : matchEstado === 'no-autorizado'
                ? 'Esta persona no está autorizada para registrar firma. Pide a un administrador que la autorice desde Personas.'
                : !autorizadoOk
                    ? 'Busca y selecciona a la persona autorizada desde las sugerencias.'
                    : (avisoExistente && !reemplazaA)
                        ? 'Esta persona ya tiene firma: elige "Agregar otra" para vincular una adicional.'
                        : 'Al guardar, la firma se vinculará a la persona seleccionada.';

    const handleGuardar = async () => {
        if (!puedeGuardar || guardando) return;
        setGuardando(true);
        setError('');
        try {
            const payload = {
                nombres: nombres.trim(), cedula: cedula.trim(), empresa: empresa.trim(),
                departamento: departamento.trim(), cargo: cargo.trim(), imagen,
                puesto: turnoActivo?.puesto || '', bloque: turnoActivo?.bloque || '',
            };
            if (reemplazaA) payload.reemplazaA = reemplazaA;

            // Sin conexión, una firma nueva queda guardada en el dispositivo y se
            // sube al volver internet (editar sí requiere conexión).
            const registrarOffline = async () => {
                if (!payload.bloque) { setError('Inicia un turno en tu bloque para registrar firmas'); return; }
                const uuid = await encolarOperacion('firma', payload);
                if (reemplazaA) onReemplazo(reemplazaA);
                onGuardada({ ...payload, _id: uuid, createdAt: new Date().toISOString(), _pendiente: true });
            };

            if (editando) {
                const { data } = await api.put(`/firmas/${editando._id}`, payload);
                onGuardada(data.firma);
            } else if (!navigator.onLine) {
                await registrarOffline();
            } else {
                try {
                    const { data } = await api.post('/firmas', payload);
                    if (reemplazaA) onReemplazo(reemplazaA);
                    onGuardada(data.firma);
                } catch (err) {
                    if (err.response) throw err;
                    await registrarOffline();
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo guardar la firma');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="firma-form">
            <div className="firma-section-card">
                <div className="firma-section-head">
                    <span className="firma-section-num">1</span>
                    <span className="firma-section-title">Firma</span>
                    <span className="firma-section-tag">Obligatorio</span>
                </div>
                {!imagen ? (
                    <div className="firma-upload-empty">
                        <div className="firma-upload-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.828 2.828 0 114 4L8 20l-5 1 1-5L17 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div className="firma-upload-title">Sube o toma una foto de la firma</div>
                        <p className="firma-upload-text">Fotografía la firma sobre papel claro, con buena luz y sin sombras. PNG o JPG.</p>
                        <div className="firma-upload-actions">
                            <button className="firma-btn-primary" onClick={() => setCapturaAbierta(true)}>Tomar foto</button>
                            <button className="firma-btn-secondary" onClick={() => fileInputRef.current.click()}>Subir imagen</button>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleArchivoDirecto} />
                    </div>
                ) : (
                    <>
                        <span className="firma-preview-badge">✓ Vista previa</span>
                        <div className="firma-preview-wrap">
                            <img src={imagen} alt="Firma" className="firma-preview-img" />
                        </div>
                        <div className="firma-preview-actions">
                            <button className="firma-tool-btn" onClick={() => setRecortando(true)}>Recortar</button>
                            <button className="firma-tool-btn" onClick={handleGirar}>Girar</button>
                            <button className="firma-tool-btn" onClick={() => setCapturaAbierta(true)}>Reemplazar</button>
                        </div>
                    </>
                )}
            </div>

            <div className="firma-section-card">
                <div className="firma-section-head">
                    <span className="firma-section-num">2</span>
                    <span className="firma-section-title">Datos del funcionario</span>
                    {matchEstado === 'cargado' && <span className="firma-badge firma-badge-verde">Datos cargados desde la base</span>}
                    {matchEstado === 'no-autorizado' && <span className="firma-badge firma-badge-rojo">No autorizada</span>}
                    {matchEstado === 'no-encontrado' && <span className="firma-badge firma-badge-violeta">No registrada</span>}
                </div>

                <div className="firma-field">
                    <label>Nombres y apellidos</label>
                    <div className="firma-input-wrap">
                        <input value={nombres} onChange={e => handleNombresChange(e.target.value)} onBlur={() => setSugsNombres([])} placeholder="Busca o escribe el nombre completo" />
                        <PersonaSugMini items={sugsNombres} onSel={seleccionarPersona} />
                    </div>
                </div>

                <div className="firma-field">
                    <label>Cédula</label>
                    <div className="firma-input-wrap">
                        <input value={cedula} onChange={e => handleCedulaChange(e.target.value)} onBlur={() => setSugsCedula([])} placeholder="10 dígitos" inputMode="numeric" maxLength={10} />
                        <PersonaSugMini items={sugsCedula} onSel={seleccionarPersona} />
                    </div>
                </div>

                {matchEstado === 'no-encontrado' && (
                    <div className="firma-hint-box firma-hint-violeta">
                        <strong>Persona no registrada</strong>
                        <p>Pide a un administrador que la registre en Personas y la autorice para firmas.</p>
                    </div>
                )}

                {matchEstado === 'no-autorizado' && (
                    <div className="firma-hint-box firma-hint-rojo">
                        <strong>Persona no autorizada para firmar</strong>
                        <p>Existe en Personas pero no está autorizada. Pide a un administrador que la autorice.</p>
                    </div>
                )}

                {avisoExistente && !reemplazaA && (
                    <div className="firma-hint-box firma-hint-amarillo">
                        <strong>Esta persona ya tiene una firma registrada</strong>
                        <p>Registrada el {fmtFechaCorta(avisoExistente.createdAt)}{avisoExistente.puesto ? ` en ${avisoExistente.puesto}` : ''}.</p>
                        <div className="firma-hint-actions">
                            <button type="button" onClick={() => setVerFirmaExistente(true)}>Ver firma</button>
                            <button type="button" onClick={() => setReemplazaA(avisoExistente._id)}>+ Agregar otra</button>
                        </div>
                    </div>
                )}

                <div className="firma-field">
                    <label>Empresa</label>
                    <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ej. Andina Logística S.A." />
                </div>
                <div className="firma-field-row">
                    <div className="firma-field">
                        <label>Departamento</label>
                        <input value={departamento} onChange={e => setDepartamento(e.target.value)} placeholder="Ej. Bodega" />
                    </div>
                    <div className="firma-field">
                        <label>Cargo</label>
                        <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ej. Jefe de Bodega" />
                    </div>
                </div>
            </div>

            {error && <p className="modal-error firma-form-error">{error}</p>}
            <p className="firma-footer-hint">{footerHint}</p>
            <div className="firma-footer-actions">
                <button className="firma-btn-secondary" onClick={onCancelar} disabled={guardando}>Cancelar</button>
                <button className="firma-btn-primary" disabled={!puedeGuardar || guardando} onClick={handleGuardar}>
                    {guardando ? 'Guardando…' : '✓ Guardar'}
                </button>
            </div>

            {capturaAbierta && <CapturaFirma onCapturada={handleCapturada} onCancelar={() => setCapturaAbierta(false)} />}
            {recortando && <RecortarFirma src={imagen} onAplicar={dataUrl => { setImagen(dataUrl); setRecortando(false); }} onCancelar={() => setRecortando(false)} />}
            {verFirmaExistente && avisoExistente && (
                <div className="modal-overlay" onClick={() => setVerFirmaExistente(false)}>
                    <div className="firma-ver-existente-card" onClick={e => e.stopPropagation()}>
                        <img src={avisoExistente.imagen} alt="Firma existente" />
                        <button className="firma-btn-secondary" onClick={() => setVerFirmaExistente(false)}>Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Pantalla principal: galería ↔ formulario ↔ detalle
export const PantallaFirmas = ({ turnoActivo }) => {
    const [vista, setVista] = useState('galeria');
    const [firmas, setFirmas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromCache, setFromCache] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);
    const [search, setSearch] = useState('');
    const [filtroEmpresa, setFiltroEmpresa] = useState('todas');
    const [filtroDepto, setFiltroDepto] = useState('todos');
    const [vistaGrid, setVistaGrid] = useState(true);
    const [firmaSel, setFirmaSel] = useState(null);
    const [editando, setEditando] = useState(null);
    const [confirmarEliminar, setConfirmarEliminar] = useState(null);
    const [zoom, setZoom] = useState(1);

    const cargar = async () => {
        setLoading(true);
        setFromCache(false);
        // Firmas registradas sin conexión que todavía no se suben
        const pendientes = (await getOperacionesPendientes('firma').catch(() => []))
            .map(op => ({ ...op.payload, _id: op.uuid, createdAt: new Date(op.createdAt).toISOString(), _pendiente: true, _error: op.error }));
        try {
            const { data } = await api.get('/firmas');
            setFirmas([...pendientes, ...data.firmas]);
            data.firmas.forEach(f => cacheFirma(f).catch(() => {}));
            await touchCatalogMeta('firmas');
        } catch {
            try {
                const cached = await getFirmasCache();
                setFirmas([...pendientes, ...cached]);
                setFromCache(cached.length > 0);
                const meta = await getCatalogMeta('firmas');
                setCachedAt(meta?.cachedAt || null);
            } catch { /* se queda en lista vacía */ }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    // Recargar cuando una firma pendiente se sube (o se rechaza). Si se está
    // viendo su detalle, se vuelve a la galería porque cambia de identificador.
    const firmaSelRef = useRef(null);
    useEffect(() => { firmaSelRef.current = firmaSel; }, [firmaSel]);
    useEffect(() => {
        const onOperacion = e => {
            if (e.detail?.tipo !== 'firma') return;
            if (firmaSelRef.current?._id === e.detail.uuid) { setFirmaSel(null); setVista('galeria'); }
            cargar();
        };
        window.addEventListener('flujo:operaciones', onOperacion);
        return () => window.removeEventListener('flujo:operaciones', onOperacion);
    }, []);

    const empresas = useMemo(() => [...new Set(firmas.map(f => f.empresa).filter(Boolean))].sort(), [firmas]);
    const departamentos = useMemo(() => [...new Set(firmas.map(f => f.departamento).filter(Boolean))].sort(), [firmas]);

    const sq = search.toLowerCase();
    const filtradas = firmas.filter(f =>
        (filtroEmpresa === 'todas' || f.empresa === filtroEmpresa) &&
        (filtroDepto === 'todos' || f.departamento === filtroDepto) &&
        (!sq || [f.nombres, f.cedula, f.empresa, f.cargo].some(v => (v || '').toLowerCase().includes(sq)))
    );

    const handleEliminar = async (id) => {
        if (firmas.find(f => f._id === id)?._pendiente) {
            // Aún no está en el servidor: basta con sacarla de la cola
            await descartarOperacion(id).catch(() => {});
            setFirmas(prev => prev.filter(f => f._id !== id));
            setConfirmarEliminar(null);
            setFirmaSel(null);
            setVista('galeria');
            return;
        }
        try {
            await api.delete(`/firmas/${id}`);
            deleteCachedFirma(id).catch(() => {});
            setFirmas(prev => prev.filter(f => f._id !== id));
        } catch { /* sin conexión: no se puede borrar ahora */ }
        setConfirmarEliminar(null);
        setFirmaSel(null);
        setVista('galeria');
    };

    const abrirNueva = () => { setEditando(null); setVista('form'); };

    // ── Vista: Formulario ──
    if (vista === 'form') {
        return (
            <FirmaForm
                turnoActivo={turnoActivo}
                editando={editando}
                onCancelar={() => { setVista(firmaSel ? 'detalle' : 'galeria'); setEditando(null); }}
                onGuardada={firma => {
                    if (!firma._pendiente) cacheFirma(firma).catch(() => {});
                    setFirmas(prev => {
                        const idx = prev.findIndex(f => f._id === firma._id);
                        if (idx >= 0) { const n = [...prev]; n[idx] = firma; return n; }
                        return [firma, ...prev];
                    });
                    setEditando(null);
                    setFirmaSel(firma);
                    setVista('detalle');
                    setZoom(1);
                }}
                onReemplazo={idReemplazada => {
                    setFirmas(prev => prev.filter(f => f._id !== idReemplazada));
                    deleteCachedFirma(idReemplazada).catch(() => {});
                }}
            />
        );
    }

    // ── Vista: Detalle ──
    if (vista === 'detalle' && firmaSel) {
        const iniciales = (firmaSel.nombres || '').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
        return (
            <div className="firma-detalle">
                <div className="firma-detalle-header">
                    <button className="util-back-btn util-back-btn-junto" onClick={() => { setVista('galeria'); setFirmaSel(null); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <div>
                        <div className="firma-detalle-titulo">Detalle de firma</div>
                        <div className="firma-detalle-subtitulo">Firmas Funcionarios</div>
                    </div>
                </div>
                <div className="firma-detalle-img-wrap">
                    {firmaSel._pendiente
                        ? <span className={`firma-badge-registrada ${firmaSel._error ? 'firma-badge-error' : 'firma-badge-pendiente'}`}>
                            {firmaSel._error ? `No se pudo subir: ${firmaSel._error}` : 'Pendiente de subir · guardada en el dispositivo'}
                        </span>
                        : <span className="firma-badge-registrada">Firma registrada</span>}
                    <div className="firma-zoom-marco">
                        {/* La escala cambia con los botones de zoom: único estilo en línea */}
                        <img src={firmaSel.imagen} alt="" className="firma-zoom-img" style={{ transform: `scale(${zoom})` }} />
                    </div>
                </div>
                <div className="firma-zoom-controls">
                    <button onClick={() => setZoom(z => Math.max(1, +(z - 0.2).toFixed(1)))}>−</button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, +(z + 0.2).toFixed(1)))}>+</button>
                </div>
                <p className="firma-detalle-hint">Compara los trazos con la firma del documento. Usa el zoom para revisar inicio, cierre y rúbrica.</p>
                <div className="firma-detalle-info">
                    <div className="firma-detalle-persona">
                        <div className="firma-avatar">{iniciales}</div>
                        <div>
                            <div className="firma-detalle-nombre">{firmaSel.nombres}</div>
                            {firmaSel.cargo && <span className="firma-pill">{firmaSel.cargo}</span>}
                        </div>
                    </div>
                    {[
                        ['Cédula', firmaSel.cedula],
                        ['Empresa', firmaSel.empresa || '—'],
                        ['Departamento', firmaSel.departamento || '—'],
                        ['Cargo', firmaSel.cargo || '—'],
                        ['Registrada', `${fmtFechaCorta(firmaSel.createdAt)}${firmaSel.puesto ? ' · ' + firmaSel.puesto : ''}`],
                    ].map(([label, val]) => (
                        <div className="firma-detalle-row" key={label}>
                            <span className="firma-detalle-row-label">{label}</span>
                            <span className="firma-detalle-row-val">{val}</span>
                        </div>
                    ))}
                </div>
                <div className="firma-detalle-acciones">
                    {firmaSel._pendiente ? (
                        <button className="firma-btn-danger" onClick={() => setConfirmarEliminar(firmaSel)}>Descartar</button>
                    ) : (
                        <>
                            <button className="firma-btn-secondary" onClick={() => { setEditando(firmaSel); setVista('form'); }}>Editar</button>
                            <button className="firma-btn-danger" onClick={() => setConfirmarEliminar(firmaSel)}>Eliminar</button>
                        </>
                    )}
                </div>
                {confirmarEliminar && (
                    <ModalConfirm
                        mensaje={`La firma de ${confirmarEliminar.nombres} dejará de estar disponible para verificación en garita. Esta acción no se puede deshacer.`}
                        onConfirm={() => handleEliminar(confirmarEliminar._id)}
                        onCancel={() => setConfirmarEliminar(null)}
                    />
                )}
            </div>
        );
    }

    // ── Vista: Galería ──
    return (
        <div className="firma-galeria">
            <div className="firma-galeria-header">
                <div>
                    <div className="firma-galeria-titulo">Firmas Funcionarios</div>
                    <div className="firma-galeria-subtitulo">
                        {loading ? 'Cargando registro...' : firmas.length === 0 ? 'Sin firmas registradas' : `${firmas.length} firma${firmas.length !== 1 ? 's' : ''} registrada${firmas.length !== 1 ? 's' : ''}`}
                    </div>
                </div>
                <button className="firma-btn-primary" onClick={abrirNueva}>+ Nueva firma</button>
            </div>

            <div className="ws-search-bar firma-search-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws-search-lupa">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input className="ws-search-input" type="text" placeholder="Buscar por nombre, cédula, empresa o cargo"
                    value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button className="ws-search-clear" onClick={() => setSearch('')}>✕</button>}
            </div>

            {!loading && firmas.length > 0 && (
                <>
                    {empresas.length > 0 && (
                        <div className="firma-chip-row">
                            <span className="firma-chip-label">EMPRESA</span>
                            <div className="firma-chip-scroll">
                                <button className={`firma-chip${filtroEmpresa === 'todas' ? ' active' : ''}`} onClick={() => setFiltroEmpresa('todas')}>Todas</button>
                                {empresas.map(e => (
                                    <button key={e} className={`firma-chip${filtroEmpresa === e ? ' active' : ''}`} onClick={() => setFiltroEmpresa(e)}>{e}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {departamentos.length > 0 && (
                        <div className="firma-chip-row">
                            <span className="firma-chip-label">DEPARTAMENTO</span>
                            <div className="firma-chip-scroll">
                                <button className={`firma-chip${filtroDepto === 'todos' ? ' active' : ''}`} onClick={() => setFiltroDepto('todos')}>Todos</button>
                                {departamentos.map(d => (
                                    <button key={d} className={`firma-chip${filtroDepto === d ? ' active' : ''}`} onClick={() => setFiltroDepto(d)}>{d}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="firma-toolbar">
                        <span className="firma-toolbar-count">Mostrando {filtradas.length} de {firmas.length}</span>
                        <div className="firma-view-toggle">
                            <button className={vistaGrid ? 'active' : ''} onClick={() => setVistaGrid(true)} title="Vista cuadrícula">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/></svg>
                            </button>
                            <button className={!vistaGrid ? 'active' : ''} onClick={() => setVistaGrid(false)} title="Vista lista">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {fromCache && <CacheFreshnessBadge cachedAt={cachedAt} onRefresh={cargar} />}

            {loading ? (
                <div className="firma-grid firma-grid-cargando">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="firma-skeleton" />)}
                </div>
            ) : firmas.length === 0 ? (
                <div className="firma-empty">
                    <div className="firma-empty-icon">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.828 2.828 0 114 4L8 20l-5 1 1-5L17 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div className="firma-empty-title">Aún no hay firmas registradas</div>
                    <p className="firma-empty-text">Registra la firma de cada funcionario para que la guardia pueda identificar quién firmó pases, salidas y órdenes.</p>
                    <button className="firma-btn-primary" onClick={abrirNueva}>+ Registrar primera firma</button>
                </div>
            ) : filtradas.length === 0 ? (
                <p className="ws-empty">Sin resultados para "{search}"</p>
            ) : vistaGrid ? (
                <div className="firma-grid firma-coleccion">
                    {filtradas.map(f => (
                        <button key={f._id} className="firma-card" onClick={() => { setFirmaSel(f); setVista('detalle'); setZoom(1); }}>
                            <img src={f.imagen} alt="" className="firma-card-img" />
                            <div className="firma-card-nombre">{f.nombres}</div>
                            {f._pendiente && <PendienteBadge error={f._error} onDescartar={() => handleEliminar(f._id)} />}
                            {f.cargo && <span className="firma-pill">{f.cargo}</span>}
                            {f.empresa && <div className="firma-card-meta">{f.empresa}</div>}
                            {f.departamento && <div className="firma-card-meta firma-card-meta-dim">{f.departamento}</div>}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="firma-list firma-coleccion">
                    {filtradas.map(f => (
                        <button key={f._id} className="firma-list-row" onClick={() => { setFirmaSel(f); setVista('detalle'); setZoom(1); }}>
                            <img src={f.imagen} alt="" className="firma-list-thumb" />
                            <div className="firma-list-info">
                                <div className="firma-card-nombre">{f.nombres}</div>
                                {f._pendiente && <PendienteBadge error={f._error} onDescartar={() => handleEliminar(f._id)} />}
                                {f.cargo && <span className="firma-pill">{f.cargo}</span>}
                                <div className="firma-card-meta">{f.empresa}{f.departamento ? ' · ' + f.departamento : ''}</div>
                            </div>
                            <IconChevronRight />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
