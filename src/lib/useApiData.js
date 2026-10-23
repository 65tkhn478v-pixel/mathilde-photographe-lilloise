import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

/**
 * Charge une ressource GET de l'API. `reload()` relance la requête ; une
 * réponse arrivée après un changement d'adresse (ex. semaine suivante) est
 * ignorée. `onData` / `onError` sont appelés à chaque réponse.
 */
export function useApiData(path, { onData, onError } = {}) {
  const [state, setState] = useState({ path: null, data: null, error: null })
  const [nonce, setNonce] = useState(0)
  const callbacks = useRef({ onData, onError })

  useEffect(() => {
    callbacks.current = { onData, onError }
  })

  useEffect(() => {
    let active = true
    api(path).then(
      (data) => {
        if (!active) return
        setState({ path, data, error: null })
        callbacks.current.onData?.(data)
      },
      (error) => {
        if (!active) return
        setState((s) => ({ path, data: s.path === path ? s.data : null, error }))
        callbacks.current.onError?.(error)
      }
    )
    return () => {
      active = false
    }
  }, [path, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  // Données d'une autre adresse (ex. semaine précédente) : pas encore chargées.
  const current = state.path === path
  return { data: current ? state.data : null, error: current ? state.error : null, reload }
}
