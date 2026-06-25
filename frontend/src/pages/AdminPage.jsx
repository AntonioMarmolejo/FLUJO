import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const C = {
    bg: '#0a0a14',
    surface: '#12121e',
    surface2: '#1a1a28',
    border: 'rgba(255,255,255,0.08)',
    text: '#f0f0f5',
    muted: '#666680',
    purple: '#7c6fef',
    purpleDim: 'rgba(124,111,239,0.15)',
    green: '#28c997',
    greenDim: 'rgba(40,201,151,0.15)',
    red: '#e64b6b',
    redDim: 'rgba(230,75,107,0.15)',
    orange: '#ef9f27',
    orangeDim: 'rgba(239,159,39,0.15)',
    yellow: '#e6d44b',
    yellowDim: 'rgba(230,212,75,0.15)',
};

const ROLE_META = {
    admin:      { label: 'Admin',      color: C.purple,  dim: C.purpleDim },
    supervisor: { label: 'Supervisor', color: C.orange,  dim: C.orangeDim },
    operador:   { label: 'Operador',   color: C.green,   dim: C.greenDim  },
};

const fmt = (d) => {
    if (!d) return 'Nunca';
    return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Initials = ({ name, role }) => {
    const meta = ROLE_META[role] || ROLE_META.operador;
    const ini = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return (
        <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: meta.dim, border: `1px solid ${meta.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: meta.color, fontWeight: 700, fontSize: 14,
        }}>{ini}</div>
    );
};

const RoleBadge = ({ role }) => {
    const meta = ROLE_META[role] || ROLE_META.operador;
    return (
        <span style={{
            background: meta.dim, color: meta.color,
            border: `1px solid ${meta.color}44`,
            padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        }}>{meta.label}</span>
    );
};

const StatCard = ({ label, value, color }) => (
    <div style={{
        background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 100,
    }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: color || C.text }}>{value}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
);

const Modal = ({ title, onClose, children }) => (
    <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 24, width: '100%', maxWidth: 420,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            {children}
        </div>
    </div>
);

const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
        {children}
    </div>
);

const Input = (props) => (
    <input {...props} style={{
        width: '100%', background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14,
        outline: 'none', boxSizing: 'border-box', ...props.style,
    }} />
);

const Select = ({ value, onChange, children }) => (
    <select value={value} onChange={onChange} style={{
        width: '100%', background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14,
        outline: 'none', cursor: 'pointer',
    }}>{children}</select>
);

const Btn = ({ onClick, children, color = C.purple, disabled, style: s }) => (
    <button onClick={onClick} disabled={disabled} style={{
        background: color + '22', border: `1px solid ${color}55`,
        color, borderRadius: 8, padding: '8px 14px', cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13, fontWeight: 600, opacity: disabled ? 0.5 : 1, ...s,
    }}>{children}</button>
);

export default function AdminPage() {
    const navigate = useNavigate();
    const { user: me } = useAuth();

    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('todos');

    const [modalCreate, setModalCreate] = useState(false);
    const [modalEdit, setModalEdit] = useState(null);
    const [modalPass, setModalPass] = useState(null);
    const [modalDel, setModalDel] = useState(null);

    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operador' });
    const [editForm, setEditForm] = useState({ name: '', role: 'operador', activo: true });
    const [passForm, setPassForm] = useState({ password: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const [uRes, sRes] = await Promise.all([
                api.get('/admin/usuarios'),
                api.get('/admin/stats'),
            ]);
            setUsers(uRes.data.users);
            setStats(sRes.data);
        } catch {
            /* ignorar */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
        const matchRole = filterRole === 'todos' || u.role === filterRole;
        return matchSearch && matchRole;
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
        <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif' }}>

            {/* Header */}
            <div style={{
                background: C.surface, borderBottom: `1px solid ${C.border}`,
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <button onClick={() => navigate('/workspace')} style={{
                    background: C.surface2, border: `1px solid ${C.border}`,
                    color: C.muted, borderRadius: 8, width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 18, flexShrink: 0,
                }}>←</button>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Panel de Administración</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Gestión de usuarios del sistema</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                    <Btn onClick={() => { setForm({ name: '', email: '', password: '', role: 'operador' }); setError(''); setModalCreate(true); }}>
                        + Nuevo usuario
                    </Btn>
                </div>
            </div>

            <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto' }}>

                {/* Stats */}
                {stats && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                        <StatCard label="Total usuarios" value={stats.total} />
                        <StatCard label="Admins" value={stats.admins} color={C.purple} />
                        <StatCard label="Supervisores" value={stats.supervisors} color={C.orange} />
                        <StatCard label="Operadores" value={stats.operadores} color={C.green} />
                        <StatCard label="Inactivos" value={stats.inactivos} color={C.red} />
                        <StatCard label="Activos (30 días)" value={stats.activosUltimos30} color={C.yellow} />
                    </div>
                )}

                {/* Filtros */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <input
                        placeholder="Buscar por nombre o correo…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            flex: 1, minWidth: 200,
                            background: C.surface2, border: `1px solid ${C.border}`,
                            borderRadius: 8, padding: '9px 14px', color: C.text, fontSize: 14, outline: 'none',
                        }}
                    />
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{
                        background: C.surface2, border: `1px solid ${C.border}`,
                        borderRadius: 8, padding: '9px 14px', color: C.text, fontSize: 14,
                        outline: 'none', cursor: 'pointer',
                    }}>
                        <option value="todos">Todos los roles</option>
                        <option value="admin">Admin</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="operador">Operador</option>
                    </select>
                </div>

                {/* Lista */}
                {loading ? (
                    <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>Cargando…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>No se encontraron usuarios</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filtered.map(u => (
                            <div key={u.id} style={{
                                background: C.surface, border: `1px solid ${C.border}`,
                                borderRadius: 12, padding: '14px 16px',
                                display: 'flex', alignItems: 'center', gap: 12,
                                opacity: u.activo ? 1 : 0.55,
                            }}>
                                <Initials name={u.name} role={u.role} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                                        <RoleBadge role={u.role} />
                                        {u.id === me?.id && (
                                            <span style={{ fontSize: 11, color: C.muted, background: C.surface2, padding: '1px 7px', borderRadius: 10, border: `1px solid ${C.border}` }}>tú</span>
                                        )}
                                        {!u.activo && (
                                            <span style={{ fontSize: 11, color: C.red, background: C.redDim, padding: '1px 7px', borderRadius: 10, border: `1px solid ${C.red}44` }}>inactivo</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{u.email}</div>
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                                        Último acceso: {fmt(u.lastLogin)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <Btn onClick={() => { setEditForm({ name: u.name, role: u.role, activo: u.activo }); setError(''); setModalEdit(u); }}>
                                        Editar
                                    </Btn>
                                    <Btn onClick={() => { setPassForm({ password: '', confirm: '' }); setError(''); setModalPass(u); }} color={C.orange}>
                                        Contraseña
                                    </Btn>
                                    <Btn onClick={() => handleToggleActivo(u)} color={u.activo ? C.red : C.green}>
                                        {u.activo ? 'Desactivar' : 'Activar'}
                                    </Btn>
                                    {u.id !== me?.id && (
                                        <Btn onClick={() => setModalDel(u)} color={C.red}>
                                            Eliminar
                                        </Btn>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
                    {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Btn onClick={() => setModalCreate(false)} color={C.muted}>Cancelar</Btn>
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
                    {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Btn onClick={() => setModalEdit(null)} color={C.muted}>Cancelar</Btn>
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
                    {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Btn onClick={() => setModalPass(null)} color={C.muted}>Cancelar</Btn>
                        <Btn onClick={handlePassword} disabled={saving} color={C.orange}>{saving ? 'Guardando…' : 'Actualizar contraseña'}</Btn>
                    </div>
                </Modal>
            )}

            {/* Modal: Confirmar eliminación */}
            {modalDel && (
                <Modal title="Eliminar usuario" onClose={() => setModalDel(null)}>
                    <p style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                        ¿Estás seguro de que quieres eliminar a <strong style={{ color: C.text }}>{modalDel.name}</strong>?<br />
                        Esta acción no se puede deshacer.
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Btn onClick={() => setModalDel(null)} color={C.muted}>Cancelar</Btn>
                        <Btn onClick={handleDelete} disabled={saving} color={C.red}>{saving ? 'Eliminando…' : 'Eliminar'}</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
