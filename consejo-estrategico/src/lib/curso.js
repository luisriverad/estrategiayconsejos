import { norm } from './texto'

/**
 * Construcción del "curso de acción": toma los mejores resultados de la
 * búsqueda y reparte su contenido en cinco bloques, sin repetir texto.
 *
 * El reparto se hace por el ROTULO de cada sección de la ficha original
 * (IDEA CENTRAL, CONTRAJUGADA, ERROR COMÚN...). Si añades documentos con
 * rótulos nuevos, agrégalos a estas expresiones regulares.
 */
export const RX = {
  diagnostico:
    /IDEA CENTRAL|MECANISMO|PRINCIPIO|CONCEPTO|QU[EÉ] OCURRE|LO QUE OCURRE|QU[EÉ] SUCEDE|EL CASO|^CASO|PATR[OÓ]N|MAPA|SITUACI[OÓ]N|C[OÓ]MO PIENSA|JUEGO REAL|CONTEXTO|LECTURA DE PODER|LA INTENCI[OÓ]N/i,
  senal:
    /SE[NÑ]AL|C[OÓ]MO RECONOCER|C[OÓ]MO APARECE|QU[EÉ] OBSERVAR|C[OÓ]MO IDENTIFICAR|OBSERVACI[OÓ]N|ALERTA|EL ATAQUE|LA FRASE T[IÍ]PICA|FICHA DEL PERFIL/i,
  jugada:
    /RESPUESTA PRUDENTE|APLICACI[OÓ]N PRUDENTE|APLICACI[OÓ]N PR[AÁ]CTICA|DECISI[OÓ]N PRUDENTE|C[OÓ]MO LIDIAR|CONTRAJUGADA|CONTRA-JUGADA|LECTURA ESTRAT[EÉ]GICA|PROTECCI[OÓ]N|MI PLAN|REGISTRO|L[IÍ]MITE|POR QU[EÉ] FUNCIONA|MOVIMIENTO PR[AÁ]CTICO|APLICACI[OÓ]N MODERNA|MATRIZ DE RESPUESTAS|EJEMPLO PR[AÁ]CTICO/i,
  frase:
    /RESPUESTA R[AÁ]PIDA|GUION|CONTRAJUGADA|MATRIZ DE RESPUESTAS|RESPUESTA BASE|JEFE O SUPERIOR|FAMILIA O RELACIONES|NEGOCIACI[OÓ]N O VENTAS|TRABAJO:|CLIENTE:|FRASE/i,
  error: /ERROR COM[UÚ]N|EVITA|EMPEORA|SOMBRA|CUIDADO|LECTURA CR[IÍ]TICA|RIESGO|ATAJO CARO/i,
}

/** Rótulos que describen el problema, no la acción: nunca son "jugada". */
const NO_ES_ACCION =
  /ATAQUE|EMPEORA|CONSECUENCIA|ERROR|SOMBRA|RIESGO|EVITA|LO QUE OCURRE|QU[EÉ] OCURRE|SE[NÑ]AL|FRASE T[IÍ]PICA|INTENCI[OÓ]N/i

/**
 * Memoria de textos ya usados. Detecta solapamiento, no solo igualdad:
 * evita que una matriz completa reaparezca cuando ya se citó una de sus filas.
 */
export function Memoria() {
  const vistos = []
  return {
    usar(t) {
      const n = norm(t)
      if (!n) return false
      for (const v of vistos) {
        if (v === n) return false
        if (n.length > 28 && v.length > 28 && (v.includes(n) || n.includes(v))) return false
      }
      vistos.push(n)
      return true
    },
  }
}

function tomar(rs, rx, max, memo) {
  const out = []
  const m = memo || Memoria()
  for (const r of rs) {
    for (const [k, v] of Object.entries(r.f.secciones || {})) {
      if (!rx.test(k)) continue
      const t = v.trim()
      if (t.length < 22) continue
      if (!m.usar(t)) continue
      out.push({ t, f: r.f, lab: k })
      if (out.length >= max) return out
    }
  }
  return out
}

function tomarFrases(rs, max, memo) {
  const out = []
  const m = memo || Memoria()
  for (const r of rs) {
    const cand = []
    Object.entries(r.f.secciones || {}).forEach(([k, v]) => {
      if (RX.frase.test(k)) cand.push(v)
    })
    ;(r.f.pasos || []).forEach((p) => {
      if (p.nombre && RX.frase.test(p.nombre) && p.texto) cand.push(p.texto)
    })
    if (r.f.cita && /^["“«]/.test(r.f.cita.trim())) cand.push(r.f.cita)

    for (const c of cand) {
      const trozos = c.match(/[“"«][^”"»]{12,190}[”"»]/g) || [c]
      for (const x of trozos) {
        const t = x.replace(/^[“"«\s]+|[”"»\s]+$/g, '').trim()
        if (t.length < 14 || t.length > 210) continue
        if (out.length >= max) break
        if (!m.usar(t)) continue
        out.push({ t, f: r.f })
      }
    }
    if (out.length >= max) break
  }
  return out
}

/**
 * Arma el curso de acción a partir de los resultados de búsqueda.
 * @returns {{top, diagnostico, senales, frases, jugadas, errores, pasos, libros}}
 */
export function cursoDeAccion(rs) {
  const top = rs.slice(0, 9)
  if (!top.length) return null
  const m = Memoria()

  const diagnostico = tomar(top, RX.diagnostico, 3, m)
  const senales = tomar(top, RX.senal, 4, m)

  // Los pasos prescriptivos de la mejor ficha se reservan ANTES que las frases,
  // para que una fila de la matriz no reaparezca luego como cita suelta.
  const pasos = (top[0].f.pasos || []).filter((p) => {
    if (!p.nombre || NO_ES_ACCION.test(p.nombre)) return false
    return m.usar(p.texto || p.nombre)
  })

  const frases = tomarFrases(top, 3, m)
  const jugadas = tomar(top, RX.jugada, 5, m)
  const errores = tomar(top, RX.error, 3, m)

  return {
    top,
    diagnostico,
    senales,
    frases,
    jugadas,
    errores,
    pasos,
    libros: [...new Set(top.map((r) => r.f.docTitulo))],
  }
}
