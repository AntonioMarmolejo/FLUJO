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

// ── Varios destinos ──────────────────────────────────────
// En el campo DESTINO van separados por coma: "PAD-C, Pozo 3, PAD-L"
export const separarDestinos = texto => String(texto || '').split(/\s*[,;]\s*/).map(s => s.trim()).filter(Boolean);
export const unirDestinos = lista => lista.join(', ');

// Recorrido desde `origen` pasando por cada parada en orden, con Distancias.
// Devuelve los minutos de cada tramo (null si Distancias no tiene esa ruta), el
// total (null si falta algún tramo) y las garitas por las que pasa con los minutos
// acumulados desde la salida (la primera vez que llega a cada una).
export const recorrido = ({ tramos = [], bloque, origen, paradas = [] }) => {
    const garitas = garitasDelBloque(bloque);
    const plataformas = listarPlataformas(tramos);
    const nodo = g => plataformas.find(n => claveLugar(n) === claveLugar(g));
    const garitaDe = n => garitas.find(x => claveLugar(x) === claveLugar(n));
    let actual = nodo(origen), acumulado = 0, conocido = !!actual;
    const legs = [], tiempos = [];
    const anotar = (g, min) => { if (g && g !== origen && !tiempos.some(t => t.garita === g)) tiempos.push({ garita: g, min }); };
    for (const parada of paradas) {
        const destino = nodo(parada);
        let min = null;
        if (conocido && destino && destino === actual) min = 0;
        else if (conocido && destino) {
            const ruta = calcularRuta(tramos, actual, destino);
            if (ruta?.valida && !ruta.sinConexion) {
                let a = actual, parcial = 0;
                for (const t of ruta.tramos) {
                    a = t.from === a ? t.to : t.from;
                    // Un tramo cerrado no tiene tiempo estimado: se cuenta el peor caso
                    parcial += minutos(t) ?? (t.km / t.vmin) * 60;
                    anotar(garitaDe(a), Math.round(acumulado + parcial));
                }
                acumulado += parcial;
                min = Math.round(parcial);
                actual = destino;
            }
        }
        if (min == null) conocido = false;
        anotar(garitaDeLugar(bloque, parada), conocido ? Math.round(acumulado) : null);
        legs.push({ parada, min });
    }
    return { legs, total: conocido && legs.length ? Math.round(acumulado) : null, tiempos };
};

// Tránsito de una SALIDA con uno o varios destinos. Aparece en EN CAMINO de cada
// garita de la ruta; las garitas elegidas como destino son paradas (no "de paso").
// El destino del tránsito es la última garita elegida. Null si ninguna es otra garita.
export const armarTransitoParadas = ({ tramos = [], bloque, puesto, origen, destinos = [], salidaAt = Date.now() }) => {
    const desde = origen || garitaDePuesto(bloque, puesto);
    if (!desde) return null;
    const paradas = [...new Set(destinos.map(d => garitaDeLugar(bloque, d)).filter(g => g && g !== desde))];
    if (!paradas.length) return null;
    const hasta = paradas[paradas.length - 1];
    // La ruta llega hasta la última parada que es garita (lo que sigue no tiene EN CAMINO)
    let ultima = -1;
    destinos.forEach((d, i) => { if (garitaDeLugar(bloque, d) === hasta) ultima = i; });
    const { tiempos, total } = recorrido({ tramos, bloque, origen: desde, paradas: destinos.slice(0, ultima + 1) });
    // El destino va al final, con el tiempo de cuando llega como destino (si pasó
    // antes por ahí camino a otra parada, cuenta la llegada final)
    const resto = tiempos.filter(t => t.garita !== hasta);
    return { origen: desde, destino: hasta, salidaAt, tiempos: [...resto, { garita: hasta, min: total }], paradas };
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
