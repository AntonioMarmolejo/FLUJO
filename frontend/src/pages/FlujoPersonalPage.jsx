import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../styles/FlujoPersonalPage.css';

const COLORS = {
    bg: '#111111',
    card: '#1a1a1a',
    cardElev: '#1f1f1f',
    border: '#2a2a2a',
    borderLight: '#333',
    text: '#ffffff',
    textMute: '#8a8a8a',
    textDim: '#5e5e5e',
    violet: '#7c5ef5',
    violetDim: 'rgba(124,94,245,0.14)',
    green: '#4ade80',
    greenDim: 'rgba(74,222,128,0.14)',
    yellow: '#EF9F27',
    yellowDim: 'rgba(239,159,39,0.12)',
    red: '#E24B4A',
    redDim: 'rgba(226,75,74,0.14)',
    blue: '#3b82f6',
    blueDim: 'rgba(59,130,246,0.14)',
    cyan: '#22d3ee',
    cyanDim: 'rgba(34,211,238,0.14)',
};

const TURNO_META = {
    dia:      { label: 'DÍA',      color: '#4ade80', dim: 'rgba(74,222,128,0.14)' },
    noche:    { label: 'NOCHE',    color: '#3b82f6', dim: 'rgba(59,130,246,0.14)' },
    descanso: { label: 'DESCANSO', color: '#7c5ef5', dim: 'rgba(124,94,245,0.14)' },
};

