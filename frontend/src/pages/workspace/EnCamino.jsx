import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import { encolarMovimiento, getOperacionesPendientes, subirMovimientoPendiente } from '../../lib/syncEngine.js';
import { EN_CAMINO_MIN, armarTransito, cronometro, garitaDeLugar, garitasDelBloque, minutosHasta } from '../../lib/garitas.js';
import { CAMPOS_REPORTE, editarReporte, quitarReporte } from '../../lib/reportesEnCamino.js';
import { leerTramosLocales } from '../../lib/tramosOffline.js';
import { getHoraLocal } from './helpers';
import { ModalDetalle } from './Movimientos';
import '../../styles/EnCamino.css';

// EN CAMINO: barra en el borde izquierdo de Inicio (a la altura del +) que se
// arrastra para abrir el cajón. En el cajón:
//   · Los que vienen hacia mi garita: salidas de otras garitas del bloque (o que
//     pasan por aquí) y los vehículos que la garita se reportó a sí misma.
//   · Botón para reportarse un vehículo que viene.
//   · Los enviados desde mi garita hacia otra.
// Cada vehículo se ve durante EN_CAMINO_MIN minutos como máximo.

const MAX_FILAS = 3;
const UMBRAL_ARRASTRE = 50;      // px para abrir o cerrar al soltar
const UMBRAL_IR = 55;            // px sobre una fila: a la izquierda va a su movimiento; a la derecha, sus botones
const ANCHO_ACCIONES = 118;      // px que se corre la fila para mostrar sus botones
const CADA_CUANTO_MS = 30000;    // consulta al servidor
const VACIO = { lista: [], enviados: [], desfase: 0 };

// Diferencia entre el reloj del servidor y el del dispositivo. La hora del servidor se
// compara con el punto medio del pedido; si la respuesta tardó mucho (señal mala) la
// medida no es confiable y se conserva la anterior. Diferencias de menos de 2 min se
// toman como 0: el móvil ya está en hora y así coincide con el detalle del movimiento.
const RTT_MAX_MS = 4000;
const DESFASE_MIN_MS = 2 * 60e3;
const calcularDesfase = (ahoraServidor, pedido, llegada, anterior = 0) => {
    const servidor = new Date(ahoraServidor).getTime();
    if (!Number.isFinite(servidor) || llegada - pedido > RTT_MAX_MS) return anterior || 0;
    const desfase = servidor - (pedido + llegada) / 2;
    return Math.abs(desfase) < DESFASE_MIN_MS ? 0 : desfase;
};

// Progreso de un vehículo: tiempo transcurrido ÷ minutos esperados hasta `meta`
const estadoDe = (v, ahora, meta) => {
    const transcurrido = (ahora - new Date(v.salidaAt).getTime()) / 1000;
    const min = minutosHasta(v, meta);
    const esperado = min > 0 ? min * 60 : null;     // sin tiempo estimado no hay progreso
    return {
        ...v,
        id: String(v._id),
        transcurrido,
        retrasado: esperado != null && transcurrido > esperado,
        avance: esperado ? Math.min(1, transcurrido / esperado) : 0,
        // Con varios destinos, las garitas elegidas son paradas, no "de paso"
        dePaso: !v.reporte && v.destino !== meta && !(v.paradas || []).includes(meta),
    };
};
// "PAD-E → PAD-C → PAD-L" (con varios destinos, todas las paradas)
const rutaTexto = v => [v.origen, ...(v.paradas?.length ? v.paradas : [v.destino])].join(' → ');
// Los retrasados primero (el que más lleva arriba); luego los que están por llegar
const ordenar = (a, b) => (b.retrasado - a.retrasado)
    || (a.retrasado ? b.transcurrido - a.transcurrido : (b.avance - a.avance) || (b.transcurrido - a.transcurrido));
const vigenteA = ahora => v => ahora - new Date(v.salidaAt).getTime() < EN_CAMINO_MIN * 60e3;

// Última lista recibida, para verla sin conexión (cada vehículo igual vence a la hora)
const leerCopia = clave => {
    // El desfase guardado no se reutiliza: copias anteriores pudieron guardar uno falso
    // (medido con una respuesta vieja de la caché) y congelar los cronómetros
    try { return { ...VACIO, ...JSON.parse(localStorage.getItem(clave)), desfase: 0 }; } catch { return VACIO; }
};

// Un reporte que todavía está en la cola, con la misma forma que los del servidor
const reporteEnCola = (r, garita) => ({
    _id: r._id, placa: r.placa, reporte: true, pendiente: true,
    origen: r.origen, destino: garita, salidaAt: r.reportadoAt,
    tiempos: [{ garita, min: r.esperadoMin }],
    vehiculo: Object.fromEntries(CAMPOS_REPORTE.filter(c => c !== 'placa').map(c => [c, r[c]])),
});

// Un reporte con los cambios que todavía están en la cola (o recién hechos)
const conEdicion = (v, c) => !c ? v : {
    ...v,
    placa: c.placa ?? v.placa,
    origen: c.origen ?? v.origen,
    destino: c.garita ?? v.destino,
    tiempos: c.esperadoMin !== undefined ? [{ garita: c.garita ?? v.destino, min: c.esperadoMin }] : v.tiempos,
    vehiculo: { ...v.vehiculo, ...Object.fromEntries(CAMPOS_REPORTE.filter(k => k !== 'placa' && c[k] !== undefined).map(k => [k, c[k]])) },
};
// Un reporte tal como lo devuelve el servidor, con la forma de la lista
const reporteDelServidor = r => ({
    _id: r._id, placa: r.placa, reporte: true,
    origen: r.origen, destino: r.garita, salidaAt: r.reportadoAt,
    tiempos: [{ garita: r.garita, min: r.esperadoMin }],
    vehiculo: Object.fromEntries(CAMPOS_REPORTE.filter(c => c !== 'placa').map(c => [c, r[c]])),
});

