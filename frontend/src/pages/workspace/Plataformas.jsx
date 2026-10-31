import { useState, useEffect, useRef } from 'react';
import { BLOQUES_DATA } from '../../data/bloques.js';
import api from '../../api/axios';
import {
    cacheNominativo,
    getNominativosCache,
    deleteCachedNominativo,
    touchCatalogMeta,
    getCatalogMeta,
} from '../../lib/syncEngine.js';
import { CacheFreshnessBadge, ModalConfirm } from './comunes';
import { addMouseSwipe, handleShareText } from './helpers';
import { IconCopy, IconMinus, IconPencil, IconShare } from './iconos';

// ── Pantalla Plataformas y Nominativos ────────────────────
const SECCIONES_NOMINATIVO = [
    {
        id: 'puesto', label: 'Personal y Puestos',
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V5l8-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
    },
    {
        id: 'locacion', label: 'Locaciones',
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.8"/></svg>,
    },
];

const NominativoForm = ({ bloque, bloqueInfo, editando, nominativos, onCancelar, onGuardado, onEliminado }) => {
    const [seccion, setSeccion] = useState(editando?.seccion || 'puesto');
    const [nombre, setNombre] = useState(editando?.nombre || '');
    const [codigo, setCodigo] = useState(editando?.codigo || '');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmarEliminar, setConfirmarEliminar] = useState(false);

    const codigoNorm = codigo.trim().toUpperCase();
    const duplicado = !!codigoNorm && nominativos.some(n => n.codigo === codigoNorm && n._id !== editando?._id);
    const puedeGuardar = !!nombre.trim() && !!codigoNorm && !duplicado;

    const handleGuardar = async () => {
        if (!puedeGuardar || loading) return;
        setLoading(true);
        setError('');
        try {
            if (editando) {
                const { data } = await api.put(`/nominativos/${editando._id}`, { seccion, nombre: nombre.trim(), codigo: codigoNorm });
                onGuardado(data.nominativo);
            } else {
                const { data } = await api.post('/nominativos', { bloque, seccion, nombre: nombre.trim(), codigo: codigoNorm });
                onGuardado(data.nominativo);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo guardar. Verifica tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async () => {
        setLoading(true);
        try {
            await api.delete(`/nominativos/${editando._id}`);
            onEliminado(editando._id);
        } catch {
            setError('No se pudo eliminar. Verifica tu conexión.');
            setConfirmarEliminar(false);
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancelar}>
            <div className="plat-form-card" onClick={e => e.stopPropagation()}>
                <div className="plat-form-header">
                    <div>
                        <div className="plat-form-titulo">{editando ? 'Editar nominativo' : 'Nuevo nominativo'}</div>
                        <div className="plat-form-subtitulo">
                            Bloque {bloque} – {bloqueInfo.sitio || bloqueInfo.codigo}{editando ? ` · Actual: ${editando.codigo}` : ''}
                        </div>
                    </div>
                    <button className="plat-form-close" onClick={onCancelar} aria-label="Cerrar">✕</button>
                </div>

                <label className="plat-form-label">Sección</label>
                <div className="plat-seccion-toggle">
                    {SECCIONES_NOMINATIVO.map(s => (
                        <button key={s.id} type="button" className={`plat-seccion-btn${seccion === s.id ? ' active' : ''}`} onClick={() => setSeccion(s.id)}>
                            {s.icon}{s.label}
                        </button>
                    ))}
                </div>

                <label className="plat-form-label">Nombre del puesto</label>
                <input className="plat-form-input" type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Garita Secundaria" />

                <label className="plat-form-label">Nominativo de radio</label>
                <input className="plat-form-input plat-form-input-mono" type="text" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="Ej. ECO-44" />
                <p className="plat-form-hint">
                    Se guarda en mayúsculas. Debe ser único dentro del bloque.
                    {duplicado && <span className="plat-form-hint-error"> Ese código ya está en uso en este bloque.</span>}
                </p>

                <label className="plat-form-label">Vista previa</label>
                <div className="plat-preview-row">
                    <span className={nombre.trim() ? '' : 'plat-preview-dim'}>{nombre.trim() || 'Nombre del puesto'}</span>
                    <span className={`plat-pill${codigoNorm ? '' : ' plat-pill-dim'}`}>{codigoNorm || 'NOMINATIVO'}</span>
                </div>

                {error && <p className="plat-form-error">{error}</p>}

                {editando && (
                    <>
                        <div className="plat-form-divider" />
                        <div className="plat-form-eliminar-row">
                            <span>Quitar este nominativo del bloque</span>
                            <button type="button" className="plat-btn-danger-outline" onClick={() => setConfirmarEliminar(true)} disabled={loading}>🗑 Eliminar</button>
                        </div>
                    </>
                )}

                <div className="plat-form-divider" />
                <div className="plat-form-footer">
                    <button type="button" className="plat-btn-secondary" onClick={onCancelar} disabled={loading}>Cancelar</button>
                    <button type="button" className="plat-btn-primary" onClick={handleGuardar} disabled={!puedeGuardar || loading}>
                        {editando ? 'Guardar cambios' : 'Guardar nominativo'}
                    </button>
                </div>

                {confirmarEliminar && (
                    <ModalConfirm
                        mensaje={`"${editando.nombre}" (${editando.codigo}) dejará de estar disponible en el bloque. Esta acción no se puede deshacer.`}
                        onConfirm={handleEliminar}
                        onCancel={() => setConfirmarEliminar(false)}
                    />
                )}
            </div>
        </div>
    );
};

// Fila de nominativo con swipe izq→der para revelar Eliminar/Editar/Copiar/
// Compartir — mismo gesto y mismos refs/helpers que usan las filas de
// Movimientos (addMouseSwipe, IconMinus/IconPencil/IconCopy/IconShare). El
// badge con el código ya no se toca para copiar: esa acción vive solo en el
// panel de swipe, para no duplicar gestos.
const NominativoRow = ({ n, onCopiar, onEditar, onEliminar, onCompartir, swiped, onSwipe, swipeRef }) => (
    <div className="plat-row-wrap">
        <div className="plat-row-actions" onClick={e => e.stopPropagation()}>
            <button type="button" className="plat-row-act-btn danger" title="Eliminar" onClick={() => { onEliminar(n); onSwipe(null); }}><IconMinus /></button>
            <button type="button" className="plat-row-act-btn" title="Editar" onClick={() => { onEditar(n); onSwipe(null); }}><IconPencil /></button>
            <button type="button" className="plat-row-act-btn" title="Copiar" onClick={() => { onCopiar(n.codigo); onSwipe(null); }}><IconCopy /></button>
            <button type="button" className="plat-row-act-btn" title="Compartir" onClick={() => { onCompartir(n); onSwipe(null); }}><IconShare /></button>
        </div>
        <div
            className={`plat-row${swiped ? ' plat-row-swiped' : ''}`}
            onTouchStart={e => {
                swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false };
            }}
            onTouchMove={e => {
                const dx = e.touches[0].clientX - swipeRef.current.startX;
                const dy = e.touches[0].clientY - swipeRef.current.startY;
                if (!swipeRef.current.moved && !swipeRef.current.vertScroll) {
                    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                    if (Math.abs(dy) > Math.abs(dx)) { swipeRef.current.vertScroll = true; return; }
                    swipeRef.current.moved = true;
                }
                if (swipeRef.current.moved) e.preventDefault();
            }}
            onTouchEnd={e => {
                if (!swipeRef.current.moved) return;
                const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
                if (swiped) { if (dx < -30) onSwipe(null); }
                else if (dx > 55) onSwipe(n._id);
            }}
            {...addMouseSwipe(swipeRef, dx => {
                if (swiped) { if (dx < -30) onSwipe(null); }
                else if (dx > 55) onSwipe(n._id);
            })}
            onClick={() => {
                if (swipeRef.current?.didDrag) { swipeRef.current.didDrag = false; return; }
                if (swiped) onSwipe(null);
            }}
        >
            <span className="plat-row-nombre">{n.nombre}</span>
            <span className="plat-pill">{n.codigo}</span>
        </div>
    </div>
);

export const PantallaPlataformas = ({ turnoActivo, search = '' }) => {
    const bloqueId = turnoActivo?.bloque;
    const bloqueInfo = bloqueId ? BLOQUES_DATA[bloqueId] : null;
    const [nominativos, setNominativos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromCache, setFromCache] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [seccionesAbiertas, setSeccionesAbiertas] = useState({ puesto: true, locacion: true });
    const [vistaGrid, setVistaGrid] = useState(true);
    const [form, setForm] = useState(null); // null | 'nueva' | {nominativo a editar}
    const [importMsg, setImportMsg] = useState('');
    const [swipedId, setSwipedId] = useState(null);
    const [confirmarEliminarRow, setConfirmarEliminarRow] = useState(null);
    const fileInputRef = useRef(null);
    const platSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });

    const cargar = async () => {
        if (!bloqueId) { setLoading(false); return; }
        setLoading(true);
        setFromCache(false);
        try {
            const { data } = await api.get(`/nominativos?bloque=${bloqueId}`);
            setNominativos(data.nominativos);
            data.nominativos.forEach(n => cacheNominativo(n).catch(() => {}));
            await touchCatalogMeta('nominativos');
        } catch {
            try {
                const cached = await getNominativosCache(bloqueId);
                setNominativos(cached);
                setFromCache(cached.length > 0);
                const meta = await getCatalogMeta('nominativos');
                setCachedAt(meta?.cachedAt || null);
            } catch { /* se queda en lista vacía */ }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, [bloqueId]);

    const sq = search.trim().toLowerCase();
    const filtrados = nominativos.filter(n =>
        !sq || n.nombre.toLowerCase().includes(sq) || n.codigo.toLowerCase().includes(sq)
    );

    const handleCopiar = codigo => {
        navigator.clipboard?.writeText(codigo);
    };

    const handleGuardado = nominativo => {
        cacheNominativo(nominativo).catch(() => {});
        setNominativos(prev => {
            const idx = prev.findIndex(n => n._id === nominativo._id);
            if (idx >= 0) { const next = [...prev]; next[idx] = nominativo; return next; }
            return [...prev, nominativo];
        });
        setForm(null);
    };

    const handleEliminado = id => {
        deleteCachedNominativo(id).catch(() => {});
        setNominativos(prev => prev.filter(n => n._id !== id));
        setForm(null);
    };

    const nomToText = n => `NOMBRE: ${n.nombre}\nNOMINATIVO: ${n.codigo}`;
    const handleCompartir = n => handleShareText(nomToText(n));

    const handleEliminarRapido = async id => {
        try {
            await api.delete(`/nominativos/${id}`);
            handleEliminado(id);
        } catch { /* sin conexión: no se puede borrar ahora */ }
        setConfirmarEliminarRow(null);
    };

    const mapHeaderNominativo = h => {
        const n = (h || '').toString().trim().toLowerCase();
        if (n.includes('secci')) return 'seccion';
        if (n.includes('nombre') || n.includes('puesto')) return 'nombre';
        if (n.includes('nominat') || n.includes('cod')) return 'codigo';
        return null;
    };

    const handleImportFile = e => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        setImportMsg('Importando...');
        const reader = new FileReader();
        reader.onload = async evt => {
            try {
                const XLSX = await import('xlsx');
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                if (rows.length < 2) { setImportMsg('El archivo está vacío o no tiene datos'); return; }
                const hMap = rows[0].map(mapHeaderNominativo);
                const items = rows.slice(1)
                    .filter(r => r.some(v => String(v).trim()))
                    .map(r => {
                        const obj = {};
                        hMap.forEach((f, i) => { if (f) obj[f] = String(r[i] || '').trim(); });
                        return obj;
                    })
                    .map(o => ({ ...o, seccion: /locaci/i.test(o.seccion || '') ? 'locacion' : 'puesto' }))
                    .filter(o => o.nombre && o.codigo);
                if (!items.length) { setImportMsg('No se encontraron filas válidas. Asegúrate de que el encabezado incluya NOMBRE y NOMINATIVO.'); return; }
                const { data } = await api.post('/nominativos/bulk', { bloque: bloqueId, items });
                setImportMsg(`Importado: ${data.created} nuevo${data.created !== 1 ? 's' : ''}, ${data.updated} actualizado${data.updated !== 1 ? 's' : ''}`);
                cargar();
            } catch (err) {
                setImportMsg(err.response?.data?.message || 'No se pudo importar el archivo. Verifica que sea CSV o Excel válido.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleExportar = async () => {
        const XLSX = await import('xlsx');
        const cols = ['SECCIÓN', 'NOMBRE', 'NOMINATIVO'];
        const rows = nominativos.map(n => [n.seccion === 'locacion' ? 'Locaciones' : 'Personal y Puestos', n.nombre, n.codigo]);
        const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Nominativos');
        XLSX.writeFile(wb, `nominativos_bloque_${bloqueId}.xlsx`);
    };

    if (!bloqueId || !bloqueInfo) {
        return <p className="ws-empty">No hay un bloque activo en este turno.</p>;
    }

    return (
        <div className="plat-galeria">
            <div className="plat-galeria-header">
                <div className="plat-galeria-titulo">Plataformas y Nominativos</div>
            </div>

            {fromCache && <CacheFreshnessBadge cachedAt={cachedAt} onRefresh={cargar} />}

            <div className="plat-bloque-card">
                <div className="plat-bloque-header-row">
                    <div>
                        <div className="plat-bloque-nombre">Bloque {bloqueId} – {bloqueInfo.sitio || bloqueInfo.codigo}</div>
                        <div className="plat-bloque-meta">
                            <span className="plat-count-pill">{nominativos.length} nominativo{nominativos.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div className="plat-bloque-tools">
                        <div className="plat-menu-wrap">
                            <button type="button" className="plat-icon-btn" onClick={() => setMenuAbierto(o => !o)} title="Más opciones">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                            </button>
                            {menuAbierto && (
                                <>
                                    <div className="plat-menu-backdrop" onClick={() => setMenuAbierto(false)} />
                                    <div className="plat-menu-dropdown">
                                        <button type="button" onClick={() => { setForm('nueva'); setMenuAbierto(false); }}>+ Nuevo</button>
                                        <button type="button" onClick={() => { handleExportar(); setMenuAbierto(false); }}>Exportar Excel</button>
                                        <button type="button" onClick={() => { fileInputRef.current?.click(); setMenuAbierto(false); }}>Importar Excel</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImportFile} />
            </div>
            {importMsg && <p className="plat-import-msg">{importMsg}</p>}

            {!loading && nominativos.length > 0 && (
                <div className="plat-vista-toolbar">
                    <span className="plat-vista-label">Vista</span>
                    <div className="firma-view-toggle">
                        <button type="button" className={vistaGrid ? 'active' : ''} onClick={() => setVistaGrid(true)} title="Vista cuadrícula">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/></svg>
                        </button>
                        <button type="button" className={!vistaGrid ? 'active' : ''} onClick={() => setVistaGrid(false)} title="Vista lista">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <p className="ws-empty">Cargando...</p>
            ) : (
                SECCIONES_NOMINATIVO.map(s => {
                    const items = filtrados.filter(n => n.seccion === s.id);
                    const abierta = seccionesAbiertas[s.id];
                    return (
                        <div className="plat-seccion" key={s.id}>
                            <button type="button" className="plat-seccion-header" onClick={() => setSeccionesAbiertas(prev => ({ ...prev, [s.id]: !prev[s.id] }))}>
                                <span className="plat-seccion-icon">{s.icon}</span>
                                <span className="plat-seccion-titulo">{s.label}</span>
                                <span className="plat-seccion-count">{items.length}</span>
                                <svg className={`plat-chevron${abierta ? ' open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            {abierta && (
                                items.length === 0 ? (
                                    <p className="ws-empty ws-empty-junto">Sin nominativos{search ? ' para la búsqueda' : ''}</p>
                                ) : (
                                    <div className={vistaGrid ? 'plat-locacion-grid' : 'plat-lista'}>
                                        {items.map(n => (
                                            <NominativoRow
                                                key={n._id}
                                                n={n}
                                                onCopiar={handleCopiar}
                                                onEditar={setForm}
                                                onEliminar={setConfirmarEliminarRow}
                                                onCompartir={handleCompartir}
                                                swiped={swipedId === n._id}
                                                onSwipe={setSwipedId}
                                                swipeRef={platSwipeRef}
                                            />
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    );
                })
            )}

            {form && (
                <NominativoForm
                    bloque={bloqueId}
                    bloqueInfo={bloqueInfo}
                    editando={form === 'nueva' ? null : form}
                    nominativos={nominativos}
                    onCancelar={() => setForm(null)}
                    onGuardado={handleGuardado}
                    onEliminado={handleEliminado}
                />
            )}

            {confirmarEliminarRow && (
                <ModalConfirm
                    mensaje={`"${confirmarEliminarRow.nombre}" (${confirmarEliminarRow.codigo}) dejará de estar disponible en el bloque. Esta acción no se puede deshacer.`}
                    onConfirm={() => handleEliminarRapido(confirmarEliminarRow._id)}
                    onCancel={() => setConfirmarEliminarRow(null)}
                />
            )}
        </div>
    );
};
