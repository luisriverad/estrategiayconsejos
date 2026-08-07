import { useEffect, useRef, useState } from 'react'
import { FICHAS, buscar } from '../lib/buscador'
import { cursoDeAccion } from '../lib/curso'
import { preguntarIA, aBloques } from '../lib/anthropic'
import Cita from './Cita'
import { leerChat, guardarChat } from '../lib/chats'
import { actualizarMemoria } from '../lib/memoria'
import { hayIA } from '../lib/api'

/** Respuesta sin IA: busca en las fichas y arma el curso de acción. */
function respuestaLocal(pregunta, historial) {
  const previo = historial.slice(-2).map((h) => h.q).join(' ')
  let rs = buscar(pregunta, null, 12)
  if (rs.length < 3) rs = buscar(previo + ' ' + pregunta, null, 12)
  if (!rs.length) return { vacio: true }
  return { curso: cursoDeAccion(rs) }
}

function RespuestaLocal({ curso, vacio }) {
  if (vacio)
    return (
      <p>
        No encontré nada claro sobre eso en los libros. Prueba describiéndolo con las palabras de la
        situación: quién hace qué, dónde y qué se dijo.
      </p>
    )
  const { top, diagnostico, senales, frases, jugadas, errores, pasos, libros } = curso
  const acciones = [
    ...pasos.map((p, i) => ({ key: `p${i}`, nodo: <><b>{p.nombre}.</b> {p.texto} <Cita ficha={top[0].f} /></> })),
    ...jugadas.slice(0, 4).map((d, i) => ({ key: `j${i}`, nodo: <>{d.t} <Cita ficha={d.f} /></> })),
  ].slice(0, 6)

  return (
    <>
      {diagnostico.length > 0 && (
        <>
          <h4>Situación</h4>
          <ul>
            {diagnostico.slice(0, 2).map((d, i) => (
              <li key={i}>{d.t} <Cita ficha={d.f} /></li>
            ))}
          </ul>
        </>
      )}
      {senales.length > 0 && (
        <>
          <h4>Confirmación</h4>
          <ul>
            {senales.slice(0, 3).map((d, i) => (
              <li key={i}>{d.t} <Cita ficha={d.f} /></li>
            ))}
          </ul>
        </>
      )}
      {acciones.length > 0 && (
        <>
          <h4>Plan de acción</h4>
          <ol>{acciones.map((a) => <li key={a.key}>{a.nodo}</li>)}</ol>
        </>
      )}
      {frases.length > 0 && (
        <>
          <h4>Comunicación</h4>
          {frases.slice(0, 2).map((d, i) => (
            <div className="say" key={i}>
              <span className="who">{d.f.docTitulo} · pág. {d.f.pagina}</span>«{d.t}»
            </div>
          ))}
        </>
      )}
      {errores.length > 0 && (
        <>
          <h4>Restricciones</h4>
          <ul>
            {errores.slice(0, 2).map((d, i) => (
              <li key={i}>{d.t} <Cita ficha={d.f} /></li>
            ))}
          </ul>
        </>
      )}
      <p className="pie">
        Basado en {top.length} fichas de {libros.length} documento{libros.length > 1 ? 's' : ''}. Haz
        clic en cualquier cita para leer la página completa.
      </p>
    </>
  )
}

function RespuestaIA({ bloques }) {
  return bloques.map((b, i) => {
    if (b.tipo === 'titulo') return <h4 key={i}>{b.t}</h4>
    const pinta = (trozos) =>
      trozos.map((x, j) =>
        x.tipo === 'cita' ? <Cita key={j} doc={x.doc} pagina={x.pagina} id={x.id} /> : <span key={j}>{x.t}</span>
      )
    if (b.tipo === 'lista') {
      const L = b.ordenada ? 'ol' : 'ul'
      return <L key={i}>{b.items.map((it, j) => <li key={j}>{pinta(it)}</li>)}</L>
    }
    return <p key={i}>{pinta(b.trozos)}</p>
  })
}

