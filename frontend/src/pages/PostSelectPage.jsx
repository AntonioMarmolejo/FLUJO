import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BLOQUES_DATA } from '../data/bloques.js';
import api from '../api/axios';
import '../styles/PostSelectPage.css';

const PostSelectPage = () => {
    const { user, updateUser, tieneBloque } = useAuth();
    const navigate = useNavigate();

    // Índice del bloque actual que se está configurando
    const [bloqueIndex, setBloqueIndex] = useState(0);
    const [selectedPuestos, setSelectedPuestos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Solo se configuran puestos de los bloques que el admin ya aprobó
    const bloques = (user?.bloques || []).filter(tieneBloque);
    const totalBloques = bloques.length;
    const bloqueActualId = bloques[bloqueIndex];
    const bloqueActual = BLOQUES_DATA[bloqueActualId];

    const togglePuesto = (puesto) => {
        setSelectedPuestos([puesto]);
        setError('');
    };


    const handleContinuar = async () => {
        if (selectedPuestos.length === 0) {
            setError('Selecciona al menos un puesto para continuar');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('/user/puestos', {
                bloqueId: bloqueActualId,
                puestos: selectedPuestos,
            });
            updateUser(data.user);

            // Construir lista plana de { bloqueId, puesto } para todos los puestos
            const puestosGuardados = {
                ...data.user.puestos,
                [bloqueActualId]: selectedPuestos,
            };

            const bloquesConPuestos = [];
            for (const [bId, puestosList] of Object.entries(puestosGuardados)) {
                if (!bloques.includes(bId)) continue;
                for (const p of puestosList) {
                    bloquesConPuestos.push({ bloqueId: bId, puesto: p });
                }
            }

            // Si es el último bloque, ir al primer turno
            if (bloqueIndex === totalBloques - 1) {
                navigate('/turno', {
                    state: {
                        bloqueId: bloquesConPuestos[0].bloqueId,
                        puesto: bloquesConPuestos[0].puesto,
                        bloqueIndex: 0,
                        totalBloques: bloquesConPuestos.length,
                        bloquesConPuestos,
                    },
                });
            } else {
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
        <div className="post">
            <div className="post__card">

                {/* Header */}
                <div className="post__header">
                    <button className="post__back" onClick={handleVolver}>‹</button>
                    <div className="post__step">
                        <span>Paso 2 de 2</span>
                        <h2>Selecciona tu puesto</h2>
                    </div>
                </div>

                {/* Bloque actual */}
                <div
                    className="post__bloque-badge"
                    style={{ background: bloqueActual.bg, borderColor: bloqueActual.color + '40' }}
                >
                    <div
                        className="post__bloque-num"
                        style={{ background: bloqueActual.bg, color: bloqueActual.color }}
                    >
                        {bloqueActualId}
                    </div>
                    <div className="post__bloque-info">
                        <span
                            className="post__bloque-nombre"
                            style={{ color: bloqueActual.color }}
                        >
                            {bloqueActual.nombre} {bloqueActual.codigo}
                        </span>
                        <span className="post__bloque-count">
                            {bloqueActual.puestos.length} puestos disponibles
                        </span>
                    </div>

                    {/* Indicador si hay múltiples bloques */}
                    {totalBloques > 1 && (
                        <span className="post__bloque-progress">
                            {bloqueIndex + 1}/{totalBloques}
                        </span>
                    )}
                </div>

                {/* Pregunta */}
                <p className="post__question">
                    ¿Cuál es tu puesto dentro de este bloque?
                </p>

                {/* Lista puestos */}
                <div className="post__list">
                    {bloqueActual.puestos.map((puesto) => {
                        const isSelected = selectedPuestos.includes(puesto);
                        return (
                            <div
                                key={puesto}
                                className={`post__item${isSelected ? ' post__item--selected' : ''}`}
                                onClick={() => togglePuesto(puesto)}
                            >
                                <span className="post__nombre">{puesto}</span>
                                <div className={`post__radio${isSelected ? ' post__radio--checked' : ''}`}>
                                    {isSelected && <div className="post__radio-inner" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {error && <p className="post__error">{error}</p>}

                {/* Botón */}
                <button
                    className={`post__btn${selectedPuestos.length > 0 ? ' post__btn--active' : ''}`}
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