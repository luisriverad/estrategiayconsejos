import { useEffect, useState } from 'react'
import { FICHAS, DOCS, TEMAS } from '../lib/buscador'
import { useApp } from '../contexto'

/**
 * ARSENAL: los 11 PDF de origen, tal como vienen del archivo fuente.
 * Los archivos viven en public/pdf/ con el mismo nombre que trae cada
 * ficha en su campo `pdf`, así que la ruta se arma sola.
 */
const ruta = (doc) => `${import.meta.env.BASE_URL}pdf/${doc.pdf}`

/** Primera página transcrita del documento, para saltar al expediente. */
function primeraFicha(docId) {
  return FICHAS.filter((f) => f.doc === docId).sort((a, b) => a.pagina - b.pagina)[0]
}

function Lector({ doc, pagina, onCerrar }) {
  const { abrirFicha } = useApp()
  const f0 = primeraFicha(doc.id)
  return (
    <div className="lector">
      <div className="lector-h">
        <button className="volver" onClick={onCerrar}>
          ‹ Arsenal
        </button>
        <div className="lector-t">
          <b>{doc.titulo}</b>
          <span>
            {doc.pdf} · {doc.n} páginas
          </span>
        </div>
        <div className="lector-a">
          {f0 && (
            <button onClick={() => abrirFicha(f0.id)}>Ver transcripción</button>
          )}
          <a href={ruta(doc)} target="_blank" rel="noreferrer">
            Abrir aparte
          </a>
          <a href={ruta(doc)} download>
            Descargar
          </a>
        </div>
      </div>
      <iframe
        className="lector-pdf"
        src={`${ruta(doc)}#page=${pagina || 1}&view=FitH`}
        title={doc.titulo}
      />
    </div>
  )
}

export default function VistaArsenal({ objetivo }) {
  const [abierto, setAbierto] = useState(null)
  const [pagina, setPagina] = useState(1)

  // `objetivo.k` es una marca de tiempo: permite reabrir el mismo documento en
  // otra página, o volver a él después de haber cerrado el lector.
  useEffect(() => {
    if (!objetivo) return
    setAbierto(objetivo.doc)
    setPagina(objetivo.pagina || 1)
  }, [objetivo])

  const doc = abierto ? DOCS.find((d) => d.id === abierto) : null

  if (doc) return <Lector doc={doc} pagina={pagina} onCerrar={() => setAbierto(null)} />

  const totalPags = DOCS.reduce((a, b) => a + b.n, 0)

  return (
    <div className="wrap arsenal">
      <div className="ars-head">
        <h2>Arsenal</h2>
        <span>
          {DOCS.length} documentos · {totalPags} páginas · archivos originales sin editar
        </span>
      </div>

      {TEMAS.map((tema) => {
        const ds = DOCS.filter((d) => d.tema === tema)
        if (!ds.length) return null
        return (
          <section className="ars-tema" key={tema}>
            <h3>{tema}</h3>
            <div className="ars-grid">
              {ds.map((d) => (
                <button
                  className="ars-card"
                  key={d.id}
                  onClick={() => {
                    setPagina(1)
                    setAbierto(d.id)
                  }}
                >
                  <span className="ars-ic" aria-hidden="true">
                    PDF
                  </span>
                  <span className="ars-tx">
                    <b>{d.titulo}</b>
                    <em>{d.sub}</em>
                    <span className="ars-meta">
                      {d.n} páginas · {d.pdf}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <p className="ars-pie">
        Los archivos se sirven desde <code>public/pdf/</code>. Son las versiones comprimidas del
        original: mismas páginas y mismo diseño, con las imágenes optimizadas para que la app pese
        menos.
      </p>
    </div>
  )
}
