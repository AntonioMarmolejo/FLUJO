import { claveLugar } from './garitas.js';

// Etiquetas de destino que cada guardia crea con anterioridad ("Pozo 3", "Campamento"…)
// para elegirlas con un toque en el formulario. Se guardan solo en este teléfono.

const CLAVE = 'flujo_etiquetas_destino';
const MAXIMO = 40;

export const leerEtiquetas = () => {
    try {
        const lista = JSON.parse(localStorage.getItem(CLAVE));
        return Array.isArray(lista) ? lista.filter(e => typeof e === 'string' && e.trim()) : [];
    } catch {
        return [];
    }
};

const guardar = lista => {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch { /* sin espacio o bloqueado */ }
    return lista;
};

// Agrega al final si no existe ya otra escrita igual ("Pozo 3" = "pozo 3")
export const agregarEtiqueta = nombre => {
    const limpio = String(nombre || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const lista = leerEtiquetas();
    if (!limpio || lista.some(e => claveLugar(e) === claveLugar(limpio))) return lista;
    return guardar([...lista, limpio].slice(-MAXIMO));
};

export const borrarEtiqueta = nombre => guardar(leerEtiquetas().filter(e => claveLugar(e) !== claveLugar(nombre)));
