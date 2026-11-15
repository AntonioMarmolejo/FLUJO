import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { encolarMovimiento, subirMovimientoPendiente } from '../../lib/syncEngine.js';
import { EN_CAMINO_MIN, cronometro, minutosHasta } from '../../lib/garitas.js';
import { getHoraLocal } from './helpers';
import '../../styles/EnCamino.css';

// EN CAMINO: vehículos que salieron de otra garita del bloque y vienen hacia la
// mía (o pasan por ella), con cronómetro en vivo. Barra en el borde izquierdo de
// Inicio (a la altura del +) que se arrastra para abrir el cajón.
// Las salidas las registra cualquier guardia del bloque; aquí se ven solo placa,
// ruta y hora, durante EN_CAMINO_MIN minutos como máximo.

const MAX_FILAS = 3;
const UMBRAL_ARRASTRE = 50;      // px para abrir o cerrar al soltar
const CADA_CUANTO_MS = 30000;    // consulta al servidor

// Progreso de cada vehículo: tiempo transcurrido ÷ minutos esperados hasta MI garita
const estadoDe = (v, ahora, garita) => {
    const transcurrido = (ahora - new Date(v.salidaAt).getTime()) / 1000;
    const min = minutosHasta(v, garita);
    const esperado = min > 0 ? min * 60 : null;     // sin ruta en Distancias no hay progreso
    return {
        ...v,
        id: v._id,
        transcurrido,
        retrasado: esperado != null && transcurrido > esperado,
        avance: esperado ? Math.min(1, transcurrido / esperado) : 0,
        dePaso: v.destino !== garita,
    };
};
// Los retrasados primero (el que más lleva arriba); luego los que están por llegar
const ordenar = (a, b) => (b.retrasado - a.retrasado)
    || (a.retrasado ? b.transcurrido - a.transcurrido : (b.avance - a.avance) || (b.transcurrido - a.transcurrido));

// Última lista recibida, para verla sin conexión (cada vehículo igual vence a la hora)
const leerCopia = clave => {
    try { return JSON.parse(localStorage.getItem(clave)) || null; } catch { return null; }
};

// Registrar la llegada: un INGRESO por la misma cola que los demás movimientos
// (aparece al instante y se sube cuando haya conexión). El servidor completa
// conductor, empresa y demás datos con los de la SALIDA.
const registrarLlegada = async ({ salida, placa, garita, bloque, puesto, fecha, ubiIngreso, agregarOptimista, confirmarMovimiento }) => {
    const tempId = crypto.randomUUID();
    const hora = getHoraLocal();
    const ingreso = { tipo: 'ingreso', placa, destino: ubiIngreso, actividad: '', instanciadoDe: salida._id };
    agregarOptimista({ ...ingreso, _id: tempId, hora, fecha, _pending: true });
    const payload = { ...ingreso, puesto, bloque, fecha, hora, clientUUID: tempId, garitaLlegada: garita };
    await encolarMovimiento({ uuid: tempId, payload, hora, fecha });
    try {
        const r = await subirMovimientoPendiente(tempId);
        if (r?.movimiento) confirmarMovimiento(tempId, r.movimiento);
    } catch {
        // Ya está en la cola: se subirá cuando vuelva la conexión
    }
};

const IconoAtras = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
);
const IconoMas = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);

// ── Fila de un vehículo ───────────────────────────────────
const FilaCamino = ({ v, confirmando, placa, onPlaca, onAbrir, onCancelar, onRegistrar }) => {
    const clase = `camino__fila${v.retrasado ? ' camino__fila--retrasado' : ''}`;
    const ruta = <span className="camino__ruta-texto">{v.origen} → {v.destino}</span>;
    if (confirmando) {
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
                <div className="camino__ruta">{ruta}{v.dePaso && <span className="camino__de-paso">de paso</span>}</div>
                <div className="camino__confirmar-botones">
                    <button className="camino__btn" onClick={onCancelar}>Cancelar</button>
                    <button className="camino__btn camino__btn--primario" disabled={!placa.trim()} onClick={onRegistrar}>Registrar</button>
                </div>
            </div>
        );
    }
    return (
        <div className={clase}>
            {/* El fondo de la fila es la barra de progreso */}
            <div className="camino__relleno" style={{ width: `${v.avance * 100}%` }} />
            <span className="camino__crono">{cronometro(v.transcurrido)}</span>
            <div className="camino__info">
                <div className="camino__placa">
                    <span>{v.placa}</span>
                    {v.retrasado && <span className="camino__retraso">Retrasado</span>}
                </div>
                <div className="camino__ruta">{ruta}{v.dePaso && <span className="camino__de-paso">de paso</span>}</div>
            </div>
            <button className="camino__mas" aria-label={`Registrar la llegada de ${v.placa}`} onClick={onAbrir}><IconoMas /></button>
        </div>
    );
};

