import { useEffect, useRef, useState } from 'react';
import '../../styles/EnCamino.css';

// EN CAMINO: vehículos que salieron de otra garita y vienen hacia la mía, con
// cronómetro en vivo. Barra en el borde izquierdo de Inicio (a la altura del +)
// que se arrastra para abrir el cajón.
//
// Paso 1 del plan: solo pantalla, con 5 vehículos de prueba. Se ven en desarrollo
// (npm run dev) o, en la app publicada, con localStorage flujo_encamino_prueba = '1'.
// Los datos reales (salidas de otros guardias del bloque) llegan en el paso 4.

const MAX_FILAS = 3;
const UMBRAL_ARRASTRE = 50;   // px para abrir o cerrar al soltar

const GARITA_PRUEBA = 'PAD-E';
const verPrueba = () => {
    if (import.meta.env.DEV) return true;
    try { return localStorage.getItem('flujo_encamino_prueba') === '1'; } catch { return false; }
};
const crearPrueba = () => {
    const ahora = Date.now();
    const v = (id, placa, origen, destino, esperadoMin, transcurridoSeg) =>
        ({ id, placa, origen, destino, esperadoMin, salidaAt: ahora - transcurridoSeg * 1000 });
    return [
        v('p1', 'GBA-0917', 'G. Principal', 'PAD-E', 20, 11 * 60 + 42),
        v('p2', 'PCX-4821', 'G. Principal', 'Campamento', 25, 4 * 60 + 5),
        v('p3', 'MBA-1156', 'PAD-N', 'PAD-E', 18, 25 * 60 + 30),
        v('p4', 'TBM-8955', 'PAD-K', 'PAD-E', 15, 2 * 60 + 10),
        v('p5', 'PDF-7443', 'Puerto Nuevo', 'PAD-E', 30, 9 * 60),
    ];
};

// 754 s → "12:34"; 3 754 s → "1:02:34"
const cronometro = seg => {
    const s = Math.max(0, Math.floor(seg));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    const dos = n => String(n).padStart(2, '0');
    return h ? `${h}:${dos(m)}:${dos(r)}` : `${dos(m)}:${dos(r)}`;
};

// Progreso de cada vehículo: tiempo transcurrido ÷ tiempo esperado entre las garitas
const estadoDe = (v, ahora, garita) => {
    const transcurrido = (ahora - v.salidaAt) / 1000;
    const esperado = v.esperadoMin * 60;
    return {
        ...v,
        transcurrido,
        retrasado: transcurrido > esperado,
        avance: Math.min(1, transcurrido / esperado),
        dePaso: v.destino !== garita,
    };
};
// Los retrasados primero (el que más lleva arriba); luego los que están por llegar
const ordenar = (a, b) => (b.retrasado - a.retrasado)
    || (a.retrasado ? b.transcurrido - a.transcurrido : b.avance - a.avance);

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
export const EnCamino = () => {
    const [garita] = useState(GARITA_PRUEBA);
    const [vehiculos, setVehiculos] = useState(() => (verPrueba() ? crearPrueba() : []));
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

    // Cronómetros: cada segundo con el cajón abierto; cerrado basta para el punto ámbar
    useEffect(() => {
        if (!vehiculos.length) return undefined;
        const tic = () => setAhora(Date.now());
        const primero = setTimeout(tic, 0);   // al abrir, el tiempo se pone al día enseguida
        const id = setInterval(tic, abierto ? 1000 : 15000);
        return () => { clearTimeout(primero); clearInterval(id); };
    }, [abierto, vehiculos.length]);

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

    const lista = vehiculos.map(v => estadoDe(v, ahora, garita)).sort(ordenar);
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
        const v = lista.find(x => x.id === confirmando.id);
        setVehiculos(vs => vs.filter(x => x.id !== confirmando.id));
        setConfirmando(null);
        setAviso(`Llegada de ${confirmando.placa.trim() || v?.placa} registrada · datos de prueba`);
        if (vehiculos.length === 1) setAbierto(false);
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
