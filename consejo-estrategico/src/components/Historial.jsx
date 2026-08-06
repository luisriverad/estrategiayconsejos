import { cuando } from '../lib/chats'

/** Lista de conversaciones guardadas, arriba del índice operativo. */
export default function Historial({ chats, chatActivo, onAbrir, onNuevo, onBorrar }) {
  return (
    <div className="hist">
      <div className="navtitle">
        Conversaciones
        <button className="hist-nuevo" onClick={onNuevo} title="Empezar una conversación nueva">
          + Nuevo
        </button>
      </div>

      {chats.length === 0 ? (
        <p className="hist-vacio">
          Todavía no hay conversaciones. La primera se guarda sola en cuanto envíes un reporte.
        </p>
      ) : (
        <div className="hist-lista">
          {chats.map((c) => (
            <div className={`hist-item ${c.id === chatActivo ? 'on' : ''}`} key={c.id}>
              <button className="hist-abrir" onClick={() => onAbrir(c.id)}>
                <span className="hist-tt">{c.titulo}</span>
                <span className="hist-meta">
                  {cuando(c.ts)} · {c.n} reporte{c.n === 1 ? '' : 's'}
                </span>
              </button>
              <button
                className="hist-x"
                title="Borrar esta conversación"
                onClick={() => onBorrar(c.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
