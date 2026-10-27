// Marca que este usuario vio la pantalla de cuenta pendiente: cuando el admin
// lo active, la próxima vez que entre verá una sola vez el aviso de
// "¡Cuenta activada!" antes de ir al inicio.
export const pendingFlagKey = (user) => `flujo-pendiente-${user?.id}`;

// A dónde llevar al usuario al entrar. Ya no depende de onboardingCompleto:
// el inicio se puede ver sin haber creado un flujo. Una cuenta pendiente
// pasa primero por /cuenta-pendiente (y desde ahí puede ver el inicio); una
// suspendida se queda ahí, porque el servidor no le responde nada más.
export const getHomeRoute = (user) => {
    if (!user || user.role === 'admin') return '/workspace';
    if (['pending', 'suspended'].includes(user.status || 'pending')) return '/cuenta-pendiente';
    if (localStorage.getItem(pendingFlagKey(user))) return '/cuenta-pendiente';
    return '/workspace';
};
