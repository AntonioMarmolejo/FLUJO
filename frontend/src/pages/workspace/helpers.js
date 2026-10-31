import { encolarMovimiento } from '../../lib/syncEngine.js';

// ── Helpers ───────────────────────────────────────────────
export const EMPTY_FORM = { tipo: 'salida', placa: '', marca: '', color: '', tipoVehiculo: '', empresa: '', conductor: '', cedula: '', destino: '', actividad: '', genero: 'm' };

export const TIPO_VEHICULO_OPTS = ['Sedán', 'SUV', 'Camioneta', 'Camión', 'Cama Baja', 'Cama Alta', 'Bus', 'Volquete', 'Tanquero', 'Grúa', 'Moto', 'Otro'];

// ── Cola offline (Dexie/IndexedDB) ───────────────────────
// Migración one-time: mover items del localStorage viejo a Dexie
const OFFLINE_QUEUE_KEY = 'flujo_offline_queue';
(async () => {
    try {
        const old = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        if (old.length) {
            await Promise.all(old.map(item =>
                encolarMovimiento({ uuid: item.tempId, payload: item.payload, hora: item.hora, fecha: item.fecha })
            ));
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
        }
    } catch { /* ignorar errores de migración */ }
})();

export const getHoraLocal = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guayaquil' });

const getFechaLocal = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

