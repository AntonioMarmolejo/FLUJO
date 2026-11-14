import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCatalogMeta } from '../../lib/syncEngine.js';
import { cargarAjustes, leerAjustesLocales, puedeEditarDistancias } from '../../lib/ajustes.js';
import {
    encolarCambioTramo,
    idsTramosPendientes,
    leerTramosLocales,
    nuevoIdTramo,
    refrescarTramos,
} from '../../lib/tramosOffline.js';
import { CacheFreshnessBadge, PendienteBadge } from './comunes';
import { addMouseSwipe, handleShareText } from './helpers';
import { IconMinus, IconPencil, IconShare } from './iconos';
import { MapaVia } from './MapaVia';
import { Sk } from '../../components/Skeleton';
import {
    ESTADOS,
    REGLA_ESTADO,
    ajustarExtremos,
    armarPrincipal,
    calcularRuta,
    editarTramo,
    esDesvio,
    formatoNumero as num,
    formatoTiempo as fmt,
    hace,
    listarDestinos,
    listarPlataformas,
    minutos,
    nodosY,
    nombreCorto,
    nombreFirma,
    ordenarDesvios,
    quedanAisladas,
    ramasDe,
    validarTramo,
    velocidad,
} from './calculoVia';
import '../../styles/Distancias.css';

const claseEstado = estado => `estado-via estado-via--${estado.toLowerCase()}`;
const nombreTramo = t => `${t.from} → ${t.to}`;
const FORM_VACIO = { from: '', to: '', km: '', vmin: '', vmax: '', esY: false, lado: 'derecha' };

// Selector de dos o más opciones en una sola fila (tipo de tramo, destino, lado)
const Segmentos = ({ etiqueta, valor, opciones, onChange }) => (
    <div className="dist__tipo" role="radiogroup" aria-label={etiqueta}>
        {opciones.map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={valor === id}
                className={`dist__tipo-opcion${valor === id ? ' dist__tipo-opcion--sel' : ''}`}
                onClick={() => onChange(id)}>{label}</button>
        ))}
    </div>
);

const IconoChevron = ({ tam = 16 }) => (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
);

// ── Calculadora ───────────────────────────────────────────
const SelectorPlataforma = ({ etiqueta, valor, opciones, desvios, onChange }) => (
    <label className="dist__campo">
        {etiqueta}
        <div className="dist__select-caja">
            <select className="dist__select" value={valor} onChange={e => onChange(e.target.value)}>
                {opciones.map(o => <option key={o} value={o}>{desvios.has(o) ? `↳ ${o}` : o}</option>)}
            </select>
            <span className="dist__select-chevron"><IconoChevron /></span>
        </div>
    </label>
);

const Alerta = ({ titulo, texto }) => (
    <div className="dist__alerta" role="alert">
        <svg className="dist__alerta-icono" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
        <div>
            <div className="dist__alerta-titulo">{titulo}</div>
            <div className="dist__alerta-texto">{texto}</div>
        </div>
    </div>
);

