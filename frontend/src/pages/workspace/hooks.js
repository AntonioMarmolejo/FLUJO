import { useState, useEffect, useRef } from 'react';

// Tema día / noche, guardado en el dispositivo
export const useTema = () => {
    const [theme, setTheme] = useState(() => localStorage.getItem('flujo-theme') || 'dark');
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('flujo-theme', theme);
    }, [theme]);
    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
    return [theme, toggleTheme];
};

// Pregunta antes de salir con el botón/gesto de retroceso (celulares).
// Sin esto, dos retrocesos seguidos sacaban al usuario de /workspace sin
// avisar y, por el bug ya corregido en ProtectedRoute, eso se sentía como
// un cierre de sesión. Truco estándar: se "atasca" un estado extra en el
// historial; al detectar un retroceso se vuelve a atascar (cancelándolo)
// y se muestra el aviso. Si el usuario confirma, se deja pasar el
// siguiente retroceso real — nunca se llama a logout(), la sesión y el
// vault quedan intactos para cuando vuelva a abrir la app.
export const useConfirmarSalida = () => {
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const exitingRef = useRef(false);

    useEffect(() => {
        window.history.pushState({ __exitGuard: true }, '', window.location.href);
        const handlePopState = () => {
            if (exitingRef.current) return;
            window.history.pushState({ __exitGuard: true }, '', window.location.href);
            setShowExitConfirm(true);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const confirmarSalida = () => {
        exitingRef.current = true;
        setShowExitConfirm(false);
        window.history.go(-2);
    };

    return [showExitConfirm, setShowExitConfirm, confirmarSalida];
};

// true cuando la página bajó más de `limite` px (para el botón de subir)
export const useBajoDe = limite => {
    const [bajo, setBajo] = useState(false);
    useEffect(() => {
        const onScroll = () => setBajo(window.scrollY > limite);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [limite]);
    return bajo;
};

// Con la búsqueda activa (la de Movimientos o la de Plataformas y
// Nominativos), al bajar se oculta la fila de íconos (menú, usuario,
// día/noche, lupa) y la barra de búsqueda sube a ocupar ese espacio; al
// subir un poco vuelve a aparecer la fila para poder desactivar la
// búsqueda desde la lupa.
export const useOcultarAlBajar = activo => {
    const [oculto, setOculto] = useState(false);

    useEffect(() => {
        if (!activo) { setOculto(false); return; }
        const UMBRAL = 24;          // recorrido mínimo en un mismo sentido para cambiar
        const ZONA_SUPERIOR = 40;   // cerca del inicio la fila siempre se ve
        const ALTURA_FILA = 80;     // lo que mide la fila de íconos (más margen)
        const BLOQUEO_MS = 350;     // la transición de la fila dura 0.22 s
        let ultimoY = window.scrollY;
        let acumulado = 0;
        let oculto = false;
        let bloqueadoHasta = 0;

        const cambiar = valor => {
            if (oculto === valor) return;
            oculto = valor;
            setOculto(valor);
            // Ocultar o mostrar la fila cambia el alto de la página y el
            // navegador corrige el scroll por su cuenta. Ese movimiento no es
            // del usuario: si se tomara en cuenta, la fila volvería a cambiar
            // y quedaría parpadeando.
            bloqueadoHasta = performance.now() + BLOQUEO_MS;
            acumulado = 0;
        };

        const onScroll = () => {
            const y = window.scrollY;
            if (performance.now() < bloqueadoHasta) { ultimoY = y; return; }
            const delta = y - ultimoY;
            ultimoY = y;
            if (y < ZONA_SUPERIOR) { cambiar(false); return; }
            // Se suma el recorrido mientras siga en el mismo sentido; al
            // cambiar de sentido se empieza a contar de nuevo.
            acumulado = Math.sign(delta) === Math.sign(acumulado) ? acumulado + delta : delta;
            // Solo se oculta con margen suficiente: si no, al quitar la fila
            // el scroll caería dentro de la zona superior y volvería a salir.
            if (acumulado > UMBRAL && y > ZONA_SUPERIOR + ALTURA_FILA) cambiar(true);
            else if (acumulado < -UMBRAL) cambiar(false);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [activo]);

    return oculto;
};

// Lleva la vista hasta el elemento [atributo="id"] y lo resalta un momento.
// Espera a que la lista esté visible; luego limpia el id con `limpiar(null)`.
export const useResaltar = (id, visible, atributo, limpiar) => {
    useEffect(() => {
        if (!id || !visible) return;
        const t = setTimeout(() => {
            const el = document.querySelector(`[${atributo}="${id}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('flash-highlight');
                setTimeout(() => el.classList.remove('flash-highlight'), 1400);
            }
            limpiar(null);
        }, 200);
        return () => clearTimeout(t);
    }, [id, visible, atributo, limpiar]);
};
