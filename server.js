const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { cargarPreguntas } = require('./preguntas');
const Juego = require('./juego');

const datos = cargarPreguntas(path.join(__dirname, 'preguntas.yaml'));
if (datos.errores.length) {
  console.error('\n❌ No arranca el juego porque preguntas.yaml tiene errores:\n');
  datos.errores.forEach(e => console.error('  • ' + e));
  console.error('\nCorregilos en GitHub y Railway lo vuelve a publicar solo.\n');
  process.exit(1);
}

const CLAVE = process.env.CLAVE_FACILITADORA || '';
const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);
const io = new Server(server);

// Archivos de las pantallas (todos sueltos en la carpeta principal)
const PUBLICOS = ['index.html', 'proyector.html', 'estilo.css', 'proyector.css', 'jugar.css', 'tablero.js', 'proyector.js', 'jugar.js', 'icono.svg'];
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/:archivo', (req, res, next) => PUBLICOS.includes(req.params.archivo) ? res.sendFile(path.join(__dirname, req.params.archivo)) : next());
app.use('/fuentes/fredoka', express.static(path.join(__dirname, 'node_modules/@fontsource/fredoka-one/files')));
app.use('/fuentes/montserrat', express.static(path.join(__dirname, 'node_modules/@fontsource/montserrat/files')));
app.get('/salud', (req, res) => res.send('ok'));
app.get('/proyector', (req, res) => res.sendFile(path.join(__dirname, 'proyector.html')));
app.get('/qr.svg', async (req, res) => {
  const url = `${req.protocol}://${req.get('host')}/`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#231837', light: '#ffffff' } });
  res.type('image/svg+xml').send(svg);
});

const conectado = token => (io.sockets.adapter.rooms.get('t:' + token)?.size || 0) > 0;

function emitirTodo() {
  io.to('proyector').emit('estado', juego.estadoProyector(conectado));
  for (const [, s] of io.sockets.sockets) {
    if (s.data.rol === 'grupo') s.emit('estado', juego.estadoGrupo(s.data.token, conectado));
  }
}
let pendiente = false;
const avisar = () => { if (!pendiente) { pendiente = true; setImmediate(() => { pendiente = false; emitirTodo(); }); } };

const juego = new Juego(datos, avisar);

io.on('connection', s => {
  s.on('proyector', ({ clave } = {}) => {
    if (CLAVE && clave !== CLAVE) return s.emit('clave-incorrecta');
    s.data.rol = 'proyector';
    s.join('proyector');
    avisar();
  });

  s.on('grupo:hola', ({ token } = {}) => {
    if (!token || typeof token !== 'string') return;
    if (s.data.token) s.leave('t:' + s.data.token);
    s.data.rol = 'grupo';
    s.data.token = token.slice(0, 64);
    s.join('t:' + s.data.token);
    avisar();
  });
  s.on('grupo:elegir', ({ id } = {}) => { if (s.data.token) juego.elegirGrupo(id, s.data.token); });
  s.on('grupo:salir', () => { if (s.data.token) juego.soltarGrupo(s.data.token); });
  s.on('responder', ({ opcion } = {}) => { if (s.data.token) juego.responder(s.data.token, opcion); });

  s.on('accion', ({ tipo, valor } = {}) => {
    if (s.data.rol !== 'proyector') return;
    if (tipo === 'grupos') juego.setGrupos(valor);
    else if (tipo === 'siguiente') juego.siguiente();
    else if (tipo === 'pausar') juego.pausar();
    else if (tipo === 'reanudar') juego.reanudar();
    else if (tipo === 'cortar') juego.cerrarRespuestas();
    else if (tipo === 'terminar') juego.terminar();
    else if (tipo === 'reiniciar') juego.reiniciar();
  });

  s.on('disconnect', avisar);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const total = Object.values(datos.mapa).reduce((n, c) => n + c.preguntas.length, 0);
  console.log(`✅ El camino al barrio está andando en el puerto ${PORT} (${total} preguntas cargadas).`);
  console.log(`   Proyector: /proyector   ·   Celus de los grupos: /`);
});
