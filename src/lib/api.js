// Petit client pour l'API du Worker (/api/*). Les erreurs portent le message
// français renvoyé par le serveur, ou un message réseau générique.

export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message)
    this.status = status
    this.data = data
  }
}

export const NETWORK_ERROR = 'Connexion impossible. Vérifiez votre réseau, puis réessayez.'
const GENERIC_ERROR = 'Une erreur est survenue. Réessayez dans un instant.'

export async function api(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, NETWORK_ERROR)
  }
  let data = null
  try {
    data = await response.json()
  } catch {
    // Réponse non JSON (proxy, page d'erreur) : traitée plus bas.
  }
  if (!response.ok) throw new ApiError(response.status, data?.error ?? GENERIC_ERROR, data)
  if (!data) throw new ApiError(response.status, GENERIC_ERROR)
  return data
}
