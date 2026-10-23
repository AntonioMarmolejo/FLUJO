// Inspección de solo lectura: busca movimientos que parezcan duplicados por
// contenido (misma placa/fecha/hora/tipo/puesto/bloque/usuario), sin asumir
// que compartan clientUUID — para entender el patrón real antes de limpiar.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movimiento from '../src/models/Movimiento.model.js';

dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    const grupos = await Movimiento.aggregate([
        {
            $group: {
                _id: { usuario: '$usuario', puesto: '$puesto', bloque: '$bloque', fecha: '$fecha', hora: '$hora', tipo: '$tipo', placa: '$placa' },
                count: { $sum: 1 },
                docs: { $push: { id: '$_id', clientUUID: '$clientUUID', createdAt: '$createdAt' } },
            },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
    ]);

    console.log(`Grupos con contenido idéntico (misma placa/fecha/hora/tipo/puesto/bloque/usuario): ${grupos.length}\n`);
    for (const g of grupos.slice(0, 30)) {
        console.log(JSON.stringify(g._id));
        g.docs.forEach(d => console.log(`   id=${d.id}  clientUUID=${d.clientUUID}  createdAt=${d.createdAt}`));
        console.log('');
    }
    if (grupos.length > 30) console.log(`... y ${grupos.length - 30} grupos más`);

    await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
