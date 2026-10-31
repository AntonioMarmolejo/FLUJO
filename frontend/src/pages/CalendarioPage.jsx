import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../styles/CalendarioPage.css';

// ── Paleta por defecto (tema oscuro) ─────────────────────
const C = {
    bg: '#0a0a0a', card: '#111111', cardElev: '#1a1a1a',
    border: '#2a2a2a', borderLight: '#333',
    text: '#ffffff', mute: '#8a8a8a', dim: '#4a4a4a',
    violet: '#7c5ef5', violetDim: 'rgba(124,94,245,0.14)',
    red: '#E24B4A', redDim: 'rgba(226,75,74,0.14)',
    dayEmpty: 'rgba(255,255,255,0.90)', dayText: '#444', navBg: 'rgba(255,255,255,0.05)',
};

// ── Temas ─────────────────────────────────────────────────
const THEMES = {
    oscuro: { ...C },
    claro: {
        bg: '#eef1f6', card: '#ffffff', cardElev: '#f5f7fb',
        border: '#d4d9e5', borderLight: '#bcc4d4',
        text: '#111827', mute: '#6b7280', dim: '#9ca3af',
        violet: '#6d28d9', violetDim: 'rgba(109,40,217,0.10)',
        red: '#dc2626', redDim: 'rgba(220,38,38,0.10)',
        dayEmpty: '#ffffff', dayText: '#374151', navBg: 'rgba(0,0,0,0.06)',
    },
    marino: {
        bg: '#0b1a2e', card: '#102240', cardElev: '#163054',
        border: '#1e3a5f', borderLight: '#2a4f7c',
        text: '#e0eeff', mute: '#6a90bc', dim: '#2a4a70',
        violet: '#4f8ef5', violetDim: 'rgba(79,142,245,0.15)',
        red: '#f56565', redDim: 'rgba(245,101,101,0.14)',
        dayEmpty: 'rgba(210,232,255,0.88)', dayText: '#1a2a40', navBg: 'rgba(255,255,255,0.06)',
    },
    bosque: {
        bg: '#091410', card: '#0e1f18', cardElev: '#142a20',
        border: '#1c3a28', borderLight: '#264d34',
        text: '#d8f0e2', mute: '#5e9970', dim: '#274535',
        violet: '#3ab56a', violetDim: 'rgba(58,181,106,0.15)',
        red: '#f56565', redDim: 'rgba(245,101,101,0.14)',
        dayEmpty: 'rgba(208,245,220,0.88)', dayText: '#1a2e1d', navBg: 'rgba(255,255,255,0.06)',
    },
};

const THEME_LABELS = { oscuro: 'Oscuro', claro: 'Claro', marino: 'Marino', bosque: 'Bosque' };

// ── Turnos por defecto ───────────────────────────────────
const DEFAULT_SHIFTS = [
    { id: 'dia',        label: 'Día',        short: 'Día',   bg: '#1e3a8a', text: '#93c5fd', hours: 12, time: '06:00–18:00' },
    { id: 'noche',      label: 'Noche',      short: 'Noche', bg: '#1a1a2e', text: '#c7d2fe', hours: 12, time: '18:00–06:00' },
    { id: 'libre',      label: 'Libre',      short: 'Libre', bg: '#14532d', text: '#86efac', hours: 0,  time: '' },
    { id: 'vacaciones', label: 'Vacaciones', short: 'Vac.',  bg: '#7c2d12', text: '#fdba74', hours: 0,  time: '' },
];

// ── Fechas ───────────────────────────────────────────────
const MONTHS   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_S = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS_H   = ['L','M','X','J','V','S','D'];

