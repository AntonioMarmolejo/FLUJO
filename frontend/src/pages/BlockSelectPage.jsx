import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import '../styles/BlockSelectPage.css';

const BLOQUES = [
    { id: '12', nombre: 'Bloque 12', codigo: 'EDY', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
    { id: '31', nombre: 'Bloque 31', codigo: 'ZECH', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    { id: '43', nombre: 'Bloque 43', codigo: 'ZEMI', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
    { id: '15', nombre: 'Bloque 15', codigo: 'ITAYA', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
];

const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

const BlockSelectPage = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleBloque = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
        );
        setError('');
    };

    const handleContinuar = async () => {
        if (selected.length === 0) {
            setError('Selecciona al menos un bloque para continuar');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/user/bloques', { bloques: selected });
            updateUser(data.user);
            navigate('/onboarding/puestos');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="block-wrapper">
            <div className="block-card">

                {/* Avatar */}
                <div className="block-avatar">
                    <span>{getInitials(user?.name)}</span>
                </div>

                {/* Saludo */}
                <div className="block-greeting">
                    <p>¡Bienvenido/a de vuelta,</p>
                    <h2>{user?.name}</h2>
                </div>

                <div className="block-divider" />

                {/* Pregunta */}
                <div className="block-question">
                    <h3>¿A qué bloque perteneces?</h3>
                    <p>Selecciona tu bloque para continuar con el registro.</p>
                </div>

                {/* Lista de bloques */}
                <div className="block-list">
                    {BLOQUES.map((bloque) => {
                        const isSelected = selected.includes(bloque.id);
                        return (
                            <div
                                key={bloque.id}
                                className={`block-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleBloque(bloque.id)}
                            >
                                <div
                                    className="block-badge"
                                    style={{ background: bloque.bg, color: bloque.color }}
                                >
                                    {bloque.id}
                                </div>
                                <div className="block-info">
                                    <span className="block-nombre">{bloque.nombre}</span>
                                    <span className="block-codigo">{bloque.codigo}</span>
                                </div>
                                <div className={`block-radio ${isSelected ? 'checked' : ''}`}>
                                    {isSelected && <div className="block-radio-inner" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {error && <p className="block-error">{error}</p>}

                {/* Botón */}
                <button
                    className={`block-btn ${selected.length > 0 ? 'active' : ''}`}
                    onClick={handleContinuar}
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : 'Continuar →'}
                </button>

            </div>
        </div>
    );
};

export default BlockSelectPage;