// Point d'entrée du Worker. Grâce à `assets.run_worker_first: ["/api/*"]`
// (wrangler.jsonc), il ne reçoit que les requêtes /api/* ; le site lui-même
// est servi en statique depuis dist/.

import * as admin from './admin.js'
import { hasValidSession, isSameOrigin } from './auth.js'
import { GENERIC_ERROR, error } from './http.js'
import { createBooking, getSlots } from './public.js'
import * as galleries from './galleries.js'
import * as settings from './settings.js'

const ID = '(?<id>\\d+)'
const DATE = '(?<date>\\d{4}-\\d{2}-\\d{2})'
const SLUG = '(?<slug>[a-z0-9]{16,40})'
const PID = '(?<pid>\\d+)'
const VERSION = '(?<version>thumb|preview|blur|hd)'
const PART = '(?<part>\\d+)'
const GAL = `/api/admin/galleries/${ID}`

// [méthode, chemin, handler, options]
const ROUTES = [
  ['GET', '/api/slots', getSlots, { public: true }],
  ['POST', '/api/bookings', createBooking, { public: true }],
  ['GET', '/api/settings', settings.publicSettings, { public: true }],

  ['POST', '/api/admin/login', admin.login, { public: true }],
  ['POST', '/api/admin/logout', admin.logout, { public: true }],
  ['GET', '/api/admin/session', admin.session],

  ['GET', '/api/admin/calendar', admin.calendar],
  ['GET', `/api/admin/days/${DATE}/slots`, admin.getDay],
  ['PUT', `/api/admin/days/${DATE}/slots`, admin.putDay],
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

  // Paramètres (réglages par défaut)
  ['GET', '/api/admin/settings', settings.readSettings],
  ['PUT', '/api/admin/settings', settings.saveSettings],
  ['DELETE', '/api/admin/settings', settings.resetSettings],

  // Galeries clients — admin
  ['GET', '/api/admin/galleries', galleries.listGalleries],
  ['POST', '/api/admin/galleries', galleries.createGallery],
  ['GET', '/api/admin/galleries/bookings', galleries.bookingsForGallery],
  ['POST', '/api/admin/galleries/cleanup', galleries.cleanupNow],
  ['GET', GAL, galleries.galleryDetail],
  ['PATCH', GAL, galleries.updateGallery],
  ['DELETE', GAL, galleries.deleteGallery],
  ['POST', `${GAL}/code`, galleries.regenerateCode],
  ['POST', `${GAL}/open`, galleries.openSelection],
  ['POST', `${GAL}/reopen`, galleries.reopenSelection],
  ['POST', `${GAL}/deliver`, galleries.deliverGallery],
  ['POST', `${GAL}/photos`, galleries.registerPhoto],
  ['PUT', `${GAL}/photos/${PID}/${VERSION}`, galleries.uploadVersion],
  ['GET', `${GAL}/photos/${PID}/${VERSION}`, galleries.adminPhoto],
  ['DELETE', `${GAL}/photos/${PID}`, galleries.deletePhoto],
  ['POST', `${GAL}/photos/${PID}/hd/multipart`, galleries.startMultipart],
  ['PUT', `${GAL}/photos/${PID}/hd/multipart/${PART}`, galleries.uploadPart],
  ['POST', `${GAL}/photos/${PID}/hd/multipart/complete`, galleries.completeMultipart],
  ['DELETE', `${GAL}/photos/${PID}/hd/multipart`, galleries.abortMultipart],

  // Galeries clients — client (accès par lien + code, contrôles dans le module)
  ['GET', `/api/galerie/${SLUG}`, galleries.galleryPublic, { public: true }],
  ['GET', `/api/galerie/${SLUG}/couverture`, galleries.galleryCoverBlur, { public: true }],
  ['POST', `/api/galerie/${SLUG}/acces`, galleries.galleryLogin, { public: true }],
  ['GET', `/api/galerie/${SLUG}/contenu`, galleries.galleryContent, { public: true }],
  ['PUT', `/api/galerie/${SLUG}/selection/${PID}`, galleries.selectPhoto, { public: true }],
  ['DELETE', `/api/galerie/${SLUG}/selection/${PID}`, galleries.unselectPhoto, { public: true }],
  ['POST', `/api/galerie/${SLUG}/valider`, galleries.validateSelection, { public: true }],
  ['GET', `/api/galerie/${SLUG}/photos/${PID}/${VERSION}`, galleries.clientPhoto, { public: true }],
].map(([method, path, handler, options = {}]) => ({
  method,
  pattern: new RegExp(`^${path}$`),
  handler,
  options,
}))

/**
 * Pages /galerie/* : même application React, mais sans balise Open Graph ni
 * Twitter (l'aperçu d'un lien partagé n'affiche aucune photo), avec noindex.
 */
async function galleryPage(request, env) {
  const response = await env.ASSETS.fetch(new Request(new URL('/', request.url), request))
  const rewritten = new HTMLRewriter()
    .on('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], script[type="application/ld+json"]', {
      element: (el) => el.remove(),
    })
    .on('head', {
      element: (el) => el.append('<meta name="robots" content="noindex, nofollow, noarchive" />', { html: true }),
    })
    .on('title', { element: (el) => el.setInnerContent('Galerie — Mathilde Lecomte') })
    .transform(response)
  const headers = new Headers(rewritten.headers)
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  headers.set('Cache-Control', 'no-store')
  headers.set('Referrer-Policy', 'no-referrer')
  return new Response(rewritten.body, { status: 200, headers })
}

async function route(request, env, ctx) {
  const { pathname } = new URL(request.url)
  if (pathname.startsWith('/galerie/')) return galleryPage(request, env)
  const matches = ROUTES.filter((r) => r.pattern.test(pathname))
  if (matches.length === 0) {
    // Même réponse qu'une galerie indisponible : aucune énumération possible.
    if (pathname.startsWith('/api/galerie/')) {
      return error(404, 'Cette galerie n’est plus disponible. Écrivez-moi si besoin.', { code: 'unavailable' })
    }
    return error(404, 'Adresse inconnue.')
  }
  const match = matches.find((r) => r.method === request.method)
  if (!match) return error(405, 'Méthode non autorisée.')

  // CSRF : en plus des cookies SameSite, toute requête modifiante de l'admin
  // ou d'une galerie doit venir du site lui-même (en-tête Origin).
  const guarded = pathname.startsWith('/api/admin/') || pathname.startsWith('/api/galerie/')
  const mutating = request.method !== 'GET' && request.method !== 'HEAD'
  if (guarded && mutating && !isSameOrigin(request)) return error(403, 'Requête refusée.')
  if (!match.options.public && !(await hasValidSession(request, env))) {
    return error(401, 'Votre session a expiré. Reconnectez-vous.')
  }

  const params = match.pattern.exec(pathname).groups ?? {}
  if (params.id) params.id = Number(params.id)
  if (params.pid) params.pid = Number(params.pid)
  return match.handler(request, env, params, ctx)
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx)
    } catch (err) {
      // Jamais de données personnelles dans les logs : seulement le type d'erreur.
      console.error('api_error', err?.name, err?.message)
      return error(500, GENERIC_ERROR)
    }
  },

  // Cron quotidien (wrangler.jsonc) : nettoyage RGPD des galeries.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(galleries.runGalleryCleanup(env))
  },
}
