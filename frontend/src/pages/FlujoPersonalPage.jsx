import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../api/axios';

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
        <button onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                height: 22, padding: '0 8px', borderRadius: 11,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text, fontSize: 11, fontWeight: 600,
                letterSpacing: 0.2, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{label}</span>
            {Icon.chevDown(8, COLORS.textMute)}
        </button>
    );
}

function DaysBadge({ days, total }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 20, padding: '0 8px', borderRadius: 4,
            background: COLORS.greenDim,
            border: '1px solid rgba(74,222,128,0.25)',
            color: COLORS.green, fontSize: 10.5, fontWeight: 700,
            letterSpacing: 0.3, fontVariantNumeric: 'tabular-nums',
        }}>
            <span style={{
                width: 5, height: 5, borderRadius: '50%', background: COLORS.green,
                boxShadow: '0 0 6px rgba(74,222,128,0.7)',
            }} />
            DÍA {days}/{total}
        </span>
    );
}

function RemainingBadge({ remaining }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 20, padding: '0 8px', borderRadius: 4,
            background: COLORS.yellowDim,
            border: '1px solid rgba(239,159,39,0.35)',
            color: COLORS.yellow, fontSize: 10.5, fontWeight: 700,
            letterSpacing: 0.3, fontVariantNumeric: 'tabular-nums',
        }}>
            {Icon.alert(10, COLORS.yellow)}
            {remaining} {remaining === 1 ? 'DÍA' : 'DÍAS'} REST.
        </span>
    );
}

function ActionButton({ color, bg, icon, label, onClick }) {
    const [hover, setHover] = useState(false);
    return (
        <button onClick={onClick} title={label} aria-label={label}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{
                width: 40, height: 40, borderRadius: 11,
                background: hover ? bg.hover : bg.base,
                border: `1px solid ${bg.border}`,
                color, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit', flexShrink: 0,
                transition: 'background 140ms ease, transform 140ms ease',
                transform: hover ? 'translateY(-1px)' : 'none',
            }}>
            {icon}
        </button>
    );
}

function ProgressBar({ value, total, color }) {
    const pct = Math.min(100, (value / total) * 100);
    return (
        <div style={{
            height: 3, width: '100%', borderRadius: 2,
            background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
        }}>
            <div style={{
                height: '100%', width: `${pct}%`, background: color,
                borderRadius: 2, transition: 'width 400ms ease',
            }} />
        </div>
    );
}

