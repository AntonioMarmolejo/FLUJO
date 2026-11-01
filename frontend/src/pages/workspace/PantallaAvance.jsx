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
        return <p className="ws__empty ws__empty--amplio">Sin turno activo</p>;
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
            <div className={`avance__turno ${esDiurno ? 'avance__turno--diurno' : 'avance__turno--nocturno'}`}>
                <div className="avance__turno-top">
                    <div className="avance__turno-reloj">
                        <div className="avance__turno-icono">
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
                            <span className="avance__turno-badge">
                                Turno {esDiurno ? 'diurno' : 'nocturno'} activo
                            </span>
                            <div className="avance__turno-tiempo">{hh}:{mm}:{ss}</div>
                        </div>
                    </div>
                    <div className="avance__turno-fecha">
                        <div>{fecha}</div>
                        <div className="avance__turno-horario">{esDiurno ? '06:00 – 18:00' : '18:00 – 06:00'}</div>
                    </div>
                </div>
                <div className="avance__progreso">
                    {/* El ancho avanza cada segundo: único estilo en línea */}
                    <div className="avance__progreso-barra" style={{ width: `${progreso}%` }} />
                </div>
                <div className="avance__progreso-escala">
                    <span>{esDiurno ? '06:00' : '18:00'}</span>
                    <span className="avance__restante">{hrRest}h {minRest}min restantes</span>
                    <span>{esDiurno ? '18:00' : '06:00'}</span>
                </div>
            </div>

            {/* Card guardia */}
            <div className="avance__guardia">
                <p className="avance__guardia-titulo">DATOS DEL GUARDIA</p>
                <div className="avance__guardia-persona">
                    <div className="avance__guardia-avatar">{iniciales}</div>
                    <div>
                        <p className="avance__guardia-nombre">{user?.name}</p>
                        <p className="avance__guardia-email">{user?.email}</p>
                    </div>
                </div>
                <div className="avance__guardia-datos">
                    {[
                        ['Puesto', turnoActivo.puesto],
                        ['Bloque', `${bloque.nombre} ${bloque.codigo}`],
                        ['Turno', esDiurno ? 'Diurno  06:00 – 18:00' : 'Nocturno  18:00 – 06:00'],
                    ].map(([label, val]) => (
                        <div key={label} className="avance__guardia-dato">
                            <span className="avance__guardia-label">{label}</span>
                            <span className="avance__guardia-valor">{val}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
