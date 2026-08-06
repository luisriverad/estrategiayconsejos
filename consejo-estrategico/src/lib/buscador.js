import datos from '../data/datos.json'
import { norm, stem, toks, distanciaMenorIgual } from './texto'
import { SINONIMOS, MAPA_SINONIMOS } from './sinonimos'

export const FICHAS = datos.fichas
export const DOCS = datos.docs
export const TEMAS = datos.temas
export const porId = new Map(FICHAS.map((f) => [f.id, f]))

/** Peso de cada campo en el ranking. Subir "titulo" hace la búsqueda más literal. */
const PESOS = {
  titulo: 7,
  etiquetas: 5.5,
  subtitulo: 3,
  cita: 2.2,
  nombreSeccion: 2.5,
  secciones: 2,
  pasos: 2,
  repaso: 1.6,
  texto: 1,
}

/* ---------- construcción del índice invertido (una sola vez) ---------- */
const IDX = []
const DF = new Map()

FICHAS.forEach((f) => {
  const tf = new Map()
  let len = 0
  const add = (t, w) => {
    toks(t).forEach((x) => {
      tf.set(x, (tf.get(x) || 0) + w)
      len += w
    })
  }
  add(f.titulo, PESOS.titulo)
  ;(f.etiquetas || []).forEach((e) => add(e, PESOS.etiquetas))
  add(f.subtitulo || '', PESOS.subtitulo)
  add(f.cita || '', PESOS.cita)
  Object.entries(f.secciones || {}).forEach(([k, v]) => {
    add(k, PESOS.nombreSeccion)
    add(v, PESOS.secciones)
  })
  ;(f.pasos || []).forEach((p) => {
    add(p.nombre || '', PESOS.pasos)
    add(p.texto || '', PESOS.pasos)
  })
  ;(f.repaso || []).forEach((r) => add(r, PESOS.repaso))
  add(f.texto || '', PESOS.texto)

  IDX.push({ tf, len, textoNorm: norm(f.texto || '') })
  new Set(tf.keys()).forEach((t) => DF.set(t, (DF.get(t) || 0) + 1))
})

const N = FICHAS.length
const LARGO_MEDIO = IDX.reduce((a, b) => a + b.len, 0) / N
const VOCAB = [...DF.keys()]

/* ---------- tolerancia a erratas ---------- */
const cacheFuzzy = new Map()

/** Términos del índice parecidos a `t`. Cubre las faltas del original
 *  (REPUTAÇÓN, RESPOESTA, ROIBADO) y los typos de quien busca. */
function parecidos(t) {
  if (cacheFuzzy.has(t)) return cacheFuzzy.get(t)
  const max = t.length >= 7 ? 2 : 1
  const out = []
  for (const v of VOCAB) {
    if (v === t || v[0] !== t[0]) continue
    if (distanciaMenorIgual(t, v, max)) out.push(v)
    if (out.length >= 6) break
  }
  cacheFuzzy.set(t, out)
  return out
}

/** Expande la consulta: término exacto (peso 1), sinónimos (0.45), parecidos (0.8). */
function expandir(qt) {
  const out = new Map()
  qt.forEach((t) => out.set(t, 1))
  qt.forEach((t) => {
    const gs = MAPA_SINONIMOS.get(t)
    if (!gs) return
    gs.forEach((gi) =>
      SINONIMOS[gi].forEach((w) => {
        const k = stem(norm(w).split(' ')[0])
        if (!out.has(k)) out.set(k, 0.45)
      })
    )
  })
  qt.forEach((t) => {
    if (DF.has(t) || t.length < 4) return
    parecidos(t).forEach((v) => {
      if (!out.has(v)) out.set(v, 0.8)
    })
  })
  return out
}

/**
 * Busca en las fichas. Devuelve [{ f, sc, qt }] ordenado por relevancia.
 * @param {string} q      consulta en lenguaje natural
 * @param {function} filtro  predicado opcional sobre la ficha (tema/documento)
 * @param {number} limite    máximo de resultados
 */
export function buscar(q, filtro, limite = 30) {
  const qt = toks(q)
  if (!qt.length) return []
  const terms = expandir(qt)
  const nq = norm(q)
  const k1 = 1.4
  const b = 0.72
  const res = []

  for (let i = 0; i < N; i++) {
    const f = FICHAS[i]
    if (f.vacia) continue
    if (filtro && !filtro(f)) continue
    const e = IDX[i]
    let sc = 0
    let hits = 0
    terms.forEach((w, t) => {
      const tf = e.tf.get(t)
      if (!tf) return
      if (w === 1) hits++
      const df = DF.get(t) || 1
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
      sc += w * idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * e.len) / LARGO_MEDIO)))
    })
    if (!sc) continue
    if (nq.length > 7 && e.textoNorm.includes(nq)) sc *= 1.9 // frase exacta
    if (qt.length > 1) sc *= 1 + 0.35 * (hits / qt.length) // cobertura de términos
    res.push({ f, sc, qt })
  }

  res.sort((a, b2) => b2.sc - a.sc)

  // diversidad: no más de 4 fichas seguidas del mismo documento arriba
  const cnt = {}
  const top = []
  const rest = []
  res.forEach((r) => {
    cnt[r.f.doc] = (cnt[r.f.doc] || 0) + 1
    ;(cnt[r.f.doc] <= 4 ? top : rest).push(r)
  })
  const ord = top.concat(rest)
  const max = ord.length ? ord[0].sc : 0
  return ord.filter((r) => r.sc >= max * 0.16).slice(0, limite)
}

/**
 * Fragmento del texto alrededor de los términos buscados.
 * Devuelve segmentos [{ t, marca }] para renderizar con <mark> en React.
 */
export function fragmento(f, qt) {
  const txt = f.texto || ''
  if (!txt) return []
  const palabras = txt.split(/\s+/)
  const raices = palabras.map((w) => stem(norm(w)))
  let mejor = 0
  let mejorPunt = -1
  for (let i = 0; i < raices.length; i++) {
    let s = 0
    for (let j = i; j < Math.min(i + 34, raices.length); j++) if (qt.includes(raices[j])) s++
    if (s > mejorPunt) {
      mejorPunt = s
      mejor = i
    }
  }
  const a = Math.max(0, mejor - 6)
  const b = Math.min(palabras.length, a + 42)
  const segs = []
  if (a > 0) segs.push({ t: '… ', marca: false })
  palabras.slice(a, b).forEach((w, i) => {
    segs.push({ t: (i ? ' ' : '') + w, marca: qt.includes(stem(norm(w))) })
  })
  if (b < palabras.length) segs.push({ t: ' …', marca: false })
  return segs
}

/** Nombre corto de cada documento, para las citas. */
const ABREV = {
  '48 Leyes del Poder Ilustradas': '48 Leyes',
  'Biblioteca de Casos Reales': 'Casos Reales',
  'El Mapa de los Juegos de Poder en el Trabajo': 'Mapa Trabajo',
  'La 49ª Ley — 48 Fichas de Reacción': '49ª Ley',
  'Los 10 Ataques Más Comunes': '10 Ataques',
  'Las 18 Señales de Manipulación': '18 Señales',
  'Simulaciones Ilustradas': 'Simulaciones',
  'Qué Hacer Cuando Ya Caíste': 'Ya Caíste',
  '50 Estrategias de Maquiavelo': 'Maquiavelo',
  'El Arte de la Guerra Aplicada': 'Arte de la Guerra',
  'Arquetipos del Poder': 'Arquetipos',
}
export const abrev = (t) => ABREV[t] || t
