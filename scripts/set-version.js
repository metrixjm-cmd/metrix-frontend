/**
 * set-version.js
 *
 * Lee la versión de package.json y genera src/environments/app-version.ts
 * con la versión + fecha de build. Se ejecuta automáticamente como
 * prebuild de npm (y explícitamente en CI/CD antes de ng build).
 *
 * Uso manual:
 *   node scripts/set-version.js
 */

const fs   = require('fs');
const path = require('path');

const pkg     = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
const version = pkg.version;

// Fecha de build en formato YYYY-MM-DD
const now       = new Date();
const buildDate = now.toISOString().split('T')[0];

// Timestamp Unix para cálculos exactos si se necesitan
const buildTimestamp = now.getTime();

const content = `// ─────────────────────────────────────────────────────────────
// AUTO-GENERADO por scripts/set-version.js — NO EDITAR A MANO
// Fuente: package.json → version: "${version}"
// Generado: ${new Date().toISOString()}
// ─────────────────────────────────────────────────────────────
export const APP_VERSION = {
  version:        '${version}',
  buildDate:      '${buildDate}',
  buildTimestamp: ${buildTimestamp},
} as const;
`;

const outPath = path.resolve(__dirname, '../src/environments/app-version.ts');
fs.writeFileSync(outPath, content, 'utf8');

console.log(`✅ app-version.ts generado: v${version} (${buildDate})`);