// Tiempos de un tránsito con otro total hasta el destino: las garitas de paso se
// ajustan en la misma proporción
const tiemposConTotal = (transito, total) => {
    const anterior = minutosHasta(transito, transito.destino);
    const tiempos = (transito.tiempos || []).map(t => t.garita === transito.destino ? { ...t, min: total }
        : { ...t, min: anterior > 0 && t.min != null ? Math.max(1, Math.round(t.min * total / anterior)) : t.min });
    return tiempos.some(t => t.garita === transito.destino) ? tiempos : [...tiempos, { garita: transito.destino, min: total }];
};

// Registrar la llegada: un INGRESO con TODOS los datos del vehículo (como en el
// formulario de nuevo movimiento) y la hora actual, por la misma cola que los
// demás movimientos: aparece al instante y se sube cuando haya conexión.
const registrarLlegada = async ({ v, placa, garita, bloque, puesto, fecha, ubiIngreso, agregarOptimista, confirmarMovimiento }) => {
    const tempId = crypto.randomUUID();
    const hora = getHoraLocal();
    const datos = v.vehiculo || {};
    const ingreso = {
        tipo: 'ingreso', placa,
        marca: datos.marca || '', color: datos.color || '', tipoVehiculo: datos.tipoVehiculo || '',
        empresa: datos.empresa || '', conductor: datos.conductor || '', cedula: datos.cedula || '',
        destino: datos.destino || ubiIngreso, actividad: datos.actividad || '', genero: datos.genero || 'm',
        ...(v.reporte ? { reporteDe: v._id } : { instanciadoDe: v._id }),
    };
    agregarOptimista({ ...ingreso, _id: tempId, hora, fecha, _pending: true });
    const payload = { ...ingreso, puesto, bloque, fecha, hora, clientUUID: tempId, ...(!v.reporte && { garitaLlegada: garita }) };
    await encolarMovimiento({ uuid: tempId, payload, hora, fecha });
    try {
        const r = await subirMovimientoPendiente(tempId);
        if (r?.movimiento) confirmarMovimiento(tempId, r.movimiento);
    } catch {
        // Ya está en la cola: se subirá cuando vuelva la conexión
    }
};

// Lo que muestra la ventana de detalle (la misma de Movimientos). Si el vehículo lo
// envié yo y tengo la SALIDA en este flujo, se usa ese movimiento tal cual (con sus
// acciones de tránsito); si no, se arma con lo que trae EN CAMINO.
const zona = { timeZone: 'America/Guayaquil' };
const movimientoDe = (v, garita, bloque, propios) => {
    const propio = propios.find(m => String(m._id) === v.id);
    if (propio) return { mov: propio, propio: true };
    const salida = new Date(v.salidaAt);
    return {
        propio: false,
        mov: {
            ...(v.vehiculo || {}),
            _id: v.id, placa: v.placa, bloque,
            tipo: v.reporte ? 'ingreso' : 'salida',
            reporte: !!v.reporte,
            hora: salida.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, ...zona }),
            fecha: salida.toLocaleDateString('en-CA', zona),
            transito: {
                origen: v.origen || '', destino: v.destino || garita,
                salidaAt: v.salidaAt, tiempos: v.tiempos || [], paradas: v.paradas || [], estado: 'en_camino',
            },
        },
    };
};
// Los toques dentro de la ventana no deben llegar al cajón (que los tomaría como arrastre)
const aislar = e => e.stopPropagation();

const IconoAtras = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
);
const IconoX = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const IconoDestino = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h14l-4-4M20 16H6l4 4" /></svg>
);
const IconoLapiz = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
const IconoMas = ({ tam = 20 }) => (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);

// ── Aviso: el vehículo deslizado no está en mis movimientos ──
const textoSinRegistro = (v, garita) => {
    if (v.reporte) return {
        titulo: 'Aún no está instanciado',
        detalle: `${v.placa} es un vehículo reportado hacia ${garita}${v.origen ? ` desde ${v.origen}` : ''}. Todavía no está en tus movimientos: cuando llegue, toca + en su fila para registrarlo.`,
    };
    if (v.origen !== garita) return {
        titulo: 'Aún no está registrado',
        detalle: `${v.placa} viene desde ${v.origen} y todavía no está en tus movimientos. Cuando llegue, toca + en su fila para instanciarlo.`,
    };
    return {
        titulo: 'No está en tu flujo actual',
        detalle: `La SALIDA de ${v.placa} hacia ${v.destino} se registró en otro turno de ${garita}, así que no está en tus movimientos de este flujo.`,
    };
};
// Al deslizar a la derecha un vehículo que no puedo cambiar
const textoSinAcciones = (v, garita) => v.origen !== garita ? {
    titulo: 'Solo lo cambia quien lo envió',
    detalle: `${v.placa} salió de ${v.origen}. Cancelar el tránsito, cambiar su destino o editarlo solo se puede desde ${v.origen}.`,
} : {
    titulo: 'No está en tu flujo actual',
    detalle: `La SALIDA de ${v.placa} se registró en otro turno de ${garita}: solo quien la registró puede cancelarla, cambiar su destino o editarla.`,
};
const AvisoVentana = ({ titulo, detalle, onCerrar }) => {
    return (
        <div className="modal__overlay" onClick={onCerrar}>
            <div className="modal__card modal__card--confirmar" role="alertdialog" aria-label={titulo} onClick={e => e.stopPropagation()}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="confirmar__icono">
                    <circle cx="12" cy="12" r="10" stroke="#ef9f27" strokeWidth="2" />
                    <path d="M12 8v4M12 16h.01" stroke="#ef9f27" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="confirmar__mensaje">{titulo}</p>
                <p className="confirmar__detalle">{detalle}</p>
                <div className="confirmar__botones">
                    <button className="confirmar__cancelar camino__entendido" autoFocus onClick={onCerrar}>Entendido</button>
                </div>
            </div>
        </div>
    );
};