// Para turno nocturno (18:00-06:00) que cruza medianoche, usar fecha del día anterior entre 00:00-05:59
export const getTurnoFecha = (turnoActual) => {
    const horaActual = parseInt(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', hour12: false, timeZone: 'America/Guayaquil' }));
    if (turnoActual === 'nocturno' && horaActual < 6) {
        const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return ayer.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
    }
    return getFechaLocal();
};

export const formatMov = m => [m.marca, m.color, m.conductor].filter(Boolean).join(' · ') || 'Sin datos';

// Búsqueda de la lupa del inicio (Movimientos, Registro y Bitácora): placa,
// conductor, empresa, destino, actividad/observación y las guías (número y
// materiales). `sq` ya viene en minúsculas.
export const movCoincideBusqueda = (m, sq) => !!m && [
    m.placa, m.conductor, m.empresa, m.destino, m.actividad, m.guia,
    ...(m.guias || []).flatMap(g => [g.numero, g.items, g.empresa]),
].some(v => (v || '').toLowerCase().includes(sq));

export const movToText = m =>
    `Placa: ${m.placa}\nTipo: ${m.tipo}\nConductor: ${m.conductor || '—'}\nCédula: ${m.cedula || '—'}\nEmpresa: ${m.empresa || '—'}\nDestino: ${m.destino || '—'}${m.actividad ? '\nActividad: ' + m.actividad : ''}\nHora: ${m.hora} — ${m.fecha}`;

export const LAST_TURNO_KEY = 'flujo_last_turno';

// Ubicación por defecto de cada puesto (usada en narrativas y en el destino de ingresos)
export const PUESTO_UBICACION = {
    'Guardia Garita Principal EPF': 'EPF',
    'Guardia Garita Interior EPF': 'EPF',
    'Guardia PAD-E': 'EPF',          // PAD-E: cuando algo ingresa, va hacia EPF
    'Guardia PAD-C': 'PAD-C',
    'Guardia PAD-L': 'PAD-L',
    'Guardia PAD Puerto Edén': 'PAD Edén',
    'Guardia Puerto Nuevo': 'Puerto Nuevo',
    'Guardia Móvil': 'Móvil',
};

// Destino por defecto para SALIDAS (solo puestos intermedios con destino habitual)
export const PUESTO_SALIDA_DEFAULT = {
    'Guardia PAD-E': 'Pto. Nuevo',   // PAD-E: cuando algo sale, va hacia Puerto Nuevo
};

export const getRegistroConfigKey = puesto => `ws_registro_config_${puesto || 'default'}`;

// Config por puesto: cada puesto guarda su propia configuración de narrativa en localStorage
export const getRegistroConfig = puesto => {
    try {
        const saved = JSON.parse(localStorage.getItem(getRegistroConfigKey(puesto)) || '{}');
        const ubiDefault = PUESTO_UBICACION[puesto] || puesto || 'EPF';
        return { ubicacion: ubiDefault, ...saved };
    } catch {
        return { ubicacion: PUESTO_UBICACION[puesto] || puesto || 'EPF' };
    }
};

const esPetro = m => !!m.empresa?.toLowerCase().includes('petroecuador');

// Movimiento con guía o materiales: tiene guías registradas, o la actividad
// menciona "guía", "guia", "G#" o "material(es)".
const GUIA_REGEX = /gu[ií]a|g\s*#|material/i;

const movTieneGuia = m => !!m.guia || (m.guias || []).length > 0 || GUIA_REGEX.test(m.actividad || '');

// Filtros de las tarjetas del Dashboard (Contratistas, EP Petro., Guías)
export const DASH_FILTROS = {
    contratistas: { label: 'Contratistas', fn: m => !esPetro(m) },
    petro: { label: 'EP Petroecuador', fn: esPetro },
    guias: { label: 'Guías y materiales', fn: movTieneGuia },
};

export const buildStats = (movs, diasActivos = 0) => {
    const isPetro = esPetro;
    const placaMap = {};
    movs.forEach(m => {
        if (!placaMap[m.placa] || (!placaMap[m.placa].empresa && m.empresa)) placaMap[m.placa] = m;
    });
    const unicos = Object.values(placaMap);
    // Datos por hora (las 24h — el filtrado al turno ocurre en StatsChart)
    const grafico = Array.from({ length: 24 }, (_, h) => ({
        label: `${h}h`,
        hora: h,
        ingresos: movs.filter(m => parseInt(m.hora?.split(':')[0] ?? 0) === h && m.tipo === 'ingreso').length,
        salidas:  movs.filter(m => parseInt(m.hora?.split(':')[0] ?? 0) === h && m.tipo === 'salida').length,
    }));
    // Top destinos / plataformas
    const destMap = {};
    movs.forEach(m => { if (m.destino?.trim()) destMap[m.destino.trim()] = (destMap[m.destino.trim()] || 0) + 1; });
    const topDestinos = Object.entries(destMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    // Top actividades
    const actMap = {};
    movs.forEach(m => {
        const a = m.actividad?.trim();
        if (a && !/^vac[ií]o$/i.test(a)) actMap[a] = (actMap[a] || 0) + 1;
    });
    const topActividades = Object.entries(actMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    // Top vehículos (por nº de movimientos)
    const placaMovMap = {};
    movs.forEach(m => { if (m.placa?.trim()) placaMovMap[m.placa.trim()] = (placaMovMap[m.placa.trim()] || 0) + 1; });
    const topPlacas = Object.entries(placaMovMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    return {
        totalFlujos: movs.length,
        diasActivos,
        guias: movs.filter(movTieneGuia).length,
        petroecuador: unicos.filter(isPetro).length,
        contratistas: unicos.filter(m => !isPetro(m)).length,
        grafico,
        topDestinos,
        topActividades,
        topPlacas,
    };
};

const MASC_TIPOS = new Set(['sedán','sedan','suv','camión','camion','bus','volquete','tanquero','cabezal','tráiler','trailer','tracto','furgón','furgon','pickup','pick-up','pick up','camper','buldócer','buldocer','cisternero']);

const articuloVehiculo = tipo => tipo && MASC_TIPOS.has(tipo.toLowerCase().trim()) ? 'el' : 'la';

export const generarNarrativa = (mov, cfg = {}) => {
    const { hora, tipo, conductor, cedula, empresa, tipoVehiculo, placa, destino, actividad, genero } = mov;
    const ubiIngreso  = cfg.ubicacion    || 'EPF';
    const conSalida   = cfg.conSalida    || 'Sale al';
    const conIngreso  = cfg.conIngreso   || 'Ingresa al';
    const titHombre   = cfg.conTitHombre || 'el Sr.';
    const titMujer    = cfg.conTitMujer  || 'la Srta.';
    const conCedula   = cfg.conCedula    || 'cc:';
    const conEmpresa  = cfg.conEmpresa   || 'de';
    const conPlaca    = cfg.conPlaca     || 'de Placas';
    const conVehiculo = cfg.conVehiculo  || `conduciendo ${articuloVehiculo(tipoVehiculo)}`;
    const titulo      = genero === 'f' ? titMujer : titHombre;
    // El ingreso usa el destino escrito en el movimiento; la ubicación del
    // puesto (EPF, PAD-C...) solo cuando el destino quedó vacío.
    const accion      = tipo === 'ingreso'
        ? `${conIngreso} ${destino?.trim() || ubiIngreso}`
        : `${conSalida} ${destino?.trim() || 'destino'}`;
    const descripcion = (!actividad || /^vac[ií]o$/i.test(actividad.trim())) ? 'vacía' : actividad.trim();
    return `${hora} ${accion} ${titulo} ${conductor || '—'} ${conCedula} ${cedula || '—'} ${conEmpresa} ${empresa || '—'} ${conVehiculo} ${tipoVehiculo || 'vehículo'} ${conPlaca} ${placa} ${descripcion}`;
};

// Tabs que vienen del cajón (tienen botón de regreso)
export const DRAWER_TABS = new Set(['avance', 'placas-db', 'extensiones', 'personas', 'jefes']);

export const DRAWER_TITLES = { avance: 'AVANCE DEL DÍA', 'placas-db': 'PLACAS', extensiones: 'EXTENSIONES', personas: 'PERSONAS', jefes: 'JEFES' };

// ── Parser de QR ──────────────────────────────────────────
export const parseQR = raw => {
    const map = {};
    raw.split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i > 0) map[line.slice(0, i).trim().toUpperCase()] = line.slice(i + 1).trim();
    });
    return map;
};

export const compressImage = (dataUrl, maxDim = 1200) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = img.width * scale;
        c.height = img.height * scale;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.src = dataUrl;
});

