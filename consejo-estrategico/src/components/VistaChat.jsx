import { useEffect, useRef, useState } from 'react'
import { FICHAS, DOCS, buscar } from '../lib/buscador'
import { cursoDeAccion } from '../lib/curso'
import { preguntarIA, aBloques } from '../lib/anthropic'
import Cita from './Cita'

const SUGERENCIAS = [
  'Mi socio quiere cambiar el reparto de utilidades y me presiona para firmar esta semana',
  'Un cliente grande me pide descuento amenazando con irse',
  'Mi jefe presentó mi trabajo como suyo frente al comité',
  'Tengo que decidir si confronto a alguien del equipo o lo dejo pasar',
]

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

export default function VistaChat({ apiKey, modelo, onAbrirAjustes }) {
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const historial = useRef([])
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
    setMensajes((m) => [...m, { rol: 'user', texto: q }])
    setOcupado(true)

    if (apiKey) {
      try {
        const t = await preguntarIA({ apiKey, modelo, pregunta: q, historial: historial.current })
        historial.current.push({ q, a: t })
        setMensajes((m) => [...m, { rol: 'ia', bloques: aBloques(t) }])
      } catch (e) {
        historial.current.push({ q, a: '(error)' })
        setMensajes((m) => [...m, { rol: 'ia', error: e.message, local: respuestaLocal(q, historial.current) }])
      }
    } else {
      historial.current.push({ q, a: '(local)' })
      setMensajes((m) => [...m, { rol: 'ia', local: respuestaLocal(q, historial.current) }])
    }
    setOcupado(false)
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
          <span className={`modepill ${apiKey ? 'ia' : ''}`}>{apiKey ? 'IA conectada' : 'Modo local'}</span>
          <span>
            {apiKey ? `${modelo} · razona sobre los 11 libros` : `Responde buscando en las ${FICHAS.length} páginas`}
          </span>
          <button onClick={onAbrirAjustes}>{apiKey ? 'Ajustes de IA' : 'Conectar IA'}</button>
        </div>
      </div>

      <div className="msgs">
        <div className="msgw">
          {mensajes.length === 0 && (
            <div className="msg a">
              <div className="av">HQ</div>
              <div className="bub">
                <p>
                  Reporta la situación y te devuelvo el curso de acción, citando el documento y la
                  página exacta. Opero sobre las <b>{FICHAS.length} páginas</b> de tus {DOCS.length} documentos.
                </p>
                <p className="pie">
                  Entre más concreto sea el reporte —quién, dónde, qué se dijo— mejor es el plan.
                </p>
                <div className="suggs">
                  {SUGERENCIAS.map((s) => (
                    <button key={s} onClick={() => enviar(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  {apiKey ? 'Analizando' : 'Rastreando fuentes'}
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>
      </div>
    </>
  )
}
