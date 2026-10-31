import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import {
    cacheExtension,
    getExtensionesCache,
    deleteCachedExtension,
    touchCatalogMeta,
    getCatalogMeta,
} from '../../lib/syncEngine.js';
import { CacheFreshnessBadge, ModalField } from './comunes';
import { EMPTY_EXT, addMouseSwipe, extToText, handleCopyText, handleShareText } from './helpers';
import { IconCopy, IconMinus, IconPencil, IconShare } from './iconos';

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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="ficha-det detalle-arriba-movil" onClick={e => e.stopPropagation()}>
                {/* Barra superior: badge + botón cerrar */}
                <div className="ficha-det-top">
                    <div className="ficha-det-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.37 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 17z" />
                        </svg>
                        EXTENSIÓN
                    </div>
                    <button className="ficha-det-cerrar" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6 6 18" /><path d="M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Avatar + nombre + empresa */}
                <div className="ficha-det-cabecera">
                    <div className="ficha-det-avatar">{initials || '?'}</div>
                    <div className="ficha-det-identidad">
                        <div className="ficha-det-nombre">{(ext.nombre || '—').toUpperCase()}</div>
                        {ext.empresa && <div className="ficha-det-sub">{ext.empresa.toUpperCase()}</div>}
                    </div>
                </div>

                {/* Campos */}
                <div className="ficha-det-campos">
                    {fields.length > 0 ? fields.map(f => (
                        <div key={f.label} className="ficha-det-campo">
                            <span className="ficha-det-campo-label">{f.label}</span>
                            <span className="ficha-det-campo-valor ficha-det-num">{f.value}</span>
                        </div>
                    )) : (
                        <div className="ficha-det-vacio">Sin datos adicionales</div>
                    )}
                </div>

                {/* Acciones */}
                <div className="ficha-det-acciones">
                    {onEdit && (
                        <button title="Editar" className="ficha-det-accion" onClick={() => { onEdit(ext); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M12 20h9" ${S}/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" ${S}/>` }} />
                        </button>
                    )}
                    <button title="Copiar" className="ficha-det-accion" onClick={() => handleCopyText(extToText(ext))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<rect x="9" y="9" width="12" height="12" rx="2" ${S}/><path d="M5 15V5a2 2 0 0 1 2-2h10" ${S}/>` }} />
                    </button>
                    <button title="Compartir" className="ficha-det-accion" onClick={() => handleShareText(extToText(ext))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" ${S}/><path d="M16 6l-4-4-4 4" ${S}/><path d="M12 2v14" ${S}/>` }} />
                    </button>
                    {onDelete && (
                        <button title="Eliminar" className="ficha-det-accion peligro" onClick={() => { onDelete(ext._id); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M5 12h14" ${S}/>` }} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

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
export const PantallaExtensiones = () => {
    const [extensiones, setExtensiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromCache, setFromCache] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editExt, setEditExt] = useState(null);
    const [swipedExtId, setSwipedExtId] = useState(null);
    const extSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false, didDrag: false });
    const [detailExt, setDetailExt] = useState(null);

    const cargar = async () => {
        setLoading(true);
        setFromCache(false);
        try {
            const { data } = await api.get('/extensiones');
            setExtensiones(data.extensiones);
            data.extensiones.forEach(e => cacheExtension(e).catch(() => {}));
            await touchCatalogMeta('extensiones');
        } catch {
            // Sin conexión: mostrar lo último que se tenga cacheado localmente
            try {
                const cached = await getExtensionesCache();
                setExtensiones(cached);
                setFromCache(cached.length > 0);
                const meta = await getCatalogMeta('extensiones');
                setCachedAt(meta?.cachedAt || null);
            } catch { /* se queda en lista vacía */ }
        } finally {
            setLoading(false);
        }
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
        deleteCachedExtension(id).catch(() => {});
        try { await api.delete(`/extensiones/${id}`); } catch { }
    };

    return (
        <div className="lista">

            {/* Barra búsqueda */}
            <div className="lista-barra lista-barra-ancha">
                <div className="ws-search-bar lista-search-bar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws-search-lupa">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws-search-input" type="text"
                        placeholder="Filtrar por nombre, cargo o departamento..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="ws-search-clear" onClick={() => setSearch('')}>✕</button>}
                </div>
                <span className="lista-total">
                    {filtrados.length} reg.
                </span>
            </div>

            {/* Aviso de datos cargados desde caché offline */}
            {fromCache && <CacheFreshnessBadge cachedAt={cachedAt} onRefresh={cargar} />}

            {/* Tabla de extensiones */}
            {loading
                ? <p className="ws-empty">Cargando...</p>
                : filtrados.length === 0
                    ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'No hay extensiones registradas'}</p>
                    : (
                        <div className="ftable-scroll">
                            {/* Encabezado */}
                            <div className="ftable-head ftable-cols-extensiones">
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
                                                className={`ftable-row ftable-cols-extensiones${isSwiped ? ' ftable-swiped-4' : ''}`}
                                                
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
                                                <span className="ftable-cell">{e.cargo || '—'}</span>
                                                <span className="ftable-cell ftable-cell-dim">{(e.departamento || '—').toUpperCase()}</span>
                                                <span className="ftable-cell ftable-cell-accent">{e.extension ? `Ext. ${e.extension}` : '—'}</span>
                                                <span className="ftable-cell ftable-cell-dim">{e.celular || '—'}</span>
                                                <span className="ftable-cell">{(e.empresa || '—').toUpperCase()}</span>
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