export default function VistaChat({ chatId, onGuardado, apiKey, modelo, onAbrirAjustes, onAbrirMemoria, memoria, setMemoria }) {
  // El componente se remonta con key={chatId}, así que basta con leer el chat
  // guardado en el estado inicial: no hace falta sincronizarlo después.
  const guardado = useRef(leerChat(chatId)).current
  const [mensajes, setMensajes] = useState(() => guardado?.mensajes || [])
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const historial = useRef(guardado?.historial || [])
  const finRef = useRef(null)
  const taRef = useRef(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, ocupado])

  async function enviar(txt) {
    const q = (txt ?? texto).trim()
    if (!q || ocupado) return
    setTexto('')
    if (taRef.current) taRef.current.style.height = 'auto'
    const conReporte = [...mensajes, { rol: 'user', texto: q }]
    setMensajes(conReporte)
    setOcupado(true)

    let respuesta
    if (hayIA(apiKey)) {
      try {
        const t = await preguntarIA({
          apiKey,
          modelo,
          pregunta: q,
          historial: historial.current,
          memoria,
        })
        historial.current.push({ q, a: t })
        respuesta = { rol: 'ia', bloques: aBloques(t) }
        // La destilación va aparte y sin bloquear: si falla, el chat ni se entera.
        actualizarMemoria({ apiKey, pregunta: q, respuesta: t }).then(setMemoria)
      } catch (e) {
        historial.current.push({ q, a: '(error)' })
        respuesta = { rol: 'ia', error: e.message, local: respuestaLocal(q, historial.current) }
      }
    } else {
      historial.current.push({ q, a: '(local)' })
      respuesta = { rol: 'ia', local: respuestaLocal(q, historial.current) }
    }

    const completo = [...conReporte, respuesta]
    setMensajes(completo)
    setOcupado(false)

    // Se persiste con la conversación ya cerrada, no a medias.
    guardarChat({ id: chatId, mensajes: completo, historial: historial.current })
    onGuardado?.()
    // Listo para la repregunta: el cursor vuelve solo a la consola.
    taRef.current?.focus()
  }

  return (
    <>
      <div className="chatin">
        <div className="ciw">
          <div className="ciw-h">
            <span className="ciw-tag">Entrada de situación</span>
            <span className="ciw-rule" />
            <span className="ciw-hint">Enter transmite · Shift+Enter salta línea</span>
          </div>
          <textarea
            ref={taRef}
            rows={1}
            value={texto}
            placeholder="Reporta la situación: quién, dónde, qué se dijo…"
            onChange={(e) => {
              setTexto(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 280) + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviar()
              }
            }}
          />
          <button className="send" onClick={() => enviar()} disabled={ocupado}>
            Enviar
          </button>
        </div>
        <div className="chatfoot">
          <span className={`modepill ${hayIA(apiKey) ? 'ia' : ''}`}>{hayIA(apiKey) ? 'IA conectada' : 'Modo local'}</span>
          <button className="mempill" onClick={onAbrirMemoria} title="Ver y editar lo que el consejero recuerda de ti">
            Memoria · {memoria.length}
          </button>
          <span>
            {hayIA(apiKey) ? `${modelo} · razona sobre los 11 libros` : `Responde buscando en las ${FICHAS.length} páginas`}
          </span>
          <button onClick={onAbrirAjustes}>{apiKey ? 'Ajustes de IA' : 'Conectar IA'}</button>
        </div>
      </div>

      <div className="msgs">
        <div className="msgw">
          {mensajes.map((m, i) => (
            <div className={`msg ${m.rol === 'user' ? 'u' : 'a'}`} key={i}>
              <div className="av">{m.rol === 'user' ? 'TÚ' : 'HQ'}</div>
              <div className="bub">
                {m.rol === 'user' ? (
                  m.texto.split('\n').map((l, j) => <p key={j}>{l}</p>)
                ) : (
                  <>
                    {m.error && (
                      <>
                        <p className="errtxt">
                          <b>No pude conectar con la IA.</b>
                          <br />
                          {m.error}
                        </p>
                        <p className="pie">Te respondo en modo local mientras tanto:</p>
                      </>
                    )}
                    {m.bloques ? <RespuestaIA bloques={m.bloques} /> : <RespuestaLocal {...m.local} />}
                  </>
                )}
              </div>
            </div>
          ))}

          {ocupado && (
            <div className="msg a">
              <div className="av">HQ</div>
              <div className="bub">
                <span className="thinking">
                  {hayIA(apiKey) ? 'Analizando' : 'Rastreando fuentes'}
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}
          {mensajes.length > 0 && !ocupado && (
            <div className="continuar">
              <button onClick={() => taRef.current?.focus()}>
                ↑ Seguir afinando este caso
              </button>
              <span>
                El consejero conserva el hilo: pregunta por un paso concreto, dile qué respondió la
                otra parte o pídele que reescriba una frase.
              </span>
            </div>
          )}
          <div ref={finRef} />
        </div>
      </div>
    </>
  )
}