const isoDate    = (y,m,d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const daysInMonth = (y,m)  => new Date(y,m+1,0).getDate();
const startDow   = (y,m)   => { const d=new Date(y,m,1).getDay(); return d===0?6:d-1; };
const todayISO   = ()       => { const t=new Date(); return isoDate(t.getFullYear(),t.getMonth(),t.getDate()); };
const loadShifts = ()       => { try { const s=localStorage.getItem('flujo_shifts'); return s?JSON.parse(s):DEFAULT_SHIFTS; } catch { return DEFAULT_SHIFTS; } };

// Colores de un turno como variables CSS (los elige el usuario, por eso van en línea).
// El sufijo hexadecimal agrega transparencia: aa ≈ 67 %, 88 ≈ 53 %, cc ≈ 80 %.
const turnoVars = (s, borde = 'aa') => s ? ({ '--t-bg': s.bg, '--t-texto': s.text, '--t-borde': s.bg + borde }) : undefined;

// ── Iconos ───────────────────────────────────────────────
const Ico = {
    back:   (c='#fff') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    left:   (c='#fff') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    right:  (c='#fff') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    up:     (c='#fff') => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    down:   (c='#fff') => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    plus:   (c='#fff',s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>,
    edit:   (c='#fff') => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10-10-4-4L4 16v4z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 6l4 4" stroke={c} strokeWidth="1.8"/></svg>,
    trash:  (c='#fff') => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M7 7l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    chev:   (c='#fff') => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    cal:    (c='#fff',s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke={c} strokeWidth="1.8"/><path d="M3 9h18M8 2v4M16 2v4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
    close:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
    eraser: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 20H7L3 16l11-11 6 6-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 17.5l4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    share:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    gear:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 12a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#fff" strokeWidth="1.8"/></svg>,
    palette: (c='#fff') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 1.1 0 2-.9 2-2 0-.52-.2-1-.52-1.36-.31-.36-.49-.83-.49-1.32 0-1.1.9-2 2-2h2.36c3.1 0 5.64-2.54 5.64-5.64C23 6.18 18.04 2 12 2z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7.5" cy="11.5" r="1.5" fill={c}/><circle cx="12" cy="7" r="1.5" fill={c}/><circle cx="16.5" cy="11.5" r="1.5" fill={c}/></svg>,
};

// ── DayCell ───────────────────────────────────────────────
function DayCell({ day, shiftId, isToday, paintMode, onClick, shifts }) {
    const shift = shiftId ? shifts.find(s => s.id === shiftId) : null;
    return (
        <div onClick={onClick} style={turnoVars(shift)}
            className={['cal-dia', shift && 'con-turno', isToday && 'hoy', paintMode && 'pintable'].filter(Boolean).join(' ')}>
            {isToday && <div className="cal-dia-punto" />}
            <span className="cal-dia-num">{day}</span>
            {shift && <span className="cal-dia-turno">{shift.time || shift.short}</span>}
        </div>
    );
}

// ── MonthGrid ────────────────────────────────────────────
function MonthGrid({ year, month, dias, paintMode, selectedShift, onDayTap, shifts }) {
    const today = todayISO();
    const numDays = daysInMonth(year, month);
    const startDay = startDow(year, month);
    const cells = [...Array(startDay).fill(null), ...Array.from({length:numDays},(_,i)=>i+1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return (
        <div>
            <div className="cal-semana">
                {DAYS_H.map(d => <div key={d} className="cal-semana-dia">{d}</div>)}
            </div>
            <div className="cal-mes-grid">
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx} className="cal-dia-vacio" />;
                    const iso = isoDate(year, month, day);
                    return (
                        <DayCell key={idx} day={day} shiftId={dias[iso]||null}
                            isToday={iso===today} paintMode={paintMode} shifts={shifts}
                            onClick={() => paintMode && onDayTap(iso, selectedShift)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// ── MiniMonth ────────────────────────────────────────────
function MiniMonth({ year, month, dias, shifts }) {
    const numDays = daysInMonth(year, month);
    const startDay = startDow(year, month);
    const cells = [...Array(startDay).fill(null), ...Array.from({length:numDays},(_,i)=>i+1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return (
        <div className="cal-mini">
            <div className="cal-mini-titulo">{MONTHS_S[month].toUpperCase()}</div>
            <div className="cal-mini-semana">
                {DAYS_H.map(d => <div key={d} className="cal-mini-semana-dia">{d}</div>)}
            </div>
            <div className="cal-mini-grid">
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx} className="cal-mini-vacio" />;
                    const iso = isoDate(year, month, day);
                    const s = dias[iso] ? shifts.find(sh => sh.id === dias[iso]) : null;
                    return (
                        <div key={idx} className={`cal-mini-dia${s ? ' con-turno' : ''}`} style={turnoVars(s, '88')}>
                            <span className="cal-mini-num">{day}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── StatsView ────────────────────────────────────────────
function StatsView({ dias, shifts, C }) {
    const now = new Date();
    const [period, setPeriod] = useState('mes');
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());

    const prevPeriod = () => { if(period==='mes'){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}else setYear(y=>y-1); };
    const nextPeriod = () => { if(period==='mes'){if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}else setYear(y=>y+1); };

    const stats = (() => {
        const counts = {};
        shifts.forEach(s => counts[s.id] = 0);
        Object.entries(dias).forEach(([date, shiftId]) => {
            const d = new Date(date+'T00:00:00');
            const match = period==='mes' ? (d.getFullYear()===year && d.getMonth()===month) : d.getFullYear()===year;
            if (match && counts[shiftId] !== undefined) counts[shiftId]++;
        });
        return counts;
    })();

    const totalDias  = Object.values(stats).reduce((a,b)=>a+b, 0);
    const totalHoras = shifts.reduce((acc,s) => acc + (stats[s.id]||0) * s.hours, 0);
    const periodLabel = period==='mes' ? `${MONTHS[month]} ${year}` : `${year}`;

    return (
        <div className="cal-stats">
            <div className="cal-periodo">
                {[['mes','Mes'],['año','Año']].map(([id,lbl])=>(
                    <button key={id} className={`cal-periodo-btn${period===id ? ' activo' : ''}`} onClick={()=>setPeriod(id)}>{lbl}</button>
                ))}
            </div>
            <div className="cal-periodo-nav">
                <button className="cal-nav-btn" onClick={prevPeriod}>{Ico.left(C.text)}</button>
                <span className="cal-periodo-label">{periodLabel}</span>
                <button className="cal-nav-btn" onClick={nextPeriod}>{Ico.right(C.text)}</button>
            </div>
            <div className="cal-tabla">
                <div className="cal-tabla-fila cal-tabla-head">
                    <span className="cal-tabla-th cal-tabla-th-primera">TURNO</span>
                    <span className="cal-tabla-th">DÍAS</span>
                    <span className="cal-tabla-th">HORAS</span>
                </div>
                {shifts.map(s => {
                    const cnt = stats[s.id] || 0;
                    const hrs = cnt * s.hours;
                    return (
                        <div key={s.id} className="cal-tabla-fila" style={turnoVars(s)}>
                            <div className="cal-tabla-turno">
                                <div className="cal-turno-chip"><span className="cal-turno-chip-txt">{s.short}</span></div>
                                <div>
                                    <div className="cal-turno-nombre">{s.label}</div>
                                    {s.time && <div className="cal-turno-hora">{s.time}</div>}
                                </div>
                            </div>
                            <span className={`cal-tabla-dias${cnt>0 ? '' : ' cero'}`}>{cnt}</span>
                            <span className={`cal-tabla-horas${cnt>0 ? '' : ' cero'}`}>{hrs>0?`${hrs}h`:'—'}</span>
                        </div>
                    );
                })}
                <div className="cal-tabla-fila cal-tabla-total">
                    <span className="cal-tabla-total-label">TOTAL</span>
                    <span className="cal-tabla-total-num">{totalDias}</span>
                    <span className="cal-tabla-total-num">{totalHoras}h</span>
                </div>
            </div>
        </div>
    );
}

// ── GroupModal ───────────────────────────────────────────
function GroupModal({ open, editing, onClose, onSave, onDelete }) {
    const [name, setName] = useState('');
    const [confirmDel, setConfirmDel] = useState(false);
    useEffect(() => { if(open){ setName(editing?editing.nombre:''); setConfirmDel(false); } }, [open, editing]);
    if (!open) return null;
    return (
        <div className="cal-modal cal-paleta-fija">
            <div className="cal-modal-fondo" onClick={onClose} />
            <div className="cal-modal-caja">
                <div className="cal-modal-top">
                    <div className="cal-modal-titulo-fila">{Ico.cal(C.violet,18)}<span className="cal-modal-titulo">{editing?'Editar grupo':'Nuevo grupo'}</span></div>
                    <button className="cal-cerrar" onClick={onClose}>{Ico.close()}</button>
                </div>
                <label className="cal-label">NOMBRE DEL GRUPO</label>
                <input className="cal-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Grupo A, Turno Norte..." autoFocus onKeyDown={e=>e.key==='Enter'&&name.trim()&&onSave(name.trim())} />
                <div className="cal-botones">
                    <button className="cal-btn cal-btn-sec" onClick={onClose}>Cancelar</button>
                    <button className="cal-btn cal-btn-primario" onClick={()=>name.trim()&&onSave(name.trim())}>{editing?'Guardar':'Crear'}</button>
                </div>
                {editing && !confirmDel && <button className="cal-eliminar" onClick={()=>setConfirmDel(true)}>{Ico.trash(C.red)} Eliminar grupo</button>}
                {editing && confirmDel && (
                    <div className="cal-confirmar">
                        <p className="cal-confirmar-texto">¿Eliminar "{editing.nombre}" y todos sus datos?</p>
                        <div className="cal-confirmar-botones">
                            <button className="cal-btn-mini cal-btn-mini-no" onClick={()=>setConfirmDel(false)}>No</button>
                            <button className="cal-btn-mini cal-btn-mini-si" onClick={onDelete}>Sí, eliminar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Colores predefinidos ─────────────────────────────────
const PRESET_BG = ['#1e3a8a','#1a1a2e','#14532d','#7c2d12','#374151','#4c1d95','#064e3b','#7f1d1d','#000000','#18181b','#0d9488','#b45309','#831843','#1e1b4b','#dc2626','#d97706'];
const PRESET_TX = ['#ffffff','#93c5fd','#c7d2fe','#86efac','#fdba74','#d4d4d4','#fbbf24','#f87171','#a78bfa','#34d399','#60a5fa','#e5e7eb','#f9a8d4','#6ee7b7','#fca5a5','#fde68a'];

// ── ShiftForm ────────────────────────────────────────────
function ShiftForm({ shift, onBack, onSave, onDelete }) {
    const isNew = !shift;
    const [form, setForm] = useState(() => shift ? { ...shift } : { id:`t_${Date.now()}`, label:'', short:'', bg:'#374151', text:'#ffffff', hours:0, time:'' });
    const [confirmDel, setConfirmDel] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Paleta de colores: función (no componente) para no recrearla en cada render.
    // Cada muestra lleva su color en línea, porque es justamente lo que muestra.
    const paleta = (value, palette, onChange) => (
        <div className="cal-paleta">
            {palette.map(c => (
                <button key={c} className={`cal-color${value===c ? ' elegido' : ''}`} style={{ background: c }} onClick={() => onChange(c)} />
            ))}
            <label className="cal-color-mas">
                <span className="cal-color-mas-signo">+</span>
                <input type="color" className="cal-color-input" value={value} onChange={e=>onChange(e.target.value)} />
            </label>
        </div>
    );

    return (
        <div className="cal-modal cal-modal-superior cal-paleta-fija">
            <div className="cal-modal-fondo cal-modal-fondo-oscuro" />
            <div className="cal-modal-caja cal-modal-caja-form cal-scroll">
                {/* Header */}
                <div className="cal-form-top">
                    <button className="cal-volver" onClick={onBack}>{Ico.left()}</button>
                    <span className="cal-form-titulo">{isNew ? 'Nuevo turno' : 'Editar turno'}</span>
                </div>

                {/* Preview con los colores elegidos */}
                <div className="cal-preview" style={turnoVars(form)}>
                    <div className="cal-preview-chip"><span className="cal-preview-corto">{form.short||'?'}</span></div>
                    <div>
                        <div className="cal-preview-nombre">{form.label||'Nombre del turno'}</div>
                        {form.time && <div className="cal-preview-hora">{form.time}</div>}
                    </div>
                </div>

                {/* Nombre */}
                <label className="cal-label">NOMBRE</label>
                <input className="cal-input cal-input-form cal-input-separado" value={form.label} onChange={e=>set('label',e.target.value)} placeholder="Ej: Día, Noche, Libre..." />

                {/* Abreviatura */}
                <div className="cal-form-fila">
                    <div className="cal-form-col">
                        <label className="cal-label">ABREVIATURA</label>
                        <input className="cal-input cal-input-form" value={form.short} onChange={e=>set('short',e.target.value.slice(0,6))} placeholder="Día, Noc..." />
                    </div>
                    <div className="cal-form-col">
                        <label className="cal-label">HORAS</label>
                        <input className="cal-input cal-input-form" type="number" min="0" max="24" value={form.hours} onChange={e=>set('hours',parseInt(e.target.value)||0)} />
                    </div>
                </div>

                {/* Horario */}
                <label className="cal-label">HORARIO (opcional)</label>
                <input className="cal-input cal-input-form cal-input-separado-16" value={form.time} onChange={e=>set('time',e.target.value)} placeholder="Ej: 06:00–18:00" />

                {/* Color de fondo */}
                <label className="cal-label cal-label-sin-margen">COLOR DE FONDO</label>
                {paleta(form.bg, PRESET_BG, v=>set('bg',v))}

                {/* Color de texto */}
                <label className="cal-label cal-label-sin-margen cal-label-separado">COLOR DE TEXTO</label>
                {paleta(form.text, PRESET_TX, v=>set('text',v))}

                {/* Botones */}
                <div className="cal-botones cal-botones-form">
                    <button className="cal-btn cal-btn-sec" onClick={onBack}>Cancelar</button>
                    <button className={`cal-btn cal-btn-primario cal-btn-sin-sombra${form.label.trim() ? '' : ' deshabilitado'}`} onClick={() => form.label.trim() && onSave(form)}>
                        {isNew ? 'Crear' : 'Guardar'}
                    </button>
                </div>
                {!isNew && !confirmDel && (
                    <button className="cal-eliminar" onClick={()=>setConfirmDel(true)}>
                        {Ico.trash(C.red)} Eliminar turno
                    </button>
                )}
                {!isNew && confirmDel && (
                    <div className="cal-confirmar">
                        <p className="cal-confirmar-texto">¿Eliminar este turno? Los días pintados con él quedarán sin color.</p>
                        <div className="cal-confirmar-botones">
                            <button className="cal-btn-mini cal-btn-mini-no" onClick={()=>setConfirmDel(false)}>No</button>
                            <button className="cal-btn-mini cal-btn-mini-si" onClick={()=>onDelete(shift.id)}>Sí, eliminar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── ShiftModal (lista + gestión) ─────────────────────────
function ShiftModal({ open, shifts, onClose, onSaveShift, onDeleteShift, onReorder }) {
    const [view, setView] = useState('list');
    const [editingShift, setEditingShift] = useState(null);

    useEffect(() => { if (open) setView('list'); }, [open]);
    if (!open) return null;

    if (view === 'form') {
        return (
            <ShiftForm
                shift={editingShift}
                onBack={() => setView('list')}
                onSave={(s) => { onSaveShift(s); setView('list'); }}
                onDelete={(id) => { onDeleteShift(id); setView('list'); }}
            />
        );
    }

    return (
        <div className="cal-modal cal-paleta-fija">
            <div className="cal-modal-fondo" onClick={onClose} />
            <div className="cal-modal-caja cal-modal-caja-lista">
                <div className="cal-modal-top">
                    <span className="cal-modal-titulo">Tipos de turno</span>
                    <button className="cal-cerrar" onClick={onClose}>{Ico.close()}</button>
                </div>

                <div className="cal-scroll cal-turnos-lista">
                    {shifts.map((s, i) => (
                        <div key={s.id} className="cal-turno-fila" style={turnoVars(s)}>
                            <div className="cal-turno-chip cal-turno-chip-grande"><span className="cal-turno-chip-txt">{s.short}</span></div>
                            <div className="cal-turno-info">
                                <div className="cal-turno-nombre cal-turno-nombre-corto">{s.label}</div>
                                <div className="cal-turno-hora">{s.time||`${s.hours>0?s.hours+'h':'Sin horario'}`}</div>
                            </div>
                            <div className="cal-orden">
                                <button className="cal-orden-btn" disabled={i===0} onClick={() => onReorder(i,-1)}>{Ico.up(i===0?'#333':'#fff')}</button>
                                <button className="cal-orden-btn" disabled={i===shifts.length-1} onClick={() => onReorder(i,1)}>{Ico.down(i===shifts.length-1?'#333':'#fff')}</button>
                            </div>
                            <button className="cal-editar" onClick={() => { setEditingShift(s); setView('form'); }}>
                                {Ico.edit()}
                            </button>
                        </div>
                    ))}
                </div>

                <button className="cal-crear-turno" onClick={() => { setEditingShift(null); setView('form'); }}>
                    {Ico.plus('#fff',16)} Crear turno nuevo
                </button>
            </div>
        </div>
    );
}

// ── Page principal ───────────────────────────────────────
const CalendarioPage = () => {
    const navigate = useNavigate();
    const now = new Date();

    const [themeKey, setThemeKey] = useState(() => localStorage.getItem('cal_theme') || 'oscuro');
    const [themeOpen, setThemeOpen] = useState(false);
    const temaActual = THEMES[themeKey] ? themeKey : 'oscuro';
    const C = THEMES[temaActual];

    const [shifts, setShifts] = useState(loadShifts);
    const [grupos, setGrupos] = useState([]);
    const [activeGrupo, setActiveGrupo] = useState(null);
    const [dias, setDias] = useState({});
    const [tab, setTab] = useState('mes');
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [paintMode, setPaintMode] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [groupsOpen, setGroupsOpen] = useState(false);
    const [groupModal, setGroupModal] = useState(false);
    const [editingGrupo, setEditingGrupo] = useState(null);
    const [shiftModal, setShiftModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [yearAnual, setYearAnual] = useState(now.getFullYear());
    const saveRef = useRef(null);
    const pendingRef = useRef({});
    const activeGrupoIdRef = useRef(null);
    const monthCaptureRef = useRef(null);
    const yearCaptureRef = useRef(null);

    const changeTheme = (key) => {
        setThemeKey(key);
        localStorage.setItem('cal_theme', key);
        setThemeOpen(false);
    };

    useEffect(() => { localStorage.setItem('flujo_shifts', JSON.stringify(shifts)); }, [shifts]);

    const diasFromApi = (g) => g.dias ? Object.fromEntries(Object.entries(g.dias)) : {};

    const flushPending = () => {
        clearTimeout(saveRef.current);
        const pending = { ...pendingRef.current };
        pendingRef.current = {};
        const grupoId = activeGrupoIdRef.current;
        if (Object.keys(pending).length > 0 && grupoId) {
            Object.entries(pending).forEach(([date, s]) => {
                api.patch(`/calendarios/${grupoId}/dia`, { date, shift: s }).catch(() => {});
            });
        }
    };

    useEffect(() => {
        api.get('/calendarios')
            .then(res => {
                setGrupos(res.data.grupos);
                if (res.data.grupos.length > 0) switchGrupoData(res.data.grupos[0]);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        return () => { flushPending(); };
    }, []);

    const switchGrupoData = (g) => {
        flushPending();
        activeGrupoIdRef.current = g._id;
        setActiveGrupo(g);
        setDias(diasFromApi(g));
        setGroupsOpen(false);
    };

    const handleDayTap = (iso, shift) => {
        if (!activeGrupoIdRef.current) return;
        const next = dias[iso] === shift ? null : shift;
        setDias(prev => { const d={...prev}; if(next) d[iso]=next; else delete d[iso]; return d; });
        pendingRef.current[iso] = next;
        clearTimeout(saveRef.current);
        saveRef.current = setTimeout(() => {
            const changes = { ...pendingRef.current };
            pendingRef.current = {};
            const grupoId = activeGrupoIdRef.current;
            if (!grupoId) return;
            Object.entries(changes).forEach(([date, s]) => {
                api.patch(`/calendarios/${grupoId}/dia`, { date, shift: s }).catch(() => {});
            });
        }, 400);
    };

    const handleSaveGrupo = async (nombre) => {
        try {
            if (editingGrupo) {
                const res = await api.put(`/calendarios/${editingGrupo._id}`, { nombre });
                const updated = res.data.grupo;
                setGrupos(prev => prev.map(g => g._id===updated._id ? updated : g));
                if (activeGrupo?._id===updated._id) setActiveGrupo(updated);
            } else {
                const res = await api.post('/calendarios', { nombre });
                const newG = res.data.grupo;
                setGrupos(prev => [...prev, newG]);
                switchGrupoData(newG);
            }
            setGroupModal(false); setEditingGrupo(null);
        } catch {}
    };

    const handleDeleteGrupo = async () => {
        if (!editingGrupo) return;
        try {
            await api.delete(`/calendarios/${editingGrupo._id}`);
            const remaining = grupos.filter(g => g._id!==editingGrupo._id);
            setGrupos(remaining);
            if (activeGrupo?._id===editingGrupo._id) {
                if (remaining.length>0) switchGrupoData(remaining[0]); else { setActiveGrupo(null); setDias({}); }
            }
            setGroupModal(false); setEditingGrupo(null);
        } catch {}
    };

    const handleSaveShift = (s) => {
        setShifts(prev => {
            const idx = prev.findIndex(x => x.id===s.id);
            if (idx>=0) { const n=[...prev]; n[idx]=s; return n; }
            return [...prev, s];
        });
    };
    const handleDeleteShift = (id) => setShifts(prev => prev.filter(s => s.id!==id));
    const handleReorder = (i, dir) => {
        setShifts(prev => {
            const a=[...prev]; const j=i+dir;
            if(j<0||j>=a.length) return a;
            [a[i],a[j]]=[a[j],a[i]]; return a;
        });
    };

    const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
    const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

    const handleShare = async () => {
        const isYear = tab === 'año';
        const captureRef = isYear ? yearCaptureRef : monthCaptureRef;
        const captureYear = isYear ? yearAnual : year;
        const filename = `calendario_${(activeGrupo?.nombre||'flujo').replace(/\s+/g,'_')}_${isYear ? captureYear : `${MONTHS[month]}_${captureYear}`}.png`;

        if (captureRef.current) {
            try {
                const h2c = (await import('html2canvas')).default;
                const canvas = await h2c(captureRef.current, {
                    backgroundColor: C.bg,
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    allowTaint: true,
                });
                canvas.toBlob(async blob => {
                    const file = new File([blob], filename, { type: 'image/png' });
                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                        await navigator.share({ title: `Calendario — ${activeGrupo?.nombre||'FLUJO'}`, files: [file] }).catch(() => {});
                    } else {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = filename;
                        document.body.appendChild(a); a.click();
                        document.body.removeChild(a); URL.revokeObjectURL(url);
                    }
                }, 'image/png');
                return;
            } catch { /* fallback a texto */ }
        }
        const text = `Calendario ${activeGrupo?.nombre||''} — ${captureYear}`;
        if (navigator.share) navigator.share({ title: 'Calendario', text }).catch(() => {});
        else navigator.clipboard?.writeText(text);
    };

    // Al entrar en modo pintar, seleccionar el primer turno por defecto
    const enterPaintMode = () => {
        if (shifts.length > 0 && selectedShift === null) setSelectedShift(shifts[0].id);
        setPaintMode(true);
    };

    return (
        // .cal-tema-* define las variables de color del tema elegido (ver CalendarioPage.css)
        <div className={`cal cal-tema-${temaActual}`}>
            {/* Header */}
            <div className="cal-header">
                <button className="cal-header-btn" onClick={() => navigate('/workspace', { state: { openDrawer: true, activeTab: 'calendario' } })}>
                    {Ico.back(C.text)}
                </button>
                <span className="cal-header-titulo">CALENDARIO</span>
                <div className="cal-header-acciones">
                    <button className={`cal-header-btn${themeOpen ? ' activo' : ''}`} onClick={() => setThemeOpen(v => !v)}>
                        {Ico.palette(themeOpen ? C.violet : C.mute)}
                    </button>
                    <button className="cal-header-btn" onClick={() => { setEditingGrupo(null); setGroupModal(true); }}>
                        {Ico.plus()}
                    </button>
                </div>
            </div>

            {/* Selector de tema */}
            {themeOpen && (
                <div className="cal-temas">
                    <p className="cal-temas-label">TEMA</p>
                    <div className="cal-temas-grid">
                        {Object.entries(THEME_LABELS).map(([key, label]) => (
                            <button key={key} className={`cal-tema-btn cal-tema-btn-${key}${themeKey === key ? ' activo' : ''}`} onClick={() => changeTheme(key)}>
                                <div className="cal-tema-punto" />
                                <span className="cal-tema-nombre">{label.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Group selector */}
            {!loading && grupos.length > 0 && (
                <div className="cal-grupo">
                    <button className="cal-grupo-btn" onClick={() => setGroupsOpen(v=>!v)}>
                        <div className="cal-grupo-actual">{Ico.cal(C.violet,14)}<span className="cal-grupo-nombre">{activeGrupo?.nombre||'—'}</span></div>
                        {Ico.chev(C.mute)}
                    </button>
                    {groupsOpen && (
                        <div className="cal-grupos">
                            {grupos.map(g => (
                                <div key={g._id} className={`cal-grupos-item${g._id===activeGrupo?._id ? ' activo' : ''}`}>
                                    <button className="cal-grupos-elegir" onClick={() => switchGrupoData(g)}>
                                        <span className="cal-grupos-nombre">{g.nombre}</span>
                                    </button>
                                    <button className="cal-grupos-editar" onClick={() => { setEditingGrupo(g); setGroupModal(true); setGroupsOpen(false); }}>
                                        {Ico.edit()}
                                    </button>
                                </div>
                            ))}
                            <button className="cal-grupos-nuevo" onClick={() => { setEditingGrupo(null); setGroupModal(true); setGroupsOpen(false); }}>
                                {Ico.plus(C.mute,14)}<span className="cal-grupos-nuevo-label">Nuevo grupo</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!loading && grupos.length === 0 && (
                <div className="cal-sin-grupos">
                    {Ico.cal(C.dim,48)}
                    <p className="cal-sin-grupos-texto">Sin grupos de calendario.<br/>Crea uno para comenzar.</p>
                    <button className="cal-btn-crear" onClick={() => { setEditingGrupo(null); setGroupModal(true); }}>Crear primer grupo</button>
                </div>
            )}

            {loading && <div className="cal-cargando"><span className="cal-cargando-texto">Cargando…</span></div>}

            {!loading && activeGrupo && (
                <>
                    {/* Tab bar */}
                    <div className="cal-tabs">
                        {[['mes','MES'],['año','AÑO'],['resumen','RESUMEN']].map(([id,lbl])=>(
                            <button key={id} className={`cal-tab${tab===id ? ' activo' : ''}`} onClick={() => { setTab(id); if(id!=='mes') setPaintMode(false); }}>{lbl}</button>
                        ))}
                    </div>

                    <div className={`cal-scroll cal-contenido${tab==='mes' ? (paintMode ? ' pintando' : ' con-pie') : ''}`}>
                        {tab==='mes' && (
                            <div ref={monthCaptureRef} className="cal-mes">
                                <div className="cal-mes-nav">
                                    <button className="cal-nav-btn" onClick={prevMonth}>{Ico.left(C.text)}</button>
                                    <span className="cal-mes-titulo">{MONTHS[month].toUpperCase()} {year}</span>
                                    <div className="cal-mes-acciones">
                                        <button className="cal-nav-btn" onClick={nextMonth}>{Ico.right(C.text)}</button>
                                        <button className="cal-compartir" onClick={handleShare}>{Ico.share()}</button>
                                    </div>
                                </div>
                                <MonthGrid year={year} month={month} dias={dias} paintMode={paintMode} selectedShift={selectedShift} onDayTap={handleDayTap} shifts={shifts} />
                                <div className="cal-leyenda">
                                    {shifts.map(s => (
                                        <div key={s.id} className="cal-leyenda-item" style={turnoVars(s)}>
                                            <div className="cal-leyenda-color" />
                                            <span className="cal-leyenda-nombre">{s.label}</span>
                                            {s.time && <span className="cal-leyenda-hora">{s.time}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tab==='año' && (
                            <div className="cal-anio">
                                <div className="cal-anio-nav">
                                    <button className="cal-nav-btn" onClick={() => setYearAnual(y=>y-1)}>{Ico.left(C.text)}</button>
                                    <div className="cal-anio-centro">
                                        <span className="cal-anio-actual">{yearAnual}</span>
                                        <button className="cal-compartir cal-compartir-chico" onClick={handleShare}>{Ico.share()}</button>
                                    </div>
                                    <button className="cal-nav-btn" onClick={() => setYearAnual(y=>y+1)}>{Ico.right(C.text)}</button>
                                </div>
                                <div ref={yearCaptureRef} className="cal-anio-captura">
                                    <div className="cal-anio-titulo">
                                        <div className="cal-anio-grupo">{activeGrupo?.nombre?.toUpperCase()}</div>
                                        <div className="cal-anio-num">{yearAnual}</div>
                                    </div>
                                    <div className="cal-anio-grid">
                                        {Array.from({length:12},(_,m) => <MiniMonth key={m} year={yearAnual} month={m} dias={dias} shifts={shifts} />)}
                                    </div>
                                </div>
                                <div className="cal-anio-stats">
                                    <div className="cal-anio-stats-head">
                                        <span className="cal-anio-stats-label">ESTADÍSTICA ANUAL {yearAnual}</span>
                                    </div>
                                    {(() => {
                                        const counts = {}; shifts.forEach(s => counts[s.id]=0);
                                        Object.entries(dias).forEach(([date,sid]) => { if(new Date(date+'T00:00:00').getFullYear()===yearAnual && counts[sid]!==undefined) counts[sid]++; });
                                        return shifts.map(s => { const cnt=counts[s.id]||0; const hrs=cnt*s.hours; return (
                                            <div key={s.id} className="cal-anio-fila" style={turnoVars(s)}>
                                                <div className="cal-turno-chip cal-turno-chip-chico"><span className="cal-turno-chip-txt">{s.short}</span></div>
                                                <span className="cal-anio-fila-nombre">{s.label}</span>
                                                <span className="cal-anio-fila-dias">{cnt} días</span>
                                                <span className="cal-anio-fila-horas">{hrs>0?`${hrs}h`:'—'}</span>
                                            </div>
                                        ); });
                                    })()}
                                </div>
                            </div>
                        )}

                        {tab==='resumen' && <StatsView dias={dias} shifts={shifts} C={C} />}
                    </div>

                    {/* Botón PINTAR (cuando no está en modo pintar) */}
                    {tab==='mes' && !paintMode && (
                        <div className="cal-pintar">
                            <button className="cal-pintar-btn" onClick={enterPaintMode}>PINTAR</button>
                        </div>
                    )}

                    {/* Barra de pintura — animada, fija al fondo */}
                    {tab==='mes' && paintMode && (
                        <div className="cal-barra">
                            {/* Botones de turno con animación escalonada (el retraso va en línea) */}
                            <div className="cal-barra-turnos">
                                <button className={`cal-borrar${selectedShift===null ? ' elegido' : ''}`} onClick={() => setSelectedShift(null)}>
                                    {Ico.eraser()} Borrar
                                </button>
                                {shifts.map((s, i) => (
                                    <button key={s.id} onClick={() => setSelectedShift(s.id)}
                                        className={`cal-pincel${selectedShift === s.id ? ' elegido' : ''}`}
                                        style={{ ...turnoVars(s, 'cc'), '--t-sombra': s.bg + '88', animationDelay: `${(i+1)*55}ms` }}>
                                        {s.short}
                                    </button>
                                ))}
                                <button className="cal-gestionar" title="Gestionar turnos" onClick={() => setShiftModal(true)}
                                    style={{ animationDelay: `${(shifts.length+1)*55}ms` }}>
                                    {Ico.gear()}
                                </button>
                            </div>
                            <button className="cal-salir" onClick={() => setPaintMode(false)}>SALIR DEL MODO EDICIÓN</button>
                        </div>
                    )}
                </>
            )}

            <GroupModal
                open={groupModal}
                editing={editingGrupo}
                onClose={() => { setGroupModal(false); setEditingGrupo(null); }}
                onSave={handleSaveGrupo}
                onDelete={handleDeleteGrupo}
            />
            <ShiftModal
                open={shiftModal}
                shifts={shifts}
                onClose={() => setShiftModal(false)}
                onSaveShift={handleSaveShift}
                onDeleteShift={handleDeleteShift}
                onReorder={handleReorder}
            />
        </div>
    );
};

export default CalendarioPage;
