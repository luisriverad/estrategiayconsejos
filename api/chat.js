/**
 * Proxy hacia la API de Anthropic.
 *
 * Existe por una razón concreta: en el navegador, cualquier variable con
 * prefijo VITE_ queda incrustada en el bundle público. Poner ahí la API key en
 * un despliegue equivale a publicarla — cualquiera abre "ver código fuente" y
 * se la lleva. Aquí la key vive solo en el servidor, como ANTHROPIC_ANTHROPIC
 * key de entorno de Vercel, y nunca viaja al cliente.
 */
const MODELOS_PERMITIDOS = new Set(['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'])
const TOPE_TOKENS = 8000

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Solo se acepta POST.' } })
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return res.status(500).json({
      error: {
        message:
          'Falta la variable ANTHROPIC_API_KEY en el proyecto de Vercel. Agrégala en Settings → Environment Variables (sin el prefijo VITE_) y vuelve a desplegar.',
      },
    })
  }

  // Mismo origen: evita que otro sitio use este despliegue como proxy gratis.
  const origen = req.headers.origin
  if (origen) {
    try {
      if (new URL(origen).host !== req.headers.host) {
        return res.status(403).json({ error: { message: 'Origen no permitido.' } })
      }
    } catch {
      return res.status(403).json({ error: { message: 'Origen inválido.' } })
    }
  }

  const cuerpo = req.body
  if (!cuerpo || typeof cuerpo !== 'object' || !Array.isArray(cuerpo.messages)) {
    return res.status(400).json({ error: { message: 'Cuerpo inválido.' } })
  }
  if (!MODELOS_PERMITIDOS.has(cuerpo.model)) {
    return res.status(400).json({ error: { message: `Modelo no permitido: ${cuerpo.model}` } })
  }

  // Techo de gasto por llamada, por si alguien alcanza el endpoint.
  cuerpo.max_tokens = Math.min(Number(cuerpo.max_tokens) || 4000, TOPE_TOKENS)

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(cuerpo),
    })
    const datos = await r.json()
    return res.status(r.status).json(datos)
  } catch (e) {
    return res.status(502).json({ error: { message: 'No se pudo contactar la API: ' + e.message } })
  }
}