function WorkerCard({ worker, soon, onDetail, onCycleClick, onSwap, onTurnoSwap, hasTurnoSibling, onToLibre, on3PersonSwap }) {
    const turnoMeta = TURNO_META[worker.turno] || TURNO_META.dia;
    const borderColor = soon ? 'rgba(239,159,39,0.55)' : COLORS.border;
    const [hover, setHover] = useState(false);

    return (
        <div
            onClick={() => onDetail && onDetail(worker)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                background: COLORS.card,
                border: `1px solid ${hover ? (soon ? COLORS.yellow : COLORS.borderLight) : borderColor}`,
                borderRadius: 14,
                padding: '14px 14px 14px',
                marginBottom: 10,
                cursor: 'pointer',
                transition: 'border-color 160ms ease, background 160ms ease',
                position: 'relative',
                overflow: 'hidden',
            }}>
            {soon && (
                <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                    background: `linear-gradient(180deg, ${COLORS.yellow}, rgba(239,159,39,0.4))`,
                }} />
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    <span style={{
                        fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6,
                        color: COLORS.violet, textTransform: 'uppercase',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {worker.role}
                    </span>
                    <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: 0.7,
                        color: turnoMeta.color, background: turnoMeta.dim,
                        border: `1px solid ${turnoMeta.color}44`,
                        padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                    }}>
                        {turnoMeta.label}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{
                        fontSize: 9.5, color: COLORS.textMute,
                        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                        marginRight: 10,
                    }}>
                        {worker.in} – {worker.out}
                    </span>
                    {soon ? <RemainingBadge remaining={worker.remaining} /> : <DaysBadge days={worker.days} total={worker.total} />}
                </div>
            </div>

            <div style={{
                fontSize: 17, fontWeight: 700, color: COLORS.text,
                lineHeight: 1.2, marginBottom: 10, letterSpacing: -0.2,
            }}>
                {worker.name}
            </div>

            <ProgressBar value={worker.days} total={worker.total} color={soon ? COLORS.yellow : COLORS.green} />

            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, marginTop: 12, paddingTop: 12,
                borderTop: `1px dashed ${COLORS.border}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(124,94,245,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: COLORS.violet,
                        border: '1px solid rgba(124,94,245,0.3)', flexShrink: 0,
                    }}>
                        {(worker.back || '').split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 9.5, color: COLORS.textDim, letterSpacing: 0.5, fontWeight: 600 }}>
                            BACK / RELEVO
                        </div>
                        <div style={{
                            fontSize: 12, color: '#d4d4d4', fontWeight: 500,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {worker.back}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {/* Pasar a libre — solo para descanso */}
                    {worker.turno === 'descanso' && (
                        <button
                            title="Pasar a libre"
                            onClick={e => { e.stopPropagation(); onToLibre && onToLibre(worker); }}
                            style={{
                                height: 28, padding: '0 8px', borderRadius: 8, flexShrink: 0,
                                background: COLORS.violetDim,
                                border: '1px solid rgba(124,94,245,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: COLORS.violet,
                                fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3,
                                gap: 4,
                            }}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14M14 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            LIBRE
                        </button>
                    )}
                    {/* Intercambio back↔turno — solo para descanso en grupo de 3 */}
                    {worker.turno === 'descanso' && on3PersonSwap && (
                        <button
                            title="Intercambiar turno con persona de día o noche"
                            onClick={e => { e.stopPropagation(); on3PersonSwap(worker); }}
                            style={{
                                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                background: COLORS.yellowDim,
                                border: '1px solid rgba(239,159,39,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: COLORS.yellow,
                            }}
                        >
                            {Icon.swap(12, COLORS.yellow)}
                        </button>
                    )}
                    {/* Intercambio día/noche — solo si hay un compañero con turno opuesto */}
                    {(worker.turno === 'dia' || worker.turno === 'noche') && hasTurnoSibling && (
                        <button
                            title={`Cambiar a ${worker.turno === 'dia' ? 'noche' : 'día'}`}
                            onClick={e => { e.stopPropagation(); onTurnoSwap && onTurnoSwap(worker); }}
                            style={{
                                height: 28, padding: '0 7px', borderRadius: 8, flexShrink: 0,
                                background: worker.turno === 'dia' ? 'rgba(59,130,246,0.12)' : 'rgba(74,222,128,0.12)',
                                border: `1px solid ${worker.turno === 'dia' ? 'rgba(59,130,246,0.4)' : 'rgba(74,222,128,0.4)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                color: worker.turno === 'dia' ? COLORS.blue : COLORS.green,
                                fontSize: 9, fontWeight: 800, gap: 3,
                            }}
                        >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                <path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {worker.turno === 'dia' ? 'NOCHE' : 'DÍA'}
                        </button>
                    )}
                    {/* Swap principal (relevo/cambio de guardia) — no se muestra en descanso */}
                    {worker.turno !== 'descanso' && (
                        <button
                            title="Rotar / Cambio de turno"
                            onClick={e => { e.stopPropagation(); onSwap && onSwap(worker); }}
                            style={{
                                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                background: soon ? COLORS.yellowDim : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${soon ? 'rgba(239,159,39,0.4)' : COLORS.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: soon ? COLORS.yellow : COLORS.textMute,
                            }}
                        >
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
    const [hover, setHover] = useState(false);
    const dia   = worker.trioPeople?.find(p => p.turno === 'dia');
    const noche = worker.trioPeople?.find(p => p.turno === 'noche');
    const desc  = worker.trioPeople?.find(p => p.turno === 'descanso');
    const borderColor = soon ? 'rgba(239,159,39,0.55)' : COLORS.border;

    return (
        <div
            onClick={() => onDetail && onDetail(worker)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                background: COLORS.card,
                border: `1px solid ${hover ? (soon ? COLORS.yellow : COLORS.borderLight) : borderColor}`,
                borderRadius: 14, padding: '14px', marginBottom: 10,
                cursor: 'pointer', transition: 'border-color 160ms ease',
                position: 'relative', overflow: 'hidden',
            }}>
            {soon && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${COLORS.yellow}, rgba(239,159,39,0.4))` }} />
            )}

            {/* Encabezado */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.violet, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                        {worker.role}
                    </span>
                    <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                        color: COLORS.violet, background: COLORS.violetDim,
                        border: `1px solid ${COLORS.violet}44`, padding: '1px 6px', borderRadius: 4,
                    }}>TRÍO</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9.5, color: COLORS.textMute, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {worker.in} – {worker.out}
                    </span>
                    {soon ? <RemainingBadge remaining={worker.remaining} /> : <DaysBadge days={worker.days} total={worker.total} />}
                </div>
            </div>

            {/* Tres personas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                {[
                    { person: dia,   label: 'DÍA',      color: '#4ade80', icon: '☀', dim: 'rgba(74,222,128,0.10)' },
                    { person: noche, label: 'NOCHE',    color: '#3b82f6', icon: '🌙', dim: 'rgba(59,130,246,0.10)' },
                    { person: desc,  label: 'DESCANSO', color: '#7c5ef5', icon: '💤', dim: 'rgba(124,94,245,0.10)' },
                ].map(({ person, label, color, icon, dim }) => (
                    <div key={label} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 8px', borderRadius: 8,
                        background: dim, border: `1px solid ${color}22`,
                    }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color, width: 66, flexShrink: 0, letterSpacing: 0.3 }}>
                            {icon} {label}
                        </span>
                        <span style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {person?.name || '—'}
                        </span>
                    </div>
                ))}
            </div>

            <ProgressBar value={worker.days} total={worker.total} color={soon ? COLORS.yellow : COLORS.violet} />

            {/* Botones de cambio rápido */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${COLORS.border}`, alignItems: 'center' }}>
                <button
                    title="Intercambiar NOCHE con DESCANSO (06:00 auto)"
                    onClick={e => { e.stopPropagation(); onTrioNightSwap && onTrioNightSwap(worker); }}
                    style={{
                        flex: 1, height: 30, borderRadius: 8,
                        border: '1px solid rgba(59,130,246,0.35)',
                        background: 'rgba(59,130,246,0.10)', color: '#3b82f6',
                        fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, letterSpacing: 0.3,
                    }}
                >
                    {Icon.swap(10, '#3b82f6')} 🌙↔💤
                </button>
                <button
                    title="Intercambiar DÍA con NOCHE (18:00 auto)"
                    onClick={e => { e.stopPropagation(); onTrioDayNightSwap && onTrioDayNightSwap(worker); }}
                    style={{
                        flex: 1, height: 30, borderRadius: 8,
                        border: '1px solid rgba(74,222,128,0.35)',
                        background: 'rgba(74,222,128,0.10)', color: '#4ade80',
                        fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, letterSpacing: 0.3,
                    }}
                >
                    {Icon.swap(10, '#4ade80')} ☀↔🌙
                </button>
                <CyclePill cycle={worker.cycle} onClick={() => onCycleClick && onCycleClick(worker)} />
            </div>
        </div>
    );
}

