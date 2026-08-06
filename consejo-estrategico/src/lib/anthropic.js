import { FICHAS } from './buscador'
import { bloqueMemoria } from './memoria'
import { buscar } from './buscador'

/**
 * Cliente de la API de Anthropic desde el navegador.
 *
 * La cabecera 'anthropic-dangerous-direct-browser-access' habilita CORS.
 * Ojo: la key viaja en el cliente, así que esto es válido para una
 * herramienta personal, NO para una app pública. Si algún día publicas esto,
 * mueve la llamada a un backend y deja la key en el servidor.
 */

export const MODELOS = [
  { id: 'claude-opus-5', nombre: 'Claude Opus 5', nota: 'el más capaz (recomendado)' },
  { id: 'claude-sonnet-5', nombre: 'Claude Sonnet 5', nota: 'equilibrado, más barato' },
  { id: 'claude-haiku-4-5', nombre: 'Claude Haiku 4.5', nota: 'el más rápido y barato' },
]

const SISTEMA = `Eres un consejero estratégico de alto nivel. Respondes SIEMPRE en español de México, tono directo,
de socio a socio, sin rodeos ni moralina. Tu única base de conocimiento son los extractos que te paso, provenientes
de 11 documentos sobre poder, estrategia e influencia (48 Leyes del Poder, la 49ª Ley de la Reacción, 50 Estrategias
de Maquiavelo, El Arte de la Guerra, Arquetipos del Poder y anexos).

REGLAS:
- Cita SIEMPRE de dónde sacas cada recomendación, con este formato exacto: [[TITULO_DOCUMENTO|PAGINA]]
  Ejemplo: [[48 Leyes del Poder Ilustradas|8]]. Usa el título y la página tal como aparecen en los extractos.
- Estructura la respuesta con estos encabezados en negritas cuando apliquen: Lo que está pasando / Confírmalo con esto /
  Tu jugada / Frases listas / No hagas esto.
- "Tu jugada" debe ser una lista numerada de acciones concretas y ejecutables.
- En "Frases listas" da frases textuales que la persona pueda decir tal cual.
- Si los extractos no cubren bien la situación, dilo con claridad y da tu mejor consejo marcándolo como criterio propio.
- Nunca recomiendes acciones ilegales, difamación, ni daño a personas. Estrategia sí; abuso no.
- Sé conciso: no más de 450 palabras.`

/** Extractos de las fichas más relevantes, en texto plano para el modelo. */
export function contexto(pregunta, historial = []) {
  const previo = historial.slice(-2).map((h) => h.q).join(' ')
  // 18 y no 10: la búsqueda es léxica (BM25), así que la ficha correcta a veces
  // cae fuera del top-10 por vocabulario, no por relevancia. Ampliar el corte le
  // da al modelo de dónde escoger; el contexto no es la restricción aquí.
  let rs = buscar(pregunta, null, 18)
  if (rs.length < 4) rs = buscar(previo + ' ' + pregunta, null, 18)
  return rs
    .map(({ f }) => {
      const sec = Object.entries(f.secciones || {}).map(([k, v]) => `${k}: ${v}`).join('\n')
      const pa = (f.pasos || []).map((p) => `${p.n ?? ''} ${p.nombre || ''}: ${p.texto || ''}`).join('\n')
      return `--- ${f.docTitulo} | página ${f.pagina} | ${f.titulo}\n${f.subtitulo || ''}\n${
        f.cita ? 'Cita: ' + f.cita : ''
      }\n${pa}\n${sec}\n${(f.repaso || []).join(' · ')}`
    })
    .join('\n\n')
}

/**
 * Pregunta al modelo. Lanza Error con mensaje legible si la API falla.
 * @param {{apiKey:string, modelo:string, pregunta:string, historial:Array}} opts
 */
