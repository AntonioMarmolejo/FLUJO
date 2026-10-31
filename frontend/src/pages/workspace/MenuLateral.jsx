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
    <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
                <span className="drawer-brand">FLUJO</span>
                <button className="drawer-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="drawer-nav">
                {DRAWER_ITEMS.map(item => {
                    const ok = canAccess(item.tab);
                    return (
                    <button key={item.tab}
                        className={`drawer-item ${item.tab === activeTab ? 'drawer-item-active' : ''}`}
                        data-bloqueado={!ok || undefined}
                        onClick={() => {
                            if (!ok) return;
                            onNavigate(item.tab); onClose();
                        }}>
                        <span className="drawer-item-icon">{item.icon}</span>
                        <span className="drawer-item-label">{item.label}</span>
                        {ok ? <IconChevronRight /> : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="drawer-item-candado">
                                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )}
                    </button>
                    );
                })}
                <div className="drawer-divider" />
                <button className="drawer-item drawer-item-flujo" onClick={() => { onNuevoFlujo(); onClose(); }}>
                    <span className="drawer-item-icon"><IconBolt /></span>
                    <span className="drawer-item-label">Crear nuevo flujo</span>
                </button>
                <button className="drawer-item" onClick={() => { onComentarios(); onClose(); }}>
                    <span className="drawer-item-icon"><IconChat /></span>
                    <span className="drawer-item-label">Enviar comentarios</span>
                    <IconChevronRight />
                </button>
                {isAdmin && (
                    <>
                        <div className="drawer-divider" />
                        <button className="drawer-item" onClick={() => { onNavigate('admin'); onClose(); }}>
                            <span className="drawer-item-icon"><IconShield /></span>
                            <span className="drawer-item-label">Administración</span>
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Enviar comentarios</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {enviado ? (
                    <div className="coment-gracias">
                        <div className="coment-gracias-icon">✓</div>
                        <strong>¡Gracias por tu comentario!</strong>
                        <p>{enviado === 'offline'
                            ? 'Quedó guardado en tu dispositivo y se enviará cuando vuelva la conexión.'
                            : 'Lo revisaremos para seguir mejorando FLUJO.'}</p>
                        <button className="modal-btn active" onClick={onClose}>Cerrar</button>
                    </div>
                ) : (
                    <>
                        <p className="coment-intro">Cuéntanos qué te parece la aplicación, qué mejorarías o si encontraste algún problema.</p>

                        <div className="modal-field">
                            <label>TIPO</label>
                            <div className="coment-tipos">
                                {TIPOS_COMENTARIO.map(t => (
                                    <button key={t.id} type="button"
                                        className={`coment-tipo${tipo === t.id ? ' active' : ''}`}
                                        onClick={() => setTipo(t.id)}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="modal-field">
                            <label>¿CÓMO CALIFICAS LA APLICACIÓN? (OPCIONAL)</label>
                            <div className="coment-estrellas">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button key={n} type="button" title={`${n} de 5`}
                                        className={`coment-estrella${n <= calificacion ? ' active' : ''}`}
                                        onClick={() => setCalificacion(c => (c === n ? 0 : n))}>
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="modal-field">
                            <label>COMENTARIO</label>
                            <textarea className="modal-textarea" rows={5} maxLength={2000}
                                placeholder={tipo === 'error'
                                    ? 'Describe qué pasó y en qué pantalla estabas...'
                                    : 'Escribe aquí tu opinión...'}
                                value={mensaje}
                                onChange={e => { setMensaje(e.target.value); setError(''); }} />
                            <span className="coment-contador">{mensaje.length} / 2000</span>
                        </div>

                        {error && <p className="modal-error">{error}</p>}
                        <button className={`modal-btn ${mensaje.trim() ? 'active' : ''}`} onClick={handleEnviar} disabled={enviando}>
                            {enviando ? 'Enviando...' : 'Enviar comentario'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
