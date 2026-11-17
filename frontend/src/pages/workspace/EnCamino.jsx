import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import { encolarMovimiento, getOperacionesPendientes, subirMovimientoPendiente } from '../../lib/syncEngine.js';
import { EN_CAMINO_MIN, cronometro, minutosHasta } from '../../lib/garitas.js';
import { CAMPOS_REPORTE, quitarReporte } from '../../lib/reportesEnCamino.js';
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
        dePaso: !v.reporte && v.destino !== meta,
    };
};
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
                salidaAt: v.salidaAt, tiempos: v.tiempos || [], estado: 'en_camino',
            },
        },
    };
};
// Los toques dentro de la ventana no deben llegar al cajón (que los tomaría como arrastre)
const aislar = e => e.stopPropagation();

const IconoAtras = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
);
const IconoMas = ({ tam = 20 }) => (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);

// ── Fila de un vehículo que viene ─────────────────────────
const FilaCamino = ({ v, garita, confirmando, placa, onPlaca, onAbrir, onCancelar, onRegistrar, onQuitar, onDetalle }) => {
    const clase = `camino__fila${v.retrasado ? ' camino__fila--retrasado' : ''}`;
    const ruta = (
        <>
            {/* Un reporte siempre viene hacia esta garita: basta con decir de dónde */}
            <span className="camino__ruta-texto">{v.reporte ? (v.origen ? `Desde ${v.origen}` : `Hacia ${garita}`) : `${v.origen} → ${v.destino}`}</span>
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
        <div className={`${clase} camino__fila--tocable`} role="button" tabIndex={0}
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
const FilaEnviado = ({ v, onDetalle }) => (
    <div className={`camino__fila camino__fila--enviado camino__fila--tocable${v.retrasado ? ' camino__fila--retrasado' : ''}`}
        role="button" tabIndex={0} aria-label={`Ver el detalle de ${v.placa}`} onClick={onDetalle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetalle(); } }}>
        <div className="camino__relleno" style={{ width: `${v.avance * 100}%` }} />
        <span className="camino__crono">{cronometro(v.transcurrido)}</span>
        <div className="camino__info">
            <div className="camino__placa">
                <span>{v.placa}</span>
                {v.retrasado && <span className="camino__retraso">Retrasado</span>}
            </div>
            <div className="camino__ruta"><span className="camino__ruta-texto">{v.origen} → {v.destino}</span></div>
        </div>
    </div>
);

// ── Barra lateral y cajón ─────────────────────────────────
export const EnCamino = ({ bloque, puesto, garita, fecha, ubiIngreso, movimientos, agregarOptimista, confirmarMovimiento, onReportar, onTransito, onCopy, onShare }) => {
    const claveCopia = `flujo_encamino_${bloque}_${garita}`;
    const [datos, setDatos] = useState(() => leerCopia(claveCopia));
    const [enCola, setEnCola] = useState({ reportes: [], quitados: [] });   // reportes aún sin subir
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
    const [aviso, setAviso] = useState('');
    const [anchoCajon, setAnchoCajon] = useState(340);  // se mide al empezar cada arrastre
    const cajonRef = useRef(null);
    const gestoRef = useRef(null);
    const trasArrastreRef = useRef(false);
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
            const [reportes, quitados] = await Promise.all([
                getOperacionesPendientes('reporte'), getOperacionesPendientes('reporteQuitar'),
            ]).catch(() => [[], []]);
            if (!vigente) return;
            setEnCola({
                reportes: reportes.map(op => op.payload).filter(r => r.bloque === bloque && r.garita === garita),
                quitados: quitados.map(op => String(op.payload.id)),
            });
        };
        leer();
        const onOperacion = e => {
            if (!['reporte', 'reporteQuitar'].includes(e.detail?.tipo)) return;
            leer();
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
            if (detalleId) setDetalleId(null);   // primero la ventana de detalle
            else setAbierto(false);
        };
        window.addEventListener('keydown', onTecla);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onTecla); document.body.style.overflow = overflow; };
    }, [abierto, detalleId]);

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
        .filter(v => !registradas.has(String(v._id)) && !quitados.has(String(v._id)) && vigente(v))
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
        setAnchoCajon(cajonRef.current?.offsetWidth || 340);
        gestoRef.current = { x0: e.clientX, y0: e.clientY, esBarra, desdeAbierto: abierto, activo: false, vertical: false, id: e.pointerId, el: e.currentTarget };
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
        if (g.activo) setArrastre(g.desdeAbierto ? Math.min(0, dx) : Math.max(0, dx));
    };
    const soltar = e => {
        const g = gestoRef.current;
        gestoRef.current = null;
        if (!g || g.id !== e.pointerId) return;
        if (!g.activo) {
            if (g.esBarra && !g.vertical) setAbierto(a => !a);
            return;
        }
        trasArrastreRef.current = true;
        const dx = e.clientX - g.x0;
        setArrastre(null);
        if (g.desdeAbierto) { if (dx < -UMBRAL_ARRASTRE) setAbierto(false); }
        else if (dx > UMBRAL_ARRASTRE) setAbierto(true);
    };
    const cancelarGesto = () => { gestoRef.current = null; setArrastre(null); };
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
        if (!trasArrastreRef.current) return;
        trasArrastreRef.current = false;
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
                            <FilaCamino key={v.id} v={v} garita={garita}
                                confirmando={confirmando?.id === v.id}
                                placa={confirmando?.id === v.id ? confirmando.placa : ''}
                                onPlaca={p => setConfirmando(c => ({ ...c, placa: p }))}
                                onAbrir={() => setConfirmando({ id: v.id, placa: v.placa })}
                                onCancelar={() => setConfirmando(null)}
                                onRegistrar={registrar}
                                onQuitar={() => quitar(v)}
                                onDetalle={() => setDetalleId(v.id)} />
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
                                {enviados.map(v => <FilaEnviado key={v.id} v={v} onDetalle={() => setDetalleId(v.id)} />)}
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
