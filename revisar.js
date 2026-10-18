// Revisa preguntas.yaml sin arrancar el juego. Lo usa GitHub cada vez que guardás un cambio.
const path = require('path');
const { cargarPreguntas } = require('./preguntas');

const r = cargarPreguntas(path.join(__dirname, '..', 'preguntas.yaml'));
if (r.errores.length) {
  console.error('\n❌ preguntas.yaml tiene errores:\n');
  r.errores.forEach(e => console.error('  • ' + e));
  console.error('');
  process.exit(1);
}
const cas = Object.values(r.mapa);
const total = cas.reduce((n, c) => n + c.preguntas.length, 0);
console.log(`\n✅ preguntas.yaml está bien: ${cas.length} casilleros y ${total} preguntas.\n`);
cas.forEach(c => console.log(`  ${c.carril.padEnd(5)} ${c.numero}  ${c.nombre.padEnd(22)} ${c.preguntas.length} pregunta(s)${c.trampa ? `  · trampa, retroceden ${c.retroceden}` : ''}`));
console.log('');
