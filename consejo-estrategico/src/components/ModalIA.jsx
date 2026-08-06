import { useEffect, useState } from 'react'
import { MODELOS } from '../lib/anthropic'

/** Ajustes de la conexión con Anthropic. La key vive solo en memoria. */
export default function ModalIA({ abierto, apiKey, modelo, onGuardar, onDesconectar, onCerrar }) {
  const [k, setK] = useState(apiKey)
  const [m, setM] = useState(modelo)
  const [err, setErr] = useState('')

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
        <h3>Conectar un modelo de IA</h3>
        <p>
          Con una API key de Anthropic el chat pasa a razonar de verdad sobre los 11 libros: entiende
          matices, sostiene la conversación y arma estrategias para casos que no están literalmente
          en las páginas. Sin key, el chat sigue funcionando en modo local.
        </p>

        <label>API key de Anthropic</label>
        <input
          type="password"
          value={k}
          onChange={(e) => setK(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
        />

        <label>Modelo</label>
        <select value={m} onChange={(e) => setM(e.target.value)}>
          {MODELOS.map((x) => (
            <option value={x.id} key={x.id}>
              {x.nombre} — {x.nota}
            </option>
          ))}
        </select>

        <div className="note">
          Lo normal es dejar la key en <code>.env.local</code> (ya viene configurada y está en el
          <code> .gitignore</code>). Lo que escribas aquí solo vive en la memoria de esta pestaña y
          tiene prioridad sobre el archivo. Se envía únicamente a la API de Anthropic.
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
              if (!k.trim()) return setErr('Pega una API key o cancela.')
              onGuardar(k.trim(), m)
            }}
          >
            Conectar
          </button>
        </div>
      </div>
    </div>
  )
}