function WorkerDetailModal({ open, worker, soon, onClose, onEdit, onDelete, onSwap, onCopy, onShare, onCycleClick }) {
    if (!worker) return <ModalShell open={open} onClose={onClose}><div /></ModalShell>;

    /* ── Vista para registros trío ── */
    if (worker.isTrio) {
        const dia   = worker.trioPeople?.find(p => p.turno === 'dia');
        const noche = worker.trioPeople?.find(p => p.turno === 'noche');
        const desc  = worker.trioPeople?.find(p => p.turno === 'descanso');
        const pct   = Math.min(100, (worker.days / worker.total) * 100);
        const ac    = soon ? COLORS.yellow : COLORS.violet;
        return (
            <ModalShell open={open} onClose={onClose}>
                <div style={{ background: COLORS.cardElev, borderRadius: 20, border: `1px solid ${COLORS.borderLight}`, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
                    <div style={{ height: 4, background: `linear-gradient(90deg, ${ac}, ${ac}55)` }} />
                    <div style={{ padding: '18px 20px 12px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 52, height: 52, borderRadius: 15, flexShrink: 0, background: COLORS.violetDim, border: `1.5px solid ${COLORS.violet}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👥</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.violet, letterSpacing: 0.7, textTransform: 'uppercase' }}>{worker.role}</span>
                                    <span style={{ fontSize: 9, fontWeight: 800, color: COLORS.violet, background: COLORS.violetDim, border: `1px solid ${COLORS.violet}44`, padding: '1px 6px', borderRadius: 4 }}>TRÍO</span>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>Puesto de 3 Personas</div>
                            </div>
                            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{Icon.close(12, COLORS.textMute)}</button>
                        </div>
                        {/* Progreso */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                {soon ? <RemainingBadge remaining={worker.remaining} /> : <DaysBadge days={worker.days} total={worker.total} />}
                                <span style={{ fontSize: 10, color: COLORS.textDim, fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(0)}% del ciclo</span>
                            </div>
                            <div style={{ height: 6, width: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: `linear-gradient(90deg, ${ac}, ${ac}bb)`, transition: 'width 400ms ease' }} />
                            </div>
                        </div>
                        {/* 3 personas */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                            {[
                                { person: dia,   label: 'DÍA',      color: '#4ade80', icon: '☀', dim: 'rgba(74,222,128,0.10)' },
                                { person: noche, label: 'NOCHE',    color: '#3b82f6', icon: '🌙', dim: 'rgba(59,130,246,0.10)' },
                                { person: desc,  label: 'DESCANSO', color: '#7c5ef5', icon: '💤', dim: 'rgba(124,94,245,0.10)' },
                            ].map(({ person, label, color, icon, dim }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: dim, border: `1px solid ${color}22` }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5 }}>{label}</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{person?.name || '—'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Info */}
                        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 2 }}>
                            {[{ label: 'Ingreso', val: worker.in }, { label: 'Salida est.', val: worker.out }, { label: 'Ciclo', val: worker.cycle }].map(({ label, val }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Acciones */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: `1px solid ${COLORS.border}` }}>
                        {[
                            { icon: Icon.edit(17, COLORS.blue),    label: 'Editar',    color: COLORS.blue,   action: () => { onClose(); setTimeout(() => onEdit && onEdit(worker), 180); } },
                            { icon: Icon.share(17, COLORS.violet), label: 'Compartir', color: COLORS.violet, action: () => { onShare && onShare(worker); } },
                            { icon: Icon.trash(17, COLORS.red),    label: 'Eliminar',  color: COLORS.red,    action: () => { onClose(); setTimeout(() => onDelete && onDelete(worker), 180); } },
                        ].map(({ icon, label, color, action }) => (
                            <button key={label} onClick={action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '14px 6px', background: 'transparent', border: 'none', borderRight: `1px solid ${COLORS.border}`, color, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 140ms ease' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                {icon}
                                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3, color }}>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </ModalShell>
        );
    }

    const accentColor = soon ? COLORS.yellow : COLORS.green;
    const accentDim   = soon ? COLORS.yellowDim : COLORS.greenDim;
    const initials = worker.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const backInitials = (worker.back || '').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const pct = Math.min(100, (worker.days / worker.total) * 100);

    const Row = ({ label, value, valueColor }) => (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: `1px solid ${COLORS.border}`,
        }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: valueColor || COLORS.text, textAlign: 'right' }}>{value}</span>
        </div>
    );

    return (
        <ModalShell open={open} onClose={onClose}>
            <div style={{
                background: COLORS.cardElev, borderRadius: 20,
                border: `1px solid ${COLORS.borderLight}`,
                overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            }}>
                {/* Banda de color superior */}
                <div style={{
                    height: 4,
                    background: `linear-gradient(90deg, ${accentColor}, ${accentColor}55)`,
                }} />

                <div style={{ padding: '18px 20px 0' }}>
                    {/* Cabecera */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 15, flexShrink: 0,
                            background: `${accentColor}1a`,
                            border: `1.5px solid ${accentColor}55`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, fontWeight: 800, color: accentColor,
                            letterSpacing: 0.5,
                        }}>
                            {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: 10, fontWeight: 700, color: COLORS.violet,
                                letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 3,
                            }}>{worker.role}</div>
                            <div style={{
                                fontSize: 18, fontWeight: 800, color: COLORS.text,
                                lineHeight: 1.15, letterSpacing: -0.3,
                            }}>{worker.name}</div>
                        </div>
                        <button onClick={onClose} style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>{Icon.close(12, COLORS.textMute)}</button>
                    </div>

                    {/* Barra de progreso + badge */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            {soon
                                ? <RemainingBadge remaining={worker.remaining} />
                                : <DaysBadge days={worker.days} total={worker.total} />
                            }
                            <span style={{ fontSize: 10, color: COLORS.textDim, fontVariantNumeric: 'tabular-nums' }}>
                                {pct.toFixed(0)}% del ciclo
                            </span>
                        </div>
                        <div style={{ height: 6, width: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${pct}%`, borderRadius: 3,
                                background: `linear-gradient(90deg, ${accentColor}, ${accentColor}bb)`,
                                transition: 'width 400ms ease',
                            }} />
                        </div>
                    </div>

                    {/* Filas de info */}
                    <div style={{ marginBottom: 4 }}>
                        <Row label="Ingreso" value={worker.in} />
                        <Row label="Salida estimada" value={worker.out} />
                        <Row label="Ciclo" value={
                            <button onClick={() => { onClose(); setTimeout(() => onCycleClick && onCycleClick(worker), 180); }}
                                style={{
                                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`,
                                    borderRadius: 8, padding: '2px 10px', color: COLORS.text,
                                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                }}>
                                {worker.cycle}
                                {Icon.chevDown(8, COLORS.textMute)}
                            </button>
                        } />
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 0',
                        }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, letterSpacing: 0.5, textTransform: 'uppercase' }}>Back / Relevo</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    background: 'rgba(124,94,245,0.15)',
                                    border: '1px solid rgba(124,94,245,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, fontWeight: 700, color: COLORS.violet,
                                }}>{backInitials}</div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{worker.back}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botón cambio de turno (siempre visible) */}
                <div style={{ padding: '0 20px 12px' }}>
                    <button onClick={() => { onClose(); setTimeout(() => onSwap && onSwap(worker), 180); }}
                        style={{
                            width: '100%', height: 38, borderRadius: 10,
                            background: soon ? COLORS.yellowDim : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${soon ? 'rgba(239,159,39,0.4)' : COLORS.border}`,
                            color: soon ? COLORS.yellow : COLORS.textMute, fontWeight: 600, fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        {Icon.swap(13, soon ? COLORS.yellow : COLORS.textMute)}
                        Cambiar turno / Rotar
                    </button>
                </div>

                {/* Acciones */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    borderTop: `1px solid ${COLORS.border}`,
                }}>
                    {[
                        { icon: Icon.edit(17, COLORS.blue),   label: 'Editar',     color: COLORS.blue,   action: () => { onClose(); setTimeout(() => onEdit && onEdit(worker), 180); } },
                        { icon: Icon.copy(17, COLORS.green),  label: 'Copiar',     color: COLORS.green,  action: () => { onCopy && onCopy(worker); } },
                        { icon: Icon.share(17, COLORS.violet),label: 'Compartir',  color: COLORS.violet, action: () => { onShare && onShare(worker); } },
                        { icon: Icon.trash(17, COLORS.red),   label: 'Eliminar',   color: COLORS.red,    action: () => { onClose(); setTimeout(() => onDelete && onDelete(worker), 180); } },
                    ].map(({ icon, label, color, action }) => (
                        <button key={label} onClick={action} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 5, padding: '14px 6px',
                            background: 'transparent', border: 'none',
                            borderRight: `1px solid ${COLORS.border}`,
                            color, cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'background 140ms ease',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            {icon}
                            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3, color }}>{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </ModalShell>
    );
}

function SectionHeader({ label, count, dot, alert }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0 10px' }}>
            <span style={{
                width: 6, height: 6, borderRadius: '50%', background: dot,
                boxShadow: `0 0 8px ${dot}`,
            }} />
            <span style={{
                fontSize: 10.5, fontWeight: 700, color: alert ? COLORS.yellow : COLORS.textMute,
                letterSpacing: 0.9, textTransform: 'uppercase',
            }}>
                {label}
            </span>
            <span style={{
                fontSize: 10, color: COLORS.textDim, fontWeight: 600,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${COLORS.border}`,
                padding: '1px 6px', borderRadius: 4,
                fontVariantNumeric: 'tabular-nums',
            }}>
                {count}
            </span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
        </div>
    );
}

