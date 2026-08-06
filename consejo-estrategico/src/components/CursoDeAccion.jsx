import Cita from './Cita'

function Bloque({ n, titulo, children, clase = '' }) {
  return (
    <div className={`blk ${clase}`}>
      <h3>
        {n ? `${n} · ` : ''}
        {titulo}
      </h3>
      {children}
    </div>
  )
}

/** Panel de arriba de los resultados: la síntesis de varias fuentes. */
export default function CursoDeAccion({ curso }) {
  if (!curso) return null
  const { top, diagnostico, senales, frases, jugadas, errores, pasos, libros } = curso

  return (
    <div className="coa">
      <div className="coa-h">
        <h2>Curso de acción</h2>
        <span className="src">
          {libros.length} fuente{libros.length > 1 ? 's' : ''} · {top.length} fichas
        </span>
      </div>
      <div className="coa-b">
        {diagnostico.length > 0 && (
          <Bloque n="Fase 01" titulo="Situación">
            <ul>
              {diagnostico.map((d, i) => (
                <li key={i}>
                  {d.t} <Cita ficha={d.f} />
                </li>
              ))}
            </ul>
          </Bloque>
        )}

        {senales.length > 0 && (
          <Bloque n="Fase 02" titulo="Confirmación">
            <ul>
              {senales.map((d, i) => (
                <li key={i}>
                  {d.t} <Cita ficha={d.f} />
                </li>
              ))}
            </ul>
          </Bloque>
        )}

        {(pasos.length > 0 || jugadas.length > 0) && (
          <Bloque n="Fase 03" titulo="Plan de acción">
            <ol>
              {pasos.map((p, i) => (
                <li key={`p${i}`}>
                  <b>{p.nombre}.</b> {p.texto} <Cita ficha={top[0].f} />
                </li>
              ))}
              {jugadas.map((d, i) => (
                <li key={`j${i}`}>
                  {d.t} <Cita ficha={d.f} />
                </li>
              ))}
            </ol>
          </Bloque>
        )}

        {frases.length > 0 && (
          <Bloque n="Fase 04" titulo="Comunicación">
            {frases.map((d, i) => (
              <div className="say" key={i}>
                <span className="who">
                  {d.f.docTitulo} · pág. {d.f.pagina}
                </span>
                «{d.t}»
              </div>
            ))}
          </Bloque>
        )}

        {errores.length > 0 && (
          <Bloque n="Fase 05" titulo="Restricciones — qué no hacer" clase="avoid">
            <ul>
              {errores.map((d, i) => (
                <li key={i}>
                  {d.t} <Cita ficha={d.f} />
                </li>
              ))}
            </ul>
          </Bloque>
        )}

        <Bloque titulo="Trazabilidad">
          <ul className="fuentes">
            {libros.map((l) => {
              const ps = top.filter((r) => r.f.docTitulo === l).map((r) => r.f.pagina).sort((a, b) => a - b)
              return (
                <li key={l}>
                  ▸ <b>{l}</b> — pág. {ps.join(', ')}
                </li>
              )
            })}
          </ul>
        </Bloque>
      </div>
    </div>
  )
}
