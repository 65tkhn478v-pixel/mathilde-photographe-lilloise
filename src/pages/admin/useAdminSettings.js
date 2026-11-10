import { useApiData } from '../../lib/useApiData'
import { DEFAULT_SETTINGS, reviewUrlOrDefault } from '../../../shared/settings.js'

/**
 * Réglages par défaut en vigueur (page Paramètres), pour préremplir et
 * afficher les durées dans l'admin. Valeurs du code tant qu'ils ne sont pas
 * chargés.
 */
export function useAdminSettings() {
  const { data } = useApiData('/api/admin/settings')
  const settings = data?.settings ?? DEFAULT_SETTINGS
  return { ...settings, review_url: reviewUrlOrDefault(settings.review_url), loaded: Boolean(data) }
}