const Icon = {
    back: (s = 18, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    user: (s = 18, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8.5" r="3.6" stroke={c} strokeWidth="1.8" />
            <path d="M5 19.5c1.6-3.2 4.2-4.7 7-4.7s5.4 1.5 7 4.7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    ),
    search: (s = 16, c = COLORS.textMute) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke={c} strokeWidth="1.8" />
            <path d="M16 16l4 4" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    ),
    upload: (s = 14, c = '#0a2010') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 16v3a2 2 0 002 2h10a2 2 0 002-2v-3" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    ),
    swap: (s = 13, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    chevDown: (s = 10, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    edit: (s = 16, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M4 20h4l10-10-4-4L4 16v4z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M14 6l4 4" stroke={c} strokeWidth="1.8" />
        </svg>
    ),
    copy: (s = 16, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <rect x="8" y="8" width="12" height="12" rx="2" stroke={c} strokeWidth="1.8" />
            <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    ),
    share: (s = 16, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <circle cx="6" cy="12" r="2.5" stroke={c} strokeWidth="1.8" />
            <circle cx="17" cy="6" r="2.5" stroke={c} strokeWidth="1.8" />
            <circle cx="17" cy="18" r="2.5" stroke={c} strokeWidth="1.8" />
            <path d="M8.2 11l6.6-3.7M8.2 13l6.6 3.7" stroke={c} strokeWidth="1.8" />
        </svg>
    ),
    trash: (s = 16, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M7 7l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    plus: (s = 22, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
    ),
    home: (s = 22, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
    ),
    flow: (s = 22, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.8" />
            <rect x="15" y="4" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.8" />
            <rect x="3" y="14" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.8" />
            <rect x="15" y="14" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.8" />
            <path d="M9 7h6M9 17h6M6 10v4M18 10v4" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    ),
    alert: (s = 12, c = COLORS.yellow) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M12 3l10 17H2L12 3z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 10v4" stroke={c} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1.1" fill={c} />
        </svg>
    ),
    close: (s = 14, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    check: (s = 14, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    sliders: (s = 16, c = '#fff') => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
            <path d="M3 7h4M13 7h8M3 12h8M17 12h4M3 17h6M15 17h6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="8.5" cy="7" r="2.2" stroke={c} strokeWidth="1.8" />
            <circle cx="14.5" cy="12" r="2.2" stroke={c} strokeWidth="1.8" />
            <circle cx="11" cy="17" r="2.2" stroke={c} strokeWidth="1.8" />
        </svg>
    ),
};

// Días transcurridos desde la fecha de ingreso (incluye el día de hoy)
const daysSince = (iso) => {
    if (!iso) return 1;
    const start = new Date(iso + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(1, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1);
};

// Convierte un worker de la API al formato que usa el componente
const fromApi = (w) => {
    const total = w.total || CYCLE_TOTAL[w.cycle] || 15;
    const days  = daysSince(w.inDateISO);
    return {
        ...w,
        id: w._id,
        in: fmtDate(w.inDateISO),
        out: calcOutDate(w.inDateISO, total),
        days,
        total,
        remaining: Math.max(0, total - days),
    };
};

// Clasifica workers: remaining <= 3 → próximos a salir (soon)
const classifyWorkers = (workers) => {
    const mapped = workers.map(fromApi);
    return {
        active: mapped.filter(w => w.remaining > 3),
        soon:   mapped.filter(w => w.remaining <= 3),
    };
};

// ── Subcomponentes ──────────────────────────────────────
function CyclePill({ cycle, onClick }) {
    const PILL_LABELS = { '14-7': '14·7', '14-14': '14·14', '15-15': '15·15', '20-10': '20·10', '30': '30 d' };
    const label = PILL_LABELS[cycle] || cycle;
    return (
        <button className="fp-ciclo" onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
            <span className="fp-num">{label}</span>
            {Icon.chevDown(8, COLORS.textMute)}
        </button>
    );
}

function DaysBadge({ days, total }) {
    return (
        <span className="fp-badge fp-badge-dia">
            <span className="fp-badge-punto" />
            DÍA {days}/{total}
        </span>
    );
}

function RemainingBadge({ remaining }) {
    return (
        <span className="fp-badge fp-badge-restante">
            {Icon.alert(10, COLORS.yellow)}
            {remaining} {remaining === 1 ? 'DÍA' : 'DÍAS'} REST.
        </span>
    );
}

function ActionButton({ color, bg, icon, label, onClick }) {
    return (
        <button onClick={onClick} title={label} aria-label={label} className="fp-accion"
            style={{ color, '--accion-fondo': bg.base, '--accion-hover': bg.hover, '--accion-borde': bg.border }}>
            {icon}
        </button>
    );
}

function ProgressBar({ value, total, color }) {
    const pct = Math.min(100, (value / total) * 100);
    return (
        <div className="fp-progreso">
            {/* Ancho según el avance y color según el turno: van en línea */}
            <div className="fp-progreso-barra" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
}

function WorkerCard({ worker, soon, onDetail, onCycleClick, onSwap, onTurnoSwap, hasTurnoSibling, onToLibre, on3PersonSwap }) {
    const turnoMeta = TURNO_META[worker.turno] || TURNO_META.dia;
    const turno = TURNO_META[worker.turno] ? worker.turno : 'dia';

    return (
        <div className={`fp-card${soon ? ' proximo' : ''}`} onClick={() => onDetail && onDetail(worker)}>
            {soon && <div className="fp-card-franja" />}

            <div className="fp-card-top">
                <div className="fp-card-rol-fila">
                    <span className="fp-card-rol">{worker.role}</span>
                    <span className={`fp-turno-chip fp-turno-${turno}`}>{turnoMeta.label}</span>
                </div>
                <div className="fp-card-fechas">
                    <span className="fp-card-rango">{worker.in} – {worker.out}</span>
                    {soon ? <RemainingBadge remaining={worker.remaining} /> : <DaysBadge days={worker.days} total={worker.total} />}
                </div>
            </div>

            <div className="fp-card-nombre">{worker.name}</div>

            <ProgressBar value={worker.days} total={worker.total} color={soon ? COLORS.yellow : COLORS.green} />

            <div className="fp-card-pie">
                <div className="fp-card-back">
                    <div className="fp-card-back-avatar">
                        {(worker.back || '').split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="fp-card-back-info">
                        <div className="fp-card-back-label">BACK / RELEVO</div>
                        <div className="fp-card-back-nombre">{worker.back}</div>
                    </div>
                </div>
                <div className="fp-card-botones">
                    {/* Pasar a libre — solo para descanso */}
                    {worker.turno === 'descanso' && (
                        <button className="fp-mini-btn fp-mini-libre" title="Pasar a libre"
                            onClick={e => { e.stopPropagation(); onToLibre && onToLibre(worker); }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14M14 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            LIBRE
                        </button>
                    )}
                    {/* Intercambio back↔turno — solo para descanso en grupo de 3 */}
                    {worker.turno === 'descanso' && on3PersonSwap && (
                        <button className="fp-mini-btn fp-mini-cuadrado fp-mini-amarillo" title="Intercambiar turno con persona de día o noche"
                            onClick={e => { e.stopPropagation(); on3PersonSwap(worker); }}>
                            {Icon.swap(12, COLORS.yellow)}
                        </button>
                    )}
                    {/* Intercambio día/noche — solo si hay un compañero con turno opuesto */}
                    {(worker.turno === 'dia' || worker.turno === 'noche') && hasTurnoSibling && (
                        <button className={`fp-mini-btn fp-mini-turno ${worker.turno === 'dia' ? 'a-noche' : 'a-dia'}`}
                            title={`Cambiar a ${worker.turno === 'dia' ? 'noche' : 'día'}`}
                            onClick={e => { e.stopPropagation(); onTurnoSwap && onTurnoSwap(worker); }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                <path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {worker.turno === 'dia' ? 'NOCHE' : 'DÍA'}
                        </button>
                    )}
                    {/* Swap principal (relevo/cambio de guardia) — no se muestra en descanso */}
                    {worker.turno !== 'descanso' && (
                        <button className={`fp-mini-btn fp-mini-cuadrado ${soon ? 'fp-mini-amarillo' : 'fp-mini-neutro'}`} title="Rotar / Cambio de turno"
                            onClick={e => { e.stopPropagation(); onSwap && onSwap(worker); }}>
                            {Icon.swap(12, soon ? COLORS.yellow : COLORS.textMute)}
                        </button>
                    )}
                    <CyclePill cycle={worker.cycle} onClick={() => { onCycleClick && onCycleClick(worker); }} />
                </div>
            </div>
        </div>
    );
}

function WorkerCardTrio({ worker, soon, onDetail, onCycleClick, onTrioNightSwap, onTrioDayNightSwap }) {
    const dia   = worker.trioPeople?.find(p => p.turno === 'dia');
    const noche = worker.trioPeople?.find(p => p.turno === 'noche');
    const desc  = worker.trioPeople?.find(p => p.turno === 'descanso');

    return (
        <div className={`fp-card${soon ? ' proximo' : ''}`} onClick={() => onDetail && onDetail(worker)}>
            {soon && <div className="fp-card-franja" />}

            {/* Encabezado */}
            <div className="fp-card-top fp-card-top-trio">
                <div className="fp-card-rol-fila">
                    <span className="fp-card-rol">{worker.role}</span>
                    <span className="fp-turno-chip fp-turno-trio">TRÍO</span>
                </div>
                <div className="fp-card-fechas fp-card-fechas-trio">
                    <span className="fp-card-rango">{worker.in} – {worker.out}</span>
                    {soon ? <RemainingBadge remaining={worker.remaining} /> : <DaysBadge days={worker.days} total={worker.total} />}
                </div>
            </div>

            {/* Tres personas */}
            <div className="fp-trio">
                {[
                    { person: dia,   turno: 'dia',      label: 'DÍA',      icon: '☀' },
                    { person: noche, turno: 'noche',    label: 'NOCHE',    icon: '🌙' },
                    { person: desc,  turno: 'descanso', label: 'DESCANSO', icon: '💤' },
                ].map(({ person, turno, label, icon }) => (
                    <div key={label} className={`fp-trio-fila fp-turno-${turno}`}>
                        <span className="fp-trio-turno">{icon} {label}</span>
                        <span className="fp-trio-nombre">{person?.name || '—'}</span>
                    </div>
                ))}
            </div>

            <ProgressBar value={worker.days} total={worker.total} color={soon ? COLORS.yellow : COLORS.violet} />

            {/* Botones de cambio rápido */}
            <div className="fp-trio-botones">
                <button className="fp-trio-btn fp-trio-btn-noche" title="Intercambiar NOCHE con DESCANSO (06:00 auto)"
                    onClick={e => { e.stopPropagation(); onTrioNightSwap && onTrioNightSwap(worker); }}>
                    {Icon.swap(10, '#3b82f6')} 🌙↔💤
                </button>
                <button className="fp-trio-btn fp-trio-btn-dia" title="Intercambiar DÍA con NOCHE (18:00 auto)"
                    onClick={e => { e.stopPropagation(); onTrioDayNightSwap && onTrioDayNightSwap(worker); }}>
                    {Icon.swap(10, '#4ade80')} ☀↔🌙
                </button>
                <CyclePill cycle={worker.cycle} onClick={() => onCycleClick && onCycleClick(worker)} />
            </div>
        </div>
    );
}

function WorkerDetailModal({ open, worker, soon, onClose, onEdit, onDelete, onSwap, onCopy, onShare, onCycleClick }) {
    if (!worker) return <ModalShell open={open} onClose={onClose}><div /></ModalShell>;

    const pct = Math.min(100, (worker.days / worker.total) * 100);
    const editar   = () => { onClose(); setTimeout(() => onEdit && onEdit(worker), 180); };
    const eliminar = () => { onClose(); setTimeout(() => onDelete && onDelete(worker), 180); };

    // Botones de abajo (Editar, Copiar, Compartir, Eliminar): cada uno con su color
    const acciones = lista => (
        <div className={`fp-det-acciones fp-det-acciones-${lista.length}`}>
            {lista.map(({ icon, label, tono, action }) => (
                <button key={label} className={`fp-det-accion fp-tono-${tono}`} onClick={action}>
                    {icon}
                    <span className="fp-det-accion-label">{label}</span>
                </button>
            ))}
        </div>
    );

    // Barra de avance del ciclo con su porcentaje
    const progreso = (
        <div className="fp-det-progreso">
            <div className="fp-det-progreso-top">
                {soon ? <RemainingBadge remaining={worker.remaining} /> : <DaysBadge days={worker.days} total={worker.total} />}
                <span className="fp-det-porcentaje">{pct.toFixed(0)}% del ciclo</span>
            </div>
            <div className="fp-det-barra">
                {/* El ancho depende del avance: único estilo en línea */}
                <div className="fp-det-barra-relleno" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );

    // Fila de dato: función (no componente) para no recrearla en cada render
    const fila = (label, value) => (
        <div className="fp-det-fila">
            <span className="fp-det-fila-label">{label}</span>
            <span className="fp-det-fila-valor">{value}</span>
        </div>
    );

    /* ── Vista para registros trío ── */
    if (worker.isTrio) {
        const dia   = worker.trioPeople?.find(p => p.turno === 'dia');
        const noche = worker.trioPeople?.find(p => p.turno === 'noche');
        const desc  = worker.trioPeople?.find(p => p.turno === 'descanso');
        return (
            <ModalShell open={open} onClose={onClose}>
                <div className={`fp-det ${soon ? 'fp-acento-amarillo' : 'fp-acento-violeta'}`}>
                    <div className="fp-det-banda" />
                    <div className="fp-det-cuerpo fp-det-cuerpo-trio">
                        {/* Header */}
                        <div className="fp-det-header fp-det-header-trio">
                            <div className="fp-det-avatar fp-det-avatar-trio">👥</div>
                            <div className="fp-det-identidad">
                                <div className="fp-det-rol-fila">
                                    <span className="fp-det-rol">{worker.role}</span>
                                    <span className="fp-turno-chip fp-turno-trio fp-det-chip">TRÍO</span>
                                </div>
                                <div className="fp-det-nombre-trio">Puesto de 3 Personas</div>
                            </div>
                            <button className="fp-icono-btn fp-det-cerrar" onClick={onClose}>{Icon.close(12, COLORS.textMute)}</button>
                        </div>
                        {progreso}
                        {/* 3 personas */}
                        <div className="fp-det-trio">
                            {[
                                { person: dia,   turno: 'dia',      label: 'DÍA',      icon: '☀' },
                                { person: noche, turno: 'noche',    label: 'NOCHE',    icon: '🌙' },
                                { person: desc,  turno: 'descanso', label: 'DESCANSO', icon: '💤' },
                            ].map(({ person, turno, label, icon }) => (
                                <div key={label} className={`fp-det-trio-fila fp-turno-${turno}`}>
                                    <div className="fp-det-trio-icono">{icon}</div>
                                    <div className="fp-opcion-info">
                                        <div className="fp-det-trio-turno">{label}</div>
                                        <div className="fp-det-trio-nombre">{person?.name || '—'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Info */}
                        <div className="fp-det-info-trio">
                            {[{ label: 'Ingreso', val: worker.in }, { label: 'Salida est.', val: worker.out }, { label: 'Ciclo', val: worker.cycle }].map(({ label, val }) => (
                                <div key={label} className="fp-det-fila fp-det-fila-trio">
                                    <span className="fp-det-fila-label">{label}</span>
                                    <span className="fp-det-fila-valor">{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {acciones([
                        { icon: Icon.edit(17, COLORS.blue),    label: 'Editar',    tono: 'azul',    action: editar },
                        { icon: Icon.share(17, COLORS.violet), label: 'Compartir', tono: 'violeta', action: () => { onShare && onShare(worker); } },
                        { icon: Icon.trash(17, COLORS.red),    label: 'Eliminar',  tono: 'rojo',    action: eliminar },
                    ])}
                </div>
            </ModalShell>
        );
    }

    const initials = worker.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const backInitials = (worker.back || '').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    return (
        <ModalShell open={open} onClose={onClose}>
            <div className={`fp-det ${soon ? 'fp-acento-amarillo' : 'fp-acento-verde'}`}>
                {/* Banda de color superior */}
                <div className="fp-det-banda" />

                <div className="fp-det-cuerpo">
                    {/* Cabecera */}
                    <div className="fp-det-header">
                        <div className="fp-det-avatar">{initials}</div>
                        <div className="fp-det-identidad">
                            <div className="fp-det-rol fp-det-rol-solo">{worker.role}</div>
                            <div className="fp-det-nombre">{worker.name}</div>
                        </div>
                        <button className="fp-icono-btn fp-det-cerrar" onClick={onClose}>{Icon.close(12, COLORS.textMute)}</button>
                    </div>

                    {progreso}

                    {/* Filas de info */}
                    <div className="fp-det-info">
                        {fila('Ingreso', worker.in)}
                        {fila('Salida estimada', worker.out)}
                        {fila('Ciclo', (
                            <button className="fp-det-ciclo" onClick={() => { onClose(); setTimeout(() => onCycleClick && onCycleClick(worker), 180); }}>
                                {worker.cycle}
                                {Icon.chevDown(8, COLORS.textMute)}
                            </button>
                        ))}
                        <div className="fp-det-fila fp-det-fila-back">
                            <span className="fp-det-fila-label">Back / Relevo</span>
                            <div className="fp-det-back">
                                <div className="fp-det-back-avatar">{backInitials}</div>
                                <span className="fp-det-fila-valor">{worker.back}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botón cambio de turno (siempre visible) */}
                <div className="fp-det-rotar-caja">
                    <button className={`fp-det-rotar${soon ? ' proximo' : ''}`} onClick={() => { onClose(); setTimeout(() => onSwap && onSwap(worker), 180); }}>
                        {Icon.swap(13, soon ? COLORS.yellow : COLORS.textMute)}
                        Cambiar turno / Rotar
                    </button>
                </div>

                {acciones([
                    { icon: Icon.edit(17, COLORS.blue),    label: 'Editar',    tono: 'azul',    action: editar },
                    { icon: Icon.copy(17, COLORS.green),   label: 'Copiar',    tono: 'verde',   action: () => { onCopy && onCopy(worker); } },
                    { icon: Icon.share(17, COLORS.violet), label: 'Compartir', tono: 'violeta', action: () => { onShare && onShare(worker); } },
                    { icon: Icon.trash(17, COLORS.red),    label: 'Eliminar',  tono: 'rojo',    action: eliminar },
                ])}
            </div>
        </ModalShell>
    );
}

function SectionHeader({ label, count, dot, alert }) {
    return (
        <div className="fp-seccion">
            {/* El color del punto depende de la sección */}
            <span className="fp-seccion-punto" style={{ '--punto-color': dot }} />
            <span className={`fp-seccion-label${alert ? ' alerta' : ''}`}>{label}</span>
            <span className="fp-seccion-conteo">{count}</span>
            <div className="fp-seccion-linea" />
        </div>
    );
}

// ── Modals ──────────────────────────────────────────────
function ModalShell({ open, onClose, children }) {
    return (
        <div className={`fp-modal${open ? ' abierto' : ''}`}>
            <div className="fp-modal-fondo" onClick={onClose} />
            <div className="fp-modal-caja">{children}</div>
        </div>
    );
}

function DeleteModal({ open, worker, onClose, onConfirm }) {
    return (
        <ModalShell open={open} onClose={onClose}>
            <div className="fp-panel">
                <div className="fp-panel-icono fp-panel-icono-peligro">
                    {Icon.trash(20, COLORS.red)}
                </div>
                <div className="fp-panel-titulo fp-panel-titulo-grande">¿Eliminar funcionario?</div>
                <div className="fp-panel-texto">
                    Esta acción no se puede deshacer. Se removerán los registros de turno asociados.
                </div>
                {worker && (
                    <div className="fp-panel-persona">
                        <div className="fp-panel-persona-rol">{worker.role.toUpperCase()}</div>
                        <div className="fp-panel-persona-nombre">{worker.name}</div>
                    </div>
                )}
                <div className="fp-botones">
                    <button className="fp-btn fp-btn-sec" onClick={onClose}>Cancelar</button>
                    <button className="fp-btn fp-btn-peligro" onClick={onConfirm}>Eliminar</button>
                </div>
            </div>
        </ModalShell>
    );
}

const SWAP_OPTS = [
    { id: 'full', title: 'Confirmar cambio completo', desc: 'Ambos funcionarios se intercambian. El saliente queda en descanso y el back entra en turno activo.' },
    { id: 'partial', title: 'Solo registrar ingreso del back', desc: 'El back entra en campo. El saliente continúa registrado hasta confirmar su salida.' },
];

function SwapModal({ open, worker, onClose, onConfirm }) {
    const [choice, setChoice] = useState('full');

    useEffect(() => { if (open) setChoice('full'); }, [open]);

    if (!worker) return <ModalShell open={open} onClose={onClose}><div /></ModalShell>;

    return (
        <ModalShell open={open} onClose={onClose}>
            <div className="fp-panel">
                <div className="fp-modal-top">
                    <div className="fp-modal-top-info">
                        <div className="fp-modal-top-icono fp-modal-top-icono-amarillo">{Icon.swap(16, COLORS.yellow)}</div>
                        <div>
                            <div className="fp-panel-titulo">Cambio de turno</div>
                            <div className="fp-lista-sub">{worker.name}</div>
                        </div>
                    </div>
                    <button className="fp-icono-btn" onClick={onClose}>{Icon.close(12, COLORS.textMute)}</button>
                </div>
                {SWAP_OPTS.map(o => (
                    <button key={o.id} className={`fp-radio-opcion${choice === o.id ? ' elegida' : ''}`} onClick={() => setChoice(o.id)}>
                        <div className="fp-radio">{choice === o.id && Icon.check(10, '#fff')}</div>
                        <div className="fp-opcion-info">
                            <div className="fp-radio-titulo">{o.title}</div>
                            <div className="fp-radio-desc">{o.desc}</div>
                        </div>
                    </button>
                ))}
                <div className="fp-botones fp-botones-separados">
                    <button className="fp-btn fp-btn-sec" onClick={onClose}>Cancelar</button>
                    <button className="fp-btn fp-btn-primario fp-btn-principal" onClick={() => onConfirm(choice)}>Confirmar</button>
                </div>
            </div>
        </ModalShell>
    );
}

function SwapModal3({ open, group, onClose, onConfirm }) {
    const [choice, setChoice] = useState('dia');

    useEffect(() => { if (open) setChoice('dia'); }, [open]);

    if (!group) return <ModalShell open={open} onClose={onClose}><div /></ModalShell>;

    const { backWorker, dayWorker, nightWorker } = group;
    const opts = [
        { id: 'dia',   label: dayWorker.name,   sub: 'Persona de día → pasa a descanso',   icon: '☀' },
        { id: 'noche', label: nightWorker.name,  sub: 'Persona de noche → pasa a descanso', icon: '🌙' },
    ];

    return (
        <ModalShell open={open} onClose={onClose}>
            <div className="fp-panel">
                <div className="fp-modal-top">
                    <div className="fp-modal-top-info">
                        <div className="fp-modal-top-icono fp-modal-top-icono-amarillo">{Icon.swap(16, COLORS.yellow)}</div>
                        <div>
                            <div className="fp-panel-titulo">Intercambio de turno</div>
                            <div className="fp-lista-sub">{backWorker.name} — Descanso</div>
                        </div>
                    </div>
                    <button className="fp-icono-btn" onClick={onClose}>{Icon.close(12, COLORS.textMute)}</button>
                </div>
                <div className="fp-modal-pregunta">¿Con quién desea intercambiar?</div>
                {opts.map(o => (
                    <button key={o.id} className={`fp-radio-opcion fp-turno-${o.id}${choice === o.id ? ' elegida' : ''}`} onClick={() => setChoice(o.id)}>
                        <div className="fp-radio">{choice === o.id && Icon.check(10, '#fff')}</div>
                        <div className="fp-opcion-info">
                            <div className="fp-radio-titulo">{o.icon} {o.label}</div>
                            <div className="fp-radio-desc fp-radio-desc-corta">{o.sub}</div>
                        </div>
                    </button>
                ))}
                <div className="fp-botones fp-botones-juntos">
                    <button className="fp-btn fp-btn-sec" onClick={onClose}>Cancelar</button>
                    <button className="fp-btn fp-btn-primario fp-btn-principal" onClick={() => onConfirm(choice)}>Confirmar</button>
                </div>
            </div>
        </ModalShell>
    );
}

function CycleModal({ open, worker, onClose, onConfirm }) {
    const [sel, setSel] = useState('15-15');

    useEffect(() => { if (open && worker) setSel(worker.cycle); }, [open, worker]);

    if (!worker) return <ModalShell open={open} onClose={onClose}><div /></ModalShell>;

    const opts = [
        { id: '14-7',  label: '14 / 7 días',  desc: '14 días en campo, 7 de descanso' },
        { id: '14-14', label: '14 / 14 días', desc: '14 días en campo, 14 de descanso' },
        { id: '15-15', label: '15 / 15 días', desc: '15 días en campo, 15 de descanso' },
        { id: '20-10', label: '20 / 10 días', desc: '20 días en campo, 10 de descanso' },
        { id: '30',    label: '30 días',       desc: 'Turno corrido de 30 días' },
    ];

    return (
        <ModalShell open={open} onClose={onClose}>
            <div className="fp-panel">
                <div className="fp-panel-titulo">Ciclo de turno</div>
                <div className="fp-panel-sub">{worker.name}</div>
                {opts.map(o => (
                    <button key={o.id} className={`fp-opcion${sel === o.id ? ' elegida' : ''}`} onClick={() => setSel(o.id)}>
                        <div className="fp-opcion-info">
                            <div className="fp-opcion-titulo">{o.label}</div>
                            <div className="fp-opcion-desc">{o.desc}</div>
                        </div>
                        {sel === o.id && <div className="fp-opcion-check">{Icon.check(10, '#fff')}</div>}
                    </button>
                ))}
                <button className="fp-btn fp-btn-primario fp-btn-ancho" onClick={() => onConfirm(sel)}>Aplicar ciclo</button>
            </div>
        </ModalShell>
    );
}

function CountListModal({ open, onClose, kind, items }) {
    const isActive = kind === 'active';
    const accent = isActive ? COLORS.green : COLORS.violet;
    const title = isActive ? 'En turno activo' : 'En descanso o vacaciones';
    const subtitle = isActive ? 'Funcionarios actualmente en campo' : 'Backs y relevos fuera de turno';
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        const header = `${title} (${items.length})`;
        const body = items.map(p => `• ${p.name}  ·  ${p.role}${p.meta ? `  ·  ${p.meta}` : ''}`).join('\n');
        const text = `${header}\n\n${body}`;
        const doShare = () => {
            if (navigator.share) {
                navigator.share({ title, text }).catch(() => {});
            } else {
                navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                }).catch(() => {});
            }
        };
        doShare();
    };

    return (
        <ModalShell open={open} onClose={onClose}>
            {/* .fp-lista-activos (verde) / .fp-lista-libres (morado) definen el color de acento */}
            <div className={`fp-panel fp-lista ${isActive ? 'fp-lista-activos' : 'fp-lista-libres'}`}>
                <div className="fp-lista-header">
                    <div className="fp-lista-icono"><span className="fp-lista-icono-punto" /></div>
                    <div className="fp-lista-titulos">
                        <div className="fp-panel-titulo">{title}</div>
                        <div className="fp-lista-sub">{subtitle}</div>
                    </div>
                    <div className="fp-lista-total">{items.length}</div>
                    <button className={`fp-icono-btn${copied ? ' copiado' : ''}`} onClick={handleShare} title="Compartir lista">
                        {copied ? Icon.check(13, accent) : Icon.share(13, COLORS.textMute)}
                    </button>
                    <button className="fp-icono-btn" onClick={onClose}>
                        {Icon.close(12, COLORS.textMute)}
                    </button>
                </div>
                <div className="fp-scroll fp-lista-scroll">
                    {items.length === 0 ? (
                        <div className="fp-vacio">No hay funcionarios en esta categoría.</div>
                    ) : (
                        <div className="fp-lista-items">
                            {items.map((p, i) => (
                                <div key={i} className="fp-lista-item">
                                    <div className="fp-lista-avatar">{p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                                    <div className="fp-lista-persona">
                                        <div className="fp-lista-nombre">{p.name}</div>
                                        <div className="fp-lista-rol">{p.role}</div>
                                    </div>
                                    {p.meta && <div className="fp-lista-meta">{p.meta}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ModalShell>
    );
}

function ImportModal({ open, onClose, onConfirm }) {
    const fileRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) { setPreview(null); setError(''); }
    }, [open]);

    const cols = [
        { name: 'nombre_completo', ex: 'Marcelo Quintero Ríos' },
        { name: 'cargo',           ex: 'Operador de Planta' },
    ];

    const downloadTemplate = async () => {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.aoa_to_sheet([
            ['nombre_completo', 'cargo'],
            ['Marcelo Quintero Ríos', 'Operador de Planta'],
            ['Andrea Cifuentes Mora', 'Supervisora de Pozo'],
            ['Joaquín Bermúdez Lara', 'Técnico Electromecánico'],
        ]);
        ws['!cols'] = [{ wch: 30 }, { wch: 28 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Funcionarios');
        XLSX.writeFile(wb, 'plantilla_funcionarios.xlsx');
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        e.target.value = '';
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const XLSX = await import('xlsx');
                const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                const valid = rows.filter(r => r.nombre_completo && r.cargo);
                if (valid.length === 0) { setError('No se encontraron datos válidos. Verifica los encabezados.'); setPreview(null); }
                else { setPreview(valid); setError(''); }
            } catch {
                setError('No se pudo leer el archivo. Usa la plantilla proporcionada.');
                setPreview(null);
            }
        };
        reader.readAsArrayBuffer(f);
    };

    const handleConfirm = () => {
        if (!preview || preview.length === 0) { fileRef.current?.click(); return; }
        const todayISO = new Date().toISOString().split('T')[0];
        const workers = preview.map(row => ({
            id: Date.now() + Math.random(),
            name: String(row.nombre_completo).trim(),
            role: String(row.cargo).trim(),
            cycle: '15-15', total: 15, days: 1,
            in: fmtDate(todayISO),
            out: calcOutDate(todayISO, 15),
            inDateISO: todayISO,
            back: 'Pendiente',
        }));
        onConfirm(workers);
    };

    return (
        <ModalShell open={open} onClose={onClose}>
            <div className="fp-panel fp-panel-compacto">
                {/* Encabezado */}
                <div className="fp-imp-top">
                    <div className="fp-imp-top-icono">{Icon.upload(14, COLORS.green)}</div>
                    <div className="fp-opcion-info">
                        <div className="fp-imp-titulo">Importar funcionarios</div>
                        <div className="fp-imp-sub">Excel .xlsx — primera fila = encabezados</div>
                    </div>
                    <button className="fp-icono-btn fp-icono-btn-chico" onClick={onClose}>{Icon.close(11, COLORS.textMute)}</button>
                </div>

                {/* Columnas */}
                <div className="fp-imp-label">COLUMNAS REQUERIDAS</div>
                <div className="fp-imp-columnas">
                    {cols.map(c => (
                        <div key={c.name} className="fp-imp-columna">
                            <span className="fp-imp-col-nombre">{c.name}</span>
                            <span className="fp-imp-col-ejemplo">{c.ex}</span>
                        </div>
                    ))}
                </div>

                {/* Nota */}
                <div className="fp-imp-nota">
                    Ciclo por defecto <b>15-15</b>. Fecha de ingreso = hoy.
                    El back se asigna después editando cada registro.
                </div>

                {/* Zona de archivo o vista previa */}
                <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={handleFileChange} />
                {preview ? (
                    <div className="fp-imp-preview">
                        <div className="fp-imp-preview-titulo">
                            {preview.length} REGISTRO{preview.length !== 1 ? 'S' : ''} LISTOS PARA IMPORTAR
                        </div>
                        {preview.slice(0, 3).map((r, i) => (
                            <div key={i} className="fp-imp-preview-fila">{r.nombre_completo} — {r.cargo}</div>
                        ))}
                        {preview.length > 3 && <div className="fp-imp-preview-mas">+{preview.length - 3} más…</div>}
                        <button className="fp-imp-cambiar" onClick={() => { setPreview(null); fileRef.current?.click(); }}>Cambiar archivo</button>
                    </div>
                ) : (
                    <button className="fp-imp-elegir" onClick={() => fileRef.current?.click()}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 16V4M12 4l-4 4M12 4l4 4M5 20h14" stroke={COLORS.textMute} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Seleccionar archivo .xlsx
                    </button>
                )}
                {error && <div className="fp-imp-error">{error}</div>}

                {/* Plantilla */}
                <button className="fp-imp-plantilla" onClick={downloadTemplate}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4v12M12 16l-4-4M12 16l4-4M5 20h14" stroke={COLORS.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Descargar plantilla .xlsx
                </button>

                {/* Botones */}
                <div className="fp-botones">
                    <button className="fp-btn fp-btn-sec fp-btn-chico" onClick={onClose}>Cancelar</button>
                    <button className={`fp-btn fp-btn-chico fp-btn-principal fp-imp-confirmar${preview ? ' listo' : ''}`} onClick={handleConfirm}>
                        {Icon.upload(13, preview ? '#0a2010' : COLORS.green)}
                        {preview ? `Importar ${preview.length}` : 'Seleccionar archivo'}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

// ── Header ──────────────────────────────────────────────
function PageHeader({ onBack, controlsOpen, onToggleControls }) {
    return (
        <div className="fp-header">
            <button className="fp-header-btn" onClick={onBack}>{Icon.back(16, '#cfcfcf')}</button>
            <div className="fp-header-titulo">FLUJOS</div>
            <button className={`fp-header-btn fp-header-controles${controlsOpen ? ' activo' : ''}`} onClick={onToggleControls} title="Controles">
                {Icon.sliders(15, controlsOpen ? COLORS.violet : '#cfcfcf')}
            </button>
        </div>
    );
}

// ── Search bar ──────────────────────────────────────────
function SearchBar({ value, onChange, onImport, activeCount = 0, freeCount = 0, onActiveClick, onFreeClick }) {
    const [open, setOpen] = useState(false);
    const [focus, setFocus] = useState(false);
    const inputRef = useRef(null);
    const expanded = open || !!value || focus;

    const handleBlur = () => {
        setFocus(false);
        if (!value) setOpen(false);
    };

    return (
        <div className="fp-busqueda">
            <button className="fp-contador fp-contador-activos" title="En turno activo" onClick={onActiveClick}>
                <span className="fp-contador-punto" />
                <span className="fp-contador-num">{activeCount}</span>
                <span className="fp-contador-label">activos</span>
            </button>
            <button className="fp-contador fp-contador-libres" title="En descanso o vacaciones" onClick={onFreeClick}>
                <span className="fp-contador-punto" />
                <span className="fp-contador-num">{freeCount}</span>
                <span className="fp-contador-label">libres</span>
            </button>
            {/* Se expande al tocar la lupa o al escribir */}
            <div className={`fp-buscar${expanded ? ' expandido' : ''}${focus ? ' foco' : ''}`}
                onClick={() => { if (!expanded) setOpen(true); }}>
                <div className="fp-buscar-lupa">
                    {Icon.search(16, focus ? COLORS.violet : COLORS.textMute)}
                </div>
                <input
                    ref={inputRef}
                    className="fp-buscar-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => { setFocus(true); if (inputRef.current) inputRef.current.focus(); }}
                    onBlur={handleBlur}
                    placeholder="Buscar por nombre o cargo..."
                />
            </div>
            <button className="fp-importar" title="Importar" onClick={onImport}>
                {Icon.upload(15)}
            </button>
        </div>
    );
}

// ── Bottom nav ──────────────────────────────────────────
function BottomNav({ onHome }) {
    return (
        <div className="fp-nav">
            <button className="fp-nav-btn" onClick={onHome}>
                {Icon.home(20, COLORS.textMute)}
                <span className="fp-nav-label">Inicio</span>
            </button>
            <button className="fp-nav-btn activo">
                {Icon.flow(20, COLORS.violet)}
                <span className="fp-nav-label">Flujos</span>
            </button>
        </div>
    );
}

// ── Add Worker Modal ────────────────────────────────────
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const fmtDate = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${parseInt(d)} ${MESES[parseInt(m) - 1]} ${y}`;
};
const calcOutDate = (iso, total) => {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + total - 1);
    return fmtDate(d.toISOString().split('T')[0]);
};
const CYCLE_TOTAL = { '14-7': 14, '14-14': 14, '15-15': 15, '20-10': 20, '30': 30 };

function AddWorkerModal({ open, onClose, onAdd, onAddTrio, editData, onEdit }) {
    const todayISO = new Date().toISOString().split('T')[0];
    const EMPTY_DUO  = { name: '', role: '', cycle: '15-15', inDate: todayISO, back: '', days: String(daysSince(todayISO)), turno: 'dia' };
    const EMPTY_TRIO = { role: '', nameDia: '', nameNoche: '', nameBack: '', cycle: '15-15', inDate: todayISO, days: String(daysSince(todayISO)) };

    const [mode, setMode]       = useState('duo');
    const [form, setForm]       = useState(EMPTY_DUO);
    const [trioForm, setTrio]   = useState(EMPTY_TRIO);
    const [error, setError]     = useState('');

    useEffect(() => {
        if (!open) return;
        setMode('duo');
        setError('');
        const today = new Date().toISOString().split('T')[0];
        if (editData) {
            setForm({
                name: editData.name || '',
                role: editData.role || '',
                cycle: editData.cycle || '15-15',
                inDate: editData.inDateISO || today,
                back: editData.back || '',
                days: String(daysSince(editData.inDateISO) || 1),
                turno: editData.turno || 'dia',
            });
        } else {
            setForm({ ...EMPTY_DUO, inDate: today, days: String(daysSince(today)) });
            setTrio({ ...EMPTY_TRIO, inDate: today, days: String(daysSince(today)) });
        }
    }, [open, editData]);

    const setF = (k, v) => {
        setForm(f => {
            const next = { ...f, [k]: v };
            if (k === 'inDate' && v) next.days = String(daysSince(v));
            return next;
        });
        setError('');
    };
    const setTF = (k, v) => {
        setTrio(f => {
            const next = { ...f, [k]: v };
            if (k === 'inDate' && v) next.days = String(daysSince(v));
            return next;
        });
        setError('');
    };

    const handleSubmitDuo = () => {
        if (!form.name.trim() || !form.role.trim() || !form.inDate || !form.back.trim()) {
            setError('Completa todos los campos obligatorios');
            return;
        }
        const total = CYCLE_TOTAL[form.cycle];
        const days = Math.min(Math.max(parseInt(form.days) || 1, 1), total);
        const worker = {
            ...(editData || {}),
            id: editData ? editData.id : Date.now(),
            name: form.name.trim(), role: form.role.trim(), cycle: form.cycle,
            total, days, in: fmtDate(form.inDate), out: calcOutDate(form.inDate, total),
            inDateISO: form.inDate, back: form.back.trim(), turno: form.turno || 'dia',
        };
        if (editData) { onEdit && onEdit(worker); }
        else { onAdd && onAdd(worker); }
    };

    const handleSubmitTrio = () => {
        if (!trioForm.role.trim() || !trioForm.nameDia.trim() || !trioForm.nameNoche.trim() || !trioForm.nameBack.trim()) {
            setError('Completa todos los campos obligatorios');
            return;
        }
        const total = CYCLE_TOTAL[trioForm.cycle];
        const days = Math.min(Math.max(parseInt(trioForm.days) || 1, 1), total);
        onAddTrio && onAddTrio({
            role: trioForm.role.trim(),
            nameDia: trioForm.nameDia.trim(),
            nameNoche: trioForm.nameNoche.trim(),
            nameBack: trioForm.nameBack.trim(),
            cycle: trioForm.cycle,
            inDate: trioForm.inDate,
            days,
        });
    };

    const lbl = (t) => <label className="fp-label">{t}</label>;
    // Ciclo y días: función (no componente) para que los campos no se
    // vuelvan a montar y pierdan el foco al escribir
    const cicloYDias = (vals, setter) => (
        <div className="fp-form-fila">
            <div className="fp-form-col">
                {lbl('CICLO *')}
                <select className="fp-input fp-select" value={vals.cycle} onChange={e => setter('cycle', e.target.value)}>
                    <option value="14-7">14 / 7 días</option>
                    <option value="14-14">14 / 14 días</option>
                    <option value="15-15">15 / 15 días</option>
                    <option value="20-10">20 / 10 días</option>
                    <option value="30">30 días</option>
                </select>
            </div>
            <div className="fp-form-col">
                {lbl('DÍAS EN TURNO')}
                <div className="fp-dias">
                    <input className="fp-input fp-dias-input" type="number" min="1" placeholder="1"
                        value={vals.days} onChange={e => setter('days', e.target.value)} />
                    <span className="fp-dias-auto">AUTO</span>
                </div>
            </div>
        </div>
    );

    return (
        <ModalShell open={open} onClose={onClose}>
            <div className="fp-panel">
                {/* Header */}
                <div className="fp-modal-top fp-modal-top-amplio">
                    <div className="fp-modal-top-info">
                        <div className="fp-modal-top-icono fp-modal-top-icono-violeta">{Icon.user(16, COLORS.violet)}</div>
                        <div>
                            <div className="fp-panel-titulo">{editData ? 'Editar funcionario' : 'Nuevo funcionario'}</div>
                            <div className="fp-lista-sub">{editData ? 'Actualizar datos del turno' : 'Agregar a turno activo'}</div>
                        </div>
                    </div>
                    <button className="fp-icono-btn" onClick={onClose}>{Icon.close(12, COLORS.textMute)}</button>
                </div>

                {/* Toggle modo — solo al crear */}
                {!editData && (
                    <div className="fp-modo">
                        {[{ id: 'duo', label: '2 personas' }, { id: 'trio', label: '3 personas' }].map(m => (
                            <button key={m.id} className={`fp-modo-btn${mode === m.id ? ' activo' : ''}`}
                                onClick={() => { setMode(m.id); setError(''); }}>{m.label}</button>
                        ))}
                    </div>
                )}

                {/* ── FORMULARIO DUO ── */}
                {mode === 'duo' && (
                    <>
                        <div className="fp-campo">
                            {lbl('NOMBRE COMPLETO *')}
                            <input className="fp-input" placeholder="Ej: Marcelo Quintero Ríos"
                                value={form.name} onChange={e => setF('name', e.target.value)} />
                        </div>
                        <div className="fp-campo">
                            {lbl('CARGO / ROL *')}
                            <input className="fp-input" placeholder="Ej: Operador de Planta"
                                value={form.role} onChange={e => setF('role', e.target.value)} />
                        </div>
                        <div className="fp-campo">
                            {lbl('FECHA DE INGRESO *')}
                            <input className="fp-input" type="date" value={form.inDate} onChange={e => setF('inDate', e.target.value)} />
                        </div>
                        {cicloYDias(form, setF)}
                        <div className="fp-campo">
                            {lbl('TURNO')}
                            <div className="fp-turnos">
                                {[
                                    { id: 'dia',      label: '☀ Día' },
                                    { id: 'noche',    label: '🌙 Noche' },
                                    { id: 'descanso', label: '💤 Descanso' },
                                ].map(t => (
                                    <button key={t.id} type="button" onClick={() => setF('turno', t.id)}
                                        className={`fp-turno-btn fp-turno-${t.id}${form.turno === t.id ? ' elegido' : ''}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="fp-campo fp-campo-ultimo">
                            {lbl('NOMBRE DEL RELEVO / BACK *')}
                            <input className="fp-input" placeholder="Ej: Rodrigo Salinas Vega"
                                value={form.back} onChange={e => setF('back', e.target.value)} />
                        </div>
                    </>
                )}

                {/* ── FORMULARIO TRIO ── */}
                {mode === 'trio' && (
                    <>
                        <div className="fp-campo">
                            {lbl('PUESTO / CARGO *')}
                            <input className="fp-input" placeholder="Ej: Analista de Supervisión"
                                value={trioForm.role} onChange={e => setTF('role', e.target.value)} />
                        </div>
                        {[
                            { turno: 'dia',      titulo: '☀ PERSONA DÍA *',     campo: 'nameDia' },
                            { turno: 'noche',    titulo: '🌙 PERSONA NOCHE *',   campo: 'nameNoche' },
                            { turno: 'descanso', titulo: '💤 BACK / DESCANSO *', campo: 'nameBack' },
                        ].map(({ turno, titulo, campo }) => (
                            <div key={campo} className={`fp-trio-campo fp-turno-${turno}`}>
                                <div className="fp-trio-campo-titulo">{titulo}</div>
                                <input className="fp-input" placeholder="Nombre completo"
                                    value={trioForm[campo]} onChange={e => setTF(campo, e.target.value)} />
                            </div>
                        ))}
                        <div className="fp-campo">
                            {lbl('FECHA DE INGRESO *')}
                            <input className="fp-input" type="date" value={trioForm.inDate} onChange={e => setTF('inDate', e.target.value)} />
                        </div>
                        {cicloYDias(trioForm, setTF)}
                    </>
                )}

                {error && <p className="fp-form-error">{error}</p>}

                <div className="fp-botones">
                    <button className="fp-btn fp-btn-sec" onClick={onClose}>Cancelar</button>
                    <button className="fp-btn fp-btn-primario fp-btn-principal" onClick={mode === 'trio' ? handleSubmitTrio : handleSubmitDuo}>
                        {editData ? 'Guardar cambios' : 'Agregar'}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

function Toast({ open, msg }) {
    return <div className={`fp-toast${open ? ' visible' : ''}`}>{msg}</div>;
}

// ── Page principal ──────────────────────────────────────
const FlujoPersonalPage = () => {
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [detailWorker, setDetailWorker] = useState(null);
    const [deleteFor, setDeleteFor] = useState(null);
    const [swapFor, setSwapFor] = useState(null);
    const [cycleFor, setCycleFor] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [countOpen, setCountOpen] = useState(null);
    const [swapFor3, setSwapFor3] = useState(null);
    const [active, setActive] = useState([]);
    const [soonList, setSoon] = useState([]);
    const [descansoList, setDescanso] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const autoSwapDoneRef = useRef(false);

    const reloadWorkers = () =>
        api.get('/flujo-workers').then(res => {
            const { active: a, soon: s } = classifyWorkers([...res.data.active, ...res.data.soon]);
            setActive(a);
            setSoon(s);
            setDescanso((res.data.descanso || []).map(fromApi));
        });

    useEffect(() => {
        reloadWorkers().catch(() => {}).finally(() => setLoading(false));
    }, []);

    // Auto-swap de tríos: NOCHE↔DESCANSO a las 06:00 y DÍA↔NOCHE a las 18:00
    useEffect(() => {
        if (loading || autoSwapDoneRef.current) return;
        autoSwapDoneRef.current = true;

        const hourECU = parseInt(
            new Date().toLocaleTimeString('es-EC', { hour: '2-digit', hour12: false, timeZone: 'America/Guayaquil' }), 10
        );
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
        const trioWorkers = [...active, ...soonList].filter(w => w.isTrio && w.trioPeople?.length === 3);
        if (!trioWorkers.length) return;

        (async () => {
            let anySwap = false;
            for (const worker of trioWorkers) {
                let people = worker.trioPeople.map(p => ({ ...p }));
                const upd = { lastMorningSwap: worker.lastMorningSwap, lastEveningSwap: worker.lastEveningSwap };
                let changed = false;
                if (hourECU >= 6 && worker.lastMorningSwap !== today) {
                    people = people.map(p =>
                        p.turno === 'noche' ? { ...p, turno: 'descanso' } :
                        p.turno === 'descanso' ? { ...p, turno: 'noche' } : p
                    );
                    upd.lastMorningSwap = today;
                    changed = true;
                }
                if (hourECU >= 18 && worker.lastEveningSwap !== today) {
                    people = people.map(p =>
                        p.turno === 'dia' ? { ...p, turno: 'noche' } :
                        p.turno === 'noche' ? { ...p, turno: 'dia' } : p
                    );
                    upd.lastEveningSwap = today;
                    changed = true;
                }
                if (changed) {
                    await api.put(`/flujo-workers/${worker.id}`, { ...worker, ...upd, trioPeople: people });
                    anySwap = true;
                }
            }
            if (anySwap) {
                await reloadWorkers();
                showToast('Cambio de turno automático aplicado');
            }
        })().catch(() => {});
    }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps
    const [controlsOpen, setControlsOpen] = useState(false);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 1800);
    };

    const filter = (list) => list.filter(w =>
        !search ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.role.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async () => {
        if (!deleteFor) return;
        try {
            await api.delete(`/flujo-workers/${deleteFor.id}`);
            setActive(a => a.filter(w => w.id !== deleteFor.id));
            setSoon(s => s.filter(w => w.id !== deleteFor.id));
            showToast(`${deleteFor.name.split(' ')[0]} eliminado`);
        } catch {
            showToast('Error al eliminar');
        }
        setDeleteFor(null);
    };

    const handleSwap = async (mode) => {
        if (mode === 'full') {
            const total = CYCLE_TOTAL[swapFor.cycle];
            const todayISO = new Date().toISOString().split('T')[0];
            try {
                // Crear primero → si falla, el saliente sigue en el sistema (no se pierde)
                const res = await api.post('/flujo-workers', {
                    name: swapFor.back,
                    role: swapFor.role,
                    cycle: swapFor.cycle,
                    total,
                    days: 1,
                    inDateISO: todayISO,
                    back: swapFor.name,
                    status: 'active',
                    turno: swapFor.turno || 'dia',
                });
                await api.delete(`/flujo-workers/${swapFor.id}`);
                setSoon(s => s.filter(w => w.id !== swapFor.id));
                setActive(a => [...a.filter(w => w.id !== swapFor.id), fromApi(res.data.worker)]);
                showToast(`Cambio de ${swapFor.name.split(' ')[0]} confirmado`);
            } catch {
                showToast('Error al realizar el cambio');
            }
        } else {
            showToast('Ingreso del back registrado');
        }
        setSwapFor(null);
    };

    const handleTurnoSwap = async (worker) => {
        const allWorkers = [...active, ...soonList];
        const sibling = allWorkers.find(w =>
            w.id !== worker.id &&
            w.role.trim().toLowerCase() === worker.role.trim().toLowerCase() &&
            (w.turno === 'dia' || w.turno === 'noche')
        );
        const newTurno = worker.turno === 'dia' ? 'noche' : 'dia';
        try {
            await api.put(`/flujo-workers/${worker.id}`, { ...worker, turno: newTurno });
            if (sibling) {
                const siblingNewTurno = sibling.turno === 'dia' ? 'noche' : 'dia';
                await api.put(`/flujo-workers/${sibling.id}`, { ...sibling, turno: siblingNewTurno });
            }
            const applySwap = list => list.map(w => {
                if (w.id === worker.id) return { ...w, turno: newTurno };
                if (sibling && w.id === sibling.id) return { ...w, turno: sibling.turno === 'dia' ? 'noche' : 'dia' };
                return w;
            });
            setActive(applySwap);
            setSoon(applySwap);
            showToast(`Turno cambiado a ${newTurno}`);
        } catch {
            showToast('Error al cambiar turno');
        }
    };

    const handleToLibre = async (worker) => {
        try {
            await api.delete(`/flujo-workers/${worker.id}`);
            setDescanso(d => d.filter(w => w.id !== worker.id));
            showToast(`${worker.name.split(' ')[0]} pasó a libre`);
        } catch {
            showToast('Error al actualizar');
        }
    };

    const handleCycle = async (cycle) => {
        const total = CYCLE_TOTAL[cycle];
        const worker = [...active, ...soonList].find(w => w.id === cycleFor.id);
        if (!worker) { setCycleFor(null); return; }
        try {
            await api.put(`/flujo-workers/${cycleFor.id}`, { ...worker, cycle, total });
            setActive(a => a.map(w => w.id === cycleFor.id ? { ...w, cycle, total } : w));
            setSoon(s => s.map(w => w.id === cycleFor.id ? { ...w, cycle, total } : w));
            showToast(`Ciclo actualizado a ${cycle}`);
        } catch {
            showToast('Error al actualizar ciclo');
        }
        setCycleFor(null);
    };

    const handleAdd = async (worker) => {
        try {
            const res = await api.post('/flujo-workers', {
                name: worker.name,
                role: worker.role,
                cycle: worker.cycle,
                total: worker.total,
                days: worker.days,
                inDateISO: worker.inDateISO,
                back: worker.back,
                status: 'active',
                turno: worker.turno || 'dia',
            });
            const saved = fromApi(res.data.worker);
            if (saved.turno === 'descanso') {
                setDescanso(d => [...d, saved]);
            } else {
                setActive(a => [...a, saved]);
            }
            setAddOpen(false);
            showToast(`${worker.name.split(' ')[0]} agregado`);
        } catch {
            showToast('Error al guardar');
        }
    };

    const handleAddTrio = async ({ role, nameDia, nameNoche, nameBack, cycle, inDate, days }) => {
        const total = CYCLE_TOTAL[cycle];
        try {
            await api.post('/flujo-workers', {
                name: nameDia, role, cycle, total, days,
                inDateISO: inDate, back: nameBack, status: 'active', turno: 'dia',
                isTrio: true,
                trioPeople: [
                    { name: nameDia,   turno: 'dia' },
                    { name: nameNoche, turno: 'noche' },
                    { name: nameBack,  turno: 'descanso' },
                ],
            });
            await reloadWorkers();
            setAddOpen(false);
            showToast('Puesto de 3 personas registrado');
        } catch {
            showToast('Error al registrar');
        }
    };

    const handleTrioNightSwap = async (worker) => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
        const newPeople = (worker.trioPeople || []).map(p =>
            p.turno === 'noche' ? { ...p, turno: 'descanso' } :
            p.turno === 'descanso' ? { ...p, turno: 'noche' } : p
        );
        try {
            await api.put(`/flujo-workers/${worker.id}`, { ...worker, trioPeople: newPeople, lastMorningSwap: today });
            await reloadWorkers();
            showToast('Cambio 🌙↔💤 aplicado');
        } catch {
            showToast('Error al cambiar turno');
        }
    };

    const handleTrioDayNightSwap = async (worker) => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
        const newPeople = (worker.trioPeople || []).map(p =>
            p.turno === 'dia' ? { ...p, turno: 'noche' } :
            p.turno === 'noche' ? { ...p, turno: 'dia' } : p
        );
        try {
            await api.put(`/flujo-workers/${worker.id}`, { ...worker, trioPeople: newPeople, lastEveningSwap: today });
            await reloadWorkers();
            showToast('Cambio ☀↔🌙 aplicado');
        } catch {
            showToast('Error al cambiar turno');
        }
    };

    const handleSwap3 = async (targetTurno) => {
        if (!swapFor3) return;
        const { backWorker, dayWorker, nightWorker } = swapFor3;
        const targetWorker = targetTurno === 'dia' ? dayWorker : nightWorker;
        try {
            await Promise.all([
                api.put(`/flujo-workers/${backWorker.id}`,   { ...backWorker,   turno: targetTurno }),
                api.put(`/flujo-workers/${targetWorker.id}`, { ...targetWorker, turno: 'descanso' }),
            ]);
            await reloadWorkers();
            showToast(`${backWorker.name.split(' ')[0]} pasa a ${targetTurno === 'dia' ? 'día' : 'noche'}`);
        } catch {
            showToast('Error al intercambiar');
        }
        setSwapFor3(null);
    };

    const handleEdit = async (updated) => {
        try {
            const res = await api.put(`/flujo-workers/${updated.id}`, {
                name: updated.name,
                role: updated.role,
                cycle: updated.cycle,
                total: updated.total,
                days: updated.days,
                inDateISO: updated.inDateISO,
                back: updated.back,
                status: updated.status || 'active',
                remaining: updated.remaining ?? null,
            });
            const saved = fromApi(res.data.worker);
            setActive(a => a.map(w => w.id === saved.id ? saved : w));
            setSoon(s => s.map(w => w.id === saved.id ? saved : w));
            setEditData(null);
            setAddOpen(false);
            showToast(`${saved.name.split(' ')[0]} actualizado`);
        } catch {
            showToast('Error al actualizar');
        }
    };

    const handleCopy = (worker) => {
        const text = [
            worker.name,
            worker.role,
            `Ingreso: ${worker.in}  ·  Salida: ${worker.out}`,
            `Ciclo: ${worker.cycle}  ·  Día ${worker.days}/${worker.total}`,
            `Relevo: ${worker.back}`,
        ].join('\n');
        navigator.clipboard.writeText(text)
            .then(() => showToast('Copiado al portapapeles'))
            .catch(() => showToast('No se pudo copiar'));
    };

    const handleShare = (worker) => {
        const text = `${worker.name} — ${worker.role}\nIngreso: ${worker.in} · Salida: ${worker.out}\nCiclo: ${worker.cycle} · Día ${worker.days}/${worker.total}\nRelevo: ${worker.back}`;
        if (navigator.share) {
            navigator.share({ title: worker.name, text }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text)
                .then(() => showToast('Copiado al portapapeles'))
                .catch(() => showToast('No se pudo copiar'));
        }
    };

    const openEdit = (worker) => { setEditData(worker); setAddOpen(true); };

    const handleImportConfirm = async (newWorkers) => {
        let updActive = [...active];
        let updSoon = [...soonList];
        const toAdd = [];

        newWorkers.forEach(imported => {
            const roleKey = imported.role.trim().toLowerCase();
            const activeIdx = updActive.findIndex(w => w.role.trim().toLowerCase() === roleKey);
            if (activeIdx !== -1) {
                const displaced = updActive[activeIdx];
                updActive = updActive.filter((_, i) => i !== activeIdx);
                updSoon = updSoon.filter(w => w.role.trim().toLowerCase() !== roleKey);
                toAdd.push({ ...imported, back: displaced.name, status: 'active' });
            } else {
                const soonIdx = updSoon.findIndex(w => w.role.trim().toLowerCase() === roleKey);
                if (soonIdx !== -1) {
                    const displaced = updSoon[soonIdx];
                    updSoon = updSoon.filter((_, i) => i !== soonIdx);
                    toAdd.push({ ...imported, back: displaced.name, status: 'active' });
                } else {
                    toAdd.push({ ...imported, status: 'active' });
                }
            }
        });

        try {
            await api.post('/flujo-workers/bulk', { workers: toAdd });
            const res = await api.get('/flujo-workers');
            const { active: a, soon: s } = classifyWorkers([...res.data.active, ...res.data.soon]);
            setActive(a);
            setSoon(s);
            setImportOpen(false);
            showToast(`${newWorkers.length} funcionario${newWorkers.length !== 1 ? 's' : ''} importado${newWorkers.length !== 1 ? 's' : ''}`);
        } catch {
            showToast('Error al importar');
        }
    };

    const filteredActive = filter(active);
    const filteredSoon = filter(soonList);
    const filteredDescanso = filter(descansoList);

    // Para tríos, DÍA y NOCHE cuentan como activos; DESCANSO cuenta como libre
    const activeCount = active.reduce((sum, w) =>
        w.isTrio ? sum + (w.trioPeople || []).filter(p => p.turno === 'dia' || p.turno === 'noche').length
                 : sum + 1, 0);
    const freeCount = [...active, ...soonList].reduce((sum, w) =>
        w.isTrio ? sum + (w.trioPeople || []).filter(p => p.turno === 'descanso').length
                 : sum + 1, 0);

    // Detecta si un worker pertenece a un grupo de 3 (dia + noche + descanso con mismo rol)
    const get3PersonGroup = (worker) => {
        const all = [...active, ...soonList, ...descansoList];
        const same = all.filter(w => w.role.trim().toLowerCase() === worker.role.trim().toLowerCase());
        const dia     = same.find(w => w.turno === 'dia');
        const noche   = same.find(w => w.turno === 'noche');
        const descanso = same.find(w => w.turno === 'descanso');
        if (!dia || !noche || !descanso) return null;
        return { dayWorker: dia, nightWorker: noche, backWorker: descanso };
    };

    // Para cada worker saber si tiene un compañero con turno opuesto (dia↔noche)
    const allInTurno = [...active, ...soonList];
    const hasTurnoSibling = (w) => allInTurno.some(
        x => x.id !== w.id &&
             x.role.trim().toLowerCase() === w.role.trim().toLowerCase() &&
             (x.turno === 'dia' || x.turno === 'noche')
    );

    return (
        <div className="fp">
            <PageHeader
                onBack={() => navigate('/workspace', { state: { openDrawer: true, activeTab: 'jefes' } })}
                controlsOpen={controlsOpen}
                onToggleControls={() => setControlsOpen(v => !v)}
            />
            <Toast open={!!toast} msg={toast || ''} />

            <div className="fp-scroll">
                {/* Centra el contenido igual que WorkspacePage en escritorio */}
                <div className="fp-contenido">
                    <div className={`fp-controles${controlsOpen ? ' abiertos' : ''}`}>
                        <SearchBar
                            value={search} onChange={setSearch}
                            onImport={() => setImportOpen(true)}
                            activeCount={activeCount}
                            freeCount={freeCount}
                            onActiveClick={() => setCountOpen('active')}
                            onFreeClick={() => setCountOpen('free')}
                        />
                    </div>
                    <div className="fp-listas">
                        {loading && (
                            <div className="fp-vacio">
                                Cargando funcionarios…
                            </div>
                        )}
                        {!loading && filteredSoon.length > 0 && (
                            <>
                                <SectionHeader label="Próximos a salir" count={filteredSoon.length} dot={COLORS.yellow} alert />
                                {filteredSoon.map(w => w.isTrio ? (
                                    <WorkerCardTrio key={w.id} worker={w} soon
                                        onDetail={setDetailWorker}
                                        onCycleClick={setCycleFor}
                                        onTrioNightSwap={handleTrioNightSwap}
                                        onTrioDayNightSwap={handleTrioDayNightSwap}
                                    />
                                ) : (
                                    <WorkerCard key={w.id} worker={w} soon
                                        onDetail={setDetailWorker}
                                        onCycleClick={setCycleFor}
                                        onSwap={setSwapFor}
                                        onTurnoSwap={handleTurnoSwap}
                                        hasTurnoSibling={hasTurnoSibling(w)}
                                        onToLibre={handleToLibre}
                                    />
                                ))}
                            </>
                        )}
                        {!loading && <SectionHeader label="En turno activo" count={filteredActive.length} dot={COLORS.green} />}
                        {filteredActive.length === 0 ? (
                            <div className="fp-vacio">
                                {search ? 'Sin resultados para la búsqueda.' : 'Sin funcionarios en turno activo.'}
                            </div>
                        ) : (
                            filteredActive.map(w => w.isTrio ? (
                                <WorkerCardTrio key={w.id} worker={w}
                                    onDetail={setDetailWorker}
                                    onCycleClick={setCycleFor}
                                    onTrioNightSwap={handleTrioNightSwap}
                                    onTrioDayNightSwap={handleTrioDayNightSwap}
                                />
                            ) : (
                                <WorkerCard key={w.id} worker={w}
                                    onDetail={setDetailWorker}
                                    onCycleClick={setCycleFor}
                                    onSwap={setSwapFor}
                                    onTurnoSwap={handleTurnoSwap}
                                    hasTurnoSibling={hasTurnoSibling(w)}
                                    onToLibre={handleToLibre}
                                />
                            ))
                        )}
                        {!loading && filteredDescanso.length > 0 && (
                            <>
                                <SectionHeader label="En descanso" count={filteredDescanso.length} dot={COLORS.violet} />
                                {filteredDescanso.map(w => {
                                    const trio = get3PersonGroup(w);
                                    return (
                                        <WorkerCard key={w.id} worker={w}
                                            onDetail={setDetailWorker}
                                            onCycleClick={setCycleFor}
                                            onSwap={setSwapFor}
                                            onToLibre={handleToLibre}
                                            on3PersonSwap={trio ? () => setSwapFor3(trio) : undefined}
                                        />
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <BottomNav onHome={() => navigate('/workspace')} />

            {/* FAB — esquina inferior derecha */}
            <button className="fp-fab" onClick={() => setAddOpen(true)}>
                {Icon.plus(24, '#fff')}
            </button>

            <WorkerDetailModal
                open={!!detailWorker}
                worker={detailWorker}
                soon={detailWorker ? soonList.some(w => w.id === detailWorker.id) : false}
                onClose={() => setDetailWorker(null)}
                onEdit={w => { setDetailWorker(null); setTimeout(() => openEdit(w), 180); }}
                onDelete={w => { setDetailWorker(null); setTimeout(() => setDeleteFor(w), 180); }}
                onSwap={w => { setDetailWorker(null); setTimeout(() => setSwapFor(w), 180); }}
                onCopy={handleCopy}
                onShare={handleShare}
                onCycleClick={w => { setDetailWorker(null); setTimeout(() => setCycleFor(w), 180); }}
            />
            <DeleteModal open={!!deleteFor} worker={deleteFor} onClose={() => setDeleteFor(null)} onConfirm={handleDelete} />
            <SwapModal open={!!swapFor} worker={swapFor} onClose={() => setSwapFor(null)} onConfirm={handleSwap} />
            <SwapModal3 open={!!swapFor3} group={swapFor3} onClose={() => setSwapFor3(null)} onConfirm={handleSwap3} />
            <CycleModal open={!!cycleFor} worker={cycleFor} onClose={() => setCycleFor(null)} onConfirm={handleCycle} />
            <AddWorkerModal open={addOpen} onClose={() => { setAddOpen(false); setEditData(null); }} onAdd={handleAdd} onAddTrio={handleAddTrio} editData={editData} onEdit={handleEdit} />
            <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onConfirm={handleImportConfirm} />
            <CountListModal
                open={!!countOpen}
                onClose={() => setCountOpen(null)}
                kind={countOpen}
                items={countOpen === 'active'
                    ? active.flatMap(w => w.isTrio
                        ? (w.trioPeople || []).filter(p => p.turno === 'dia' || p.turno === 'noche')
                            .map(p => ({ name: p.name, role: w.role, meta: p.turno === 'dia' ? '☀ DÍA' : '🌙 NOCHE' }))
                        : [{ name: w.name, role: w.role, meta: `Día ${w.days}/${w.total}` }])
                    : [...active, ...soonList].flatMap(w => w.isTrio
                        ? (w.trioPeople || []).filter(p => p.turno === 'descanso')
                            .map(p => ({ name: p.name, role: w.role, meta: '💤 DESCANSO' }))
                        : [{ name: w.back, role: w.role, meta: null }])
                }
            />
        </div>
    );
};

export default FlujoPersonalPage;
