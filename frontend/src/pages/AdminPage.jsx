import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { BLOQUES_DATA } from '../data/bloques.js';
import '../styles/AdminPage.css';

// Cada rol / estado tiene un "tono" (ver .adm-tono-* en AdminPage.css)
const ROLE_META = {
    admin:      { label: 'Admin',      tono: 'purple' },
    supervisor: { label: 'Supervisor', tono: 'orange' },
    operador:   { label: 'Operador',   tono: 'green' },
};

const STATUS_META = {
    pending:   { label: 'Pendiente',  tono: 'orange' },
    active:    { label: 'Activo',     tono: 'green' },
    suspended: { label: 'Suspendido', tono: 'red' },
};

const PANELS_DISPONIBLES = [
    { id: 'movimientos', label: 'Registrar Movimientos (sync)' },
    { id: 'utilidades',  label: 'Utilidades' },
    { id: 'personas',    label: 'Gestión de Personas' },
    { id: 'placas',      label: 'Placas Vehículos' },
    { id: 'extensiones', label: 'Extensiones' },
    { id: 'reportes',    label: 'Reportes y Avance' },
    { id: 'jefes',       label: 'Jefes Inmediatos' },
    { id: 'puestos',     label: 'Ver Puestos del Bloque' },
];

const nombreBloque = (id) => {
    const b = BLOQUES_DATA[id];
    return b ? `${b.nombre} ${b.codigo}` : `Bloque ${id}`;
};

// Bloques que el usuario eligió y el admin todavía no aprobó
const bloquesSolicitados = (u) => (u.bloques || []).filter(b => !(u.bloquesAprobados || []).includes(b));

