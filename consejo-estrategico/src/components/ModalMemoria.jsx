import { useEffect, useState } from 'react'

/** Ver, corregir y borrar lo que el sistema recuerda de ti. */
export default function ModalMemoria({ abierto, datos, onGuardar, onCerrar }) {
  const [texto, setTexto] = useState('')

  useEffect(() => {
    if (abierto) setTexto(datos.join('\n'))
  }, [abierto, datos])

  if (!abierto) return null

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="mbox">
        <h3>Memoria del consejero</h3>
        <p>
          Lo que el sistema ya sabe de tu contexto y antepone a cada consulta. Se llena solo con lo
          duradero de cada conversación —tu rol, tu empresa, las personas recurrentes, las decisiones
          que ya tomaste— y nunca con la situación puntual del día.
        </p>

        <label>Un dato por línea · {datos.length} de 25</label>
        <textarea
          className="mem-txt"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Todavía no hay nada. Se irá llenando conforme uses el briefing, o puedes escribirlo tú."
          spellCheck="false"
        />

        <div className="note">
          Esto <b>no entrena al modelo</b>: los modelos no aprenden de tus chats. Es un contexto que
          vive en este navegador y se le adjunta a cada consulta. Bórralo cuando quieras.
        </div>

        <div className="mrow">
          <button className="sec" onClick={onCerrar}>
            Cancelar
          </button>
          {datos.length > 0 && (
            <button className="sec" onClick={() => onGuardar([])}>
              Borrar todo
            </button>
          )}
          <button
            className="pri"
            onClick={() => onGuardar(texto.split('\n').map((l) => l.replace(/^[-•]\s*/, '')))}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
