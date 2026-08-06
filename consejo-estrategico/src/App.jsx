import { useCallback, useMemo, useRef, useState } from 'react'
import { FICHAS, DOCS } from './lib/buscador'
import { AppCtx } from './contexto'
import Temario from './components/Temario'
import Historial from './components/Historial'
import VistaBuscar from './components/VistaBuscar'
import VistaFicha from './components/VistaFicha'
import VistaChat from './components/VistaChat'
import VistaArsenal from './components/VistaArsenal'
import ModalIA from './components/ModalIA'
import ModalMemoria from './components/ModalMemoria'
import { listaChats, borrarChat, nuevoId } from './lib/chats'
import { leerMemoria, guardarMemoria } from './lib/memoria'

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
  const [chats, setChats] = useState(() => listaChats())
  const [chatId, setChatId] = useState(() => nuevoId())
  const [pdf, setPdf] = useState(null)
  const [memoria, setMemoria] = useState(() => leerMemoria())
  const [verMemoria, setVerMemoria] = useState(false)
  const scrollRef = useRef(null)

  /** El chat avisa al guardar; aquí solo se relee el índice de conversaciones. */
  const refrescarChats = useCallback(() => setChats(listaChats()), [])

  const nuevoChat = useCallback(() => {
    setChatId(nuevoId())
    setVista('chat')
  }, [])

  const abrirChat = useCallback((id) => {
    setChatId(id)
    setVista('chat')
  }, [])

  const eliminarChat = useCallback(
    (id) => {
      borrarChat(id)
      setChats(listaChats())
      if (id === chatId) setChatId(nuevoId())
    },
    [chatId]
  )

  const abrirFicha = useCallback((id) => {
    setFichaId(id)
    setVista('ficha')
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }))
  }, [])

  const buscarTexto = useCallback((t) => {
    setConsulta(t)
    setVista('buscar')
  }, [])

  /** Salta al PDF de origen abierto en la página exacta. */
  const abrirPdf = useCallback((doc, pagina) => {
    setPdf({ doc, pagina, k: Date.now() })
    setVista('arsenal')
  }, [])

  const ctx = useMemo(
    () => ({ abrirFicha, buscarTexto, abrirPdf }),
    [abrirFicha, buscarTexto, abrirPdf]
  )

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
        <Historial
          chats={chats}
          chatActivo={chatId}
          onAbrir={abrirChat}
          onNuevo={nuevoChat}
          onBorrar={eliminarChat}
        />

        <div className="indice">
          <div className="navtitle">Índice operativo</div>
          <Temario fichaActiva={fichaId} />
        </div>
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
          <VistaArsenal objetivo={pdf} />
        </div>

        <div className={`view ${vista === 'ficha' ? 'on' : ''}`} ref={scrollRef}>
          {fichaId && <VistaFicha id={fichaId} setFiltro={aplicarFiltro} />}
        </div>

        <div className={`view chat ${vista === 'chat' ? 'on' : ''}`}>
          <VistaChat
            key={chatId}
            chatId={chatId}
            onGuardado={refrescarChats}
            apiKey={apiKey}
            modelo={modelo}
            onAbrirAjustes={() => setAjustes(true)}
            onAbrirMemoria={() => setVerMemoria(true)}
            memoria={memoria}
            setMemoria={setMemoria}
          />
        </div>
      </main>

      <ModalMemoria
        abierto={verMemoria}
        datos={memoria}
        onGuardar={(datos) => {
          setMemoria(guardarMemoria(datos))
          setVerMemoria(false)
        }}
        onCerrar={() => setVerMemoria(false)}
      />

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
