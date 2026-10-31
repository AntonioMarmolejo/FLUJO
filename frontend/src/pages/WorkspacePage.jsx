import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    encolarMovimiento,
    subirMovimientoPendiente,
    cancelarMovimientoPendiente,
    getPendingMovimientos,
    syncPendingMovimientos,
    syncPendingEdiciones,
    encolarBorrado,
    cancelarBorradoEncolado,
    getBorradosPendientesIds,
    syncPendingBorrados,
    guardarTurnoLocal,
    leerTurnoLocal,
} from '../lib/syncEngine.js';
import '../styles/WorkspacePage.css';
import { PantallaExtensiones } from './workspace/Extensiones';
import { PantallaFlujos } from './workspace/Flujos';
import { DrawerMenu, ModalComentario } from './workspace/MenuLateral';
import {
    ModalAgregar,
    ModalBitacoraDetalle,
    ModalDetalle,
    ModalEditHora,
    ModalRegistrarIngreso,
    ModalRegistroConfig,
    MovCard,
} from './workspace/Movimientos';
import { PantallaAvance } from './workspace/PantallaAvance';
import { PantallaPerfil } from './workspace/Perfil';
import { PantallaPersonas } from './workspace/Personas';
import { PantallaPlacasDB } from './workspace/Placas';
import { PantallaUtilidades } from './workspace/Utilidades';
import { AccesoRestringido, PanelActivacion, PantallaStub, ScrollTopButton } from './workspace/comunes';
import {
    DASH_FILTROS,
    DRAWER_TABS,
    DRAWER_TITLES,
    PANEL_LABELS,
    PUESTO_SALIDA_DEFAULT,
    PUESTO_UBICACION,
    addMouseSwipe,
    buildStats,
    exportMovimientos,
    generarNarrativa,
    getRegistroConfig,
    getRegistroConfigKey,
    getTurnoFecha,
    movCoincideBusqueda,
    movToText,
} from './workspace/helpers';
import { IconArrowLeft, IconCopy, IconMinus, IconPencil, IconShare, IconUserCircle } from './workspace/iconos';

const StatsChart = lazy(() => import('../components/StatsChart.jsx'));

