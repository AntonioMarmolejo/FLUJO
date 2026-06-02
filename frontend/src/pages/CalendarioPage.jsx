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

// ── Turnos ───────────────────────────────────────────────
const SHIFTS = {
    dia:        { label: 'Día',        short: 'Día',   bg: '#1e3a8a', text: '#93c5fd', border: '#1d4ed8', hours: 12, time: '06:00–18:00' },
    noche:      { label: 'Noche',      short: 'Noche', bg: '#0f0f0f', text: '#d4d4d4', border: '#3a3a3a', hours: 12, time: '18:00–06:00' },
    libre:      { label: 'Libre',      short: 'Libre', bg: '#14532d', text: '#86efac', border: '#166534', hours: 0,  time: '' },
    vacaciones: { label: 'Vacaciones', short: 'Vac.',  bg: '#7c2d12', text: '#fdba74', border: '#9a3412', hours: 0,  time: '' },
};
const SHIFT_ORDER = ['dia', 'noche', 'libre', 'vacaciones'];

// ── Fechas ───────────────────────────────────────────────
const MONTHS  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_S = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS_H  = ['L','M','X','J','V','S','D'];

const isoDate = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const daysInMonth = (y, m) => new Date(y, m+1, 0).getDate();
const startDow = (y, m) => { const d = new Date(y,m,1).getDay(); return d === 0 ? 6 : d-1; };
const todayISO = () => { const t=new Date(); return isoDate(t.getFullYear(),t.getMonth(),t.getDate()); };

// ── Estilo botón nav ─────────────────────────────────────
const NAV_BTN = {
    width:36, height:36, borderRadius:9,
    background:'rgba(255,255,255,0.05)', border:`1px solid #2a2a2a`,
    display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
};

