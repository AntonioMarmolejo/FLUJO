import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const svg = readFileSync('./public/pwa-icon.svg');

await sharp(svg).resize(192).png().toFile('./public/pwa-192.png');
console.log('✓ pwa-192.png generado');

await sharp(svg).resize(512).png().toFile('./public/pwa-512.png');
console.log('✓ pwa-512.png generado');
