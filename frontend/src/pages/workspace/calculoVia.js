// Cálculos de la vía de lastre. La red tiene una vía principal (los tramos
// 'principal', en orden) y desvíos ('desvio') que salen de cualquier plataforma
// hacia otra. Sin React, para reutilizarlos fuera de Distancias (EN CAMINO).

export const ESTADOS = ['Buena', 'Regular', 'Mala', 'Cerrada'];

export const REGLA_ESTADO = {
    Buena: 'Velocidad máxima',
    Regular: 'Promedio entre mínima y máxima',
    Mala: 'Velocidad mínima',
    Cerrada: 'Sin paso · no se estima tiempo',
};

// Velocidad con la que se recorre el tramo según el estado de la vía (null si está cerrada)
export const velocidad = (t, estado = t.cond) =>
    estado === 'Buena' ? t.vmax
        : estado === 'Regular' ? (t.vmin + t.vmax) / 2
            : estado === 'Mala' ? t.vmin
                : null;

// Minutos para recorrer el tramo (null si está cerrado)
export const minutos = (t, estado) => {
    const v = velocidad(t, estado);
    return v ? (t.km / v) * 60 : null;
};

export const formatoTiempo = m => {
    if (m == null) return '—';
    m = Math.round(m);
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
};

export const formatoNumero = n => Number(n).toLocaleString('es', { maximumFractionDigits: 1 });

// "Plataforma A" → "A"; nombres largos → sus dos primeras letras
export const nombreCorto = nombre => {
    const s = String(nombre).replace(/^Plataforma\s+/i, '');
    return s.length > 2 ? s.slice(0, 2).toUpperCase() : s;
};

// Acepta milisegundos o la fecha del servidor (texto ISO)
export const hace = fecha => {
    const d = Date.now() - new Date(fecha).getTime();
    const m = Math.floor(d / 6e4), h = Math.floor(d / 36e5), D = Math.floor(d / 864e5);
    if (m < 1) return 'hace un momento';
    if (m < 60) return `hace ${m} min`;
    if (h < 24) return `hace ${h} h`;
    return D === 1 ? 'hace 1 día' : `hace ${D} días`;
};

// "Antonio Marmolejo" → "A. Marmolejo"
export const nombreFirma = nombre => {
    const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
    if (partes.length < 2) return partes[0] || '—';
    return `${partes[0][0].toUpperCase()}. ${partes[partes.length - 1]}`;
};

export const esDesvio = t => t.tipo === 'desvio';
const porOrden = (a, b) => (a.orden ?? 0) - (b.orden ?? 0);

// Vía principal: los tramos en orden. Si uno no empieza donde terminó el anterior,
// queda un hueco (null): la vía está interrumpida ahí.
export const armarPrincipal = tramos => {
    const nodos = [], enlaces = [];
    tramos.filter(t => !esDesvio(t)).sort(porOrden).forEach(t => {
        if (!nodos.length) nodos.push(t.from);
        else if (nodos[nodos.length - 1] !== t.from) { enlaces.push(null); nodos.push(t.from); }
        enlaces.push(t);
        nodos.push(t.to);
    });
    return { nodos, enlaces };
};

// Desvíos en el orden en que aparecen al recorrer la vía principal: cada uno
// después de la plataforma de la que sale (y los que salen de él, a continuación)
export const ordenarDesvios = (tramos, nodosPrincipal) => {
    const desvios = tramos.filter(esDesvio).sort(porOrden);
    const resultado = [], usados = new Set();
    const visitar = nodo => {
        desvios.filter(t => t.from === nodo && !usados.has(t._id)).forEach(t => {
            usados.add(t._id);
            resultado.push(t);
            visitar(t.to);
        });
    };
    nodosPrincipal.forEach(visitar);
    // Desvíos que salen de una plataforma que ya no está conectada a la red
    desvios.forEach(t => {
        if (usados.has(t._id)) return;
        usados.add(t._id);
        resultado.push(t);
        visitar(t.to);
    });
    return resultado;
};

// Todas las plataformas: la vía principal en orden y, tras cada una, las de sus desvíos
export const listarPlataformas = tramos => {
    const { nodos } = armarPrincipal(tramos);
    const desvios = tramos.filter(esDesvio).sort(porOrden);
    const lista = [], vistos = new Set();
    const agregar = n => {
        if (vistos.has(n)) return;
        vistos.add(n);
        lista.push(n);
        desvios.filter(t => t.from === n).forEach(t => agregar(t.to));
    };
    nodos.forEach(agregar);
    desvios.forEach(t => { agregar(t.from); agregar(t.to); });
    return lista;
};

// Camino más corto en número de tramos entre dos plataformas (búsqueda en anchura)
const buscarCamino = (tramos, origen, destino) => {
    const previo = new Map([[origen, null]]);
    const cola = [origen];
    while (cola.length) {
        const nodo = cola.shift();
        if (nodo === destino) break;
        for (const t of tramos) {
            const vecino = t.from === nodo ? t.to : t.to === nodo ? t.from : null;
            if (vecino != null && !previo.has(vecino)) {
                previo.set(vecino, { nodo, tramo: t });
                cola.push(vecino);
            }
        }
    }
    if (!previo.has(destino)) return null;
    const camino = [];
    for (let n = destino; previo.get(n); n = previo.get(n).nodo) camino.unshift(previo.get(n).tramo);
    return camino;
};

