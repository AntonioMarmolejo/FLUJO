import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { cacheVehiculo, getVehiculosCache, deleteCachedVehiculo, touchCatalogMeta, getCatalogMeta } from '../../lib/syncEngine.js';
import { CacheFreshnessBadge, ModalField, TextSugField } from './comunes';
import {
    EMPTY_VEHICULO,
    TIPO_VEHICULO_OPTS,
    addMouseSwipe,
    handleCopyText,
    handleShareText,
    vToText,
} from './helpers';
import { IconCopy, IconMinus, IconPencil, IconQR, IconShare } from './iconos';

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
            <div className="modal-card qr-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header qr-modal-header">
                    <h3>{vehiculo.placa}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <img src={qrUrl} alt="QR" className="qr-modal-img" />
                <p className="qr-modal-datos">
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
                <p className="import-ayuda">
                    Sube un archivo <strong>CSV</strong> o <strong>Excel (.xlsx)</strong>.<br />
                    Encabezados reconocidos: <span className="import-encabezados">PLACA, MARCA, COLOR, TIPO, EMPRESA</span>
                </p>
                <label className="import-dropzone">
                    <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} hidden />
                    {fileName ? (
                        <div className="import-archivo">
                            <div className="import-archivo-icono">📄</div>
                            <div className="import-archivo-nombre">{fileName}</div>
                            {parsedRows.length > 0
                                ? <div className="import-archivo-ok">{parsedRows.length} registros detectados</div>
                                : <div className="import-archivo-error">Sin registros válidos</div>}
                        </div>
                    ) : (
                        <div className="import-vacio">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="import-vacio-icono">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 15V5" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div>Toca para seleccionar CSV o Excel</div>
                        </div>
                    )}
                </label>
                {parsedRows.length > 0 && (
                    <div className="import-preview">
                        {parsedRows.slice(0, 6).map((v, i) => (
                            <div key={i} className="import-preview-fila">
                                <span className="import-preview-clave">{v.placa}</span>
                                <span className="import-preview-detalle">{[v.marca, v.empresa].filter(Boolean).join(' · ') || '—'}</span>
                            </div>
                        ))}
                        {parsedRows.length > 6 && <div className="import-preview-mas">+{parsedRows.length - 6} más...</div>}
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
                <p className="import-conflictos-intro">
                    <strong>{result.created} nuevos</strong> importados. Las placas siguientes ya existen — elige qué conservar:
                </p>
                <div className="import-conflictos">
                    {result.conflicts.map(c => (
                        <div key={c.existing.placa} className="import-conflicto">
                            <div className="import-conflicto-clave">{c.existing.placa}</div>
                            <div className="import-conflicto-comparar">
                                <div className="import-version">
                                    <div className="import-version-titulo">ACTUAL</div>
                                    <div className="import-version-principal">{c.existing.marca || '—'}</div>
                                    <div className="import-version-detalle">{c.existing.empresa || '—'}</div>
                                </div>
                                <div className="import-version">
                                    <div className="import-version-titulo">NUEVO</div>
                                    <div className="import-version-principal">{c.incoming.marca || '—'}</div>
                                    <div className="import-version-detalle">{c.incoming.empresa || '—'}</div>
                                </div>
                            </div>
                            <div className="import-opciones">
                                {[['keep', 'Mantener actual'], ['update', 'Usar nuevo']].map(([val, label]) => (
                                    <button key={val}
                                        onClick={() => setChoices(ch => ({ ...ch, [c.existing.placa]: val }))}
                                        className={`import-opcion import-opcion-${val}${choices[c.existing.placa] === val ? ' elegida' : ''}`}>
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
            <div className="modal-card import-exito" onClick={e => e.stopPropagation()}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#4ade80" strokeWidth="2" />
                    <path d="M8 12l3 3 5-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="import-exito-titulo">Importación exitosa</div>
                <div className="import-exito-texto">
                    {result.created} vehículo{result.created !== 1 ? 's' : ''} nuevos importados
                    {result.conflicts.length > 0 && ` · ${result.conflicts.length} conflicto${result.conflicts.length !== 1 ? 's' : ''} resuelto${result.conflicts.length !== 1 ? 's' : ''}`}
                </div>
                <button className="modal-btn active import-exito-btn" onClick={onClose}>Listo</button>
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
            <div className="modal-card vehdet" onClick={e => e.stopPropagation()}>
                {/* Cabecera */}
                <div className="modal-header">
                    <h3 className="vehdet-placa">{v.placa}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Campos */}
                <div className="vehdet-campos">
                    {campos.length > 0 ? campos.map(({ label, val }) => (
                        <div key={label} className="vehdet-campo">
                            <span className="vehdet-label">{label}</span>
                            <span className="vehdet-valor">{val}</span>
                        </div>
                    )) : (
                        <p className="vehdet-vacio">Sin datos adicionales registrados</p>
                    )}
                </div>

                {/* Botón editar */}
                <button
                    className="modal-btn active vehdet-editar"
                    onClick={() => { onEdit(v); onClose(); }}
                >
                    ✏️ Editar este vehículo
                </button>

                {/* Navegación anterior / siguiente */}
                <div className="vehdet-nav">
                    <button
                        onClick={() => onNavigate(vehiculos[idx - 1]?._id)}
                        disabled={idx === 0}
                        className="vehdet-nav-btn"
                    >←</button>
                    <span className="vehdet-contador">
                        {idx + 1} / {vehiculos.length}
                    </span>
                    <button
                        onClick={() => onNavigate(vehiculos[idx + 1]?._id)}
                        disabled={idx === vehiculos.length - 1}
                        className="vehdet-nav-btn"
                    >→</button>
                </div>
            </div>
        </div>
    );
};

// ── Pantalla Placas DB ────────────────────────────────────
export const PantallaPlacasDB = () => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);
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
            await touchCatalogMeta('vehiculos');
        } catch {
            // Sin conexión: intentar cargar desde caché local
            try {
                const cached = await getVehiculosCache();
                if (cached.length > 0) {
                    setVehiculos(cached);
                    setFromCache(true);
                    const meta = await getCatalogMeta('vehiculos');
                    setCachedAt(meta?.cachedAt || null);
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
        <div className="lista">

            {/* Barra búsqueda */}
            <div className="lista-barra">
                <div className="ws-search-bar lista-search-bar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws-search-lupa">
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
                <span className="lista-total">
                    {filtrados.length} reg.
                </span>
            </div>

            {/* Aviso de datos cargados desde caché offline */}
            {fromCache && <CacheFreshnessBadge cachedAt={cachedAt} onRefresh={cargar} />}

            {/* Tabla de vehículos */}
            {loading
                ? <p className="ws-empty">Cargando...</p>
                : loadError
                    ? (
                        <div className="lista-error">
                            <p className="lista-error-texto">
                                ⚠️ No se pudo cargar la lista de vehículos
                            </p>
                            <button className="lista-error-reintentar" onClick={cargar}>
                                Reintentar
                            </button>
                        </div>
                    )
                : filtrados.length === 0
                    ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'No hay vehículos registrados'}</p>
                    : (
                        <div className="ftable-scroll">
                            {/* Encabezado */}
                            <div className="ftable-head ftable-cols-placas">
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
                                                className={`ftable-row ftable-cols-placas${isSwiped ? ' ftable-swiped-5' : ''}`}
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
                                                <span className="ftable-cell ftable-cell-accent">{v.placa}</span>
                                                <span className="ftable-cell">{(v.marca || '—').toUpperCase()}</span>
                                                <span className="ftable-cell ftable-cell-dim">{(v.color || '—').toUpperCase()}</span>
                                                <span className="ftable-cell ftable-cell-dim">{(v.tipoVehiculo || '—').toUpperCase()}</span>
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
