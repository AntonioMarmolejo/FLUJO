import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BLOQUES_DATA } from '../data/bloques.js';
import api from '../api/axios';
import '../styles/PostSelectPage.css';

const PostSelectPage = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    // Índice del bloque actual que se está configurando
    const [bloqueIndex, setBloqueIndex] = useState(0);
    const [selectedPuestos, setSelectedPuestos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const bloques = user?.bloques || [];
    const totalBloques = bloques.length;
    const bloqueActualId = bloques[bloqueIndex];
    const bloqueActual = BLOQUES_DATA[bloqueActualId];

    const togglePuesto = (puesto) => {
        setSelectedPuestos((prev) =>
            prev.includes(puesto) ? prev.filter((p) => p !== puesto) : [...prev, puesto]
        );
        setError('');
    };

    const handleContinuar = async () => {
        if (selectedPuestos.length === 0) {
            setError('Selecciona al menos un puesto para continuar');
            return;
        }

        setLoading(true);
        try {
            // Guardar puestos del bloque actual
            const { data } = await api.post('/user/puestos', {
                bloqueId: bloqueActualId,
                puestos: selectedPuestos,
            });
            updateUser(data.user);

            const esUltimoBloque = bloqueIndex === totalBloques - 1;

            if (esUltimoBloque) {
                // Completar onboarding y ir al workspace
                await api.post('/user/bloques', { bloques: user.bloques });
                navigate('/workspace');
            } else {
                // Siguiente bloque
                setBloqueIndex((prev) => prev + 1);
                setSelectedPuestos([]);
                setError('');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleVolver = () => {
        if (bloqueIndex === 0) {
            navigate('/onboarding');
        } else {
            setBloqueIndex((prev) => prev - 1);
            setSelectedPuestos([]);
            setError('');
        }
    };

    if (!bloqueActual) return null;

    const esUltimo = bloqueIndex === totalBloques - 1;

    return (
        <div className="post-wrapper">
            <div className="post-card">

                {/* Header */}
                <div className="post-header">
                    <button className="post-back" onClick={handleVolver}>‹</button>
                    <div className="post-step">
                        <span>Paso 2 de 2</span>
                        <h2>Selecciona tu puesto</h2>
                    </div>
                </div>

                {/* Bloque actual */}
                <div
                    className="post-bloque-badge"
                    style={{ background: bloqueActual.bg, borderColor: bloqueActual.color + '40' }}
                >
                    <div
                        className="post-bloque-num"
                        style={{ background: bloqueActual.bg, color: bloqueActual.color }}
                    >
                        {bloqueActualId}
                    </div>
                    <div className="post-bloque-info">
                        <span
                            className="post-bloque-nombre"
                            style={{ color: bloqueActual.color }}
                        >
                            {bloqueActual.nombre} {bloqueActual.codigo}
                        </span>
                        <span className="post-bloque-count">
                            {bloqueActual.puestos.length} puestos disponibles
                        </span>
                    </div>

                    {/* Indicador si hay múltiples bloques */}
                    {totalBloques > 1 && (
                        <span className="post-bloque-progress">
                            {bloqueIndex + 1}/{totalBloques}
                        </span>
                    )}
                </div>

                {/* Pregunta */}
                <p className="post-question">
                    ¿Cuál es tu puesto dentro de este bloque?
                </p>

                {/* Lista puestos */}
                <div className="post-list">
                    {bloqueActual.puestos.map((puesto) => {
                        const isSelected = selectedPuestos.includes(puesto);
                        return (
                            <div
                                key={puesto}
                                className={`post-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => togglePuesto(puesto)}
                            >
                                <span className="post-nombre">{puesto}</span>
                                <div className={`post-radio ${isSelected ? 'checked' : ''}`}>
                                    {isSelected && <div className="post-radio-inner" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {error && <p className="post-error">{error}</p>}

                {/* Botón */}
                <button
                    className={`post-btn ${selectedPuestos.length > 0 ? 'active' : ''}`}
                    onClick={handleContinuar}
                    disabled={loading}
                >
                    {loading
                        ? 'Guardando...'
                        : esUltimo
                            ? 'Finalizar registro →'
                            : `Siguiente bloque →`}
                </button>

            </div>
        </div>
    );
};

export default PostSelectPage;