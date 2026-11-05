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

// Antes el ID de cada huella se guardaba codificado dos veces en base64url. Un ID
// real, al decodificarlo, da bytes al azar; uno doble da otra vez texto base64url.
export const migrarPasskeys = async () => {
    try {
        let corregidas = 0;
        for (const user of await User.find({ 'passkeys.0': { $exists: true } }).select('+passkeys')) {
            for (const pk of user.passkeys) {
                const decodificado = Buffer.from(pk.credentialID, 'base64url').toString('latin1');
                if (!/^[A-Za-z0-9_-]{16,}$/.test(decodificado)) continue;
                await User.updateOne(
                    { _id: user._id, 'passkeys.credentialID': pk.credentialID },
                    { $set: { 'passkeys.$.credentialID': decodificado } }
                );
                corregidas++;
            }
        }
        if (corregidas) console.log(`🔐 Huellas: ${corregidas} ID corregidos`);
    } catch (error) {
        console.error('Error corrigiendo las huellas guardadas:', error.message);
    }
};