// ── Modals ──────────────────────────────────────────────
function ModalShell({ open, onClose, children }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            pointerEvents: open ? 'auto' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            transition: 'opacity 180ms ease',
            opacity: open ? 1 : 0,
        }}>
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            }} />
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: 'min(92vw, 460px)',
                maxHeight: '88vh',
                overflowY: 'auto',
                transform: open ? 'translateY(0)' : 'translateY(20px)',
                transition: 'transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1)',
            }}>
                {children}
            </div>
        </div>
    );
}

function DeleteModal({ open, worker, onClose, onConfirm }) {
    return (
        <ModalShell open={open} onClose={onClose}>
            <div style={{
                background: COLORS.cardElev, borderRadius: 18,
                border: `1px solid ${COLORS.borderLight}`,
                padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: COLORS.redDim,
                    border: '1px solid rgba(226,75,74,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 14,
                }}>
                    {Icon.trash(20, COLORS.red)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>
                    ¿Eliminar funcionario?
                </div>
                <div style={{ fontSize: 13, color: COLORS.textMute, lineHeight: 1.5, marginBottom: 14 }}>
                    Esta acción no se puede deshacer. Se removerán los registros de turno asociados.
                </div>
                {worker && (
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 10, padding: '10px 12px', marginBottom: 16,
                    }}>
                        <div style={{ fontSize: 9.5, color: COLORS.violet, fontWeight: 700, letterSpacing: 0.6 }}>
                            {worker.role.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>
                            {worker.name}
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onClose} style={{
                        flex: 1, height: 44, borderRadius: 11,
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.text, fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}>Cancelar</button>
                    <button onClick={onConfirm} style={{
                        flex: 1, height: 44, borderRadius: 11,
                        background: COLORS.red, border: '1px solid transparent',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: '0 6px 18px rgba(226,75,74,0.35)',
                    }}>Eliminar</button>
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
            <div style={{
                background: COLORS.cardElev, borderRadius: 18,
                border: `1px solid ${COLORS.borderLight}`,
                padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: COLORS.yellowDim,
                            border: '1px solid rgba(239,159,39,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {Icon.swap(16, COLORS.yellow)}
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>Cambio de turno</div>
                            <div style={{ fontSize: 11.5, color: COLORS.textMute }}>{worker.name}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${COLORS.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                    }}>
                        {Icon.close(12, COLORS.textMute)}
                    </button>
                </div>
                {SWAP_OPTS.map(o => {
                    const sel = choice === o.id;
                    return (
                        <button key={o.id} onClick={() => setChoice(o.id)} style={{
                            width: '100%', textAlign: 'left',
                            background: sel ? 'rgba(124,94,245,0.10)' : 'rgba(255,255,255,0.025)',
                            border: `1px solid ${sel ? COLORS.violet : COLORS.border}`,
                            borderRadius: 12, padding: 12, marginBottom: 8,
                            cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'border-color 160ms ease, background 160ms ease',
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                        }}>
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                                border: `1.5px solid ${sel ? COLORS.violet : COLORS.borderLight}`,
                                background: sel ? COLORS.violet : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 140ms ease',
                            }}>
                                {sel && Icon.check(10, '#fff')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text, marginBottom: 3 }}>{o.title}</div>
                                <div style={{ fontSize: 11.5, color: COLORS.textMute, lineHeight: 1.45 }}>{o.desc}</div>
                            </div>
                        </button>
                    );
                })}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={onClose} style={{
                        flex: 1, height: 44, borderRadius: 11,
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.text, fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}>Cancelar</button>
                    <button onClick={() => onConfirm(choice)} style={{
                        flex: 1.4, height: 44, borderRadius: 11,
                        background: COLORS.violet, border: '1px solid transparent',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: '0 6px 18px rgba(124,94,245,0.4)',
                    }}>Confirmar</button>
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
        { id: 'dia',   label: dayWorker.name,   sub: 'Persona de día → pasa a descanso',   icon: '☀', color: '#4ade80' },
        { id: 'noche', label: nightWorker.name,  sub: 'Persona de noche → pasa a descanso', icon: '🌙', color: '#3b82f6' },
    ];

    return (
        <ModalShell open={open} onClose={onClose}>
            <div style={{
                background: COLORS.cardElev, borderRadius: 18,
                border: `1px solid ${COLORS.borderLight}`,
                padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: COLORS.yellowDim,
                            border: '1px solid rgba(239,159,39,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {Icon.swap(16, COLORS.yellow)}
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>Intercambio de turno</div>
                            <div style={{ fontSize: 11.5, color: COLORS.textMute }}>{backWorker.name} — Descanso</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${COLORS.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                    }}>{Icon.close(12, COLORS.textMute)}</button>
                </div>
                <div style={{ fontSize: 11.5, color: COLORS.textMute, marginBottom: 12 }}>
                    ¿Con quién desea intercambiar?
                </div>
                {opts.map(o => {
                    const sel = choice === o.id;
                    return (
                        <button key={o.id} onClick={() => setChoice(o.id)} style={{
                            width: '100%', textAlign: 'left',
                            background: sel ? `${o.color}18` : 'rgba(255,255,255,0.025)',
                            border: `1px solid ${sel ? o.color + '66' : COLORS.border}`,
                            borderRadius: 12, padding: 12, marginBottom: 8,
                            cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'border-color 160ms ease, background 160ms ease',
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                        }}>
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                                border: `1.5px solid ${sel ? o.color : COLORS.borderLight}`,
                                background: sel ? o.color : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 140ms ease',
                            }}>
                                {sel && Icon.check(10, '#fff')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text, marginBottom: 3 }}>
                                    {o.icon} {o.label}
                                </div>
                                <div style={{ fontSize: 11.5, color: COLORS.textMute }}>{o.sub}</div>
                            </div>
                        </button>
                    );
                })}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={onClose} style={{
                        flex: 1, height: 44, borderRadius: 11,
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.text, fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}>Cancelar</button>
                    <button onClick={() => onConfirm(choice)} style={{
                        flex: 1.4, height: 44, borderRadius: 11,
                        background: COLORS.violet, border: '1px solid transparent',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: '0 6px 18px rgba(124,94,245,0.4)',
                    }}>Confirmar</button>
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
            <div style={{
                background: COLORS.cardElev, borderRadius: 18,
                border: `1px solid ${COLORS.borderLight}`,
                padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
                    Ciclo de turno
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMute, marginBottom: 14 }}>{worker.name}</div>
                {opts.map(o => {
                    const active = sel === o.id;
                    return (
                        <button key={o.id} onClick={() => setSel(o.id)} style={{
                            width: '100%', textAlign: 'left',
                            background: active ? 'rgba(124,94,245,0.10)' : 'rgba(255,255,255,0.025)',
                            border: `1px solid ${active ? COLORS.violet : COLORS.border}`,
                            borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                            cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', gap: 12,
                            transition: 'all 160ms ease',
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>{o.label}</div>
                                <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 2 }}>{o.desc}</div>
                            </div>
                            {active && (
                                <div style={{
                                    width: 18, height: 18, borderRadius: '50%',
                                    background: COLORS.violet,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {Icon.check(10, '#fff')}
                                </div>
                            )}
                        </button>
                    );
                })}
                <button onClick={() => onConfirm(sel)} style={{
                    width: '100%', height: 44, borderRadius: 11, marginTop: 4,
                    background: COLORS.violet, border: '1px solid transparent',
                    color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 6px 18px rgba(124,94,245,0.4)',
                }}>Aplicar ciclo</button>
            </div>
        </ModalShell>
    );
}

function CountListModal({ open, onClose, kind, items }) {
    const isActive = kind === 'active';
    const accent = isActive ? COLORS.green : COLORS.violet;
    const accentDim = isActive ? COLORS.greenDim : COLORS.violetDim;
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
            <div style={{
                background: COLORS.cardElev, borderRadius: 18,
                border: `1px solid ${COLORS.borderLight}`,
                padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                maxHeight: 520, display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 11,
                        background: accentDim, border: `1px solid ${accent}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{title}</div>
                        <div style={{ fontSize: 11.5, color: COLORS.textMute }}>{subtitle}</div>
                    </div>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center',
                        height: 28, padding: '0 10px', borderRadius: 999,
                        background: accentDim, border: `1px solid ${accent}40`,
                        color: accent, fontSize: 13, fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {items.length}
                    </div>
                    <button onClick={handleShare} title="Compartir lista" style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: copied ? `${accent}22` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${copied ? accent + '55' : COLORS.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'background 160ms, border-color 160ms',
                    }}>
                        {copied
                            ? Icon.check(13, accent)
                            : Icon.share(13, COLORS.textMute)}
                    </button>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${COLORS.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                    }}>
                        {Icon.close(12, COLORS.textMute)}
                    </button>
                </div>
                <div className="fp-scroll" style={{ overflowY: 'auto', flex: 1, marginRight: -4, paddingRight: 4 }}>
                    {items.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: COLORS.textMute, fontSize: 13 }}>
                            No hay funcionarios en esta categoría.
                        </div>
                    ) : (
                        <div style={{
                            background: 'rgba(255,255,255,0.025)',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 12, overflow: 'hidden',
                        }}>
                            {items.map((p, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '11px 12px',
                                    borderTop: i === 0 ? 0 : `1px solid ${COLORS.border}`,
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: `${accent}22`, border: `1px solid ${accent}55`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700, color: accent, flexShrink: 0,
                                    }}>
                                        {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 13, fontWeight: 600, color: COLORS.text,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>{p.name}</div>
                                        <div style={{
                                            fontSize: 10.5, fontWeight: 600,
                                            color: COLORS.violet, letterSpacing: 0.5,
                                            textTransform: 'uppercase', marginTop: 1,
                                        }}>{p.role}</div>
                                    </div>
                                    {p.meta && (
                                        <div style={{
                                            fontSize: 10.5, fontWeight: 600, color: accent,
                                            background: accentDim, border: `1px solid ${accent}30`,
                                            padding: '3px 7px', borderRadius: 5, whiteSpace: 'nowrap',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>{p.meta}</div>
                                    )}
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

    const downloadTemplate = () => {
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
        reader.onload = (ev) => {
            try {
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
            <div style={{
                background: COLORS.cardElev, borderRadius: 18,
                border: `1px solid ${COLORS.borderLight}`,
                padding: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                {/* Encabezado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: COLORS.greenDim, border: '1px solid rgba(74,222,128,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{Icon.upload(14, COLORS.green)}</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Importar funcionarios</div>
                        <div style={{ fontSize: 10.5, color: COLORS.textMute }}>Excel .xlsx — primera fila = encabezados</div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>{Icon.close(11, COLORS.textMute)}</button>
                </div>

                {/* Columnas */}
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, color: COLORS.textMute, marginBottom: 6 }}>COLUMNAS REQUERIDAS</div>
                <div style={{
                    background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, overflow: 'hidden', marginBottom: 10,
                }}>
                    {cols.map((c, i) => (
                        <div key={c.name} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px',
                            borderTop: i === 0 ? 0 : `1px solid ${COLORS.border}`,
                        }}>
                            <span style={{
                                fontFamily: 'ui-monospace, monospace', fontSize: 10.5, fontWeight: 600,
                                color: COLORS.violet, background: 'rgba(124,94,245,0.12)',
                                padding: '2px 6px', borderRadius: 4,
                                border: '1px solid rgba(124,94,245,0.22)', whiteSpace: 'nowrap', flexShrink: 0,
                            }}>{c.name}</span>
                            <span style={{
                                flex: 1, textAlign: 'right', fontSize: 10.5, color: '#bdbdbd',
                                fontFamily: 'ui-monospace, monospace',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{c.ex}</span>
                        </div>
                    ))}
                </div>

                {/* Nota */}
                <div style={{
                    fontSize: 10.5, color: COLORS.textMute, lineHeight: 1.5, marginBottom: 12,
                    padding: '8px 10px', borderRadius: 9,
                    background: 'rgba(239,159,39,0.05)', border: '1px solid rgba(239,159,39,0.2)',
                }}>
                    Ciclo por defecto <b style={{ color: '#fff' }}>15-15</b>. Fecha de ingreso = hoy.
                    El back se asigna después editando cada registro.
                </div>

                {/* Zona de archivo o vista previa */}
                <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleFileChange} />
                {preview ? (
                    <div style={{
                        background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.25)',
                        borderRadius: 10, padding: '9px 12px', marginBottom: 10,
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.green, letterSpacing: 0.5, marginBottom: 5 }}>
                            {preview.length} REGISTRO{preview.length !== 1 ? 'S' : ''} LISTOS PARA IMPORTAR
                        </div>
                        {preview.slice(0, 3).map((r, i) => (
                            <div key={i} style={{
                                fontSize: 11, color: '#d4d4d4', padding: '2px 0',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {r.nombre_completo} — {r.cargo}
                            </div>
                        ))}
                        {preview.length > 3 && (
                            <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 3 }}>+{preview.length - 3} más…</div>
                        )}
                        <button onClick={() => { setPreview(null); fileRef.current?.click(); }}
                            style={{
                                marginTop: 8, fontSize: 10.5, color: COLORS.textMute,
                                background: 'none', border: 0, cursor: 'pointer',
                                fontFamily: 'inherit', padding: 0, textDecoration: 'underline',
                            }}>Cambiar archivo</button>
                    </div>
                ) : (
                    <button onClick={() => fileRef.current?.click()} style={{
                        width: '100%', height: 52, borderRadius: 10, marginBottom: 10,
                        background: 'rgba(255,255,255,0.03)', border: `1px dashed ${COLORS.borderLight}`,
                        color: COLORS.textMute, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 5,
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 16V4M12 4l-4 4M12 4l4 4M5 20h14" stroke={COLORS.textMute} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Seleccionar archivo .xlsx
                    </button>
                )}
                {error && <div style={{ fontSize: 11, color: COLORS.red, marginBottom: 8 }}>{error}</div>}

                {/* Plantilla */}
                <button onClick={downloadTemplate} style={{
                    width: '100%', height: 34, borderRadius: 9, marginBottom: 12,
                    background: 'rgba(255,255,255,0.03)', border: `1px dashed ${COLORS.border}`,
                    color: COLORS.textMute, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4v12M12 16l-4-4M12 16l4-4M5 20h14" stroke={COLORS.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Descargar plantilla .xlsx
                </button>

                {/* Botones */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onClose} style={{
                        flex: 1, height: 42, borderRadius: 11,
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`,
                        color: COLORS.text, fontSize: 13.5, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}>Cancelar</button>
                    <button onClick={handleConfirm} style={{
                        flex: 1.4, height: 42, borderRadius: 11,
                        background: preview ? COLORS.green : 'rgba(74,222,128,0.15)',
                        border: `1px solid ${preview ? 'transparent' : 'rgba(74,222,128,0.3)'}`,
                        color: preview ? '#0a2010' : COLORS.green,
                        fontSize: 13.5, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        boxShadow: preview ? '0 6px 18px rgba(74,222,128,0.35)' : 'none',
                        transition: 'background 200ms ease, box-shadow 200ms ease',
                    }}>
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
        <div style={{
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: COLORS.bg,
            borderBottom: `1px solid ${COLORS.border}`,
            position: 'sticky', top: 0, zIndex: 20,
        }}>
            <button onClick={onBack} style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${COLORS.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
            }}>{Icon.back(16, '#cfcfcf')}</button>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, letterSpacing: 3 }}>FLUJOS</div>
            <button onClick={onToggleControls} title="Controles" style={{
                width: 36, height: 36, borderRadius: 10,
                background: controlsOpen ? 'rgba(124,94,245,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${controlsOpen ? 'rgba(124,94,245,0.4)' : COLORS.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background 160ms ease, border-color 160ms ease',
            }}>{Icon.sliders(15, controlsOpen ? COLORS.violet : '#cfcfcf')}</button>
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
        <div style={{ display: 'flex', gap: 8, padding: '14px 16px 6px', alignItems: 'center' }}>
            <button title="En turno activo" onClick={onActiveClick} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 40, padding: '0 10px', borderRadius: 11,
                background: 'rgba(74,222,128,0.10)',
                border: '1px solid rgba(74,222,128,0.28)',
                flexShrink: 0, cursor: 'pointer', fontFamily: 'inherit',
            }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.green, boxShadow: '0 0 8px rgba(74,222,128,0.7)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.green, fontVariantNumeric: 'tabular-nums' }}>{activeCount}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(74,222,128,0.75)', letterSpacing: 0.5, textTransform: 'uppercase' }}>activos</span>
            </button>
            <button title="En descanso o vacaciones" onClick={onFreeClick} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 40, padding: '0 10px', borderRadius: 11,
                background: 'rgba(124,94,245,0.10)',
                border: '1px solid rgba(124,94,245,0.28)',
                flexShrink: 0, marginRight: 'auto',
                cursor: 'pointer', fontFamily: 'inherit',
            }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.violet, boxShadow: '0 0 8px rgba(124,94,245,0.7)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.violet, fontVariantNumeric: 'tabular-nums' }}>{freeCount}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(124,94,245,0.75)', letterSpacing: 0.5, textTransform: 'uppercase' }}>libres</span>
            </button>
            <div style={{
                height: 40, borderRadius: 11,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${focus ? 'rgba(124,94,245,0.5)' : COLORS.border}`,
                display: 'flex', alignItems: 'center', overflow: 'hidden',
                width: expanded ? '100%' : 40,
                flex: expanded ? 1 : '0 0 auto',
                cursor: expanded ? 'text' : 'pointer',
                transition: 'width 220ms cubic-bezier(0.2,0.9,0.3,1), border-color 160ms ease, flex 220ms ease',
            }}
                onClick={() => { if (!expanded) setOpen(true); }}>
                <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {Icon.search(16, focus ? COLORS.violet : COLORS.textMute)}
                </div>
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => { setFocus(true); if (inputRef.current) inputRef.current.focus(); }}
                    onBlur={handleBlur}
                    placeholder="Buscar por nombre o cargo..."
                    style={{
                        flex: 1, minWidth: 0,
                        background: 'transparent', border: 0, outline: 'none',
                        color: COLORS.text, fontSize: 13, fontFamily: 'inherit',
                        paddingRight: 12,
                        opacity: expanded ? 1 : 0,
                        transition: 'opacity 160ms ease',
                        pointerEvents: expanded ? 'auto' : 'none',
                    }}
                />
            </div>
            <button title="Importar" onClick={onImport} style={{
                width: 40, height: 40, borderRadius: 11,
                background: COLORS.green,
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(74,222,128,0.25)',
            }}>
                {Icon.upload(15)}
            </button>
        </div>
    );
}

// ── Bottom nav ──────────────────────────────────────────
function BottomNav({ onHome }) {
    return (
        <div style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)',
            bottom: 0, width: '100%', maxWidth: 430,
            paddingBottom: 12, paddingTop: 8,
            background: '#111111',
            borderTop: `1px solid ${COLORS.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 48,
            zIndex: 30,
        }}>
            <button onClick={onHome} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'transparent', border: 0, cursor: 'pointer', padding: '6px 0',
                color: COLORS.textMute,
            }}>
                {Icon.home(20, COLORS.textMute)}
                <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMute, letterSpacing: 0.3 }}>Inicio</span>
            </button>
            <button style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'transparent', border: 0, cursor: 'pointer', padding: '6px 0',
                color: COLORS.violet,
            }}>
                {Icon.flow(20, COLORS.violet)}
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.violet, letterSpacing: 0.3 }}>Flujos</span>
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

