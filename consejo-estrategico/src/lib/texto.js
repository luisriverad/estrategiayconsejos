/**
 * Normalización y tokenización de español.
 * Todo el buscador depende de estas tres funciones: norm (quita acentos y
 * puntuación), stem (raíz de la palabra) y toks (tokens útiles de una frase).
 */

/** Minúsculas, sin acentos, sin puntuación. */
export const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Palabras vacías: no aportan al ranking. Ojo: "poder" NO está aquí a propósito. */
export const STOP = new Set(
  (
    'de la el los las un una unos unas y o u que en a al del con por para es son ser estar como mas más ' +
    'pero si no lo le les se su sus mi mis tu tus me te nos ya muy cuando donde cual cuales quien hay he ha ' +
    'han hacer hace hago haz sobre entre desde hasta este esta estos estas ese esa eso aquel algo alguien ' +
    'todo toda todos todas otro otra cada tan tanto porque pues aunque sin sino tambien también solo sólo ' +
    'asi así ahora antes despues después siempre nunca e estan estoy estamos sea sean fue fui eran soy ' +
    'tengo tiene tienen tener puedo puede pueden quiero quiere quieren debo debe deben voy vas van hizo ' +
    'dice dicen alguna algun algunos algunas cosa cosas manera forma vez veces'
  ).split(' ')
)

/** Sufijos de más largo a más corto: el orden importa. */
const SUF = [
  'aciones', 'iciones', 'amientos', 'imientos', 'amiento', 'imiento', 'adores', 'adoras',
  'encias', 'ancias', 'anzas', 'ibles', 'ables', 'ismos', 'istas', 'mente', 'ciones', 'idades',
  'acion', 'icion', 'ancia', 'encia', 'anza', 'ador', 'adora', 'ante', 'entes', 'endo', 'ando',
  'ados', 'idos', 'adas', 'idas', 'ible', 'able', 'ismo', 'ista', 'idad', 'osos', 'osas',
  'icos', 'icas', 'ivos', 'ivas', 'oso', 'osa', 'ico', 'ica', 'ivo', 'iva', 'ado', 'ido',
  'ada', 'ida', 'aba', 'aban', 'are', 'ara', 'ere', 'iste', 'aste', 'ir', 'ar', 'er', 'es',
  'os', 'as', 'a', 'o', 'e', 's',
]

/**
 * Stemmer ligero de español. Quita pronombres enclíticos (revertirlo → revertir)
 * y luego el sufijo más largo que aplique, dejando al menos 4 caracteres.
 */
export function stem(w) {
  if (w.length <= 4) return w
  w = w.replace(/([aei])r(me|te|se|nos|les|le|los|las|lo|la)$/, '$1r')
  if (w.length <= 4) return w
  for (const s of SUF) {
    if (w.endsWith(s) && w.length - s.length >= 4) return w.slice(0, w.length - s.length)
  }
  return w
}

/**
 * Tokens de una frase. Si al filtrar palabras vacías no queda nada
 * (ej. "¿cómo se hace?"), devuelve los tokens sin filtrar como respaldo.
 */
export function toks(s) {
  const raw = norm(s).split(' ').filter(Boolean)
  const f = raw.filter((w) => w.length > 2 && !STOP.has(w)).map(stem)
  return f.length ? f : raw.filter((w) => w.length > 2).map(stem)
}

/** Distancia de edición con corte temprano. Para tolerar erratas del original. */
export function distanciaMenorIgual(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (cur[j] < best) best = cur[j]
    }
    if (best > max) return false
    prev = cur
  }
  return prev[b.length] <= max
}