const fmt = (d) => {
    if (!d) return 'Nunca';
    return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Initials = ({ name, role }) => {
    const meta = ROLE_META[role] || ROLE_META.operador;
    const ini = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return <div className={`adm-iniciales adm-tono-${meta.tono}`}>{ini}</div>;
};

const RoleBadge = ({ role }) => {
    const meta = ROLE_META[role] || ROLE_META.operador;
    return <span className={`adm-insignia adm-tono-${meta.tono}`}>{meta.label}</span>;
};

const StatusBadge = ({ status }) => {
    const meta = STATUS_META[status] || STATUS_META.pending;
    return <span className={`adm-insignia adm-tono-${meta.tono}`}>{meta.label}</span>;
};

const StatCard = ({ label, value, tono }) => (
    <div className={`adm-stat${tono ? ` adm-tono-${tono}` : ''}`}>
        <div className="adm-stat-valor">{value}</div>
        <div className="adm-stat-label">{label}</div>
    </div>
);

const Modal = ({ title, onClose, children }) => (
    <div className="adm-modal" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="adm-modal-caja">
            <div className="adm-modal-top">
                <span className="adm-modal-titulo">{title}</span>
                <button className="adm-modal-cerrar" onClick={onClose}>×</button>
            </div>
            {children}
        </div>
    </div>
);

const Field = ({ label, children }) => (
    <div className="adm-campo">
        <div className="adm-campo-label">{label}</div>
        {children}
    </div>
);

const Input = (props) => <input {...props} className="adm-input" />;

const Select = ({ value, onChange, children }) => (
    <select className="adm-input adm-select" value={value} onChange={onChange}>{children}</select>
);

// tono: purple (por defecto), muted, green, orange, red
const Btn = ({ onClick, children, tono = 'purple', disabled }) => (
    <button className={`adm-btn adm-tono-${tono}`} onClick={onClick} disabled={disabled}>{children}</button>
);

const TIPO_COMENTARIO = {
    opinion:    { label: 'Opinión',    tono: 'purple' },
    sugerencia: { label: 'Sugerencia', tono: 'green' },
    error:      { label: 'Error',      tono: 'red' },
};

// Comentarios que los usuarios envían desde "Enviar comentarios" en el menú
const ComentariosAdmin = ({ onSinLeer }) => {
    const [comentarios, setComentarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [aEliminar, setAEliminar] = useState(null);

    const actualizar = useCallback((lista) => {
        setComentarios(lista);
        onSinLeer(lista.filter(c => !c.leido).length);
    }, [onSinLeer]);

    useEffect(() => {
        api.get('/comentarios')
            .then(({ data }) => actualizar(data.comentarios))
            .catch(e => setError(e.response?.data?.message || 'No se pudieron cargar los comentarios'))
            .finally(() => setLoading(false));
    }, [actualizar]);

    const marcar = async (c) => {
        try {
            const { data } = await api.patch(`/comentarios/${c._id}`, { leido: !c.leido });
            actualizar(comentarios.map(x => x._id === c._id ? data.comentario : x));
        } catch (e) {
            alert(e.response?.data?.message || 'Error');
        }
    };

    const eliminar = async () => {
        try {
            await api.delete(`/comentarios/${aEliminar._id}`);
            actualizar(comentarios.filter(x => x._id !== aEliminar._id));
        } catch (e) {
            alert(e.response?.data?.message || 'Error');
        } finally {
            setAEliminar(null);
        }
    };

    const conCalificacion = comentarios.filter(c => c.calificacion);
    const promedio = conCalificacion.length
        ? (conCalificacion.reduce((s, c) => s + c.calificacion, 0) / conCalificacion.length).toFixed(1)
        : '—';
    const visibles = comentarios.filter(c =>
        filtro === 'todos' || (filtro === 'sin-leer' ? !c.leido : c.tipo === filtro));

    if (loading) return <div className="adm-vacio">Cargando comentarios…</div>;
    if (error) return <div className="adm-error-texto">{error}</div>;

    return (
        <>
            <div className="adm-stats">
                <StatCard label="Comentarios" value={comentarios.length} />
                <StatCard label="Sin leer" value={comentarios.filter(c => !c.leido).length} tono="orange" />
                <StatCard label="Calificación promedio" value={promedio === '—' ? promedio : `${promedio} ★`} tono="yellow" />
                <StatCard label="Errores reportados" value={comentarios.filter(c => c.tipo === 'error').length} tono="red" />
            </div>

            <div className="adm-filtro-comentarios">
                <Select value={filtro} onChange={e => setFiltro(e.target.value)}>
                    <option value="todos">Todos los comentarios</option>
                    <option value="sin-leer">Sin leer</option>
                    <option value="opinion">Opiniones</option>
                    <option value="sugerencia">Sugerencias</option>
                    <option value="error">Errores</option>
                </Select>
            </div>

            {visibles.length === 0 ? (
                <div className="adm-vacio">
                    {comentarios.length === 0 ? 'Todavía nadie ha enviado comentarios' : 'Sin comentarios con este filtro'}
                </div>
            ) : (
                <div className="adm-lista">
                    {visibles.map(c => {
                        const t = TIPO_COMENTARIO[c.tipo] || TIPO_COMENTARIO.opinion;
                        return (
                            <div key={c._id} className={`adm-comentario${c.leido ? '' : ' nuevo'}`}>
                                <div className="adm-fila-titulo">
                                    <span className="adm-nombre">{c.usuario?.name || 'Usuario eliminado'}</span>
                                    <span className={`adm-etiqueta adm-etiqueta-ancha adm-tono-${t.tono}`}>{t.label}</span>
                                    {c.calificacion && (
                                        <span className="adm-estrellas">
                                            {'★'.repeat(c.calificacion)}<span className="adm-estrellas-vacias">{'★'.repeat(5 - c.calificacion)}</span>
                                        </span>
                                    )}
                                    {!c.leido && <span className="adm-etiqueta adm-etiqueta-ancha adm-tono-orange">nuevo</span>}
                                    <span className="adm-fecha">{fmt(c.createdAt)}</span>
                                </div>
                                {c.usuario?.email && <div className="adm-email">{c.usuario.email}</div>}
                                <p className="adm-mensaje">{c.mensaje}</p>
                                <div className="adm-acciones-fila">
                                    <Btn onClick={() => marcar(c)} tono={c.leido ? 'muted' : 'green'}>
                                        {c.leido ? 'Marcar como no leído' : '✓ Marcar como leído'}
                                    </Btn>
                                    <Btn onClick={() => setAEliminar(c)} tono="red">Eliminar</Btn>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {aEliminar && (
                <Modal title="Eliminar comentario" onClose={() => setAEliminar(null)}>
                    <p className="adm-modal-texto adm-modal-texto-junto">
                        Se eliminará el comentario de {aEliminar.usuario?.name || 'este usuario'}. Esta acción no se puede deshacer.
                    </p>
                    <div className="adm-modal-botones">
                        <Btn onClick={() => setAEliminar(null)} tono="muted">Cancelar</Btn>
                        <Btn onClick={eliminar} tono="red">Eliminar</Btn>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default function AdminPage() {
    const navigate = useNavigate();
    const { user: me } = useAuth();

    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('todos');
    const [filterStatus, setFilterStatus] = useState('todos');

    const [modalCreate, setModalCreate] = useState(false);
    const [modalEdit, setModalEdit] = useState(null);
    const [modalPass, setModalPass] = useState(null);
    const [modalDel, setModalDel] = useState(null);

    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operador' });
    const [editForm, setEditForm] = useState({ name: '', role: 'operador', activo: true, status: 'active', permisosPanel: [], bloquesAprobados: [] });
    const [passForm, setPassForm] = useState({ password: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [loadError, setLoadError] = useState('');
    const [seccion, setSeccion] = useState('usuarios');
    const [comentariosSinLeer, setComentariosSinLeer] = useState(0);

    // Contador de comentarios sin leer para la pestaña, aunque no esté abierta
    useEffect(() => {
        api.get('/comentarios')
            .then(({ data }) => setComentariosSinLeer(data.comentarios.filter(c => !c.leido).length))
            .catch(() => {});
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [uRes, sRes] = await Promise.all([
                api.get('/admin/usuarios'),
                api.get('/admin/stats'),
            ]);
            setUsers(uRes.data.users);
            setStats(sRes.data);
        } catch (e) {
            const status = e.response?.status;
            const msg = e.response?.data?.message;
            if (status === 403) {
                setLoadError('Acceso denegado (403). Tu sesión no tiene permisos de administrador. Cierra sesión y vuelve a iniciar.');
            } else if (status === 401) {
                setLoadError('Sesión expirada (401). Cierra sesión y vuelve a iniciar.');
            } else if (msg) {
                setLoadError(msg);
            } else {
                setLoadError(`Error ${status || 'de red'} al cargar usuarios. Revisa los logs del servidor.`);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
        const matchRole = filterRole === 'todos' || u.role === filterRole;
        const matchStatus = filterStatus === 'todos' || u.status === filterStatus;
        return matchSearch && matchRole && matchStatus;
    });

    const handleCreate = async () => {
        if (!form.name || !form.email || !form.password) { setError('Todos los campos son obligatorios'); return; }
        setSaving(true); setError('');
        try {
            await api.post('/admin/usuarios', form);
            setModalCreate(false);
            setForm({ name: '', email: '', password: '', role: 'operador' });
            load();
        } catch (e) {
            setError(e.response?.data?.message || 'Error al crear usuario');
        } finally { setSaving(false); }
    };

    const handleEdit = async () => {
        setSaving(true); setError('');
        try {
            await api.put(`/admin/usuarios/${modalEdit.id}`, editForm);
            setModalEdit(null);
            load();
        } catch (e) {
            setError(e.response?.data?.message || 'Error al actualizar');
        } finally { setSaving(false); }
    };

    const handleToggleActivo = async (u) => {
        try {
            await api.put(`/admin/usuarios/${u.id}`, { activo: !u.activo });
            load();
        } catch (e) {
            alert(e.response?.data?.message || 'Error');
        }
    };

    const handleAprobar = async (u) => {
        try {
            // Aprobar la cuenta aprueba también los bloques que el usuario pidió
            await api.put(`/admin/usuarios/${u.id}`, {
                status: 'active',
                permisosPanel: ['movimientos'],
                bloquesAprobados: [...new Set([...(u.bloquesAprobados || []), ...(u.bloques || [])])],
            });
            load();
        } catch (e) {
            alert(e.response?.data?.message || 'Error al aprobar');
        }
    };

    const handlePassword = async () => {
        if (passForm.password !== passForm.confirm) { setError('Las contraseñas no coinciden'); return; }
        if (passForm.password.length < 6) { setError('Mínimo 6 caracteres'); return; }
        setSaving(true); setError('');
        try {
            await api.put(`/admin/usuarios/${modalPass.id}/password`, { password: passForm.password });
            setModalPass(null);
            setPassForm({ password: '', confirm: '' });
        } catch (e) {
            setError(e.response?.data?.message || 'Error');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            await api.delete(`/admin/usuarios/${modalDel.id}`);
            setModalDel(null);
            load();
        } catch (e) {
            alert(e.response?.data?.message || 'Error');
        } finally { setSaving(false); }
    };

    return (
        <div className="adm">

            {/* Header */}
            <div className="adm-hdr">
                <button className="adm-volver" onClick={() => navigate('/workspace')}>←</button>
                <div>
                    <div className="adm-titulo">Panel de Administración</div>
                    <div className="adm-subtitulo">Gestión de usuarios del sistema</div>
                </div>
                <div className="adm-hdr-btns">
                    <Btn onClick={load} tono="muted">
                        ↻ Actualizar
                    </Btn>
                    <Btn onClick={() => { setForm({ name: '', email: '', password: '', role: 'operador' }); setError(''); setModalCreate(true); }}>
                        + Nuevo usuario
                    </Btn>
                </div>
            </div>

            <div className="adm-contenido">

                {/* Secciones */}
                <div className="adm-secciones">
                    {[['usuarios', 'Usuarios'], ['comentarios', `Comentarios${comentariosSinLeer ? ` (${comentariosSinLeer})` : ''}`]].map(([id, label]) => (
                        <button key={id} className={`adm-seccion${seccion === id ? ' activa' : ''}`} onClick={() => setSeccion(id)}>{label}</button>
                    ))}
                </div>

                {seccion === 'comentarios' ? <ComentariosAdmin onSinLeer={setComentariosSinLeer} /> : (<>

                {/* Stats */}
                {stats && (
                    <div className="adm-stats">
                        <StatCard label="Total usuarios" value={stats.total} />
                        <StatCard label="Pendientes" value={stats.pendientes} tono="orange" />
                        <StatCard label="Admins" value={stats.admins} tono="purple" />
                        <StatCard label="Supervisores" value={stats.supervisors} tono="orange" />
                        <StatCard label="Operadores" value={stats.operadores} tono="green" />
                        <StatCard label="Inactivos" value={stats.inactivos} tono="red" />
                        <StatCard label="Activos (30 días)" value={stats.activosUltimos30} tono="yellow" />
                    </div>
                )}

                {/* Filtros */}
                <div className="adm-filtros">
                    <input
                        className="adm-filtro adm-filtro-buscar"
                        placeholder="Buscar por nombre o correo…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select className="adm-filtro adm-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="todos">Todos los estados</option>
                        <option value="pending">Pendientes</option>
                        <option value="active">Activos</option>
                        <option value="suspended">Suspendidos</option>
                    </select>
                    <select className="adm-filtro adm-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                        <option value="todos">Todos los roles</option>
                        <option value="admin">Admin</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="operador">Operador</option>
                    </select>
                </div>

                {/* Lista */}
                {loadError && (
                    <div className="adm-alerta">{loadError}</div>
                )}
                {loading ? (
                    <div className="adm-vacio">Cargando…</div>
                ) : filtered.length === 0 ? (
                    <div className="adm-vacio">No se encontraron usuarios</div>
                ) : (
                    <div className="adm-lista">
                        {filtered.map(u => (
                            <div key={u.id} className={`adm-card${u.activo ? '' : ' inactivo'}`}>
                                <Initials name={u.name} role={u.role} />
                                <div className="adm-card-info">
                                    <div className="adm-fila-titulo">
                                        <span className="adm-nombre">{u.name}</span>
                                        <RoleBadge role={u.role} />
                                        <StatusBadge status={u.status} />
                                        {u.id === me?.id && (
                                            <span className="adm-etiqueta adm-etiqueta-tu">tú</span>
                                        )}
                                        {!u.activo && (
                                            <span className="adm-etiqueta adm-etiqueta-borde adm-tono-red">inactivo</span>
                                        )}
                                    </div>
                                    <div className="adm-email">{u.email}</div>
                                    <div className="adm-dato">
                                        Último acceso: {fmt(u.lastLogin)}
                                    </div>
                                    {u.permisosPanel?.length > 0 && (
                                        <div className="adm-dato adm-dato-paneles">
                                            Paneles: {u.permisosPanel.join(', ')}
                                        </div>
                                    )}
                                    {u.role !== 'admin' && (
                                        <div className="adm-bloques">
                                            {u.bloquesAprobados?.map(b => (
                                                <span key={b} className="adm-etiqueta adm-tono-green">
                                                    {nombreBloque(b)}
                                                </span>
                                            ))}
                                            {bloquesSolicitados(u).map(b => (
                                                <span key={b} className="adm-etiqueta adm-tono-orange">
                                                    Solicita {nombreBloque(b)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="adm-actions">
                                    {u.status === 'pending' && u.id !== me?.id && (
                                        <Btn onClick={() => handleAprobar(u)} tono="green">
                                            ✓ Aprobar
                                        </Btn>
                                    )}
                                    <Btn onClick={() => { setEditForm({ name: u.name, role: u.role, activo: u.activo, status: u.status || 'pending', permisosPanel: u.permisosPanel || [], bloquesAprobados: u.bloquesAprobados || [] }); setError(''); setModalEdit(u); }}>
                                        Editar
                                    </Btn>
                                    <Btn onClick={() => { setPassForm({ password: '', confirm: '' }); setError(''); setModalPass(u); }} tono="orange">
                                        Contraseña
                                    </Btn>
                                    <Btn onClick={() => handleToggleActivo(u)} tono={u.activo ? 'red' : 'green'}>
                                        {u.activo ? 'Desactivar' : 'Activar'}
                                    </Btn>
                                    {u.id !== me?.id && (
                                        <Btn onClick={() => setModalDel(u)} tono="red">
                                            Eliminar
                                        </Btn>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </>)}
            </div>

            {/* Modal: Crear usuario */}
            {modalCreate && (
                <Modal title="Crear usuario" onClose={() => setModalCreate(false)}>
                    <Field label="Nombre completo">
                        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Juan Pérez" />
                    </Field>
                    <Field label="Correo electrónico">
                        <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
                    </Field>
                    <Field label="Contraseña inicial">
                        <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                    </Field>
                    <Field label="Rol">
                        <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                            <option value="operador">Operador</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Administrador</option>
                        </Select>
                    </Field>
                    {error && <div className="adm-modal-error">{error}</div>}
                    <div className="adm-modal-botones">
                        <Btn onClick={() => setModalCreate(false)} tono="muted">Cancelar</Btn>
                        <Btn onClick={handleCreate} disabled={saving}>{saving ? 'Creando…' : 'Crear usuario'}</Btn>
                    </div>
                </Modal>
            )}

            {/* Modal: Editar usuario */}
            {modalEdit && (
                <Modal title={`Editar: ${modalEdit.name}`} onClose={() => setModalEdit(null)}>
                    <Field label="Nombre">
                        <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    </Field>
                    <Field label="Rol">
                        <Select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                            <option value="operador">Operador</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Administrador</option>
                        </Select>
                    </Field>
                    <Field label="Estado de cuenta">
                        <Select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                            <option value="pending">Pendiente de aprobación</option>
                            <option value="active">Activo</option>
                            <option value="suspended">Suspendido</option>
                        </Select>
                    </Field>
                    <Field label="Paneles habilitados">
                        <div className="adm-checks adm-checks-separados">
                            {PANELS_DISPONIBLES.map(p => {
                                const checked = editForm.permisosPanel.includes(p.id);
                                return (
                                    <label key={p.id} className="adm-check">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => setEditForm(f => ({
                                                ...f,
                                                permisosPanel: checked
                                                    ? f.permisosPanel.filter(x => x !== p.id)
                                                    : [...f.permisosPanel, p.id],
                                            }))}
                                        />
                                        {p.label}
                                    </label>
                                );
                            })}
                        </div>
                    </Field>
                    {editForm.role !== 'admin' && (
                        <Field label="Bloques aprobados">
                            <div className="adm-ayuda">
                                Solo verá la información (firmas, nominativos, puestos) y podrá abrir turno en los bloques marcados.
                            </div>
                            <div className="adm-checks">
                                {[...new Set([...Object.keys(BLOQUES_DATA), ...(modalEdit.bloques || []), ...editForm.bloquesAprobados])].map(b => {
                                    const checked = editForm.bloquesAprobados.includes(b);
                                    return (
                                        <label key={b} className="adm-check">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => setEditForm(f => ({
                                                    ...f,
                                                    bloquesAprobados: checked
                                                        ? f.bloquesAprobados.filter(x => x !== b)
                                                        : [...f.bloquesAprobados, b],
                                                }))}
                                            />
                                            {nombreBloque(b)}
                                            {(modalEdit.bloques || []).includes(b) && !checked && (
                                                <span className="adm-etiqueta adm-tono-orange">
                                                    solicitado
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </Field>
                    )}
                    {error && <div className="adm-modal-error">{error}</div>}
                    <div className="adm-modal-botones">
                        <Btn onClick={() => setModalEdit(null)} tono="muted">Cancelar</Btn>
                        <Btn onClick={handleEdit} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</Btn>
                    </div>
                </Modal>
            )}

            {/* Modal: Cambiar contraseña */}
            {modalPass && (
                <Modal title={`Contraseña: ${modalPass.name}`} onClose={() => setModalPass(null)}>
                    <Field label="Nueva contraseña">
                        <Input type="password" value={passForm.password} onChange={e => setPassForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                    </Field>
                    <Field label="Confirmar contraseña">
                        <Input type="password" value={passForm.confirm} onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repite la contraseña" />
                    </Field>
                    {error && <div className="adm-modal-error">{error}</div>}
                    <div className="adm-modal-botones">
                        <Btn onClick={() => setModalPass(null)} tono="muted">Cancelar</Btn>
                        <Btn onClick={handlePassword} disabled={saving} tono="orange">{saving ? 'Guardando…' : 'Actualizar contraseña'}</Btn>
                    </div>
                </Modal>
            )}

            {/* Modal: Confirmar eliminación */}
            {modalDel && (
                <Modal title="Eliminar usuario" onClose={() => setModalDel(null)}>
                    <p className="adm-modal-texto">
                        ¿Estás seguro de que quieres eliminar a <strong>{modalDel.name}</strong>?<br />
                        Esta acción no se puede deshacer.
                    </p>
                    <div className="adm-modal-botones">
                        <Btn onClick={() => setModalDel(null)} tono="muted">Cancelar</Btn>
                        <Btn onClick={handleDelete} disabled={saving} tono="red">{saving ? 'Eliminando…' : 'Eliminar'}</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
