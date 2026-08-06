import { norm, stem } from './texto'

/**
 * Grupos de sinónimos del dominio (poder, trabajo, negociación, familia).
 * Sirven para que quien busca "me robaron el crédito" encuentre también
 * fichas que hablan de "autoría", "mérito" o "reconocimiento".
 *
 * Para afinar el buscador, edita esta lista: es el punto de mayor
 * impacto/esfuerzo de todo el proyecto.
 */
export const SINONIMOS = [
  ['jefe', 'lider', 'liderazgo', 'autoridad', 'superior', 'maestro', 'gerente', 'director', 'directivo', 'patron', 'mando'],
  ['credito', 'reconocimiento', 'merito', 'autoria', 'logro', 'aporte'],
  ['robar', 'quitar', 'apropiar', 'atribuir', 'adjudicar', 'arrebatar'],
  ['junta', 'reunion', 'sala', 'comite', 'asamblea', 'sesion'],
  ['ascenso', 'promocion', 'crecer', 'subir', 'carrera', 'puesto'],
  ['sabotaje', 'boicot', 'socavar', 'minar', 'torpedear', 'traicion'],
  ['manipulacion', 'manipular', 'presion', 'presionar', 'chantaje', 'coaccion', 'engano', 'enganar', 'manipulador'],
  ['enemigo', 'rival', 'adversario', 'competidor', 'contrario', 'oponente'],
  ['aliado', 'alianza', 'sponsor', 'padrino', 'apoyo', 'respaldo', 'coalicion'],
  ['negociar', 'negociacion', 'acuerdo', 'trato', 'pacto', 'convenio'],
  ['limite', 'frontera', 'frenar', 'parar', 'negarse'],
  ['reputacion', 'imagen', 'prestigio', 'percepcion', 'fama', 'marca'],
  ['conflicto', 'pelea', 'choque', 'disputa', 'confrontacion', 'roce'],
  ['despido', 'salida', 'renuncia', 'desvincular', 'echar'],
  ['socio', 'sociedad', 'partner', 'asociado', 'accionista'],
  ['equipo', 'colaborador', 'subordinado', 'reporte', 'personal'],
  ['cliente', 'comprador', 'prospecto', 'cuenta'],
  ['venta', 'vender', 'comercial', 'cierre', 'propuesta'],
  ['miedo', 'temor', 'inseguridad', 'amenaza', 'ansiedad'],
  ['envidia', 'celos', 'resentimiento', 'rencor'],
  ['silencio', 'callar', 'reserva', 'discrecion', 'secreto', 'ocultar'],
  ['informacion', 'dato', 'inteligencia', 'saber', 'conocer'],
  ['confianza', 'lealtad', 'fidelidad', 'fiar'],
  ['error', 'fallo', 'equivocacion', 'falla', 'tropiezo'],
  ['culpa', 'responsabilidad', 'cargar'],
  ['urgencia', 'urgente', 'prisa', 'apuro', 'rapido', 'inmediato'],
  ['publico', 'expuesto', 'audiencia', 'testigo'],
  ['oportunista', 'aprovechado', 'trepador', 'interesado'],
  ['poder', 'influencia', 'control', 'dominio'],
  ['estrategia', 'plan', 'jugada', 'tactica', 'movimiento', 'maniobra'],
  ['defensa', 'proteger', 'proteccion', 'blindaje', 'resguardo'],
  ['pareja', 'esposo', 'esposa', 'matrimonio', 'novio', 'novia', 'relacion'],
  ['familia', 'padre', 'madre', 'hermano', 'suegra', 'pariente'],
  ['dinero', 'sueldo', 'salario', 'pago', 'presupuesto', 'costo', 'precio'],
  ['reporte', 'correo', 'email', 'mensaje', 'minuta', 'acta', 'registro'],
  ['ignorar', 'excluir', 'aislar', 'marginar'],
  ['critica', 'descalificar', 'ridiculizar', 'humillar', 'burla'],
  ['promesa', 'compromiso', 'ofrecer', 'prometer'],
  ['duda', 'incertidumbre', 'confusion', 'ambiguedad'],
  ['tiempo', 'momento', 'timing', 'oportunidad', 'esperar', 'paciencia'],
  ['revertir', 'reversion', 'retomar', 'reabrir', 'deshacer', 'corregir', 'recuperar', 'rectificar'],
  ['ceder', 'cedi', 'acepte', 'aceptar', 'caer', 'cai', 'caiste', 'rendirse'],
  ['jugada', 'contrajugada', 'respuesta', 'replica', 'reaccion', 'contestar'],
  ['guerra', 'batalla', 'combate', 'frente', 'campo', 'terreno'],
  ['principe', 'principado', 'gobernar', 'gobierno', 'estado', 'reino'],
]

/** Índice raíz → grupos a los que pertenece. Se construye una sola vez. */
export const MAPA_SINONIMOS = (() => {
  const m = new Map()
  SINONIMOS.forEach((grupo, i) => {
    grupo.forEach((w) => {
      const k = stem(norm(w).split(' ')[0])
      if (!m.has(k)) m.set(k, new Set())
      m.get(k).add(i)
    })
  })
  return m
})()
