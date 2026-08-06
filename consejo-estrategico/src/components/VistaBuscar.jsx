import { useMemo, useState } from 'react'
import { FICHAS, DOCS, buscar, fragmento } from '../lib/buscador'
import { cursoDeAccion } from '../lib/curso'
import CursoDeAccion from './CursoDeAccion'
import { useApp } from '../contexto'

const EJEMPLOS = [
  'me robaron el crédito en la junta',
  'mi jefe se siente amenazado por mí',
  'cómo sé si me están manipulando',
  'ya acepté algo bajo presión y quiero revertirlo',
  'cómo trato con un oportunista',
  'me criticaron enfrente de todos',
  'quieren que decida hoy mismo',
  'cómo construyo aliados',
  'negociar cuando tengo menos poder',
  'cuándo conviene no dar la pelea',
]

function Tarjeta({ r }) {
  const { abrirFicha } = useApp()
  const segs = fragmento(r.f, r.qt || [])
  return (
    <div className="card" onClick={() => abrirFicha(r.f.id)}>
      <div className="pg">
        <b>{r.f.pagina}</b>
        <span>página</span>
      </div>
      <div className="ct">
        <div className="dc">{r.f.docTitulo}</div>
        <h4>{r.f.titulo}</h4>
        {r.f.subtitulo && <div className="sb">{r.f.subtitulo}</div>}
        <div className="snip">
          {segs.map((s, i) => (s.marca ? <mark key={i}>{s.t}</mark> : <span key={i}>{s.t}</span>))}
        </div>
      </div>
    </div>
  )
}

export default function VistaBuscar({ consulta, setConsulta, filtro, setFiltro }) {
  const [enviada, setEnviada] = useState('')

  const predicado = useMemo(() => {
    if (filtro.doc) return (f) => f.doc === filtro.doc
    if (filtro.tema) return (f) => f.tema === filtro.tema
    return null
  }, [filtro])

  const resultados = useMemo(
    () => (enviada ? buscar(enviada, predicado) : []),
    [enviada, predicado]
  )
  const curso = useMemo(() => (resultados.length > 1 ? cursoDeAccion(resultados) : null), [resultados])

  const lanzar = (texto) => {
    const t = texto ?? consulta
    setConsulta(t)
    setEnviada(t.trim())
  }

  const docFiltro = filtro.doc ? DOCS.find((d) => d.id === filtro.doc) : null
  const nTema = filtro.tema
    ? DOCS.filter((d) => d.tema === filtro.tema).reduce((a, b) => a + b.n, 0)
    : 0

  return (
    <>
      <div className="sbar">
        <div className="sbox">
          <span className="ic">&gt;</span>
          <input
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lanzar()}
            placeholder="Describe tu situación… ej: mi jefe se quedó con el crédito del proyecto"
            autoComplete="off"
            spellCheck="false"
          />
          <button className="go" onClick={() => lanzar()}>
            Ejecutar
          </button>
        </div>

        <div className="chips">
          {EJEMPLOS.map((e) => (
            <button key={e} onClick={() => lanzar(e)}>
              {e}
            </button>
          ))}
        </div>

        <div className="fbar">
          {docFiltro ? (
            <>
              Buscando solo en <b>{docFiltro.titulo}</b> ({docFiltro.n} págs)
              <a onClick={() => setFiltro({ tema: null, doc: null })}>quitar filtro</a>
            </>
          ) : filtro.tema ? (
            <>
              Buscando solo en <b>{filtro.tema}</b> ({nTema} págs)
              <a onClick={() => setFiltro({ tema: null, doc: null })}>quitar filtro</a>
            </>
          ) : (
            <>
              Buscando en las <b>{FICHAS.length} páginas</b> de los {DOCS.length} documentos
            </>
          )}
        </div>
      </div>

      <div className="wrap">
        {!enviada ? (
          <Portada />
        ) : resultados.length === 0 ? (
          <div className="none">
            <b>Sin resultados para «{enviada}»</b>
            Prueba con palabras de la situación real: jefe, junta, crédito, presión, límite, aliado, urgencia.
            {(filtro.tema || filtro.doc) && (
              <>
                <br />
                <br />
                Tienes un filtro activo — quizá la respuesta está en otro tema.
              </>
            )}
          </div>
        ) : (
          <>
            <CursoDeAccion curso={curso} />
            <div className="rhead">
              Fuentes localizadas
              <span>
                {resultados.length} expediente{resultados.length > 1 ? 's' : ''} · orden de relevancia
              </span>
            </div>
            {resultados.map((r) => (
              <Tarjeta key={r.f.id} r={r} />
            ))}
          </>
        )}
      </div>
    </>
  )
}

function Portada() {
  const temas = new Set(DOCS.map((d) => d.tema)).size
  return (
    <div className="land">
      <h2>Describe la situación. Te devuelvo el curso de acción.</h2>
      <p>
        Escribe <b>lo que está pasando de verdad</b>, no el nombre de la ley. El buscador te dice{' '}
        <b>en qué documento y en qué página</b> está la respuesta, y arma un <b>curso de acción</b>{' '}
        combinando lo que dicen varios libros a la vez.
      </p>
      <p className="tenue">
        Cada línea del curso de acción lleva su cita: haz clic en la etiqueta caqui y te lleva al
        expediente completo. En el índice de la izquierda puedes abrir cualquier página directamente.
      </p>
      <div className="stats">
        <div className="stat">
          <b>{FICHAS.length}</b>
          <span>páginas</span>
        </div>
        <div className="stat">
          <b>{DOCS.length}</b>
          <span>documentos</span>
        </div>
        <div className="stat">
          <b>{temas}</b>
          <span>temas</span>
        </div>
      </div>
    </div>
  )
}
