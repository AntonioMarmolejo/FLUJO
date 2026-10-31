import { useState, useRef } from 'react';
import { PANEL_LABELS, formatRelativeTime } from './helpers';

// Marca de un registro hecho sin conexión que todavía no se sube. Si el
// servidor lo rechazó, muestra el motivo y permite descartarlo.
export const PendienteBadge = ({ error, onDescartar }) => (
    <span className={`pendiente-badge${error ? ' pendiente-badge-error' : ''}`}
        title={error || 'Guardado en el dispositivo; se subirá al volver la conexión'}
        onClick={e => e.stopPropagation()}>
        {error ? 'No se pudo subir' : 'Pendiente'}
        {/* span y no button: la marca puede ir dentro de una tarjeta que ya es un botón */}
        {error && <span role="button" tabIndex={0} className="pendiente-descartar" onClick={onDescartar}>Descartar</span>}
    </span>
);

// ── Botón de subir con gesto ─────────────────────────────
// Toque corto: sube al inicio. Mantener presionado (o empezar a arrastrar):
// muestra flechas alrededor y, sin soltar, se arrastra hacia la opción
// deseada (cambiar de pestaña, ir abajo...). Funciona con dedo y mouse.
const GESTO_ANGULO = { right: 0, upright: 45, up: 90, upleft: 135, left: 180, down: -90 };

const GESTO_FLECHA = { right: '→', upright: '↗', up: '↑', upleft: '↖', left: '←', down: '↓' };

const GESTO_RADIO = 74;

const GESTO_OFFSET = {
    right: [GESTO_RADIO, 0], left: [-GESTO_RADIO, 0],
    up: [0, -GESTO_RADIO], down: [0, GESTO_RADIO * 0.8],
    upright: [GESTO_RADIO * 0.72, -GESTO_RADIO * 0.72], upleft: [-GESTO_RADIO * 0.72, -GESTO_RADIO * 0.72],
};

// Opción hacia la que apunta el arrastre: la de ángulo más cercano, si el
// arrastre es lo bastante largo y no se aleja más de 60° de ninguna.
const elegirOpcionGesto = (dx, dy, opciones) => {
    if (Math.hypot(dx, dy) < 28) return null;
    const angulo = Math.atan2(-dy, dx) * 180 / Math.PI;
    let mejor = null;
    let menor = Infinity;
    for (const o of opciones) {
        let d = Math.abs(angulo - GESTO_ANGULO[o.dir]) % 360;
        if (d > 180) d = 360 - d;
        if (d < menor) { menor = d; mejor = o; }
    }
    return menor <= 60 ? mejor : null;
};

export const ScrollTopButton = ({ opciones, onTap }) => {
    const [menu, setMenu] = useState(null); // { cx, cy } centro del botón
    const [activa, setActiva] = useState(null);
    const gesto = useRef(null);

    const abrirMenu = () => {
        const g = gesto.current;
        if (!g || g.abierto) return;
        g.abierto = true;
        clearTimeout(g.timer);
        navigator.vibrate?.(12);
        setMenu({ cx: g.cx, cy: g.cy });
    };

    const onPointerDown = e => {
        if (e.button !== 0) return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.setPointerCapture(e.pointerId);
        gesto.current = {
            x0: e.clientX, y0: e.clientY,
            cx: r.left + r.width / 2, cy: r.top + r.height / 2,
            abierto: false, timer: setTimeout(abrirMenu, 280),
        };
    };

    const onPointerMove = e => {
        const g = gesto.current;
        if (!g) return;
        const dx = e.clientX - g.x0;
        const dy = e.clientY - g.y0;
        if (!g.abierto && Math.hypot(dx, dy) > 12) abrirMenu();
        if (g.abierto) setActiva(elegirOpcionGesto(dx, dy, opciones)?.dir || null);
    };

    const terminar = (e, cancelado) => {
        const g = gesto.current;
        if (!g) return;
        clearTimeout(g.timer);
        gesto.current = null;
        if (g.abierto) {
            const op = cancelado ? null : elegirOpcionGesto(e.clientX - g.x0, e.clientY - g.y0, opciones);
            setMenu(null);
            setActiva(null);
            op?.action();
        } else if (!cancelado) {
            onTap();
        }
    };

    // Las opciones se mantienen dentro de la pantalla aunque el botón esté cerca del borde
    const posicion = dir => {
        const [ox, oy] = GESTO_OFFSET[dir];
        return {
            left: Math.min(Math.max(menu.cx + ox, 56), window.innerWidth - 56),
            top: Math.min(Math.max(menu.cy + oy, 28), window.innerHeight - 28),
        };
    };

    return (
        <>
            <button
                className={`scroll-top-btn${menu ? ' scroll-top-btn-gesto' : ''}`}
                title="Volver arriba · mantén presionado y arrastra para más opciones"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={e => terminar(e, false)}
                onPointerCancel={e => terminar(e, true)}
                onClick={e => { if (e.detail === 0) onTap(); /* teclado */ }}
                onContextMenu={e => e.preventDefault()}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {menu && (
                <div className="scroll-gesto-capa">
                    {opciones.map(o => (
                        <span key={o.dir} style={posicion(o.dir)}
                            className={`scroll-gesto-op${activa === o.dir ? ' activa' : ''}`}>
                            <span className="scroll-gesto-flecha">{GESTO_FLECHA[o.dir]}</span>
                            {o.label}
                        </span>
                    ))}
                </div>
            )}
        </>
    );
};

