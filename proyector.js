const socket = io();
const $ = id => document.getElementById(id);
const clave = new URLSearchParams(location.search).get('clave') || '';
socket.on('connect', () => socket.emit('proyector', { clave }));
socket.on('clave-incorrecta', () => aviso('Falta la clave: abrí /proyector?clave=TU_CLAVE'));
const accion = (tipo, valor) => socket.emit('accion', { tipo, valor });

const L = 'ABCD';
const CARRIL = { mesa: 'Carril de la mesa', casa: 'Carril de la casa', comun: 'Tramo común' };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dot = g => `<div class="dot ${g.id === 3 ? 'oscuro' : ''}" style="background:${Tablero.COLORES[g.id]}">${g.id}</div>`;

// ---------- decoración ----------
[[88, 4, 26], [93, 10, 14], [86, 14, 9], [3, 88, 30], [8, 82, 12], [95, 70, 40], [91, 80, 16], [2, 20, 10], [18, 4, 8], [60, 9, 12], [97, 32, 10], [45, 93, 8]].forEach(([x, y, r], i) => {
  const d = document.createElement('div'); d.className = 'burbuja';
  d.style.cssText = `left:${x}%;top:${y}%;width:${r * 2}px;height:${r * 2}px;opacity:${.25 + (i % 4) * .1}`;
  $('escenario').prepend(d);
});
// inclinación 3D suave con el mouse
$('escenario').addEventListener('mousemove', ev => {
  const x = ev.clientX / innerWidth - .5, y = ev.clientY / innerHeight - .5;
  $('tablero3d').style.transform = `rotateX(${-y * 5}deg) rotateY(${x * 6}deg)`;
});

const tablero = Tablero.crear($('tablero'));

// ---------- sonido ----------
let audio = null;
document.addEventListener('pointerdown', () => { if (!audio) try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }, { once: false });
function sonar(freq, dur = .12, tipo = 'sine', vol = .15) {
  if (!audio) return;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = tipo; o.frequency.value = freq; g.gain.value = vol;
  o.connect(g); g.connect(audio.destination);
  g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + dur);
  o.start(); o.stop(audio.currentTime + dur);
}
const fanfarria = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => sonar(f, .25, 'triangle', .12), i * 110));

// ---------- reloj ----------
let finReloj = null, restantePausa = null, totalSeg = 90, ultimoSeg = null;
function tick() {
  if (!E || E.fase !== 'respondiendo') return;
  const rest = restantePausa !== null ? restantePausa : Math.max(0, finReloj - performance.now());
  const s = Math.ceil(rest / 1000);
  $('segundos').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('arco').style.strokeDashoffset = 289 * (1 - rest / (totalSeg * 1000));
  $('arco').style.stroke = s <= 10 ? '#F088B6' : '#FDC533';
  $('anillo').classList.toggle('urgente', s <= 10 && restantePausa === null && s > 0);
  if (s !== ultimoSeg && restantePausa === null) {
    if (s <= 5 && s > 0) sonar(880, .08, 'square', .06);
    if (s === 0) sonar(220, .5, 'sawtooth', .1);
    ultimoSeg = s;
  }
}
setInterval(tick, 100);

// ---------- estado ----------
let E = null, revMostrado = null, temporizadores = [], enSuspenso = false;
socket.on('estado', e => { const prev = E; E = e; render(prev); });

