// Limpieza de movimientos duplicados creados por la carrera entre el guardado
// inicial y el motor de reintento offline (mismo clientUUID, varias veces).
//
// Por defecto corre en modo DRY-RUN: solo reporta qué encontraría y qué
// borraría, sin tocar nada. Para aplicar los borrados de verdad:
//
//   node scripts/cleanupDuplicateMovimientos.js --apply
//
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movimiento from '../src/models/Movimiento.model.js';

dotenv.config();

const APPLY = process.argv.includes('--apply');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Conectado a MongoDB. Modo: ${APPLY ? 'APLICAR BORRADOS' : 'DRY-RUN (solo reporte)'}\n`);

    // Agrupa por (usuario, clientUUID) — solo clientUUID no nulos, que son los
    // únicos que pudieron haber sufrido la carrera de reintento.
    const grupos = await Movimiento.aggregate([
        { $match: { clientUUID: { $type: 'string' } } },
        {
            $group: {
                _id: { usuario: '$usuario', clientUUID: '$clientUUID' },
                count: { $sum: 1 },
                docs: { $push: { id: '$_id', createdAt: '$createdAt', placa: '$placa', fecha: '$fecha', hora: '$hora' } },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]);

    if (grupos.length === 0) {
        console.log('No se encontraron duplicados por clientUUID. Nada que hacer.');
        await mongoose.disconnect();
        return;
    }

    let totalABorrar = 0;
    const idsABorrar = [];

    for (const g of grupos) {
        const ordenados = [...g.docs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const [conservar, ...duplicados] = ordenados;
        totalABorrar += duplicados.length;
        duplicados.forEach(d => idsABorrar.push(d.id));

        console.log(`clientUUID ${g._id.clientUUID} (usuario ${g._id.usuario}) — ${g.count} copias:`);
        console.log(`  conserva:  ${conservar.id}  ${conservar.placa} ${conservar.fecha} ${conservar.hora} (más antiguo)`);
        duplicados.forEach(d => console.log(`  BORRA:     ${d.id}  ${d.placa} ${d.fecha} ${d.hora}`));
        console.log('');
    }

    console.log(`Resumen: ${grupos.length} clientUUID con duplicados, ${totalABorrar} registros de más a eliminar.`);

    if (!APPLY) {
        console.log('\nEsto fue un DRY-RUN — no se borró nada. Vuelve a correr con --apply para aplicar.');
    } else {
        const result = await Movimiento.deleteMany({ _id: { $in: idsABorrar } });
        console.log(`\nBorrados ${result.deletedCount} registros duplicados.`);
    }

    await mongoose.disconnect();
};

run().catch(err => {
    console.error('Error en la limpieza:', err);
    process.exit(1);
});