// ── Iconos ───────────────────────────────────────────────
const Ico = {
    back:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    left:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    right: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    plus:  (c='#fff',s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>,
    edit:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10-10-4-4L4 16v4z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 6l4 4" stroke="#fff" strokeWidth="1.8"/></svg>,
    trash: (c='#fff') => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M7 7l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    chev:  (c='#fff') => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    cal:   (c='#fff',s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke={c} strokeWidth="1.8"/><path d="M3 9h18M8 2v4M16 2v4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
    close: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
    eraser:() => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 20H7L3 16l11-11 6 6-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 17.5l4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    share: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ── DayCell ──────────────────────────────────────────────
function DayCell({ day, shiftId, isToday, paintMode, onClick }) {
    const shift = shiftId ? SHIFTS[shiftId] : null;
    const [press, setPress] = useState(false);
    return (
        <div
            onClick={onClick}
            onPointerDown={() => paintMode && setPress(true)}
            onPointerUp={() => setPress(false)}
            onPointerLeave={() => setPress(false)}
            style={{
                minHeight: 54, borderRadius: 8,
                background: shift ? shift.bg : 'rgba(255,255,255,0.03)',
                border: `1px solid ${shift ? shift.border : (isToday ? C.violet : C.border)}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: paintMode ? 'pointer' : 'default',
                transform: press ? 'scale(0.90)' : 'scale(1)',
                transition: 'transform 70ms ease',
                padding: '4px 2px', userSelect: 'none',
                WebkitUserSelect: 'none', position: 'relative', gap: 2,
            }}
        >
            {isToday && (
                <div style={{ position:'absolute', top:3, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background: C.violet }} />
            )}
            <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: shift ? shift.text : (isToday ? C.violet : C.mute), lineHeight: 1, marginTop: isToday ? 4 : 0 }}>
                {day}
            </span>
            {shift && (
                <span style={{ fontSize: 7.5, color: shift.text, fontWeight: 700, opacity: 0.85, textAlign: 'center', lineHeight: 1.2 }}>
                    {shift.time || shift.short}
                </span>
            )}
        </div>
    );
}

// ── MonthGrid ────────────────────────────────────────────
function MonthGrid({ year, month, dias, paintMode, selectedShift, onDayTap }) {
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
                            isToday={iso===today} paintMode={paintMode}
                            onClick={() => paintMode && onDayTap(iso, selectedShift)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// ── MiniMonth ────────────────────────────────────────────
function MiniMonth({ year, month, dias }) {
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
                    const s = dias[iso] ? SHIFTS[dias[iso]] : null;
                    return (
                        <div key={idx} style={{ aspectRatio:'1', borderRadius:3, background: s ? s.bg : 'rgba(255,255,255,0.04)', border:`1px solid ${s ? s.border : 'transparent'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <span style={{ fontSize:6, color: s ? s.text : C.dim, fontWeight:600 }}>{day}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── StatsView ────────────────────────────────────────────
function StatsView({ dias }) {
    const now = new Date();
    const [period, setPeriod] = useState('mes');
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());

    const prevPeriod = () => {
        if (period === 'mes') { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
        else setYear(y => y-1);
    };
    const nextPeriod = () => {
        if (period === 'mes') { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }
        else setYear(y => y+1);
    };

    const stats = (() => {
        const counts = Object.fromEntries(SHIFT_ORDER.map(id=>[id,0]));
        Object.entries(dias).forEach(([date, shiftId]) => {
            const d = new Date(date+'T00:00:00');
            const match = period==='mes' ? (d.getFullYear()===year && d.getMonth()===month) : d.getFullYear()===year;
            if (match && counts[shiftId]!==undefined) counts[shiftId]++;
        });
        return counts;
    })();

    const totalDias  = Object.values(stats).reduce((a,b)=>a+b, 0);
    const totalHoras = SHIFT_ORDER.reduce((acc,id)=>acc+stats[id]*SHIFTS[id].hours, 0);

    const periodLabel = period==='mes' ? `${MONTHS[month]} ${year}` : `${year}`;

    return (
        <div style={{ padding:'0 16px 120px' }}>
            <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:12, padding:4, margin:'14px 0 16px' }}>
                {[['mes','Mes'],['año','Año']].map(([id,lbl])=>(
                    <button key={id} onClick={()=>setPeriod(id)} style={{ flex:1, height:36, borderRadius:9, background: period===id ? C.violet : 'transparent', border:'none', color: period===id ? '#fff' : C.mute, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'background 140ms ease' }}>{lbl}</button>
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
                {SHIFT_ORDER.map(id => {
                    const s = SHIFTS[id];
                    const cnt = stats[id];
                    const hrs = cnt * s.hours;
                    return (
                        <div key={id} style={{ display:'grid', gridTemplateColumns:'1fr 60px 70px', padding:'12px 14px', borderBottom:`1px solid ${C.border}`, alignItems:'center' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ width:32, height:32, borderRadius:8, background:s.bg, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
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
                    <span style={{ fontSize:12, fontWeight:700, color:C.mute, letterSpacing:0.4 }}>TOTAL</span>
                    <span style={{ fontSize:14, fontWeight:800, color:C.violet, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{totalDias}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:C.violet, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{totalHoras}h</span>
                </div>
            </div>
        </div>
    );
}

// ── GroupModal ───────────────────────────────────────────
function GroupModal({ open, editing, onClose, onSave, onDelete }) {
    const [name, setName] = useState('');
    const [confirmDel, setConfirmDel] = useState(false);

    useEffect(() => {
        if (open) { setName(editing ? editing.nombre : ''); setConfirmDel(false); }
    }, [open, editing]);

    if (!open) return null;

    const inputSt = {
        width:'100%', height:44, padding:'0 12px', boxSizing:'border-box',
        background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`,
        borderRadius:10, color:'#fff', fontSize:14, fontFamily:'inherit', outline:'none',
    };

    return (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)' }} />
            <div style={{ position:'relative', width:'100%', maxWidth:'min(92vw,400px)', background:C.cardElev, borderRadius:18, border:`1px solid ${C.borderLight}`, padding:20, boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {Ico.cal(C.violet,18)}
                        <span style={{ fontSize:16, fontWeight:700, color:C.text }}>{editing ? 'Editar grupo' : 'Nuevo grupo'}</span>
                    </div>
                    <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                        {Ico.close()}
                    </button>
                </div>
                <label style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.6, display:'block', marginBottom:6 }}>NOMBRE DEL GRUPO</label>
                <input
                    style={inputSt}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Grupo A, Turno Norte..."
                    autoFocus
                    onKeyDown={e => e.key==='Enter' && name.trim() && onSave(name.trim())}
                />
                <div style={{ display:'flex', gap:8, marginTop:16 }}>
                    <button onClick={onClose} style={{ flex:1, height:44, borderRadius:11, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, color:C.text, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
                    <button onClick={() => name.trim() && onSave(name.trim())} style={{ flex:1.4, height:44, borderRadius:11, background:C.violet, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 6px 18px rgba(124,94,245,0.4)' }}>
                        {editing ? 'Guardar' : 'Crear'}
                    </button>
                </div>
                {editing && !confirmDel && (
                    <button onClick={() => setConfirmDel(true)} style={{ width:'100%', height:38, marginTop:10, borderRadius:10, background:C.redDim, border:`1px solid rgba(226,75,74,0.3)`, color:C.red, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        {Ico.trash(C.red)} Eliminar grupo
                    </button>
                )}
                {editing && confirmDel && (
                    <div style={{ marginTop:10, padding:'10px 12px', borderRadius:10, background:C.redDim, border:`1px solid rgba(226,75,74,0.4)` }}>
                        <p style={{ fontSize:12, color:C.red, margin:'0 0 8px', fontWeight:600 }}>¿Eliminar "{editing.nombre}" y todos sus datos?</p>
                        <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => setConfirmDel(false)} style={{ flex:1, height:34, borderRadius:8, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, color:C.text, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>No</button>
                            <button onClick={onDelete} style={{ flex:1, height:34, borderRadius:8, background:C.red, border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Sí, eliminar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Page principal ───────────────────────────────────────
const CalendarioPage = () => {
    const navigate = useNavigate();
    const now = new Date();

    const [grupos, setGrupos] = useState([]);
    const [activeGrupo, setActiveGrupo] = useState(null);
    const [dias, setDias] = useState({});
    const [tab, setTab] = useState('mes');
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [paintMode, setPaintMode] = useState(false);
    const [selectedShift, setSelectedShift] = useState('dia');
    const [groupsOpen, setGroupsOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGrupo, setEditingGrupo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [yearAnual, setYearAnual] = useState(now.getFullYear());
    const saveRef = useRef(null);

    // Carga inicial
    useEffect(() => {
        api.get('/calendarios')
            .then(res => {
                setGrupos(res.data.grupos);
                if (res.data.grupos.length > 0) switchGrupoData(res.data.grupos[0]);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const diasFromApi = (g) => {
        if (!g.dias) return {};
        return Object.fromEntries(Object.entries(g.dias));
    };

    const switchGrupoData = (g) => {
        setActiveGrupo(g);
        setDias(diasFromApi(g));
        setGroupsOpen(false);
    };

    const handleDayTap = (iso, shift) => {
        if (!activeGrupo) return;
        const cur = dias[iso];
        const next = cur === shift ? null : shift;

        setDias(prev => {
            const d = { ...prev };
            if (next) d[iso] = next; else delete d[iso];
            return d;
        });

        clearTimeout(saveRef.current);
        saveRef.current = setTimeout(() => {
            api.patch(`/calendarios/${activeGrupo._id}/dia`, { date: iso, shift: next }).catch(() => {});
        }, 350);
    };

    const handleSaveGrupo = async (nombre) => {
        try {
            if (editingGrupo) {
                const res = await api.put(`/calendarios/${editingGrupo._id}`, { nombre });
                const updated = res.data.grupo;
                setGrupos(prev => prev.map(g => g._id === updated._id ? updated : g));
                if (activeGrupo?._id === updated._id) setActiveGrupo(updated);
            } else {
                const res = await api.post('/calendarios', { nombre });
                const newG = res.data.grupo;
                setGrupos(prev => [...prev, newG]);
                switchGrupoData(newG);
            }
            setModalOpen(false);
            setEditingGrupo(null);
        } catch { }
    };

    const handleDeleteGrupo = async () => {
        if (!editingGrupo) return;
        try {
            await api.delete(`/calendarios/${editingGrupo._id}`);
            const remaining = grupos.filter(g => g._id !== editingGrupo._id);
            setGrupos(remaining);
            if (activeGrupo?._id === editingGrupo._id) {
                if (remaining.length > 0) switchGrupoData(remaining[0]);
                else { setActiveGrupo(null); setDias({}); }
            }
            setModalOpen(false);
            setEditingGrupo(null);
        } catch { }
    };

    const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
    const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

    const handleShare = () => {
        const lines = [`Calendario ${activeGrupo?.nombre || ''} — ${year}`, ''];
        for (let m = 0; m < 12; m++) {
            lines.push(MONTHS[m].toUpperCase());
            const num = daysInMonth(year, m);
            for (let d = 1; d <= num; d++) {
                const iso = isoDate(year, m, d);
                const s = dias[iso];
                if (s) lines.push(`  ${d} ${MONTHS_S[m]}: ${SHIFTS[s].label}`);
            }
            lines.push('');
        }
        const text = lines.join('\n');
        if (navigator.share) navigator.share({ title: 'Calendario', text }).catch(()=>{});
        else navigator.clipboard.writeText(text).catch(()=>{});
    };

    return (
        <div style={{ width:'100%', height:'100%', background:C.bg, color:C.text, display:'flex', flexDirection:'column', fontFamily:'-apple-system,"SF Pro Text","Inter",system-ui,sans-serif', overflow:'hidden', position:'relative' }}>
            <style>{`
                .cal-scroll { scrollbar-width:thin; scrollbar-color:rgba(124,94,245,0.35) transparent; }
                .cal-scroll::-webkit-scrollbar { width:4px; }
                .cal-scroll::-webkit-scrollbar-thumb { background:rgba(124,94,245,0.35); border-radius:4px; }
            `}</style>

            {/* Header */}
            <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${C.border}`, background:C.bg, flexShrink:0 }}>
                <button onClick={() => navigate('/workspace')} style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    {Ico.back()}
                </button>
                <span style={{ fontSize:14, fontWeight:700, letterSpacing:3, color:C.text }}>CALENDARIO</span>
                <button onClick={() => { setEditingGrupo(null); setModalOpen(true); }} style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }} title="Nuevo grupo">
                    {Ico.plus()}
                </button>
            </div>

            {/* Group selector */}
            {!loading && grupos.length > 0 && (
                <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, flexShrink:0, position:'relative', zIndex:10 }}>
                    <button onClick={() => setGroupsOpen(v=>!v)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, height:42, padding:'0 14px', borderRadius:12, background:'rgba(124,94,245,0.10)', border:`1px solid rgba(124,94,245,0.28)`, cursor:'pointer', fontFamily:'inherit' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {Ico.cal(C.violet,14)}
                            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{activeGrupo?.nombre || '—'}</span>
                        </div>
                        {Ico.chev(C.mute)}
                    </button>
                    {groupsOpen && (
                        <div style={{ position:'absolute', left:16, right:16, top:'calc(100% - 4px)', background:C.cardElev, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', boxShadow:'0 16px 40px rgba(0,0,0,0.5)', zIndex:20 }}>
                            {grupos.map(g => (
                                <div key={g._id} style={{ display:'flex', alignItems:'center', padding:'0 14px', borderBottom:`1px solid ${C.border}`, background: g._id===activeGrupo?._id ? 'rgba(124,94,245,0.10)' : 'transparent' }}>
                                    <button onClick={() => switchGrupoData(g)} style={{ flex:1, height:48, background:'transparent', border:'none', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}>
                                        <span style={{ fontSize:13, fontWeight:600, color: g._id===activeGrupo?._id ? C.violet : C.text }}>{g.nombre}</span>
                                    </button>
                                    <button onClick={() => { setEditingGrupo(g); setModalOpen(true); setGroupsOpen(false); }} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                                        {Ico.edit()}
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => { setEditingGrupo(null); setModalOpen(true); setGroupsOpen(false); }} style={{ width:'100%', height:44, display:'flex', alignItems:'center', gap:8, padding:'0 14px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                                {Ico.plus(C.mute,14)}
                                <span style={{ fontSize:13, color:C.mute }}>Nuevo grupo</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!loading && grupos.length === 0 && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, gap:14 }}>
                    {Ico.cal(C.dim,48)}
                    <p style={{ color:C.mute, fontSize:14, textAlign:'center', margin:0 }}>Sin grupos de calendario.<br/>Crea uno para comenzar.</p>
                    <button onClick={() => { setEditingGrupo(null); setModalOpen(true); }} style={{ height:44, padding:'0 28px', borderRadius:12, background:C.violet, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        Crear primer grupo
                    </button>
                </div>
            )}

            {loading && (
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:C.mute, fontSize:13 }}>Cargando…</span>
                </div>
            )}

            {/* Main content */}
            {!loading && activeGrupo && (
                <>
                    {/* Tab bar */}
                    <div style={{ display:'flex', padding:'8px 16px', borderBottom:`1px solid ${C.border}`, gap:4, flexShrink:0 }}>
                        {[['mes','MES'],['año','AÑO'],['resumen','RESUMEN']].map(([id,lbl])=>(
                            <button key={id} onClick={() => { setTab(id); if(id!=='mes') setPaintMode(false); }} style={{ flex:1, height:34, borderRadius:9, background: tab===id ? C.violet : 'transparent', border:`1px solid ${tab===id ? 'transparent' : C.border}`, color: tab===id ? '#fff' : C.mute, fontSize:11, fontWeight:700, letterSpacing:0.6, cursor:'pointer', fontFamily:'inherit', transition:'background 140ms ease' }}>{lbl}</button>
                        ))}
                    </div>

                    {/* Scroll area */}
                    <div className="cal-scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>

                        {/* MES */}
                        {tab==='mes' && (
                            <div style={{ padding:'0 16px', paddingBottom: paintMode ? 160 : 100 }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0 12px' }}>
                                    <button onClick={prevMonth} style={NAV_BTN}>{Ico.left()}</button>
                                    <span style={{ fontSize:16, fontWeight:800, color:C.text, letterSpacing:0.3 }}>
                                        {MONTHS[month].toUpperCase()} {year}
                                    </span>
                                    <button onClick={nextMonth} style={NAV_BTN}>{Ico.right()}</button>
                                </div>
                                <MonthGrid year={year} month={month} dias={dias}
                                    paintMode={paintMode} selectedShift={selectedShift}
                                    onDayTap={handleDayTap}
                                />
                                {/* Leyenda */}
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:16 }}>
                                    {SHIFT_ORDER.map(id => {
                                        const s = SHIFTS[id];
                                        return (
                                            <div key={id} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 8px' }}>
                                                <div style={{ width:10, height:10, borderRadius:3, background:s.bg, border:`1px solid ${s.border}` }} />
                                                <span style={{ fontSize:10.5, color:C.mute, fontWeight:600 }}>{s.label}</span>
                                                {s.time && <span style={{ fontSize:9.5, color:C.dim }}>{s.time}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* AÑO */}
                        {tab==='año' && (
                            <div style={{ padding:'12px 16px 120px' }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                                    <button onClick={() => setYearAnual(y=>y-1)} style={NAV_BTN}>{Ico.left()}</button>
                                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                        <span style={{ fontSize:16, fontWeight:800, color:C.text }}>{yearAnual}</span>
                                        <button onClick={handleShare} style={{ width:34, height:34, borderRadius:9, background:'rgba(124,94,245,0.12)', border:`1px solid rgba(124,94,245,0.3)`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }} title="Compartir">
                                            {Ico.share()}
                                        </button>
                                    </div>
                                    <button onClick={() => setYearAnual(y=>y+1)} style={NAV_BTN}>{Ico.right()}</button>
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                                    {Array.from({length:12},(_,m)=>(
                                        <MiniMonth key={m} year={yearAnual} month={m} dias={dias} />
                                    ))}
                                </div>
                                {/* Estadística anual resumida */}
                                <div style={{ marginTop:16, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                                    <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                                        <span style={{ fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:0.5 }}>ESTADÍSTICA ANUAL {yearAnual}</span>
                                    </div>
                                    {(() => {
                                        const counts = Object.fromEntries(SHIFT_ORDER.map(id=>[id,0]));
                                        Object.entries(dias).forEach(([date,sid]) => {
                                            if (new Date(date+'T00:00:00').getFullYear()===yearAnual && counts[sid]!==undefined) counts[sid]++;
                                        });
                                        return SHIFT_ORDER.map(id => {
                                            const s=SHIFTS[id]; const cnt=counts[id]; const hrs=cnt*s.hours;
                                            return (
                                                <div key={id} style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                                                    <div style={{ width:28,height:28,borderRadius:7,background:s.bg,border:`1px solid ${s.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginRight:10,flexShrink:0 }}>
                                                        <span style={{ fontSize:8.5,fontWeight:700,color:s.text }}>{s.short}</span>
                                                    </div>
                                                    <span style={{ fontSize:13,fontWeight:600,color:C.text,flex:1 }}>{s.label}</span>
                                                    <span style={{ fontSize:13,fontWeight:700,color:C.mute,marginRight:14,fontVariantNumeric:'tabular-nums' }}>{cnt} días</span>
                                                    <span style={{ fontSize:13,fontWeight:700,color:s.text,fontVariantNumeric:'tabular-nums' }}>{hrs>0?`${hrs}h`:'—'}</span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* RESUMEN */}
                        {tab==='resumen' && <StatsView dias={dias} />}
                    </div>

                    {/* Bottom controls — MES */}
                    {tab==='mes' && !paintMode && (
                        <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'10px 16px 28px', background:`linear-gradient(0deg,${C.bg} 60%,transparent)`, flexShrink:0 }}>
                            <button onClick={() => setPaintMode(true)} style={{ width:'100%', height:48, borderRadius:13, background:C.violet, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', letterSpacing:0.4, boxShadow:'0 6px 20px rgba(124,94,245,0.45)' }}>
                                PINTAR
                            </button>
                        </div>
                    )}
                    {tab==='mes' && paintMode && (
                        <div style={{ flexShrink:0, background:C.cardElev, borderTop:`1px solid ${C.border}`, padding:'10px 16px 28px' }}>
                            <div style={{ display:'flex', gap:6, marginBottom:10, overflowX:'auto', paddingBottom:2 }}>
                                <button onClick={() => setSelectedShift(null)} style={{ flexShrink:0, height:42, padding:'0 12px', borderRadius:10, background: selectedShift===null ? C.red : C.redDim, border:`1.5px solid ${selectedShift===null ? C.red : 'rgba(226,75,74,0.35)'}`, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5, transition:'all 120ms ease' }}>
                                    {Ico.eraser()} Borrar
                                </button>
                                {SHIFT_ORDER.map(id => {
                                    const s=SHIFTS[id]; const sel=selectedShift===id;
                                    return (
                                        <button key={id} onClick={() => setSelectedShift(id)} style={{ flexShrink:0, height:42, padding:'0 14px', borderRadius:10, background: sel ? s.bg : 'rgba(255,255,255,0.04)', border:`2px solid ${sel ? s.border : C.border}`, color: s.text, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 120ms ease', boxShadow: sel ? `0 4px 14px ${s.bg}88` : 'none' }}>
                                            {s.short}
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={() => setPaintMode(false)} style={{ width:'100%', height:44, borderRadius:12, background:C.red, border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', letterSpacing:0.3 }}>
                                SALIR DEL MODO EDICIÓN
                            </button>
                        </div>
                    )}
                </>
            )}

            <GroupModal
                open={modalOpen}
                editing={editingGrupo}
                onClose={() => { setModalOpen(false); setEditingGrupo(null); }}
                onSave={handleSaveGrupo}
                onDelete={handleDeleteGrupo}
            />
        </div>
    );
};

export default CalendarioPage;
