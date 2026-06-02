import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// ── Paleta ───────────────────────────────────────────────
const C = {
    bg: '#0a0a0a', card: '#111111', cardElev: '#1a1a1a',
    border: '#2a2a2a', borderLight: '#333',
    text: '#ffffff', mute: '#8a8a8a', dim: '#4a4a4a',
    violet: '#7c5ef5', violetDim: 'rgba(124,94,245,0.14)',
    red: '#E24B4A', redDim: 'rgba(226,75,74,0.14)',
};

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

const NAV_BTN = { width:36,height:36,borderRadius:9,background:'rgba(255,255,255,0.05)',border:`1px solid #2a2a2a`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' };

// ── Iconos ───────────────────────────────────────────────
const Ico = {
    back:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    left:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    right:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
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
    gear:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 12a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#fff" strokeWidth="1.8"/></svg>,
};

// ── DayCell (fondo blanco por defecto) ───────────────────
function DayCell({ day, shiftId, isToday, paintMode, onClick, shifts }) {
    const shift = shiftId ? shifts.find(s => s.id === shiftId) : null;
    const [press, setPress] = useState(false);
    return (
        <div
            onClick={onClick}
            onPointerDown={() => paintMode && setPress(true)}
            onPointerUp={() => setPress(false)}
            onPointerLeave={() => setPress(false)}
            style={{
                minHeight: 54, borderRadius: 8,
                background: shift ? shift.bg : 'rgba(255,255,255,0.90)',
                border: `1.5px solid ${isToday ? C.violet : (shift ? shift.bg + 'aa' : 'rgba(200,200,200,0.4)')}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: paintMode ? 'pointer' : 'default',
                transform: press ? 'scale(0.88)' : 'scale(1)',
                transition: 'transform 60ms ease',
                padding: '4px 2px', userSelect: 'none', WebkitUserSelect: 'none',
                position: 'relative', gap: 2,
            }}
        >
            {isToday && (
                <div style={{ position:'absolute',top:3,left:'50%',transform:'translateX(-50%)',width:4,height:4,borderRadius:'50%',background:shift?shift.text:C.violet }} />
            )}
            <span style={{ fontSize:12, fontWeight: isToday?800:600, color: shift?shift.text:(isToday?C.violet:'#444'), lineHeight:1, marginTop: isToday?4:0 }}>
                {day}
            </span>
            {shift && (
                <span style={{ fontSize:7.5, color:shift.text, fontWeight:700, opacity:0.85, textAlign:'center', lineHeight:1.2 }}>
                    {shift.time || shift.short}
                </span>
            )}
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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:6 }}>
                {DAYS_H.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:C.dim, padding:'4px 0' }}>{d}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx} style={{ minHeight:54 }} />;
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
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 8px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text, textAlign:'center', marginBottom:6, letterSpacing:0.6 }}>
                {MONTHS_S[month].toUpperCase()}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1.5, marginBottom:3 }}>
                {DAYS_H.map(d => <div key={d} style={{ textAlign:'center', fontSize:6.5, color:C.dim, fontWeight:700 }}>{d}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1.5 }}>
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx} style={{ aspectRatio:'1' }} />;
                    const iso = isoDate(year, month, day);
                    const s = dias[iso] ? shifts.find(sh => sh.id === dias[iso]) : null;
                    return (
                        <div key={idx} style={{ aspectRatio:'1', borderRadius:3, background: s ? s.bg : 'rgba(255,255,255,0.75)', border:`1px solid ${s ? s.bg+'88' : 'rgba(180,180,180,0.3)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <span style={{ fontSize:6, color: s ? s.text : '#666', fontWeight:600 }}>{day}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── StatsView ────────────────────────────────────────────
function StatsView({ dias, shifts }) {
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
        <div style={{ padding:'0 16px 120px' }}>
            <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:12, padding:4, margin:'14px 0 16px' }}>
                {[['mes','Mes'],['año','Año']].map(([id,lbl])=>(
                    <button key={id} onClick={()=>setPeriod(id)} style={{ flex:1, height:36, borderRadius:9, background: period===id?C.violet:'transparent', border:'none', color: period===id?'#fff':C.mute, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'background 140ms ease' }}>{lbl}</button>
                ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:20 }}>
                <button onClick={prevPeriod} style={NAV_BTN}>{Ico.left()}</button>
                <span style={{ fontSize:14, fontWeight:700, color:C.text, minWidth:160, textAlign:'center' }}>{periodLabel}</span>
                <button onClick={nextPeriod} style={NAV_BTN}>{Ico.right()}</button>
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 70px', padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:10, fontWeight:700, color:C.mute, letterSpacing:0.5 }}>TURNO</span>
                    <span style={{ fontSize:10, fontWeight:700, color:C.mute, textAlign:'right' }}>DÍAS</span>
                    <span style={{ fontSize:10, fontWeight:700, color:C.mute, textAlign:'right' }}>HORAS</span>
                </div>
                {shifts.map(s => {
                    const cnt = stats[s.id] || 0;
                    const hrs = cnt * s.hours;
                    return (
                        <div key={s.id} style={{ display:'grid', gridTemplateColumns:'1fr 60px 70px', padding:'12px 14px', borderBottom:`1px solid ${C.border}`, alignItems:'center' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ width:32, height:32, borderRadius:8, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <span style={{ fontSize:9, fontWeight:700, color:s.text }}>{s.short}</span>
                                </div>
                                <div>
                                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{s.label}</div>
                                    {s.time && <div style={{ fontSize:10, color:C.mute }}>{s.time}</div>}
                                </div>
                            </div>
                            <span style={{ fontSize:14, fontWeight:700, color:cnt>0?C.text:C.dim, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{cnt}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:cnt>0?s.text:C.dim, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{hrs>0?`${hrs}h`:'—'}</span>
                        </div>
                    );
                })}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 70px', padding:'12px 14px', background:'rgba(124,94,245,0.08)' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:C.mute }}>TOTAL</span>
                    <span style={{ fontSize:14, fontWeight:800, color:C.violet, textAlign:'right' }}>{totalDias}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:C.violet, textAlign:'right' }}>{totalHoras}h</span>
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
    const inputSt = { width:'100%', height:44, padding:'0 12px', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:10, color:'#fff', fontSize:14, fontFamily:'inherit', outline:'none' };
    return (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)' }} />
            <div style={{ position:'relative', width:'100%', maxWidth:'min(92vw,400px)', background:C.cardElev, borderRadius:18, border:`1px solid ${C.borderLight}`, padding:20, boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>{Ico.cal(C.violet,18)}<span style={{ fontSize:16, fontWeight:700, color:C.text }}>{editing?'Editar grupo':'Nuevo grupo'}</span></div>
                    <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>{Ico.close()}</button>
                </div>
                <label style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.6, display:'block', marginBottom:6 }}>NOMBRE DEL GRUPO</label>
                <input style={inputSt} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Grupo A, Turno Norte..." autoFocus onKeyDown={e=>e.key==='Enter'&&name.trim()&&onSave(name.trim())} />
                <div style={{ display:'flex', gap:8, marginTop:16 }}>
                    <button onClick={onClose} style={{ flex:1, height:44, borderRadius:11, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, color:C.text, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
                    <button onClick={()=>name.trim()&&onSave(name.trim())} style={{ flex:1.4, height:44, borderRadius:11, background:C.violet, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 6px 18px rgba(124,94,245,0.4)' }}>{editing?'Guardar':'Crear'}</button>
                </div>
                {editing && !confirmDel && <button onClick={()=>setConfirmDel(true)} style={{ width:'100%', height:38, marginTop:10, borderRadius:10, background:C.redDim, border:`1px solid rgba(226,75,74,0.3)`, color:C.red, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>{Ico.trash(C.red)} Eliminar grupo</button>}
                {editing && confirmDel && (
                    <div style={{ marginTop:10, padding:'10px 12px', borderRadius:10, background:C.redDim, border:`1px solid rgba(226,75,74,0.4)` }}>
                        <p style={{ fontSize:12, color:C.red, margin:'0 0 8px', fontWeight:600 }}>¿Eliminar "{editing.nombre}" y todos sus datos?</p>
                        <div style={{ display:'flex', gap:6 }}>
                            <button onClick={()=>setConfirmDel(false)} style={{ flex:1, height:34, borderRadius:8, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, color:C.text, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>No</button>
                            <button onClick={onDelete} style={{ flex:1, height:34, borderRadius:8, background:C.red, border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Sí, eliminar</button>
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

    const ColorPalette = ({ value, palette, onChange }) => (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
            {palette.map(c => (
                <button key={c} onClick={() => onChange(c)} style={{ width:32, height:32, borderRadius:8, background:c, border: value===c ? '2.5px solid #fff' : '2px solid transparent', cursor:'pointer', flexShrink:0, transition:'border 80ms ease' }} />
            ))}
            <label style={{ width:32, height:32, borderRadius:8, border:`2px dashed ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', overflow:'hidden' }}>
                <span style={{ fontSize:16, color:C.mute }}>+</span>
                <input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{ position:'absolute', opacity:0, width:'100%', height:'100%', cursor:'pointer' }} />
            </label>
        </div>
    );

    const inputSt = { width:'100%', height:42, padding:'0 12px', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:10, color:'#fff', fontSize:14, fontFamily:'inherit', outline:'none' };

    return (
        <div style={{ position:'fixed', inset:0, zIndex:110, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }} />
            <div style={{ position:'relative', width:'100%', maxWidth:'min(92vw,420px)', background:C.cardElev, borderRadius:18, border:`1px solid ${C.borderLight}`, padding:20, boxShadow:'0 20px 60px rgba(0,0,0,0.7)', maxHeight:'90vh', overflowY:'auto' }} className="cal-scroll">
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                    <button onClick={onBack} style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>{Ico.left()}</button>
                    <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{isNew ? 'Nuevo turno' : 'Editar turno'}</span>
                </div>

                {/* Preview */}
                <div style={{ background:form.bg, borderRadius:14, padding:'14px 16px', marginBottom:18, display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:48, height:48, borderRadius:12, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:13, fontWeight:800, color:form.text }}>{form.short||'?'}</span>
                    </div>
                    <div>
                        <div style={{ fontSize:15, fontWeight:700, color:form.text }}>{form.label||'Nombre del turno'}</div>
                        {form.time && <div style={{ fontSize:12, color:form.text, opacity:0.75 }}>{form.time}</div>}
                    </div>
                </div>

                {/* Nombre */}
                <label style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.6, display:'block', marginBottom:6 }}>NOMBRE</label>
                <input style={{ ...inputSt, marginBottom:12 }} value={form.label} onChange={e=>set('label',e.target.value)} placeholder="Ej: Día, Noche, Libre..." />

                {/* Abreviatura */}
                <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                    <div style={{ flex:1 }}>
                        <label style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.6, display:'block', marginBottom:6 }}>ABREVIATURA</label>
                        <input style={inputSt} value={form.short} onChange={e=>set('short',e.target.value.slice(0,6))} placeholder="Día, Noc..." />
                    </div>
                    <div style={{ flex:1 }}>
                        <label style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.6, display:'block', marginBottom:6 }}>HORAS</label>
                        <input style={inputSt} type="number" min="0" max="24" value={form.hours} onChange={e=>set('hours',parseInt(e.target.value)||0)} />
                    </div>
                </div>

                {/* Horario */}
                <label style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.6, display:'block', marginBottom:6 }}>HORARIO (opcional)</label>
                <input style={{ ...inputSt, marginBottom:16 }} value={form.time} onChange={e=>set('time',e.target.value)} placeholder="Ej: 06:00–18:00" />

                {/* Color de fondo */}
                <label style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.6, display:'block' }}>COLOR DE FONDO</label>
                <ColorPalette value={form.bg} palette={PRESET_BG} onChange={v=>set('bg',v)} />

                {/* Color de texto */}
                <label style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.6, display:'block', marginTop:14 }}>COLOR DE TEXTO</label>
                <ColorPalette value={form.text} palette={PRESET_TX} onChange={v=>set('text',v)} />

                {/* Botones */}
                <div style={{ display:'flex', gap:8, marginTop:20 }}>
                    <button onClick={onBack} style={{ flex:1, height:44, borderRadius:11, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, color:C.text, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
                    <button onClick={() => form.label.trim() && onSave(form)} style={{ flex:1.4, height:44, borderRadius:11, background:C.violet, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: form.label.trim() ? 1 : 0.5 }}>
                        {isNew ? 'Crear' : 'Guardar'}
                    </button>
                </div>
                {!isNew && !confirmDel && (
                    <button onClick={()=>setConfirmDel(true)} style={{ width:'100%', height:38, marginTop:10, borderRadius:10, background:C.redDim, border:`1px solid rgba(226,75,74,0.3)`, color:C.red, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        {Ico.trash(C.red)} Eliminar turno
                    </button>
                )}
                {!isNew && confirmDel && (
                    <div style={{ marginTop:10, padding:'10px 12px', borderRadius:10, background:C.redDim, border:`1px solid rgba(226,75,74,0.4)` }}>
                        <p style={{ fontSize:12, color:C.red, margin:'0 0 8px', fontWeight:600 }}>¿Eliminar este turno? Los días pintados con él quedarán sin color.</p>
                        <div style={{ display:'flex', gap:6 }}>
                            <button onClick={()=>setConfirmDel(false)} style={{ flex:1, height:34, borderRadius:8, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, color:C.text, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>No</button>
                            <button onClick={()=>onDelete(shift.id)} style={{ flex:1, height:34, borderRadius:8, background:C.red, border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Sí, eliminar</button>
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

    const btnSm = (disabled) => ({
        width:28, height:28, borderRadius:7, background: disabled?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.08)',
        border:`1px solid ${disabled?'#222':C.border}`, display:'flex', alignItems:'center', justifyContent:'center',
        cursor: disabled?'default':'pointer', opacity: disabled?0.3:1,
    });

    return (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)' }} />
            <div style={{ position:'relative', width:'100%', maxWidth:'min(92vw,400px)', background:C.cardElev, borderRadius:18, border:`1px solid ${C.borderLight}`, padding:20, boxShadow:'0 20px 60px rgba(0,0,0,0.6)', maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <span style={{ fontSize:16, fontWeight:700, color:C.text }}>Tipos de turno</span>
                    <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>{Ico.close()}</button>
                </div>

                <div style={{ overflowY:'auto', flex:1 }} className="cal-scroll">
                    {shifts.map((s, i) => (
                        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
                            <div style={{ width:40, height:40, borderRadius:10, background:s.bg, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <span style={{ fontSize:10, fontWeight:700, color:s.text }}>{s.short}</span>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.label}</div>
                                <div style={{ fontSize:10, color:C.mute }}>{s.time||`${s.hours>0?s.hours+'h':'Sin horario'}`}</div>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                                <button onClick={() => i>0 && onReorder(i,-1)} style={btnSm(i===0)}>{Ico.up(i===0?'#333':'#fff')}</button>
                                <button onClick={() => i<shifts.length-1 && onReorder(i,1)} style={btnSm(i===shifts.length-1)}>{Ico.down(i===shifts.length-1?'#333':'#fff')}</button>
                            </div>
                            <button onClick={() => { setEditingShift(s); setView('form'); }} style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                                {Ico.edit()}
                            </button>
                        </div>
                    ))}
                </div>

                <button onClick={() => { setEditingShift(null); setView('form'); }} style={{ width:'100%', height:46, marginTop:14, borderRadius:12, background:C.violet, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 6px 18px rgba(124,94,245,0.4)' }}>
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

    useEffect(() => { localStorage.setItem('flujo_shifts', JSON.stringify(shifts)); }, [shifts]);

    useEffect(() => {
        api.get('/calendarios')
            .then(res => {
                setGrupos(res.data.grupos);
                if (res.data.grupos.length > 0) switchGrupoData(res.data.grupos[0]);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const diasFromApi = (g) => g.dias ? Object.fromEntries(Object.entries(g.dias)) : {};
    const switchGrupoData = (g) => { setActiveGrupo(g); setDias(diasFromApi(g)); setGroupsOpen(false); };

    const handleDayTap = (iso, shift) => {
        if (!activeGrupo) return;
        const next = dias[iso] === shift ? null : shift;
        setDias(prev => { const d={...prev}; if(next) d[iso]=next; else delete d[iso]; return d; });
        clearTimeout(saveRef.current);
        saveRef.current = setTimeout(() => {
            api.patch(`/calendarios/${activeGrupo._id}/dia`, { date:iso, shift:next }).catch(()=>{});
        }, 350);
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

    const handleShare = () => {
        const lines = [`Calendario ${activeGrupo?.nombre||''} — ${year}`, ''];
        for(let m=0;m<12;m++){
            lines.push(MONTHS[m].toUpperCase());
            const num=daysInMonth(year,m);
            for(let d=1;d<=num;d++){
                const iso=isoDate(year,m,d); const s=dias[iso];
                if(s){ const sh=shifts.find(x=>x.id===s); if(sh) lines.push(`  ${d} ${MONTHS_S[m]}: ${sh.label}`); }
            }
            lines.push('');
        }
        const text=lines.join('\n');
        if(navigator.share) navigator.share({title:'Calendario',text}).catch(()=>{});
        else navigator.clipboard.writeText(text).catch(()=>{});
    };

    // Al entrar en modo pintar, seleccionar el primer turno por defecto
    const enterPaintMode = () => {
        if (shifts.length > 0 && selectedShift === null) setSelectedShift(shifts[0].id);
        setPaintMode(true);
    };

    return (
        <div style={{ width:'100%', height:'100%', background:C.bg, color:C.text, display:'flex', flexDirection:'column', fontFamily:'-apple-system,"SF Pro Text","Inter",system-ui,sans-serif', overflow:'hidden', position:'relative' }}>
            <style>{`
                .cal-scroll { scrollbar-width:thin; scrollbar-color:rgba(124,94,245,0.35) transparent; }
                .cal-scroll::-webkit-scrollbar { width:4px; }
                .cal-scroll::-webkit-scrollbar-thumb { background:rgba(124,94,245,0.35); border-radius:4px; }
                @keyframes cal-slide-up {
                    from { transform: translateY(100%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                @keyframes cal-pop {
                    from { transform: scale(0.5) translateY(16px); opacity: 0; }
                    to   { transform: scale(1)   translateY(0);    opacity: 1; }
                }
            `}</style>

            {/* Header */}
            <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${C.border}`, background:C.bg, flexShrink:0 }}>
                <button onClick={() => navigate('/workspace')} style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                    {Ico.back()}
                </button>
                <span style={{ fontSize:14, fontWeight:700, letterSpacing:3, color:C.text }}>CALENDARIO</span>
                <button onClick={() => { setEditingGrupo(null); setGroupModal(true); }} style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                    {Ico.plus()}
                </button>
            </div>

            {/* Group selector */}
            {!loading && grupos.length > 0 && (
                <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, flexShrink:0, position:'relative', zIndex:10 }}>
                    <button onClick={() => setGroupsOpen(v=>!v)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, height:42, padding:'0 14px', borderRadius:12, background:'rgba(124,94,245,0.10)', border:`1px solid rgba(124,94,245,0.28)`, cursor:'pointer', fontFamily:'inherit' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>{Ico.cal(C.violet,14)}<span style={{ fontSize:13, fontWeight:700, color:C.text }}>{activeGrupo?.nombre||'—'}</span></div>
                        {Ico.chev(C.mute)}
                    </button>
                    {groupsOpen && (
                        <div style={{ position:'absolute', left:16, right:16, top:'calc(100% - 4px)', background:C.cardElev, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', boxShadow:'0 16px 40px rgba(0,0,0,0.5)', zIndex:20 }}>
                            {grupos.map(g => (
                                <div key={g._id} style={{ display:'flex', alignItems:'center', padding:'0 14px', borderBottom:`1px solid ${C.border}`, background:g._id===activeGrupo?._id?'rgba(124,94,245,0.10)':'transparent' }}>
                                    <button onClick={() => switchGrupoData(g)} style={{ flex:1, height:48, background:'transparent', border:'none', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}>
                                        <span style={{ fontSize:13, fontWeight:600, color:g._id===activeGrupo?._id?C.violet:C.text }}>{g.nombre}</span>
                                    </button>
                                    <button onClick={() => { setEditingGrupo(g); setGroupModal(true); setGroupsOpen(false); }} style={{ width:30,height:30,borderRadius:8,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0 }}>
                                        {Ico.edit()}
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => { setEditingGrupo(null); setGroupModal(true); setGroupsOpen(false); }} style={{ width:'100%', height:44, display:'flex', alignItems:'center', gap:8, padding:'0 14px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                                {Ico.plus(C.mute,14)}<span style={{ fontSize:13, color:C.mute }}>Nuevo grupo</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!loading && grupos.length === 0 && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, gap:14 }}>
                    {Ico.cal(C.dim,48)}
                    <p style={{ color:C.mute, fontSize:14, textAlign:'center', margin:0 }}>Sin grupos de calendario.<br/>Crea uno para comenzar.</p>
                    <button onClick={() => { setEditingGrupo(null); setGroupModal(true); }} style={{ height:44, padding:'0 28px', borderRadius:12, background:C.violet, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Crear primer grupo</button>
                </div>
            )}

            {loading && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:C.mute, fontSize:13 }}>Cargando…</span></div>}

            {!loading && activeGrupo && (
                <>
                    {/* Tab bar */}
                    <div style={{ display:'flex', padding:'8px 16px', borderBottom:`1px solid ${C.border}`, gap:4, flexShrink:0 }}>
                        {[['mes','MES'],['año','AÑO'],['resumen','RESUMEN']].map(([id,lbl])=>(
                            <button key={id} onClick={() => { setTab(id); if(id!=='mes') setPaintMode(false); }} style={{ flex:1, height:34, borderRadius:9, background:tab===id?C.violet:'transparent', border:`1px solid ${tab===id?'transparent':C.border}`, color:tab===id?'#fff':C.mute, fontSize:11, fontWeight:700, letterSpacing:0.6, cursor:'pointer', fontFamily:'inherit', transition:'background 140ms ease' }}>{lbl}</button>
                        ))}
                    </div>

                    <div className="cal-scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom: tab==='mes' ? (paintMode ? 170 : 90) : 0 }}>
                        {tab==='mes' && (
                            <div style={{ padding:'0 16px' }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0 12px' }}>
                                    <button onClick={prevMonth} style={NAV_BTN}>{Ico.left()}</button>
                                    <span style={{ fontSize:16, fontWeight:800, color:C.text, letterSpacing:0.3 }}>{MONTHS[month].toUpperCase()} {year}</span>
                                    <button onClick={nextMonth} style={NAV_BTN}>{Ico.right()}</button>
                                </div>
                                <MonthGrid year={year} month={month} dias={dias} paintMode={paintMode} selectedShift={selectedShift} onDayTap={handleDayTap} shifts={shifts} />
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:16 }}>
                                    {shifts.map(s => (
                                        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 8px' }}>
                                            <div style={{ width:10, height:10, borderRadius:3, background:s.bg }} />
                                            <span style={{ fontSize:10.5, color:C.mute, fontWeight:600 }}>{s.label}</span>
                                            {s.time && <span style={{ fontSize:9.5, color:C.dim }}>{s.time}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tab==='año' && (
                            <div style={{ padding:'12px 16px 120px' }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                                    <button onClick={() => setYearAnual(y=>y-1)} style={NAV_BTN}>{Ico.left()}</button>
                                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                        <span style={{ fontSize:16, fontWeight:800, color:C.text }}>{yearAnual}</span>
                                        <button onClick={handleShare} style={{ width:34, height:34, borderRadius:9, background:'rgba(124,94,245,0.12)', border:`1px solid rgba(124,94,245,0.3)`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>{Ico.share()}</button>
                                    </div>
                                    <button onClick={() => setYearAnual(y=>y+1)} style={NAV_BTN}>{Ico.right()}</button>
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                                    {Array.from({length:12},(_,m) => <MiniMonth key={m} year={yearAnual} month={m} dias={dias} shifts={shifts} />)}
                                </div>
                                <div style={{ marginTop:16, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                                    <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                                        <span style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.5 }}>ESTADÍSTICA ANUAL {yearAnual}</span>
                                    </div>
                                    {(() => {
                                        const counts = {}; shifts.forEach(s => counts[s.id]=0);
                                        Object.entries(dias).forEach(([date,sid]) => { if(new Date(date+'T00:00:00').getFullYear()===yearAnual && counts[sid]!==undefined) counts[sid]++; });
                                        return shifts.map(s => { const cnt=counts[s.id]||0; const hrs=cnt*s.hours; return (
                                            <div key={s.id} style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                                                <div style={{ width:28,height:28,borderRadius:7,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',marginRight:10,flexShrink:0 }}>
                                                    <span style={{ fontSize:8.5,fontWeight:700,color:s.text }}>{s.short}</span>
                                                </div>
                                                <span style={{ fontSize:13,fontWeight:600,color:C.text,flex:1 }}>{s.label}</span>
                                                <span style={{ fontSize:13,fontWeight:700,color:C.mute,marginRight:14 }}>{cnt} días</span>
                                                <span style={{ fontSize:13,fontWeight:700,color:s.text }}>{hrs>0?`${hrs}h`:'—'}</span>
                                            </div>
                                        ); });
                                    })()}
                                </div>
                            </div>
                        )}

                        {tab==='resumen' && <StatsView dias={dias} shifts={shifts} />}
                    </div>

                    {/* Botón PINTAR (cuando no está en modo pintar) */}
                    {tab==='mes' && !paintMode && (
                        <div style={{ position:'fixed', left:0, right:0, bottom:0, padding:'10px 16px 28px', background:`linear-gradient(0deg,${C.bg} 60%,transparent)`, zIndex:40 }}>
                            <button onClick={enterPaintMode} style={{ width:'100%', height:48, borderRadius:13, background:C.violet, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', letterSpacing:0.4, boxShadow:'0 6px 20px rgba(124,94,245,0.45)' }}>
                                PINTAR
                            </button>
                        </div>
                    )}

                    {/* Barra de pintura — animada, fija al fondo */}
                    {tab==='mes' && paintMode && (
                        <div style={{
                            position:'fixed', left:0, right:0, bottom:0, zIndex:40,
                            background:C.cardElev, borderTop:`1px solid ${C.borderLight}`,
                            padding:'12px 16px 28px',
                            boxShadow:'0 -8px 30px rgba(0,0,0,0.5)',
                            animation:'cal-slide-up 260ms cubic-bezier(0.34,1.1,0.64,1) both',
                        }}>
                            {/* Botones de turno con animación escalonada */}
                            <div style={{ display:'flex', gap:6, marginBottom:10, overflowX:'auto', paddingBottom:2, alignItems:'center' }}>
                                {/* Botón borrar */}
                                <button
                                    onClick={() => setSelectedShift(null)}
                                    style={{
                                        flexShrink:0, height:44, padding:'0 12px', borderRadius:10,
                                        background: selectedShift===null ? C.red : C.redDim,
                                        border:`1.5px solid ${selectedShift===null ? C.red : 'rgba(226,75,74,0.35)'}`,
                                        color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                                        display:'flex', alignItems:'center', gap:5, transition:'all 120ms ease',
                                        animation:'cal-pop 220ms cubic-bezier(0.34,1.2,0.64,1) 0ms both',
                                    }}
                                >
                                    {Ico.eraser()} Borrar
                                </button>
                                {/* Botones de turnos */}
                                {shifts.map((s, i) => {
                                    const sel = selectedShift === s.id;
                                    return (
                                        <button key={s.id} onClick={() => setSelectedShift(s.id)} style={{
                                            flexShrink:0, height:44, padding:'0 14px', borderRadius:10,
                                            background: sel ? s.bg : 'rgba(255,255,255,0.06)',
                                            border:`2px solid ${sel ? s.bg+'cc' : C.border}`,
                                            color: sel ? s.text : C.mute, fontSize:12, fontWeight:700,
                                            cursor:'pointer', fontFamily:'inherit', transition:'all 120ms ease',
                                            boxShadow: sel ? `0 4px 14px ${s.bg}88` : 'none',
                                            animation:`cal-pop 220ms cubic-bezier(0.34,1.2,0.64,1) ${(i+1)*55}ms both`,
                                        }}>
                                            {s.short}
                                        </button>
                                    );
                                })}
                                {/* Botón gestionar turnos */}
                                <button
                                    onClick={() => setShiftModal(true)}
                                    style={{
                                        flexShrink:0, width:44, height:44, borderRadius:10,
                                        background:'rgba(255,255,255,0.06)', border:`1.5px solid ${C.border}`,
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        cursor:'pointer', transition:'all 120ms ease',
                                        animation:`cal-pop 220ms cubic-bezier(0.34,1.2,0.64,1) ${(shifts.length+1)*55}ms both`,
                                    }}
                                    title="Gestionar turnos"
                                >
                                    {Ico.gear()}
                                </button>
                            </div>
                            {/* Botón salir */}
                            <button onClick={() => setPaintMode(false)} style={{ width:'100%', height:44, borderRadius:12, background:C.red, border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', letterSpacing:0.3, animation:'cal-pop 200ms cubic-bezier(0.34,1.2,0.64,1) 60ms both' }}>
                                SALIR DEL MODO EDICIÓN
                            </button>
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