// Rota una imagen (dataURL) 90° en sentido horario, usando canvas
export const rotateImageDataUrl = (dataUrl) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.height;
        c.height = img.width;
        const ctx = c.getContext('2d');
        ctx.translate(c.width / 2, c.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(c.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
});

// ── Modal config Registro ─────────────────────────────────
export const CFG_DEFAULTS = {
    ubicacion: 'EPF', empresaAutoriza: 'EP Petroecuador',
    conSalida: 'Sale al', conIngreso: 'Ingresa al',
    conTitHombre: 'el Sr.', conTitMujer: 'la Srta.',
    conCedula: 'cc:', conEmpresa: 'de', conPlaca: 'de Placas',
    conVehiculo: '',
};

// ── Helper: drag con mouse equivalente al swipe táctil ─────
// Adjunta onMouseDown que escucha mousemove/mouseup en window.
// onDragEnd(dx) recibe el desplazamiento horizontal al soltar.
// Marca ref.current.didDrag=true para que onClick lo ignore.
export const addMouseSwipe = (ref, onDragEnd) => ({
    onMouseDown: (e) => {
        if (e.button !== 0) return; // solo botón izquierdo
        ref.current = { startX: e.clientX, startY: e.clientY, moved: false, vertScroll: false, didDrag: false };
        const onMove = (me) => {
            const dx = me.clientX - ref.current.startX;
            const dy = me.clientY - ref.current.startY;
            if (!ref.current.moved && !ref.current.vertScroll) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                if (Math.abs(dy) > Math.abs(dx)) { ref.current.vertScroll = true; return; }
                ref.current.moved = true;
            }
        };
        const onUp = (me) => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            if (!ref.current.moved) return;
            ref.current.didDrag = true;
            onDragEnd(me.clientX - ref.current.startX);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    },
});

// ── Modal formulario vehículo ─────────────────────────────
export const EMPTY_VEHICULO = { placa: '', marca: '', color: '', tipoVehiculo: '', empresa: '', caf: '' };

