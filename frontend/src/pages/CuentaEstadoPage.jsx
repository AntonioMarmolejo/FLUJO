import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pendingFlagKey } from '../lib/homeRoute.js';
import api from '../api/axios';
import '../styles/CuentaEstadoPage.css';

// Cada cuánto se consulta el estado en segundo plano mientras la pantalla
// está visible, para que el aviso de "¡Cuenta activada!" llegue solo.
const POLL_MS = 60 * 1000;

const IconLogo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 8c2-1.5 4-1.5 6 0s4 1.5 6 0 3-1.2 4-.8M4 12.5c2-1.5 4-1.5 6 0s4 1.5 6 0 3-1.2 4-.8M4 17c2-1.5 4-1.5 6 0s4 1.5 6 0 3-1.2 4-.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const IconCheck = ({ size = 14, width = 3 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconClock = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" />
        <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconShield = ({ active }) => (
    <svg width="72" height="80" viewBox="0 0 24 26" fill="none">
        <path d="M12 2L4 5.2v6.3c0 5.2 3.4 9.7 8 11.5 4.6-1.8 8-6.3 8-11.5V5.2L12 2z"
            fill="var(--ce-shield-fill)" stroke="var(--ce-purple)" strokeWidth="1.7" strokeLinejoin="round" />
        {active ? (
            <path d="M8.3 12.4l2.6 2.6 5-5.2" stroke="var(--ce-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
            <>
                <rect x="8.4" y="11" width="7.2" height="5.6" rx="1.4" stroke="var(--ce-purple)" strokeWidth="1.8" />
                <path d="M10 11V9.6a2 2 0 014 0V11" stroke="var(--ce-purple)" strokeWidth="1.8" strokeLinecap="round" />
            </>
        )}
    </svg>
);

const IconBell = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M6 9a6 6 0 0112 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2.2 2.2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconUser = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

const IconMail = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 7l8.5 6 8.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconRefresh = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M20 12a8 8 0 11-2.4-5.7M20 4v4.5h-4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconArrowRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconLogout = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4M15 8l4 4-4 4M19 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconGrid = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
);

const tiempoRelativo = (fecha, ahora) => {
    const min = Math.floor((ahora - fecha) / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;
    return `Hace ${Math.floor(min / 60)} h`;
};

const Paso = ({ estado, titulo, detalle, last }) => (
    <div className={`ce__step ce__step--${estado}`}>
        <div className="ce__step-rail">
            <div className="ce__step-dot">
                {estado === 'done' && <IconCheck size={15} />}
                {estado === 'current' && <span className="ce__step-dot-inner" />}
            </div>
            {!last && <div className="ce__step-line" />}
        </div>
        <div className="ce__step-text">
            <span className="ce__step-title">{titulo}</span>
            {detalle && <span className="ce__step-detail">{detalle}</span>}
        </div>
    </div>
);

// Pantalla para cuentas nuevas: mientras el admin no la apruebe muestra el
// estado "pendiente" (puede ver el inicio pero no hacer cambios); cuando la
// cuenta pasa a activa muestra una sola vez el aviso de "¡Cuenta activada!".
const CuentaEstadoPage = () => {
    const { user, updateUser, logout, isPending, isSuspended } = useAuth();
    const enEspera = isPending || isSuspended;
    const navigate = useNavigate();

    const [checking, setChecking] = useState(false);
    const [aviso, setAviso] = useState(null); // { tipo: 'info' | 'error', texto, fecha }
    const [ahora, setAhora] = useState(() => Date.now());
    const [confirmLogout, setConfirmLogout] = useState(false);
    const checkingRef = useRef(false);
    // updateUser cambia en cada render de AuthProvider; con un ref, verificar
    // queda estable y el intervalo de consulta no se reinicia a cada rato.
    const updateUserRef = useRef(updateUser);
    updateUserRef.current = updateUser;

    useEffect(() => {
        const theme = localStorage.getItem('flujo-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
    }, []);

    useEffect(() => {
        if (enEspera && user) localStorage.setItem(pendingFlagKey(user), '1');
    }, [enEspera, user]);

    const verificar = useCallback(async ({ silencioso = false } = {}) => {
        if (checkingRef.current) return;
        checkingRef.current = true;
        if (!silencioso) setChecking(true);
        try {
            const [{ data }] = await Promise.all([
                api.get('/auth/me', { timeout: 10000 }),
                // Deja ver el estado "Verificando..." aunque el servidor responda al instante
                silencioso ? null : new Promise(r => setTimeout(r, 700)),
            ]);
            updateUserRef.current(data.user);
            const status = data.user.status || 'pending';
            if (!silencioso && data.user.role !== 'admin' && status !== 'active') {
                setAviso({ tipo: 'info', texto: status === 'suspended' ? 'Tu cuenta sigue suspendida' : 'Tu cuenta sigue en revisión', fecha: Date.now() });
                setAhora(Date.now());
            }
        } catch {
            if (!silencioso) {
                setAviso({
                    tipo: 'error',
                    texto: navigator.onLine ? 'No se pudo verificar. Inténtalo de nuevo.' : 'Sin conexión a internet',
                    fecha: Date.now(),
                });
                setAhora(Date.now());
            }
        } finally {
            checkingRef.current = false;
            if (!silencioso) setChecking(false);
        }
    }, []);

    // Consulta periódica + al volver a la pestaña, solo mientras siga pendiente
    useEffect(() => {
        if (!enEspera) return;
        const tick = () => { if (document.visibilityState === 'visible') verificar({ silencioso: true }); };
        const id = setInterval(tick, POLL_MS);
        document.addEventListener('visibilitychange', tick);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
    }, [enEspera, verificar]);

    // Refresca el "Hace X min" del aviso
    useEffect(() => {
        if (!aviso) return;
        const id = setInterval(() => setAhora(Date.now()), 30 * 1000);
        return () => clearInterval(id);
    }, [aviso]);

    const contactarAdmin = async () => {
        try {
            const { data } = await api.get('/auth/admin-contacto');
            const asunto = encodeURIComponent(isSuspended ? 'Cuenta suspendida en FLUJO' : 'Activación de cuenta en FLUJO');
            const cuerpo = encodeURIComponent(
                `Hola${data.name ? ` ${data.name.split(' ')[0]}` : ''},\n\n` +
                (isSuspended
                    ? `Mi cuenta de FLUJO (${user?.name}, ${user?.email}) aparece suspendida. ¿Podrías revisarla?\n\nGracias.`
                    : `Me registré en FLUJO como ${user?.name} (${user?.email}) y mi cuenta está pendiente de activación. ` +
                      '¿Podrías revisarla y asignarme el rol, departamento y módulos que me corresponden?\n\nGracias.')
            );
            window.location.href = `mailto:${data.email}?subject=${asunto}&body=${cuerpo}`;
        } catch {
            setAviso({ tipo: 'error', texto: 'No se pudo obtener el contacto del administrador', fecha: Date.now() });
            setAhora(Date.now());
        }
    };

    const irAlInicio = () => {
        localStorage.removeItem(pendingFlagKey(user));
        navigate('/workspace', { replace: true });
    };

    const nombre = user?.name?.trim().split(' ')[0] || '';
    const activa = !enEspera;

    return (
        <div className={`ce ${activa ? 'ce--active' : 'ce--pending'}`}>
            <main className="ce__card">
                <div className="ce__brand">
                    <span className="ce__brand-logo"><IconLogo /></span>
                    <span className="ce__brand-name">FLUJO</span>
                </div>

                <div className="ce__hero" aria-hidden="true">
                    <IconShield active={activa} />
                    <span className="ce__hero-badge">
                        {activa ? <IconCheck size={15} width={3.2} /> : <IconClock size={15} />}
                    </span>
                </div>

                <span className="ce__pill">
                    {activa ? <IconCheck size={13} /> : <span className="ce__pill-dot" />}
                    {activa ? '¡Cuenta activada!' : isSuspended ? 'Cuenta suspendida' : 'Cuenta pendiente de activación'}
                </span>

                <h1 className="ce__title">
                    {activa ? 'Ya tienes acceso'
                        : isSuspended ? `${nombre ? `${nombre}, tu` : 'Tu'} acceso está suspendido`
                        : `¡Hola${nombre ? `, ${nombre}` : ''}! Tu cuenta ya fue creada`}
                </h1>
                <p className="ce__lead">
                    {activa
                        ? 'Un administrador revisó tu cuenta y asignó tu rol, departamento y módulos. Ya puedes empezar a trabajar en FLUJO.'
                        : isSuspended
                        ? 'Un administrador suspendió tu cuenta, así que por ahora no puedes ver ni registrar nada en FLUJO. Si crees que es un error, contáctalo.'
                        : 'Por seguridad, en FLUJO cada persona solo puede ver los módulos que corresponden a su cargo y área. Un administrador debe revisar tu cuenta y asignarte los permisos antes de que puedas acceder.'}
                </p>

                {!isSuspended && <section className="ce__panel ce__steps" aria-label="Progreso de activación">
                    <Paso estado="done" titulo="Cuenta creada" />
                    <Paso
                        estado={activa ? 'done' : 'current'}
                        titulo="Revisión del administrador"
                        detalle={activa ? 'Rol, departamento y módulos asignados' : 'Asignará tu rol, departamento y módulos'}
                    />
                    <Paso
                        estado={activa ? 'done' : 'todo'}
                        titulo="Acceso a tus módulos"
                        detalle={activa ? 'Listo para entrar' : null}
                        last
                    />
                </section>}

                {isPending && (
                    <section className="ce__panel ce__meanwhile">
                        <h2 className="ce__panel-label">Mientras tanto</h2>
                        <div className="ce__info-row">
                            <span className="ce__info-icon"><IconBell /></span>
                            <span>Te avisaremos cuando tu cuenta esté activa</span>
                        </div>
                        <div className="ce__info-row">
                            <span className="ce__info-icon"><IconUser /></span>
                            <span>Si llevas más de 24 h esperando, contacta a tu supervisor</span>
                        </div>
                        <div className="ce__info-row">
                            <span className="ce__info-icon"><IconMail /></span>
                            <span className="ce__info-email">
                                <span className="ce__muted">Registrado como:</span>
                                <strong>{user?.email}</strong>
                            </span>
                        </div>
                    </section>
                )}

                {!activa && aviso && (
                    <div className={`ce__notice ce__notice--${aviso.tipo}`} role="status">
                        <span className="ce__notice-icon"><IconClock size={18} /></span>
                        <span className="ce__notice-text">{aviso.texto}</span>
                        <span className="ce__notice-time">{tiempoRelativo(aviso.fecha, ahora)}</span>
                    </div>
                )}

                {activa ? (
                    <button className="ce__btn-primary" onClick={irAlInicio}>
                        Ir al inicio <IconArrowRight />
                    </button>
                ) : (
                    <>
                        <button className="ce__btn-primary" onClick={() => verificar()} disabled={checking}>
                            {checking ? <span className="ce__spinner" /> : <IconRefresh />}
                            {checking ? 'Verificando...' : 'Verificar estado'}
                        </button>
                        <button className="ce__btn-link" onClick={contactarAdmin}>
                            Contactar al administrador
                        </button>
                    </>
                )}

                <div className="ce__divider" />

                <div className="ce__footer">
                    {isPending && (
                        <button className="ce__btn-ghost" onClick={() => navigate('/workspace')}>
                            <IconGrid /> Ver el inicio
                        </button>
                    )}
                    <button className="ce__btn-ghost" onClick={() => setConfirmLogout(true)}>
                        <IconLogout /> Cerrar sesión
                    </button>
                </div>
                {isPending && (
                    <p className="ce__footnote">
                        Podrás ver la pantalla de inicio, pero no registrar ni modificar nada hasta que tu cuenta esté activa.
                    </p>
                )}
            </main>

            {confirmLogout && (
                <div className="ce__modal-overlay" onClick={() => setConfirmLogout(false)}>
                    <div className="ce__modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                        <h3>¿Cerrar sesión?</h3>
                        <p>Tendrás que volver a iniciar sesión para revisar el estado de tu cuenta.</p>
                        <div className="ce__modal-actions">
                            <button className="ce__modal-cancel" onClick={() => setConfirmLogout(false)}>Cancelar</button>
                            <button className="ce__modal-confirm" onClick={logout}>Cerrar sesión</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CuentaEstadoPage;
