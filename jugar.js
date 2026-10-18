const socket = io();
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const L = 'ABCD';
const CARRIL = { mesa: 'Carril de la mesa', casa: 'Carril de la casa', comun: 'Tramo común' };

// Cada celu tiene una "llave" guardada para poder reconectarse a su grupo
let token = null;
try { token = localStorage.getItem('camino-token'); } catch (e) {}
if (!token) {
  token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { localStorage.setItem('camino-token', token); } catch (e) {}
}

socket.on('connect', () => { $('sinConexion').classList.add('oculto'); socket.emit('grupo:hola', { token }); });
socket.on('disconnect', () => $('sinConexion').classList.remove('oculto'));

let E = null, eleccion = null, claveVista = '', finReloj = null, quiereCambiar = false, esperandoRes = false;
socket.on('estado', e => { E = e; render(); });

function vibrar(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

function render() {
  const e = E;
  const g = e.grupo;
  $('pausa').classList.toggle('oculto', !(e.fase === 'respondiendo' && e.pausado && g));

  if (!g || quiereCambiar) return vistaElegir();

  // barra de arriba
  const oscuro = g.id === 3;
  const barra = $('barra');
  barra.style.background = g.color;
  barra.classList.toggle('oscuro', oscuro);
  const respondiendo = e.fase === 'respondiendo' && e.pregunta;
  barra.innerHTML = `<div class="k">${CARRIL[g.carril].toUpperCase()}</div><div class="g">Grupo ${g.id}</div>
    ${respondiendo ? `<div class="tbar"><i id="tbar"></i></div><div class="tiempo" id="tiempo"></div>` : ''}
    ${e.fase === 'lobby' ? '<button class="cambiar" id="cambiar">Cambiar grupo</button>' : ''}`;
  if ($('cambiar')) $('cambiar').onclick = () => { quiereCambiar = true; render(); };
  if (respondiendo) { if (!e.pausado) finReloj = performance.now() + e.restanteMs; tick(); }

  const v = $('vista');
  const ficha = `<div class="ficha-grande ${oscuro ? 'oscuro' : ''}" style="background:${g.color}">${g.id}</div>`;

  if (e.fase === 'lobby') {
    v.innerHTML = `<div class="centro">${ficha}<h2>¡Listo! Son el Grupo ${g.id}</h2><span class="tag-carril ${g.carril}">Van por el ${CARRIL[g.carril].toLowerCase()}</span><p>Miren el proyector: en un ratito arrancamos.</p></div>`;
    return;
  }

  if (e.fase === 'final') {
    v.innerHTML = `<div class="centro">${ficha}<h2>${e.puesto === 1 ? '¡Primeros!' : `Puesto ${e.puesto}`}</h2><p>${g.pos >= 7 ? '¡Llegaron al barrio! 🏁' : `Quedaron en ${esc(g.casillero.nombre)}.`}</p><p>Ahora charlamos todos juntos.</p></div>`;
    return;
  }

  if (g.pos >= 7 && e.fase === 'respondiendo') {
    v.innerHTML = `<div class="centro">${ficha}<h2>¡Llegaron al barrio! 🏁</h2><p>Esperen a que lleguen los demás grupos.</p></div>`;
    return;
  }

  if (e.fase === 'respondiendo') {
    const p = e.pregunta;
    const clave = `${e.ronda}`;
    if (clave !== claveVista) { claveVista = clave; eleccion = null; vibrar(80); }
    const cas = p.cas;
    const k = cas.trampa ? '⚠️ ¡TRAMPA!' : `${cas.numero > 0 ? `CASILLERO ${cas.numero} · ` : ''}${esc(cas.nombre).toUpperCase()}`;
    if (e.miRespuesta !== null && e.miRespuesta !== undefined) {
      v.innerHTML = `<div class="qcard"><div class="k ${cas.carril}">${k}</div><div class="q">${esc(p.texto)}</div></div>
        <div class="centro"><div class="ojos">✅</div><h2>¡Respuesta enviada!</h2>
        <div class="enviada"><b class="o${e.miRespuesta}">${L[e.miRespuesta]}</b>${esc(p.opciones[e.miRespuesta])}</div>
        <p>Esperen a que respondan los demás. La revelación es en el proyector.</p></div>`;
      return;
    }
    v.innerHTML = `<div class="qcard"><div class="k ${cas.carril}">${k}</div><div class="q">${esc(p.texto)}</div></div>
      <div class="opts ${eleccion !== null ? 'con-eleccion' : ''}">${p.opciones.map((o, i) => `<button class="opt o${i} ${eleccion === i ? 'elegida' : ''}" data-i="${i}"><b>${L[i]}</b>${esc(o)}</button>`).join('')}</div>
      ${eleccion !== null ? `<button class="btn navy confirmar" id="confirmar">¿Confirmamos? ✓<small>Después no se puede cambiar</small></button>` : ''}`;
    v.querySelectorAll('.opt').forEach(b => b.onclick = () => { eleccion = Number(b.dataset.i); vibrar(20); render(); });
    if ($('confirmar')) $('confirmar').onclick = () => { socket.emit('responder', { opcion: eleccion }); vibrar([30, 40, 30]); };
    return;
  }

  if (e.fase === 'revelacion') {
    if (g.pos >= 7 && !e.revelado) {
      v.innerHTML = `<div class="centro">${ficha}<h2>¡Llegaron al barrio! 🏁</h2><p>Miren el proyector.</p></div>`;
      return;
    }
    if (!e.revelado) {
      v.innerHTML = `<div class="centro"><div class="ojos">👀</div><h2>¡Miren el proyector!</h2><p>${e.sinPregunta ? 'Esta ronda no les tocó pregunta.' : 'Ya se está revelando qué respondió cada grupo.'}</p></div>`;
      return;
    }
    // pequeño suspenso, igual que en el proyector
    if (claveVista !== `res-${e.ronda}`) {
      if (!esperandoRes) {
        esperandoRes = true;
        v.innerHTML = `<div class="centro"><div class="ojos">👀</div><h2>¡Miren el proyector!</h2><p>Ahora se revela su respuesta…</p></div>`;
        setTimeout(() => { esperandoRes = false; claveVista = `res-${e.ronda}`; vibrar(E.resultado && E.resultado.ok ? [60, 50, 60] : 200); render(); }, 1400);
      }
      return;
    }
    const r = e.resultado;
    let html;
    if (r.ok) html = `<div class="resultado bien"><div class="icono">🎉</div><h2>${r.hasta >= 7 ? '¡Llegaron!' : '¡Correcto!'}</h2><p>${r.hasta >= 7 ? 'Llegaron al barrio.' : 'Avanzan un casillero.'}</p></div>`;
    else if (r.hasta < r.desde) html = `<div class="resultado atras"><div class="icono">⚠️</div><h2>¡Era una trampa!</h2><p>Retroceden ${r.desde - r.hasta} casilleros.</p><div class="era">La respuesta era: ${esc(r.correctaTexto)}</div></div>`;
    else html = `<div class="resultado mal"><div class="icono">🤔</div><h2>${r.respuesta === null ? 'No respondieron' : 'Esta vez no'}</h2><p>Se quedan en este casillero y la próxima ronda les toca otra pregunta.</p><div class="era">La respuesta era: ${esc(r.correctaTexto)}</div></div>`;
    v.innerHTML = html;
  }
}

function vistaElegir() {
  const e = E;
  const barra = $('barra');
  barra.style.background = ''; barra.classList.remove('oscuro');
  barra.innerHTML = `<div class="k">TECHO</div><div class="g">El camino al barrio</div>`;
  $('vista').innerHTML = `<div class="portada"><h1>¿Qué grupo son?</h1><p>Elijan el número que les dio la facilitadora.</p></div>
    <div class="elegir">${e.grupos.map(x => `<button class="${x.id === 3 ? 'oscuro' : ''} ${x.ocupado ? 'ocupado' : ''}" style="background:${x.color}" data-id="${x.id}">Grupo ${x.id}<small>${x.ocupado ? 'ya está en otro celu' : CARRIL[x.carril]}</small></button>`).join('')}</div>`;
  $('vista').querySelectorAll('.elegir button').forEach(b => b.onclick = () => {
    const x = e.grupos.find(y => y.id == b.dataset.id);
    if (x.ocupado && !b.dataset.seguro) { b.dataset.seguro = 1; b.querySelector('small').textContent = 'Tocá otra vez para usar este celu'; return; }
    quiereCambiar = false;
    socket.emit('grupo:elegir', { id: x.id });
    vibrar(40);
  });
}

function tick() {
  if (!E || E.fase !== 'respondiendo' || !$('tbar')) return;
  const rest = E.pausado ? E.restanteMs : Math.max(0, finReloj - performance.now());
  const s = Math.ceil(rest / 1000);
  $('tbar').style.width = (rest / (E.segundos * 1000) * 100) + '%';
  $('tiempo').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
setInterval(tick, 200);
