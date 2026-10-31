import { useState, useEffect, useRef, useMemo } from 'react';
import { BLOQUES_DATA } from '../../data/bloques.js';
import api from '../../api/axios';
import { ModalBitacoraDetalle, ModalDetalle } from './Movimientos';
import { AccesoRestringido, ModalConfirm } from './comunes';
import {
    LAST_TURNO_KEY,
    MESES_ES,
    addMouseSwipe,
    exportMovimientos,
    movCoincideBusqueda,
    movToText,
} from './helpers';
import { IconArrowLeft, IconChevronRight, IconCopy, IconMinus, IconMoon, IconShare, IconSun } from './iconos';

// ── Pantalla detalle de un flujo ──────────────────────────
const PantallaFlujoDetalle = ({ fecha, movs, onBack }) => {
    const [search, setSearch] = useState('');
    const [showExport, setShowExport] = useState(false);
    const [vista, setVista] = useState('movimientos');
    const [detailIdx, setDetailIdx] = useState(null);
    const [bitDetailIdx, setBitDetailIdx] = useState(null);
    const [sortDesc, setSortDesc] = useState(true);
    const [swipedBitIdx, setSwipedBitIdx] = useState(null);
    const [editIngresoBit, setEditIngresoBit] = useState(null);
    const bitSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });
    const [expandedMovSet, setExpandedMovSet] = useState(new Set());
    const toggleMovCollapse = i => setExpandedMovSet(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
    const [expandedBitFlujoSet, setExpandedBitFlujoSet] = useState(new Set());
    const toggleBitFlujoCollapse = i => setExpandedBitFlujoSet(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

    const bitacora = useMemo(() => {
        const sorted = [...movs].sort((a, b) => (a.hora || '').localeCompare(b.hora || '') || (a._id || '').localeCompare(b._id || ''));
        const openSalidas = {};
        const pairs = [];
        for (const mov of sorted) {
            if (mov.tipo === 'salida') {
                if (!openSalidas[mov.placa]) openSalidas[mov.placa] = [];
                openSalidas[mov.placa].push(mov);
            } else if (mov.tipo === 'ingreso') {
                if (openSalidas[mov.placa]?.length > 0) {
                    const sal = openSalidas[mov.placa].shift();
                    const condSal = (sal.conductor || '').trim();
                    const condIng = (mov.conductor || '').trim();
                    pairs.push({
                        placa: mov.placa, salida: sal, ingreso: mov,
                        horaS: sal.hora, horaI: mov.hora,
                        conductor: condSal.toLowerCase() === condIng.toLowerCase()
                            ? (condSal || '—')
                            : `${condSal || '—'} / ${condIng || '—'}`,
                        conductorChanged: condSal.toLowerCase() !== condIng.toLowerCase(),
                        marca: sal.marca || mov.marca, empresa: sal.empresa || mov.empresa,
                        tipoVehiculo: sal.tipoVehiculo || mov.tipoVehiculo,
                        destino: sal.destino || mov.destino, status: 'completo',
                    });
                } else {
                    pairs.push({
                        placa: mov.placa, salida: null, ingreso: mov,
                        horaS: '—', horaI: mov.hora,
                        conductor: mov.conductor || '—', conductorChanged: false,
                        marca: mov.marca, empresa: mov.empresa,
                        tipoVehiculo: mov.tipoVehiculo, destino: mov.destino, status: 'solo-ingreso',
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
                    tipoVehiculo: s.tipoVehiculo, destino: s.destino, status: 'en-campo',
                });
            }
        }
        // Ordenar por el primer evento registrado (mínimo entre horaS y horaI)
        const firstHora = p => {
            const times = [p.horaS, p.horaI].filter(h => h && h !== '—');
            return times.length ? times.slice().sort()[0] : '99:99';
        };
        return pairs.sort((a, b) => firstHora(a).localeCompare(firstHora(b)));
    }, [movs]);

    const bitPlacaCounts = useMemo(() => {
        const c = {};
        bitacora.forEach(b => { c[b.placa] = (c[b.placa] || 0) + 1; });
        return c;
    }, [bitacora]);

    const handleShareFlujo = async () => {
        const fl = new Date(fecha + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const text = `FLUJO — ${fl}\nTotal: ${movs.length} movimiento${movs.length !== 1 ? 's' : ''}\n\n` +
            movs.map((m, i) => `${i + 1}. [${(m.tipo || 'MOV').toUpperCase()}] ${m.placa}\n   ${m.conductor || '—'} · ${m.empresa || '—'}\n   → ${m.destino || '—'}  ${m.hora}`).join('\n\n');
        if (navigator.share) { await navigator.share({ title: 'FLUJO — ' + fecha, text }).catch(() => {}); }
        else { navigator.clipboard?.writeText(text); }
    };

    const sq = search.trim().toLowerCase();
    const filtrados = sq ? movs.filter(m => movCoincideBusqueda(m, sq)) : movs;
    const movsOrdered = sortDesc ? [...filtrados].reverse() : [...filtrados];

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

    const doExport = async fmt => {
        setShowExport(false);
        if (vista === 'bitacora' || fmt === 'bitacora') {
            const XLSX = await import('xlsx');
            const cols = ['#', 'Placa', 'Tipo Vehículo', 'Marca', 'Empresa', 'Hora Salida', 'Hora Ingreso', 'Conductor', 'Destino', 'Estado'];
            const estadoLabel = { completo: 'Completado', 'en-campo': 'En campo', 'solo-ingreso': 'Solo ingreso' };
            const rows = bitacora.map((b, i) => [i + 1, b.placa, b.tipoVehiculo || '—', b.marca || '—', b.empresa || '—', b.horaS, b.horaI, b.conductor, b.destino || '—', estadoLabel[b.status] || b.status]);
            const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
            ws['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 13 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Bitácora');
            XLSX.writeFile(wb, `bitacora_${fecha}.xlsx`);
        } else {
            exportMovimientos(movs, fmt, `flujo_${fecha}`);
        }
    };

    const detailMov = detailIdx !== null ? movsOrdered[detailIdx] : null;

    return (
        <div className="flujodia">
            {/* Cabecera */}
            <div className="flujodia-header">
                <button className="ws-topbar-btn flujodia-volver" onClick={onBack}><IconArrowLeft /></button>
                <div className="flujodia-titulo">
                    <div className="flujodia-fecha">{fechaLarga}</div>
                    <div className="flujodia-resumen">{movs.length} mov. · {bitacora.length} en bitácora</div>
                </div>
                <button className="ws-topbar-btn flujodia-compartir" onClick={handleShareFlujo} title="Compartir">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="6" cy="12" r="2.2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="17" cy="6" r="2.2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="17" cy="18" r="2.2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 11l7-3.5M8 13l7 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                </button>
                <button className="ws-topbar-btn flujodia-exportar" onClick={() => setShowExport(s => !s)} title="Exportar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Menú exportar */}
            {showExport && (
                <div className="flujodia-export-menu">
                    {vista === 'movimientos' ? (<>
                        <div className="export-menu-item" onClick={() => doExport('xls')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#4ade80" strokeWidth="2" /><path d="M9 3v18M3 9h6M3 15h6" stroke="#4ade80" strokeWidth="2" /><path d="M12 8l3 4-3 4M15 12h6" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            Excel (.xls)
                        </div>
                        <div className="export-menu-item" onClick={() => doExport('csv')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#818cf8" strokeWidth="2" /><path d="M14 2v6h6M8 13h8M8 17h5" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" /></svg>
                            CSV (.csv)
                        </div>
                    </>) : (
                        <div className="export-menu-item" onClick={() => doExport('bitacora')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#4ade80" strokeWidth="2" /><path d="M9 3v18M3 9h6M3 15h6" stroke="#4ade80" strokeWidth="2" /></svg>
                            Exportar Bitácora (.xlsx)
                        </div>
                    )}
                </div>
            )}

            {/* Contadores */}
            <div className="flujodia-contadores">
                <div className="ws-counter-card">
                    <span className="ws-counter-val">{contratistas}</span>
                    <span className="ws-counter-label">CONTRATISTAS</span>
                </div>
                <div className="ws-counter-card">
                    <span className="ws-counter-val">{petroecuador}</span>
                    <span className="ws-counter-label">EP PETRO.</span>
                </div>
            </div>

            {/* Tabs Movimientos / Bitácora */}
            <div className="flujodia-tabs">
                <button className={`ws-vista-tab${vista === 'movimientos' ? ' active' : ''}`}
                    onClick={() => setVista('movimientos')}>
                    Movimientos
                </button>
                <button className={`ws-vista-tab${vista === 'bitacora' ? ' active' : ''}`}
                    onClick={() => setVista('bitacora')}>
                    Bitácora
                </button>
            </div>

            {/* Búsqueda + ordenamiento (solo movimientos) */}
            {vista === 'movimientos' && (
                <div className="flujodia-busqueda">
                    <div className="ws-search-bar flujodia-search-bar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flujodia-lupa">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input className="ws-search-input" type="text" placeholder="Buscar por placa, conductor, empresa, destino o actividad..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                        {search && <button className="ws-search-clear" onClick={() => setSearch('')}>✕</button>}
                    </div>
                    <button
                        onClick={() => setSortDesc(d => !d)}
                        title={sortDesc ? 'Más reciente primero' : 'Más antiguo primero'}
                        className="flujodia-orden"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            {sortDesc ? (
                                <>
                                    <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </>
                            ) : (
                                <>
                                    <path d="M3 18h18M7 12h10M11 6h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </>
                            )}
                        </svg>
                    </button>
                </div>
            )}

            {/* Lista de movimientos */}
            {vista === 'movimientos' && (
                <div className="flujodia-lista">
                    {movsOrdered.length === 0
                        ? <p className="ws-empty">{search ? `Sin resultados para "${search}"` : 'Sin movimientos'}</p>
                        : (() => {
                            const counts = {};
                            filtrados.forEach(m => { counts[m.placa] = (counts[m.placa] || 0) + 1; });
                            return movsOrdered.map((m, idx) => {
                                const isCollapsed = !expandedMovSet.has(idx);
                                return (
                                    <div key={m._id} className="mov-item">
                                        <div
                                            className={`mov-item-inner ${m.tipo}`}
                                            onClick={() => setDetailIdx(idx)}
                                        >
                                            <div className="mov-card-body">
                                                {/* Badge */}
                                                <div className={`mov-icon ${m.tipo}${isCollapsed ? ' mov-icon-sm' : ''}`}>
                                                    {!isCollapsed && <span className="mov-count">{counts[m.placa] || 1}</span>}
                                                    <span className="mov-hora-small">{m.hora}</span>
                                                </div>
                                                {/* Info */}
                                                <div className="mov-info">
                                                    {isCollapsed ? (
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
                                                <button className="mov-chevron-btn" onClick={e => { e.stopPropagation(); toggleMovCollapse(idx); }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                                         className={`chevron-giro${isCollapsed ? '' : ' abierto'}`}>
                                                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </button>
                                            </div>
                                            {!isCollapsed && m.actividad && !/^vac[ií]o$/i.test(m.actividad.trim()) && (
                                                <div className="mov-actividad">{m.actividad}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                </div>
            )}

            {/* Bitácora */}
            {vista === 'bitacora' && (
                <div className="ws-bitacora">
                    <div className="bit-toolbar">
                        <span className="bit-toolbar-count">{bitacora.length} registro{bitacora.length !== 1 ? 's' : ''}</span>
                    </div>
                    {bitacora.length === 0 ? (
                        <p className="ws-empty">Sin movimientos para consolidar</p>
                    ) : (
                        <div className="bit-list-wrap">
                            {bitacora.map((b, i) => {
                                const bText = [`Bitácora: ${b.placa}${b.tipoVehiculo ? ' · ' + b.tipoVehiculo : ''}`, `Conductor: ${b.conductor}`, b.destino && `Destino: ${b.destino}`, `Salida: ${b.horaS}  →  Ingreso: ${b.horaI}`].filter(Boolean).join('\n');
                                const isSwiped = swipedBitIdx === i;
                                const isCollapsed = !expandedBitFlujoSet.has(i);
                                return (
                                    <div key={i} className="bit-item">
                                        <div className="bit-actions" onClick={e => e.stopPropagation()}>
                                            <button className="bit-act-btn" title="Copiar" onClick={() => { navigator.clipboard?.writeText(bText); setSwipedBitIdx(null); }}><IconCopy /></button>
                                            <button className="bit-act-btn" title="Compartir" onClick={async () => { if (navigator.share) { await navigator.share({ title: 'Bitácora FLUJO', text: bText }).catch(() => {}); } else navigator.clipboard?.writeText(bText); setSwipedBitIdx(null); }}><IconShare /></button>
                                        </div>
                                        <div
                                            className={`bit-card bit-${b.status}${isSwiped ? ' bit-row-swiped' : ''}`}
                                            onTouchStart={e => { bitSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false }; }}
                                            onTouchMove={e => {
                                                const dx = e.touches[0].clientX - bitSwipeRef.current.startX;
                                                const dy = e.touches[0].clientY - bitSwipeRef.current.startY;
                                                if (!bitSwipeRef.current.moved && !bitSwipeRef.current.vertScroll) {
                                                    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                                    if (Math.abs(dy) > Math.abs(dx)) { bitSwipeRef.current.vertScroll = true; return; }
                                                    bitSwipeRef.current.moved = true;
                                                }
                                                if (bitSwipeRef.current.moved) e.preventDefault();
                                            }}
                                            onTouchEnd={e => {
                                                if (!bitSwipeRef.current.moved) return;
                                                const dx = e.changedTouches[0].clientX - bitSwipeRef.current.startX;
                                                if (isSwiped) { if (dx < -30) setSwipedBitIdx(null); }
                                                else { if (dx > 55) setSwipedBitIdx(i); }
                                            }}
                                            {...addMouseSwipe(bitSwipeRef, dx => {
                                                if (isSwiped) { if (dx < -30) setSwipedBitIdx(null); }
                                                else { if (dx > 55) setSwipedBitIdx(i); }
                                            })}
                                            onClick={() => { if (bitSwipeRef.current?.didDrag) { bitSwipeRef.current.didDrag = false; return; } if (isSwiped) { setSwipedBitIdx(null); return; } setBitDetailIdx(i); }}
                                        >
                                            {/* Fila 1: horas + placa | tipo vehículo + chevron */}
                                            <div className="bit-card-r1">
                                                <div className="bit-card-horas">
                                                    <span className="bit-card-hora-grp">
                                                        {!isCollapsed && <span className="bit-card-hora-lbl">INGRESO</span>}
                                                        <span className="bit-hora-i">{b.horaI || '—'}</span>
                                                    </span>
                                                    <span className="bit-card-sep"> — </span>
                                                    <span className="bit-card-hora-grp">
                                                        {!isCollapsed && <span className="bit-card-hora-lbl">SALIDA</span>}
                                                        <span className="bit-hora-s">{b.horaS || '—'}</span>
                                                    </span>
                                                    <span className="bit-card-sep"> · </span>
                                                    <span className="bit-card-placa">{b.placa}</span>
                                                </div>
                                                <div className="bit-card-r1-right">
                                                    {b.tipoVehiculo && <span className="bit-card-tipo">{b.tipoVehiculo.toUpperCase()}</span>}
                                                    <button className="bit-chevron-btn" onClick={e => { e.stopPropagation(); toggleBitFlujoCollapse(i); }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                                             className={`chevron-giro${isCollapsed ? '' : ' abierto'}`}>
                                                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Fila 2: conductor | destino — solo expandida */}
                                            {!isCollapsed && (
                                                <div className="bit-card-r2">
                                                    <span className={`bit-card-conductor${b.conductorChanged ? ' changed' : ''}`}>
                                                        {b.conductorChanged && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="icono-fijo"><path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                        {b.conductor || '—'}
                                                    </span>
                                                    {(b.destino || b.empresa) && (
                                                        <span className="bit-card-dest">{b.destino || b.empresa}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal detalle movimiento (solo lectura) */}
            {detailMov && (
                <ModalDetalle
                    mov={detailMov}
                    onClose={() => setDetailIdx(null)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onCopy={m => navigator.clipboard?.writeText(movToText(m))}
                    onShare={m => { if (navigator.share) navigator.share({ title: m.placa, text: movToText(m) }).catch(() => {}); else navigator.clipboard?.writeText(movToText(m)); }}
                    hasPrev={detailIdx > 0}
                    hasNext={detailIdx < movsOrdered.length - 1}
                    onPrev={() => setDetailIdx(i => i - 1)}
                    onNext={() => setDetailIdx(i => i + 1)}
                    counter={`${detailIdx + 1} / ${movsOrdered.length}`}
                />
            )}
            {/* Modal detalle bitácora (solo lectura) */}
            {bitDetailIdx !== null && (
                <ModalBitacoraDetalle
                    bitacora={bitacora}
                    idx={bitDetailIdx}
                    onClose={() => setBitDetailIdx(null)}
                    onChange={setBitDetailIdx}
                    onEditMov={() => {}}
                    onDeletePair={() => {}}
                />
            )}
        </div>
    );
};

// La barra de búsqueda de "General" vive en la barra superior de WorkspacePage
// (para quedarse fija al bajar, igual que la de Movimientos): por eso genQuery
// y genCampo llegan como props, y onBusquedaVisible avisa cuándo mostrarla.
export const PantallaFlujos = ({ turnoActivo, hasPermiso, isAdmin, genQuery, genCampo, setGenCampo, onBusquedaVisible }) => {
    const [vistaFlujos, setVistaFlujos] = useState('archivo');
    const [flujoSeleccionado, setFlujoSeleccionado] = useState(null);

    useEffect(() => {
        onBusquedaVisible(vistaFlujos === 'general' && !flujoSeleccionado);
    }, [vistaFlujos, flujoSeleccionado, onBusquedaVisible]);
    useEffect(() => () => onBusquedaVisible(false), [onBusquedaVisible]);
    const [confirmarFlujo, setConfirmarFlujo] = useState(null);
    const returnTabRef = useRef('archivo');

    // Navegación del archivo: año → mes → día. Cada nivel se pide al servidor
    // solo cuando se entra en él — nunca se descarga el histórico completo.
    const [anioSel, setAnioSel] = useState(null);
    const [mesSel, setMesSel] = useState(null);
    const [anios, setAnios] = useState([]);
    const [meses, setMeses] = useState([]);
    const [dias, setDias] = useState([]);
    const [diaMovs, setDiaMovs] = useState([]);
    const [loadingAnios, setLoadingAnios] = useState(true);
    const [loadingMeses, setLoadingMeses] = useState(false);
    const [loadingDias, setLoadingDias] = useState(false);
    const [loadingDia, setLoadingDia] = useState(false);

    const [genResultados, setGenResultados] = useState([]);
    const [genLoading, setGenLoading] = useState(false);

    // Navegación de "Puestos": galería de puestos del bloque (todos los usuarios)
    // → año → mes → día, con los mismos niveles que el Archivo personal.
    const puedeVerPuestos = isAdmin || (hasPermiso && hasPermiso('puestos'));
    const [puestoSel, setPuestoSel] = useState(null);
    const [anioSelP, setAnioSelP] = useState(null);
    const [mesSelP, setMesSelP] = useState(null);
    const [puestoFlujoSeleccionado, setPuestoFlujoSeleccionado] = useState(null);
    const [puestosGaleria, setPuestosGaleria] = useState([]);
    const [aniosP, setAniosP] = useState([]);
    const [mesesP, setMesesP] = useState([]);
    const [diasP, setDiasP] = useState([]);
    const [diaMovsP, setDiaMovsP] = useState([]);
    const [loadingPuestos, setLoadingPuestos] = useState(false);
    const [loadingAniosP, setLoadingAniosP] = useState(false);
    const [loadingMesesP, setLoadingMesesP] = useState(false);
    const [loadingDiasP, setLoadingDiasP] = useState(false);
    const [loadingDiaP, setLoadingDiaP] = useState(false);

    // Guarda el último puesto/bloque conocido para poder ver flujos sin turno activo
    useEffect(() => {
        if (turnoActivo) {
            localStorage.setItem(LAST_TURNO_KEY, JSON.stringify({ puesto: turnoActivo.puesto, bloque: turnoActivo.bloque }));
        }
    }, [turnoActivo]);

    const { puesto, bloque } = useMemo(() => {
        if (turnoActivo) return { puesto: turnoActivo.puesto, bloque: turnoActivo.bloque };
        try { return JSON.parse(localStorage.getItem(LAST_TURNO_KEY) || '{}'); } catch { return {}; }
    }, [turnoActivo]);

    // Nivel 1 — etiquetas de años
    useEffect(() => {
        if (!puesto || !bloque) { setLoadingAnios(false); return; }
        setLoadingAnios(true);
        api.get(`/movimientos/anios?puesto=${puesto}&bloque=${bloque}`)
            .then(res => setAnios(res.data.anios || []))
            .catch(() => setAnios([]))
            .finally(() => setLoadingAnios(false));
    }, [puesto, bloque]);

    // Nivel 2 — cuadro de meses del año elegido (sin cargar movimientos)
    useEffect(() => {
        if (!anioSel || !puesto || !bloque) return;
        setLoadingMeses(true);
        api.get(`/movimientos/meses?puesto=${puesto}&bloque=${bloque}&anio=${anioSel}`)
            .then(res => setMeses(res.data.meses || []))
            .catch(() => setMeses([]))
            .finally(() => setLoadingMeses(false));
    }, [anioSel, puesto, bloque]);

    // Nivel 3 — etiquetas de los días registrados en el mes elegido
    useEffect(() => {
        if (!anioSel || !mesSel || !puesto || !bloque) return;
        setLoadingDias(true);
        api.get(`/movimientos/dias?puesto=${puesto}&bloque=${bloque}&anio=${anioSel}&mes=${mesSel}`)
            .then(res => setDias(res.data.dias || []))
            .catch(() => setDias([]))
            .finally(() => setLoadingDias(false));
    }, [anioSel, mesSel, puesto, bloque]);

    // Nivel 4 — recién aquí se cargan los movimientos, y solo los de ese día
    useEffect(() => {
        if (!flujoSeleccionado || !puesto || !bloque) return;
        setLoadingDia(true);
        api.get(`/movimientos?puesto=${puesto}&bloque=${bloque}&fecha=${flujoSeleccionado}`)
            .then(res => setDiaMovs(res.data.movimientos || []))
            .catch(() => setDiaMovs([]))
            .finally(() => setLoadingDia(false));
    }, [flujoSeleccionado, puesto, bloque]);

    // Búsqueda global (pestaña General) — resuelta en el servidor con un pequeño debounce
    useEffect(() => {
        if (vistaFlujos !== 'general' || !puesto || !bloque) return;
        if (!genQuery.trim()) { setGenResultados([]); return; }
        setGenLoading(true);
        const t = setTimeout(() => {
            api.get(`/movimientos/buscar?puesto=${puesto}&bloque=${bloque}&campo=${genCampo}&q=${encodeURIComponent(genQuery.trim())}`)
                .then(res => setGenResultados(res.data.movimientos || []))
                .catch(() => setGenResultados([]))
                .finally(() => setGenLoading(false));
        }, 350);
        return () => clearTimeout(t);
    }, [vistaFlujos, genQuery, genCampo, puesto, bloque]);

    // Puestos — Nivel 1: galería con todos los puestos del bloque (no solo el propio)
    useEffect(() => {
        if (vistaFlujos !== 'puestos' || !puedeVerPuestos || !bloque) return;
        setLoadingPuestos(true);
        api.get(`/movimientos/bloque/puestos?bloque=${bloque}`)
            .then(res => setPuestosGaleria(res.data.puestos || []))
            .catch(() => setPuestosGaleria([]))
            .finally(() => setLoadingPuestos(false));
    }, [vistaFlujos, puedeVerPuestos, bloque]);

    // Puestos — Nivel 2: años del puesto elegido
    useEffect(() => {
        if (!puestoSel || !bloque) return;
        setLoadingAniosP(true);
        api.get(`/movimientos/bloque/anios?bloque=${bloque}&puesto=${encodeURIComponent(puestoSel)}`)
            .then(res => setAniosP(res.data.anios || []))
            .catch(() => setAniosP([]))
            .finally(() => setLoadingAniosP(false));
    }, [puestoSel, bloque]);

    // Puestos — Nivel 3: cuadro de meses del año elegido
    useEffect(() => {
        if (!puestoSel || !anioSelP || !bloque) return;
        setLoadingMesesP(true);
        api.get(`/movimientos/bloque/meses?bloque=${bloque}&puesto=${encodeURIComponent(puestoSel)}&anio=${anioSelP}`)
            .then(res => setMesesP(res.data.meses || []))
            .catch(() => setMesesP([]))
            .finally(() => setLoadingMesesP(false));
    }, [puestoSel, anioSelP, bloque]);

    // Puestos — Nivel 4: días registrados en el mes elegido
    useEffect(() => {
        if (!puestoSel || !anioSelP || !mesSelP || !bloque) return;
        setLoadingDiasP(true);
        api.get(`/movimientos/bloque/dias?bloque=${bloque}&puesto=${encodeURIComponent(puestoSel)}&anio=${anioSelP}&mes=${mesSelP}`)
            .then(res => setDiasP(res.data.dias || []))
            .catch(() => setDiasP([]))
            .finally(() => setLoadingDiasP(false));
    }, [puestoSel, anioSelP, mesSelP, bloque]);

    // Puestos — Nivel 5: movimientos del día elegido (de todos los usuarios del puesto)
    useEffect(() => {
        if (!puestoFlujoSeleccionado || !puestoSel || !bloque) return;
        setLoadingDiaP(true);
        api.get(`/movimientos/bloque/dia?bloque=${bloque}&puesto=${encodeURIComponent(puestoSel)}&fecha=${puestoFlujoSeleccionado}`)
            .then(res => setDiaMovsP(res.data.movimientos || []))
            .catch(() => setDiaMovsP([]))
            .finally(() => setLoadingDiaP(false));
    }, [puestoFlujoSeleccionado, puestoSel, bloque]);

    const handleDeleteFlujo = async () => {
        if (!confirmarFlujo) return;
        try {
            await api.delete('/movimientos/dia', { data: { puesto, bloque, fecha: confirmarFlujo.fecha } });
            setDias(prev => prev.filter(d => d.fecha !== confirmarFlujo.fecha));
            // Refresca en segundo plano los contadores de mes/año (son consultas livianas)
            api.get(`/movimientos/meses?puesto=${puesto}&bloque=${bloque}&anio=${anioSel}`).then(res => setMeses(res.data.meses || [])).catch(() => {});
            api.get(`/movimientos/anios?puesto=${puesto}&bloque=${bloque}`).then(res => setAnios(res.data.anios || [])).catch(() => {});
        } catch { }
        setConfirmarFlujo(null);
    };

    // Tarjeta de un día: la usan Archivo y los resultados de "General" (con
    // botón para borrar el flujo) y Puestos (solo abre el detalle)
    const renderDiaTag = (d, { onAbrir, conBorrar = true } = {}) => {
        const fechaLarga = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-EC', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
        const abrir = onAbrir || (() => { returnTabRef.current = vistaFlujos; setFlujoSeleccionado(d.fecha); });
        return (
            <div key={d.fecha} className="flujo-card" onClick={abrir}>
                <div className="flujo-card-info">
                    <div className="flujo-fecha">
                        <span className={`flujo-turno-icono${d.isDiurno ? ' diurno' : ''}`}>
                            {d.isDiurno ? <IconSun size={14} /> : <IconMoon size={14} />}
                        </span>
                        {fechaLarga}
                    </div>
                    <div className="flujo-stats">
                        <span className="flujo-stat-ingresos">{d.ingresos} ing.</span>
                        <span className="flujo-stat-sep"> · </span>
                        <span className="flujo-stat-salidas">{d.salidas} sal.</span>
                        {d.petro > 0 && <><span className="flujo-stat-sep"> · </span><span className="flujo-stat-ep">{d.petro} EP</span></>}
                    </div>
                </div>
                {conBorrar && (
                    <button
                        className="flujo-delete-btn"
                        title="Eliminar flujo"
                        onClick={e => { e.stopPropagation(); setConfirmarFlujo({ fecha: d.fecha, fechaLarga, total: d.ingresos + d.salidas }); }}
                    >
                        <IconMinus />
                    </button>
                )}
                <IconChevronRight />
            </div>
        );
    };

    if (!puesto || !bloque) {
        return <p className="ws-empty ws-empty-amplio">Sin turno activo</p>;
    }

    // Nivel 4: detalle de un día — se carga justo al entrar, y solo ese día
    if (flujoSeleccionado) {
        return loadingDia
            ? <p className="ws-empty ws-empty-amplio">Cargando...</p>
            : <PantallaFlujoDetalle
                fecha={flujoSeleccionado}
                movs={diaMovs}
                onBack={() => { setFlujoSeleccionado(null); setVistaFlujos(returnTabRef.current); returnTabRef.current = 'archivo'; }}
            />;
    }

    // Detalle de un día dentro de "Puestos" — mismos formatos, pero con los
    // movimientos de TODOS los usuarios que registraron en ese puesto/bloque.
    if (puestoFlujoSeleccionado) {
        return loadingDiaP
            ? <p className="ws-empty ws-empty-amplio">Cargando...</p>
            : <PantallaFlujoDetalle
                fecha={puestoFlujoSeleccionado}
                movs={diaMovsP}
                onBack={() => setPuestoFlujoSeleccionado(null)}
            />;
    }

    return (
        <>
        {/* Pestañas Archivo / General / Puestos */}
        <div className="flujos-tabs">
            <button className={`ws-vista-tab${vistaFlujos === 'archivo' ? ' active' : ''}`}
                onClick={() => setVistaFlujos('archivo')}>Archivo</button>
            <button className={`ws-vista-tab${vistaFlujos === 'general' ? ' active' : ''}`}
                onClick={() => setVistaFlujos('general')}>General</button>
            <button className={`ws-vista-tab${vistaFlujos === 'puestos' ? ' active' : ''}`}
                onClick={() => setVistaFlujos('puestos')}>Puestos</button>
        </div>

        {/* ── TAB ARCHIVO: años → meses (calendario) → días ── */}
        {vistaFlujos === 'archivo' && (
            <div className="flujos-panel">
                {!anioSel ? (
                    loadingAnios
                        ? <p className="ws-empty">Cargando...</p>
                        : anios.length === 0
                            ? <p className="ws-empty">No hay flujos registrados aún</p>
                            : <div className="flujo-tags-row">
                                {anios.map(a => (
                                    <button key={a.anio} className="flujo-tag" onClick={() => setAnioSel(a.anio)}>
                                        <span className="flujo-tag-label">{a.anio}</span>
                                        <span className="flujo-tag-count">{a.dias} día{a.dias !== 1 ? 's' : ''}</span>
                                    </button>
                                ))}
                            </div>
                ) : !mesSel ? (
                    <>
                        <button className="flujo-back-btn" onClick={() => setAnioSel(null)}>
                            <IconArrowLeft /> <span>{anioSel}</span>
                        </button>
                        {loadingMeses ? <p className="ws-empty">Cargando...</p> : (
                            <div className="flujo-mes-grid">
                                {MESES_ES.map((nombre, i) => {
                                    const mm = String(i + 1).padStart(2, '0');
                                    const info = meses.find(m => m.mes === mm);
                                    const activo = !!info;
                                    return (
                                        <button key={mm} className={`flujo-mes-tile${activo ? ' activo' : ''}`}
                                            disabled={!activo}
                                            onClick={() => activo && setMesSel(mm)}>
                                            <span className="flujo-mes-nombre">{nombre.slice(0, 3)}</span>
                                            {activo && <span className="flujo-mes-dias">{info.dias} día{info.dias !== 1 ? 's' : ''}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <button className="flujo-back-btn" onClick={() => setMesSel(null)}>
                            <IconArrowLeft /> <span>{MESES_ES[parseInt(mesSel, 10) - 1]} {anioSel}</span>
                        </button>
                        {loadingDias
                            ? <p className="ws-empty">Cargando...</p>
                            : dias.length === 0
                                ? <p className="ws-empty">Sin días registrados</p>
                                : <div className="flujos-dias">
                                    {dias.map(renderDiaTag)}
                                </div>
                        }
                    </>
                )}
            </div>
        )}

        {/* ── TAB GENERAL ── */}
        {vistaFlujos === 'general' && (
            <div className="flujos-panel flujos-general">
                {/* Chips de filtro */}
                <div className="flujos-chips">
                    {[
                        { id: 'todos',      label: 'Todos' },
                        { id: 'placa',      label: 'Placa' },
                        { id: 'conductor',  label: 'Conductor' },
                        { id: 'empresa',    label: 'Empresa' },
                        { id: 'actividad',  label: 'Actividad' },
                    ].map(f => (
                        <button key={f.id} onClick={() => setGenCampo(f.id)} className={`gen-chip${genCampo === f.id ? ' active' : ''}`}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* La barra de búsqueda está en la barra superior (fija al bajar) */}

                {/* Resultados */}
                {!genQuery.trim() ? (
                    <p className="ws-empty flujos-general-aviso">Escribe algo para buscar en todos los registros</p>
                ) : genLoading ? (
                    <p className="ws-empty flujos-general-aviso">Buscando...</p>
                ) : genResultados.length === 0 ? (
                    <p className="ws-empty flujos-general-aviso">Sin resultados para "{genQuery}"</p>
                ) : (
                    <div className="flujos-resultados">
                        <p className="flujos-resultados-total">
                            {genResultados.length} resultado{genResultados.length !== 1 ? 's' : ''}
                        </p>
                        {genResultados.map(m => {
                            const fechaCorta = new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-EC', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            });
                            return (
                                <div key={m._id} className="mov-item flujos-resultado"
                                    onClick={() => { returnTabRef.current = 'general'; setFlujoSeleccionado(m.fecha); }}>
                                    <div className="mov-item-inner">
                                        <div className={`mov-icon ${m.tipo}`}>
                                            <span className="mov-hora-small">{m.hora}</span>
                                        </div>
                                        <div className="mov-info">
                                            <span className={`mov-tipo ${m.tipo}`}>{m.tipo === 'ingreso' ? 'Ingreso' : 'Salida'} · {m.placa}</span>
                                            <span className="mov-detalle">{m.conductor || '—'}{m.cedula ? ' · ' + m.cedula : ''}</span>
                                            {(m.empresa || m.destino) && (
                                                <span className="mov-detalle mov-detalle-chico">
                                                    {[m.empresa, m.destino].filter(Boolean).join(' · ')}
                                                </span>
                                            )}
                                            {m.actividad && !/^vac[ií]o$/i.test(m.actividad.trim()) && (
                                                <span className="mov-actividad">{m.actividad}</span>
                                            )}
                                            <span className="flujos-resultado-fecha">{fechaCorta}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {/* ── TAB PUESTOS: galería del bloque → años → meses → días (todos los usuarios) ── */}
        {vistaFlujos === 'puestos' && (
            !puedeVerPuestos ? (
                <AccesoRestringido label="Puestos del Bloque" />
            ) : (
                <div className="flujos-panel">
                    {!puestoSel ? (
                        loadingPuestos
                            ? <p className="ws-empty">Cargando...</p>
                            : !BLOQUES_DATA[bloque]
                                ? <p className="ws-empty">Sin bloque activo</p>
                                : <div className="flujo-tags-row">
                                    {BLOQUES_DATA[bloque].puestos.map(p => {
                                        const info = puestosGaleria.find(x => x.puesto === p);
                                        return (
                                            <button key={p} className="flujo-tag" onClick={() => setPuestoSel(p)}>
                                                <span className="flujo-tag-label">{p}</span>
                                                <span className="flujo-tag-count">{info ? `${info.dias} día${info.dias !== 1 ? 's' : ''}` : 'Sin registros'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                    ) : !anioSelP ? (
                        <>
                            <button className="flujo-back-btn" onClick={() => setPuestoSel(null)}>
                                <IconArrowLeft /> <span>{puestoSel}</span>
                            </button>
                            {loadingAniosP
                                ? <p className="ws-empty">Cargando...</p>
                                : aniosP.length === 0
                                    ? <p className="ws-empty">No hay flujos registrados en este puesto</p>
                                    : <div className="flujo-tags-row">
                                        {aniosP.map(a => (
                                            <button key={a.anio} className="flujo-tag" onClick={() => setAnioSelP(a.anio)}>
                                                <span className="flujo-tag-label">{a.anio}</span>
                                                <span className="flujo-tag-count">{a.dias} día{a.dias !== 1 ? 's' : ''}</span>
                                            </button>
                                        ))}
                                    </div>
                            }
                        </>
                    ) : !mesSelP ? (
                        <>
                            <button className="flujo-back-btn" onClick={() => setAnioSelP(null)}>
                                <IconArrowLeft /> <span>{anioSelP}</span>
                            </button>
                            {loadingMesesP ? <p className="ws-empty">Cargando...</p> : (
                                <div className="flujo-mes-grid">
                                    {MESES_ES.map((nombre, i) => {
                                        const mm = String(i + 1).padStart(2, '0');
                                        const info = mesesP.find(m => m.mes === mm);
                                        const activo = !!info;
                                        return (
                                            <button key={mm} className={`flujo-mes-tile${activo ? ' activo' : ''}`}
                                                disabled={!activo}
                                                onClick={() => activo && setMesSelP(mm)}>
                                                <span className="flujo-mes-nombre">{nombre.slice(0, 3)}</span>
                                                {activo && <span className="flujo-mes-dias">{info.dias} día{info.dias !== 1 ? 's' : ''}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <button className="flujo-back-btn" onClick={() => setMesSelP(null)}>
                                <IconArrowLeft /> <span>{MESES_ES[parseInt(mesSelP, 10) - 1]} {anioSelP}</span>
                            </button>
                            {loadingDiasP
                                ? <p className="ws-empty">Cargando...</p>
                                : diasP.length === 0
                                    ? <p className="ws-empty">Sin días registrados</p>
                                    : <div className="flujos-dias">
                                        {diasP.map(d => renderDiaTag(d, { onAbrir: () => setPuestoFlujoSeleccionado(d.fecha), conBorrar: false }))}
                                    </div>
                            }
                        </>
                    )}
                </div>
            )
        )}

        {confirmarFlujo && (
            <ModalConfirm
                mensaje={`¿Eliminar los ${confirmarFlujo.total} movimientos del ${confirmarFlujo.fechaLarga}?`}
                onConfirm={handleDeleteFlujo}
                onCancel={() => setConfirmarFlujo(null)}
            />
        )}
        </>
    );
};