// ── Botones que aparecen al deslizar una fila a la derecha ──
const AccionesFila = ({ esReporte, onCancelar, onDestino, onEditar }) => (
    <div className="camino__acciones">
        <button className="camino__act camino__act--peligro" title={esReporte ? 'Quitar reporte' : 'Cancelar tránsito'}
            aria-label={esReporte ? 'Quitar reporte' : 'Cancelar tránsito'} onClick={onCancelar}><IconoX /></button>
        <button className="camino__act" title="Cambiar destino" aria-label="Cambiar destino" onClick={onDestino}><IconoDestino /></button>
        <button className="camino__act" title={esReporte ? 'Editar reporte' : 'Editar tránsito'}
            aria-label={esReporte ? 'Editar reporte' : 'Editar tránsito'} onClick={onEditar}><IconoLapiz /></button>
    </div>
);

const Hoja = ({ titulo, onCerrar, children }) => (
    <div className="modal__overlay" onClick={onCerrar}>
        <div className="camino-hoja" role="dialog" aria-label={titulo} onClick={e => e.stopPropagation()}>
            <div className="camino-hoja__cab">
                <span className="camino-hoja__titulo">{titulo}</span>
                <button className="camino-hoja__cerrar" aria-label="Cerrar" onClick={onCerrar}><IconoX /></button>
            </div>
            {children}
        </div>
    </div>
);

// Elegir otra garita del bloque
const HojaDestino = ({ v, opciones, onElegir, onCerrar }) => (
    <Hoja titulo={`Cambiar destino · ${v.placa}`} onCerrar={onCerrar}>
        <p className="camino-hoja__texto">
            {v.reporte ? `Ahora viene hacia ${v.destino}. Si va a otra garita, el reporte pasa a EN CAMINO de esa garita.`
                : `Ahora va hacia ${v.destino}. El tiempo estimado se recalcula con Distancias.`}
        </p>
        <div className="camino-hoja__chips">
            {opciones.map(g => <button key={g} className="camino-hoja__chip" onClick={() => onElegir(g)}>{g}</button>)}
        </div>
    </Hoja>
);

// Confirmar antes de cancelar el tránsito o quitar el reporte
const HojaCancelar = ({ v, onConfirmar, onCerrar }) => (
    <div className="modal__overlay" onClick={onCerrar}>
        <div className="modal__card modal__card--confirmar" role="alertdialog" onClick={e => e.stopPropagation()}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="confirmar__icono">
                <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="confirmar__mensaje">{v.reporte ? '¿Quitar este reporte?' : '¿Cancelar tránsito?'}</p>
            <p className="confirmar__detalle">
                {v.reporte ? `${v.placa} dejará de aparecer en EN CAMINO.`
                    : `${v.placa} dejará de aparecer en EN CAMINO de ${v.destino}. La SALIDA se mantiene en tus movimientos.`}
            </p>
            <div className="confirmar__botones">
                <button className="confirmar__cancelar" onClick={onCerrar}>Volver</button>
                <button className="confirmar__eliminar" onClick={onConfirmar}>{v.reporte ? 'Quitar' : 'Cancelar tránsito'}</button>
            </div>
        </div>
    </div>
);