// Tiempo de viaje entre dos plataformas, por la vía principal y los desvíos que haga falta
export const calcularRuta = (tramos, origen, destino) => {
    const plataformas = listarPlataformas(tramos);
    if (!plataformas.includes(origen) || !plataformas.includes(destino) || origen === destino) {
        return { valida: false, motivo: plataformas.length < 2 ? 'Agrega tramos para calcular tiempos.' : 'Elige un origen y un destino distintos.' };
    }
    const camino = buscarCamino(tramos, origen, destino);
    if (!camino) {
        return { valida: true, sinConexion: true, tramos: [], cantidad: 0, cerrados: [], km: null, estimado: null, mejor: null, peor: null, nodos: new Set([origen, destino]) };
    }
    const nodos = new Set([origen]);
    camino.forEach(t => { nodos.add(t.from); nodos.add(t.to); });
    const cerrados = camino.filter(t => t.cond === 'Cerrada');
    return {
        valida: true,
        sinConexion: false,
        tramos: camino,
        cantidad: camino.length,
        cerrados,
        nodos,
        km: camino.reduce((a, t) => a + t.km, 0),
        estimado: cerrados.length ? null : camino.reduce((a, t) => a + minutos(t), 0),
        mejor: camino.reduce((a, t) => a + (t.km / t.vmax) * 60, 0),
        peor: camino.reduce((a, t) => a + (t.km / t.vmin) * 60, 0),
    };
};

// Tras agregar, editar o borrar: origen y destino deben seguir existiendo y ser distintos
export const ajustarExtremos = (tramos, origen, destino) => {
    const plataformas = listarPlataformas(tramos);
    const { nodos } = armarPrincipal(tramos);
    const o = plataformas.includes(origen) ? origen : (plataformas[0] || '');
    const finPrincipal = nodos[nodos.length - 1] || plataformas[plataformas.length - 1] || '';
    const d = plataformas.includes(destino) && destino !== o ? destino : (finPrincipal !== o ? finPrincipal : (plataformas.find(p => p !== o) || ''));
    return { origen: o, destino: d };
};

// Plataformas que cuelgan de `nodo` por sus desvíos (y los desvíos de esos).
// Sirve para no mover un desvío a una de sus propias ramas.
export const ramasDe = (tramos, nodo) => {
    const resultado = new Set();
    const visitar = n => tramos.filter(t => esDesvio(t) && t.from === n).forEach(t => {
        if (!resultado.has(t.to)) { resultado.add(t.to); visitar(t.to); }
    });
    visitar(nodo);
    return resultado;
};

// Plataformas que quedarían sin conexión con la vía principal si se quita el tramo
export const quedanAisladas = (tramos, id) => {
    const resto = tramos.filter(t => t._id !== id);
    const antes = new Set(listarPlataformas(tramos));
    const despues = listarPlataformas(resto);
    const { nodos } = armarPrincipal(resto);
    const inicio = nodos[0] ?? despues[0];
    if (inicio == null) return [];
    const alcanzables = new Set([inicio]);
    const cola = [inicio];
    while (cola.length) {
        const n = cola.shift();
        resto.forEach(t => {
            const v = t.from === n ? t.to : t.to === n ? t.from : null;
            if (v != null && !alcanzables.has(v)) { alcanzables.add(v); cola.push(v); }
        });
    }
    return despues.filter(p => antes.has(p) && !alcanzables.has(p));
};

const numero = x => parseFloat(String(x).trim().replace(',', '.'));

// Valida el formulario de tramo. Devuelve { errores } o { datos } listos para guardar.
// `existentes`: plataformas que ya hay en la red y que el nombre nuevo no puede repetir.
export const validarTramo = (form, existentes) => {
    const from = form.from.trim(), to = form.to.trim();
    const km = numero(form.km), vmin = numero(form.vmin), vmax = numero(form.vmax);
    const repetida = nombre => existentes.some(n => n.toLowerCase() === nombre.toLowerCase());
    const e = {};
    if (!from) e.from = form.tipo === 'desvio' ? 'Elige de qué plataforma sale el desvío.' : 'Indica la plataforma de inicio.';
    else if (form.revisarFrom && repetida(from)) e.from = 'Esta plataforma ya está en la vía.';
    if (!to) e.to = 'Indica la plataforma de destino.';
    else if (to.toLowerCase() === from.toLowerCase()) e.to = 'Debe ser distinta de la plataforma de inicio.';
    else if (form.revisarTo && repetida(to)) e.to = 'Esta plataforma ya está en la vía.';
    if (!(km > 0)) e.km = 'La distancia debe ser mayor que 0.';
    if (!(vmin > 0)) e.vmin = 'Ingresa una velocidad válida.';
    if (!(vmax > 0)) e.vmax = 'Ingresa una velocidad válida.';
    else if (vmin > 0 && vmin >= vmax) e.vmax = 'Debe ser mayor que la mínima.';
    return Object.keys(e).length ? { errores: e } : { datos: { from, to, km, vmin, vmax } };
};

// Edita un tramo. Si cambia el nombre de una plataforma, se cambia en toda la red.
// En un desvío, cambiar "Desde" es moverlo a otra plataforma, no renombrarla.
// Devuelve solo los tramos que cambiaron.
export const editarTramo = (tramos, id, datos) => {
    const viejo = tramos.find(t => t._id === id);
    const renombres = {};
    if (!esDesvio(viejo) && datos.from !== viejo.from) renombres[viejo.from] = datos.from;
    if (datos.to !== viejo.to) renombres[viejo.to] = datos.to;
    const cambiados = [];
    tramos.forEach(t => {
        const nuevo = t._id === id
            ? { ...t, ...datos }
            : { ...t, from: renombres[t.from] ?? t.from, to: renombres[t.to] ?? t.to };
        if (nuevo.from !== t.from || nuevo.to !== t.to || t._id === id) cambiados.push(nuevo);
    });
    return cambiados;
};
