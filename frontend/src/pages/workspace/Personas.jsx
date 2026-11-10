import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
    cachePersona,
    getCatalogMeta,
    getOperacionesPendientes,
    descartarOperacion,
    actualizarOperacion,
} from '../../lib/syncEngine.js';
import {
    encolarCambioPersona,
    idsPersonasPendientes,
    leerPersonasLocales,
    nuevoIdPersona,
    refrescarPersonas,
} from '../../lib/personasOffline.js';
import { CacheFreshnessBadge, ModalField, PendienteBadge } from './comunes';
import { EMPTY_PERSONA, addMouseSwipe, handleCopyText, handleShareText, pToText } from './helpers';
import { IconCopy, IconMinus, IconPencil, IconQR, IconShare } from './iconos';
import { Sk, SkeletonTabla } from '../../components/Skeleton';

const TITULOS_PERSONAS = ['CÉDULA', 'NOMBRE', 'EMPRESA', 'CARGO', 'DEPTO', 'NOM.'];

// ── Modal detalle Persona ─────────────────────────────────
const ModalDetallePersona = ({ persona: p, onClose, onEdit, onDelete, onQR, onToggleAutorizado }) => {
    const { isAdmin } = useAuth();
    const [togglingAuth, setTogglingAuth] = useState(false);
    const initials = (p.nombres || '')
        .split(' ').filter(Boolean).slice(0, 2)
        .map(w => w[0].toUpperCase()).join('');

    const handleToggleAuth = async () => {
        if (!onToggleAutorizado || togglingAuth) return;
        setTogglingAuth(true);
        try { await onToggleAutorizado(p._id, !p.autorizadoFirma); } catch { } finally { setTogglingAuth(false); }
    };

    const fields = [
        { label: 'Empresa',      value: p.empresa },
        { label: 'Cargo',        value: p.cargo },
        { label: 'Departamento', value: p.departamento },
        { label: 'Nominativo',   value: p.nominativo },
    ].filter(f => f.value);

    const S = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';

    return (
        <div className="modal__overlay" onClick={onClose}>
            <div className="ficha__det detalle__arriba-movil" onClick={e => e.stopPropagation()}>
                {/* Barra superior: badge + botón cerrar */}
                <div className="ficha__det-top">
                    <div className="ficha__det-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                        </svg>
                        PERSONA
                    </div>
                    <button className="ficha__det-cerrar" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6 6 18" /><path d="M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Avatar + nombre + cédula */}
                <div className="ficha__det-cabecera">
                    <div className="ficha__det-avatar">{initials || '?'}</div>
                    <div className="ficha__det-identidad">
                        <div className="ficha__det-nombre ficha__det-nombre--grande">{p.nombres}</div>
                        <div className="ficha__det-sub ficha__det-cedula">{p.cedula}</div>
                    </div>
                </div>

                {/* Autorización para registrar firma — solo el admin puede cambiarla */}
                <div className="ficha__det-seccion">
                    <button
                        onClick={isAdmin ? handleToggleAuth : undefined}
                        disabled={!isAdmin || togglingAuth}
                        className={[
                            'ficha__det-auth',
                            p.autorizadoFirma && 'ficha__det-auth--activa',
                            isAdmin && 'ficha__det-auth--editable',
                            togglingAuth && 'ficha__det-auth--cargando',
                        ].filter(Boolean).join(' ')}
                    >
                        <span className="ficha__det-auth-texto">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            {p.autorizadoFirma ? 'Autorizada para registrar firma' : 'No autorizada para registrar firma'}
                        </span>
                        {isAdmin && (
                            <span className="ficha__det-switch"><span className="ficha__det-switch-bola" /></span>
                        )}
                    </button>
                </div>

                {/* Campos */}
                <div className="ficha__det-campos">
                    {fields.length > 0 ? fields.map(f => (
                        <div key={f.label} className="ficha__det-campo">
                            <span className="ficha__det-campo-label">{f.label}</span>
                            <span className="ficha__det-campo-valor">{f.value}</span>
                        </div>
                    )) : (
                        <div className="ficha__det-vacio">Sin datos adicionales</div>
                    )}
                </div>

                {/* Acciones */}
                <div className="ficha__det-acciones">
                    {onEdit && (
                        <button title="Editar" className="ficha__det-accion" onClick={() => { onEdit(p); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M12 20h9" ${S}/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" ${S}/>` }} />
                        </button>
                    )}
                    <button title="Copiar" className="ficha__det-accion" onClick={() => handleCopyText(pToText(p))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<rect x="9" y="9" width="12" height="12" rx="2" ${S}/><path d="M5 15V5a2 2 0 0 1 2-2h10" ${S}/>` }} />
                    </button>
                    <button title="Compartir" className="ficha__det-accion" onClick={() => handleShareText(pToText(p))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" ${S}/><path d="M16 6l-4-4-4 4" ${S}/><path d="M12 2v14" ${S}/>` }} />
                    </button>
                    {onQR && (
                        <button title="Ver QR" className="ficha__det-accion" onClick={() => { onQR(p); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<rect x="3" y="3" width="7" height="7" ${S}/><rect x="14" y="3" width="7" height="7" ${S}/><rect x="14" y="14" width="7" height="7" ${S}/><rect x="3" y="14" width="7" height="7" ${S}/>` }} />
                        </button>
                    )}
                    {onDelete && (
                        <button title="Eliminar" className="ficha__det-accion ficha__det-accion--peligro" onClick={() => { onDelete(p._id); onClose(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: `<path d="M5 12h14" ${S}/>` }} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ModalPersona = ({ onClose, onGuardado, editData, personas }) => {
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

    // Guardado al instante, con o sin internet: el cambio queda en el dispositivo
    // y se sube cuando haya conexión (lib/personasOffline.js).
    const handleSubmit = async () => {
        const cedula = form.cedula.trim();
        if (!cedula || !form.nombres.trim()) { setError('Cédula y nombres son obligatorios'); return; }
        if (loading) return;
        if (!editData && personas.some(p => (p.cedula || '').trim() === cedula)) {
            setError('Esa cédula ya está registrada');
            return;
        }
        setLoading(true);
        try {
            if (editData?._operacion) {
                // Registrada desde un movimiento sin conexión y aún sin subir: se corrige en su cola
                await actualizarOperacion(editData._id, { ...form, cedula: editData.cedula });
            } else if (editData?._id) {
                // El servidor no cambia la cédula al editar: se conserva la original
                const { _pendiente, ...actual } = editData;
                await encolarCambioPersona({ tipo: 'editar', doc: { ...actual, ...form, cedula: editData.cedula } });
            } else {
                await encolarCambioPersona({ tipo: 'crear', doc: { ...form, cedula, _id: nuevoIdPersona() } });
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
                    <h3>{editData ? 'Editar persona' : 'Nueva persona'}</h3>
                    <button className="modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="modal__fields">
                    <div className="modal__fields-row">
                        <ModalField name="cedula" label="CÉDULA *" placeholder="1234567890" value={form.cedula} {...fp} />
                        <ModalField name="nominativo" label="NOMINATIVO" placeholder="VENUS, ECO 43..." value={form.nominativo} {...fp} />
                    </div>
                    <ModalField name="nombres" label="NOMBRES *" placeholder="Apellidos y nombres completos" value={form.nombres} {...fp} />
                    <div className="modal__fields-row">
                        <ModalField name="empresa" label="EMPRESA" placeholder="EP Petroecuador" value={form.empresa} {...fp} />
                        <ModalField name="departamento" label="DEPARTAMENTO" placeholder="OPR, SFI..." value={form.departamento} {...fp} />
                    </div>
                    <ModalField name="cargo" label="CARGO" placeholder="Jefe de Campo..." value={form.cargo} {...fp} />
                </div>
                {error && <p className="modal__error">{error}</p>}
                <button className={`modal__btn${form.cedula && form.nombres ? ' modal__btn--active' : ''}`} onClick={handleSubmit} disabled={loading}>
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
        <div className="modal__overlay" onClick={onClose}>
            <div className="modal__card" onClick={e => e.stopPropagation()}>
                <div className="modal__header">
                    <h3>Importar personas</h3>
                    <button className="modal__close" onClick={onClose}>✕</button>
                </div>
                <p className="import__ayuda">
                    Sube un archivo <strong>CSV</strong> o <strong>Excel (.xlsx)</strong>.<br />
                    Encabezados reconocidos: <span className="import__encabezados">CÉDULA, NOMBRES, EMPRESA, CARGO, DEPARTAMENTO, NOMINATIVO</span>
                </p>

                <label className="import__dropzone">
                    <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} hidden />
                    {fileName ? (
                        <div className="import__archivo">
                            <div className="import__archivo-icono">📄</div>
                            <div className="import__archivo-nombre">{fileName}</div>
                            {parsedRows.length > 0
                                ? <div className="import__archivo-ok">{parsedRows.length} registros detectados</div>
                                : <div className="import__archivo-error">Sin registros válidos</div>
                            }
                        </div>
                    ) : (
                        <div className="import__vacio">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="import__vacio-icono">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 15V5" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div>Toca para seleccionar CSV o Excel</div>
                        </div>
                    )}
                </label>

                {parsedRows.length > 0 && (
                    <div className="import__preview">
                        {parsedRows.slice(0, 6).map((p, i) => (
                            <div key={i} className="import__preview-fila">
                                <span className="import__preview-clave">{p.cedula}</span>
                                <span className="import__preview-detalle">{p.nombres}</span>
                            </div>
                        ))}
                        {parsedRows.length > 6 && <div className="import__preview-mas">+{parsedRows.length - 6} más...</div>}
                    </div>
                )}

                {error && <p className="modal__error">{error}</p>}
                <button className={`modal__btn${parsedRows.length > 0 ? ' modal__btn--active' : ''}`}
                    onClick={handleImport} disabled={!parsedRows.length || loading}>
                    {loading ? 'Importando...' : parsedRows.length > 0 ? `Importar ${parsedRows.length} registros` : 'Selecciona un archivo primero'}
                </button>
            </div>
        </div>
    );

    // ── Pantalla conflictos ──
    if (step === 'conflicts') return (
        <div className="modal__overlay" onClick={onClose}>
            <div className="modal__card" onClick={e => e.stopPropagation()}>
                <div className="modal__header">
                    <h3>{result.conflicts.length} conflicto{result.conflicts.length !== 1 ? 's' : ''}</h3>
                    <button className="modal__close" onClick={onClose}>✕</button>
                </div>
                <p className="import__conflictos-intro">
                    <strong>{result.created} nuevos</strong> importados. Las cédulas siguientes ya existen — elige qué conservar:
                </p>
                <div className="import__conflictos">
                    {result.conflicts.map(c => (
                        <div key={c.existing.cedula} className="import__conflicto">
                            <div className="import__conflicto-clave">{c.existing.cedula}</div>
                            <div className="import__conflicto-comparar">
                                <div className="import__version">
                                    <div className="import__version-titulo">ACTUAL</div>
                                    <div className="import__version-principal">{c.existing.nombres}</div>
                                    <div className="import__version-detalle">{c.existing.empresa || '—'}</div>
                                    {c.existing.cargo && <div className="import__version-extra">{c.existing.cargo}</div>}
                                </div>
                                <div className="import__version">
                                    <div className="import__version-titulo">NUEVO</div>
                                    <div className="import__version-principal">{c.incoming.nombres}</div>
                                    <div className="import__version-detalle">{c.incoming.empresa || '—'}</div>
                                    {c.incoming.cargo && <div className="import__version-extra">{c.incoming.cargo}</div>}
                                </div>
                            </div>
                            <div className="import__opciones">
                                {[['keep', 'Mantener actual'], ['update', 'Usar nuevo']].map(([val, label]) => (
                                    <button key={val}
                                        onClick={() => setChoices(ch => ({ ...ch, [c.existing.cedula]: val }))}
                                        className={`import__opcion import__opcion--${val}${choices[c.existing.cedula] === val ? ' import__opcion--elegida' : ''}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {error && <p className="modal__error">{error}</p>}
                <button className="modal__btn modal__btn--active" onClick={handleResolve} disabled={loading}>
                    {loading ? 'Aplicando...' : 'Aplicar selección'}
                </button>
            </div>
        </div>
    );

    // ── Pantalla éxito ──
    return (
        <div className="modal__overlay" onClick={onClose}>
            <div className="modal__card import__exito" onClick={e => e.stopPropagation()}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#4ade80" strokeWidth="2" />
                    <path d="M8 12l3 3 5-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="import__exito-titulo">Importación exitosa</div>
                <div className="import__exito-texto">
                    {result.created} registro{result.created !== 1 ? 's' : ''} nuevos importados
                    {result.conflicts.length > 0 && ` · ${result.conflicts.length} conflicto${result.conflicts.length !== 1 ? 's' : ''} resuelto${result.conflicts.length !== 1 ? 's' : ''}`}
                </div>
                <button className="modal__btn modal__btn--active modal__btn--import-exito" onClick={onClose}>Listo</button>
            </div>
        </div>
    );
};

// ── Pantalla Personas ──────────────────────────────────────
export const PantallaPersonas = () => {
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromCache, setFromCache] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editPersona, setEditPersona] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [qrPersona, setQrPersona] = useState(null);
    const [swipedPersonaId, setSwipedPersonaId] = useState(null);
    const personaSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false, didDrag: false });
    const [detailPersona, setDetailPersona] = useState(null);

    // Lo que se ve es siempre la copia del dispositivo: la última lista del servidor
    // más los cambios que todavía no se suben. Además, las personas registradas sin
    // conexión desde un movimiento, que esperan en la cola de operaciones.
    const mostrarLocales = async () => {
        const [locales, pendientes, desdeMovimientos] = await Promise.all([
            leerPersonasLocales().catch(() => []),
            idsPersonasPendientes().catch(() => new Set()),
            getOperacionesPendientes('persona').catch(() => []),
        ]);
        const enCola = desdeMovimientos.map(op => ({ ...op.payload, _id: op.uuid, _pendiente: true, _operacion: true, _error: op.error }));
        const cedulasEnCola = new Set(enCola.map(p => p.cedula));
        const lista = [
            ...enCola,
            ...locales
                .filter(p => p._id && !cedulasEnCola.has(p.cedula))
                .map(p => (pendientes.has(p._id) ? { ...p, _pendiente: true } : p)),
        ];
        setPersonas(lista);
        return lista;
    };

    const cargar = async () => {
        // Primero lo local, para no esperar a la red
        const locales = await mostrarLocales();
        if (locales.length) setLoading(false);
        try {
            await refrescarPersonas();
            await mostrarLocales();
            setFromCache(false);
        } catch {
            // Sin conexión: se sigue con la copia local
            setFromCache(locales.length > 0);
            const meta = await getCatalogMeta('personas').catch(() => null);
            setCachedAt(meta?.cachedAt || null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    // Tras subir una cola (aquí o desde otra pantalla) la copia local ya trae los IDs del servidor
    useEffect(() => {
        const onOperacion = e => { if (e.detail?.tipo === 'persona') mostrarLocales(); };
        const onPersonas = () => { mostrarLocales(); };
        window.addEventListener('flujo:operaciones', onOperacion);
        window.addEventListener('flujo:personas', onPersonas);
        return () => {
            window.removeEventListener('flujo:operaciones', onOperacion);
            window.removeEventListener('flujo:personas', onPersonas);
        };
    }, []);

    const sq = search.toLowerCase();
    const filtrados = sq
        ? personas.filter(p =>
            (p.nombres || '').toLowerCase().includes(sq) ||
            (p.empresa || '').toLowerCase().includes(sq) ||
            (p.cedula || '').includes(sq) ||
            (p.departamento || '').toLowerCase().includes(sq))
        : personas;

    // Eliminación al instante; queda en cola hasta que el servidor la confirme
    const handleDelete = async p => {
        if (!p) return;
        setPersonas(prev => prev.filter(x => x._id !== p._id));
        if (p._operacion) await descartarOperacion(p._id).catch(() => {});
        else await encolarCambioPersona({ tipo: 'borrar', id: p._id, clave: p.cedula }).catch(() => {});
    };

    const pQrData = p => [
        `CEDULA: ${p.cedula}`,
        p.nombres ? `NOMBRES: ${p.nombres}` : '',
        p.empresa ? `EMPRESA: ${p.empresa}` : '',
        p.departamento ? `DEPT: ${p.departamento}` : '',
        p.nominativo ? `NOM: ${p.nominativo}` : '',
    ].filter(Boolean).join('\n');

    return (
        <div className="lista">

            {/* Barra búsqueda */}
            <div className="lista__barra">
                <div className="ws__search-bar ws__search-bar--lista">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws__search-lupa">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws__search-input" type="text"
                        placeholder="Filtrar por nombre, cédula o departamento..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="ws__search-clear" onClick={() => setSearch('')}>✕</button>}
                </div>
                <button className="ws__topbar-btn" title="Importar CSV / Excel" onClick={() => setShowImport(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 15V5"
                            stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <span className="lista__total">
                    {loading ? <Sk forma="chip" /> : `${filtrados.length} reg.`}
                </span>
            </div>

            {/* Aviso de datos cargados desde caché offline */}
            {fromCache && <CacheFreshnessBadge cachedAt={cachedAt} onRefresh={cargar} />}

            {/* Tabla de personas */}
            {loading
                ? <SkeletonTabla columnas="ftable__cols-personas" titulos={TITULOS_PERSONAS} />
                : filtrados.length === 0
                    ? <p className="ws__empty">{search ? `Sin resultados para "${search}"` : 'No hay personas registradas'}</p>
                    : (
                        <div className="ftable__scroll">
                            {/* Encabezado fijo — mismo template que las filas para alineación perfecta */}
                            <div className="ftable__head ftable__cols-personas">
                                {TITULOS_PERSONAS.map(h => (
                                    <span key={h} className="ftable__head-cell">{h}</span>
                                ))}
                            </div>
                            <div className="ftable">
                                {filtrados.map(p => {
                                    const isSwiped = swipedPersonaId === p._id;
                                    return (
                                        <div key={p._id} className="ftable__row-wrap">
                                            <div className="ftable__actions" onClick={ev => ev.stopPropagation()}>
                                                <button className="plist__act-btn" title="Editar"    onClick={() => { setEditPersona(p); setSwipedPersonaId(null); }}><IconPencil /></button>
                                                <button className="plist__act-btn" title="Copiar"    onClick={() => { handleCopyText(pToText(p)); setSwipedPersonaId(null); }}><IconCopy /></button>
                                                <button className="plist__act-btn" title="Compartir" onClick={() => { handleShareText(pToText(p)); setSwipedPersonaId(null); }}><IconShare /></button>
                                                <button className="plist__act-btn" title="Ver QR"    onClick={() => { setQrPersona(p); setSwipedPersonaId(null); }}><IconQR /></button>
                                                <button className="plist__act-btn plist__act-btn--danger" title="Eliminar" onClick={() => { handleDelete(p); setSwipedPersonaId(null); }}><IconMinus /></button>
                                            </div>
                                            <div
                                                className={`ftable__row ftable__cols-personas${isSwiped ? ' ftable__swiped-5' : ''}`}
                                                
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
                                                <span className="ftable__cell ftable__cell--accent">{p.cedula || '—'}</span>
                                                <span className="ftable__cell ftable__cell--bold">
                                                    {(p.nombres || '—').toUpperCase()}
                                                    {p.autorizadoFirma && <span className="persona-autorizada" title="Autorizada para registrar firma">●</span>}
                                                    {p._pendiente && <PendienteBadge error={p._error} onDescartar={() => descartarOperacion(p._id)} />}
                                                </span>
                                                <span className="ftable__cell">{(p.empresa || '—').toUpperCase()}</span>
                                                <span className="ftable__cell ftable__cell--dim">{p.cargo || '—'}</span>
                                                <span className="ftable__cell ftable__cell--dim">{(p.departamento || '—').toUpperCase()}</span>
                                                <span className={`ftable__cell ftable__cell--dim${p.nominativo ? ' ftable__cell--nominativo' : ''}`}>{p.nominativo || '—'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
            }

            <button className="placas__fab" onClick={() => setShowForm(true)}>+</button>

            {(showForm || editPersona) && (
                <ModalPersona
                    onClose={() => { setShowForm(false); setEditPersona(null); }}
                    onGuardado={mostrarLocales}
                    editData={editPersona}
                    personas={personas}
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
                    onDelete={() => { handleDelete(detailPersona); setDetailPersona(null); }}
                    onQR={per => { setQrPersona(per); setDetailPersona(null); }}
                    onToggleAutorizado={async (id, autorizado) => {
                        const { data } = await api.put(`/personas/${id}/autorizar`, { autorizado });
                        setDetailPersona(data.persona);
                        setPersonas(prev => prev.map(per => per._id === id ? data.persona : per));
                        cachePersona(data.persona).catch(() => {});
                    }}
                />
            )}
            {qrPersona && (
                <div className="modal__overlay" onClick={() => setQrPersona(null)}>
                    <div className="modal__card modal__card--qr" onClick={e => e.stopPropagation()}>
                        <div className="modal__header modal__header--qr">
                            <h3>{qrPersona.cedula}</h3>
                            <button className="modal__close" onClick={() => setQrPersona(null)}>✕</button>
                        </div>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pQrData(qrPersona))}`}
                            alt="QR" className="qr__modal-img"
                        />
                        <p className="qr__modal-datos">
                            {pQrData(qrPersona).split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
