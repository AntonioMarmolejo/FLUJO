import { armarPrincipal, esDesvio, formatoNumero as num, formatoTiempo as fmt, minutos, nodosY, nombreCorto } from './calculoVia';

// Mapa esquemático de la vía (estilo líneas de metro): la vía principal baja en
// vertical con los nombres a la izquierda; los desvíos salen como ramas hacia la
// derecha o la izquierda (según el tramo), y de ellos pueden salir otros. Las
// bifurcaciones en Y se dibujan como puntos pequeños. Se arma solo con los
// tramos: no necesita coordenadas ni conexión.

const FILA = 58;          // alto de cada plataforma
const MARGEN_Y = 34;
const RAMA_SUBIDA = 22;   // tramo en diagonal con el que la rama se separa de su plataforma
const RAMA_LARGO = 40;    // largo horizontal de cada rama
const PASO_RAMA = RAMA_SUBIDA + RAMA_LARGO;
// Ancho aproximado de los textos (13px seminegrita y 11px), para dimensionar el mapa
const anchoNombre = s => s.length * 7.6;
const anchoDetalle = s => s.length * 5.9;

const porOrden = (a, b) => (a.orden ?? 0) - (b.orden ?? 0);
const claseEstado = t => `estado-via--${t.cond.toLowerCase()}`;
const detalleTramo = t => `${num(t.km)} km · ${t.cond === 'Cerrada' ? 'Cerrada' : fmt(minutos(t))}`;
const sentido = t => (t.lado === 'izquierda' ? -1 : 1);
// Los nombres de la vía principal van a la izquierda; los de un desvío, hacia su lado
const ladoTexto = p => (p.principal ? -1 : p.lado);

// Ubica cada plataforma: la vía principal en una columna, y cada desvío en su
// propia fila debajo de la plataforma de la que sale, hacia su lado
const armarMapa = tramos => {
    const { nodos, enlaces } = armarPrincipal(tramos);
    const desvios = tramos.filter(esDesvio).sort(porOrden);
    const ys = nodosY(tramos);
    const puntos = [];
    const pos = new Map();
    let fila = 0;

    // Las x se calculan con la vía principal en 0 y luego se desplazan
    const agregar = (nombre, x, extra) => {
        const p = { nombre, x, y: MARGEN_Y + fila * FILA, esY: ys.has(nombre), ...extra };
        fila++;
        puntos.push(p);
        pos.set(nombre, p);
        return p;
    };
    const ramas = padre => {
        desvios.filter(t => t.from === padre.nombre && !pos.has(t.to)).forEach(t => {
            // Un desvío que sale de otro desvío sigue su mismo lado, para no cruzar la vía principal
            const lado = padre.principal ? sentido(t) : padre.lado;
            const hijo = agregar(t.to, padre.x + lado * PASO_RAMA, { tramo: t, padre, principal: false, lado });
            ramas(hijo);
        });
    };

    nodos.forEach((n, i) => {
        if (pos.has(n)) return;
        const p = agregar(n, 0, { tramo: i > 0 ? enlaces[i - 1] : null, hueco: i > 0 && !enlaces[i - 1], principal: true, lado: 0 });
        ramas(p);
    });
    // Desvíos que salen de una plataforma que ya no está en la red
    desvios.forEach(t => {
        if (pos.has(t.from)) return;
        const lado = sentido(t);
        const suelto = agregar(t.from, lado * PASO_RAMA, { tramo: null, principal: false, suelto: true, lado });
        ramas(suelto);
    });

    puntos.forEach(p => {
        p.detalle = p.tramo ? detalleTramo(p.tramo) : p.principal && p === puntos[0] ? 'Inicio de la vía' : p.hueco ? 'Sin tramo' : '';
    });
    // Lo que ocupa cada plataforma con su texto, para que todo quepa sin cortarse
    const limites = puntos.map(p => {
        const texto = 16 + Math.max(anchoNombre(p.nombre), anchoDetalle(p.detalle)) + 6;
        return ladoTexto(p) < 0 ? [p.x - texto, p.x + 24] : [p.x - 24, p.x + texto];
    });
    const x0 = Math.ceil(-Math.min(...limites.map(l => l[0])));
    puntos.forEach(p => { p.x += x0; });
    const ancho = Math.ceil(x0 + Math.max(...limites.map(l => l[1])));

    // La columna principal: un segmento entre cada par de plataformas seguidas
    const principales = puntos.filter(p => p.principal);
    const columna = principales.slice(1).map((p, i) => ({ desde: principales[i], hasta: p, tramo: p.tramo, hueco: p.hueco }));
    return { puntos, columna, x0, ancho, alto: MARGEN_Y * 2 + (fila - 1) * FILA };
};

