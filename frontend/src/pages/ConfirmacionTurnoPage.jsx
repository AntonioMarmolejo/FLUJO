import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BLOQUES_DATA } from '../data/bloques.js';
import '../styles/ConfirmacionTurnoPage.css';

const ConfirmacionTurnoPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { turno, bloqueIndex, totalBloques, bloquesConPuestos } = location.state || {};

    const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
    const [horaActual, setHoraActual] = useState(new Date());

    const bloque = BLOQUES_DATA[turno?.bloque];
    const esDiurno = turno?.turnoActual === 'diurno';

    // Colores según turno
    const colors = esDiurno
        ? {
            bg: '#fff8ec', border: '#f59e0b', text: '#92400e',
            badge: '#fef3c7', badgeText: '#b45309', progress: '#f59e0b',
            iconBg: '#fde68a', iconColor: '#92400e'
        }
        : {
            bg: '#1e1b4b', border: '#818cf8', text: '#c7d2fe',
            badge: '#312e81', badgeText: '#a5b4fc', progress: '#818cf8',
            iconBg: '#3730a3', iconColor: '#c7d2fe'
        };

    // Calcular hora de inicio del turno
    const horaInicio = esDiurno ? 6 : 18;
    const horaFin = esDiurno ? 18 : 6;
    const duracionTurno = 12 * 60 * 60; // 12 horas en segundos

    // Timer — actualizar cada segundo
    useEffect(() => {
        const calcularTranscurrido = () => {
            const ahora = new Date();
            setHoraActual(ahora);
            const inicioHoy = new Date();
            inicioHoy.setHours(horaInicio, 0, 0, 0);
            const diff = Math.floor((ahora - inicioHoy) / 1000);
            setTiempoTranscurrido(Math.max(0, diff));
        };

        calcularTranscurrido();
        const interval = setInterval(calcularTranscurrido, 1000);
        return () => clearInterval(interval);
    }, [horaInicio]);

    // Formatear segundos → HH:MM:SS
    const formatTiempo = (segundos) => {
        const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
        const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
        const s = (segundos % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // Tiempo restante
    const restante = Math.max(0, duracionTurno - tiempoTranscurrido);
    const horasRestantes = Math.floor(restante / 3600);
    const minutosRestantes = Math.floor((restante % 3600) / 60);

    // Progreso de la barra (0 a 100)
    const progreso = Math.min(100, (tiempoTranscurrido / duracionTurno) * 100);

    // Fecha formateada
    const fechaFormateada = horaActual.toLocaleDateString('es-EC', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    });

    // Iniciales del guardia
    const iniciales = `${turno?.nombre?.[0] || ''}${turno?.apellidos?.[0] || ''}`.toUpperCase();

    const handleContinuar = () => {
        const esUltimoPuesto = bloqueIndex + 1 === totalBloques;
        if (esUltimoPuesto) {
            navigate('/workspace');
        } else {
            navigate('/turno', {
                state: {
                    bloqueId: bloquesConPuestos[bloqueIndex + 1].bloqueId,
                    puesto: bloquesConPuestos[bloqueIndex + 1].puesto,
                    bloqueIndex: bloqueIndex + 1,
                    totalBloques,
                    bloquesConPuestos,
                },
            });
        }
    };

    if (!turno || !bloque) return null;

    return (
        <div className="conf-wrapper">
            <div className="conf-content">

                {/* Card turno activo */}
                <div className="conf-turno-card" style={{
                    background: colors.bg,
                    borderColor: colors.border,
                }}>
                    <div className="conf-turno-top">
                        <div className="conf-turno-left">
                            <div className="conf-icon" style={{ background: colors.iconBg }}>
                                {esDiurno ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="4" stroke={colors.iconColor} strokeWidth="2" />
                                        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                                            stroke={colors.iconColor} strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                                            stroke={colors.iconColor} strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <span className="conf-badge" style={{
                                    background: colors.badge, color: colors.badgeText,
                                }}>
                                    Turno {esDiurno ? 'diurno' : 'nocturno'} activo
                                </span>
                                <div className="conf-timer" style={{ color: colors.text }}>
                                    {formatTiempo(tiempoTranscurrido)}
                                </div>
                            </div>
                        </div>
                        <div className="conf-fecha" style={{ color: colors.text }}>
                            <span>{fechaFormateada}</span>
                            <span>{esDiurno ? '06:00' : '18:00'} – {esDiurno ? '18:00' : '06:00'}</span>
                        </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="conf-progress-bar">
                        <div className="conf-progress-track">
                            <div
                                className="conf-progress-fill"
                                style={{ width: `${progreso}%`, background: colors.progress }}
                            />
                        </div>
                        <div className="conf-progress-labels" style={{ color: colors.text }}>
                            <span>{esDiurno ? '06:00' : '18:00'}</span>
                            <span>{horasRestantes}h {minutosRestantes}min restantes</span>
                            <span>{esDiurno ? '18:00' : '06:00'}</span>
                        </div>
                    </div>
                </div>

                {/* Card datos del guardia */}
                <div className="conf-datos-card">
                    <span className="conf-datos-titulo">DATOS DEL GUARDIA</span>

                    <div className="conf-guardia-header">
                        <div className="conf-guardia-avatar">
                            {iniciales}
                        </div>
                        <div>
                            <h3>{turno.nombre} {turno.apellidos}</h3>
                            <p>{turno.empresa}</p>
                        </div>
                    </div>

                    <div className="conf-divider" />

                    <div className="conf-datos-grid">
                        <div className="conf-dato-row">
                            <span className="conf-dato-label">Cédula</span>
                            <span className="conf-dato-valor">{turno.cedula}</span>
                        </div>
                        <div className="conf-dato-row">
                            <span className="conf-dato-label">Puesto</span>
                            <span className="conf-dato-valor">{turno.puesto}</span>
                        </div>
                        <div className="conf-dato-row">
                            <span className="conf-dato-label">Bloque</span>
                            <span className="conf-dato-valor">
                                {bloque.nombre} {bloque.codigo}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botón continuar */}
                <button className="conf-btn" onClick={handleContinuar}>
                    {bloqueIndex + 1 === totalBloques
                        ? 'Ir al dashboard →'
                        : `Siguiente puesto →`}
                </button>

                {/* Nota navegación */}
                <p className="conf-nota">
                    Puedes ver esta ventana desde la barra de navegación ↗
                </p>

            </div>
        </div>
    );
};

export default ConfirmacionTurnoPage;