export async function preguntarIA({ apiKey, modelo, pregunta, historial = [], memoria = [] }) {
  if (!apiKey) throw new Error('Falta la API key.')
  // 8 y no 4: afinar un caso toma varias vueltas y con 4 el modelo empezaba a
  // olvidar lo acordado al principio del hilo.
  const mensajes = historial
    .slice(-8)
    .flatMap((h) => [
      { role: 'user', content: h.q },
      { role: 'assistant', content: h.a },
    ])
  mensajes.push({
    role: 'user',
    content: `SITUACIÓN:\n${pregunta}\n\nEXTRACTOS RELEVANTES DE LOS LIBROS:\n${contexto(pregunta, historial)}`,
  })

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    // En Opus 5 el razonamiento viene activado de fábrica y max_tokens acota
    // razonamiento + respuesta juntos: por eso el margen es amplio aunque la
    // respuesta visible no pase de 450 palabras. `effort` regula qué tan hondo
    // piensa: medium da buen equilibrio latencia/calidad para un chat.
    body: JSON.stringify({
      model: modelo,
      max_tokens: 8000,
      output_config: { effort: 'medium' },
      system: SISTEMA + bloqueMemoria(memoria),
      messages: mensajes,
    }),
  })

  if (!r.ok) {
    const t = await r.text()
    throw new Error(`La API respondió ${r.status}: ${t.slice(0, 240)}`)
  }
  const j = await r.json()

  // Los clasificadores de seguridad pueden declinar con HTTP 200 y contenido
  // vacío. Sin esto la respuesta llegaría en blanco y sin explicación.
  if (j.stop_reason === 'refusal') {
    throw new Error(
      'El modelo declinó responder a esta situación por sus filtros de seguridad. Replantea el caso en términos de la dinámica de poder concreta.'
    )
  }

  return (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
}

/* ---------- conversión de la respuesta a bloques renderizables ---------- */

const indicePagina = new Map(FICHAS.map((f) => [f.docTitulo + '|' + f.pagina, f.id]))

/** Resuelve [[Documento|12]] al id de la ficha (tolera títulos abreviados). */
function idDeCita(doc, pagina) {
  const exacto = indicePagina.get(doc.trim() + '|' + pagina)
  if (exacto) return exacto
  const pref = doc.trim().toLowerCase().slice(0, 14)
  const alt = [...indicePagina.keys()].find(
    (k) => k.toLowerCase().startsWith(pref) && k.endsWith('|' + pagina)
  )
  return alt ? indicePagina.get(alt) : null
}

/** Parte una línea en trozos de texto y citas: [{tipo:'texto'|'cita', ...}] */
function trozos(linea) {
  const out = []
  let resto = linea
  const re = /\[\[([^\]|]+)\|(\d+)\]\]/
  let m
  while ((m = re.exec(resto))) {
    if (m.index > 0) out.push({ tipo: 'texto', t: resto.slice(0, m.index) })
    out.push({ tipo: 'cita', doc: m[1].trim(), pagina: +m[2], id: idDeCita(m[1], m[2]) })
    resto = resto.slice(m.index + m[0].length)
  }
  if (resto) out.push({ tipo: 'texto', t: resto })
  return out
}

/**
 * Convierte el texto del modelo en bloques:
 * [{tipo:'titulo'|'parrafo'|'lista', ordenada?, items?|trozos?}]
 */
export function aBloques(texto) {
  const bloques = []
  let lista = null
  const cerrar = () => {
    if (lista) {
      bloques.push(lista)
      lista = null
    }
  }

  for (const cruda of (texto || '').split('\n')) {
    const s = cruda.trim()
    if (!s) {
      cerrar()
      continue
    }
    // Encabezado en negritas (**Título**) o en markdown (# Título). El modelo
    // alterna entre ambos estilos; sin la segunda forma el "#" se colaba como
    // texto literal dentro de un párrafo.
    const tit = s.match(/^\*\*(.+?)\*\*:?$/) || s.match(/^#{1,6}\s+(.+?):?$/)
    if (tit) {
      cerrar()
      bloques.push({ tipo: 'titulo', t: tit[1].replace(/\*\*/g, '').trim() })
      continue
    }
    const limpia = s.replace(/\*\*(.+?)\*\*/g, '$1')
    const num = limpia.match(/^(\d+)[.)]\s+(.*)$/)
    if (num) {
      if (!lista || !lista.ordenada) {
        cerrar()
        lista = { tipo: 'lista', ordenada: true, items: [] }
      }
      lista.items.push(trozos(num[2]))
      continue
    }
    const vin = limpia.match(/^[-*•]\s+(.*)$/)
    if (vin) {
      if (!lista || lista.ordenada) {
        cerrar()
        lista = { tipo: 'lista', ordenada: false, items: [] }
      }
      lista.items.push(trozos(vin[1]))
      continue
    }
    cerrar()
    bloques.push({ tipo: 'parrafo', trozos: trozos(limpia) })
  }
  cerrar()
  return bloques
}