// Rama: diagonal corta desde la plataforma de salida (la Y) y luego horizontal
const caminoRama = (padre, hijo) => {
    const xCodo = padre.x + hijo.lado * RAMA_SUBIDA;
    return `M ${padre.x} ${padre.y} L ${xCodo} ${hijo.y} L ${hijo.x} ${hijo.y}`;
};

export const MapaVia = ({ tramos, ruta, origen, destino, onElegir }) => {
    if (!tramos.length) return null;
    const { puntos, columna, x0, ancho, alto } = armarMapa(tramos);
    const hayRuta = ruta.valida && !ruta.sinConexion;
    const enRuta = t => hayRuta && t && ruta.ids.has(t._id);
    const estadoNodo = p => (ruta.valida && !p.esY && (p.nombre === origen || p.nombre === destino))
        ? 'extremo'
        : (hayRuta && !ruta.nodos.has(p.nombre) ? 'fuera' : '');
    const claseLinea = (t, extra = '') => [
        'mapa__linea', extra,
        t ? claseEstado(t) : 'mapa__linea--hueco',
        enRuta(t) && 'mapa__linea--ruta',
        hayRuta && !enRuta(t) && 'mapa__linea--fuera',
    ].filter(Boolean).join(' ');

    return (
        <div className="mapa">
            {/* Si no cabe, se achica hasta un 80 %; más ancho que eso, se desplaza de lado */}
            <svg className="mapa__svg" viewBox={`0 0 ${ancho} ${alto}`} role="img"
                style={{ width: '100%', maxWidth: ancho, minWidth: Math.round(ancho * 0.8), height: 'auto' }}
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
                    const estado = estadoNodo(p);
                    const izquierda = ladoTexto(p) < 0;
                    const xTexto = izquierda ? p.x - 16 : p.x + 16;
                    const ancla = izquierda ? 'end' : 'start';
                    const textos = (<>
                        <text className={`mapa__nombre${p.esY ? ' mapa__nombre--y' : ''}`} x={xTexto} y={p.y - 2} textAnchor={ancla}>{p.nombre}</text>
                        {p.detalle && <text className="mapa__detalle" x={xTexto} y={p.y + 13} textAnchor={ancla}>{p.detalle}</text>}
                    </>);
                    // Una Y no es una plataforma: no se elige como destino
                    if (p.esY) {
                        return (
                            <g key={p.nombre} className={`mapa__plataforma mapa__plataforma--y${estado ? ` mapa__plataforma--${estado}` : ''}`}>
                                <title>{`${p.nombre} (bifurcación en Y)`}</title>
                                <circle className="mapa__punto mapa__punto--y" cx={p.x} cy={p.y} r="6" />
                                {textos}
                            </g>
                        );
                    }
                    return (
                        <g key={p.nombre} className={`mapa__plataforma${estado ? ` mapa__plataforma--${estado}` : ''}`}
                            onClick={() => onElegir?.(p.nombre)} role="button" tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter') onElegir?.(p.nombre); }}>
                            <title>{p.nombre}</title>
                            <circle className="mapa__toque" cx={p.x} cy={p.y} r="22" />
                            <circle className={`mapa__punto${p.principal ? ' mapa__punto--principal' : ''}`} cx={p.x} cy={p.y} r={p.principal ? 12 : 10} />
                            <text className={`mapa__inicial${nombreCorto(p.nombre).length > 2 ? ' mapa__inicial--larga' : ''}`}
                                x={p.x} y={p.y + 3.5} textAnchor="middle">{nombreCorto(p.nombre)}</text>
                            {textos}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
