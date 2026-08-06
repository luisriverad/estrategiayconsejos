# SAC — Strategic Advice Center

Buscador y consejero estratégico sobre **276 páginas** de **11 documentos** de poder, estrategia e influencia.

Escribes una situación real y la app te dice **en qué documento y en qué página** está la respuesta, arma un **curso de acción** combinando varias fuentes, y te deja consultar todo por chat.

---

## Arrancar

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>. Para compilar: `npm run build` y luego `npm run preview`.

---

## ⚠️ La API key

El archivo **`.env.local` viene incluido con la key real** para que el chat funcione desde el primer `npm run dev`.

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_ANTHROPIC_MODEL=claude-sonnet-5
```

Dos cosas importantes:

1. `.env.local` está en `.gitignore`, así que **no se sube al repo**. Verifícalo con `git status` antes de tu primer commit.
2. Vite **inlinea las variables `VITE_` en el bundle**. Eso significa que si publicas la carpeta `dist/` en un servidor, la key queda visible para cualquiera que abra las herramientas de desarrollo. Para uso local está bien; **para publicar, mueve la llamada a un backend** y deja la key en el servidor. El punto exacto a cambiar es `preguntarIA()` en `src/lib/anthropic.js`.

Si la key se filtra: `console.anthropic.com` → API Keys → revocar y generar otra.

Sin key la app **sigue funcionando**: el chat cae a "modo local", que busca en las 276 páginas y arma el curso de acción sin llamar a ningún modelo.

---

## Estructura

```
src/
  data/datos.json        Las 276 páginas transcritas e indexadas (730 kB)
  lib/
    texto.js             Normalización, stemmer de español, distancia de edición
    sinonimos.js         Grupos de sinónimos del dominio  ← el archivo que más rinde tocar
    buscador.js          Índice BM25, búsqueda, fragmentos resaltados
    curso.js             Reparte los resultados en los 5 bloques del curso de acción
    anthropic.js         Llamada a la API + parseo de la respuesta a bloques
  components/
    Temario.jsx          Árbol Tema → Documento → Página
    VistaBuscar.jsx      Buscador, chips de ejemplo, resultados
    VistaFicha.jsx       Página de lectura de una ficha
    VistaChat.jsx        Chat (modo local y modo IA)
    CursoDeAccion.jsx    Panel de síntesis
    ModalIA.jsx          Ajustes de conexión
    Cita.jsx             Etiqueta dorada clicable
  contexto.js            Contexto mínimo (abrirFicha / buscarTexto)
  App.jsx                Estado global y layout
  index.css              Hoja única; los colores están en :root
```

---

## Dónde tocar según lo que quieras cambiar

| Quiero… | Archivo |
|---|---|
| Que encuentre mejor ciertos temas | `src/lib/sinonimos.js` — añade grupos |
| Que la búsqueda sea más/menos literal | `PESOS` en `src/lib/buscador.js` |
| Cambiar los bloques del curso de acción | `RX` en `src/lib/curso.js` |
| Cambiar el tono o formato de la IA | `SISTEMA` en `src/lib/anthropic.js` |
| Cambiar colores / tipografía | `:root` en `src/index.css` |
| Añadir preguntas de ejemplo | `EJEMPLOS` en `VistaBuscar.jsx`, `SUGERENCIAS` en `VistaChat.jsx` |

---

## Cómo funciona la búsqueda

1. **Tokeniza** la consulta: quita acentos y palabras vacías, reduce cada palabra a su raíz (`revertirlo` → `revert`).
2. **Expande** con sinónimos del dominio (peso 0.45) y con términos parecidos por distancia de edición (peso 0.8). Esto último cubre las erratas del original: buscar `reputación` encuentra la ficha que dice `REPUTAÇÓN`.
3. **Puntúa** con BM25 sobre un índice invertido, con pesos por campo (el título vale 7 veces más que el cuerpo).
4. **Ajusta**: bonus si aparece la frase exacta, bonus por cobertura de términos, y un tope de 4 fichas seguidas del mismo documento para que los resultados no los acapare un solo libro.

Todo corre en memoria, sin servidor. El índice se construye una sola vez al importar `buscador.js`.

---

## Sobre los datos

Los 11 PDFs originales **no tienen capa de texto** (son imágenes ilustradas), así que las 276 páginas se transcribieron con lectura visual, página por página, conservando la estructura de cada ficha (título, cita, pasos, secciones, repaso).

Dos cosas que conviene saber:

- **Ortografía corregida.** Los originales están traducidos del portugués con bastantes faltas (`RESPOESTA`, `REPUTAÇÓN`, `CONTRA-JOGADA`, `RIISGOS`, `FAMÍLIA`). Se aplicaron más de 680 correcciones. El contenido no se alteró: solo ortografía y acentuación.
- **Una página vacía.** La página 45 de *50 Estrategias de Maquiavelo* (Estrategia 44) viene completamente en negro en el PDF fuente. La app la marca con un aviso en lugar de fingir que tiene contenido. Si consigues ese PDF, basta con transcribir esa página y reponer el objeto correspondiente en `datos.json`.

### Formato de `datos.json`

```jsonc
{
  "temas": ["48 Leyes del Poder", ...],
  "docs":  [{ "id": "48leyes", "tema": "...", "titulo": "...", "sub": "...", "pdf": "...", "n": 49 }],
  "fichas": [{
    "id": 1,                    // único global
    "doc": "48leyes",           // referencia a docs[].id
    "docTitulo": "...",
    "tema": "...",
    "pdf": "...",
    "pagina": 2,                // página física del PDF (1-indexado)
    "titulo": "LEY 01 - ...",
    "subtitulo": "...",
    "cita": "...",
    "pasos":     [{ "n": 1, "nombre": "...", "texto": "..." }],
    "secciones": { "IDEA CENTRAL": "...", "MECANISMO": "..." },
    "repaso":    ["...", "..."],
    "texto":     "todo el texto de la página, para búsqueda libre",
    "etiquetas": ["jerarquía", "jefe", "visibilidad"],
    "vacia": false
  }]
}
```

Para **añadir un documento**: agrega su entrada en `docs`, sus páginas en `fichas` con un `id` que no choque, y si usa rótulos de sección nuevos, súmalos a las expresiones de `src/lib/curso.js` para que entren en el curso de acción.
