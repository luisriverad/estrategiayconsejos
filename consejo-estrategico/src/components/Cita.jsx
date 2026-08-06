import { abrev } from '../lib/buscador'
import { useApp } from '../contexto'

/**
 * Etiqueta dorada "Documento · p.12". Al hacer clic abre la ficha.
 * Si `id` es null (el modelo citó una página que no existe) se muestra
 * igual pero sin enlace, para no mentir sobre la trazabilidad.
 */
export default function Cita({ ficha, doc, pagina, id }) {
  const { abrirFicha } = useApp()
  const _id = ficha ? ficha.id : id
  const _doc = ficha ? ficha.docTitulo : doc
  const _pag = ficha ? ficha.pagina : pagina
  const etiqueta = `${abrev(_doc)} · p.${_pag}`

  if (!_id) return <span className="cita sin-enlace">{etiqueta}</span>
  return (
    <button type="button" className="cita" onClick={() => abrirFicha(_id)}>
      {etiqueta}
    </button>
  )
}
