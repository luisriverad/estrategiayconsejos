import { FICHAS, DOCS, porId, abrev } from '../lib/buscador'
import { useApp } from '../contexto'

/**
 * Página de lectura de una ficha. Es la vista a la que llega el temario:
 * el contenido de una página del PDF, rearmado y con la ortografía corregida.
 */
export default function VistaFicha({ id, setFiltro }) {
  const { abrirFicha, buscarTexto, abrirPdf } = useApp()
  const f = porId.get(id)
  if (!f) return null

  const doc = DOCS.find((d) => d.id === f.doc)
  const hermanas = FICHAS.filter((x) => x.doc === f.doc).sort((a, b) => a.pagina - b.pagina)
  const i = hermanas.findIndex((x) => x.id === id)
  const prev = hermanas[i - 1]
  const next = hermanas[i + 1]
  const secciones = Object.entries(f.secciones || {})

  return (
    <div className="fw">
      <div className="crumb">
        <a onClick={() => setFiltro({ tema: f.tema, doc: null })}>{f.tema}</a>
        <span className="sep">›</span>
        <a onClick={() => setFiltro({ tema: f.tema, doc: f.doc })}>{f.docTitulo}</a>
        <span className="sep">›</span>
        <span>
          página {f.pagina} de {doc.n}
        </span>
      </div>

      <header className="fhead">
        <div className="pgtag">
          <b>{f.pagina}</b>
          <span>página</span>
          <button className="pgtag-pdf" onClick={() => abrirPdf(f.doc, f.pagina)}>
            Ver en el PDF
          </button>
        </div>
        <div className="kicker">{abrev(f.docTitulo)}</div>
        <h1>{f.titulo}</h1>
        {f.subtitulo && <div className="sub">{f.subtitulo}</div>}
      </header>

      {f.vacia ? (
        <div className="warnbox">
          <b>Esta página viene en blanco en el PDF original.</b>
          <br />
          La página {f.pagina} del archivo fuente está completamente en negro, sin texto ni
          ilustración recuperable. No es un fallo de la transcripción: el contenido no existe en el
          archivo que tenemos. Habría que reponer ese PDF.
        </div>
      ) : (
        <>
          {f.cita && <blockquote className="fquote">« {f.cita} »</blockquote>}

          {(f.pasos || []).length > 0 && (
            <section className="sect">
              <h2>Secuencia de ejecución</h2>
              <div className="steps">
                {f.pasos.map((p, k) => (
                  <div className="step" key={k}>
                    <span className="n">{p.n ?? k + 1}</span>
                    <b>{p.nombre}</b>
                    <p>{p.texto}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {secciones.length > 0 && (
            <section className="sect">
              <h2>Puntos clave</h2>
              <div className="cards">
                {secciones.map(([k, v]) => (
                  <div className="sc" key={k}>
                    <b>{k}</b>
                    <p>{v}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(f.repaso || []).length > 0 && (
            <section className="sect">
              <h2>Debrief</h2>
              <div className="rep">
                <ul>
                  {f.repaso.map((x, k) => (
                    <li key={k}>{x}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {(f.etiquetas || []).length > 0 && (
            <section className="sect">
              <h2>Reglas de empeño — cuándo aplica</h2>
              <div className="tagrow">
                {f.etiquetas.map((t) => (
                  <button className="tg" key={t} onClick={() => buscarTexto(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="fnav">
        <button disabled={!prev} onClick={() => prev && abrirFicha(prev.id)}>
          <span className="lb">‹ Anterior</span>
          <span className="tt">{prev ? prev.titulo : '—'}</span>
        </button>
        <button className="r" disabled={!next} onClick={() => next && abrirFicha(next.id)}>
          <span className="lb">Siguiente ›</span>
          <span className="tt">{next ? next.titulo : '—'}</span>
        </button>
      </div>

      <div className="srcnote">
        Fuente: {f.pdf} · pág. {f.pagina} · {f.tema}
        <span className="ok">· ortografía corregida respecto del original</span>
      </div>
    </div>
  )
}
