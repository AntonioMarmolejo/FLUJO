import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PANEL_LABELS, formatRelativeTime } from './helpers';

// Marca de un registro hecho sin conexión que todavía no se sube. Si el
// servidor lo rechazó, muestra el motivo y permite descartarlo.
export const PendienteBadge = ({ error, onDescartar }) => (
    <span className={`pendiente__badge${error ? ' pendiente__badge--error' : ''}`}
        title={error || 'Guardado en el dispositivo; se subirá al volver la conexión'}
        onClick={e => e.stopPropagation()}>
        {error ? 'No se pudo subir' : 'Pendiente'}
        {/* span y no button: la marca puede ir dentro de una tarjeta que ya es un botón */}
        {error && <span role="button" tabIndex={0} className="pendiente__descartar" onClick={onDescartar}>Descartar</span>}
    </span>
);

// ── Botón de subir con menú en abanico ───────────────────
// Toque corto: sube al inicio. Mantener presionado abre un abanico de opciones
// hacia la izquierda (arriba, otras pestañas, abajo):
//   · sin soltar, se arrastra hacia una opción y al soltar se ejecuta;
//   · si se suelta sin arrastrar, el abanico queda abierto para tocar la opción.
// Funciona con dedo y mouse. opciones: [{ id, label, icono, action }], en orden
// de arriba hacia abajo.
const ICONOS_ABANICO = {
    arriba: <path d="M12 19V7M6 11l6-6 6 6M5 3h14" />,
    abajo: <path d="M12 5v12M6 13l6 6 6-6M5 21h14" />,
    movimientos: <path d="M4 6h16M4 12h10M4 18h7" />,
    bitacora: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 9v12" /></>,
    registro: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></>,
};

const ABANICO_RADIO = 118;
const ABANICO_DESDE = 90;           // primera opción: justo encima del botón
const ABANICO_MIN_ARRASTRE = 30;    // px de arrastre antes de elegir una opción

// Borde superior de la barra de navegación inferior (o de la pantalla)
const limiteInferior = () => document.querySelector('.ws__navbar')?.getBoundingClientRect().top ?? window.innerHeight;

// El abanico baja por la izquierda solo hasta donde hay espacio: sin pisar la
// barra de navegación inferior. 180° = a la izquierda, 270° = debajo.
const anguloFinalAbanico = cy => {
    const espacio = limiteInferior() - 30 - cy;
    const s = Math.max(-1, Math.min(1, espacio / ABANICO_RADIO));
    return Math.max(165, Math.min(270, 180 + (Math.asin(s) * 180) / Math.PI));
};

const armarAbanico = (opciones, cy) => {
    const hasta = anguloFinalAbanico(cy);
    const paso = opciones.length > 1 ? (hasta - ABANICO_DESDE) / (opciones.length - 1) : 0;
    return opciones.map((o, i) => {
        const angulo = ABANICO_DESDE + paso * i;
        const rad = (angulo * Math.PI) / 180;
        return {
            ...o, angulo,
            x: Math.round(Math.cos(rad) * ABANICO_RADIO),
            y: Math.round(-Math.sin(rad) * ABANICO_RADIO),
            // La de arriba lleva la etiqueta encima; las demás, a su izquierda
            etiquetaArriba: angulo < 105,
        };
    });
};

// Opción hacia la que apunta el arrastre: la de ángulo más cercano
const opcionArrastrada = (dx, dy, items) => {
    if (Math.hypot(dx, dy) < ABANICO_MIN_ARRASTRE || !items.length) return null;
    const angulo = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360;
    const paso = items.length > 1 ? Math.abs(items[1].angulo - items[0].angulo) : 60;
    let mejor = null, menor = Infinity;
    for (const it of items) {
        let d = Math.abs(angulo - it.angulo) % 360;
        if (d > 180) d = 360 - d;
        if (d < menor) { menor = d; mejor = it; }
    }
    return menor <= Math.max(30, paso / 2 + 12) ? mejor : null;
};

