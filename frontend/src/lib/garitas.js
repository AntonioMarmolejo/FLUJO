import { calcularRuta, listarPlataformas, minutos } from '../pages/workspace/calculoVia';

// Garitas con EN CAMINO. Cada puesto corresponde a una plataforma de la página
// Distancias, con el mismo nombre (solo la Garita Principal se llama EPF ahí).
// Un vehículo aparece en EN CAMINO como máximo durante EN_CAMINO_MIN minutos.
export const EN_CAMINO_MIN = 60;

const GARITAS = {
    '12': {
        'Guardia Garita Principal EPF': 'EPF',
        'Guardia PAD-C': 'PAD-C',
        'Guardia PAD-E': 'PAD-E',
        'Guardia PAD Puerto Edén': 'Puerto Edén',
        'Guardia PAD-L': 'PAD-L',
        'Guardia Puerto Nuevo': 'Puerto Nuevo',
    },
};

// Para comparar nombres escritos de distinta forma:
// "PAD-C" = "PAD C" = "pad c"; "Puerto Edén" = "Puerto Eden"; "Pto. Nuevo" = "Puerto Nuevo"
export const claveLugar = s => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bpto\b/g, 'puerto')
    .replace(/[^a-z0-9]/g, '');

// Garita de un puesto (null si ese puesto no tiene EN CAMINO)
export const garitaDePuesto = (bloque, puesto) => GARITAS[bloque]?.[puesto] || null;

export const garitasDelBloque = bloque => Object.values(GARITAS[bloque] || {});

// La garita que corresponde a un texto de destino ("Pto. Nuevo" → "Puerto Nuevo"), o null
export const garitaDeLugar = (bloque, texto) => {
    const k = claveLugar(texto);
    return k ? garitasDelBloque(bloque).find(g => claveLugar(g) === k) || null : null;
};

// Tránsito de una SALIDA hacia otra garita: la ruta según Distancias y los minutos
// esperados desde la salida hasta cada garita por la que pasa (la última es el
// destino). Sin ruta en Distancias, el destino queda con tiempo desconocido.
// Devuelve null si la salida no va de una garita a otra.
export const armarTransito = ({ tramos = [], bloque, puesto, origen, destino, salidaAt = Date.now() }) => {
    const desde = origen || garitaDePuesto(bloque, puesto);
    const hasta = garitaDeLugar(bloque, destino);
    if (!desde || !hasta || desde === hasta) return null;

    const garitas = garitasDelBloque(bloque);
    const plataformas = listarPlataformas(tramos);
    const nodo = g => plataformas.find(n => claveLugar(n) === claveLugar(g));
    const nodoOrigen = nodo(desde), nodoDestino = nodo(hasta);

    let tiempos = [{ garita: hasta, min: null }];
    const ruta = nodoOrigen && nodoDestino ? calcularRuta(tramos, nodoOrigen, nodoDestino) : null;
    if (ruta?.valida && !ruta.sinConexion) {
        tiempos = [];
        let acumulado = 0, actual = nodoOrigen;
        for (const t of ruta.tramos) {
            const siguiente = t.from === actual ? t.to : t.from;
            // Un tramo cerrado no tiene tiempo estimado: se cuenta el peor caso
            acumulado += minutos(t) ?? (t.km / t.vmin) * 60;
            actual = siguiente;
            const g = garitas.find(x => claveLugar(x) === claveLugar(siguiente));
            if (g && g !== desde) tiempos.push({ garita: g, min: Math.round(acumulado) });
        }
    }
    return { origen: desde, destino: hasta, salidaAt, tiempos };
};

// Minutos esperados hasta una garita de la ruta (null si no se conocen)
export const minutosHasta = (transito, garita) =>
    transito?.tiempos?.find(t => t.garita === garita)?.min ?? null;

// "HH:MM" de hoy en el momento real (si queda en el futuro, era de ayer: turno nocturno)
export const momentoDeHora = (hhmm, ahora = Date.now()) => {
    const [h, m] = String(hhmm || '').split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return ahora;
    const d = new Date(ahora);
    d.setHours(h, m, 0, 0);
    if (d.getTime() > ahora + 60e3) d.setDate(d.getDate() - 1);
    return d.getTime();
};

// 754 s → "12:34"; 3 754 s → "1:02:34"
export const cronometro = seg => {
    const s = Math.max(0, Math.floor(seg));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    const dos = n => String(n).padStart(2, '0');
    return h ? `${h}:${dos(m)}:${dos(r)}` : `${dos(m)}:${dos(r)}`;
};
