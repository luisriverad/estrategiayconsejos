import { useState } from 'react'
import { FICHAS, DOCS, TEMAS } from '../lib/buscador'
import { useApp } from '../contexto'

/**
 * Árbol de navegación: Tema → Documento → Página.
 * Al hacer clic en una página se abre su ficha diseñada.
 */
export default function Temario({ fichaActiva }) {
  const { abrirFicha } = useApp()
  const [temaAbierto, setTemaAbierto] = useState(null)
  const [docAbierto, setDocAbierto] = useState(null)

  return (
    <nav id="nav">
      {TEMAS.map((tema) => {
        const ds = DOCS.filter((d) => d.tema === tema)
        const total = ds.reduce((a, b) => a + b.n, 0)
        const abierto = temaAbierto === tema
        return (
          <div className={`tema ${abierto ? 'open' : ''}`} key={tema}>
            <button
              onClick={() => {
                setTemaAbierto(abierto ? null : tema)
                setDocAbierto(null)
              }}
            >
              <span className="ch">▶</span>
              {tema}
              <span className="cnt">{total}</span>
            </button>

            <div className="docs">
              {ds.map((d) => {
                const dOpen = docAbierto === d.id
                const paginas = dOpen
                  ? FICHAS.filter((x) => x.doc === d.id).sort((a, b) => a.pagina - b.pagina)
                  : []
                return (
                  <div className={`doc ${dOpen ? 'open' : ''}`} key={d.id}>
                    <button onClick={() => setDocAbierto(dOpen ? null : d.id)}>
                      <span className="ch">▶</span>
                      <span>{d.titulo}</span>
                      <span className="dn">{d.n}</span>
                    </button>
                    <div className="fichas">
                      {paginas.map((f) => (
                        <button
                          key={f.id}
                          className={`${fichaActiva === f.id ? 'on' : ''} ${f.vacia ? 'vac' : ''}`}
                          onClick={() => abrirFicha(f.id)}
                        >
                          <span className="pn">{f.pagina}</span>
                          <span className="tx">{f.vacia ? '(página en blanco)' : f.titulo}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
