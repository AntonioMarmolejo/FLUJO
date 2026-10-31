import { useState, useRef } from 'react';
import '../styles/StatsChart.css';
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
            <div className="stats__vacio">{emptyLabel || 'Sin datos'}</div>
        );
    }

    const total = data.reduce((s, d) => s + d.value, 0);

    return (
        <div className="stats__pie">
            {/* Donut */}
            <div className="stats__pie-donut">
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
                    <Tooltip content={<PieTooltip total={total} />} />
                </PieChart>
            </div>
            {/* Leyenda */}
            <div className="stats__pie-leyenda">
                {data.map((d, i) => (
                    <div key={i} className="stats__pie-item">
                        {/* El color depende de la posición de la serie: va como variable */}
                        <span className="stats__pie-punto" style={{ '--serie-color': PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="stats__pie-nombre">{d.name}</span>
                        <span className="stats__pie-valor">{d.value}</span>
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
        <div className="stats__tooltip">
            <div className="stats__tooltip-titulo">{label}</div>
            {payload.map(p => (
                // El color de cada fila es el de su serie (lo da recharts)
                <div key={p.dataKey} className="stats__tooltip-fila" style={{ color: p.color }}>
                    <span>{p.name}:</span>
                    <strong>{p.value}</strong>
                </div>
            ))}
        </div>
    );
};

// ── Tooltip de los gráficos de pastel: valor y porcentaje ──
const PieTooltip = ({ active, payload, total }) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    return (
        <div className="stats__tooltip">
            <div className="stats__tooltip-fila">
                <span>{name}:</span>
                <strong>{value} ({Math.round(value / total * 100)}%)</strong>
            </div>
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
            <div className="stats__linea-leyenda">
                <span className="stats__linea-serie">
                    <span className="stats__linea-marca stats__linea-ingresos" />
                    Ingresos
                </span>
                <span className="stats__linea-serie">
                    <span className="stats__linea-marca stats__linea-salidas" />
                    Salidas
                </span>
                <span className="stats__linea-turno">
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
            className="stats"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
        >
            {/* Cabecera de la vista actual */}
            <div className="stats__cabecera">
                <span className="stats__titulo">{CHART_TITLES[chartIdx]}</span>
                <span className="stats__contador">{chartIdx + 1} / {totalCharts}</span>
            </div>

            {/* Vista activa */}
            {views[chartIdx]}

            {/* Indicadores de posición (dots) */}
            <div className="stats__puntos">
                {Array.from({ length: totalCharts }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => setChartIdx(i)}
                        className={`stats__punto${i === chartIdx ? ' stats__punto--activo' : ''}`}
                        title={CHART_TITLES[i]}
                    />
                ))}
            </div>
        </div>
    );
};

export default StatsChart;