// ── Dashboard principal ───────────────────────────────────
const WorkspacePage = () => {
    const { user, logout, isAdmin, isPending, hasPermiso, permisosPanel, tieneBloque } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [theme, setTheme] = useState(() => localStorage.getItem('flujo-theme') || 'dark');
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('flujo-theme', theme);
    }, [theme]);
    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    // Pregunta antes de salir con el botón/gesto de retroceso (celulares).
    // Sin esto, dos retrocesos seguidos sacaban al usuario de /workspace sin
    // avisar y, por el bug ya corregido en ProtectedRoute, eso se sentía como
    // un cierre de sesión. Truco estándar: se "atasca" un estado extra en el
    // historial; al detectar un retroceso se vuelve a atascar (cancelándolo)
    // y se muestra el aviso. Si el usuario confirma, se deja pasar el
    // siguiente retroceso real — nunca se llama a logout(), la sesión y el
    // vault quedan intactos para cuando vuelva a abrir la app.
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

    const [tabActiva, setTabActiva] = useState('inicio');
    const [dashCollapsed, setDashCollapsed] = useState(true);
    const [movCollapsed, setMovCollapsed] = useState(false);
    const [chartCollapsed, setChartCollapsed] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 280);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const [diasActivos, setDiasActivos] = useState(0);
    const [movimientos, setMovimientos] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [detailMov, setDetailMov] = useState(null);
    const [editMov, setEditMov] = useState(null);

    const [showDrawer, setShowDrawer] = useState(false);
    const [showComentario, setShowComentario] = useState(false);
    const [lastDrawerTab, setLastDrawerTab] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Qué utilidad está abierta dentro de la pestaña Utilidades (lo reporta
    // PantallaUtilidades) y el estado de SU propia búsqueda — se maneja acá
    // arriba, no dentro de la pantalla, para poder mostrar la lupa en el
    // top bar global (reemplazando el ícono de día/noche) y que la barra de
    // búsqueda quede pegada arriba al bajar, igual que en Movimientos.
    const [utilidadActiva, setUtilidadActiva] = useState(null);
    const [platSearchShow, setPlatSearchShow] = useState(false);
    const [platSearchQuery, setPlatSearchQuery] = useState('');
    const handleUtilidadDetalleChange = id => {
        setUtilidadActiva(id);
        if (id !== 'plataformas') { setPlatSearchShow(false); setPlatSearchQuery(''); }
    };

    // Con la búsqueda activa (la de Movimientos o la de Plataformas y
    // Nominativos), al bajar se oculta la fila de íconos (menú, usuario,
    // día/noche, lupa) y la barra de búsqueda sube a ocupar ese espacio; al
    // subir un poco vuelve a aparecer la fila para poder desactivar la
    // búsqueda desde la lupa.
    // Búsqueda de Flujos → General (su barra también vive en la barra superior)
    const [flujosGenQuery, setFlujosGenQuery] = useState('');
    const [flujosGenCampo, setFlujosGenCampo] = useState('todos');
    const [flujosBusquedaVisible, setFlujosBusquedaVisible] = useState(false);
    const flujosBusquedaActiva = tabActiva === 'flujos' && flujosBusquedaVisible;
    const searchBarActive = showSearch
        || (tabActiva === 'utilidades' && utilidadActiva === 'plataformas' && platSearchShow)
        || flujosBusquedaActiva;
    const [topbarIconsHidden, setTopbarIconsHidden] = useState(false);

    useEffect(() => {
        if (!searchBarActive) { setTopbarIconsHidden(false); return; }
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
            setTopbarIconsHidden(valor);
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
    }, [searchBarActive]);

    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [vistaInicio, setVistaInicio] = useState('movimientos');
    const [registroDetailMov, setRegistroDetailMov] = useState(null);
    const [showRegistroConfig, setShowRegistroConfig] = useState(false);
    // Config de narrativa por puesto (se carga cuando llega turnoActivo)
    const [registroConfig, setRegistroConfig] = useState({});
    const [bitDetailIdx, setBitDetailIdx] = useState(null);
    const [swipedRegId, setSwipedRegId] = useState(null);
    const regSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });
    const [swipedBitMainIdx, setSwipedBitMainIdx] = useState(null);
    const bitMainSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });
    const [expandedBitSet, setExpandedBitSet] = useState(new Set());
    const toggleBitCollapse = i => setExpandedBitSet(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
    const [movSort, setMovSort] = useState('desc');
    const [regSort, setRegSort] = useState('asc');
    const [detailMovIdx, setDetailMovIdx] = useState(null);
    const [swipedMovId, setSwipedMovId] = useState(null);
    const movSwipeRef = useRef({ startX: 0, startY: 0, moved: false, vertScroll: false });
    const [editHoraMov, setEditHoraMov] = useState(null);
    const [editIngresoBit, setEditIngresoBit] = useState(null);
    const [highlightMovId, setHighlightMovId] = useState(null);
    const [highlightRegId, setHighlightRegId] = useState(null);

    useEffect(() => {
        if (!highlightRegId || vistaInicio !== 'registro') return;
        const t = setTimeout(() => {
            const el = document.querySelector(`[data-regid="${highlightRegId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('flash-highlight');
                setTimeout(() => el.classList.remove('flash-highlight'), 1400);
            }
            setHighlightRegId(null);
        }, 200);
        return () => clearTimeout(t);
    }, [highlightRegId, vistaInicio]);

    useEffect(() => {
        if (!highlightMovId || vistaInicio !== 'movimientos') return;
        const t = setTimeout(() => {
            const el = document.querySelector(`[data-movid="${highlightMovId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('flash-highlight');
                setTimeout(() => el.classList.remove('flash-highlight'), 1400);
            }
            setHighlightMovId(null);
        }, 200);
        return () => clearTimeout(t);
    }, [highlightMovId, vistaInicio]);

    const stats = useMemo(
        () => movimientos.length > 0 ? buildStats(movimientos, diasActivos) : null,
        [movimientos, diasActivos]
    );

    const movsFiltrados = useMemo(() => {
        const sq = searchQuery.trim().toLowerCase();
        return sq ? movimientos.filter(m => movCoincideBusqueda(m, sq)) : movimientos;
    }, [movimientos, searchQuery]);

    // Filtro de las tarjetas del Dashboard: solo afecta la lista de Movimientos
    const [dashFiltro, setDashFiltro] = useState(null); // null | 'contratistas' | 'petro' | 'guias'
    const movsLista = useMemo(
        () => dashFiltro ? movsFiltrados.filter(DASH_FILTROS[dashFiltro].fn) : movsFiltrados,
        [movsFiltrados, dashFiltro]
    );

    const sortedMovs = useMemo(() => {
        const arr = [...movsLista];
        return movSort === 'desc'
            ? arr.sort((a, b) => (b.hora || '').localeCompare(a.hora || ''))
            : arr.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    }, [movsLista, movSort]);

    const sortedRegs = useMemo(() => {
        const arr = [...movsFiltrados];
        return regSort === 'asc'
            ? arr.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
            : arr.sort((a, b) => (b.hora || '').localeCompare(a.hora || ''));
    }, [movsFiltrados, regSort]);

    const placaCounts = useMemo(() => {
        const counts = {};
        movimientos.forEach(m => { counts[m.placa] = (counts[m.placa] || 0) + 1; });
        return counts;
    }, [movimientos]);

    const bitacora = useMemo(() => {
        // Ordenar cronológicamente (más antiguo primero) para que salida siempre preceda su ingreso
        const sorted = [...movimientos].sort((a, b) => (a.hora || '').localeCompare(b.hora || '') || (a._id || '').localeCompare(b._id || ''));
        const openSalidas = {};
        const pairs = [];
        for (const mov of sorted) {
            if (mov.tipo === 'salida') {
                if (!openSalidas[mov.placa]) openSalidas[mov.placa] = [];
                openSalidas[mov.placa].push(mov);
            } else if (mov.tipo === 'ingreso') {
                if (openSalidas[mov.placa] && openSalidas[mov.placa].length > 0) {
                    const sal = openSalidas[mov.placa].shift();
                    const condSal = (sal.conductor || '').trim();
                    const condIng = (mov.conductor || '').trim();
                    pairs.push({
                        placa: mov.placa,
                        salida: sal,
                        ingreso: mov,
                        horaS: sal.hora,
                        horaI: mov.hora,
                        conductor: condSal.toLowerCase() === condIng.toLowerCase()
                            ? (condSal || '—')
                            : `${condSal || '—'} / ${condIng || '—'}`,
                        conductorChanged: condSal.toLowerCase() !== condIng.toLowerCase(),
                        marca: sal.marca || mov.marca,
                        empresa: sal.empresa || mov.empresa,
                        tipoVehiculo: sal.tipoVehiculo || mov.tipoVehiculo,
                        destino: sal.destino || mov.destino,
                        actividad: mov.actividad || sal.actividad || '',
                        status: 'completo',
                    });
                } else {
                    pairs.push({
                        placa: mov.placa, salida: null, ingreso: mov,
                        horaS: '—', horaI: mov.hora,
                        conductor: mov.conductor || '—', conductorChanged: false,
                        marca: mov.marca, empresa: mov.empresa,
                        tipoVehiculo: mov.tipoVehiculo, destino: mov.destino,
                        actividad: mov.actividad || '',
                        status: 'solo-ingreso',
                    });
                }
            }
        }
        for (const sals of Object.values(openSalidas)) {
            for (const s of sals) {
                pairs.push({
                    placa: s.placa, salida: s, ingreso: null,
                    horaS: s.hora, horaI: '—',
                    conductor: s.conductor || '—', conductorChanged: false,
                    marca: s.marca, empresa: s.empresa,
                    tipoVehiculo: s.tipoVehiculo, destino: s.destino,
                    actividad: s.actividad || '',
                    status: 'en-campo',
                });
            }
        }
        // Ordenar por el primer evento registrado (mínimo entre horaS y horaI)
        const firstHora = p => {
            const times = [p.horaS, p.horaI].filter(h => h && h !== '—');
            return times.length ? times.slice().sort()[0] : '99:99';
        };
        return pairs.sort((a, b) => firstHora(a).localeCompare(firstHora(b)));
    }, [movimientos]);

    const bitacoraFiltrada = useMemo(() => {
        const sq = searchQuery.trim().toLowerCase();
        if (!sq) return bitacora;
        // Un registro de bitácora une la salida y el ingreso: coincide si
        // cualquiera de los dos movimientos coincide.
        return bitacora.filter(b =>
            movCoincideBusqueda(b.salida, sq) || movCoincideBusqueda(b.ingreso, sq));
    }, [bitacora, searchQuery]);

    const bitPlacaCounts = useMemo(() => {
        const c = {};
        bitacora.forEach(b => { c[b.placa] = (c[b.placa] || 0) + 1; });
        return c;
    }, [bitacora]);

    // El turno se guarda también en el dispositivo: sin conexión se sigue
    // trabajando con él (incluido uno abierto offline que aún no se sube).
    useEffect(() => {
        const cargarTurno = () => {
            const local = leerTurnoLocal(user?.id);
            if (local) setTurnoActivo(local);
            api.get('/turnos/activo')
                .then(({ data }) => {
                    if (data.turno) {
                        setTurnoActivo(data.turno);
                        guardarTurnoLocal(data.turno, user?.id);
                    } else if (!local?._pendiente) {
                        setTurnoActivo(null);
                    }
                })
                .catch(() => { });
        };
        cargarTurno();
        const onOperacion = e => { if (e.detail?.tipo === 'turno' && e.detail.data) cargarTurno(); };
        window.addEventListener('flujo:operaciones', onOperacion);
        return () => window.removeEventListener('flujo:operaciones', onOperacion);
    }, [user?.id]);

    const cargarDatos = async () => {
        if (!turnoActivo) return;
        const turnoFecha = turnoActivo.fecha || getTurnoFecha(turnoActivo.turnoActual);
        try {
            const mRes = await api.get(`/movimientos?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}&fecha=${turnoFecha}`);
            // No volver a mostrar un movimiento que el usuario ya borró pero que
            // todavía no se confirmó contra el servidor (borrado en cola offline).
            const borrados = new Set(await getBorradosPendientesIds());
            const serverMovs = mRes.data.movimientos.filter(m => !borrados.has(m._id));
            const serverIds = new Set(serverMovs.map(m => m._id));
            const pending = await getPendingMovimientos();
            const pendingItems = pending
                .filter(item => !serverIds.has(item.uuid))
                .map(item => ({ _id: item.uuid, _pending: true, hora: item.hora, fecha: item.fecha, ...item.payload }));
            setMovimientos([...serverMovs, ...pendingItems]);
            api.get(`/movimientos/stats?puesto=${turnoActivo.puesto}&bloque=${turnoActivo.bloque}&fecha=${turnoFecha}`)
                .then(sRes => setDiasActivos(sRes.data.diasActivos ?? 0))
                .catch(() => {});
        } catch {
            // Sin conexión: conservar confirmados + cola Dexie
            const pending = await getPendingMovimientos();
            setMovimientos(prev => {
                const confirmed = prev.filter(m => !m._pending);
                const confirmedIds = new Set(confirmed.map(m => m._id));
                const queueItems = pending
                    .filter(i => !confirmedIds.has(i.uuid))
                    .map(i => ({ _id: i.uuid, _pending: true, hora: i.hora, fecha: i.fecha, ...i.payload }));
                return [...confirmed, ...queueItems];
            });
        }
    };

    useEffect(() => { cargarDatos(); }, [turnoActivo]);

    // Cargar/recargar la config de narrativa cada vez que cambia el puesto
    useEffect(() => {
        if (turnoActivo?.puesto) setRegistroConfig(getRegistroConfig(turnoActivo.puesto));
    }, [turnoActivo?.puesto]);

    // Handlers para guardado optimista (nuevo movimiento aparece al instante)
    const handleGuardadoOptimista = tempMov => {
        setMovimientos(prev => [...prev, tempMov]);
    };

    const handleMovimientoConfirmado = (tempId, realMov) => {
        setMovimientos(prev => prev.map(m => m._id === tempId ? realMov : m));
    };

    // Sincronización offline: reintenta la cola Dexie cuando vuelve la conexión,
    // cuando la pestaña recupera el foco (el navegador puede pausar el intervalo
    // mientras está en segundo plano) y cada 30 s como respaldo.
    useEffect(() => {
        if (!turnoActivo || isPending) return;
        const onSynced = ({ uuid, serverId, cancelado }) => {
            if (cancelado) return; // el usuario ya lo borró localmente mientras se subía
            setMovimientos(prev => prev.map(m => m._id === uuid ? { ...m, _id: serverId, _pending: false } : m));
        };
        const onSyncedEdicion = (id, movData) => {
            setMovimientos(prev => prev.map(m => m._id === id ? { ...m, ...movData } : m));
        };
        const sync = () => {
            if (navigator.onLine) {
                syncPendingMovimientos(onSynced);
                syncPendingEdiciones(onSyncedEdicion);
                syncPendingBorrados();
            }
        };
        const onVisibility = () => { if (document.visibilityState === 'visible') sync(); };
        sync();
        window.addEventListener('online', sync);
        document.addEventListener('visibilitychange', onVisibility);
        const interval = setInterval(sync, 30_000);
        return () => {
            window.removeEventListener('online', sync);
            document.removeEventListener('visibilitychange', onVisibility);
            clearInterval(interval);
        };
    }, [turnoActivo, isPending]);

    useEffect(() => {
        if (location.state?.openDrawer) {
            setLastDrawerTab(location.state.activeTab || null);
            setShowDrawer(true);
            window.history.replaceState({}, '');
        }
    }, []);

    const handleTabChange = tab => {
        if (DRAWER_TABS.has(tab)) setLastDrawerTab(tab);
        setTabActiva(tab);
        setShowSearch(false);
        setSearchQuery('');
        if (tab !== 'utilidades') { setPlatSearchShow(false); setPlatSearchQuery(''); }
        if (tab !== 'flujos') { setFlujosGenQuery(''); setFlujosGenCampo('todos'); }
    };

    const toggleSelectMode = () => { setSelectMode(s => !s); setSelectedIds(new Set()); setSwipedMovId(null); };

    const toggleSelect = id => setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const selectAll = () => setSelectedIds(
        selectedIds.size === movimientos.length ? new Set() : new Set(movimientos.map(m => m._id))
    );

    // Borrado optimista: quita la fila de inmediato. Si el movimiento todavía
    // no se había subido al servidor (sigue en la cola offline), basta con
    // cancelarlo ahí — nunca llegó a crearse allá. Si ya estaba confirmado,
    // se encola el borrado y se reintenta solo hasta que se confirme —
    // ya no depende de que haya internet en el momento exacto del clic.
    const handleDelete = async id => {
        const target = movimientos.find(m => m._id === id);
        setMovimientos(prev => prev.filter(m => m._id !== id));

        if (target?._pending) {
            await cancelarMovimientoPendiente(id).catch(() => {});
            return;
        }

        await encolarBorrado(id);
        try {
            await api.delete(`/movimientos/${id}`);
            await cancelarBorradoEncolado(id);
        } catch {
            // Queda en la cola; el motor de sincronización lo reintentará
        }
    };

    const handleDeleteBitPair = async (b, idx) => {
        const ids = [b.salida?._id, b.ingreso?._id].filter(Boolean);
        if (!ids.length) return;
        const label = ids.length > 1 ? 'los 2 movimientos' : 'el movimiento';
        if (!window.confirm(`¿Eliminar ${label} de ${b.placa}?`)) return;
        await Promise.all(ids.map(id => handleDelete(id)));
        setBitDetailIdx(null);
    };

    const handleBatchDelete = async () => {
        if (!selectedIds.size) return;
        const ids = [...selectedIds];
        const pendingIds = ids.filter(id => movimientos.find(m => m._id === id)?._pending);
        const confirmedIds = ids.filter(id => !pendingIds.includes(id));

        setMovimientos(prev => prev.filter(m => !selectedIds.has(m._id)));
        setSelectedIds(new Set());
        setSelectMode(false);

        await Promise.all(pendingIds.map(id => cancelarMovimientoPendiente(id).catch(() => {})));

        if (confirmedIds.length) {
            await Promise.all(confirmedIds.map(id => encolarBorrado(id)));
            try {
                await api.delete('/movimientos/batch', { data: { ids: confirmedIds } });
                await Promise.all(confirmedIds.map(id => cancelarBorradoEncolado(id)));
            } catch {
                // Quedan en la cola; el motor de sincronización las reintentará una por una
            }
        }
    };

    const handleCopy = m => navigator.clipboard?.writeText(movToText(m));

    const handleShare = async m => {
        if (navigator.share) {
            await navigator.share({ title: 'Movimiento FLUJO', text: movToText(m) }).catch(() => {});
        } else handleCopy(m);
    };

    const handleEdit = m => setEditMov(m);

    // Actualiza el movimiento en estado local de inmediato (antes de que la API confirme)
    const handleEditadoOptimista = updatedMov => {
        setMovimientos(prev => prev.map(m => m._id === updatedMov._id ? { ...m, ...updatedMov } : m));
        setEditMov(null);
    };

    const handleEditHora = async (id, newHora) => {
        setMovimientos(prev => prev.map(m => m._id === id ? { ...m, hora: newHora } : m));
        setEditHoraMov(null);
        try { await api.put(`/movimientos/${id}`, { hora: newHora }); }
        catch { cargarDatos(); }
    };

    // Registrar / editar ingreso directo desde la bitácora
    const handleGuardarIngreso = async ({ b, hora, conductor, cedula, actividad, destino }) => {
        setEditIngresoBit(null);
        if (b.ingreso) {
            // Actualizar ingreso existente — optimista
            const updated = { ...b.ingreso, hora, conductor, cedula, actividad, destino };
            setMovimientos(prev => prev.map(m => m._id === b.ingreso._id ? updated : m));
            api.put(`/movimientos/${b.ingreso._id}`, { hora, conductor, cedula, actividad, destino }).catch(() => cargarDatos());
        } else {
            // Crear nuevo movimiento de ingreso
            const tempId = crypto.randomUUID();
            const fechaFlujo = turnoActivo?.fecha || getTurnoFecha(turnoActivo?.turnoActual);
            const payload = {
                tipo: 'ingreso',
                puesto: turnoActivo?.puesto,
                bloque: turnoActivo?.bloque,
                placa: b.placa,
                marca: b.salida?.marca || '',
                color: b.salida?.color || '',
                tipoVehiculo: b.salida?.tipoVehiculo || '',
                empresa: b.salida?.empresa || '',
                conductor: conductor || b.salida?.conductor || '',
                cedula: cedula || b.salida?.cedula || '',
                actividad,
                destino,
                fecha: fechaFlujo,
                hora,
                clientUUID: tempId,
            };
            const tempMov = { ...payload, _id: tempId, _pending: true };
            setMovimientos(prev => [...prev, tempMov]);
            await encolarMovimiento({ uuid: tempId, payload, hora, fecha: fechaFlujo });
            try {
                const result = await subirMovimientoPendiente(tempId);
                if (result?.movimiento) handleMovimientoConfirmado(tempId, result.movimiento);
            } catch { /* queda en cola Dexie */ }
        }
    };

    const exportData = format => {
        setShowExportMenu(false);
        const fecha = new Date().toISOString().split('T')[0];
        exportMovimientos(movimientos, format, `movimientos_${fecha}`);
    };

    const exportBitacora = async () => {
        const XLSX = await import('xlsx');
        const fecha = new Date().toISOString().split('T')[0];
        const cols = ['#', 'Placa', 'Tipo Vehículo', 'Marca', 'Empresa', 'Hora Salida', 'Hora Ingreso', 'Conductor', 'Destino / Actividad', 'Estado'];
        const estadoLabel = { completo: 'Completado', 'en-campo': 'En campo', 'solo-ingreso': 'Solo ingreso' };
        const rows = bitacora.map((b, i) => [
            i + 1,
            b.placa,
            b.tipoVehiculo || '—',
            b.marca || '—',
            b.empresa || '—',
            b.horaS,
            b.horaI,
            b.conductor,
            b.destino || '—',
            estadoLabel[b.status] || b.status,
        ]);
        const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
        ws['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 13 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bitácora');
        XLSX.writeFile(wb, `bitacora_${fecha}.xlsx`);
    };

    const handleSaveRegistroConfig = cfg => {
        localStorage.setItem(getRegistroConfigKey(turnoActivo?.puesto), JSON.stringify(cfg));
        setRegistroConfig(cfg);
    };

    const exportRegistroExcel = async () => {
        if (!movimientos.length) return;
        const XLSX = await import('xlsx');
        const fecha = new Date().toISOString().split('T')[0];
        const cols = ['#', 'Hora', 'Tipo', 'Placa', 'Tipo Vehículo', 'Conductor', 'Cédula', 'Empresa', 'Destino', 'Guía', 'Empresa Autoriza', 'Quién Autoriza', 'Narrativa'];
        const rows = [...movimientos].map((m, i) => [
            i + 1,
            m.hora,
            m.tipo === 'ingreso' ? 'Ingreso' : 'Salida',
            m.placa,
            m.tipoVehiculo || '—',
            m.conductor || '—',
            m.cedula || '—',
            m.empresa || '—',
            m.destino || '—',
            m.guia || '—',
            m.empresaAutoriza || registroConfig.empresaAutoriza || '—',
            m.quienAutoriza || '—',
            generarNarrativa(m, registroConfig),
        ]);
        const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
        ws['!cols'] = [{ wch: 4 }, { wch: 7 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 13 }, { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 80 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registro');
        XLSX.writeFile(wb, `registro_${fecha}.xlsx`);
    };

    const exportRegistroWord = () => {
        if (!movimientos.length) return;
        const fecha = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const puesto = turnoActivo?.puesto || '';
        const entradas = [...movimientos].map(m => `<p style="margin:0 0 10pt 0;font-size:12pt;">${generarNarrativa(m, registroConfig)}</p>`).join('');
        const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Registro</title><style>body{font-family:Arial,sans-serif;margin:2cm;}h2{font-size:14pt;margin-bottom:4pt;}p.sub{font-size:11pt;color:#555;margin:0 0 16pt 0;}hr{border:none;border-top:1px solid #ccc;margin:12pt 0;}</style></head><body><h2>REGISTRO DE MOVIMIENTOS DE VEHÍCULOS</h2><p class="sub">${fecha} &nbsp;·&nbsp; ${puesto}</p><hr/>${entradas}</body></html>`;
        const blob = new Blob(['﻿', html], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `registro_${new Date().toISOString().split('T')[0]}.doc`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleShareMovs = async (movsToShare) => {
        setShowShareMenu(false);
        if (!movsToShare.length) return;
        const fechaLarga = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const text = `FLUJO DE VEHÍCULOS — ${fechaLarga}\nTotal: ${movsToShare.length} movimiento${movsToShare.length !== 1 ? 's' : ''}\n\n` +
            movsToShare.map((m, i) =>
                `${i + 1}. [${(m.tipo || 'MOV').toUpperCase()}] ${m.placa}\n` +
                `   ${m.conductor || '—'} · ${m.empresa || '—'}\n` +
                `   → ${m.destino || '—'}  ${m.hora}`
            ).join('\n\n');
        if (navigator.share) {
            await navigator.share({ title: 'FLUJO — Movimientos', text }).catch(() => {});
        } else {
            navigator.clipboard?.writeText(text);
        }
    };

    const openDetailMov = m => {
        const idx = sortedMovs.findIndex(x => x._id === m._id);
        setDetailMov(m);
        setDetailMovIdx(idx);
    };

    // Opciones del gesto del botón de subir. En el inicio, las pestañas
    // quedan a la izquierda o derecha según su orden (Movimientos | Bitácora |
    // Registro): la más cercana en horizontal y la siguiente en diagonal.
    const ORDEN_VISTAS = ['movimientos', 'bitacora', 'registro'];
    const NOMBRE_VISTA = { movimientos: 'Movimientos', bitacora: 'Bitácora', registro: 'Registro' };
    const opcionesScrollGesto = (() => {
        const opciones = [
            { dir: 'up', label: 'Arriba', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
            { dir: 'down', label: 'Abajo', action: () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }) },
        ];
        if (tabActiva !== 'inicio') return opciones;
        const ir = vista => () => { setVistaInicio(vista); window.scrollTo({ top: 0 }); };
        const i = ORDEN_VISTAS.indexOf(vistaInicio);
        const izquierda = ORDEN_VISTAS.slice(0, i).reverse();
        const derecha = ORDEN_VISTAS.slice(i + 1);
        [['left', izquierda[0]], ['upleft', izquierda[1]], ['right', derecha[0]], ['upright', derecha[1]]]
            .forEach(([dir, vista]) => { if (vista) opciones.push({ dir, label: NOMBRE_VISTA[vista], action: ir(vista) }); });
        return opciones;
    })();

    const goToReg = id => { setVistaInicio('registro'); setHighlightRegId(id); };
    const goToMov = id => { setVistaInicio('movimientos'); setHighlightMovId(id); };
    const cardProps = { selectMode, onToggleSelect: toggleSelect, onOpenDetail: openDetailMov, onDelete: handleDelete, onEdit: handleEdit, onCopy: handleCopy, onShare: handleShare, swipedMovId, setSwipedMovId, movSwipeRef, onEditHora: id => setEditHoraMov(sortedMovs.find(m => m._id === id)), onGoToReg: goToReg };

    const isDrawerTab = DRAWER_TABS.has(tabActiva);

    return (
        <div className="ws-wrapper">

            {showDrawer && (
                <DrawerMenu
                    onClose={() => setShowDrawer(false)}
                    activeTab={lastDrawerTab}
                    isAdmin={isAdmin}
                    isPending={isPending}
                    hasPermiso={hasPermiso}
                    onComentarios={() => setShowComentario(true)}
                    onNavigate={tab => {
                        setLastDrawerTab(tab);
                        if (tab === 'admin') navigate('/admin');
                        else if (tab === 'calendario') navigate('/calendario');
                        else if (tab === 'jefes') navigate('/flujos/personal');
                        else handleTabChange(tab);
                    }}
                    onNuevoFlujo={() => {
                        if (turnoActivo) {
                            navigate('/turno', {
                                state: {
                                    bloqueId: turnoActivo.bloque,
                                    puesto: turnoActivo.puesto,
                                    bloqueIndex: 0,
                                    totalBloques: 1,
                                    bloquesConPuestos: [{ bloqueId: turnoActivo.bloque, puesto: turnoActivo.puesto }],
                                    fromWorkspace: true,
                                }
                            });
                        } else {
                            navigate('/onboarding');
                        }
                    }}
                />
            )}
            {showComentario && <ModalComentario onClose={() => setShowComentario(false)} />}

            {/* Top bar + barra de búsqueda: envueltos juntos para que, con la
                búsqueda activa, la fila de íconos se pueda ocultar al bajar
                sin que la barra de búsqueda deje de estar fija arriba. */}
            <div className={`ws-topbar-wrap${searchBarActive && !isDrawerTab ? ' ws-topbar-wrap-searching' : ''}`}>
            <div className={`ws-topbar${topbarIconsHidden && searchBarActive && !isDrawerTab ? ' ws-topbar-collapsed' : ''}`}>
                <button className="ws-topbar-btn"
                    onClick={isDrawerTab ? () => { handleTabChange('inicio'); setShowDrawer(true); } : () => setShowDrawer(true)}>
                    {isDrawerTab ? <IconArrowLeft /> : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M3 12h18M3 18h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    )}
                </button>
                <span className="ws-topbar-title">
                    {isDrawerTab ? DRAWER_TITLES[tabActiva] : 'FLUJO'}
                </span>
                <div className="ws-topbar-acciones">
                    {!isDrawerTab && tabActiva !== 'flujos' && tabActiva !== 'perfil' && tabActiva !== 'utilidades' && (
                        <button className="ws-topbar-btn" onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke={showSearch ? '#818cf8' : 'var(--topbar-icon)' } strokeWidth="2" />
                                <path d="M21 21l-4.35-4.35" stroke={showSearch ? '#818cf8' : 'var(--topbar-icon)'} strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    )}
                    {tabActiva === 'utilidades' && utilidadActiva === 'plataformas' ? (
                        /* En Plataformas y Nominativos este espacio es solo la lupa de su propia búsqueda */
                        <button className="ws-topbar-btn" onClick={() => { setPlatSearchShow(s => !s); setPlatSearchQuery(''); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke={platSearchShow ? '#818cf8' : 'var(--topbar-icon)'} strokeWidth="2" />
                                <path d="M21 21l-4.35-4.35" stroke={platSearchShow ? '#818cf8' : 'var(--topbar-icon)'} strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    ) : (
                        /* Toggle tema día / noche */
                        <button className="ws-topbar-btn ws-theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}>
                            {theme === 'dark' ? (
                                /* Sol — modo día */
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--topbar-icon)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="4"/>
                                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                                </svg>
                            ) : (
                                /* Luna — modo noche */
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--topbar-icon)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                                </svg>
                            )}
                        </button>
                    )}
                    {!isDrawerTab && tabActiva !== 'flujos' && tabActiva !== 'utilidades' && (
                        <button className="ws-topbar-btn" onClick={() => handleTabChange(tabActiva === 'perfil' ? 'inicio' : 'perfil')}>
                            <IconUserCircle active={tabActiva === 'perfil'} />
                        </button>
                    )}
                </div>
            </div>

            {/* Barra de búsqueda (Movimientos) */}
            {showSearch && !isDrawerTab && (
                <div className="ws-search-bar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws-search-lupa">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws-search-input" type="text"
                        placeholder="Buscar por placa, conductor, empresa, destino o actividad..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
                    {searchQuery && (
                        <button className="ws-search-clear" onClick={() => setSearchQuery('')}>✕</button>
                    )}
                </div>
            )}

            {/* Barra de búsqueda (Plataformas y Nominativos) */}
            {platSearchShow && tabActiva === 'utilidades' && utilidadActiva === 'plataformas' && (
                <div className="ws-search-bar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws-search-lupa">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws-search-input" type="text"
                        placeholder="Buscar puesto, PAD o nominativo..."
                        value={platSearchQuery} onChange={e => setPlatSearchQuery(e.target.value)} autoFocus />
                    {platSearchQuery && (
                        <button className="ws-search-clear" onClick={() => setPlatSearchQuery('')}>✕</button>
                    )}
                </div>
            )}

            {/* Barra de búsqueda (Flujos → General) */}
            {flujosBusquedaActiva && (
                <div className="ws-search-bar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws-search-lupa">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input className="ws-search-input" type="text"
                        placeholder={`Buscar por ${flujosGenCampo === 'todos' ? 'cualquier campo' : flujosGenCampo}…`}
                        value={flujosGenQuery} onChange={e => setFlujosGenQuery(e.target.value)} />
                    {flujosGenQuery && (
                        <button className="ws-search-clear" onClick={() => setFlujosGenQuery('')}>✕</button>
                    )}
                </div>
            )}
            </div>

            <div className="ws-body">
                {tabActiva === 'inicio' && (
                    <>
                    {(isPending || (!isAdmin && permisosPanel.length < Object.keys(PANEL_LABELS).length)) && (
                        <PanelActivacion permisosPanel={permisosPanel} isPending={isPending} />
                    )}
                    <div className="ws-vista-tabs">
                        <button className={`ws-vista-tab${vistaInicio === 'movimientos' ? ' active' : ''}`}
                            onClick={() => setVistaInicio('movimientos')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Movimientos
                        </button>
                        <button className={`ws-vista-tab${vistaInicio === 'bitacora' ? ' active' : ''}`}
                            onClick={() => setVistaInicio('bitacora')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            Bitácora
                        </button>
                        <button className={`ws-vista-tab${vistaInicio === 'registro' ? ' active' : ''}`}
                            onClick={() => setVistaInicio('registro')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                <path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Registro
                        </button>
                    </div>
                    {vistaInicio === 'bitacora' && (
                        <div className="ws-bitacora">
                            <div className="bit-toolbar">
                                <span className="bit-toolbar-count">
                                    {searchQuery
                                        ? <>{bitacoraFiltrada.length} <span className="ws-conteo-total">de {bitacora.length}</span></>
                                        : <>{bitacora.length} registro{bitacora.length !== 1 ? 's' : ''}</>
                                    }
                                </span>
                                <button className="bit-export-btn" onClick={exportBitacora} disabled={bitacora.length === 0}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                        <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    Exportar Excel
                                </button>
                            </div>
                            {bitacora.length === 0 ? (
                                <p className="ws-empty">Sin movimientos para consolidar</p>
                            ) : bitacoraFiltrada.length === 0 ? (
                                <p className="ws-empty">Sin resultados para "{searchQuery}"</p>
                            ) : (
                                <div className="bit-list-wrap">
                                    {bitacoraFiltrada.map((b, i) => {
                                        const bText = [
                                            `Bitácora: ${b.placa}${b.tipoVehiculo ? ' · ' + b.tipoVehiculo : ''}`,
                                            `Conductor: ${b.conductor}`,
                                            b.destino && `Destino: ${b.destino}`,
                                            `Salida: ${b.horaS}  →  Ingreso: ${b.horaI}`,
                                        ].filter(Boolean).join('\n');
                                        const isSwiped = swipedBitMainIdx === i;
                                        const isCollapsed = !expandedBitSet.has(i);
                                        return (
                                        <div key={i} className="bit-item">
                                            <div className="bit-actions" onClick={e => e.stopPropagation()}>
                                                <button className="bit-act-btn" title="Copiar" onClick={() => { navigator.clipboard?.writeText(bText); setSwipedBitMainIdx(null); }}><IconCopy /></button>
                                                <button className="bit-act-btn" title="Compartir" onClick={async () => { if (navigator.share) { await navigator.share({ title: 'Bitácora FLUJO', text: bText }).catch(() => {}); } else navigator.clipboard?.writeText(bText); setSwipedBitMainIdx(null); }}><IconShare /></button>
                                                <button className="bit-act-btn" title="Editar" onClick={() => { setBitDetailIdx(i); setSwipedBitMainIdx(null); }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                </button>
                                                <button className="bit-act-btn danger" title="Eliminar" onClick={() => { handleDeleteBitPair(b, i); setSwipedBitMainIdx(null); }}><IconMinus /></button>
                                            </div>
                                            <div
                                                className={`bit-card bit-${b.status}${isSwiped ? ' bit-row-swiped' : ''}`}
                                                onTouchStart={e => { bitMainSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false }; }}
                                                onTouchMove={e => {
                                                    const dx = e.touches[0].clientX - bitMainSwipeRef.current.startX;
                                                    const dy = e.touches[0].clientY - bitMainSwipeRef.current.startY;
                                                    if (!bitMainSwipeRef.current.moved && !bitMainSwipeRef.current.vertScroll) {
                                                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                                        if (Math.abs(dy) > Math.abs(dx)) { bitMainSwipeRef.current.vertScroll = true; return; }
                                                        bitMainSwipeRef.current.moved = true;
                                                    }
                                                    if (bitMainSwipeRef.current.moved) e.preventDefault();
                                                }}
                                                onTouchEnd={e => {
                                                    if (!bitMainSwipeRef.current.moved) return;
                                                    const dx = e.changedTouches[0].clientX - bitMainSwipeRef.current.startX;
                                                    if (isSwiped) { if (dx < -30) setSwipedBitMainIdx(null); }
                                                    else {
                                                        if (dx > 55) setSwipedBitMainIdx(i);
                                                        else if (dx < -55) setEditIngresoBit(b);
                                                    }
                                                }}
                                                {...addMouseSwipe(bitMainSwipeRef, dx => {
                                                    if (isSwiped) { if (dx < -30) setSwipedBitMainIdx(null); }
                                                    else {
                                                        if (dx > 55) setSwipedBitMainIdx(i);
                                                        else if (dx < -55) setEditIngresoBit(b);
                                                    }
                                                })}
                                                onClick={() => { if (bitMainSwipeRef.current?.didDrag) { bitMainSwipeRef.current.didDrag = false; return; } if (isSwiped) { setSwipedBitMainIdx(null); return; } setBitDetailIdx(i); }}
                                            >
                                                {/* Fila 1: horas + placa | tipo vehículo + chevron */}
                                                <div className="bit-card-r1">
                                                    <div className="bit-card-horas">
                                                        <span className="bit-card-hora-grp">
                                                            {!isCollapsed && <span className="bit-card-hora-lbl">INGRESO</span>}
                                                            <span className="bit-hora-i">{b.horaI || '—'}</span>
                                                        </span>
                                                        <span className="bit-card-sep"> — </span>
                                                        <span className="bit-card-hora-grp">
                                                            {!isCollapsed && <span className="bit-card-hora-lbl">SALIDA</span>}
                                                            <span className="bit-hora-s">{b.horaS || '—'}</span>
                                                        </span>
                                                        <span className="bit-card-sep"> · </span>
                                                        <span className="bit-card-placa">{b.placa}</span>
                                                    </div>
                                                    <div className="bit-card-r1-right">
                                                        {b.tipoVehiculo && <span className="bit-card-tipo">{b.tipoVehiculo.toUpperCase()}</span>}
                                                        <button className="bit-chevron-btn" onClick={e => { e.stopPropagation(); toggleBitCollapse(i); }}>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`chevron-giro${isCollapsed ? '' : ' abierto'}`}>
                                                                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* Fila 2: conductor | destino — solo expandida */}
                                                {!isCollapsed && (
                                                    <div className="bit-card-r2">
                                                        <span className={`bit-card-conductor${b.conductorChanged ? ' changed' : ''}`}>
                                                            {b.conductorChanged && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="icono-fijo"><path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                            {b.conductor || '—'}
                                                        </span>
                                                        {(b.destino || b.empresa) && (
                                                            <span className="bit-card-dest">{b.destino || b.empresa}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    {vistaInicio === 'registro' && (
                        <div className="ws-registro">
                            <div className="reg-toolbar">
                                <span className="reg-count">
                                    {searchQuery
                                        ? <>{sortedRegs.length} <span className="ws-conteo-total">de {movimientos.length}</span></>
                                        : <>{movimientos.length} entrada{movimientos.length !== 1 ? 's' : ''}</>
                                    }
                                </span>
                                <div className="reg-toolbar-actions">
                                    <span
                                        className="sort-toggle-btn"
                                        title={regSort === 'asc' ? 'Más antiguo primero' : 'Más reciente primero'}
                                        onClick={() => setRegSort(s => s === 'asc' ? 'desc' : 'asc')}>
                                        {regSort === 'asc' ? '↑ Ant.' : '↓ Rec.'}
                                    </span>
                                    <button className="reg-cfg-btn" onClick={() => setShowRegistroConfig(true)}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        Configurar
                                    </button>
                                    <button className="reg-export-btn" onClick={exportRegistroExcel} disabled={!movimientos.length}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2"/></svg>
                                        Excel
                                    </button>
                                    <button className="reg-export-btn" onClick={exportRegistroWord} disabled={!movimientos.length}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
                                        Word
                                    </button>
                                </div>
                            </div>
                            {movimientos.length === 0 ? (
                                <p className="ws-empty">Sin movimientos registrados</p>
                            ) : sortedRegs.length === 0 ? (
                                <p className="ws-empty">Sin resultados para "{searchQuery}"</p>
                            ) : (
                                <div className="reg-list">
                                    {sortedRegs.map(mov => (
                                        <div key={mov._id} className={`reg-entry reg-${mov.tipo}${swipedRegId === mov._id ? ' reg-swiped' : ''}`} data-regid={mov._id}>
                                            <div className="reg-actions" onClick={e => e.stopPropagation()}>
                                                <button className="reg-act-btn" title="Ver detalle" onClick={() => { setRegistroDetailMov(mov); setSwipedRegId(null); }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2"/></svg>
                                                </button>
                                                <button className="reg-act-btn" title="Editar" onClick={() => { handleEdit(mov); setSwipedRegId(null); }}>
                                                    <IconPencil />
                                                </button>
                                                <button className="reg-act-btn" title="Copiar" onClick={() => { navigator.clipboard?.writeText(generarNarrativa(mov, registroConfig)); setSwipedRegId(null); }}>
                                                    <IconCopy />
                                                </button>
                                                <button className="reg-act-btn" title="Compartir" onClick={async () => {
                                                    const text = generarNarrativa(mov, registroConfig);
                                                    if (navigator.share) { await navigator.share({ title: 'Movimiento FLUJO', text }).catch(() => {}); }
                                                    else { navigator.clipboard?.writeText(text); }
                                                    setSwipedRegId(null);
                                                }}>
                                                    <IconShare />
                                                </button>
                                                <button className="reg-act-btn danger" title="Eliminar" onClick={() => { handleDelete(mov._id); setSwipedRegId(null); }}>
                                                    <IconMinus />
                                                </button>
                                            </div>
                                            <div
                                                className="reg-entry-inner"
                                                onTouchStart={e => {
                                                    regSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false, vertScroll: false };
                                                }}
                                                onTouchMove={e => {
                                                    const dx = e.touches[0].clientX - regSwipeRef.current.startX;
                                                    const dy = e.touches[0].clientY - regSwipeRef.current.startY;
                                                    if (!regSwipeRef.current.moved && !regSwipeRef.current.vertScroll) {
                                                        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                                                        if (Math.abs(dy) > Math.abs(dx)) { regSwipeRef.current.vertScroll = true; return; }
                                                        regSwipeRef.current.moved = true;
                                                    }
                                                    if (regSwipeRef.current.moved) e.preventDefault();
                                                }}
                                                onTouchEnd={e => {
                                                    if (!regSwipeRef.current.moved) return;
                                                    const dx = e.changedTouches[0].clientX - regSwipeRef.current.startX;
                                                    if (swipedRegId === mov._id) {
                                                        if (dx < -30) setSwipedRegId(null);
                                                    } else {
                                                        if (dx > 55) setSwipedRegId(mov._id);
                                                        else if (dx < -55) goToMov(mov._id);
                                                    }
                                                }}
                                                {...addMouseSwipe(regSwipeRef, dx => {
                                                    if (swipedRegId === mov._id) {
                                                        if (dx < -30) setSwipedRegId(null);
                                                    } else {
                                                        if (dx > 55) setSwipedRegId(mov._id);
                                                        else if (dx < -55) goToMov(mov._id);
                                                    }
                                                })}
                                                onClick={() => {
                                                    if (regSwipeRef.current?.didDrag) { regSwipeRef.current.didDrag = false; return; }
                                                    if (swipedRegId === mov._id) { setSwipedRegId(null); return; }
                                                    setRegistroDetailMov(mov);
                                                }}
                                            >
                                                <div className="reg-narrativa">
                                                    <span className={`reg-badge reg-badge-${mov.tipo}`}>{mov.tipo === 'ingreso' ? '↓' : '↑'}</span>
                                                    {generarNarrativa(mov, registroConfig)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {vistaInicio === 'movimientos' && (
                    <div className="ws-desktop-grid">
                        <div className="ws-section">
                            <button className="ws-section-header" onClick={() => setDashCollapsed(p => !p)}>
                                <span>DASHBOARD</span>
                                <span className={`ws-chevron ${dashCollapsed ? 'collapsed' : ''}`}>∧</span>
                            </button>
                            {!dashCollapsed && (
                                <div className="ws-section-content">
                                    <div className="ws-counters">
                                        {/* Cada tarjeta filtra la lista de Movimientos; otro clic quita el filtro */}
                                        {[
                                            { id: 'contratistas', valor: stats?.contratistas ?? '–', label: 'CONTRATISTAS' },
                                            { id: 'petro', valor: stats?.petroecuador ?? '–', label: 'EP PETRO.' },
                                            { id: 'guias', valor: stats?.guias ?? '–', label: 'GUÍAS' },
                                        ].map(c => (
                                            <button key={c.id} type="button"
                                                className={`ws-counter-card ws-counter-filtro${dashFiltro === c.id ? ' activo' : ''}`}
                                                title={dashFiltro === c.id ? 'Quitar filtro' : `Ver solo ${DASH_FILTROS[c.id].label.toLowerCase()}`}
                                                onClick={() => { setDashFiltro(f => (f === c.id ? null : c.id)); setMovCollapsed(false); }}>
                                                <span className="ws-counter-val">{c.valor}</span>
                                                <span className="ws-counter-label">{c.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="ws-chart-card">
                                        <button className="ws-chart-toggle" onClick={() => setChartCollapsed(p => !p)}>
                                            <div className="ws-chart-toggle-info">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ws-chart-toggle-icono">
                                                    <path d="M3 3h18v4H3zM3 10h12v4H3zM3 17h7v4H3z" fill="currentColor" opacity="0.8" />
                                                    <path d="M21 14l-4 4-4-4" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M17 18V10" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                                <span>Movimiento de vehículos</span>
                                                <span className="ws-chart-badge">+{stats?.totalFlujos ?? 0} hoy</span>
                                            </div>
                                            <svg
                                                width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                className={`ws-chart-toggle-flecha${chartCollapsed ? '' : ' abierta'}`}
                                            >
                                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {!chartCollapsed && (
                                            <Suspense fallback={<div className="ws-chart-cargando" />}>
                                                <StatsChart
                                                    data={stats?.grafico}
                                                    turno={turnoActivo?.turnoActual || 'diurno'}
                                                    topDestinos={stats?.topDestinos || []}
                                                    topActividades={stats?.topActividades || []}
                                                    topPlacas={stats?.topPlacas || []}
                                                />
                                            </Suspense>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="ws-section">
                            <button className="ws-section-header" onClick={() => setMovCollapsed(p => !p)}>
                                <span>
                                    MOVIMIENTOS
                                    {(searchQuery || dashFiltro) && (
                                        <span className="ws-section-conteo">
                                            · {movsLista.length} resultado{movsLista.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {dashFiltro && (
                                        <span className="ws-filtro-chip" role="button" title="Quitar filtro"
                                            onClick={e => { e.stopPropagation(); setDashFiltro(null); }}>
                                            {DASH_FILTROS[dashFiltro].label} ✕
                                        </span>
                                    )}
                                </span>
                                <div className="ws-section-acciones">
                                    {!movCollapsed && movimientos.length > 0 && (
                                        <>
                                            <span
                                                className="sort-toggle-btn"
                                                title={movSort === 'desc' ? 'Más reciente primero' : 'Más antiguo primero'}
                                                onClick={e => { e.stopPropagation(); setMovSort(s => s === 'desc' ? 'asc' : 'desc'); }}>
                                                {movSort === 'desc' ? '↓ Rec.' : '↑ Ant.'}
                                            </span>
                                            <span className="select-toggle-btn"
                                                onClick={e => { e.stopPropagation(); toggleSelectMode(); }}>
                                                {selectMode ? 'Cancelar' : 'Selec.'}
                                            </span>
                                        </>
                                    )}
                                    <span className={`ws-chevron ${movCollapsed ? 'collapsed' : ''}`}>∧</span>
                                </div>
                            </button>
                            {!movCollapsed && (
                                <>
                                    {selectMode && (
                                        <div className="select-bar">
                                            <label className="select-bar-label" onClick={selectAll}>
                                                <input type="checkbox"
                                                    checked={selectedIds.size === movimientos.length && movimientos.length > 0}
                                                    onChange={selectAll} className="select-bar-check"
                                                    onClick={e => e.stopPropagation()} />
                                                {selectedIds.size === movimientos.length ? 'Ninguno' : 'Todos'} ({selectedIds.size}/{movimientos.length})
                                            </label>
                                            {selectedIds.size > 0 && (
                                                <div className="select-bar-acciones">
                                                    <button className="share-selected-btn"
                                                        onClick={() => handleShareMovs(movimientos.filter(m => selectedIds.has(m._id)))}>
                                                        Compartir {selectedIds.size}
                                                    </button>
                                                    <button className="delete-selected-btn" onClick={handleBatchDelete}>
                                                        Eliminar {selectedIds.size}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="ws-section-content">
                                        {movimientos.length === 0
                                            ? <p className="ws-empty">Sin movimientos registrados hoy</p>
                                            : movsLista.length === 0
                                                ? <p className="ws-empty">
                                                    {dashFiltro && !searchQuery
                                                        ? `Sin movimientos de ${DASH_FILTROS[dashFiltro].label.toLowerCase()} hoy`
                                                        : `Sin resultados para "${searchQuery}"`}
                                                </p>
                                                : sortedMovs.map(m => (
                                                    <MovCard key={m._id} m={m}
                                                        count={bitPlacaCounts[m.placa] || 1}
                                                        selected={selectedIds.has(m._id)}
                                                        {...cardProps} />
                                                ))
                                        }
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    )}
                    </>
                )}

                {tabActiva === 'avance' && (
                    (!isAdmin && (isPending || !hasPermiso('reportes')))
                        ? <AccesoRestringido label="Avance del Día" />
                        : <PantallaAvance turnoActivo={turnoActivo} user={user} />
                )}

                {tabActiva === 'flujos' && (
                    <PantallaFlujos turnoActivo={turnoActivo} hasPermiso={hasPermiso} isAdmin={isAdmin}
                        genQuery={flujosGenQuery} genCampo={flujosGenCampo} setGenCampo={setFlujosGenCampo}
                        onBusquedaVisible={setFlujosBusquedaVisible} />
                )}

                {tabActiva === 'utilidades' && (
                    <PantallaUtilidades turnoActivo={turnoActivo} onDetalleChange={handleUtilidadDetalleChange} platSearchQuery={platSearchQuery} />
                )}

                {tabActiva === 'perfil' && (
                    <PantallaPerfil user={user} turnoActivo={turnoActivo} onLogout={logout} />
                )}

                {tabActiva === 'placas-db' && ((!isAdmin && (isPending || !hasPermiso('placas'))) ? <AccesoRestringido label="Placas Vehículos" /> : <PantallaPlacasDB />)}
                {tabActiva === 'extensiones' && ((!isAdmin && (isPending || !hasPermiso('extensiones'))) ? <AccesoRestringido label="Extensiones" /> : <PantallaExtensiones />)}
                {tabActiva === 'personas' && ((!isAdmin && (isPending || !hasPermiso('personas'))) ? <AccesoRestringido label="Gestión de Personas" /> : <PantallaPersonas />)}
                {tabActiva === 'jefes' && ((!isAdmin && (isPending || !hasPermiso('jefes'))) ? <AccesoRestringido label="Jefes Inmediatos" /> : <PantallaStub title="Jefes Inmediatos" />)}
            </div>

            {/* FABs — solo en inicio / movimientos */}
            {tabActiva === 'inicio' && vistaInicio === 'movimientos' && !selectMode && (
                <>
                    {fabOpen && showShareMenu && (
                        <div className="share-menu">
                            <div className="export-menu-item"
                                onClick={() => handleShareMovs(movimientos)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                    <circle cx="6" cy="12" r="2.2" stroke="#818cf8" strokeWidth="2"/>
                                    <circle cx="17" cy="6" r="2.2" stroke="#818cf8" strokeWidth="2"/>
                                    <circle cx="17" cy="18" r="2.2" stroke="#818cf8" strokeWidth="2"/>
                                    <path d="M8 11l7-3.5M8 13l7 3.5" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round"/>
                                </svg>
                                Todos ({movimientos.length})
                            </div>
                        </div>
                    )}
                    {fabOpen && showExportMenu && (
                        <div className="export-menu">
                            <div className="export-menu-item" onClick={() => exportData('xls')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#4ade80" strokeWidth="2"/><path d="M9 3v18M3 9h6M3 15h6" stroke="#4ade80" strokeWidth="2"/><path d="M12 8l3 4-3 4M15 12h6" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                Excel (.xls)
                            </div>
                            <div className="export-menu-item" onClick={() => exportData('csv')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#818cf8" strokeWidth="2"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"/></svg>
                                CSV (.csv)
                            </div>
                        </div>
                    )}
                    <div className="ws-speed-dial">
                        <div className={`ws-dial-items${fabOpen ? ' open' : ''}`}>
                            <button className="ws-dial-item ws-dial-share"
                                onClick={() => { setShowShareMenu(s => !s); setShowExportMenu(false); }}
                                title="Compartir movimientos">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="17" cy="6" r="2.5" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="17" cy="18" r="2.5" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M8.3 10.8l5.4-3M8.3 13.2l5.4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                            <button className="ws-dial-item ws-dial-export"
                                onClick={() => { setShowExportMenu(s => !s); setShowShareMenu(false); }}
                                title="Exportar movimientos">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            {/* Registrar exige el panel "movimientos" y el bloque del turno aprobado */}
                            {(isAdmin || (!isPending && hasPermiso('movimientos') && tieneBloque(turnoActivo?.bloque))) && (
                                <button className="ws-dial-item ws-dial-add"
                                    onClick={() => { setShowModal(true); setFabOpen(false); setShowShareMenu(false); setShowExportMenu(false); }}
                                    title="Nuevo movimiento">
                                    +
                                </button>
                            )}
                        </div>
                        <button className={`ws-dial-trigger${fabOpen ? ' open' : ''}`}
                            onClick={() => { setFabOpen(s => !s); setShowShareMenu(false); setShowExportMenu(false); }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            </svg>
                        </button>
                    </div>
                </>
            )}

            {/* Modales */}
            {showModal && turnoActivo && (
                <ModalAgregar puesto={turnoActivo.puesto} bloque={turnoActivo.bloque} turnoActual={turnoActivo.turnoActual}
                    fechaFlujo={turnoActivo.fecha}
                    ubiIngreso={registroConfig.ubicacion || PUESTO_UBICACION[turnoActivo.puesto] || 'EPF'}
                    ubiSalida={PUESTO_SALIDA_DEFAULT[turnoActivo.puesto] || ''}
                    onClose={() => setShowModal(false)}
                    onGuardado={cargarDatos}
                    onGuardadoOptimista={handleGuardadoOptimista}
                    onMovimientoConfirmado={handleMovimientoConfirmado}
                    movimientos={movimientos} />
            )}
            {editMov && turnoActivo && (
                <ModalAgregar puesto={turnoActivo.puesto} bloque={turnoActivo.bloque} turnoActual={turnoActivo.turnoActual}
                    fechaFlujo={turnoActivo.fecha}
                    ubiIngreso={registroConfig.ubicacion || PUESTO_UBICACION[turnoActivo.puesto] || 'EPF'}
                    ubiSalida={PUESTO_SALIDA_DEFAULT[turnoActivo.puesto] || ''}
                    onClose={() => setEditMov(null)} onEditadoOptimista={handleEditadoOptimista} movimientos={movimientos} editData={editMov} />
            )}
            {detailMov && (
                <ModalDetalle
                    mov={detailMov}
                    onClose={() => { setDetailMov(null); setDetailMovIdx(null); }}
                    onEdit={handleEdit} onDelete={handleDelete} onCopy={handleCopy} onShare={handleShare}
                    hasPrev={detailMovIdx !== null && detailMovIdx > 0}
                    hasNext={detailMovIdx !== null && detailMovIdx < sortedMovs.length - 1}
                    onPrev={() => { const ni = detailMovIdx - 1; setDetailMovIdx(ni); setDetailMov(sortedMovs[ni]); }}
                    onNext={() => { const ni = detailMovIdx + 1; setDetailMovIdx(ni); setDetailMov(sortedMovs[ni]); }}
                    counter={detailMovIdx !== null ? `${detailMovIdx + 1} / ${sortedMovs.length}` : null}
                />
            )}
            {editHoraMov && (
                <ModalEditHora
                    mov={editHoraMov}
                    onClose={() => setEditHoraMov(null)}
                    onSave={handleEditHora}
                />
            )}
            {registroDetailMov && (
                <ModalDetalle mov={registroDetailMov} onClose={() => setRegistroDetailMov(null)}
                    onEdit={m => { handleEdit(m); setRegistroDetailMov(null); }} onDelete={id => { handleDelete(id); setRegistroDetailMov(null); }} onCopy={handleCopy} onShare={handleShare} />
            )}
            {showRegistroConfig && (
                <ModalRegistroConfig config={registroConfig} onSave={handleSaveRegistroConfig} onClose={() => setShowRegistroConfig(false)} />
            )}
            {bitDetailIdx !== null && (
                <ModalBitacoraDetalle
                    // La lista muestra bitacoraFiltrada y el índice viene de ella
                    bitacora={bitacoraFiltrada}
                    idx={bitDetailIdx}
                    onClose={() => setBitDetailIdx(null)}
                    onChange={setBitDetailIdx}
                    onEditMov={handleEdit}
                    onEditIngreso={b => setEditIngresoBit(b)}
                    onDeletePair={handleDeleteBitPair}
                />
            )}
            {editIngresoBit && (
                <ModalRegistrarIngreso
                    b={editIngresoBit}
                    movimientos={movimientos}
                    ubiIngreso={registroConfig.ubicacion || PUESTO_UBICACION[turnoActivo?.puesto] || 'EPF'}
                    onClose={() => setEditIngresoBit(null)}
                    onGuardar={handleGuardarIngreso}
                />
            )}

            {/* Banner cuenta pendiente */}
            {isPending && (
                <div className="ws-banner-pendiente" onClick={() => navigate('/cuenta-pendiente')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="icono-fijo">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>Cuenta pendiente de aprobación: puedes ver el inicio, pero no registrar nada hasta que el administrador active tu acceso. <u>Ver estado</u></span>
                </div>
            )}

            {/* Botón volver arriba */}
            {showScrollTop && !showModal && !editMov && !detailMov && !registroDetailMov && !showRegistroConfig && bitDetailIdx === null && !editHoraMov && !editIngresoBit && (
                <ScrollTopButton
                    opciones={opcionesScrollGesto}
                    onTap={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
            )}

            {/* Bottom nav */}
            <nav className="ws-navbar">
                {[
                    {
                        id: 'inicio', label: 'Inicio', icon: (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        )
                    },
                    {
                        id: 'flujos', label: 'Flujos', icon: (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6h18M3 12h12M3 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )
                    },
                    ...(!isPending && hasPermiso('utilidades') ? [{
                        id: 'utilidades', label: 'Utilidades', icon: (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )
                    }] : []),
                ].map(tab => (
                    <button key={tab.id}
                        className={`ws-nav-btn ${tabActiva === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}>
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tabActiva === tab.id && <div className="ws-nav-dot" />}
                    </button>
                ))}
            </nav>

            {showExitConfirm && (
                <div className="modal-overlay" onClick={() => setShowExitConfirm(false)}>
                    <div className="modal-card confirmar" onClick={e => e.stopPropagation()}>
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="confirmar-icono">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="confirmar-mensaje">¿Quieres salir de FLUJO?</p>
                        <p className="confirmar-detalle">Tu sesión y tu turno activo se mantienen guardados.</p>
                        <div className="confirmar-botones">
                            <button className="confirmar-cancelar" onClick={() => setShowExitConfirm(false)}>Seguir aquí</button>
                            <button className="confirmar-eliminar confirmar-salir" onClick={confirmarSalida}>Salir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspacePage;