export const ScrollTopButton = ({ opciones, onTap }) => {
    const [menu, setMenu] = useState(null); // { cx, cy, items, fijo }
    const [activa, setActiva] = useState(null);
    const gesto = useRef(null);

    const cerrar = () => { setMenu(null); setActiva(null); };

    useEffect(() => {
        if (!menu?.fijo) return;
        const onTecla = e => { if (e.key === 'Escape') cerrar(); };
        window.addEventListener('keydown', onTecla);
        return () => window.removeEventListener('keydown', onTecla);
    }, [menu?.fijo]);

    const abrir = () => {
        const g = gesto.current;
        if (!g || g.abierto) return;
        g.abierto = true;
        clearTimeout(g.timer);
        navigator.vibrate?.(12);
        setMenu({
            cx: g.cx, cy: g.cy, items: armarAbanico(opciones, g.cy), fijo: false,
            // Del círculo guía solo se ve la mitad izquierda, sin pisar la barra inferior
            recorteGuia: `inset(0 ${ABANICO_RADIO}px ${Math.max(0, g.cy + ABANICO_RADIO - limiteInferior() + 6)}px 0)`,
        });
    };

    const onPointerDown = e => {
        if (e.button !== 0) return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.setPointerCapture(e.pointerId);
        gesto.current = {
            x0: e.clientX, y0: e.clientY,
            cx: r.left + r.width / 2, cy: r.top + r.height / 2,
            abierto: false, movido: false,
            // Con el abanico ya abierto, tocar el botón lo cierra
            yaAbierto: !!menu,
            timer: menu ? null : setTimeout(abrir, 280),
        };
    };

    const onPointerMove = e => {
        const g = gesto.current;
        if (!g || g.yaAbierto) return;
        const dx = e.clientX - g.x0;
        const dy = e.clientY - g.y0;
        if (Math.hypot(dx, dy) > 12) {
            g.movido = true;
            if (!g.abierto) abrir();
        }
        if (g.abierto) {
            const items = armarAbanico(opciones, g.cy);
            setActiva(opcionArrastrada(dx, dy, items)?.id || null);
        }
    };

    const terminar = (e, cancelado) => {
        const g = gesto.current;
        if (!g) return;
        clearTimeout(g.timer);
        gesto.current = null;
        if (g.yaAbierto) { cerrar(); return; }
        if (!g.abierto) { if (!cancelado) onTap(); return; }
        const op = cancelado ? null : opcionArrastrada(e.clientX - g.x0, e.clientY - g.y0, armarAbanico(opciones, g.cy));
        if (op) { cerrar(); op.action(); return; }
        // Se mantuvo presionado sin arrastrar: queda abierto para tocar la opción
        if (!g.movido && !cancelado) { setActiva(null); setMenu(m => m && { ...m, fijo: true }); return; }
        cerrar();
    };

    const elegir = op => { cerrar(); op.action(); };

    return (
        <>
            <button
                className={`scroll__top-btn${menu ? ' scroll__top-btn--abierto' : ''}`}
                aria-label="Volver arriba (mantén presionado para más opciones)"
                aria-expanded={!!menu}
                title="Volver arriba · mantén presionado para más opciones"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={e => terminar(e, false)}
                onPointerCancel={e => terminar(e, true)}
                onClick={e => { if (e.detail === 0) (menu ? cerrar() : onTap()); /* teclado */ }}
                onContextMenu={e => e.preventDefault()}
            >
                <svg className="scroll__top-icono" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {menu && (
                <div className={`abanico${menu.fijo ? ' abanico--fijo' : ''}`}>
                    <div className="abanico__fondo" onClick={cerrar} />
                    <div className="abanico__guia" style={{ left: menu.cx, top: menu.cy, width: ABANICO_RADIO * 2, height: ABANICO_RADIO * 2, clipPath: menu.recorteGuia }} />
                    {menu.items.map((it, i) => (
                        <div key={it.id}
                            className={`abanico__opcion${activa === it.id ? ' abanico__opcion--activa' : ''}`}
                            style={{ left: menu.cx, top: menu.cy, '--x': `${it.x}px`, '--y': `${it.y}px`, animationDelay: `${i * 35}ms` }}>
                            <span className={`abanico__etiqueta${it.etiquetaArriba ? ' abanico__etiqueta--arriba' : ''}`}>{it.label}</span>
                            <button type="button" className="abanico__boton" aria-label={it.label}
                                tabIndex={menu.fijo ? 0 : -1} onClick={() => elegir(it)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    {ICONOS_ABANICO[it.icono] || ICONOS_ABANICO.arriba}
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

// ── Campos del formulario ────────────────────────────────
export const ModalField = ({ name, label, placeholder, required, value, onChange, autoFilled }) => (
    <div className={`modal__field ${autoFilled && value ? 'modal__field--autofilled' : ''}`}>
        <label>{label}{required && <span className="campo-obligatorio"> *</span>}</label>
        <input type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} />
    </div>
);

const ModalCombo = ({ name, label, options, placeholder, value, onChange, autoFilled }) => (
    <div className={`modal__field ${autoFilled && value ? 'modal__field--autofilled' : ''}`}>
        <label>{label}</label>
        <input type="text" name={name} list={`combo-${name}`} placeholder={placeholder || ''} value={value} onChange={onChange} />
        <datalist id={`combo-${name}`}>
            {options.map(o => <option key={o} value={o} />)}
        </datalist>
    </div>
);

export const SuggestionField = ({ name, label, required, placeholder, value, onChange, onClear, autoFilled, suggestions, onSelect, onClearSugs, labelAction }) => {
    const inputRef = useRef(null);
    return (
        <div className={`modal__field ${autoFilled && value ? 'modal__field--autofilled' : ''}`}>
            <label>{label}{required && <span className="campo-obligatorio"> *</span>}{labelAction}</label>
            <div className="placa__wrapper">
                <input ref={inputRef} type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} autoComplete="off"
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} />
                {value && onClear && (
                    <button className="field__clear-btn" type="button" onMouseDown={e => {
                        e.preventDefault();
                        onClear();
                        setTimeout(() => inputRef.current?.focus(), 0);
                    }}>✕</button>
                )}
                {suggestions.length > 0 && (
                    <div className="placa__suggestions">
                        {suggestions.map((s, i) => (
                            <div key={i} className="placa__suggestion-item" onMouseDown={e => { e.preventDefault(); onSelect(s); }}>
                                <div>
                                    <div className="placa__suggestion-placa">{s.nombres || s.cedula}</div>
                                    <div className="placa__suggestion-info">
                                        {[s.cedula, s.empresa].filter(Boolean).join(' · ') || '—'}
                                    </div>
                                </div>
                                <span className={`placa__suggestion-badge placa__suggestion-badge--${s._source}`}>
                                    {s._source === 'hoy' ? 'Hoy' : 'BD'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const TextSugField = ({ name, label, placeholder, value, onChange, onFocus, onClearSugs, onClear, suggestions, onSelect, multiline }) => {
    const inputRef = useRef(null);
    return (
    <div className="modal__field">
        <label>{label}</label>
        <div className="placa__wrapper">
            {multiline ? (
                <textarea name={name} placeholder={placeholder || ''} value={value} onChange={onChange} onFocus={onFocus}
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} autoComplete="off"
                    rows={3} className="modal__textarea" />
            ) : (
                <input ref={inputRef} type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} onFocus={onFocus}
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} autoComplete="off" />
            )}
            {value && onClear && !multiline && (
                <button className="field__clear-btn" type="button" title="Limpiar" onMouseDown={e => {
                    e.preventDefault();
                    onClear();
                    setTimeout(() => inputRef.current?.focus(), 0);
                }}>✕</button>
            )}
            {suggestions.length > 0 && (
                <div className="placa__suggestions">
                    {suggestions.map((s, i) => (
                        <div key={i} className="placa__suggestion-item" onClick={() => onSelect(s)}>
                            <div className="placa__suggestion-placa">{s}</div>
                            <span className="placa__suggestion-badge placa__suggestion-badge--hoy">Hoy</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
    );
};

// ── Modal detalle ─────────────────────────────────────────
const DetalleRow = ({ label, value, full }) =>
    value ? (
        <div className={`detalle__field${full ? ' detalle__field--full' : ''}`}>
            <span className="detalle__label">{label}</span>
            <span className="detalle__value">{value}</span>
        </div>
    ) : null;

// Aviso reutilizable de "datos cargados desde caché offline" con su antigüedad
// (vigencia tipo Netflix: cachedAt/expiresAt guardado por catálogo en Dexie).
export const CacheFreshnessBadge = ({ cachedAt, onRefresh }) => (
    <div className="cache__aviso">
        <span className="cache__aviso-texto">
            📴 Datos guardados localmente{cachedAt ? ` · ${formatRelativeTime(cachedAt)}` : ''}
        </span>
        <button className="cache__aviso-btn" onClick={onRefresh}>
            Actualizar
        </button>
    </div>
);

// ── Modal confirmación genérico ───────────────────────────
export const ModalConfirm = ({ mensaje, onConfirm, onCancel }) => (
    <div className="modal__overlay" onClick={onCancel}>
        <div className="modal__card modal__card--confirmar" onClick={e => e.stopPropagation()}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="confirmar__icono">
                <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="confirmar__mensaje">{mensaje}</p>
            <div className="confirmar__botones">
                <button className="confirmar__cancelar" onClick={onCancel}>Cancelar</button>
                <button className="confirmar__eliminar" onClick={onConfirm}>Eliminar</button>
            </div>
        </div>
    </div>
);

// Aviso de que la acción necesita un flujo iniciado, con el atajo para iniciarlo
export const AvisoIniciarFlujo = ({ detalle, onCerrar }) => {
    const navigate = useNavigate();
    return (
        <div className="modal__overlay" onClick={onCerrar}>
            <div className="modal__card modal__card--confirmar" onClick={e => e.stopPropagation()}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="confirmar__icono">
                    <circle cx="12" cy="12" r="10" stroke="#ef9f27" strokeWidth="2" />
                    <path d="M12 8v4M12 16h.01" stroke="#ef9f27" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="confirmar__mensaje">Primero inicia un flujo</p>
                <p className="confirmar__detalle">{detalle}</p>
                <div className="confirmar__botones">
                    <button className="confirmar__cancelar" onClick={onCerrar}>Ahora no</button>
                    <button className="confirmar__eliminar confirmar__eliminar--salir" onClick={() => navigate('/onboarding')}>Iniciar flujo</button>
                </div>
            </div>
        </div>
    );
};

// Dropdown de sugerencias de persona (mismo estilo visual que PersonaSugList del formulario de movimientos)
export const PersonaSugMini = ({ items, onSel }) => !items.length ? null : (
    // onMouseDown con preventDefault evita que el input pierda el foco (blur)
    // antes de que el click en la sugerencia llegue a dispararse — así el
    // onBlur del input puede cerrar la lista al tocar fuera o cambiar de
    // campo, sin romper la selección por click/tap.
    <div
        className="ingbit__sugs"
        onMouseDown={e => e.preventDefault()}>
        {items.map((p, i) => (
            <div key={i} className="ingbit__sug" onClick={() => onSel(p)}>
                <div className="ingbit__sug-nombre">{p.nombres}</div>
                {p.cedula && <div className="ingbit__sug-info">CI: {p.cedula}{p.empresa ? ' · ' + p.empresa : ''}</div>}
            </div>
        ))}
    </div>
);

// ── Pantalla stub ─────────────────────────────────────────
export const PantallaStub = ({ title }) => (
    <div className="ws__section-content ws__section-content--stub">
        <h3 className="ws__sub-title">{title}</h3>
        <p className="ws__empty">Próximamente</p>
    </div>
);

// ── Acceso restringido ────────────────────────────────────
export const AccesoRestringido = ({ label }) => (
    <div className="acceso__restringido">
        <div className="acceso__restringido-icono">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#ef9f27" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="#ef9f27" strokeWidth="2" strokeLinecap="round" />
            </svg>
        </div>
        <div className="acceso__restringido-titulo">Acceso restringido</div>
        <div className="acceso__restringido-texto">
            No tienes permiso para acceder a <strong>{label}</strong>.
            Contacta al administrador para solicitar acceso.
        </div>
    </div>
);

// ── Panel estado activación (para usuarios pendientes o con permisos parciales) ──
export const PanelActivacion = ({ permisosPanel, isPending }) => {
    const paneles = Object.entries(PANEL_LABELS);
    const pasos = [
        { label: 'Registro', done: true },
        { label: 'Aprobación', done: !isPending },
        { label: 'Acceso completo', done: !isPending && paneles.every(([id]) => permisosPanel.includes(id)) },
    ];
    return (
        <div className="cuenta__panel">
            <div className="cuenta__panel-header">
                <div className="cuenta__panel-icono">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#ef9f27" strokeWidth="2" />
                        <path d="M12 8v4M12 16h.01" stroke="#ef9f27" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
                <div>
                    <div className="cuenta__panel-titulo">
                        {isPending ? 'Cuenta pendiente de activación' : 'Acceso parcial'}
                    </div>
                    <div className="cuenta__panel-texto">
                        {isPending
                            ? 'El administrador debe aprobar tu cuenta para habilitar los módulos.'
                            : 'Algunos módulos aún no están habilitados para tu cuenta.'}
                    </div>
                </div>
            </div>

            {/* Pasos: Registro → Aprobación → Acceso completo */}
            <div className="cuenta__panel-pasos">
                {pasos.map((step, i) => (
                    <div key={step.label} className={`cuenta__panel-paso${step.done ? ' cuenta__panel-paso--hecho' : ''}`}>
                        <div className="cuenta__panel-paso-marca">
                            <div className="cuenta__panel-paso-circulo">
                                {step.done
                                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#28c997" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    : <div className="cuenta__panel-paso-punto" />
                                }
                            </div>
                            <span className="cuenta__panel-paso-label">{step.label}</span>
                        </div>
                        {i < pasos.length - 1 && <div className="cuenta__panel-paso-linea" />}
                    </div>
                ))}
            </div>

            {/* Módulos habilitados y pendientes */}
            <div className="cuenta__panel-modulos">
                {paneles.map(([id, label]) => {
                    const granted = !isPending && permisosPanel.includes(id);
                    return (
                        <div key={id} className={`cuenta__panel-modulo${granted ? ' cuenta__panel-modulo--habilitado' : ''}`}>
                            <div className="cuenta__panel-modulo-icono">
                                {granted
                                    ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#28c997" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    : <svg width="7" height="7" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#ef9f27" strokeWidth="2.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="#ef9f27" strokeWidth="2.5" strokeLinecap="round" /></svg>
                                }
                            </div>
                            <span className="cuenta__panel-modulo-label">{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