// Editar un tránsito que envié: extender el tiempo estimado o ir a sus datos
const HojaTiempo = ({ v, mov, onGuardar, onEditarDatos, onCerrar }) => {
    const actual = minutosHasta(mov.transito, mov.transito.destino);
    const [min, setMin] = useState(actual ? String(actual) : '');
    const valor = Number(min);
    const valido = Number.isFinite(valor) && valor > 0 && valor <= 600;
    const sumar = n => setMin(m => String(Math.max(0, Number(m) || actual || 0) + n));
    return (
        <Hoja titulo={`Editar tránsito · ${v.placa}`} onCerrar={onCerrar}>
            <p className="camino-hoja__texto">
                Hacia <strong>{mov.transito.destino}</strong> · salió a las {mov.hora} · lleva {cronometro(v.transcurrido)}
            </p>
            <label className="camino-hoja__etiqueta" htmlFor="camino-minutos">Tiempo estimado (minutos desde la salida)</label>
            <div className="camino-hoja__fila">
                <input id="camino-minutos" className="camino-hoja__input" inputMode="numeric" autoComplete="off"
                    value={min} placeholder="Sin estimado" onChange={e => setMin(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                {[5, 10, 15].map(n => <button key={n} className="camino-hoja__chip" onClick={() => sumar(n)}>+{n}</button>)}
            </div>
            <button className="camino-hoja__btn camino-hoja__btn--primario" disabled={!valido || valor === actual}
                onClick={() => onGuardar(Math.round(valor))}>Guardar tiempo</button>
            <button className="camino-hoja__btn" onClick={onEditarDatos}><IconoLapiz />Editar datos del vehículo</button>
        </Hoja>
    );
};

// ── Fila de un vehículo que viene ─────────────────────────
const FilaCamino = ({ v, garita, confirmando, placa, onPlaca, onAbrir, onCancelar, onRegistrar, onQuitar, onDetalle, dx = 0, vivo = false }) => {
    const clase = `camino__fila${v.retrasado ? ' camino__fila--retrasado' : ''}`;
    const ruta = (
        <>
            {/* Un reporte siempre viene hacia esta garita: basta con decir de dónde */}
            <span className="camino__ruta-texto">{v.reporte ? (v.origen ? `Desde ${v.origen}` : `Hacia ${garita}`) : rutaTexto(v)}</span>
            {v.dePaso && <span className="camino__de-paso">de paso</span>}
            {v.reporte && <span className="camino__de-paso camino__de-paso--reporte">reportado</span>}
        </>
    );
    if (confirmando) {
        const datos = [v.vehiculo?.conductor, v.vehiculo?.empresa].filter(Boolean).join(' · ');
        return (
            <div className={`${clase} camino__fila--confirmar`}>
                <div className="camino__confirmar-cab">
                    <span className="camino__confirmar-titulo">Confirma la placa al llegar</span>
                    <span className="camino__crono camino__crono--pildora">{cronometro(v.transcurrido)}</span>
                </div>
                <input className="camino__placa-input" value={placa} autoFocus
                    aria-label="Placa del vehículo" autoCapitalize="characters" spellCheck={false}
                    onChange={e => onPlaca(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter' && placa.trim()) onRegistrar(); }} />
                <div className="camino__ruta">{ruta}</div>
                {datos && <div className="camino__datos">{datos}</div>}
                <div className="camino__confirmar-botones">
                    <button className="camino__btn" onClick={onCancelar}>Cancelar</button>
                    <button className="camino__btn camino__btn--primario" disabled={!placa.trim()} onClick={onRegistrar}>Registrar</button>
                </div>
                {v.reporte && <button className="camino__quitar" onClick={onQuitar}>Quitar este reporte</button>}
            </div>
        );
    }
    return (
        <div className={`${clase} camino__fila--tocable${vivo ? ' camino__fila--deslizando' : ''}`} role="button" tabIndex={0}
            data-camino-id={v.id} style={dx ? { transform: `translateX(${dx}px)` } : undefined}
            aria-label={`Ver el detalle de ${v.placa}`} onClick={onDetalle}
            onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onDetalle(); } }}>
            {/* El fondo de la fila es la barra de progreso */}
            <div className="camino__relleno" style={{ width: `${v.avance * 100}%` }} />
            <span className="camino__crono">{cronometro(v.transcurrido)}</span>
            <div className="camino__info">
                <div className="camino__placa">
                    <span>{v.placa}</span>
                    {v.retrasado && <span className="camino__retraso">Retrasado</span>}
                </div>
                <div className="camino__ruta">{ruta}</div>
            </div>
            <button className="camino__mas" aria-label={`Registrar la llegada de ${v.placa}`} onClick={e => { e.stopPropagation(); onAbrir(); }}><IconoMas /></button>
        </div>
    );
};

// ── Fila de un vehículo enviado desde mi garita ───────────
const FilaEnviado = ({ v, onDetalle, dx = 0, vivo = false }) => (
    <div className={`camino__fila camino__fila--enviado camino__fila--tocable${v.retrasado ? ' camino__fila--retrasado' : ''}${vivo ? ' camino__fila--deslizando' : ''}`}
        data-camino-id={v.id} style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        role="button" tabIndex={0} aria-label={`Ver el detalle de ${v.placa}`} onClick={onDetalle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetalle(); } }}>
        <div className="camino__relleno" style={{ width: `${v.avance * 100}%` }} />
        <span className="camino__crono">{cronometro(v.transcurrido)}</span>
        <div className="camino__info">
            <div className="camino__placa">
                <span>{v.placa}</span>
                {v.retrasado && <span className="camino__retraso">Retrasado</span>}
            </div>
            <div className="camino__ruta"><span className="camino__ruta-texto">{rutaTexto(v)}</span></div>
        </div>
    </div>
);

