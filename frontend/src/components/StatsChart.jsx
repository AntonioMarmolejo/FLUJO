import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const StatsChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data || []} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 10 }} interval={5} />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} labelStyle={{ color: '#aaa' }} />
            <Line type="monotone" dataKey="ingresos" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} name="Ingresos" />
            <Line type="monotone" dataKey="salidas" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} name="Salidas" />
        </LineChart>
    </ResponsiveContainer>
);

export default StatsChart;
