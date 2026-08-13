import { useState, useRef } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell,
} from 'recharts';

// ── Colores para los gráficos de pastel ──────────────────
const PIE_COLORS = [
    '#818cf8', '#4ade80', '#f87171', '#fbbf24',
    '#a78bfa', '#34d399', '#f472b6', '#60a5fa',
];

// Horas que abarca cada turno (inclusive inicio, inclusive fin)
const TURNO_HORAS = {
    diurno:   [6,7,8,9,10,11,12,13,14,15,16,17,18],
    nocturno: [18,19,20,21,22,23,0,1,2,3,4,5,6],
};

// ── Gráfico de pastel compacto con leyenda lateral ────────
const MiniPie = ({ data, emptyLabel }) => {
    if (!data || data.length === 0) {
        return (
            <div style={{
                height: 170, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#444', fontSize: 12,
            }}>
                {emptyLabel || 'Sin datos'}
            </div>
        );
    }

    const total = data.reduce((s, d) => s + d.value, 0);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 170 }}>
            {/* Donut */}
            <div style={{ flexShrink: 0 }}>
                <PieChart width={130} height={130}>
                    <Pie
                        data={data}
                        cx={60}
                        cy={60}
                        innerRadius={35}
                        outerRadius={56}
                        dataKey="value"
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                        formatter={(value, name) => [`${value} (${Math.round(value / total * 100)}%)`, name]}
                    />
                </PieChart>
            </div>
            {/* Leyenda */}
            <div style={{
                flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5,
                maxHeight: 162, overflowY: 'auto',
            }}>
                {data.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: PIE_COLORS[i % PIE_COLORS.length],
                            flexShrink: 0,
                        }} />
                        <span style={{
                            fontSize: 10, color: '#aaa', flex: 1, minWidth: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {d.name}
                        </span>
                        <span style={{ fontSize: 10, color: '#666', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                            {d.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Tooltip personalizado para la línea horaria ───────────
const HourTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
            <div style={{ color: '#aaa', marginBottom: 4 }}>{label}</div>
            {payload.map(p => (
                <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8 }}>
                    <span>{p.name}:</span>
                    <span style={{ fontWeight: 700 }}>{p.value}</span>
                </div>
            ))}
        </div>
    );
};

// ── Componente principal ──────────────────────────────────
const CHART_TITLES = [
    'Tráfico por hora',
    'Destinos / Plataformas',
    'Actividades',
    'Vehículos activos',
];

const StatsChart = ({
    data = [],
    turno = 'diurno',
    topDestinos = [],
    topActividades = [],
    topPlacas = [],
}) => {
    const [chartIdx, setChartIdx] = useState(0);
    const touchStartX = useRef(null);
    const mouseRef = useRef(null);
    const totalCharts = 4;

    // ── Construir datos horarios filtrados al turno ───────
    const horas = TURNO_HORAS[turno] || TURNO_HORAS.diurno;
    const hourlyData = horas.map(h => {
        const found = data.find(d => d.hora === h);
        return {
            label: `${String(h).padStart(2, '0')}h`,
            ingresos: found?.ingresos || 0,
            salidas: found?.salidas || 0,
        };
    });

    // ── Navegación por swipe ──────────────────────────────
    const navigate = (dx) => {
        if (dx < -40) setChartIdx(i => Math.min(i + 1, totalCharts - 1));
        else if (dx > 40) setChartIdx(i => Math.max(i - 1, 0));
    };

    const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
        if (touchStartX.current == null) return;
        navigate(e.changedTouches[0].clientX - touchStartX.current);
        touchStartX.current = null;
    };

    const onMouseDown = (e) => {
        if (e.button !== 0) return;
        mouseRef.current = { startX: e.clientX, moved: false };
        const onMove = (me) => {
            if (Math.abs(me.clientX - mouseRef.current.startX) > 6) mouseRef.current.moved = true;
        };
        const onUp = (me) => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            if (!mouseRef.current?.moved) return;
            navigate(me.clientX - mouseRef.current.startX);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // ── Vistas ────────────────────────────────────────────
    const views = [
        // Vista 0: Línea horaria
        <div key="line">
            <ResponsiveContainer width="100%" height={160}>
                <LineChart data={hourlyData} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: '#555', fontSize: 9 }}
                        interval={turno === 'nocturno' ? 1 : 1}
                    />
                    <YAxis tick={{ fill: '#555', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip content={<HourTooltip />} />
                    <Line type="monotone" dataKey="ingresos" stroke="#818cf8" strokeWidth={2} dot={{ r: 2, fill: '#818cf8' }} name="Ingresos" />
                    <Line type="monotone" dataKey="salidas"  stroke="#f87171" strokeWidth={2} dot={{ r: 2, fill: '#f87171' }} name="Salidas" />
                </LineChart>
            </ResponsiveContainer>
            {/* Leyenda del gráfico de línea */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 6 }}>
                <span style={{ fontSize: 10, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 3, background: '#818cf8', borderRadius: 2, display: 'inline-block' }} />
                    Ingresos
                </span>
                <span style={{ fontSize: 10, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 3, background: '#f87171', borderRadius: 2, display: 'inline-block' }} />
                    Salidas
                </span>
                <span style={{ fontSize: 10, color: '#444', marginLeft: 4 }}>
                    {turno === 'nocturno' ? '18:00 – 06:00' : '06:00 – 18:00'}
                </span>
            </div>
        </div>,

        // Vista 1: Destinos / Plataformas
        <MiniPie key="dest" data={topDestinos} emptyLabel="Sin destinos registrados" />,

        // Vista 2: Actividades
        <MiniPie key="act" data={topActividades} emptyLabel="Sin actividades registradas" />,

        // Vista 3: Vehículos activos
        <MiniPie key="plac" data={topPlacas} emptyLabel="Sin vehículos registrados" />,
    ];

    return (
        <div
            style={{ userSelect: 'none', touchAction: 'pan-y', WebkitUserSelect: 'none' }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
        >
            {/* Cabecera de la vista actual */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 2px 8px',
            }}>
                <span style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {CHART_TITLES[chartIdx]}
                </span>
                <span style={{ fontSize: 10, color: '#333', fontVariantNumeric: 'tabular-nums' }}>
                    {chartIdx + 1} / {totalCharts}
                </span>
            </div>

            {/* Vista activa */}
            {views[chartIdx]}

            {/* Indicadores de posición (dots) */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingTop: 10 }}>
                {Array.from({ length: totalCharts }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => setChartIdx(i)}
                        style={{
                            width: i === chartIdx ? 18 : 6,
                            height: 6,
                            borderRadius: 3,
                            background: i === chartIdx ? '#818cf8' : '#2a2a2a',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            transition: 'width 0.2s ease, background 0.2s ease',
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default StatsChart;
