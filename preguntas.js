// Lee y revisa preguntas.yaml. Si algo está mal, devuelve errores claros en español.
const fs = require('fs');
const yaml = require('js-yaml');

const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Qué casilleros tiene que haber en el tablero
const ESPERADOS = [
  ['comun', 0], ['comun', 1],
  ['mesa', 2], ['mesa', 3], ['mesa', 4], ['mesa', 5],
  ['casa', 2], ['casa', 3], ['casa', 4], ['casa', 5],
  ['comun', 6], ['comun', 7],
];

function cargarPreguntas(ruta) {
  const errores = [];
  let crudo;
  try {
    crudo = yaml.load(fs.readFileSync(ruta, 'utf8'));
  } catch (e) {
    const linea = e.mark ? ` (cerca de la línea ${e.mark.line + 1})` : '';
    return { errores: [`El archivo preguntas.yaml tiene un error de formato${linea}. Revisá sangrías, guiones y comillas.\n   Detalle: ${e.reason || e.message}`] };
  }
  if (!crudo || typeof crudo !== 'object') return { errores: ['preguntas.yaml está vacío.'] };

  const a = crudo.ajustes || {};
  const ajustes = {
    segundos: Number(a.segundos_para_responder ?? 90),
    gruposPorDefecto: Number(a.grupos_por_defecto ?? 5),
    rondas: Number(a.rondas ?? 7),
    corteAuto: a.pasar_solo_si_respondieron_todos ?? true,
    mostrarParaDecir: a.mostrar_para_decir_en_proyector ?? true,
  };
  if (!(ajustes.segundos >= 10 && ajustes.segundos <= 600)) errores.push('ajustes → segundos_para_responder tiene que ser un número entre 10 y 600.');
  if (!(ajustes.gruposPorDefecto >= 2 && ajustes.gruposPorDefecto <= 8)) errores.push('ajustes → grupos_por_defecto tiene que ser un número entre 2 y 8.');
  if (!(ajustes.rondas >= 1 && ajustes.rondas <= 30)) errores.push('ajustes → rondas tiene que ser un número entre 1 y 30.');

  const lista = Array.isArray(crudo.casilleros) ? crudo.casilleros : [];
  if (!lista.length) errores.push('Falta la lista "casilleros:".');

  const mapa = {};
  lista.forEach((c, i) => {
    const donde = `Casillero #${i + 1}${c && c.nombre ? ` ("${c.nombre}")` : ''}`;
    if (!c || typeof c !== 'object') { errores.push(`${donde}: está vacío o mal escrito.`); return; }
    let carril = sinTildes(c.carril);
    if (carril === 'comun' || carril === 'común') carril = 'comun';
    if (!['comun', 'mesa', 'casa'].includes(carril)) { errores.push(`${donde}: "carril" tiene que ser común, mesa o casa.`); return; }
    const numero = Number(c.numero);
    if (!Number.isInteger(numero) || numero < 0 || numero > 7) { errores.push(`${donde}: "numero" tiene que ser un número del 0 al 7.`); return; }
    const key = `${carril}-${numero}`;
    if (mapa[key]) { errores.push(`${donde}: hay dos casilleros con carril ${c.carril} y número ${numero}.`); return; }
    const cas = {
      key, carril, numero,
      nombre: String(c.nombre || '').trim() || `Casillero ${numero}`,
      trampa: !!c.trampa,
      retroceden: Number(c.retroceden ?? 2),
      preguntas: [],
    };
    if (cas.trampa && !(cas.retroceden >= 1 && cas.retroceden <= 6)) errores.push(`${donde}: "retroceden" tiene que ser un número entre 1 y 6.`);
    const pregs = Array.isArray(c.preguntas) ? c.preguntas : [];
    if (numero !== 7 && !pregs.length) errores.push(`${donde}: necesita al menos una pregunta.`);
    pregs.forEach((p, j) => {
      const dp = `${donde}, pregunta ${j + 1}`;
      if (!p || typeof p !== 'object') { errores.push(`${dp}: está mal escrita.`); return; }
      const texto = String(p.pregunta || '').trim();
      const opciones = Array.isArray(p.opciones) ? p.opciones.map(o => String(o).trim()) : [];
      const correcta = Number(p.correcta);
      if (!texto) errores.push(`${dp}: falta el texto en "pregunta".`);
      if (opciones.length < 2 || opciones.length > 4) errores.push(`${dp}: tiene que tener entre 2 y 4 "opciones" (tiene ${opciones.length}).`);
      if (!Number.isInteger(correcta) || correcta < 1 || correcta > opciones.length) errores.push(`${dp}: "correcta" tiene que ser el número de la opción correcta (de 1 a ${opciones.length || '?'}).`);
      cas.preguntas.push({ texto, opciones, correcta: correcta - 1, paraDecir: String(p.para_decir || '').trim() });
    });
    mapa[key] = cas;
  });

  if (lista.length) {
    const nombreCarril = { comun: 'común', mesa: 'mesa', casa: 'casa' };
    ESPERADOS.forEach(([carril, numero]) => {
      if (!mapa[`${carril}-${numero}`]) errores.push(`Falta el casillero con carril ${nombreCarril[carril]} y número ${numero}.`);
    });
  }
  return { errores, ajustes, mapa };
}

module.exports = { cargarPreguntas };
