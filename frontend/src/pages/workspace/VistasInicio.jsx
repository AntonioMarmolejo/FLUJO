import { useState, useRef, Suspense, lazy } from 'react';
import { MovCard } from './Movimientos';
import { DASH_FILTROS, addMouseSwipe, generarNarrativa } from './helpers';
import { IconCopy, IconMinus, IconPencil, IconShare } from './iconos';

const StatsChart = lazy(() => import('../../components/StatsChart.jsx'));

// Bitácora: salidas e ingresos de la misma placa, en pares
export const VistaBitacora = ({
    bitacora,
    bitacoraFiltrada,
    expandedBitSet,
    exportBitacora,
    handleDeleteBitPair,
    searchQuery,
    setBitDetailIdx,
    setEditIngresoBit,
    toggleBitCollapse,
}) => {
    const [swipedBitMainIdx, setSwipedBitMainIdx] = useState(null);
    const bitMainSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });

    return (
        <div className="ws-bitacora">
            <div className="bit-toolbar">
                <span className="bit-toolbar-count">
                    {searchQuery
                        ? <>{bitacoraFiltrada.length} <span className="ws-conteo-total">de {bitacora.length}</span></>
                        : <>{bitacora.length} registro{bitacora.length !== 1 ? 's' : ''}</>
                    }
                </span>
                <button className="bit-export-btn" onClick={exportBitacora} disabled={bitacora.length === 0}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                        <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    Exportar Excel
                </button>
            </div>
            {bitacora.length === 0 ? (
                <p className="ws-empty">Sin movimientos para consolidar</p>
            ) : bitacoraFiltrada.length === 0 ? (
                <p className="ws-empty">Sin resultados para "{searchQuery}"</p>
            ) : (
                <div className="bit-list-wrap">
                    {bitacoraFiltrada.map((b, i) => {
                        const bText = [
                            `Bitácora: ${b.placa}${b.tipoVehiculo ? ' · ' + b.tipoVehiculo : ''}`,
                            `Conductor: ${b.conductor}`,
                            b.destino && `Destino: ${b.destino}`,
                            `Salida: ${b.horaS}  →  Ingreso: ${b.horaI}`,
                        ].filter(Boolean).join('\n');
                        const isSwiped = swipedBitMainIdx === i;
                        const isCollapsed = !expandedBitSet.has(i);
                        return (
                        <div key={i} className="bit-item">
                            <div className="bit-actions" onClick={e => e.stopPropagation()}>
                                <button className="bit-act-btn" title="Copiar" onClick={() => { navigator.clipboard?.writeText(bText); setSwipedBitMainIdx(null); }}><IconCopy /></button>
                                <button className="bit-act-btn" title="Compartir" onClick={async () => { if (navigator.share) { await navigator.share({ title: 'Bitácora FLUJO', text: bText }).catch(() => {}); } else navigator.clipboard?.writeText(bText); setSwipedBitMainIdx(null); }}><IconShare /></button>
                                <button className="bit-act-btn" title="Editar" onClick={() => { setBitDetailIdx(i); setSwipedBitMainIdx(null); }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                                <button className="bit-act-btn danger" title="Eliminar" onClick={() => { handleDeleteBitPair(b, i); setSwipedBitMainIdx(null); }}><IconMinus /></button>
                            </div>
                            <div
                                className={`bit-card bit-${b.status}${isSwiped ? ' bit-row-swiped' : ''}`}
                                onTouchStart={e => { bitMainSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false }; }}
                                onTouchMove={e => {
                                    const dx = e.touches[0].clientX - bitMainSwipeRef.current.startX;
                                    const dy = e.touches[0].clientY - bitMainSwipeRef.current.startY;
                                    if (!bitMainSwipeRef.current.moved && !bitMainSwipeRef.current.vertScroll) {
                                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                        if (Math.abs(dy) > Math.abs(dx)) { bitMainSwipeRef.current.vertScroll = true; return; }
                                        bitMainSwipeRef.current.moved = true;
                                    }
                                    if (bitMainSwipeRef.current.moved) e.preventDefault();
                                }}
                                onTouchEnd={e => {
                                    if (!bitMainSwipeRef.current.moved) return;
                                    const dx = e.changedTouches[0].clientX - bitMainSwipeRef.current.startX;
                                    if (isSwiped) { if (dx < -30) setSwipedBitMainIdx(null); }
                                    else {
                                        if (dx > 55) setSwipedBitMainIdx(i);
                                        else if (dx < -55) setEditIngresoBit(b);
                                    }
                                }}
                                {...addMouseSwipe(bitMainSwipeRef, dx => {
                                    if (isSwiped) { if (dx < -30) setSwipedBitMainIdx(null); }
                                    else {
                                        if (dx > 55) setSwipedBitMainIdx(i);
                                        else if (dx < -55) setEditIngresoBit(b);
                                    }
                                })}
                                onClick={() => { if (bitMainSwipeRef.current?.didDrag) { bitMainSwipeRef.current.didDrag = false; return; } if (isSwiped) { setSwipedBitMainIdx(null); return; } setBitDetailIdx(i); }}
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
                                        <button className="bit-chevron-btn" onClick={e => { e.stopPropagation(); toggleBitCollapse(i); }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`chevron-giro${isCollapsed ? '' : ' abierto'}`}>
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
    );
};

// Registro: cada movimiento contado como narrativa
export const VistaRegistro = ({
    exportRegistroExcel,
    exportRegistroWord,
    goToMov,
    handleDelete,
    handleEdit,
    movimientos,
    regSort,
    registroConfig,
    searchQuery,
    setRegSort,
    setRegistroDetailMov,
    setShowRegistroConfig,
    sortedRegs,
}) => {
    const [swipedRegId, setSwipedRegId] = useState(null);
    const regSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });

    return (
        <div className="ws-registro">
            <div className="reg-toolbar">
                <span className="reg-count">
                    {searchQuery
                        ? <>{sortedRegs.length} <span className="ws-conteo-total">de {movimientos.length}</span></>
                        : <>{movimientos.length} entrada{movimientos.length !== 1 ? 's' : ''}</>
                    }
                </span>
                <div className="reg-toolbar-actions">
                    <span
                        className="sort-toggle-btn"
                        title={regSort === 'asc' ? 'Más antiguo primero' : 'Más reciente primero'}
                        onClick={() => setRegSort(s => s === 'asc' ? 'desc' : 'asc')}>
                        {regSort === 'asc' ? '↑ Ant.' : '↓ Rec.'}
                    </span>
                    <button className="reg-cfg-btn" onClick={() => setShowRegistroConfig(true)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Configurar
                    </button>
                    <button className="reg-export-btn" onClick={exportRegistroExcel} disabled={!movimientos.length}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2"/></svg>
                        Excel
                    </button>
                    <button className="reg-export-btn" onClick={exportRegistroWord} disabled={!movimientos.length}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
                        Word
                    </button>
                </div>
            </div>
            {movimientos.length === 0 ? (
                <p className="ws-empty">Sin movimientos registrados</p>
            ) : sortedRegs.length === 0 ? (
                <p className="ws-empty">Sin resultados para "{searchQuery}"</p>
            ) : (
                <div className="reg-list">
                    {sortedRegs.map(mov => (
                        <div key={mov._id} className={`reg-entry reg-${mov.tipo}${swipedRegId === mov._id ? ' reg-swiped' : ''}`} data-regid={mov._id}>
                            <div className="reg-actions" onClick={e => e.stopPropagation()}>
                                <button className="reg-act-btn" title="Ver detalle" onClick={() => { setRegistroDetailMov(mov); setSwipedRegId(null); }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2"/></svg>
                                </button>
                                <button className="reg-act-btn" title="Editar" onClick={() => { handleEdit(mov); setSwipedRegId(null); }}>
                                    <IconPencil />
                                </button>
                                <button className="reg-act-btn" title="Copiar" onClick={() => { navigator.clipboard?.writeText(generarNarrativa(mov, registroConfig)); setSwipedRegId(null); }}>
                                    <IconCopy />
                                </button>
                                <button className="reg-act-btn" title="Compartir" onClick={async () => {
                                    const text = generarNarrativa(mov, registroConfig);
                                    if (navigator.share) { await navigator.share({ title: 'Movimiento FLUJO', text }).catch(() => {}); }
                                    else { navigator.clipboard?.writeText(text); }
                                    setSwipedRegId(null);
                                }}>
                                    <IconShare />
                                </button>
                                <button className="reg-act-btn danger" title="Eliminar" onClick={() => { handleDelete(mov._id); setSwipedRegId(null); }}>
                                    <IconMinus />
                                </button>
                            </div>
                            <div
                                className="reg-entry-inner"
                                onTouchStart={e => {
                                    regSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false };
                                }}
                                onTouchMove={e => {
                                    const dx = e.touches[0].clientX - regSwipeRef.current.startX;
                                    const dy = e.touches[0].clientY - regSwipeRef.current.startY;
                                    if (!regSwipeRef.current.moved && !regSwipeRef.current.vertScroll) {
                                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                        if (Math.abs(dy) > Math.abs(dx)) { regSwipeRef.current.vertScroll = true; return; }
                                        regSwipeRef.current.moved = true;
                                    }
                                    if (regSwipeRef.current.moved) e.preventDefault();
                                }}
                                onTouchEnd={e => {
                                    if (!regSwipeRef.current.moved) return;
                                    const dx = e.changedTouches[0].clientX - regSwipeRef.current.startX;
                                    if (swipedRegId === mov._id) {
                                        if (dx < -30) setSwipedRegId(null);
                                    } else {
                                        if (dx > 55) setSwipedRegId(mov._id);
                                        else if (dx < -55) goToMov(mov._id);
                                    }
                                }}
                                {...addMouseSwipe(regSwipeRef, dx => {
                                    if (swipedRegId === mov._id) {
                                        if (dx < -30) setSwipedRegId(null);
                                    } else {
                                        if (dx > 55) setSwipedRegId(mov._id);
                                        else if (dx < -55) goToMov(mov._id);
                                    }
                                })}
                                onClick={() => {
                                    if (regSwipeRef.current?.didDrag) { regSwipeRef.current.didDrag = false; return; }
                                    if (swipedRegId === mov._id) { setSwipedRegId(null); return; }
                                    setRegistroDetailMov(mov);
                                }}
                            >
                                <div className="reg-narrativa">
                                    <span className={`reg-badge reg-badge-${mov.tipo}`}>{mov.tipo === 'ingreso' ? '↓' : '↑'}</span>
                                    {generarNarrativa(mov, registroConfig)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Movimientos: dashboard con filtros y lista de movimientos
export const VistaMovimientos = ({
    bitPlacaCounts,
    cardProps,
    chartCollapsed,
    dashCollapsed,
    dashFiltro,
    handleBatchDelete,
    handleShareMovs,
    movCollapsed,
    movSort,
    movimientos,
    movsLista,
    searchQuery,
    selectAll,
    selectMode,
    selectedIds,
    setChartCollapsed,
    setDashCollapsed,
    setDashFiltro,
    setMovCollapsed,
    setMovSort,
    sortedMovs,
    stats,
    toggleSelectMode,
    turnoActivo,
}) => {
    return (
        <div className="ws-desktop-grid">
            <div className="ws-section">
                <button className="ws-section-header" onClick={() => setDashCollapsed(p => !p)}>
                    <span>DASHBOARD</span>
                    <span className={`ws-chevron ${dashCollapsed ? 'collapsed' : ''}`}>∧</span>
                </button>
                {!dashCollapsed && (
                    <div className="ws-section-content">
                        <div className="ws-counters">
                            {/* Cada tarjeta filtra la lista de Movimientos; otro clic quita el filtro */}
                            {[
                                { id: 'contratistas', valor: stats?.contratistas ?? '–', label: 'CONTRATISTAS' },
                                { id: 'petro', valor: stats?.petroecuador ?? '–', label: 'EP PETRO.' },
                                { id: 'guias', valor: stats?.guias ?? '–', label: 'GUÍAS' },
                            ].map(c => (
                                <button key={c.id} type="button"
                                    className={`ws-counter-card ws-counter-filtro${dashFiltro === c.id ? ' activo' : ''}`}
                                    title={dashFiltro === c.id ? 'Quitar filtro' : `Ver solo ${DASH_FILTROS[c.id].label.toLowerCase()}`}
                                    onClick={() => { setDashFiltro(f => (f === c.id ? null : c.id)); setMovCollapsed(false); }}>
                                    <span className="ws-counter-val">{c.valor}</span>
                                    <span className="ws-counter-label">{c.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="ws-chart-card">
                            <button className="ws-chart-toggle" onClick={() => setChartCollapsed(p => !p)}>
                                <div className="ws-chart-toggle-info">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws-chart-toggle-icono">
                                        <path d="M3 3h18v4H3zM3 10h12v4H3zM3 17h7v4H3z" fill="currentColor" opacity="0.8" />
                                        <path d="M21 14l-4 4-4-4" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M17 18V10" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    <span>Movimiento de vehículos</span>
                                    <span className="ws-chart-badge">+{stats?.totalFlujos ?? 0} hoy</span>
                                </div>
                                <svg
                                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    className={`ws-chart-toggle-flecha${chartCollapsed ? '' : ' abierta'}`}
                                >
                                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            {!chartCollapsed && (
                                <Suspense fallback={<div className="ws-chart-cargando" />}>
                                    <StatsChart
                                        data={stats?.grafico}
                                        turno={turnoActivo?.turnoActual || 'diurno'}
                                        topDestinos={stats?.topDestinos || []}
                                        topActividades={stats?.topActividades || []}
                                        topPlacas={stats?.topPlacas || []}
                                    />
                                </Suspense>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="ws-section">
                <button className="ws-section-header" onClick={() => setMovCollapsed(p => !p)}>
                    <span>
                        MOVIMIENTOS
                        {(searchQuery || dashFiltro) && (
                            <span className="ws-section-conteo">
                                · {movsLista.length} resultado{movsLista.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        {dashFiltro && (
                            <span className="ws-filtro-chip" role="button" title="Quitar filtro"
                                onClick={e => { e.stopPropagation(); setDashFiltro(null); }}>
                                {DASH_FILTROS[dashFiltro].label} ✕
                            </span>
                        )}
                    </span>
                    <div className="ws-section-acciones">
                        {!movCollapsed && movimientos.length > 0 && (
                            <>
                                <span
                                    className="sort-toggle-btn"
                                    title={movSort === 'desc' ? 'Más reciente primero' : 'Más antiguo primero'}
                                    onClick={e => { e.stopPropagation(); setMovSort(s => s === 'desc' ? 'asc' : 'desc'); }}>
                                    {movSort === 'desc' ? '↓ Rec.' : '↑ Ant.'}
                                </span>
                                <span className="select-toggle-btn"
                                    onClick={e => { e.stopPropagation(); toggleSelectMode(); }}>
                                    {selectMode ? 'Cancelar' : 'Selec.'}
                                </span>
                            </>
                        )}
                        <span className={`ws-chevron ${movCollapsed ? 'collapsed' : ''}`}>∧</span>
                    </div>
                </button>
                {!movCollapsed && (
                    <>
                        {selectMode && (
                            <div className="select-bar">
                                <label className="select-bar-label" onClick={selectAll}>
                                    <input type="checkbox"
                                        checked={selectedIds.size === movimientos.length && movimientos.length > 0}
                                        onChange={selectAll} className="select-bar-check"
                                        onClick={e => e.stopPropagation()} />
                                    {selectedIds.size === movimientos.length ? 'Ninguno' : 'Todos'} ({selectedIds.size}/{movimientos.length})
                                </label>
                                {selectedIds.size > 0 && (
                                    <div className="select-bar-acciones">
                                        <button className="share-selected-btn"
                                            onClick={() => handleShareMovs(movimientos.filter(m => selectedIds.has(m._id)))}>
                                            Compartir {selectedIds.size}
                                        </button>
                                        <button className="delete-selected-btn" onClick={handleBatchDelete}>
                                            Eliminar {selectedIds.size}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="ws-section-content">
                            {movimientos.length === 0
                                ? <p className="ws-empty">Sin movimientos registrados hoy</p>
                                : movsLista.length === 0
                                    ? <p className="ws-empty">
                                        {dashFiltro && !searchQuery
                                            ? `Sin movimientos de ${DASH_FILTROS[dashFiltro].label.toLowerCase()} hoy`
                                            : `Sin resultados para "${searchQuery}"`}
                                    </p>
                                    : sortedMovs.map(m => (
                                        <MovCard key={m._id} m={m}
                                            count={bitPlacaCounts[m.placa] || 1}
                                            selected={selectedIds.has(m._id)}
                                            {...cardProps} />
                                    ))
                            }
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
