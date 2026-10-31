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
        <div className="conf">
            <div className="conf__content">

                {/* Card turno activo */}
                {/* .conf-diurno / .conf-nocturno definen los colores del turno */}
                <div className={`conf__turno-card ${esDiurno ? 'conf__turno-card--diurno' : 'conf__turno-card--nocturno'}`}>
                    <div className="conf__turno-top">
                        <div className="conf__turno-left">
                            <div className="conf__icon">
                                {esDiurno ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                                        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                                            stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <span className="conf__badge">
                                    Turno {esDiurno ? 'diurno' : 'nocturno'} activo
                                </span>
                                <div className="conf__timer">
                                    {formatTiempo(tiempoTranscurrido)}
                                </div>
                            </div>
                        </div>
                        <div className="conf__fecha">
                            <span>{fechaFormateada}</span>
                            <span>{esDiurno ? '06:00' : '18:00'} – {esDiurno ? '18:00' : '06:00'}</span>
                        </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="conf__progress-bar">
                        <div className="conf__progress-track">
                            <div
                                className="conf__progress-fill"
                                style={{ width: `${progreso}%` }}
                            />
                        </div>
                        <div className="conf__progress-labels">
                            <span>{esDiurno ? '06:00' : '18:00'}</span>
                            <span>{horasRestantes}h {minutosRestantes}min restantes</span>
                            <span>{esDiurno ? '18:00' : '06:00'}</span>
                        </div>
                    </div>
                </div>

                {/* Card datos del guardia */}
                <div className="conf__datos-card">
                    <span className="conf__datos-titulo">DATOS DEL GUARDIA</span>

                    <div className="conf__guardia-header">
                        <div className="conf__guardia-avatar">
                            {iniciales}
                        </div>
                        <div>
                            <h3>{turno.nombre} {turno.apellidos}</h3>
                            <p>{turno.empresa}</p>
                        </div>
                    </div>

                    <div className="conf__divider" />

                    <div className="conf__datos-grid">
                        <div className="conf__dato-row">
                            <span className="conf__dato-label">Cédula</span>
                            <span className="conf__dato-valor">{turno.cedula}</span>
                        </div>
                        <div className="conf__dato-row">
                            <span className="conf__dato-label">Puesto</span>
                            <span className="conf__dato-valor">{turno.puesto}</span>
                        </div>
                        <div className="conf__dato-row">
                            <span className="conf__dato-label">Bloque</span>
                            <span className="conf__dato-valor">
                                {bloque.nombre} {bloque.codigo}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botón continuar */}
                <button className="conf__btn" onClick={handleContinuar}>
                    {bloqueIndex + 1 === totalBloques
                        ? 'Ir al dashboard →'
                        : `Siguiente puesto →`}
                </button>

                {/* Nota navegación */}
                <p className="conf__nota">
                    Puedes ver esta ventana desde la barra de navegación ↗
                </p>

            </div>
        </div>
    );
};

export default ConfirmacionTurnoPage;