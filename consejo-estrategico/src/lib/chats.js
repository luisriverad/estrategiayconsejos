import { porId } from './buscador'

/**
 * Persistencia de conversaciones en localStorage.
 *
 * Las respuestas en modo local traen fichas completas incrustadas (curso de
 * acción). Guardarlas tal cual llenaría la cuota del navegador en pocas
 * conversaciones, así que al serializar se reemplaza cada ficha por su id y al
 * leer se rehidrata desde el índice. Efecto lateral bueno: si el corpus cambia,
 * las conversaciones viejas quedan apuntando a las fichas actuales.
 */
const CLAVE = 'sac.chats.v1'
const MAX = 60

const esFicha = (v) =>
  v && typeof v === 'object' && 'docTitulo' in v && 'pagina' in v && 'id' in v

const comprimir = (chat) =>
  JSON.stringify(chat, (_k, v) => (esFicha(v) ? { __ficha: v.id } : v))

const expandir = (txt) =>
  JSON.parse(txt, (_k, v) =>
    v && typeof v === 'object' && v.__ficha != null ? porId.get(v.__ficha) ?? null : v
  )

function todos() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? expandir(crudo) : []
  } catch {
    return []
  }
}

function escribir(lista) {
  try {
    localStorage.setItem(CLAVE, comprimir(lista))
    return true
  } catch {
    // Cuota llena: tira las conversaciones más viejas y reintenta una vez.
    try {
      localStorage.setItem(CLAVE, comprimir(lista.slice(0, 15)))
      return true
    } catch {
      return false
    }
  }
}

export const nuevoId = () =>
  `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Resumen de cada conversación para pintar la lista, sin cargar los mensajes. */
export function listaChats() {
  return todos()
    .map(({ id, titulo, ts, n }) => ({ id, titulo, ts, n }))
    .sort((a, b) => b.ts - a.ts)
}

export function leerChat(id) {
  return todos().find((c) => c.id === id) || null
}

/** El título sale del primer reporte del usuario. */
export function tituloDe(mensajes) {
  const primero = mensajes.find((m) => m.rol === 'user')
  if (!primero) return 'Sin título'
  const t = primero.texto.replace(/\s+/g, ' ').trim()
  return t.length > 56 ? t.slice(0, 56) + '…' : t
}

export function guardarChat({ id, mensajes, historial }) {
  if (!mensajes.length) return
  const lista = todos().filter((c) => c.id !== id)
  lista.unshift({
    id,
    titulo: tituloDe(mensajes),
    ts: Date.now(),
    n: mensajes.filter((m) => m.rol === 'user').length,
    mensajes,
    historial,
  })
  escribir(lista.slice(0, MAX))
}

export function borrarChat(id) {
  escribir(todos().filter((c) => c.id !== id))
}

const DIA = 86400000

/** Fecha corta y relativa: "14:32", "ayer", "6 ago". */
export function cuando(ts) {
  const d = new Date(ts)
  const hoy = new Date()
  const dif = Math.floor((hoy.setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / DIA)
  if (dif <= 0) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  if (dif === 1) return 'ayer'
  if (dif < 7) return `hace ${dif} días`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