function render(prev) {
  const e = E;
  totalSeg = e.segundos;
  if (e.fase === 'respondiendo') {
    if (e.pausado) restantePausa = e.restanteMs; else { restantePausa = null; finReloj = performance.now() + e.restanteMs; }
  }

  // lobby
  $('lobby').classList.toggle('oculto', e.fase !== 'lobby');
  if (e.fase === 'lobby') renderLobby();

  // ronda
  $('ronda').innerHTML = e.fase === 'lobby' ? '' : e.fase === 'final' ? '<small>FIN DEL JUEGO</small>¡Llegamos!' : `<small>RONDA</small>${e.ronda} de ${e.rondas}`;

  // reloj
  const activos = e.grupos.filter(g => g.pos < 7);
  $('reloj').style.visibility = e.fase === 'respondiendo' ? 'visible' : 'hidden';
  if (e.fase === 'respondiendo') {
    const r = activos.filter(g => g.respondio).length;
    $('respondieron').innerHTML = e.pausado ? 'Pausado<br><span>⏸</span>' : `${r} de ${activos.length} grupos<br><span>ya respondieron</span>`;
    if (prev && prev.fase === 'respondiendo') {
      const antes = prev.grupos.filter(g => g.respondio).length;
      if (r > antes) sonar(660, .12, 'triangle', .12);
    }
  }

  // acciones de arriba
  const acc = $('acciones');
  if (e.fase === 'respondiendo') {
    acc.innerHTML = `<button class="btn" id="bPausa">${e.pausado ? '▶ Seguir' : '⏸ Pausa'}</button><button class="btn amarillo" id="bCortar">Cortar tiempo ⏭</button>`;
    $('bPausa').onclick = () => accion(e.pausado ? 'reanudar' : 'pausar');
    $('bCortar').onclick = () => accion('cortar');
  } else acc.innerHTML = '';

  // chips
  const conPanel = (e.fase === 'revelacion' && e.rev.idx >= 0) || e.fase === 'final';
  $('chips').classList.toggle('fuera', conPanel || e.fase === 'lobby');
  $('tableroWrap').classList.toggle('con-panel', conPanel);
  renderChips();

  // banner ¡Tiempo!
  const banner = $('banner');
  if (e.fase === 'revelacion' && e.rev.idx === -1) {
    if (banner.classList.contains('oculto')) {
      banner.innerHTML = `<h2>¡Tiempo!</h2><p>Respondieron ${e.rev.respondieron} de ${e.rev.activos} grupos</p><button class="btn amarillo" id="bRevelar">Ver las respuestas ▶</button>`;
      banner.classList.remove('oculto');
      $('bRevelar').onclick = () => accion('siguiente');
    }
  } else banner.classList.add('oculto');

  // panel
  const panel = $('panel');
  if (e.fase === 'revelacion' && e.rev.idx >= 0) {
    const clave = `${e.ronda}-${e.rev.idx}`;
    if (revMostrado !== clave) {
      revMostrado = clave;
      temporizadores.forEach(clearTimeout); temporizadores = [];
      renderRevelacion(panel);
      panel.classList.add('visible');
      // suspenso: primero se ve qué eligieron, después la correcta y se mueven las fichas
      temporizadores.push(setTimeout(() => {
        panel.querySelector('.rv')?.classList.add('revelado');
        const ok = e.rev.item.grupos.some(g => g.ok);
        ok ? fanfarria() : sonar(196, .35, 'triangle', .12);
      }, 1300));
      enSuspenso = true;
      temporizadores.push(setTimeout(() => { enSuspenso = false; tablero.actualizar(E.grupos, festejar); }, 1700));
    } else if (!enSuspenso) {
      tablero.actualizar(e.grupos, festejar);
    }
  } else if (e.fase === 'final') {
    if (revMostrado !== 'final') { revMostrado = 'final'; renderFinal(panel); panel.classList.add('visible'); fanfarria(); }
    tablero.actualizar(e.grupos, festejar);
  } else {
    revMostrado = null; enSuspenso = false;
    temporizadores.forEach(clearTimeout); temporizadores = [];
    panel.classList.remove('visible');
    tablero.actualizar(e.grupos, festejar);
  }
}

function renderLobby() {
  const e = E;
  $('cantidad').textContent = e.grupos.length;
  $('url').textContent = location.host;
  $('slots').innerHTML = e.grupos.map(g => `<div class="slot ${g.conectado ? 'listo' : ''}">${dot(g)}<div>Grupo ${g.id}<small>${g.conectado ? '✓ conectado' : 'esperando…'}</small></div></div>`).join('');
}
$('menos').onclick = () => accion('grupos', E.grupos.length - 1);
$('mas').onclick = () => accion('grupos', E.grupos.length + 1);
$('empezar').onclick = () => accion('siguiente');

function renderChips() {
  const e = E;
  $('chips').innerHTML = e.grupos.map(g => {
    const llego = g.pos >= 7;
    const sub = llego ? '¡Llegaron!' : `${g.casillero.carril === 'comun' ? '' : g.carril === 'mesa' ? 'Mesa · ' : 'Casa · '}${g.casillero.nombre}`;
    let estado = '';
    if (llego) estado = '<span class="flag">🏁</span>';
    else if (e.fase === 'respondiendo') estado = g.respondio ? '<div class="ok">✓</div>' : '<div class="esperando"><i></i><i></i><i></i></div>';
    return `<div class="chip ${g.respondio && e.fase === 'respondiendo' ? 'respondio' : ''} ${g.conectado ? '' : 'desconectado'}">${dot(g)}<div class="txt"><div class="n">Grupo ${g.id}</div><div class="s">${esc(sub)}</div></div><div class="estado">${estado}</div></div>`;
  }).join('');
}

function textoResultado(r) {
  if (r.ok) return r.hasta >= 7 ? ['si', '¡Llegaron! 🏁'] : ['si', '¡Avanzan!'];
  if (r.hasta < r.desde) return ['atras', `Retroceden ${r.desde - r.hasta}`];
  return ['no', r.respuesta === null ? 'Sin respuesta · se quedan' : 'Se quedan'];
}

