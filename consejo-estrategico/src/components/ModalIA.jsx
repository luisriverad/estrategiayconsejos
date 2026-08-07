import { useEffect, useState } from 'react'
import { MODELOS } from '../lib/anthropic'
import { PROXY } from '../lib/api'

/**
 * Ajustes del modelo.
 *
 * Dos escenarios distintos, y conviene no mezclarlos:
 *
 * · Desplegado (PROXY): la key vive en el servidor y el navegador nunca la ve.
 *   Aquí no hay nada que conectar — pedir una key sería pedir algo que ya está
 *   resuelto, y pegarla empeoraría las cosas: la llamada dejaría de pasar por
 *   el servidor. Así que solo se elige modelo.
 * · Sin proxy y sin .env.local: no hay forma de llegar al modelo, y entonces sí
 *   tiene sentido pedir una key. Vive solo en memoria, no se persiste.
 */
export default function ModalIA({ abierto, apiKey, modelo, onGuardar, onDesconectar, onCerrar }) {
  const [k, setK] = useState(apiKey)
  const [m, setM] = useState(modelo)
  const [err, setErr] = useState('')

  // La conexión ya la pone el servidor: no hay key que pedir.
  const servida = PROXY && !apiKey

  useEffect(() => {
    if (abierto) {
      setK(apiKey)
      setM(modelo)
      setErr('')
    }
  }, [abierto, apiKey, modelo])

  if (!abierto) return null

  return (
    <div className="modal on" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="mbox">
        <h3>{servida ? 'Modelo de IA' : 'Conectar un modelo de IA'}</h3>
        <p>
          {servida
            ? 'El consejero razona sobre los 11 libros: entiende matices, sostiene la conversación y arma estrategias para casos que no están literalmente en las páginas. Aquí eliges con qué modelo lo hace.'
            : 'Con una API key de Anthropic el chat pasa a razonar de verdad sobre los 11 libros: entiende matices, sostiene la conversación y arma estrategias para casos que no están literalmente en las páginas. Sin key, el chat sigue funcionando en modo local.'}
        </p>

        {!servida && (
          <>
            <label>API key de Anthropic</label>
            <input
              type="password"
              value={k}
              onChange={(e) => setK(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
            />
          </>
        )}

        <label>Modelo</label>
        <select value={m} onChange={(e) => setM(e.target.value)}>
          {MODELOS.map((x) => (
            <option value={x.id} key={x.id}>
              {x.nombre} — {x.nota}
            </option>
          ))}
        </select>

        <div className="note">
          {servida ? (
            <>
              La API key está guardada en el servidor y nunca llega a tu navegador: no aparece en el
              código de la página. Cada consulta sale desde el servidor, así que no hay nada que
              configurar aquí. El cambio de modelo aplica a partir de tu próximo reporte.
            </>
          ) : (
            <>
              Lo normal es dejar la key en <code>.env.local</code> (está en el
              <code> .gitignore</code>). Lo que escribas aquí solo vive en la memoria de esta pestaña
              y tiene prioridad sobre el archivo. Se envía únicamente a la API de Anthropic.
            </>
          )}
        </div>

        {err && <div className="err">{err}</div>}

        <div className="mrow">
          <button className="sec" onClick={onCerrar}>
            Cancelar
          </button>
          {apiKey && (
            <button className="sec" onClick={onDesconectar}>
              Desconectar
            </button>
          )}
          <button
            className="pri"
            onClick={() => {
              if (!servida && !k.trim()) return setErr('Pega una API key o cancela.')
              onGuardar(k.trim(), m)
            }}
          >
            {servida ? 'Guardar' : 'Conectar'}
          </button>
        </div>
      </div>
    </div>
  )
}