const Calculadora = ({ plataformas, desvios, origen, destino, ruta, onOrigen, onDestino, onIntercambiar }) => (
    <section className="dist__seccion dist__calc">
        <h3 className="dist__seccion-titulo">Calculadora de viaje</h3>
        {plataformas.length >= 2 && (
            <div className="dist__calc-selectores">
                <SelectorPlataforma etiqueta="Origen" valor={origen} opciones={plataformas} desvios={desvios} onChange={onOrigen} />
                <button className="dist__intercambiar" aria-label="Intercambiar origen y destino" onClick={onIntercambiar}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" /></svg>
                </button>
                <SelectorPlataforma etiqueta="Destino" valor={destino} opciones={plataformas} desvios={desvios} onChange={onDestino} />
            </div>
        )}

        {!ruta.valida ? (
            <div className="dist__resultado dist__resultado--vacio">{ruta.motivo}</div>
        ) : ruta.sinConexion ? (
            <div className="dist__resultado">
                <div>
                    <div className="dist__resultado-etiqueta">Tiempo estimado</div>
                    <div className="dist__resultado-tiempo dist__resultado-tiempo--sin">Sin estimación</div>
                </div>
                <Alerta titulo="Sin conexión entre estas plataformas"
                    texto="No hay tramos que las unan. Revisa si falta un tramo en la vía principal o en un desvío." />
            </div>
        ) : (
            <div className="dist__resultado">
                <div>
                    <div className="dist__resultado-etiqueta">Tiempo estimado</div>
                    {ruta.estimado != null
                        ? <div className="dist__resultado-tiempo">≈ {fmt(ruta.estimado)}</div>
                        : <div className="dist__resultado-tiempo dist__resultado-tiempo--sin">Sin estimación</div>}
                </div>
                <div className="dist__resultado-datos">
                    <span><strong>{num(ruta.km)} km</strong> en total</span>
                    <span><strong>{ruta.cantidad} {ruta.cantidad === 1 ? 'tramo' : 'tramos'}</strong></span>
                </div>
                {ruta.estimado != null && (
                    <div className="dist__desglose">
                        <div className="dist__desglose-barra">
                            {ruta.tramos.map(t => (
                                <div key={t._id} title={`${nombreTramo(t)} · ${t.cond}`}
                                    className={`dist__desglose-parte ${claseEstado(t.cond)}`}
                                    style={{ flexGrow: minutos(t) }} />
                            ))}
                        </div>
                        <div className="dist__desglose-etiquetas">
                            {ruta.tramos.map(t => (
                                <div key={t._id} className="dist__desglose-etiqueta" style={{ flexGrow: minutos(t) }}>{fmt(minutos(t))}</div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="dist__resultado-casos">Mejor caso {fmt(ruta.mejor)} · Peor caso {fmt(ruta.peor)}</div>
                {ruta.cerrados.length > 0 && (
                    <Alerta titulo={(ruta.cerrados.length > 1 ? 'Tramos cerrados: ' : 'Tramo cerrado: ')
                        + ruta.cerrados.map(t => `${nombreCorto(t.from)} → ${nombreCorto(t.to)}`).join(', ')}
                        texto="No se puede estimar el tiempo de viaje mientras la vía siga cerrada en esta ruta." />
                )}
            </div>
        )}
    </section>
);

// ── Tarjeta de tramo ──────────────────────────────────────
// Texto para compartir un tramo (WhatsApp, etc.)
const textoTramo = t => [
    `${esDesvio(t) ? 'Desvío' : 'Tramo'} ${nombreTramo(t)}`,
    `Distancia: ${num(t.km)} km · ${num(t.vmin)}–${num(t.vmax)} km/h`,
    `Estado de la vía: ${t.cond}${t.cond === 'Cerrada' ? ' (sin paso)' : ` · ≈ ${fmt(minutos(t))}`}`,
    t.note && `Nota: ${t.note}`,
    `Actualizado ${hace(t.at)}${t.by ? ` por ${t.by}` : ''}`,
].filter(Boolean).join('\n');

// Compacta; al deslizarla hacia la derecha muestra sus acciones (como en movimientos)
const TarjetaTramo = ({ t, enRuta, pendiente, editable, deslizada, onDeslizar, gestoRef, onEstado, onEditar, onEliminar }) => {
    const cerrado = t.cond === 'Cerrada';
    const accion = fn => () => { onDeslizar(null); fn(); };
    const alSoltar = dx => {
        if (deslizada) { if (dx < -30) onDeslizar(null); }
        else if (dx > 55) onDeslizar(t._id);
    };
    return (
        <div className={`dist__tramo-caja${editable ? '' : ' dist__tramo-caja--lectura'}`}>
            <div className="dist__tramo-acciones" onClick={e => e.stopPropagation()}>
                {editable && (
                    <button className={`mov__act-btn dist__act-estado ${claseEstado(t.cond)}`} title="Estado de la vía" aria-label="Estado de la vía" onClick={accion(onEstado)}>
                        <span className="dist__chip-punto" />
                    </button>
                )}
                {editable && <button className="mov__act-btn" title="Editar" aria-label="Editar" onClick={accion(onEditar)}><IconPencil /></button>}
                <button className="mov__act-btn" title="Compartir" aria-label="Compartir" onClick={accion(() => handleShareText(textoTramo(t)))}><IconShare /></button>
                {editable && <button className="mov__act-btn mov__act-btn--danger" title="Eliminar" aria-label="Eliminar" onClick={accion(onEliminar)}><IconMinus /></button>}
            </div>
            <article
                className={`dist__tramo${enRuta ? ' dist__tramo--ruta' : ''}${deslizada ? ' dist__tramo--deslizada' : ''}`}
                onTouchStart={e => { gestoRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false }; }}
                onTouchMove={e => {
                    const dx = e.touches[0].clientX - gestoRef.current.startX;
                    const dy = e.touches[0].clientY - gestoRef.current.startY;
                    if (!gestoRef.current.moved && !gestoRef.current.vertScroll) {
                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                        if (Math.abs(dy) > Math.abs(dx)) { gestoRef.current.vertScroll = true; return; }
                        gestoRef.current.moved = true;
                    }
                }}
                onTouchEnd={e => { if (gestoRef.current.moved) alSoltar(e.changedTouches[0].clientX - gestoRef.current.startX); }}
                onMouseDown={e => addMouseSwipe(gestoRef, alSoltar).onMouseDown(e)}
                onClick={() => {
                    if (gestoRef.current?.didDrag) { gestoRef.current.didDrag = false; return; }
                    onDeslizar(deslizada ? null : t._id);
                }}
            >
                <div className="dist__tramo-cab">
                    <div className="dist__tramo-titulo">
                        <span className="dist__tramo-nombre">{nombreTramo(t)}</span>
                        {t.esY && <span className="dist__marca-y" title="Termina en una bifurcación en Y">Y</span>}
                        {enRuta && <span className="dist__en-ruta">En ruta</span>}
                        {pendiente && <PendienteBadge />}
                    </div>
                    <span className="dist__tramo-tiempo">{cerrado ? 'Sin paso' : `≈ ${fmt(minutos(t))}`}</span>
                </div>
                <div className="dist__tramo-datos">
                    <span className={`dist__chip dist__chip--mini ${claseEstado(t.cond)}`}><span className="dist__chip-punto" />{t.cond}</span>
                    <span>{num(t.km)} km · {num(t.vmin)}–{num(t.vmax)} km/h{esDesvio(t) ? ` · ${t.lado === 'izquierda' ? '← Izq.' : 'Der. →'}` : ''}</span>
                </div>
                {t.note && <div className="dist__nota">{t.note}</div>}
                <div className="dist__tramo-actualizado">Actualizado {hace(t.at)} · {nombreFirma(t.by)}</div>
            </article>
        </div>
    );
};

const SkeletonTramos = () => (
    <div className="dist__tramos" role="status" aria-busy="true" aria-label="Cargando">
        {[0, 1, 2].map(i => (
            <div key={i} className="dist__tramo" aria-hidden="true">
                <Sk forma="titulo" ancho={['70', '50', '60'][i]} />
                <Sk ancho="40" />
                <Sk forma="chip" />
            </div>
        ))}
    </div>
);

// ── Hojas (estado de la vía y formulario de tramo) ────────
const HojaEstado = ({ tramo, estado, nota, onEstado, onNota, onCancelar, onGuardar }) => (
    <>
        <div>
            <div className="dist__hoja-titulo">Estado de la vía</div>
            <div className="dist__hoja-sub">{nombreTramo(tramo)}</div>
        </div>
        <div className="dist__opciones">
            {ESTADOS.map(nombre => {
                const v = velocidad(tramo, nombre);
                const sel = estado === nombre;
                return (
                    <button key={nombre} aria-pressed={sel}
                        className={`dist__opcion${sel ? ' dist__opcion--sel' : ''}`}
                        onClick={() => onEstado(nombre)}>
                        <span className={`dist__opcion-muestra ${claseEstado(nombre)}`} />
                        <span className="dist__opcion-textos">
                            <span className="dist__opcion-nombre">{nombre}</span>
                            <span className="dist__opcion-desc">
                                {v ? `${REGLA_ESTADO[nombre]} · ${num(v)} km/h · ≈ ${fmt((tramo.km / v) * 60)}` : REGLA_ESTADO[nombre]}
                            </span>
                        </span>
                        <span className="dist__opcion-radio"><span className="dist__opcion-radio-punto" /></span>
                    </button>
                );
            })}
        </div>
        <label className="dist__campo dist__campo--form">
            Nota (opcional)
            <textarea className="dist__input dist__input--area" rows="2" value={nota}
                placeholder="Ej.: bache a la altura del km 7" onChange={e => onNota(e.target.value)} />
        </label>
        <div className="dist__hoja-botones">
            <button className="dist__btn" onClick={onCancelar}>Cancelar</button>
            <button className="dist__btn dist__btn--primario" onClick={onGuardar}>Guardar</button>
        </div>
    </>
);

const CampoForm = ({ etiqueta, valor, error, onChange, ayuda, soloLectura, decimal, placeholder }) => (
    <label className="dist__campo dist__campo--form">
        {etiqueta}
        <input className={[
            'dist__input',
            error && 'dist__input--error',
            soloLectura && 'dist__input--lectura',
        ].filter(Boolean).join(' ')}
            value={valor} readOnly={soloLectura} placeholder={placeholder}
            inputMode={decimal ? 'decimal' : undefined}
            onChange={e => onChange(e.target.value)} />
        {ayuda && <span className="dist__ayuda">{ayuda}</span>}
        {error && <span className="dist__error">{error}</span>}
    </label>
);

const HojaFormulario = ({ form, puedeElegirTipo, desdeFijo, salidas, ys, eligeLado, onTipo, onCampo, onCancelar, onGuardar }) => {
    const e = form.err || {};
    const esNuevo = form.modo === 'nuevo';
    const desvio = form.tipo === 'desvio';
    return (
        <>
            <div className="dist__hoja-titulo">
                {esNuevo ? (desvio ? 'Nuevo desvío' : 'Nuevo tramo') : (desvio ? 'Editar desvío' : 'Editar tramo')}
            </div>
            {puedeElegirTipo && (
                <Segmentos etiqueta="Tipo de tramo" valor={form.tipo} onChange={onTipo}
                    opciones={[['principal', 'Vía principal'], ['desvio', 'Desvío']]} />
            )}
            {desvio ? (
                <label className="dist__campo dist__campo--form">
                    Sale de
                    <div className="dist__select-caja">
                        <select className={`dist__select dist__select--form${e.from ? ' dist__input--error' : ''}`}
                            value={form.from} onChange={ev => onCampo('from', ev.target.value)}>
                            <option value="">Elige una plataforma o una Y</option>
                            {salidas.map(p => <option key={p} value={p}>{ys.has(p) ? `${p} (Y)` : p}</option>)}
                        </select>
                        <span className="dist__select-chevron"><IconoChevron /></span>
                    </div>
                    <span className="dist__ayuda">Plataforma o bifurcación en Y donde empieza el acceso.</span>
                    {e.from && <span className="dist__error">{e.from}</span>}
                </label>
            ) : (
                <CampoForm etiqueta="Desde" valor={form.from} error={e.from} onChange={v => onCampo('from', v)}
                    soloLectura={desdeFijo} placeholder="Ej.: Campamento"
                    ayuda={desdeFijo && 'El tramo nuevo se agrega al final de la vía principal.'} />
            )}
            {desvio && (
                <div className="dist__campo dist__campo--form">
                    Sale hacia
                    {eligeLado ? (<>
                        <Segmentos etiqueta="Lado del desvío" valor={form.lado} onChange={v => onCampo('lado', v)}
                            opciones={[['izquierda', '← Izquierda'], ['derecha', 'Derecha →']]} />
                        <span className="dist__ayuda">Lado de la vía principal por el que sale, yendo del campamento hacia Puerto Nuevo.</span>
                    </>) : (
                        <span className="dist__ayuda">Sigue el mismo lado del desvío del que sale.</span>
                    )}
                </div>
            )}
            <div className="dist__campo dist__campo--form">
                Llega a
                <Segmentos etiqueta="A qué llega el tramo" valor={form.esY ? 'y' : 'plataforma'}
                    onChange={v => onCampo('esY', v === 'y')}
                    opciones={[['plataforma', 'Plataforma'], ['y', 'Una Y (bifurcación)']]} />
                {form.esY && <span className="dist__ayuda">Punto donde la vía se separa. De ahí podrás sacar desvíos; no aparece en la calculadora.</span>}
            </div>
            <CampoForm etiqueta={form.esY ? 'Nombre de la Y' : desvio ? 'Hasta (plataforma)' : 'Hasta'} valor={form.to} error={e.to}
                onChange={v => onCampo('to', v)}
                placeholder={form.esY ? 'Ej.: Y del Edén' : desvio ? 'Ej.: Plataforma C' : 'Ej.: Puerto Nuevo'} />
            <CampoForm etiqueta="Distancia (km)" valor={form.km} error={e.km} onChange={v => onCampo('km', v)} decimal placeholder="0" />
            <div className="dist__form-fila">
                <CampoForm etiqueta="Vel. mínima (km/h)" valor={form.vmin} error={e.vmin} onChange={v => onCampo('vmin', v)} decimal placeholder="0" />
                <CampoForm etiqueta="Vel. máxima (km/h)" valor={form.vmax} error={e.vmax} onChange={v => onCampo('vmax', v)} decimal placeholder="0" />
            </div>
            {esNuevo && <div className="dist__ayuda dist__ayuda--suelta">Estado inicial: Buena. Puedes cambiarlo desde la tarjeta del tramo.</div>}
            <div className="dist__hoja-botones">
                <button className="dist__btn" onClick={onCancelar}>Cancelar</button>
                <button className="dist__btn dist__btn--primario" onClick={onGuardar}>
                    {esNuevo ? (desvio ? 'Agregar desvío' : 'Agregar tramo') : 'Guardar cambios'}
                </button>
            </div>
        </>
    );
};

// ── Pantalla Distancias ───────────────────────────────────
export const PantallaDistancias = ({ onVolver }) => {
    const { user, isAdmin, isSupervisor, isPending } = useAuth();
    const [editores, setEditores] = useState(() => leerAjustesLocales().distanciasEditores);
    const puedeEditar = puedeEditarDistancias({ isAdmin, isSupervisor, isPending }, editores);

    const [tramos, setTramos] = useState([]);
    const [pendientes, setPendientes] = useState(new Set());
    const [cargando, setCargando] = useState(true);
    const [desdeCache, setDesdeCache] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);
    const [origen, setOrigen] = useState('');
    const [destino, setDestino] = useState('');
    const [hoja, setHoja] = useState(null);          // { tipo: 'estado', id, cond, note } | { tipo: 'form', modo, tipoTramo... }
    const [hojaAbierta, setHojaAbierta] = useState(false);
    const [borrarId, setBorrarId] = useState(null);
    const [deslizadaId, setDeslizadaId] = useState(null);   // tarjeta con sus acciones a la vista
    const gesto = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false, didDrag: false });
    const [aviso, setAviso] = useState({ texto: '', visible: false });
    const temporizador = useRef(null);

    const mostrarAviso = texto => {
        clearTimeout(temporizador.current);
        setAviso({ texto, visible: true });
        temporizador.current = setTimeout(() => setAviso(a => ({ ...a, visible: false })), 2600);
    };
    useEffect(() => () => clearTimeout(temporizador.current), []);

    // Lo que se ve es la copia del dispositivo: la última del servidor más los cambios sin subir
    const mostrarLocales = async () => {
        const [locales, ids] = await Promise.all([
            leerTramosLocales().catch(() => []),
            idsTramosPendientes().catch(() => new Set()),
        ]);
        setTramos(locales);
        setPendientes(ids);
        return locales;
    };

    const cargar = async () => {
        const locales = await mostrarLocales();
        if (locales.length) setCargando(false);
        try {
            await refrescarTramos();
            await mostrarLocales();
            setDesdeCache(false);
        } catch {
            setDesdeCache(locales.length > 0);
            const meta = await getCatalogMeta('tramos').catch(() => null);
            setCachedAt(meta?.cachedAt || null);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar();
        cargarAjustes().then(a => setEditores(a.distanciasEditores)).catch(() => {});
        // Tras subir la cola (aquí o desde otra pantalla) se muestra lo que quedó en el servidor
        const onSync = e => {
            mostrarLocales();
            const n = e.detail?.rechazados || 0;
            if (n) mostrarAviso(n === 1 ? 'Un cambio no se pudo guardar' : `${n} cambios no se pudieron guardar`);
        };
        window.addEventListener('flujo:tramos', onSync);
        return () => window.removeEventListener('flujo:tramos', onSync);
    }, []);

    const { nodos: nodosPrincipal, enlaces: enlacesPrincipal } = armarPrincipal(tramos);
    const principales = enlacesPrincipal.filter(Boolean);
    const desvios = ordenarDesvios(tramos, nodosPrincipal);
    // Todos los puntos de la red (plataformas y Y) y, aparte, los que se eligen en la calculadora
    const plataformas = listarPlataformas(tramos);
    const ys = nodosY(tramos);
    const destinos = listarDestinos(tramos);
    const plataformasDesvio = new Set(destinos.filter(p => !nodosPrincipal.includes(p)));
    const totalKm = tramos.reduce((a, t) => a + t.km, 0);

    // Origen y destino siempre válidos cuando la red cambia
    useEffect(() => {
        const ext = ajustarExtremos(tramos, origen, destino);
        if (ext.origen !== origen) setOrigen(ext.origen);
        if (ext.destino !== destino) setDestino(ext.destino);
    }, [tramos, origen, destino]);

    const calculo = calcularRuta(tramos, origen, destino);
    const ruta = calculo.valida
        ? { ...calculo, ids: new Set(calculo.tramos.map(t => t._id)) }
        : { ...calculo, nodos: new Set(), ids: new Set() };
    // Tocar una plataforma del mapa la usa como destino (si era el origen, se intercambian)
    const elegirEnMapa = nombre => {
        if (nombre === destino) return;
        if (nombre === origen) { setOrigen(destino); setDestino(origen); return; }
        setDestino(nombre);
    };

    // Si la ruta abarca toda la red, marcar "En ruta" no aporta nada
    const marcarRuta = ruta.ids.size > 0 && ruta.ids.size < tramos.length;

    // ── Guardar cambios (al instante, con o sin internet) ──
    const encolar = async cambios => {
        try {
            for (const c of cambios) await encolarCambioTramo(c);
        } catch {
            mostrarAviso('No se pudo guardar en este dispositivo');
        }
        await mostrarLocales();
    };

    const cerrarHoja = () => setHojaAbierta(false);

    // Esc cierra la hoja o el diálogo abierto
    useEffect(() => {
        const onTecla = e => {
            if (e.key !== 'Escape') return;
            if (borrarId != null) setBorrarId(null);
            else setHojaAbierta(false);
        };
        window.addEventListener('keydown', onTecla);
        return () => window.removeEventListener('keydown', onTecla);
    }, [borrarId]);

    // Estado de la vía
    const abrirEstado = t => {
        setHoja({ tipo: 'estado', id: t._id, cond: t.cond, note: t.note || '' });
        setHojaAbierta(true);
    };
    const guardarEstado = async () => {
        const t = tramos.find(x => x._id === hoja.id);
        cerrarHoja();
        if (!t) return;
        await encolar([{ tipo: 'editar', doc: { ...t, cond: hoja.cond, note: hoja.note.trim(), at: Date.now(), by: user?.name || '' } }]);
        mostrarAviso('Estado actualizado');
    };

    // Agregar / editar tramo
    const abrirNuevo = () => {
        setHoja({ tipo: 'form', modo: 'nuevo', tipoTramo: 'principal', ...FORM_VACIO, from: nodosPrincipal[nodosPrincipal.length - 1] || '', err: {} });
        setHojaAbierta(true);
    };
    const abrirEdicion = t => {
        setHoja({
            tipo: 'form', modo: 'editar', id: t._id, tipoTramo: esDesvio(t) ? 'desvio' : 'principal',
            from: t.from, to: t.to, km: String(t.km), vmin: String(t.vmin), vmax: String(t.vmax),
            esY: !!t.esY, lado: t.lado === 'izquierda' ? 'izquierda' : 'derecha', err: {},
        });
        setHojaAbierta(true);
    };
    const cambiarTipo = tipoTramo => setHoja(h => ({
        ...h, tipoTramo, err: {},
        from: tipoTramo === 'principal' ? (nodosPrincipal[nodosPrincipal.length - 1] || '') : '',
    }));
    const cambiarCampo = (campo, valor) =>
        setHoja(h => ({ ...h, [campo]: valor, err: { ...h.err, [campo]: '' } }));

    const formDesdeFijo = hoja?.tipo === 'form' && hoja.modo === 'nuevo' && hoja.tipoTramo === 'principal' && nodosPrincipal.length > 0;
    // Un desvío puede salir de cualquier plataforma, menos de sí mismo o de sus propias ramas
    const salidasDesvio = (() => {
        if (hoja?.tipo !== 'form' || hoja.modo !== 'editar') return plataformas;
        const t = tramos.find(x => x._id === hoja.id);
        if (!t) return plataformas;
        const ramas = ramasDe(tramos, t.to);
        return plataformas.filter(p => p !== t.to && !ramas.has(p));
    })();
    // El lado solo se elige si el desvío sale de la vía principal; si sale de otro desvío, sigue su lado
    const formEligeLado = hoja?.tipo === 'form' && (!hoja.from || nodosPrincipal.includes(hoja.from));

    const guardarFormulario = async () => {
        const esNuevo = hoja.modo === 'nuevo';
        const viejo = esNuevo ? null : tramos.find(t => t._id === hoja.id);
        const tipoTramo = hoja.tipoTramo;
        // Un nombre nuevo de plataforma no puede repetir otra que ya esté en la red
        const otras = plataformas.filter(p => !viejo || (p !== viejo.to && p !== viejo.from));
        const { errores, datos } = validarTramo({
            ...hoja,
            tipo: tipoTramo,
            revisarTo: esNuevo || hoja.to.trim() !== viejo.to,
            revisarFrom: !esNuevo && tipoTramo === 'principal' && hoja.from.trim() !== viejo.from,
        }, esNuevo ? plataformas : otras);
        if (errores) { setHoja(h => ({ ...h, err: errores })); return; }

        cerrarHoja();
        if (esNuevo) {
            const orden = tramos.reduce((m, t) => Math.max(m, t.orden ?? 0), 0) + 1;
            await encolar([{
                tipo: 'crear',
                doc: { _id: nuevoIdTramo(), tipo: tipoTramo, ...datos, cond: 'Buena', note: '', orden, at: Date.now(), by: user?.name || '' },
            }]);
            mostrarAviso(tipoTramo === 'desvio' ? 'Desvío agregado' : 'Tramo agregado');
        } else {
            const renombrar = n => (n === viejo.to ? datos.to : tipoTramo === 'principal' && n === viejo.from ? datos.from : n);
            setOrigen(renombrar(origen));
            setDestino(renombrar(destino));
            await encolar(editarTramo(tramos, hoja.id, datos).map(doc => ({ tipo: 'editar', doc })));
            mostrarAviso('Tramo actualizado');
        }
    };

    // Eliminar
    const tramoBorrar = tramos.find(t => t._id === borrarId);
    const aisladas = tramoBorrar ? quedanAisladas(tramos, borrarId) : [];
    const confirmarBorrado = async () => {
        const id = borrarId;
        setBorrarId(null);
        await encolar([{ tipo: 'borrar', id, clave: id }]);
        mostrarAviso('Tramo eliminado');
    };

    const tramoHoja = hoja?.tipo === 'estado' ? tramos.find(t => t._id === hoja.id) : null;

    const tarjeta = t => (
        <TarjetaTramo key={t._id} t={t} editable={puedeEditar}
            pendiente={pendientes.has(t._id)}
            enRuta={marcarRuta && ruta.ids.has(t._id)}
            deslizada={deslizadaId === t._id} onDeslizar={setDeslizadaId} gestoRef={gesto}
            onEstado={() => abrirEstado(t)}
            onEditar={() => abrirEdicion(t)}
            onEliminar={() => setBorrarId(t._id)} />
    );

    return (
        <div className="dist">
            <header className="dist__cabecera">
                <button className="dist__volver" aria-label="Volver" onClick={onVolver}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div className="dist__titulos">
                    <h2 className="dist__titulo">Distancias</h2>
                    <div className="dist__subtitulo">
                        Vía de lastre · {destinos.length} {destinos.length === 1 ? 'plataforma' : 'plataformas'} · {num(totalKm)} km
                        {!puedeEditar && ' · Solo lectura'}
                    </div>
                </div>
            </header>

            {desdeCache && <CacheFreshnessBadge cachedAt={cachedAt} onRefresh={cargar} />}

            {cargando && tramos.length === 0 ? <SkeletonTramos /> : (<>
                {/* Calculadora arriba: lo que se elige se resalta enseguida en el mapa */}
                <Calculadora plataformas={destinos} desvios={plataformasDesvio} origen={origen} destino={destino} ruta={ruta}
                    onOrigen={setOrigen} onDestino={setDestino}
                    onIntercambiar={() => { setOrigen(destino); setDestino(origen); }} />

                <section className="dist__seccion dist__seccion--via">
                    <div className="dist__via-cab">
                        <h3 className="dist__seccion-titulo">Mapa de la vía</h3>
                        <div className="dist__leyenda">
                            {ESTADOS.map(e => (
                                <span key={e} className="dist__leyenda-item">
                                    <span className={`dist__leyenda-muestra ${claseEstado(e)}`} />{e}
                                </span>
                            ))}
                        </div>
                    </div>
                    {tramos.length ? (
                        <>
                            <MapaVia tramos={tramos} ruta={ruta} origen={origen} destino={destino}
                                onElegir={elegirEnMapa} />
                            {destinos.length > 1 && (
                                <p className="dist__mapa-ayuda">
                                    Toca una plataforma para calcular el viaje hasta ella.
                                    {ys.size > 0 && ' Los puntos pequeños son bifurcaciones en Y.'}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="dist__via-vacia">
                            {puedeEditar ? 'Aún no hay tramos. Toca + para agregar el primero de la vía principal.' : 'Aún no hay tramos registrados.'}
                        </p>
                    )}
                </section>

                <section className="dist__tramos">
                    <div className="dist__tramos-cab">
                        <h3 className="dist__tramos-titulo">Vía principal</h3>
                        <span className="dist__tramos-total">{principales.length} {principales.length === 1 ? 'tramo' : 'tramos'}</span>
                    </div>
                    {principales.length === 0
                        ? <div className="dist__vacio">No hay tramos registrados.</div>
                        : principales.map(tarjeta)}
                </section>

                {desvios.length > 0 && (
                    <section className="dist__tramos">
                        <div className="dist__tramos-cab">
                            <h3 className="dist__tramos-titulo">Desvíos</h3>
                            <span className="dist__tramos-total">{desvios.length} {desvios.length === 1 ? 'desvío' : 'desvíos'}</span>
                        </div>
                        {desvios.map(tarjeta)}
                    </section>
                )}
            </>)}

            {puedeEditar && (
                <button className="placas__fab" aria-label="Agregar tramo" onClick={abrirNuevo}>+</button>
            )}

            {/* Hoja inferior: estado de la vía o formulario de tramo */}
            <div className={`dist__velo${hojaAbierta ? ' dist__velo--visible' : ''}`} onClick={cerrarHoja} />
            <div className={`dist__hoja${hojaAbierta ? ' dist__hoja--abierta' : ''}`} role="dialog" aria-modal="true" aria-hidden={!hojaAbierta}>
                <div className="dist__hoja-asa" />
                {hoja?.tipo === 'estado' && tramoHoja && (
                    <HojaEstado tramo={tramoHoja} estado={hoja.cond} nota={hoja.note}
                        onEstado={cond => setHoja(h => ({ ...h, cond }))}
                        onNota={note => setHoja(h => ({ ...h, note }))}
                        onCancelar={cerrarHoja} onGuardar={guardarEstado} />
                )}
                {hoja?.tipo === 'form' && (
                    <HojaFormulario form={{ ...hoja, tipo: hoja.tipoTramo }}
                        puedeElegirTipo={hoja.modo === 'nuevo' && plataformas.length > 0}
                        desdeFijo={formDesdeFijo} salidas={salidasDesvio} ys={ys} eligeLado={formEligeLado}
                        onTipo={cambiarTipo} onCampo={cambiarCampo}
                        onCancelar={cerrarHoja} onGuardar={guardarFormulario} />
                )}
            </div>

            {/* Confirmar eliminación (mismo diálogo que el resto de la app) */}
            {tramoBorrar && (
                <div className="modal__overlay" onClick={() => setBorrarId(null)}>
                    <div className="modal__card modal__card--confirmar" role="alertdialog" onClick={e => e.stopPropagation()}>
                        <p className="confirmar__mensaje">¿Eliminar {esDesvio(tramoBorrar) ? 'desvío' : 'tramo'}?</p>
                        <p className="confirmar__detalle">{nombreTramo(tramoBorrar)} · {num(tramoBorrar.km)} km. Esta acción no se puede deshacer.</p>
                        {aisladas.length > 0 && (
                            <div className="dist__alerta dist__alerta--compacta">
                                La vía quedará interrumpida: {aisladas.join(', ')} {aisladas.length === 1 ? 'quedará' : 'quedarán'} sin conexión con el resto.
                            </div>
                        )}
                        <div className="confirmar__botones">
                            <button className="confirmar__cancelar" onClick={() => setBorrarId(null)}>Cancelar</button>
                            <button className="confirmar__eliminar" onClick={confirmarBorrado}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`dist__toast${aviso.visible ? ' dist__toast--visible' : ''}`} aria-live="polite">{aviso.texto}</div>
        </div>
    );
};
