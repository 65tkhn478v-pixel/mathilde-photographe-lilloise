// Point d'entrée du Worker. Grâce à `assets.run_worker_first: ["/api/*"]`
// (wrangler.jsonc), il ne reçoit que les requêtes /api/* ; le site lui-même
// est servi en statique depuis dist/.

import * as admin from './admin.js'
import { hasValidSession, isSameOrigin } from './auth.js'
import { GENERIC_ERROR, error } from './http.js'
import { createBooking, getSlots } from './public.js'

const ID = '(?<id>\\d+)'

// [méthode, chemin, handler, options]
const ROUTES = [
  ['GET', '/api/slots', getSlots, { public: true }],
  ['POST', '/api/bookings', createBooking, { public: true }],

  ['POST', '/api/admin/login', admin.login, { public: true }],
  ['POST', '/api/admin/logout', admin.logout, { public: true }],
  ['GET', '/api/admin/session', admin.session],

  ['GET', '/api/admin/slots', admin.listSlots],
  ['POST', '/api/admin/slots', admin.createSlots],
  ['POST', '/api/admin/slots/duplicate-week', admin.duplicateWeek],
  ['PATCH', `/api/admin/slots/${ID}`, admin.updateSlot],
  ['DELETE', `/api/admin/slots/${ID}`, admin.deleteSlot],

  ['GET', '/api/admin/bookings', admin.listBookings],
  ['POST', `/api/admin/bookings/${ID}/confirm`, admin.confirmBooking],
  ['POST', `/api/admin/bookings/${ID}/decline`, admin.declineBooking],
  ['DELETE', `/api/admin/bookings/${ID}`, admin.deleteBooking],

  ['GET', '/api/admin/history', admin.history],
  ['POST', '/api/admin/purge', admin.purge],
].map(([method, path, handler, options = {}]) => ({
  method,
  pattern: new RegExp(`^${path}$`),
  handler,
  options,
}))

async function route(request, env) {
  const { pathname } = new URL(request.url)
  const matches = ROUTES.filter((r) => r.pattern.test(pathname))
  if (matches.length === 0) return error(404, 'Adresse inconnue.')
  const match = matches.find((r) => r.method === request.method)
  if (!match) return error(405, 'Méthode non autorisée.')

  const isAdmin = pathname.startsWith('/api/admin/')
  const mutating = request.method !== 'GET' && request.method !== 'HEAD'
  if (isAdmin && mutating && !isSameOrigin(request)) return error(403, 'Requête refusée.')
  if (!match.options.public && !(await hasValidSession(request, env))) {
    return error(401, 'Votre session a expiré. Reconnectez-vous.')
  }

  const params = match.pattern.exec(pathname).groups ?? {}
  if (params.id) params.id = Number(params.id)
  return match.handler(request, env, params)
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env)
    } catch (err) {
      // Jamais de données personnelles dans les logs : seulement le type d'erreur.
      console.error('api_error', err?.name, err?.message)
      return error(500, GENERIC_ERROR)
    }
  },
}