// Formatea un timestamp como "hace 2 días" / "hace 3 h" / "hace 5 min"
export const formatRelativeTime = (ts) => {
    if (!ts) return '';
    const diffMin = Math.floor((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'hace un momento';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    return `hace ${diffD} día${diffD !== 1 ? 's' : ''}`;
};

// ── Export helper (módulo-level para reutilizar) ──────────
export const exportMovimientos = (movimientos, format, filename) => {
    const cols = ['Hora', 'Tipo', 'Placa', 'Marca', 'Color', 'Tipo Vehículo', 'Empresa', 'Conductor', 'Cédula', 'Destino', 'Actividad', 'Fecha', 'Puesto'];
    const rows = movimientos.map(m => [
        m.hora, m.tipo, m.placa, m.marca, m.color, m.tipoVehiculo, m.empresa,
        m.conductor, m.cedula, m.destino, m.actividad, m.fecha, m.puesto,
    ]);
    if (format === 'csv') {
        const content = [cols, ...rows].map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
        const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `${filename}.csv` }).click();
        URL.revokeObjectURL(url);
    } else {
        const esc = v => (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = `<html><head><meta charset="UTF-8"></head><body><table>
<tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>
${rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('\n')}
</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `${filename}.xls` }).click();
        URL.revokeObjectURL(url);
    }
};

// ── Pantalla lista de flujos ───────────────────────────────
export const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Recorte real con un recuadro arrastrable/ajustable sobre canvas (sin librerías nuevas)
export const CROP_MIN = 40;

export const fmtFechaCorta = (iso) => new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });

// ── Helpers de texto para copiar/compartir ────────────────
export const vToText = v => [
    `PLACA: ${v.placa}`,
    v.marca ? `MARCA: ${v.marca}` : '',
    v.color ? `COLOR: ${v.color}` : '',
    v.tipoVehiculo ? `TIPO: ${v.tipoVehiculo}` : '',
    v.empresa ? `EMPRESA: ${v.empresa}` : '',
    v.caf ? `CAF: ${v.caf}` : '',
].filter(Boolean).join('\n');

export const extToText = e => [
    `NOMBRE: ${e.nombre}`,
    e.empresa ? `EMPRESA: ${e.empresa}` : '',
    e.cargo ? `CARGO: ${e.cargo}` : '',
    e.departamento ? `DEPT: ${e.departamento}` : '',
    e.extension ? `EXT: ${e.extension}` : '',
    e.celular ? `CEL: ${e.celular}` : '',
].filter(Boolean).join('\n');

export const pToText = p => [
    `CÉDULA: ${p.cedula}`,
    `NOMBRES: ${p.nombres}`,
    p.empresa ? `EMPRESA: ${p.empresa}` : '',
    p.cargo ? `CARGO: ${p.cargo}` : '',
    p.departamento ? `DEPT: ${p.departamento}` : '',
    p.nominativo ? `NOMINATIVO: ${p.nominativo}` : '',
].filter(Boolean).join('\n');

export const handleCopyText = text => navigator.clipboard?.writeText(text);

export const handleShareText = async text => {
    if (navigator.share) {
        await navigator.share({ title: 'FLUJO', text }).catch(() => { });
    } else {
        handleCopyText(text);
    }
};

// ── Modal extensión (agregar / editar) ────────────────────
export const EMPTY_EXT = { nombre: '', empresa: '', cargo: '', departamento: '', extension: '', celular: '' };

// ── Modal persona (agregar / editar) ─────────────────────
export const EMPTY_PERSONA = { cedula: '', nombres: '', empresa: '', cargo: '', departamento: '', nominativo: '' };

export const PANEL_LABELS = {
    movimientos: 'Registrar Movimientos',
    reportes:    'Avance del Día',
    placas:      'Placas Vehículos',
    extensiones: 'Extensiones',
    personas:    'Gestión de Personas',
    jefes:       'Jefes Inmediatos',
    utilidades:  'Utilidades',
    puestos:     'Ver Puestos del Bloque',
};

// Bitácora: une cada salida con el ingreso siguiente de la misma placa
export const armarBitacora = movimientos => {
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
};

// Exporta la bitácora a Excel
export const exportarBitacoraExcel = async bitacora => {
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

// Exporta el registro (con narrativa) a Excel
export const exportarRegistroExcel = async (movimientos, registroConfig) => {
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

// Exporta el registro (con narrativa) a Word
export const exportarRegistroWord = (movimientos, registroConfig, turnoActivo) => {
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

// Comparte una lista de movimientos como texto
export const compartirMovimientos = async movsToShare => {
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
