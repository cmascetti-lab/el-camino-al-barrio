// Estado y reglas del juego. Todo vive en memoria del servidor.
const COLORES = { 1: '#2FAC66', 2: '#F088B6', 3: '#FDC533', 4: '#0092DD', 5: '#231837', 6: '#F39A3D', 7: '#8E6CC9', 8: '#2BB5B0' };
const LLEGADA = 7;

class Juego {
  constructor(datos, alCambiar) {
    this.datos = datos;
    this.alCambiar = alCambiar || (() => {});
    this.grupos = [];
    this.reiniciar(datos.ajustes.gruposPorDefecto);
  }

  get aj() { return this.datos.ajustes; }
  cambio() { this.alCambiar(); }

  // ---------- preparación ----------
  reiniciar(n = this.grupos.length || this.aj.gruposPorDefecto) {
    clearTimeout(this.timer);
    n = Math.max(2, Math.min(8, Number(n) || 5));
    const antes = this.grupos;
    this.grupos = [];
    for (let i = 1; i <= n; i++) {
      const prev = antes.find(g => g.id === i);
      this.grupos.push({
        id: i, color: COLORES[i], carril: i % 2 ? 'mesa' : 'casa',
        token: prev ? prev.token : null,
        pos: 0, preg: null, respuesta: null, tResp: null, tiempoTotal: 0,
        llegada: null, vistas: new Set(), ultimo: null,
      });
    }
    this.fase = 'lobby';
    this.ronda = 0;
    this.deadline = null;
    this.pausa = null;
    this.rev = null;
    this.llegadas = 0;
    this.cambio();
  }

  setGrupos(n) { if (this.fase === 'lobby') this.reiniciar(n); }

  elegirGrupo(id, token) {
    const g = this.grupos.find(x => x.id === Number(id));
    if (!g || !token) return false;
    this.grupos.forEach(x => { if (x.token === token) x.token = null; });
    g.token = token;
    this.cambio();
    return true;
  }

  soltarGrupo(token) {
    this.grupos.forEach(x => { if (x.token === token) x.token = null; });
    this.cambio();
  }

  grupoDe(token) { return token ? this.grupos.find(g => g.token === token) : null; }

  // ---------- casilleros y preguntas ----------
  casillero(g) {
    const comun = [0, 1, 6, 7].includes(g.pos);
    return this.datos.mapa[`${comun ? 'comun' : g.carril}-${g.pos}`];
  }

  pregunta(g) {
    if (!g.preg) return null;
    const cas = this.datos.mapa[g.preg.cas];
    return cas ? cas.preguntas[g.preg.idx] : null;
  }

