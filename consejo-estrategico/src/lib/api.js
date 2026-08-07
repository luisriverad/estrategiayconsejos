/**
 * Un solo punto de salida hacia el modelo, con dos caminos:
 *
 * · Local (hay VITE_ANTHROPIC_API_KEY): llamada directa a api.anthropic.com.
 *   Cómodo para desarrollar, y la key nunca sale de tu máquina.
 * · Desplegado (VITE_PROXY=1): pasa por /api/chat, la función de Vercel que
 *   guarda la key del lado del servidor. En un sitio público esta es la única
 *   forma segura: una key con prefijo VITE_ queda a la vista en el bundle.
 */
export const PROXY = import.meta.env.VITE_PROXY === '1'

/** ¿Se puede consultar al modelo, por el camino que sea? */
export const hayIA = (apiKey) => Boolean(apiKey) || PROXY

export async function llamarModelo(cuerpo, apiKey) {
  const directo = Boolean(apiKey)
  const cabeceras = { 'content-type': 'application/json' }
  if (directo) {
    cabeceras['x-api-key'] = apiKey
    cabeceras['anthropic-version'] = '2023-06-01'
    cabeceras['anthropic-dangerous-direct-browser-access'] = 'true'
  }

  const r = await fetch(directo ? 'https://api.anthropic.com/v1/messages' : '/api/chat', {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify(cuerpo),
  })

  if (!r.ok) {
    const t = await r.text()
    let detalle = t.slice(0, 240)
    try {
      detalle = JSON.parse(t).error?.message || detalle
    } catch {
      /* la respuesta no era JSON: se usa el texto crudo */
    }
    throw new Error(`La API respondió ${r.status}: ${detalle}`)
  }
  return r.json()
}
