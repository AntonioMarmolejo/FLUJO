import { armarPrincipal, esDesvio, formatoNumero as num, formatoTiempo as fmt, minutos, nombreCorto } from './calculoVia';

// Mapa esquemático de la vía (estilo líneas de metro): la vía principal baja en
// vertical con los nombres a la izquierda; los desvíos salen hacia la derecha
// como ramas, y de ellos pueden salir otros. Se arma solo con los tramos: no
// necesita coordenadas ni conexión.

const FILA = 58;          // alto de cada plataforma
const MARGEN_Y = 34;
const RAMA_SUBIDA = 22;   // tramo en diagonal con el que la rama se separa de su plataforma
const RAMA_LARGO = 40;    // largo horizontal de cada rama
// Ancho aproximado de los textos (13px seminegrita y 11px), para dimensionar el mapa
const anchoNombre = s => s.length * 7.6;
const anchoDetalle = s => s.length * 5.9;

const porOrden = (a, b) => (a.orden ?? 0) - (b.orden ?? 0);
const claseEstado = t => `estado-via--${t.cond.toLowerCase()}`;
const detalleTramo = t => `${num(t.km)} km · ${t.cond === 'Cerrada' ? 'Cerrada' : fmt(minutos(t))}`;

// Ubica cada plataforma: la vía principal en una columna, y cada desvío en su
// propia fila debajo de la plataforma de la que sale, más a la derecha
const armarMapa = tramos => {
    const { nodos, enlaces } = armarPrincipal(tramos);
    const desvios = tramos.filter(esDesvio).sort(porOrden);
    // La columna principal deja a su izquierda el espacio justo para los nombres
    const x0 = Math.min(190, Math.max(70, ...nodos.map(n => anchoNombre(n) + 30)));
    const puntos = [];
    const pos = new Map();
    let fila = 0;

    const agregar = (nombre, x, extra) => {
        const p = { nombre, x, y: MARGEN_Y + fila * FILA, ...extra };
        fila++;
        puntos.push(p);
        pos.set(nombre, p);
        return p;
    };
    const ramas = padre => {
        desvios.filter(t => t.from === padre.nombre && !pos.has(t.to)).forEach(t => {
            const hijo = agregar(t.to, padre.x + RAMA_SUBIDA + RAMA_LARGO, { tramo: t, padre, principal: false });
            ramas(hijo);
        });
    };

    nodos.forEach((n, i) => {
        if (pos.has(n)) return;
        const p = agregar(n, x0, { tramo: i > 0 ? enlaces[i - 1] : null, hueco: i > 0 && !enlaces[i - 1], principal: true });
        ramas(p);
    });
    // Desvíos que salen de una plataforma que ya no está en la red
    desvios.forEach(t => {
        if (pos.has(t.from)) return;
        const suelto = agregar(t.from, x0 + RAMA_SUBIDA + RAMA_LARGO, { tramo: null, principal: false, suelto: true });
        ramas(suelto);
    });

    // La columna principal: un segmento entre cada par de plataformas seguidas
    const principales = puntos.filter(p => p.principal);
    const columna = principales.slice(1).map((p, i) => ({ desde: principales[i], hasta: p, tramo: p.tramo, hueco: p.hueco }));
    puntos.forEach(p => {
        p.detalle = p.tramo ? detalleTramo(p.tramo) : p.principal && p === puntos[0] ? 'Inicio de la vía' : p.hueco ? 'Sin tramo' : '';
    });
    // Lo que ocupa cada desvío con su texto a la derecha (la principal tiene el texto a la izquierda)
    const ancho = Math.max(x0 + 24, ...puntos.filter(p => !p.principal)
        .map(p => p.x + 16 + Math.max(anchoNombre(p.nombre), anchoDetalle(p.detalle)) + 6));
    return { puntos, columna, x0, ancho: Math.ceil(ancho), alto: MARGEN_Y * 2 + (fila - 1) * FILA };
};

// Rama: diagonal corta desde la plataforma de salida y luego horizontal
const caminoRama = (padre, hijo) => {
    const xCodo = padre.x + RAMA_SUBIDA;
    return `M ${padre.x} ${padre.y} L ${xCodo} ${hijo.y} L ${hijo.x} ${hijo.y}`;
};

export const MapaVia = ({ tramos, ruta, origen, destino, onElegir }) => {
    if (!tramos.length) return null;
    const { puntos, columna, x0, ancho, alto } = armarMapa(tramos);
    const hayRuta = ruta.valida && !ruta.sinConexion;
    const enRuta = t => hayRuta && t && ruta.ids.has(t._id);
    const estadoNodo = n => (ruta.valida && (n === origen || n === destino))
        ? 'extremo'
        : (hayRuta && !ruta.nodos.has(n) ? 'fuera' : '');
    const claseLinea = (t, extra = '') => [
        'mapa__linea', extra,
        t ? claseEstado(t) : 'mapa__linea--hueco',
        enRuta(t) && 'mapa__linea--ruta',
        hayRuta && !enRuta(t) && 'mapa__linea--fuera',
    ].filter(Boolean).join(' ');

    return (
        <div className="mapa">
            <svg className="mapa__svg" width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img"
                aria-label="Mapa de la vía con sus plataformas y desvíos">
                {/* Líneas: primero las atenuadas, encima las de la ruta elegida */}
                {[false, true].map(capaRuta => (
                    <g key={String(capaRuta)}>
                        {columna.filter(s => !!enRuta(s.tramo) === capaRuta).map(s => (
                            <line key={s.hasta.nombre} className={claseLinea(s.tramo)}
                                x1={x0} y1={s.desde.y} x2={x0} y2={s.hasta.y} />
                        ))}
                        {puntos.filter(p => p.padre && !!enRuta(p.tramo) === capaRuta).map(p => (
                            <path key={p.nombre} className={claseLinea(p.tramo, 'mapa__linea--rama')} d={caminoRama(p.padre, p)} />
                        ))}
                    </g>
                ))}

                {puntos.map(p => {
                    const estado = estadoNodo(p.nombre);
                    const izquierda = p.principal;
                    const xTexto = izquierda ? p.x - 16 : p.x + 16;
                    return (
                        <g key={p.nombre} className={`mapa__plataforma${estado ? ` mapa__plataforma--${estado}` : ''}`}
                            onClick={() => onElegir?.(p.nombre)} role="button" tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter') onElegir?.(p.nombre); }}>
                            <title>{p.nombre}</title>
                            <circle className="mapa__toque" cx={p.x} cy={p.y} r="22" />
                            <circle className={`mapa__punto${p.principal ? ' mapa__punto--principal' : ''}`} cx={p.x} cy={p.y} r={p.principal ? 12 : 10} />
                            <text className={`mapa__inicial${nombreCorto(p.nombre).length > 2 ? ' mapa__inicial--larga' : ''}`}
                                x={p.x} y={p.y + 3.5} textAnchor="middle">{nombreCorto(p.nombre)}</text>
                            <text className="mapa__nombre" x={xTexto} y={p.y - 2} textAnchor={izquierda ? 'end' : 'start'}>{p.nombre}</text>
                            {p.detalle && (
                                <text className="mapa__detalle" x={xTexto} y={p.y + 13} textAnchor={izquierda ? 'end' : 'start'}>{p.detalle}</text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