function renderRevelacion(panel) {
  const e = E, it = e.rev.item, p = it.pregunta, cas = it.cas;
  const grupos = it.grupos.map(r => ({ ...r, ...e.grupos.find(g => g.id === r.id) }));
  const varios = grupos.length > 1;
  const carril = cas.carril;
  const ops = p.opciones.map((o, i) => {
    const quienes = it.grupos.filter(g => g.respuesta === i);
    const ancho = varios ? (quienes.length / it.grupos.length) * 100 : 0;
    return `<div class="ro ${i === p.correcta ? 'win' : ''}"><div class="barra" data-w="${ancho}"></div><b>${L[i]}</b><span>${esc(o)}</span><span class="quienes">${quienes.map(dot).join('')}</span></div>`;
  }).join('');
  const res = it.grupos.map(r => { const [c, t] = textoResultado(r); return `<div class="res">${dot(r)}<span class="nom">Grupo ${r.id}</span><span class="badge ${c}">${t}</span></div>`; }).join('');
  const boton = e.rev.ultimo ? ((e.ronda >= e.rondas) ? 'Ver el final ▶' : 'Siguiente ronda ▶') : 'Siguiente grupo ▶';
  const largo = p.texto.length > 110 ? 'largo' : p.texto.length > 70 ? 'medio' : '';
  panel.innerHTML = `<div class="rv">
    <div class="rv-k">REVELACIÓN ${e.rev.idx + 1} DE ${e.rev.total}</div>
    <div class="rv-cas"><h2>${cas.trampa ? '⚠️ ' : ''}${esc(cas.nombre)}</h2><span class="tag-carril ${carril}">${CARRIL[carril]}</span></div>
    ${varios ? '' : `<div class="rv-grupos">${grupos.map(dot).join('')}</div>`}
    <div class="rv-q ${largo}">${esc(p.texto)}</div>
    <div class="rv-ops">${ops}</div>
    ${p.paraDecir ? `<div class="rv-say"><em>PARA DECIR</em>${esc(p.paraDecir)}</div>` : ''}
    <div class="rv-res ${varios ? 'compacto' : ''}">${res}</div></div>
    <div class="pie"><button class="btn navy" id="bSig">${boton}</button></div>`;
  $('bSig').onclick = () => accion('siguiente');
  requestAnimationFrame(() => setTimeout(() => panel.querySelectorAll('.barra').forEach(b => b.style.width = b.dataset.w + '%'), 300));
}

function renderFinal(panel) {
  const e = E;
  const lista = e.ranking.map((id, i) => {
    const g = e.grupos.find(x => x.id === id);
    const donde = g.pos >= 7 ? `🏁 Llegó en la ronda ${g.llegada}` : `Quedó en ${g.casillero.nombre}`;
    return `<div class="puesto ${i === 0 ? 'p1' : ''}" style="animation-delay:${i * .12}s"><span class="num">${i + 1}</span>${dot(g)}Grupo ${g.id}<span class="donde">${esc(donde)}</span></div>`;
  }).join('');
  panel.innerHTML = `<div class="fin" style="display:flex;flex-direction:column;height:100%">
    <div class="rv-k">FIN DEL JUEGO</div>
    <h2>¡Llegamos al barrio!</h2>
    <p>Dos caminos, el mismo lugar: la casa y los proyectos de la mesa, con los vecinos.</p>
    <div class="podio">${lista}</div>
    <div class="pie" style="margin-top:auto"><button class="btn" id="bOtra">Jugar de nuevo</button></div></div>`;
  $('bOtra').onclick = () => accion('reiniciar');
}

// ---------- festejo al llegar ----------
function festejar(g) {
  const pt = tablero.puntoEnPantalla(7, g.carril);
  const cols = ['#FDC533', '#F088B6', '#2FAC66', '#0092DD', '#fff'];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('div'); c.className = 'confeti';
    const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 220;
    c.style.cssText = `left:${pt.x}px;top:${pt.y - 40}px;background:${cols[i % cols.length]};--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 120}px;--r:${Math.random() * 720}deg`;
    document.body.appendChild(c); setTimeout(() => c.remove(), 1700);
  }
  fanfarria();
}

// ---------- menú y teclado ----------
$('btnMenu').onclick = () => $('menuItems').classList.toggle('oculto');
function confirmar(btn, texto, fn) {
  btn.onclick = () => {
    if (btn.dataset.seguro) { fn(); btn.textContent = texto; delete btn.dataset.seguro; $('menuItems').classList.add('oculto'); return; }
    btn.dataset.seguro = '1'; btn.textContent = '¿Seguro? Tocá otra vez';
    setTimeout(() => { btn.textContent = texto; delete btn.dataset.seguro; }, 3000);
  };
}
confirmar($('btnTerminar'), 'Terminar juego', () => accion('terminar'));
confirmar($('btnReiniciar'), 'Volver a empezar', () => accion('reiniciar'));

document.addEventListener('keydown', ev => {
  if (!E) return;
  if ([' ', 'Enter', 'ArrowRight', 'PageDown'].includes(ev.key)) {
    ev.preventDefault();
    if (E.fase === 'final') return;
    accion(E.fase === 'respondiendo' ? 'cortar' : 'siguiente');
  }
  if (ev.key === 'p' && E.fase === 'respondiendo') accion(E.pausado ? 'reanudar' : 'pausar');
});

function aviso(t) { const d = document.createElement('div'); d.className = 'aviso'; d.textContent = t; document.body.appendChild(d); }
