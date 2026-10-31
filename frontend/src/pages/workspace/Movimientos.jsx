import { useState, useRef } from 'react';
import api from '../../api/axios';
import { buscarPersonaLocal, registrarPersona } from '../../lib/syncEngine.js';
import { ModalField } from './comunes';
import { CFG_DEFAULTS, addMouseSwipe, getHoraLocal } from './helpers';
import { IconCopy, IconMinus, IconPencil, IconShare } from './iconos';

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
