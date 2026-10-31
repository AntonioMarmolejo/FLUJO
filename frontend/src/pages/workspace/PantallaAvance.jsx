import { useState, useEffect } from 'react';
import { BLOQUES_DATA } from '../../data/bloques.js';

// ── Avance del día (timer + progreso del turno) ───────────
export const PantallaAvance = ({ turnoActivo, user }) => {
    const [transcurrido, setTranscurrido] = useState(0);
    const [horaActual, setHoraActual] = useState(new Date());

    const bloque = turnoActivo ? BLOQUES_DATA[turnoActivo.bloque] : null;
    const esDiurno = turnoActivo?.turnoActual === 'diurno';
    const horaInicio = esDiurno ? 6 : 18;
    const duracion = 12 * 60 * 60;

    useEffect(() => {
        const calcular = () => {
            const ahora = new Date();
            setHoraActual(ahora);
            const inicio = new Date();
            inicio.setHours(horaInicio, 0, 0, 0);
            setTranscurrido(Math.max(0, Math.floor((ahora - inicio) / 1000)));
        };
        calcular();
        const id = setInterval(calcular, 1000);
        return () => clearInterval(id);
    }, [horaInicio]);

    if (!turnoActivo || !bloque) {
        return <p className="ws-empty ws-empty-amplio">Sin turno activo</p>;
    }

    const progreso = Math.min(100, (transcurrido / duracion) * 100);
    const restante = Math.max(0, duracion - transcurrido);
    const hh = Math.floor(transcurrido / 3600).toString().padStart(2, '0');
    const mm = Math.floor((transcurrido % 3600) / 60).toString().padStart(2, '0');
    const ss = (transcurrido % 60).toString().padStart(2, '0');
    const hrRest = Math.floor(restante / 3600);
    const minRest = Math.floor((restante % 3600) / 60);


    const iniciales = `${user?.name?.split(' ')[0]?.[0] || ''}${user?.name?.split(' ')[1]?.[0] || ''}`.toUpperCase();
    const fecha = horaActual.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className="avance">
            {/* Card turno activo: los colores cambian con .diurno / .nocturno */}
            <div className={`avance-turno ${esDiurno ? 'diurno' : 'nocturno'}`}>
                <div className="avance-turno-top">
                    <div className="avance-turno-reloj">
                        <div className="avance-turno-icono">
                            {esDiurno ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <span className="avance-turno-badge">
                                Turno {esDiurno ? 'diurno' : 'nocturno'} activo
                            </span>
                            <div className="avance-turno-tiempo">{hh}:{mm}:{ss}</div>
                        </div>
                    </div>
                    <div className="avance-turno-fecha">
                        <div>{fecha}</div>
                        <div className="avance-turno-horario">{esDiurno ? '06:00 – 18:00' : '18:00 – 06:00'}</div>
                    </div>
                </div>
                <div className="avance-progreso">
                    {/* El ancho avanza cada segundo: único estilo en línea */}
                    <div className="avance-progreso-barra" style={{ width: `${progreso}%` }} />
                </div>
                <div className="avance-progreso-escala">
                    <span>{esDiurno ? '06:00' : '18:00'}</span>
                    <span className="avance-restante">{hrRest}h {minRest}min restantes</span>
                    <span>{esDiurno ? '18:00' : '06:00'}</span>
                </div>
            </div>

            {/* Card guardia */}
            <div className="avance-guardia">
                <p className="avance-guardia-titulo">DATOS DEL GUARDIA</p>
                <div className="avance-guardia-persona">
                    <div className="avance-guardia-avatar">{iniciales}</div>
                    <div>
                        <p className="avance-guardia-nombre">{user?.name}</p>
                        <p className="avance-guardia-email">{user?.email}</p>
                    </div>
                </div>
                <div className="avance-guardia-datos">
                    {[
                        ['Puesto', turnoActivo.puesto],
                        ['Bloque', `${bloque.nombre} ${bloque.codigo}`],
                        ['Turno', esDiurno ? 'Diurno  06:00 – 18:00' : 'Nocturno  18:00 – 06:00'],
                    ].map(([label, val]) => (
                        <div key={label} className="avance-guardia-dato">
                            <span className="avance-guardia-label">{label}</span>
                            <span className="avance-guardia-valor">{val}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