// ── Barra lateral y cajón ─────────────────────────────────
export const EnCamino = ({ bloque, puesto, garita, fecha, ubiIngreso, movimientos, agregarOptimista, confirmarMovimiento, onReportar, onTransito, onCopy, onShare, onIrAMovimiento, onEditarReporte, onEditarMovimiento }) => {
    const claveCopia = `flujo_encamino_${bloque}_${garita}`;
    const [datos, setDatos] = useState(() => leerCopia(claveCopia));
    const [enCola, setEnCola] = useState({ reportes: [], quitados: [], ediciones: {} });   // aún sin subir
    // Reportes quitados en esta pantalla: no vuelven a aparecer aunque la lista del
    // servidor tarde en actualizarse después de subir el cambio
    const [quitadosAqui, setQuitadosAqui] = useState([]);
    const [recarga, setRecarga] = useState(0);
    const [ahora, setAhora] = useState(() => Date.now());
    const [abierto, setAbierto] = useState(false);
    const [arrastre, setArrastre] = useState(null);     // px mientras el dedo arrastra el cajón
    const [verTodos, setVerTodos] = useState(false);
    const [confirmando, setConfirmando] = useState(null); // { id, placa }
    const [detalleId, setDetalleId] = useState(null);     // vehículo con la ventana de detalle abierta
    const [filaArrastre, setFilaArrastre] = useState(null); // { id, dx } fila que sigue al dedo
    const [deslizadaId, setDeslizadaId] = useState(null);   // fila corrida a la derecha con sus botones
    const [hoja, setHoja] = useState(null);                 // { modo: 'destino' | 'cancelar' | 'tiempo', id }
    const [ventana, setVentana] = useState(null);           // aviso { titulo, detalle }
    const [aviso, setAviso] = useState('');
    const [anchoCajon, setAnchoCajon] = useState(340);  // se mide al empezar cada arrastre
    const cajonRef = useRef(null);
    const gestoRef = useRef(null);
    // Momento en que terminó el último arrastre (0 = ninguno): el clic que el navegador
    // dispara justo después no debe tocar un botón del cajón
    const trasArrastreRef = useRef(0);
    const datosRef = useRef(datos);
    useEffect(() => { datosRef.current = datos; }, [datos]);

    // Lista del servidor: al entrar, cada 30 s, al abrir el cajón, al volver la conexión
    // y cuando se sube un reporte
    useEffect(() => {
        let vigente = true;
        const cargar = async () => {
            try {
                const pedido = Date.now();
                const { data } = await api.get('/movimientos/en-camino', { params: { bloque, garita } });
                if (!vigente) return;
                const llegada = Date.now();
                const nuevo = {
                    lista: data.enCamino || [], enviados: data.enviados || [],
                    desfase: calcularDesfase(data.ahora, pedido, llegada, datosRef.current.desfase),
                };
                setDatos(nuevo);
                try { localStorage.setItem(claveCopia, JSON.stringify(nuevo)); } catch { /* sin espacio */ }
            } catch {
                // Sin conexión: se sigue mostrando la última lista
            }
        };
        cargar();
        const id = setInterval(cargar, CADA_CUANTO_MS);
        window.addEventListener('online', cargar);
        return () => { vigente = false; clearInterval(id); window.removeEventListener('online', cargar); };
    }, [bloque, garita, claveCopia, abierto, recarga]);

    // Reportes y "quitar reporte" que siguen en la cola (se ven al instante, también sin conexión)
    useEffect(() => {
        let vigente = true;
        const leer = async () => {
            const [reportes, quitados, editados] = await Promise.all([
                getOperacionesPendientes('reporte'), getOperacionesPendientes('reporteQuitar'), getOperacionesPendientes('reporteEditar'),
            ]).catch(() => [[], [], []]);
            if (!vigente) return;
            // Varias ediciones del mismo reporte: se aplican en orden
            const ediciones = {};
            editados.forEach(op => { const id = String(op.payload.id); ediciones[id] = { ...ediciones[id], ...op.payload }; });
            setEnCola({
                reportes: reportes.map(op => op.payload).filter(r => r.bloque === bloque && r.garita === garita),
                quitados: quitados.map(op => String(op.payload.id)),
                ediciones,
            });
        };
        leer();
        const onOperacion = e => {
            if (!['reporte', 'reporteQuitar', 'reporteEditar'].includes(e.detail?.tipo)) return;
            leer();
            // Edición subida: la lista toma el reporte del servidor enseguida (sin esperar
            // a pedirla de nuevo, así no se ve un instante con los datos de antes)
            const r = e.detail.tipo === 'reporteEditar' ? e.detail.data?.reporte : null;
            if (r) {
                setDatos(d => ({
                    ...d,
                    lista: r.garita !== garita || r.estado !== 'en_camino'
                        ? d.lista.filter(x => String(x._id) !== String(r._id))
                        : d.lista.map(x => String(x._id) === String(r._id) ? reporteDelServidor(r) : x),
                }));
            }
            if (e.detail.data) setRecarga(n => n + 1);   // se subió: pedir la lista otra vez
        };
        window.addEventListener('flujo:operaciones', onOperacion);
        return () => { vigente = false; window.removeEventListener('flujo:operaciones', onOperacion); };
    }, [bloque, garita]);

    // Cronómetros: cada segundo con el cajón abierto; cerrado basta para el punto ámbar
    useEffect(() => {
        const tic = () => setAhora(Date.now());
        const primero = setTimeout(tic, 0);   // al abrir, el tiempo se pone al día enseguida
        const id = setInterval(tic, abierto ? 1000 : 15000);
        return () => { clearTimeout(primero); clearInterval(id); };
    }, [abierto]);

    // Esc cierra; con el cajón abierto la página de atrás no se desplaza
    useEffect(() => {
        if (!abierto) return undefined;
        const onTecla = e => {
            if (e.key !== 'Escape') return;
            if (ventana) setVentana(null);
            else if (hoja) setHoja(null);
            else if (detalleId) setDetalleId(null);   // primero la ventana de detalle
            else setAbierto(false);
        };
        window.addEventListener('keydown', onTecla);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onTecla); document.body.style.overflow = overflow; };
    }, [abierto, detalleId, ventana, hoja]);

    useEffect(() => {
        if (!aviso) return undefined;
        const id = setTimeout(() => setAviso(''), 2600);
        return () => clearTimeout(id);
    }, [aviso]);

    const ahoraServidor = ahora + datos.desfase;
    const vigente = vigenteA(ahoraServidor);

    // Los que vienen: los del servidor y los reportes aún en la cola. Fuera: los que ya
    // registré (aunque sigan en la cola), los reportes quitados y los de hace más de 1 hora.
    const registradas = new Set(movimientos.flatMap(m => [m.instanciadoDe, m.reporteDe]).filter(Boolean).map(String));
    const quitados = new Set([...enCola.quitados, ...quitadosAqui]);
    const delServidor = new Set(datos.lista.map(v => String(v._id)));
    const lista = [...datos.lista, ...enCola.reportes.filter(r => !delServidor.has(String(r._id))).map(r => reporteEnCola(r, garita))]
        .map(v => v.reporte ? conEdicion(v, enCola.ediciones[String(v._id)]) : v)
        .filter(v => !registradas.has(String(v._id)) && !quitados.has(String(v._id)) && vigente(v) && (!v.reporte || v.destino === garita))
        .map(v => estadoDe(v, ahoraServidor, garita))
        .sort(ordenar);

    // Enviados desde mi garita: los del servidor y mis salidas (aunque no se hayan subido).
    // Lo que hice aquí manda: si cancelé o cambié el destino, se ve enseguida.
    const enviadosPorId = new Map(datos.enviados.map(v => [String(v._id), v]));
    movimientos.forEach(m => {
        if (m.tipo !== 'salida' || m.transito?.origen !== garita) return;
        if (m.transito.estado === 'en_camino') enviadosPorId.set(String(m._id), { _id: m._id, placa: m.placa, ...m.transito });
        else enviadosPorId.delete(String(m._id));
    });
    const enviados = [...enviadosPorId.values()].filter(vigente)
        .map(v => estadoDe(v, ahoraServidor, v.destino)).sort(ordenar);

    const hayRetrasados = lista.some(v => v.retrasado);
    const visibles = verTodos ? lista : lista.slice(0, MAX_FILAS);
    const ocultos = lista.length - MAX_FILAS;

    // Ventana de detalle: si el vehículo se fue de la lista (registrado, quitado o
    // vencido) la ventana se cierra sola
    const enOrden = [...visibles, ...enviados];
    const idxDetalle = abierto ? enOrden.findIndex(v => v.id === detalleId) : -1;
    const detalle = idxDetalle >= 0 ? movimientoDe(enOrden[idxDetalle], garita, bloque, movimientos) : null;

    // ── Arrastre (dedo o mouse) ──
    // Desde la barra con el cajón cerrado se arrastra a la derecha; con el cajón
    // abierto, a la izquierda desde cualquier parte. Un toque en la barra lo abre o cierra.
    const empezar = (e, esBarra) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        trasArrastreRef.current = 0;   // un toque nuevo: el arrastre anterior ya no cuenta
        setAnchoCajon(cajonRef.current?.offsetWidth || 340);
        // Sobre una fila (no en sus botones ni con la placa a medio confirmar), deslizar a la
        // izquierda lleva a su movimiento en vez de cerrar el cajón
        const fila = !esBarra && abierto && !e.target.closest('button, input') ? e.target.closest('[data-camino-id]')?.dataset.caminoId : null;
        gestoRef.current = { x0: e.clientX, y0: e.clientY, esBarra, desdeAbierto: abierto, activo: false, vertical: false, id: e.pointerId, el: e.currentTarget, fila };
    };
    const mover = e => {
        const g = gestoRef.current;
        if (!g || g.id !== e.pointerId) return;
        const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
        if (!g.activo && !g.vertical) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
            if (Math.abs(dy) > Math.abs(dx)) { g.vertical = true; return; }
            if (!g.desdeAbierto && !g.esBarra) { g.vertical = true; return; }
            g.activo = true;
            try { g.el.setPointerCapture(g.id); } catch { /* el puntero ya se soltó */ }
        }
        if (!g.activo) return;
        if (g.fila) {
            // Con los botones a la vista solo se puede volver a cerrar
            const abiertaYa = deslizadaId === g.fila;
            setFilaArrastre({ id: g.fila, dx: abiertaYa ? Math.max(0, Math.min(ANCHO_ACCIONES, ANCHO_ACCIONES + dx)) : Math.max(-90, Math.min(ANCHO_ACCIONES, dx)) });
        }
        else setArrastre(g.desdeAbierto ? Math.min(0, dx) : Math.max(0, dx));
    };
    const soltar = e => {
        const g = gestoRef.current;
        gestoRef.current = null;
        if (!g || g.id !== e.pointerId) return;
        if (!g.activo) {
            if (g.esBarra && !g.vertical) setAbierto(a => !a);
            return;
        }
        trasArrastreRef.current = e.timeStamp || 1;
        const dx = e.clientX - g.x0;
        setArrastre(null);
        if (g.fila) {
            setFilaArrastre(null);
            if (deslizadaId === g.fila) { if (dx < -30) setDeslizadaId(null); return; }
            if (dx < -UMBRAL_IR) irAlMovimiento(g.fila);
            else if (dx > UMBRAL_IR) mostrarAcciones(g.fila);
            return;
        }
        if (g.desdeAbierto) { if (dx < -UMBRAL_ARRASTRE) setAbierto(false); }
        else if (dx > UMBRAL_ARRASTRE) setAbierto(true);
    };
    const cancelarGesto = () => { gestoRef.current = null; setArrastre(null); setFilaArrastre(null); };
    // Cajón y fondo: solo con el cajón abierto (para cerrarlo)
    const gestosCajon = abierto ? {
        onPointerDown: e => empezar(e, false),
        onPointerMove: mover,
        onPointerUp: soltar,
        onPointerCancel: cancelarGesto,
    } : {};
    // La barra está dentro del cajón: sus eventos no deben llegar también al cajón
    const gestosBarra = {
        // La barra es angosta: se captura el puntero de inmediato para no perderlo al arrastrar
        onPointerDown: e => {
            e.stopPropagation();
            empezar(e, true);
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
        },
        onPointerMove: e => { e.stopPropagation(); mover(e); },
        onPointerUp: e => { e.stopPropagation(); soltar(e); },
        onPointerCancel: e => { e.stopPropagation(); cancelarGesto(); },
    };
    // Un arrastre no debe terminar en un clic sobre un botón del cajón
    const filtrarClic = e => {
        // En el móvil, tras arrastrar con el dedo a veces no llega ningún clic: la marca
        // vale solo un instante, para no tragarse el siguiente toque de verdad
        const fin = trasArrastreRef.current;
        trasArrastreRef.current = 0;
        if (!fin || e.timeStamp - fin > 400) return;
        e.stopPropagation();
        e.preventDefault();
    };

    // Mientras se arrastra, el cajón sigue al dedo (0 = abierto, -ancho = cerrado);
    // en reposo lo coloca el CSS
    const ancho = anchoCajon;
    const desplazamiento = arrastre == null ? null
        : Math.max(-ancho, Math.min(0, (abierto ? 0 : -ancho) + arrastre));
    const fraccion = desplazamiento == null ? (abierto ? 1 : 0) : 1 + desplazamiento / ancho;   // 0 cerrado … 1 abierto

    const registrar = () => {
        const v = lista.find(x => x.id === confirmando.id);
        const placa = confirmando.placa.trim().toUpperCase();
        if (!v || !placa) return;
        setConfirmando(null);
        setAviso(`${placa} registrado como INGRESO`);
        registrarLlegada({ v, placa, garita, bloque, puesto, fecha, ubiIngreso, agregarOptimista, confirmarMovimiento });
    };
    // Deslizar a la izquierda una fila: si el movimiento está en mis movimientos (una
    // SALIDA que envié), se cierra el cajón y se va a él resaltado; si no, se avisa
    const irAlMovimiento = id => {
        setDeslizadaId(null);
        const propio = movimientos.find(m => String(m._id) === id);
        if (propio) {
            setAbierto(false);
            onIrAMovimiento?.(propio._id);
            return;
        }
        const v = [...lista, ...enviados].find(x => x.id === id);
        if (v) setVentana(textoSinRegistro(v, garita));
    };

    // Qué se puede hacer con un vehículo: mis reportes y mis salidas de este flujo
    const accionesDe = v => {
        if (v.reporte) return { tipo: 'reporte' };
        const mov = movimientos.find(m => String(m._id) === v.id && m.tipo === 'salida' && m.transito?.origen === garita);
        return mov ? { tipo: 'enviado', mov } : null;
    };
    // Deslizar a la derecha: muestra los botones, o avisa si ese vehículo no es mío
    const mostrarAcciones = id => {
        const v = [...lista, ...enviados].find(x => x.id === id);
        if (!v) return;
        if (accionesDe(v)) setDeslizadaId(id);
        else setVentana(textoSinAcciones(v, garita));
    };
    const usarAccion = (v, modo) => {
        setDeslizadaId(null);
        const acc = accionesDe(v);
        if (!acc) return;
        if (acc.tipo === 'enviado' && acc.mov._pending) {
            setAviso('Podrás cambiarlo cuando la SALIDA se suba al servidor');
            return;
        }
        if (modo === 'editar' && acc.tipo === 'reporte') { onEditarReporte?.(v); return; }
        setHoja({ modo: modo === 'editar' ? 'tiempo' : modo, id: v.id });
    };
    const hojaV = hoja ? [...lista, ...enviados].find(x => x.id === hoja.id) : null;
    const hojaAcc = hojaV ? accionesDe(hojaV) : null;
    const opcionesDestino = v => garitasDelBloque(bloque).filter(g => g !== v.destino && (v.reporte ? g !== garitaDeLugar(bloque, v.origen) : g !== garita));

    const cambiarDestino = async (v, acc, destino) => {
        setHoja(null);
        const tramos = await leerTramosLocales().catch(() => []);
        if (acc.tipo === 'enviado') {
            const nuevo = armarTransito({ tramos, bloque, origen: garita, destino, salidaAt: acc.mov.transito.salidaAt });
            if (!nuevo) { setAviso('No se pudo calcular la ruta a ese destino'); return; }
            await onTransito(acc.mov, 'destino', { destino: nuevo.destino, tiempos: nuevo.tiempos });
        } else {
            // El tiempo se recalcula si viene de una garita y hay ruta en Distancias
            const desde = garitaDeLugar(bloque, v.origen);
            const min = desde && desde !== destino ? minutosHasta(armarTransito({ tramos, bloque, origen: desde, destino }), destino) : null;
            await editarReporte({ id: v.id, pendiente: !!v.pendiente, cambios: { garita: destino, ...(min > 0 && { esperadoMin: min }) } });
        }
        setAviso(`${v.placa} ahora va hacia ${destino}`);
    };
    const cancelarVehiculo = async (v, acc) => {
        setHoja(null);
        if (acc.tipo === 'reporte') { quitar(v); return; }
        await onTransito(acc.mov, 'cancelar');
        setAviso(`Tránsito de ${v.placa} cancelado`);
    };
    const guardarTiempo = async (v, acc, total) => {
        setHoja(null);
        // Se mantienen las paradas (varios destinos)
        await onTransito(acc.mov, 'destino', { destino: acc.mov.transito.destino, tiempos: tiemposConTotal(acc.mov.transito, total), paradas: acc.mov.transito.paradas });
        setAviso(`${v.placa}: ${total} min estimados hasta ${acc.mov.transito.destino}`);
    };
    // Corrimiento de una fila: el del dedo mientras arrastra; si no, abierta o cerrada
    const corrimiento = id => filaArrastre?.id === id ? filaArrastre.dx : deslizadaId === id ? ANCHO_ACCIONES : 0;
    // Un toque en una fila corrida la cierra; si no, abre el detalle
    const tocarFila = id => { if (deslizadaId) setDeslizadaId(null); else setDetalleId(id); };
    const quitar = v => {
        setConfirmando(null);
        setQuitadosAqui(q => [...q, v.id]);   // se va de la lista enseguida
        setAviso(`Reporte de ${v.placa} quitado`);
        quitarReporte({ id: v.id, pendiente: !!v.pendiente });
    };

    return (
        <div className="camino" onClickCapture={filtrarClic}>
            <div className={`camino__velo${desplazamiento != null ? ' camino__velo--arrastre' : ''}`}
                style={{ opacity: fraccion, pointerEvents: abierto ? 'auto' : 'none' }}
                onClick={() => setAbierto(false)} {...gestosCajon} />

            <aside ref={cajonRef}
                className={`camino__cajon${abierto ? ' camino__cajon--abierto' : ''}${desplazamiento != null ? ' camino__cajon--arrastre' : ''}`}
                style={desplazamiento != null ? { transform: `translateX(${desplazamiento}px)` } : undefined}
                aria-label="Vehículos en camino"
                {...gestosCajon}>
                {/* Cerrado, el contenido no recibe foco ni toques; la barra sí */}
                <div className="camino__contenido" inert={!abierto && desplazamiento == null}>
                    <header className="camino__cab">
                        <div>
                            <div className="camino__titulo">En camino · <span className="camino__total">{lista.length}</span></div>
                            <div className="camino__subtitulo">Hacia {garita} · tiempo en vivo</div>
                        </div>
                        <button className="camino__cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}><IconoAtras /></button>
                    </header>

                    <div className="camino__lista">
                        {lista.length === 0 && (
                            <div className="camino__vacio">Ningún vehículo viene hacia {garita} por ahora.</div>
                        )}
                        {visibles.map(v => (
                            <div key={v.id} className="camino__caja">
                                {corrimiento(v.id) > 0 && (
                                    <AccionesFila esReporte={!!v.reporte}
                                        onCancelar={() => usarAccion(v, 'cancelar')}
                                        onDestino={() => usarAccion(v, 'destino')}
                                        onEditar={() => usarAccion(v, 'editar')} />
                                )}
                                <FilaCamino v={v} garita={garita}
                                    confirmando={confirmando?.id === v.id}
                                    placa={confirmando?.id === v.id ? confirmando.placa : ''}
                                    onPlaca={p => setConfirmando(c => ({ ...c, placa: p }))}
                                    onAbrir={() => { setDeslizadaId(null); setConfirmando({ id: v.id, placa: v.placa }); }}
                                    onCancelar={() => setConfirmando(null)}
                                    onRegistrar={registrar}
                                    onQuitar={() => quitar(v)}
                                    onDetalle={() => tocarFila(v.id)}
                                    dx={corrimiento(v.id)} vivo={filaArrastre?.id === v.id} />
                            </div>
                        ))}
                        {ocultos > 0 && (
                            <button className="camino__ver-mas" onClick={() => setVerTodos(t => !t)}>
                                {verTodos ? 'Ver menos' : `Ver ${ocultos} más`}
                            </button>
                        )}
                        <button className="camino__reportar" onClick={onReportar}>
                            <IconoMas tam={18} />Reportar un vehículo que viene
                        </button>

                        {enviados.length > 0 && (
                            <>
                                <div className="camino__seccion">Enviados desde {garita} · <span className="camino__total">{enviados.length}</span></div>
                                {enviados.map(v => (
                                    <div key={v.id} className="camino__caja">
                                        {corrimiento(v.id) > 0 && (
                                            <AccionesFila esReporte={false}
                                                onCancelar={() => usarAccion(v, 'cancelar')}
                                                onDestino={() => usarAccion(v, 'destino')}
                                                onEditar={() => usarAccion(v, 'editar')} />
                                        )}
                                        <FilaEnviado v={v} onDetalle={() => tocarFila(v.id)}
                                            dx={corrimiento(v.id)} vivo={filaArrastre?.id === v.id} />
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    <div className="camino__pie">Desliza a la izquierda para cerrar</div>
                    <div className={`camino__aviso${aviso ? ' camino__aviso--visible' : ''}`} aria-live="polite">{aviso}</div>
                </div>

                {/* La barra va pegada al borde del cajón: lo abre y lo cierra. Siempre está,
                    aunque no venga nadie, para poder reportar o ver lo enviado. */}
                <button className={`camino__barra${lista.length ? '' : ' camino__barra--vacia'}`}
                    aria-label={abierto ? 'Cerrar EN CAMINO' : `Abrir EN CAMINO: ${lista.length} ${lista.length === 1 ? 'vehículo' : 'vehículos'}`}
                    aria-expanded={abierto} tabIndex={0} {...gestosBarra}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbierto(a => !a); } }}>
                    <span className="camino__barra-linea" />
                    {hayRetrasados && <span className="camino__barra-punto" />}
                </button>
            </aside>

            {ventana && createPortal(
                <div onPointerDown={aislar} onPointerMove={aislar} onPointerUp={aislar} onPointerCancel={aislar} onClick={aislar}>
                    <AvisoVentana {...ventana} onCerrar={() => setVentana(null)} />
                </div>,
                document.body,
            )}

            {hojaV && hojaAcc && createPortal(
                <div onPointerDown={aislar} onPointerMove={aislar} onPointerUp={aislar} onPointerCancel={aislar} onClick={aislar}>
                    {hoja.modo === 'destino' && (
                        <HojaDestino v={hojaV} opciones={opcionesDestino(hojaV)}
                            onElegir={g => cambiarDestino(hojaV, hojaAcc, g)} onCerrar={() => setHoja(null)} />
                    )}
                    {hoja.modo === 'cancelar' && (
                        <HojaCancelar v={hojaV} onConfirmar={() => cancelarVehiculo(hojaV, hojaAcc)} onCerrar={() => setHoja(null)} />
                    )}
                    {hoja.modo === 'tiempo' && hojaAcc.tipo === 'enviado' && (
                        <HojaTiempo v={hojaV} mov={hojaAcc.mov}
                            onGuardar={min => guardarTiempo(hojaV, hojaAcc, min)}
                            onEditarDatos={() => { setHoja(null); onEditarMovimiento?.(hojaAcc.mov); }}
                            onCerrar={() => setHoja(null)} />
                    )}
                </div>,
                document.body,
            )}

            {detalle && createPortal(
                <div onPointerDown={aislar} onPointerMove={aislar} onPointerUp={aislar} onPointerCancel={aislar} onClick={aislar}>
                    <ModalDetalle mov={detalle.mov}
                        onClose={() => setDetalleId(null)}
                        onCopy={onCopy} onShare={onShare}
                        // Cambiar destino o cancelar: solo en mis propias salidas
                        onTransito={detalle.propio ? onTransito : undefined}
                        hasPrev={idxDetalle > 0} hasNext={idxDetalle < enOrden.length - 1}
                        onPrev={() => setDetalleId(enOrden[idxDetalle - 1].id)}
                        onNext={() => setDetalleId(enOrden[idxDetalle + 1].id)}
                        counter={`${idxDetalle + 1} / ${enOrden.length}`} />
                </div>,
                document.body,
            )}
        </div>
    );
};
