import { createContext, useContext } from 'react'

/**
 * Contexto mínimo de la app. Sirve sobre todo para que cualquier cita, por
 * profunda que esté, pueda abrir su ficha sin pasar la función por props.
 */
export const AppCtx = createContext({
  abrirFicha: () => {},
  buscarTexto: () => {},
})

export const useApp = () => useContext(AppCtx)
