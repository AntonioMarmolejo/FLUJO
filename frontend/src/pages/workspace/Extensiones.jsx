import { useState, useEffect, useRef } from 'react';
import { getCatalogMeta } from '../../lib/syncEngine.js';
import {
    encolarCambioExtension,
    idsExtensionesPendientes,
    leerExtensionesLocales,
    nuevoIdExtension,
    refrescarExtensiones,
} from '../../lib/extensionesOffline.js';
import { CacheFreshnessBadge, ModalField, PendienteBadge } from './comunes';
import { EMPTY_EXT, addMouseSwipe, extToText, handleCopyText, handleShareText } from './helpers';
import { IconCopy, IconMinus, IconPencil, IconShare } from './iconos';
import { Sk, SkeletonTabla } from '../../components/Skeleton';

const TITULOS_EXTENSIONES = ['NOMBRE', 'CARGO', 'DEPTO', 'EXT.', 'CELULAR', 'EMPRESA'];

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
        <div className="modal__overlay" onClick={onClose}>
            <div className="ficha__det detalle__arriba-movil" onClick={e => e.stopPropagation()}>
                {/* Barra superior: badge + botón cerrar */}
                <div className="ficha__det-top">
                    <div className="ficha__det-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.37 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 17z" />
                        </svg>
                        EXTENSIÓN
                    </div>
                    <button className="ficha__det-cerrar" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6 6 18" /><path d="M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Avatar + nombre + empresa */}
                <div className="ficha__det-cabecera">
                    <div className="ficha__det-avatar">{initials || '?'}</div>
                    <div className="ficha__det-identidad">
                        <div className="ficha__det-nombre">{(ext.nombre || '—').toUpperCase()}</div>
                        {ext.empresa && <div className="ficha__det-sub">{ext.empresa.toUpperCase()}</div>}
                    </div>
                </div>

                {/* Campos */}
                <div className="ficha__det-campos">
                    {fields.length > 0 ? fields.map(f => (
                        <div key={f.label} className="ficha__det-campo">
                            <span className="ficha__det-campo-label">{f.label}</span>
                            <span className="ficha__det-campo-valor ficha__det-num">{f.value}</span>
                        </div>
                    )) : (
                        <div className="ficha__det-vacio">Sin datos adicionales</div>
                    )}
                </div>

                {/* Acciones */}
                <div className="ficha__det-acciones">
                    {onEdit && (
                        <button title="Editar" className="ficha__det-accion" onClick={() => { onEdit(ext); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M12 20h9" ${S}/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" ${S}/>` }} />
                        </button>
                    )}
                    <button title="Copiar" className="ficha__det-accion" onClick={() => handleCopyText(extToText(ext))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<rect x="9" y="9" width="12" height="12" rx="2" ${S}/><path d="M5 15V5a2 2 0 0 1 2-2h10" ${S}/>` }} />
                    </button>
                    <button title="Compartir" className="ficha__det-accion" onClick={() => handleShareText(extToText(ext))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" ${S}/><path d="M16 6l-4-4-4 4" ${S}/><path d="M12 2v14" ${S}/>` }} />
                    </button>
                    {onDelete && (
                        <button title="Eliminar" className="ficha__det-accion ficha__det-accion--peligro" onClick={() => { onDelete(ext._id); onClose(); }}>
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

    // Guardado al instante, con o sin internet: el cambio queda en el dispositivo
    // y se sube cuando haya conexión (lib/extensionesOffline.js).
    const handleSubmit = async () => {
        const nombre = form.nombre.trim();
        if (!nombre) { setError('El nombre es obligatorio'); return; }
        if (loading) return;
        setLoading(true);
        try {
            if (editData?._id) {
                const { _pendiente, ...actual } = editData;
                await encolarCambioExtension({ tipo: 'editar', doc: { ...actual, ...form, nombre } });
            } else {
                await encolarCambioExtension({ tipo: 'crear', doc: { ...form, nombre, _id: nuevoIdExtension() } });
            }
            onGuardado();
            onClose();
        } catch {
            setError('No se pudo guardar en este dispositivo');
            setLoading(false);
        }
    };

    const fp = { onChange: handleChange, autoFilled: false };

    return (
        <div className="modal__overlay" onClick={onClose}>
            <div className="modal__card" onClick={e => e.stopPropagation()}>
                <div className="modal__header">
                    <h3>{editData ? 'Editar extensión' : 'Nueva extensión'}</h3>
                    <button className="modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="modal__fields">
                    <ModalField name="nombre" label="NOMBRE *" placeholder="Nombre completo" value={form.nombre} {...fp} />
                    <div className="modal__fields-row">
                        <ModalField name="empresa" label="EMPRESA" placeholder="EP Petroecuador" value={form.empresa} {...fp} />
                        <ModalField name="departamento" label="DEPARTAMENTO" placeholder="OPR, ADM..." value={form.departamento} {...fp} />
                    </div>
                    <ModalField name="cargo" label="CARGO" placeholder="Jefe de Campo..." value={form.cargo} {...fp} />
                    <div className="modal__fields-row">
                        <ModalField name="extension" label="EXTENSIÓN" placeholder="78201" value={form.extension} {...fp} />
                        <ModalField name="celular" label="CELULAR" placeholder="0998..." value={form.celular} {...fp} />
                    </div>
                </div>
                {error && <p className="modal__error">{error}</p>}
                <button className={`modal__btn${form.nombre ? ' modal__btn--active' : ''}`} onClick={handleSubmit} disabled={loading}>
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

    // Lo que se ve es siempre la copia del dispositivo: la última lista del
    // servidor más los cambios que todavía no se suben (marcados "Pendiente").
    const mostrarLocales = async () => {
        const [locales, pendientes] = await Promise.all([
            leerExtensionesLocales().catch(() => []),
            idsExtensionesPendientes().catch(() => new Set()),
        ]);
        setExtensiones(locales.map(e => (pendientes.has(e._id) ? { ...e, _pendiente: true } : e)));
        return locales;
    };

    const cargar = async () => {
        // Primero lo local, para no esperar a la red
        const locales = await mostrarLocales();
        if (locales.length) setLoading(false);
        try {
            await refrescarExtensiones();
            await mostrarLocales();
            setFromCache(false);
        } catch {
            // Sin conexión: se sigue con la copia local
            setFromCache(locales.length > 0);
            const meta = await getCatalogMeta('extensiones').catch(() => null);
            setCachedAt(meta?.cachedAt || null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    // Tras subir la cola (aquí o desde otra pantalla) la copia local ya está al día
    useEffect(() => {
        const onSync = () => { mostrarLocales(); };
        window.addEventListener('flujo:extensiones', onSync);
        return () => window.removeEventListener('flujo:extensiones', onSync);
    }, []);

    const sq = search.toLowerCase();
    const filtrados = sq
        ? extensiones.filter(e =>
            (e.nombre || '').toLowerCase().includes(sq) ||
            (e.cargo || '').toLowerCase().includes(sq) ||
            (e.empresa || '').toLowerCase().includes(sq) ||
            (e.departamento || '').toLowerCase().includes(sq))
        : extensiones;

    // Eliminación al instante; queda en cola hasta que el servidor la confirme
    const handleDelete = async id => {
        setExtensiones(prev => prev.filter(e => e._id !== id));
        await encolarCambioExtension({ tipo: 'borrar', id, clave: id }).catch(() => {});
    };

    return (
        <div className="lista">

            {/* Barra búsqueda */}
            <div className="lista__barra lista__barra--ancha">
                <div className="ws__search-bar ws__search-bar--lista">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws__search-lupa">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws__search-input" type="text"
                        placeholder="Filtrar por nombre, cargo o departamento..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="ws__search-clear" onClick={() => setSearch('')}>✕</button>}
                </div>
                <span className="lista__total">
                    {loading ? <Sk forma="chip" /> : `${filtrados.length} reg.`}
                </span>
            </div>

            {/* Aviso de datos cargados desde caché offline */}
            {fromCache && <CacheFreshnessBadge cachedAt={cachedAt} onRefresh={cargar} />}

            {/* Tabla de extensiones */}
            {loading
                ? <SkeletonTabla columnas="ftable__cols-extensiones" titulos={TITULOS_EXTENSIONES} />
                : filtrados.length === 0
                    ? <p className="ws__empty">{search ? `Sin resultados para "${search}"` : 'No hay extensiones registradas'}</p>
                    : (
                        <div className="ftable__scroll">
                            {/* Encabezado */}
                            <div className="ftable__head ftable__cols-extensiones">
                                {TITULOS_EXTENSIONES.map(h => (
                                    <span key={h} className="ftable__head-cell">{h}</span>
                                ))}
                            </div>
                            <div className="ftable">
                                {filtrados.map(e => {
                                    const isSwiped = swipedExtId === e._id;
                                    return (
                                        <div key={e._id} className="ftable__row-wrap">
                                            <div className="ftable__actions" onClick={ev => ev.stopPropagation()}>
                                                <button className="plist__act-btn" title="Editar"    onClick={() => { setEditExt(e); setSwipedExtId(null); }}><IconPencil /></button>
                                                <button className="plist__act-btn" title="Copiar"    onClick={() => { handleCopyText(extToText(e)); setSwipedExtId(null); }}><IconCopy /></button>
                                                <button className="plist__act-btn" title="Compartir" onClick={() => { handleShareText(extToText(e)); setSwipedExtId(null); }}><IconShare /></button>
                                                <button className="plist__act-btn plist__act-btn--danger" title="Eliminar" onClick={() => { handleDelete(e._id); setSwipedExtId(null); }}><IconMinus /></button>
                                            </div>
                                            <div
                                                className={`ftable__row ftable__cols-extensiones${isSwiped ? ' ftable__swiped-4' : ''}`}
                                                
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
                                                <span className="ftable__cell ftable__cell--flex ftable__cell--bold">
                                                    {(e.nombre || '—').toUpperCase()}
                                                    {e._pendiente && <PendienteBadge />}
                                                </span>
                                                <span className="ftable__cell">{e.cargo || '—'}</span>
                                                <span className="ftable__cell ftable__cell--dim">{(e.departamento || '—').toUpperCase()}</span>
                                                <span className="ftable__cell ftable__cell--accent">{e.extension ? `Ext. ${e.extension}` : '—'}</span>
                                                <span className="ftable__cell ftable__cell--dim">{e.celular || '—'}</span>
                                                <span className="ftable__cell">{(e.empresa || '—').toUpperCase()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
            }

            <button className="placas__fab" onClick={() => setShowForm(true)}>+</button>

            {(showForm || editExt) && (
                <ModalExtension
                    onClose={() => { setShowForm(false); setEditExt(null); }}
                    onGuardado={mostrarLocales}
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