const inputSt = {
    width: '100%', height: 40, padding: '0 12px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: `1px solid #2a2a2a`,
    borderRadius: 10, color: '#fff', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', colorScheme: 'dark',
};

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

    const lbl = (t) => (
        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: COLORS.textMute, letterSpacing: 0.6, marginBottom: 5 }}>{t}</label>
    );
    const CicloYDias = ({ vals, setter }) => (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
                {lbl('CICLO *')}
                <select style={{ ...inputSt, cursor: 'pointer' }} value={vals.cycle} onChange={e => setter('cycle', e.target.value)}>
                    <option value="14-7">14 / 7 días</option>
                    <option value="14-14">14 / 14 días</option>
                    <option value="15-15">15 / 15 días</option>
                    <option value="20-10">20 / 10 días</option>
                    <option value="30">30 días</option>
                </select>
            </div>
            <div style={{ flex: 1 }}>
                {lbl('DÍAS EN TURNO')}
                <div style={{ position: 'relative' }}>
                    <input style={{ ...inputSt, paddingRight: 36 }} type="number" min="1" placeholder="1"
                        value={vals.days} onChange={e => setter('days', e.target.value)} />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: COLORS.textDim, fontWeight: 700, letterSpacing: 0.3, pointerEvents: 'none' }}>AUTO</span>
                </div>
            </div>
        </div>
    );

    return (
        <ModalShell open={open} onClose={onClose}>
            <div style={{
                background: COLORS.cardElev, borderRadius: 18,
                border: `1px solid ${COLORS.borderLight}`,
                padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: COLORS.violetDim,
                            border: '1px solid rgba(124,94,245,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {Icon.user(16, COLORS.violet)}
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{editData ? 'Editar funcionario' : 'Nuevo funcionario'}</div>
                            <div style={{ fontSize: 11.5, color: COLORS.textMute }}>{editData ? 'Actualizar datos del turno' : 'Agregar a turno activo'}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>{Icon.close(12, COLORS.textMute)}</button>
                </div>

                {/* Toggle modo — solo al crear */}
                {!editData && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
                        {[{ id: 'duo', label: '2 personas' }, { id: 'trio', label: '3 personas' }].map(m => (
                            <button key={m.id} onClick={() => { setMode(m.id); setError(''); }} style={{
                                flex: 1, height: 32, borderRadius: 7,
                                background: mode === m.id ? COLORS.violet : 'transparent',
                                border: '1px solid transparent',
                                color: mode === m.id ? '#fff' : COLORS.textMute,
                                fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                transition: 'all 140ms ease',
                            }}>{m.label}</button>
                        ))}
                    </div>
                )}

                {/* ── FORMULARIO DUO ── */}
                {mode === 'duo' && (
                    <>
                        <div style={{ marginBottom: 12 }}>
                            {lbl('NOMBRE COMPLETO *')}
                            <input style={inputSt} placeholder="Ej: Marcelo Quintero Ríos"
                                value={form.name} onChange={e => setF('name', e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            {lbl('CARGO / ROL *')}
                            <input style={inputSt} placeholder="Ej: Operador de Planta"
                                value={form.role} onChange={e => setF('role', e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            {lbl('FECHA DE INGRESO *')}
                            <input style={inputSt} type="date" value={form.inDate} onChange={e => setF('inDate', e.target.value)} />
                        </div>
                        <CicloYDias vals={form} setter={setF} />
                        <div style={{ marginBottom: 12 }}>
                            {lbl('TURNO')}
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[
                                    { id: 'dia',      label: '☀ Día',      color: '#4ade80' },
                                    { id: 'noche',    label: '🌙 Noche',    color: '#3b82f6' },
                                    { id: 'descanso', label: '💤 Descanso', color: '#7c5ef5' },
                                ].map(t => (
                                    <button key={t.id} type="button" onClick={() => setF('turno', t.id)} style={{
                                        flex: 1, height: 36, borderRadius: 9,
                                        background: form.turno === t.id ? `${t.color}22` : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${form.turno === t.id ? t.color + '66' : '#2a2a2a'}`,
                                        color: form.turno === t.id ? t.color : '#8a8a8a',
                                        fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                        transition: 'all 140ms ease',
                                    }}>{t.label}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            {lbl('NOMBRE DEL RELEVO / BACK *')}
                            <input style={inputSt} placeholder="Ej: Rodrigo Salinas Vega"
                                value={form.back} onChange={e => setF('back', e.target.value)} />
                        </div>
                    </>
                )}

                {/* ── FORMULARIO TRIO ── */}
                {mode === 'trio' && (
                    <>
                        <div style={{ marginBottom: 12 }}>
                            {lbl('PUESTO / CARGO *')}
                            <input style={inputSt} placeholder="Ej: Analista de Supervisión"
                                value={trioForm.role} onChange={e => setTF('role', e.target.value)} />
                        </div>
                        <div style={{ background: 'rgba(74,222,128,0.06)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.2)', padding: '10px 12px', marginBottom: 8 }}>
                            <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>☀ PERSONA DÍA *</div>
                            <input style={inputSt} placeholder="Nombre completo"
                                value={trioForm.nameDia} onChange={e => setTF('nameDia', e.target.value)} />
                        </div>
                        <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)', padding: '10px 12px', marginBottom: 8 }}>
                            <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>🌙 PERSONA NOCHE *</div>
                            <input style={inputSt} placeholder="Nombre completo"
                                value={trioForm.nameNoche} onChange={e => setTF('nameNoche', e.target.value)} />
                        </div>
                        <div style={{ background: 'rgba(124,94,245,0.06)', borderRadius: 10, border: '1px solid rgba(124,94,245,0.2)', padding: '10px 12px', marginBottom: 12 }}>
                            <div style={{ fontSize: 10, color: COLORS.violet, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>💤 BACK / DESCANSO *</div>
                            <input style={inputSt} placeholder="Nombre completo"
                                value={trioForm.nameBack} onChange={e => setTF('nameBack', e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            {lbl('FECHA DE INGRESO *')}
                            <input style={inputSt} type="date" value={trioForm.inDate} onChange={e => setTF('inDate', e.target.value)} />
                        </div>
                        <CicloYDias vals={trioForm} setter={setTF} />
                    </>
                )}

                {error && <p style={{ color: COLORS.red, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{error}</p>}

                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onClose} style={{
                        flex: 1, height: 44, borderRadius: 11,
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`,
                        color: COLORS.text, fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}>Cancelar</button>
                    <button onClick={mode === 'trio' ? handleSubmitTrio : handleSubmitDuo} style={{
                        flex: 1.4, height: 44, borderRadius: 11,
                        background: COLORS.violet, border: '1px solid transparent',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: '0 6px 18px rgba(124,94,245,0.4)',
                    }}>{editData ? 'Guardar cambios' : 'Agregar'}</button>
                </div>
            </div>
        </ModalShell>
    );
}

function Toast({ open, msg }) {
    return (
        <div style={{
            position: 'fixed', left: '50%', top: 110,
            transform: `translate(-50%, ${open ? 0 : -20}px)`,
            opacity: open ? 1 : 0,
            transition: 'transform 220ms ease, opacity 220ms ease',
            background: 'rgba(124,94,245,0.95)',
            backdropFilter: 'blur(8px)',
            color: '#fff', fontSize: 12, fontWeight: 600,
            padding: '8px 14px', borderRadius: 999,
            boxShadow: '0 10px 30px rgba(124,94,245,0.45)',
            pointerEvents: 'none', zIndex: 80,
            whiteSpace: 'nowrap',
        }}>{msg}</div>
    );
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
    const [fabHover, setFabHover] = useState(false);
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
        <div style={{
            width: '100%', height: '100%',
            background: COLORS.bg, color: COLORS.text,
            position: 'relative',
            fontFamily: '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
        }}>
            <style>{`
                .fp-scroll { scrollbar-width: thin; scrollbar-color: rgba(124,94,245,0.35) transparent; }
                .fp-scroll::-webkit-scrollbar { width: 5px; }
                .fp-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 4px; }
                .fp-scroll::-webkit-scrollbar-thumb { background: rgba(124,94,245,0.35); border-radius: 4px; }
                .fp-scroll::-webkit-scrollbar-thumb:hover { background: rgba(124,94,245,0.65); }
            `}</style>
            <PageHeader
                onBack={() => navigate('/workspace', { state: { openDrawer: true, activeTab: 'jefes' } })}
                controlsOpen={controlsOpen}
                onToggleControls={() => setControlsOpen(v => !v)}
            />
            <Toast open={!!toast} msg={toast || ''} />

            <div className="fp-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
                {/* Centra el contenido igual que WorkspacePage en escritorio */}
                <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
                    <div style={{
                        maxHeight: controlsOpen ? 80 : 0,
                        overflow: 'hidden',
                        transition: 'max-height 220ms cubic-bezier(0.2,0.9,0.3,1)',
                    }}>
                        <SearchBar
                            value={search} onChange={setSearch}
                            onImport={() => setImportOpen(true)}
                            activeCount={activeCount}
                            freeCount={freeCount}
                            onActiveClick={() => setCountOpen('active')}
                            onFreeClick={() => setCountOpen('free')}
                        />
                    </div>
                    <div style={{ padding: '0 16px' }}>
                        {loading && (
                            <div style={{ textAlign: 'center', padding: '40px 16px', color: COLORS.textMute, fontSize: 13 }}>
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
                            <div style={{ textAlign: 'center', padding: '40px 16px', color: COLORS.textMute, fontSize: 13 }}>
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
            <button
                onMouseEnter={() => setFabHover(true)}
                onMouseLeave={() => setFabHover(false)}
                onClick={() => setAddOpen(true)}
                style={{
                    position: 'fixed', bottom: 28, right: 20,
                    width: 56, height: 56, borderRadius: '50%',
                    background: COLORS.violet,
                    border: `3px solid ${COLORS.bg}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 40,
                    boxShadow: fabHover
                        ? '0 10px 28px rgba(124,94,245,0.6), 0 0 0 6px rgba(124,94,245,0.12)'
                        : '0 6px 20px rgba(124,94,245,0.5)',
                    transition: 'box-shadow 180ms ease, transform 180ms ease',
                    transform: fabHover ? 'translateY(-2px)' : 'none',
                }}>
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
