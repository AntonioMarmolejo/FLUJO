import { useEffect, useState } from 'react';
import { leerTramosLocales } from '../../lib/tramosOffline.js';
import { EN_CAMINO_MIN, armarTransito, cronometro, garitasDelBloque, minutosHasta } from '../../lib/garitas.js';
import '../../styles/TransitoDetalle.css';

// En el detalle de una SALIDA hacia otra garita (garita de origen): una sola línea
// con el contador en vivo y una barra fina de progreso, para ocupar el mínimo espacio.
// Al tocarla se abre una ventana con la llegada estimada y los botones Cambiar
// destino y Cancelar tránsito.

const horaDe = ms => new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guayaquil' });

const IconoFlecha = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const IconoCambiar = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h14l-4-4M20 16H6l4 4" /></svg>
);
const IconoChevron = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
);
const IconoCerrar = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const IconoAviso = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
);

export const TransitoDetalle = ({ mov, onTransito }) => {
    // Lo que cambio aquí (cancelar / destino) manda; si no, el tránsito del movimiento
    // (que se actualiza cuando llega o pasa por otra garita)
    const [cambio, setTransito] = useState(null);
    const transito = cambio || mov.transito;
    const [ahora, setAhora] = useState(() => Date.now());
    const [eligiendo, setEligiendo] = useState(false);
    const [confirmarCancelar, setConfirmarCancelar] = useState(false);
    const [verDetalle, setVerDetalle] = useState(false);
    const [error, setError] = useState('');

    const salidaAt = transito ? new Date(transito.salidaAt).getTime() : 0;
    const vencido = ahora - salidaAt > EN_CAMINO_MIN * 60e3;
    const enCamino = transito?.estado === 'en_camino' && !vencido;

    // Cronómetro en vivo mientras sigue en camino
    useEffect(() => {
        if (!enCamino) return undefined;
        const id = setInterval(() => setAhora(Date.now()), 1000);
        return () => clearInterval(id);
    }, [enCamino]);

    if (!transito) return null;

    const transcurrido = (ahora - salidaAt) / 1000;
    // Llegó: cuánto tardó (el contador ya no corre)
    const tardo = transito.estado === 'llegado' && transito.cerradoAt ? (new Date(transito.cerradoAt).getTime() - salidaAt) / 1000 : null;
    const pasos = transito.pasos || [];
    const min = minutosHasta(transito, transito.destino);
    const retrasado = min > 0 && transcurrido > min * 60;
    const avance = min > 0 ? Math.min(1, transcurrido / (min * 60)) : 0;
    const editable = enCamino && onTransito && !mov._pending;

    const titulo = mov.reporte && transito.estado === 'en_camino' && !vencido ? `Viene hacia ${transito.destino}`
        : transito.estado === 'llegado' ? `Llegó a ${transito.destino}`
        : transito.estado === 'cancelado' ? 'Tránsito cancelado'
            : vencido ? `Ya no aparece en EN CAMINO de ${transito.destino}`
                : `En tránsito a ${transito.destino}${pasos.length ? ` · ✓ ${pasos[pasos.length - 1].garita}` : ''}`;

    const cambiarDestino = async destino => {
        setEligiendo(false);
        setError('');
        const tramos = await leerTramosLocales().catch(() => []);
        const nuevo = armarTransito({ tramos, bloque: mov.bloque, origen: transito.origen, destino, salidaAt });
        if (!nuevo) { setError('No se pudo calcular la ruta a ese destino.'); return; }
        setTransito(await onTransito(mov, 'destino', { destino: nuevo.destino, tiempos: nuevo.tiempos }));
    };
    const cancelar = async () => {
        setConfirmarCancelar(false);
        setTransito(await onTransito(mov, 'cancelar'));
    };

    const otras = garitasDelBloque(mov.bloque).filter(g => g !== transito.origen && g !== transito.destino);

    const estado = `${enCamino ? '' : ' transito--cerrado'}${retrasado && enCamino ? ' transito--retrasado' : ''}`;
    const contador = enCamino ? (
        <span className="transito__crono">
            <strong>{cronometro(transcurrido)}</strong>{min > 0 ? ` / ${min} min` : ''}
        </span>
    ) : tardo != null && (
        <span className="transito__crono"><strong>{cronometro(tardo)}</strong>{min > 0 ? ` / ${min} min` : ''}</span>
    );

    return (
        <>
            {/* Una sola línea: lo demás está en la ventana */}
            <button type="button" className={`transito-linea${estado}`} aria-haspopup="dialog" onClick={() => setVerDetalle(true)}>
                <span className="transito-linea__titulo">{enCamino && <IconoFlecha />}<span>{titulo}</span></span>
                {contador}
                <span className="transito-linea__mas"><IconoChevron /></span>
                {enCamino && min > 0 && <span className="transito-linea__barra" style={{ width: `${avance * 100}%` }} />}
            </button>

            {verDetalle && (
                <div className="modal__overlay transito__velo" onClick={e => { e.stopPropagation(); setVerDetalle(false); }}>
                    <div className={`transito transito--hoja${estado}`} role="dialog" aria-label={titulo} onClick={e => e.stopPropagation()}>
                        <div className="transito__hoja-cab">
                            <span className="transito__hoja-placa">{mov.placa}</span>
                            <button className="transito__hoja-cerrar" aria-label="Cerrar" onClick={() => setVerDetalle(false)}><IconoCerrar /></button>
                        </div>
                        <div className="transito__cab">
                            <span className="transito__titulo">{enCamino && <IconoFlecha />}{titulo}</span>
                            {contador}
                        </div>
                        {enCamino && min > 0 && (
                            <div className="transito__barra"><div className="transito__barra-relleno" style={{ width: `${avance * 100}%` }} /></div>
                        )}
                        {pasos.length > 0 && (
                            <div className="transito__pasos">
                                {pasos.map(p => (
                                    <span key={p.garita} className="transito__paso">✓ {p.garita} {horaDe(new Date(p.at).getTime())}</span>
                                ))}
                            </div>
                        )}
                        {vencido && transito.estado === 'en_camino' && (
                            <div className="transito__nota">Pasó 1 hora desde la salida.</div>
                        )}

                        <div className="transito__datos">
                            <div>
                                <div className="transito__etiqueta">{mov.reporte ? 'Reportado' : 'Salida'}</div>
                                <div className="transito__valor">{[mov.hora, transito.origen && `desde ${transito.origen}`].filter(Boolean).join(' · ')}</div>
                            </div>
                            <div>
                                <div className="transito__etiqueta">Destino</div>
                                <div className="transito__valor">{transito.destino}</div>
                            </div>
                            <div>
                                <div className="transito__etiqueta">Tiempo esperado</div>
                                <div className="transito__valor">{min > 0 ? `${min} min` : 'Sin ruta en Distancias'}</div>
                            </div>
                            <div>
                                <div className="transito__etiqueta">Llegada estimada</div>
                                <div className="transito__valor">{min > 0 ? horaDe(salidaAt + min * 60e3) : '—'}</div>
                            </div>
                        </div>

                        {enCamino && mov._pending && (
                            <div className="transito__nota">Podrás cambiar el destino o cancelarlo cuando se suba al servidor.</div>
                        )}
                        {editable && (eligiendo ? (
                            <div className="transito__elegir">
                                <div className="transito__etiqueta">Nuevo destino</div>
                                <div className="transito__chips">
                                    {otras.map(g => <button key={g} className="transito__chip" onClick={() => cambiarDestino(g)}>{g}</button>)}
                                </div>
                                <button className="transito__btn" onClick={() => setEligiendo(false)}>Volver</button>
                            </div>
                        ) : (
                            <div className="transito__botones">
                                <button className="transito__btn" onClick={() => setEligiendo(true)} disabled={!otras.length}><IconoCambiar />Cambiar destino</button>
                                <button className="transito__btn transito__btn--peligro" onClick={() => setConfirmarCancelar(true)}>Cancelar tránsito</button>
                            </div>
                        ))}
                        {error && <div className="transito__nota transito__nota--error">{error}</div>}
                    </div>
                </div>
            )}

            {confirmarCancelar && (
                <div className="modal__overlay transito__velo" onClick={e => { e.stopPropagation(); setConfirmarCancelar(false); }}>
                    <div className="transito__confirmar" role="alertdialog" aria-labelledby="transito-cancelar" onClick={e => e.stopPropagation()}>
                        <div className="transito__confirmar-icono"><IconoAviso /></div>
                        <h3 id="transito-cancelar" className="transito__confirmar-titulo">¿Cancelar tránsito?</h3>
                        <p className="transito__confirmar-texto">
                            <strong>{mov.placa}</strong> dejará de aparecer en EN CAMINO de {transito.destino}. La SALIDA de las {mov.hora} se mantiene en el historial.
                        </p>
                        <button className="transito__confirmar-si" onClick={cancelar}>Sí, cancelar tránsito</button>
                        <button className="transito__confirmar-no" onClick={() => setConfirmarCancelar(false)}>Volver</button>
                    </div>
                </div>
            )}
        </>
    );
};
