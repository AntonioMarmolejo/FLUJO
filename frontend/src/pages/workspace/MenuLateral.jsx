import { useState } from 'react';
import api from '../../api/axios';
import { encolarOperacion } from '../../lib/syncEngine.js';
import {
    IconBolt,
    IconBriefcase,
    IconCalendar,
    IconChat,
    IconChevronRight,
    IconClock,
    IconPerson,
    IconPhone,
    IconShield,
    TruckIcon,
} from './iconos';

// ── Menú cajón ────────────────────────────────────────────
const DRAWER_ITEMS = [
    { label: 'Avance del día', tab: 'avance', icon: <IconClock /> },
    { label: 'Placas Vehículos', tab: 'placas-db', icon: <TruckIcon color="currentColor" /> },
    { label: 'Extensiones', tab: 'extensiones', icon: <IconPhone /> },
    { label: 'Personas', tab: 'personas', icon: <IconPerson /> },
    { label: 'Jefes Inmediatos', tab: 'jefes', icon: <IconBriefcase /> },
    { label: 'Calendario', tab: 'calendario', icon: <IconCalendar /> },
];

// Qué permiso requiere cada tab del cajón (null = siempre accesible)
const DRAWER_PERMISSION = {
    'avance':      'reportes',
    'placas-db':   'placas',
    'extensiones': 'extensiones',
    'personas':    'personas',
    'jefes':       'jefes',
    'calendario':  null,
};

export const DrawerMenu = ({ onClose, onNavigate, onNuevoFlujo, onComentarios, activeTab, isAdmin, isPending, hasPermiso }) => {
    const canAccess = (tab) => {
        if (isAdmin) return true;
        const perm = DRAWER_PERMISSION[tab];
        if (!perm) return !isPending;
        return !isPending && hasPermiso(perm);
    };
    return (
    <div className="drawer__overlay" onClick={onClose}>
        <div className="drawer__panel" onClick={e => e.stopPropagation()}>
            <div className="drawer__header">
                <span className="drawer__brand">FLUJO</span>
                <button className="drawer__close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="drawer__nav">
                {DRAWER_ITEMS.map(item => {
                    const ok = canAccess(item.tab);
                    return (
                    <button key={item.tab}
                        className={`drawer__item ${item.tab === activeTab ? 'drawer__item--active' : ''}`}
                        data-bloqueado={!ok || undefined}
                        onClick={() => {
                            if (!ok) return;
                            onNavigate(item.tab); onClose();
                        }}>
                        <span className="drawer__item-icon">{item.icon}</span>
                        <span className="drawer__item-label">{item.label}</span>
                        {ok ? <IconChevronRight /> : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="drawer__item-candado">
                                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )}
                    </button>
                    );
                })}
                <div className="drawer__divider" />
                <button className="drawer__item drawer__item--flujo" onClick={() => { onNuevoFlujo(); onClose(); }}>
                    <span className="drawer__item-icon"><IconBolt /></span>
                    <span className="drawer__item-label">Crear nuevo flujo</span>
                </button>
                <button className="drawer__item" onClick={() => { onComentarios(); onClose(); }}>
                    <span className="drawer__item-icon"><IconChat /></span>
                    <span className="drawer__item-label">Enviar comentarios</span>
                    <IconChevronRight />
                </button>
                {isAdmin && (
                    <>
                        <div className="drawer__divider" />
                        <button className="drawer__item" onClick={() => { onNavigate('admin'); onClose(); }}>
                            <span className="drawer__item-icon"><IconShield /></span>
                            <span className="drawer__item-label">Administración</span>
                            <IconChevronRight />
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
    );
};

// ── Caja de comentarios ───────────────────────────────────
const TIPOS_COMENTARIO = [
    { id: 'opinion', label: 'Opinión' },
    { id: 'sugerencia', label: 'Sugerencia' },
    { id: 'error', label: 'Reportar un error' },
];

export const ModalComentario = ({ onClose }) => {
    const [tipo, setTipo] = useState('opinion');
    const [calificacion, setCalificacion] = useState(0);
    const [mensaje, setMensaje] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const [enviado, setEnviado] = useState(null); // 'ok' | 'offline'

    const handleEnviar = async () => {
        if (!mensaje.trim() || enviando) return;
        setEnviando(true);
        setError('');
        const payload = { tipo, calificacion: calificacion || null, mensaje: mensaje.trim() };
        try {
            if (!navigator.onLine) throw new Error('offline');
            await api.post('/comentarios', payload);
            setEnviado('ok');
        } catch (err) {
            if (err.response) {
                setError(err.response.data?.message || 'No se pudo enviar el comentario');
            } else {
                // Sin conexión: se guarda en el dispositivo y se envía al volver internet
                await encolarOperacion('comentario', payload);
                setEnviado('offline');
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="modal__overlay" onClick={onClose}>
            <div className="modal__card" onClick={e => e.stopPropagation()}>
                <div className="modal__header">
                    <h3>Enviar comentarios</h3>
                    <button className="modal__close" onClick={onClose}>✕</button>
                </div>

                {enviado ? (
                    <div className="coment__gracias">
                        <div className="coment__gracias-icon">✓</div>
                        <strong>¡Gracias por tu comentario!</strong>
                        <p>{enviado === 'offline'
                            ? 'Quedó guardado en tu dispositivo y se enviará cuando vuelva la conexión.'
                            : 'Lo revisaremos para seguir mejorando FLUJO.'}</p>
                        <button className="modal__btn modal__btn--active" onClick={onClose}>Cerrar</button>
                    </div>
                ) : (
                    <>
                        <p className="coment__intro">Cuéntanos qué te parece la aplicación, qué mejorarías o si encontraste algún problema.</p>

                        <div className="modal__field">
                            <label>TIPO</label>
                            <div className="coment__tipos">
                                {TIPOS_COMENTARIO.map(t => (
                                    <button key={t.id} type="button"
                                        className={`coment__tipo${tipo === t.id ? ' coment__tipo--active' : ''}`}
                                        onClick={() => setTipo(t.id)}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="modal__field">
                            <label>¿CÓMO CALIFICAS LA APLICACIÓN? (OPCIONAL)</label>
                            <div className="coment__estrellas">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button key={n} type="button" title={`${n} de 5`}
                                        className={`coment__estrella${n <= calificacion ? ' coment__estrella--active' : ''}`}
                                        onClick={() => setCalificacion(c => (c === n ? 0 : n))}>
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="modal__field">
                            <label>COMENTARIO</label>
                            <textarea className="modal__textarea" rows={5} maxLength={2000}
                                placeholder={tipo === 'error'
                                    ? 'Describe qué pasó y en qué pantalla estabas...'
                                    : 'Escribe aquí tu opinión...'}
                                value={mensaje}
                                onChange={e => { setMensaje(e.target.value); setError(''); }} />
                            <span className="coment__contador">{mensaje.length} / 2000</span>
                        </div>

                        {error && <p className="modal__error">{error}</p>}
                        <button className={`modal__btn${mensaje.trim() ? ' modal__btn--active' : ''}`} onClick={handleEnviar} disabled={enviando}>
                            {enviando ? 'Enviando...' : 'Enviar comentario'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
