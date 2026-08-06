import { useCallback, useMemo, useRef, useState } from 'react'
import { FICHAS, DOCS } from './lib/buscador'
import { AppCtx } from './contexto'
import Temario from './components/Temario'
import VistaBuscar from './components/VistaBuscar'
import VistaFicha from './components/VistaFicha'
import VistaChat from './components/VistaChat'
import VistaArsenal from './components/VistaArsenal'
import ModalIA from './components/ModalIA'

/** La key del .env.local es el valor por defecto; el modal puede sobreescribirla en memoria. */
const KEY_ENV = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
const MODELO_ENV = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-opus-5'

export default function App() {
  const [vista, setVista] = useState('chat')
  const [fichaId, setFichaId] = useState(null)
  const [consulta, setConsulta] = useState('')
  const [filtro, setFiltro] = useState({ tema: null, doc: null })
  const [apiKey, setApiKey] = useState(KEY_ENV)
  const [modelo, setModelo] = useState(MODELO_ENV)
  const [ajustes, setAjustes] = useState(false)
  const scrollRef = useRef(null)

  const abrirFicha = useCallback((id) => {
    setFichaId(id)
    setVista('ficha')
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }))
  }, [])

  const buscarTexto = useCallback((t) => {
    setConsulta(t)
    setVista('buscar')
  }, [])

  const ctx = useMemo(() => ({ abrirFicha, buscarTexto }), [abrirFicha, buscarTexto])

  const aplicarFiltro = (f) => {
    setFiltro(f)
    setVista('buscar')
  }

  return (
    <AppCtx.Provider value={ctx}>
      <aside>
        <div className="brand">
          <div className="mark">SAC</div>
          <div>
            <h1>
              Strategic <b>Advice Center</b>
            </h1>
            <p>
              {DOCS.length} doc · {FICHAS.length} pág
            </p>
          </div>
        </div>
        <div className="navtitle">Índice operativo</div>
        <Temario fichaActiva={fichaId} />
      </aside>

      <main>
        <div className="topbar">
          <button className={`tab ${vista === 'chat' ? 'on' : ''}`} onClick={() => setVista('chat')}>
            <span className="k">01</span> Briefing
          </button>
          <button className={`tab ${vista === 'arsenal' ? 'on' : ''}`} onClick={() => setVista('arsenal')}>
            <span className="k">02</span> Arsenal
          </button>
          {fichaId && (
            <button className={`tab ${vista === 'ficha' ? 'on' : ''}`} onClick={() => setVista('ficha')}>
              <span className="k">03</span> Expediente
            </button>
          )}
          <span className="meta">
            <i className="led" /> {FICHAS.length} págs · índice cargado
          </span>
        </div>

        <div className={`view ${vista === 'buscar' ? 'on' : ''}`}>
          <VistaBuscar
            consulta={consulta}
            setConsulta={setConsulta}
            filtro={filtro}
            setFiltro={setFiltro}
          />
        </div>

        <div className={`view arsenal ${vista === 'arsenal' ? 'on' : ''}`}>
          <VistaArsenal />
        </div>

        <div className={`view ${vista === 'ficha' ? 'on' : ''}`} ref={scrollRef}>
          {fichaId && <VistaFicha id={fichaId} setFiltro={aplicarFiltro} />}
        </div>

        <div className={`view chat ${vista === 'chat' ? 'on' : ''}`}>
          <VistaChat apiKey={apiKey} modelo={modelo} onAbrirAjustes={() => setAjustes(true)} />
        </div>
      </main>

      <ModalIA
        abierto={ajustes}
        apiKey={apiKey}
        modelo={modelo}
        onGuardar={(k, m) => {
          setApiKey(k)
          setModelo(m)
          setAjustes(false)
        }}
        onDesconectar={() => {
          setApiKey('')
          setAjustes(false)
        }}
        onCerrar={() => setAjustes(false)}
      />
    </AppCtx.Provider>
  )
}