// ── Barra lateral y cajón ─────────────────────────────────
export const EnCamino = ({ bloque, puesto, garita, fecha, ubiIngreso, movimientos, agregarOptimista, confirmarMovimiento }) => {
    const claveCopia = `flujo_encamino_${bloque}_${garita}`;
    const [datos, setDatos] = useState(() => leerCopia(claveCopia) || { lista: [], desfase: 0 });
    const [ahora, setAhora] = useState(() => Date.now());
    const [abierto, setAbierto] = useState(false);
    const [arrastre, setArrastre] = useState(null);     // px mientras el dedo arrastra el cajón
    const [verTodos, setVerTodos] = useState(false);
    const [confirmando, setConfirmando] = useState(null); // { id, placa }
    const [aviso, setAviso] = useState('');
    const [anchoCajon, setAnchoCajon] = useState(340);  // se mide al empezar cada arrastre
    const cajonRef = useRef(null);
    const gestoRef = useRef(null);
    const trasArrastreRef = useRef(false);

    // Lo que viene hacia mi garita: al entrar, cada 30 s, al abrir el cajón y al volver la conexión
    useEffect(() => {
        let vigente = true;
        const cargar = async () => {
            try {
                const { data } = await api.get('/movimientos/en-camino', { params: { bloque, garita } });
                if (!vigente) return;
                // desfase: diferencia entre el reloj del servidor y el del dispositivo
                const nuevo = { lista: data.enCamino || [], desfase: (data.ahora || Date.now()) - Date.now() };
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
    }, [bloque, garita, claveCopia, abierto]);

    // Cronómetros: cada segundo con el cajón abierto; cerrado basta para el punto ámbar
    useEffect(() => {
        if (!datos.lista.length) return undefined;
        const tic = () => setAhora(Date.now());
        const primero = setTimeout(tic, 0);   // al abrir, el tiempo se pone al día enseguida
        const id = setInterval(tic, abierto ? 1000 : 15000);
        return () => { clearTimeout(primero); clearInterval(id); };
    }, [abierto, datos.lista.length]);

    // Esc cierra; con el cajón abierto la página de atrás no se desplaza
    useEffect(() => {
        if (!abierto) return undefined;
        const onTecla = e => { if (e.key === 'Escape') setAbierto(false); };
        window.addEventListener('keydown', onTecla);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onTecla); document.body.style.overflow = overflow; };
    }, [abierto]);

    useEffect(() => {
        if (!aviso) return undefined;
        const id = setTimeout(() => setAviso(''), 2600);
        return () => clearTimeout(id);
    }, [aviso]);

    // Fuera: las que ya registré (aunque sigan en la cola sin subir) y las de hace más de 1 hora
    const registradas = new Set(movimientos.filter(m => m.instanciadoDe).map(m => String(m.instanciadoDe)));
    const ahoraServidor = ahora + datos.desfase;
    const lista = datos.lista
        .filter(v => !registradas.has(String(v._id)) && ahoraServidor - new Date(v.salidaAt).getTime() < EN_CAMINO_MIN * 60e3)
        .map(v => estadoDe(v, ahoraServidor, garita))
        .sort(ordenar);
    const hayRetrasados = lista.some(v => v.retrasado);
    const visibles = verTodos ? lista : lista.slice(0, MAX_FILAS);
    const ocultos = lista.length - MAX_FILAS;

    // Sin vehículos en camino no hay barra ni cajón
    if (!lista.length) return null;

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
        const salida = lista.find(x => x.id === confirmando.id);
        const placa = confirmando.placa.trim().toUpperCase();
        if (!salida || !placa) return;
        setConfirmando(null);
        setAviso(`${placa} registrado como INGRESO`);
        if (lista.length === 1) setAbierto(false);
        registrarLlegada({ salida, placa, garita, bloque, puesto, fecha, ubiIngreso, agregarOptimista, confirmarMovimiento });
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
                    {visibles.map(v => (
                        <FilaCamino key={v.id} v={v}
                            confirmando={confirmando?.id === v.id}
                            placa={confirmando?.id === v.id ? confirmando.placa : ''}
                            onPlaca={p => setConfirmando(c => ({ ...c, placa: p }))}
                            onAbrir={() => setConfirmando({ id: v.id, placa: v.placa })}
                            onCancelar={() => setConfirmando(null)}
                            onRegistrar={registrar} />
                    ))}
                    {ocultos > 0 && (
                        <button className="camino__ver-mas" onClick={() => setVerTodos(t => !t)}>
                            {verTodos ? 'Ver menos' : `Ver ${ocultos} más`}
                        </button>
                    )}
                </div>

                <div className="camino__pie">Desliza a la izquierda para cerrar</div>
                <div className={`camino__aviso${aviso ? ' camino__aviso--visible' : ''}`} aria-live="polite">{aviso}</div>
                </div>

                {/* La barra va pegada al borde del cajón: lo abre y lo cierra */}
                <button className="camino__barra" aria-label={abierto ? 'Cerrar EN CAMINO' : `Abrir EN CAMINO: ${lista.length} vehículos`}
                    aria-expanded={abierto} tabIndex={0} {...gestosBarra}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbierto(a => !a); } }}>
                    <span className="camino__barra-linea" />
                    {hayRetrasados && <span className="camino__barra-punto" />}
                </button>
            </aside>
        </div>
    );
};
