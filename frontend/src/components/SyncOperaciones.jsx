import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { syncPendingOperaciones } from '../lib/syncEngine.js';
import { syncFlujoWorkers } from '../lib/flujoWorkersOffline.js';
import { syncVehiculos } from '../lib/vehiculosOffline.js';
import { syncPersonas } from '../lib/personasOffline.js';

// Sube la cola offline de turnos, firmas y personas desde cualquier pantalla:
// al volver la conexión, al recuperar el foco y cada 30 s como respaldo.
const SyncOperaciones = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        const sync = () => {
            syncPendingOperaciones().catch(() => {});
            syncFlujoWorkers().catch(() => {});
            syncVehiculos().catch(() => {});
            syncPersonas().catch(() => {});
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
    }, [user]);

    return null;
};

export default SyncOperaciones;
