import User from '../models/User.model.js';
import Firma from '../models/Firma.model.js';

// Al introducir la aprobación de bloques, los usuarios ya activos conservan
// los bloques que tenían (quedan aprobados); los pendientes deben esperar al
// admin. Las firmas sin bloque toman el del usuario que las registró si este
// tenía uno solo. Solo actúa sobre documentos sin el campo nuevo: es idempotente.
export const migrarBloquesAprobados = async () => {
    try {
        const activos = { modifiedCount: 0 };
        const resto = { modifiedCount: 0 };
        const pendientes = await User.find({ bloquesAprobados: { $exists: false } }).select('status bloques').lean();
        for (const u of pendientes) {
            const conserva = u.status === 'active';
            await User.updateOne({ _id: u._id }, { $set: { bloquesAprobados: conserva ? (u.bloques || []) : [] } });
            (conserva ? activos : resto).modifiedCount++;
        }

        let firmas = 0;
        for (const firma of await Firma.find({ bloque: '' }).select('usuario')) {
            const autor = await User.findById(firma.usuario).select('bloques');
            if (autor?.bloques?.length === 1) {
                await Firma.updateOne({ _id: firma._id }, { bloque: autor.bloques[0] });
                firmas++;
            }
        }

        if (activos.modifiedCount || resto.modifiedCount || firmas) {
            console.log(`🔐 Bloques aprobados: ${activos.modifiedCount} activos conservaron sus bloques, ${resto.modifiedCount} quedan por aprobar; ${firmas} firmas sin bloque asignadas`);
        }
    } catch (error) {
        console.error(`❌ Migración de bloques: ${error.message}`);
    }
};
