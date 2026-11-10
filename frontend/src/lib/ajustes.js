import api from '../api/axios.js';

// Ajustes generales que decide el administrador. Se guarda la última copia en el
// dispositivo para que, sin conexión, se siga respetando lo que el admin eligió.
const CLAVE = 'flujo_ajustes';
const POR_DEFECTO = { distanciasEditores: 'todos' };

export const leerAjustesLocales = () => {
    try { return { ...POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') }; }
    catch { return POR_DEFECTO; }
};

const guardarLocal = ajustes => {
    try { localStorage.setItem(CLAVE, JSON.stringify(ajustes)); } catch { /* sin espacio */ }
};

export const cargarAjustes = async () => {
    const { data } = await api.get('/ajustes');
    const ajustes = { ...POR_DEFECTO, ...data };
    guardarLocal(ajustes);
    return ajustes;
};

// Solo el admin, y solo con conexión
export const guardarEditoresDistancias = async editores => {
    const { data } = await api.put('/ajustes/distancias', { editores });
    guardarLocal({ ...leerAjustesLocales(), ...data });
    return data.distanciasEditores;
};

// Misma regla que el servidor (backend/src/controllers/ajuste.controller.js)
export const puedeEditarDistancias = ({ isAdmin, isSupervisor, isPending }, editores) => {
    if (isAdmin) return true;
    if (isPending) return false;
    if (editores === 'admin') return false;
    if (editores === 'supervisores') return isSupervisor;
    return true;
};

export const OPCIONES_EDITORES_DISTANCIAS = [
    { id: 'todos', label: 'Todos los usuarios', desc: 'Cualquier cuenta activa puede agregar, editar y eliminar tramos y cambiar el estado de la vía.' },
    { id: 'supervisores', label: 'Supervisores y administradores', desc: 'Los operadores solo pueden ver las distancias y usar la calculadora.' },
    { id: 'admin', label: 'Solo administradores', desc: 'Nadie más puede modificar la vía.' },
];