  // ---------- rondas ----------
  empezarRonda() {
    if (this.fase === 'final') return;
    const activos = this.grupos.filter(g => g.pos < LLEGADA);
    if (!activos.length || this.ronda >= this.aj.rondas) return this.terminar();
    this.ronda++;

    // Los grupos que están en el mismo casillero reciben la misma pregunta
    const porCas = {};
    activos.forEach(g => {
      const c = this.casillero(g);
      (porCas[c.key] = porCas[c.key] || { cas: c, grupos: [] }).grupos.push(g);
    });
    Object.values(porCas).forEach(({ cas, grupos }) => {
      const idxs = cas.preguntas.map((_, i) => i);
      const vecesVista = i => grupos.reduce((n, g) => n + (g.vistas.has(`${cas.key}#${i}`) ? 1 : 0), 0);
      const minimo = Math.min(...idxs.map(vecesVista));
      const candidatas = idxs.filter(i => vecesVista(i) === minimo);
      const idx = candidatas[Math.floor(Math.random() * candidatas.length)];
      grupos.forEach(g => {
        g.preg = { cas: cas.key, idx };
        g.vistas.add(`${cas.key}#${idx}`);
      });
    });
    this.grupos.forEach(g => { g.respuesta = null; g.tResp = null; if (g.pos >= LLEGADA) g.preg = null; });

    this.fase = 'respondiendo';
    this.rev = null;
    this.pausa = null;
    this.inicio = Date.now();
    this.deadline = Date.now() + this.aj.segundos * 1000;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.cerrarRespuestas(), this.aj.segundos * 1000);
    this.cambio();
  }

  responder(token, opcion) {
    const g = this.grupoDe(token);
    if (!g || this.fase !== 'respondiendo' || this.pausa !== null || g.pos >= LLEGADA || g.respuesta !== null) return;
    const p = this.pregunta(g);
    opcion = Number(opcion);
    if (!p || !Number.isInteger(opcion) || opcion < 0 || opcion >= p.opciones.length) return;
    g.respuesta = opcion;
    g.tResp = Date.now() - this.inicio;
    g.tiempoTotal += g.tResp;
    const activos = this.grupos.filter(x => x.pos < LLEGADA);
    if (this.aj.corteAuto && activos.every(x => x.respuesta !== null)) return this.cerrarRespuestas();
    this.cambio();
  }

  pausar() {
    if (this.fase !== 'respondiendo' || this.pausa !== null) return;
    this.pausa = Math.max(0, this.deadline - Date.now());
    clearTimeout(this.timer);
    this.cambio();
  }

  reanudar() {
    if (this.fase !== 'respondiendo' || this.pausa === null) return;
    this.deadline = Date.now() + this.pausa;
    this.timer = setTimeout(() => this.cerrarRespuestas(), this.pausa);
    this.pausa = null;
    this.cambio();
  }

  cerrarRespuestas() {
    if (this.fase !== 'respondiendo') return;
    clearTimeout(this.timer);
    this.pausa = null;
    // Armamos una "tarjeta" por pregunta: si varios grupos tuvieron la misma, se revelan juntos
    const items = {};
    this.grupos.filter(g => g.pos < LLEGADA && g.preg).forEach(g => {
      const k = `${g.preg.cas}#${g.preg.idx}`;
      (items[k] = items[k] || { cas: g.preg.cas, idx: g.preg.idx, grupos: [], resultados: {} }).grupos.push(g.id);
    });
    const lista = Object.values(items).sort((a, b) => Math.min(...a.grupos) - Math.min(...b.grupos));
    const activos = this.grupos.filter(g => g.pos < LLEGADA);
    this.rev = { items: lista, idx: -1, respondieron: activos.filter(g => g.respuesta !== null).length, total: activos.length };
    this.fase = 'revelacion';
    this.cambio();
  }

  siguiente() {
    if (this.fase === 'lobby') return this.empezarRonda();
    if (this.fase === 'respondiendo') return this.cerrarRespuestas();
    if (this.fase !== 'revelacion') return;
    if (this.rev.idx < this.rev.items.length - 1) {
      this.rev.idx++;
      this.aplicar(this.rev.items[this.rev.idx]);
      this.cambio();
    } else {
      this.empezarRonda();
    }
  }

  aplicar(item) {
    const cas = this.datos.mapa[item.cas];
    const p = cas.preguntas[item.idx];
    item.grupos.forEach(id => {
      const g = this.grupos.find(x => x.id === id);
      const desde = g.pos;
      const ok = g.respuesta === p.correcta;
      if (ok) g.pos = Math.min(LLEGADA, g.pos + 1);
      else if (cas.trampa) g.pos = Math.max(1, g.pos - cas.retroceden);
      if (g.pos === LLEGADA && !g.llegada) g.llegada = this.ronda; // ronda en la que llegó
      g.ultimo = { ok, desde, hasta: g.pos, respuesta: g.respuesta, trampa: cas.trampa, ronda: this.ronda };
      item.resultados[id] = g.ultimo;
    });
  }

  terminar() {
    clearTimeout(this.timer);
    this.fase = 'final';
    this.rev = null;
    this.pausa = null;
    this.cambio();
  }

  ranking() {
    return [...this.grupos].sort((a, b) =>
      (b.pos - a.pos) ||
      ((a.llegada || 99) - (b.llegada || 99)) ||
      (a.tiempoTotal - b.tiempoTotal)
    ).map(g => g.id);
  }

  restante() {
    if (this.fase !== 'respondiendo') return null;
    return this.pausa !== null ? this.pausa : Math.max(0, this.deadline - Date.now());
  }

  // ---------- lo que se manda a cada pantalla ----------
  casInfo(cas) { return cas && { nombre: cas.nombre, carril: cas.carril, numero: cas.numero, trampa: cas.trampa, retroceden: cas.retroceden }; }

  estadoProyector(conectado) {
    const rev = this.rev;
    let item = null;
    if (rev && rev.idx >= 0) {
      const it = rev.items[rev.idx];
      const cas = this.datos.mapa[it.cas];
      const p = cas.preguntas[it.idx];
      item = {
        cas: this.casInfo(cas),
        pregunta: { texto: p.texto, opciones: p.opciones, correcta: p.correcta, paraDecir: this.aj.mostrarParaDecir ? p.paraDecir : '' },
        grupos: it.grupos.map(id => ({ id, ...it.resultados[id] })),
      };
    }
    return {
      fase: this.fase, ronda: this.ronda, rondas: this.aj.rondas, segundos: this.aj.segundos,
      restanteMs: this.restante(), pausado: this.pausa !== null,
      grupos: this.grupos.map(g => ({
        id: g.id, color: g.color, carril: g.carril, pos: g.pos, llegada: g.llegada,
        conectado: !!(g.token && conectado(g.token)),
        respondio: g.respuesta !== null,
        casillero: this.casInfo(this.casillero(g)),
      })),
      rev: rev && { idx: rev.idx, total: rev.items.length, respondieron: rev.respondieron, activos: rev.total, item, ultimo: rev.idx >= rev.items.length - 1 },
      ranking: this.fase === 'final' ? this.ranking() : null,
    };
  }

  estadoGrupo(token, conectado) {
    const g = this.grupoDe(token);
    const base = {
      fase: this.fase, ronda: this.ronda, rondas: this.aj.rondas,
      grupos: this.grupos.map(x => ({ id: x.id, color: x.color, carril: x.carril, ocupado: !!(x.token && x.token !== token && conectado(x.token)) })),
    };
    if (!g) return { ...base, grupo: null };
    const out = {
      ...base,
      grupo: { id: g.id, color: g.color, carril: g.carril, pos: g.pos, llegada: g.llegada, casillero: this.casInfo(this.casillero(g)) },
      restanteMs: this.restante(), pausado: this.pausa !== null, segundos: this.aj.segundos,
    };
    if (this.fase === 'respondiendo' && g.pos < LLEGADA) {
      const p = this.pregunta(g);
      const cas = this.datos.mapa[g.preg.cas];
      out.pregunta = { texto: p.texto, opciones: p.opciones, cas: this.casInfo(cas) };
      out.miRespuesta = g.respuesta;
    }
    if (this.fase === 'revelacion' && this.rev) {
      const i = this.rev.items.findIndex(it => it.grupos.includes(g.id));
      out.revelado = i >= 0 && i <= this.rev.idx;
      out.sinPregunta = i < 0;
      if (out.revelado) {
        const it = this.rev.items[i];
        const cas = this.datos.mapa[it.cas];
        const p = cas.preguntas[it.idx];
        out.resultado = { ...it.resultados[g.id], correctaTexto: p.opciones[p.correcta], retroceden: cas.retroceden };
      }
    }
    if (this.fase === 'final') out.puesto = this.ranking().indexOf(g.id) + 1;
    return out;
  }
}

module.exports = Juego;