// ── Campos del formulario ────────────────────────────────
export const ModalField = ({ name, label, placeholder, required, value, onChange, autoFilled }) => (
    <div className={`modal-field ${autoFilled && value ? 'modal-field-autofilled' : ''}`}>
        <label>{label}{required && <span className="campo-obligatorio"> *</span>}</label>
        <input type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} />
    </div>
);

const ModalCombo = ({ name, label, options, placeholder, value, onChange, autoFilled }) => (
    <div className={`modal-field ${autoFilled && value ? 'modal-field-autofilled' : ''}`}>
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
        <div className={`modal-field ${autoFilled && value ? 'modal-field-autofilled' : ''}`}>
            <label>{label}{required && <span className="campo-obligatorio"> *</span>}{labelAction}</label>
            <div className="placa-wrapper">
                <input ref={inputRef} type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} autoComplete="off"
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} />
                {value && onClear && (
                    <button className="field-clear-btn" type="button" onMouseDown={e => {
                        e.preventDefault();
                        onClear();
                        setTimeout(() => inputRef.current?.focus(), 0);
                    }}>✕</button>
                )}
                {suggestions.length > 0 && (
                    <div className="placa-suggestions">
                        {suggestions.map((s, i) => (
                            <div key={i} className="placa-suggestion-item" onMouseDown={e => { e.preventDefault(); onSelect(s); }}>
                                <div>
                                    <div className="placa-suggestion-placa">{s.nombres || s.cedula}</div>
                                    <div className="placa-suggestion-info">
                                        {[s.cedula, s.empresa].filter(Boolean).join(' · ') || '—'}
                                    </div>
                                </div>
                                <span className={`placa-suggestion-badge ${s._source}`}>
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
    <div className="modal-field">
        <label>{label}</label>
        <div className="placa-wrapper">
            {multiline ? (
                <textarea name={name} placeholder={placeholder || ''} value={value} onChange={onChange} onFocus={onFocus}
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} autoComplete="off"
                    rows={3} className="modal-textarea" />
            ) : (
                <input ref={inputRef} type="text" name={name} placeholder={placeholder || ''} value={value} onChange={onChange} onFocus={onFocus}
                    onBlur={() => setTimeout(() => onClearSugs?.(), 150)} autoComplete="off" />
            )}
            {value && onClear && !multiline && (
                <button className="field-clear-btn" type="button" title="Limpiar" onMouseDown={e => {
                    e.preventDefault();
                    onClear();
                    setTimeout(() => inputRef.current?.focus(), 0);
                }}>✕</button>
            )}
            {suggestions.length > 0 && (
                <div className="placa-suggestions">
                    {suggestions.map((s, i) => (
                        <div key={i} className="placa-suggestion-item" onClick={() => onSelect(s)}>
                            <div className="placa-suggestion-placa">{s}</div>
                            <span className="placa-suggestion-badge hoy">Hoy</span>
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
        <div className={`detalle-field${full ? ' detalle-field-full' : ''}`}>
            <span className="detalle-label">{label}</span>
            <span className="detalle-value">{value}</span>
        </div>
    ) : null;

// Aviso reutilizable de "datos cargados desde caché offline" con su antigüedad
// (vigencia tipo Netflix: cachedAt/expiresAt guardado por catálogo en Dexie).
export const CacheFreshnessBadge = ({ cachedAt, onRefresh }) => (
    <div className="cache-aviso">
        <span className="cache-aviso-texto">
            📴 Datos guardados localmente{cachedAt ? ` · ${formatRelativeTime(cachedAt)}` : ''}
        </span>
        <button className="cache-aviso-btn" onClick={onRefresh}>
            Actualizar
        </button>
    </div>
);

// ── Modal confirmación genérico ───────────────────────────
export const ModalConfirm = ({ mensaje, onConfirm, onCancel }) => (
    <div className="modal-overlay" onClick={onCancel}>
        <div className="modal-card confirmar" onClick={e => e.stopPropagation()}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="confirmar-icono">
                <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="confirmar-mensaje">{mensaje}</p>
            <div className="confirmar-botones">
                <button className="confirmar-cancelar" onClick={onCancel}>Cancelar</button>
                <button className="confirmar-eliminar" onClick={onConfirm}>Eliminar</button>
            </div>
        </div>
    </div>
);

// Dropdown de sugerencias de persona (mismo estilo visual que PersonaSugList del formulario de movimientos)
export const PersonaSugMini = ({ items, onSel }) => !items.length ? null : (
    // onMouseDown con preventDefault evita que el input pierda el foco (blur)
    // antes de que el click en la sugerencia llegue a dispararse — así el
    // onBlur del input puede cerrar la lista al tocar fuera o cambiar de
    // campo, sin romper la selección por click/tap.
    <div
        className="ingbit-sugs"
        onMouseDown={e => e.preventDefault()}>
        {items.map((p, i) => (
            <div key={i} className="ingbit-sug" onClick={() => onSel(p)}>
                <div className="ingbit-sug-nombre">{p.nombres}</div>
                {p.cedula && <div className="ingbit-sug-info">CI: {p.cedula}{p.empresa ? ' · ' + p.empresa : ''}</div>}
            </div>
        ))}
    </div>
);

// ── Pantalla stub ─────────────────────────────────────────
export const PantallaStub = ({ title }) => (
    <div className="ws-section-content ws-stub">
        <h3 className="ws-sub-title">{title}</h3>
        <p className="ws-empty">Próximamente</p>
    </div>
);

// ── Acceso restringido ────────────────────────────────────
export const AccesoRestringido = ({ label }) => (
    <div className="acceso-restringido">
        <div className="acceso-restringido-icono">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#ef9f27" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="#ef9f27" strokeWidth="2" strokeLinecap="round" />
            </svg>
        </div>
        <div className="acceso-restringido-titulo">Acceso restringido</div>
        <div className="acceso-restringido-texto">
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
        <div className="cuenta-panel">
            <div className="cuenta-panel-header">
                <div className="cuenta-panel-icono">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#ef9f27" strokeWidth="2" />
                        <path d="M12 8v4M12 16h.01" stroke="#ef9f27" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
                <div>
                    <div className="cuenta-panel-titulo">
                        {isPending ? 'Cuenta pendiente de activación' : 'Acceso parcial'}
                    </div>
                    <div className="cuenta-panel-texto">
                        {isPending
                            ? 'El administrador debe aprobar tu cuenta para habilitar los módulos.'
                            : 'Algunos módulos aún no están habilitados para tu cuenta.'}
                    </div>
                </div>
            </div>

            {/* Pasos: Registro → Aprobación → Acceso completo */}
            <div className="cuenta-panel-pasos">
                {pasos.map((step, i) => (
                    <div key={step.label} className={`cuenta-panel-paso${step.done ? ' hecho' : ''}`}>
                        <div className="cuenta-panel-paso-marca">
                            <div className="cuenta-panel-paso-circulo">
                                {step.done
                                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#28c997" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    : <div className="cuenta-panel-paso-punto" />
                                }
                            </div>
                            <span className="cuenta-panel-paso-label">{step.label}</span>
                        </div>
                        {i < pasos.length - 1 && <div className="cuenta-panel-paso-linea" />}
                    </div>
                ))}
            </div>

            {/* Módulos habilitados y pendientes */}
            <div className="cuenta-panel-modulos">
                {paneles.map(([id, label]) => {
                    const granted = !isPending && permisosPanel.includes(id);
                    return (
                        <div key={id} className={`cuenta-panel-modulo${granted ? ' habilitado' : ''}`}>
                            <div className="cuenta-panel-modulo-icono">
                                {granted
                                    ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#28c997" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    : <svg width="7" height="7" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#ef9f27" strokeWidth="2.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="#ef9f27" strokeWidth="2.5" strokeLinecap="round" /></svg>
                                }
                            </div>
                            <span className="cuenta-panel-modulo-label">{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
