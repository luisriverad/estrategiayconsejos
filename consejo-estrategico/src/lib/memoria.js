/**
 * Memoria del usuario entre conversaciones.
 *
 * No entrena al modelo: los modelos no aprenden de tus chats. Lo que hace esto
 * es acumular los datos duraderos de tu situación (rol, empresa, personas
 * recurrentes, decisiones ya tomadas) y anteponerlos al system prompt, para que
 * cada consejo salga ya calibrado a tu contexto en vez de empezar de cero.
 *
 * La extracción corre en Haiku 4.5: es una tarea mecánica, y así el presupuesto
 * del modelo grande se queda íntegro para el consejo.
 */
import { hayIA, llamarModelo } from './api'

const CLAVE = 'sac.memoria.v1'
const MAX_DATOS = 25
const MAX_LARGO = 200
const MODELO_EXTRACCION = 'claude-haiku-4-5'

export function leerMemoria() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    const v = crudo ? JSON.parse(crudo) : []
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function guardarMemoria(datos) {
  const limpios = datos
    .map((d) => String(d).trim())
    .filter(Boolean)
    .map((d) => (d.length > MAX_LARGO ? d.slice(0, MAX_LARGO) + '…' : d))
    .slice(0, MAX_DATOS)
  try {
    localStorage.setItem(CLAVE, JSON.stringify(limpios))
  } catch {
    /* cuota llena: la memoria es prescindible, no vale la pena romper nada */
  }
  return limpios
}

export const borrarMemoria = () => guardarMemoria([])

/** Texto que se antepone al system prompt. Vacío si no hay nada que decir. */
export function bloqueMemoria(datos = leerMemoria()) {
  if (!datos.length) return ''
  return `
CONTEXTO PERSISTENTE DE ESTA PERSONA (acumulado de conversaciones anteriores):
${datos.map((d) => '- ' + d).join('\n')}

Úsalo para afinar el consejo sin volver a preguntar lo que ya sabes. Si algo de
hoy contradice este contexto, manda lo de hoy.`
}

const INSTRUCCION = `Extraes datos duraderos sobre la persona a partir de un intercambio de asesoría.

Devuelve SOLO hechos que sigan siendo ciertos dentro de un mes y que sirvan para
afinar consejos futuros: rol y sector, tamaño y estructura de su empresa, personas
recurrentes (nombre o cargo, y cómo se comportan), conflictos abiertos, decisiones
que ya tomó, restricciones suyas (aversión al conflicto, presión de tiempo, socios).

NO devuelvas: la situación puntual de hoy, el consejo que se le dio, emociones del
momento, nada que no se repita, ni nada que ya esté en la lista actual.
Cada dato: una línea, en tercera persona, concreto. Si no hay nada nuevo, lista vacía.`

/**
 * Destila el intercambio y devuelve la memoria actualizada.
 * Si algo falla devuelve la memoria intacta: nunca debe tumbar el chat.
 */
export async function actualizarMemoria({ apiKey, pregunta, respuesta }) {
  const actual = leerMemoria()
  if (!hayIA(apiKey)) return actual

  try {
    const j = await llamarModelo(
      {
        model: MODELO_EXTRACCION,
        max_tokens: 700,
        system: INSTRUCCION,
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: { datos: { type: 'array', items: { type: 'string' } } },
              required: ['datos'],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: 'user',
            content: `LISTA ACTUAL:\n${actual.map((d) => '- ' + d).join('\n') || '(vacía)'}\n\nLO QUE REPORTÓ:\n${pregunta}\n\nLO QUE SE LE ACONSEJÓ:\n${respuesta.slice(0, 2500)}`,
          },
        ],
      },
      apiKey
    )
    if (j.stop_reason === 'refusal') return actual
    const texto = (j.content || []).find((c) => c.type === 'text')?.text
    const nuevos = JSON.parse(texto).datos || []
    if (!nuevos.length) return actual

    // Dedup laxo: si ya existe un dato muy parecido, no se duplica.
    const clave = (d) => d.toLowerCase().replace(/[^a-záéíóúñ0-9 ]/g, '').slice(0, 45)
    const vistos = new Set(actual.map(clave))
    const suma = [...actual]
    for (const d of nuevos) {
      const k = clave(d)
      if (vistos.has(k)) continue
      vistos.add(k)
      suma.push(d)
    }

    // Al llegar al tope se tiran los más viejos: el contexto reciente manda.
    return guardarMemoria(suma.slice(-MAX_DATOS))
  } catch {
    return actual
  }
}
